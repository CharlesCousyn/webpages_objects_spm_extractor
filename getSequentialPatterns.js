//Libs
import Wordpos from "wordpos";
import htmlToText  from "html-to-text";
import csvParse from "csv-parse/lib/sync"
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take, isEmpty} from 'rxjs/operators';
import filesSystem from "fs";
import clone from "clone";
import Lexed from 'lexed';
import {Tag} from 'en-pos';
import parser from 'en-parse';
import { Inflectors } from "en-inflectors";
import {normalizeCaps, replaceConfusables, resolveContractions} from "en-norm";
import {replaceHTMLEntities} from "./libs/fin-html-entities";
import {reverseSlang} from "./libs/fin-slang";
import {JSDOM} from "jsdom";

//Personal imports
import predeterminedObjects from "./configFiles/predeterminedObjects.json";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";
import * as SPM from "./sequentialPatternMining.js";

//Keep JSDOM errors
const originalConsoleError = console.error;
console.error = function(msg)
{
    console.log(msg);
    if(msg.startsWith('Error: Could not parse CSS stylesheet')) return;
    originalConsoleError(msg);
}

//Init wordpos
let wordpos = new Wordpos();

async function extractPlans(path)
{
    let selectorPlansHTML = "div.steps.sticky:not(.sample)";
    let selectorStepsHTML = "[id^=step-id-] .step b";
    let document = (await JSDOM.fromFile(path)).window.document;

    //Extract all plans with all steps for each plan
    let plans = [];
    let plansHTML = document.querySelectorAll(selectorPlansHTML);

    plansHTML.forEach(planHTML =>
    {
        let steps = [];
        let stepsHTML = planHTML.querySelectorAll(selectorStepsHTML);

        stepsHTML.forEach(stepHTML =>
        {
            //stepHTML.querySelectorAll('*').forEach(n => n.remove());
            steps.push(stepHTML.textContent);
        });
        plans.push(steps);
    });


    //Check if it's multiple plans or multiple parts
    if(plansHTML.length > 1)
    {
        let discriminatingEl = plansHTML[0].querySelector("h3 > div > div");
        discriminatingEl.querySelectorAll('*').forEach(n => n.remove());
        let typeOfContent= discriminatingEl.textContent;
        //Only one plan
        if(typeOfContent.startsWith("Part"))
        {
            plans = [plans.flat()];
        }
    }

    return plans;
}

function htmlStringToCleanText(htmlString, config)
{
    let text = htmlToText.fromString(htmlString, config.configHTML2Text);
    return stringToCleanText(text, config);
}

function stringToCleanText(text, config)
{
    //Delete all non pure text things...
    //JSON strings
    let processedText = text.replace(new RegExp("({\".*})", "gs"), "");
    //Urls
    processedText = processedText.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");
    //HTML entities and slang
    processedText = replaceHTMLEntities(reverseSlang(resolveContractions(replaceConfusables(processedText))));

    if(config.showCleanTextForDebug)
    {
        console.log("processedText", processedText);
    }
    return processedText;
}

async function keepTokensNounAndValidLexName(processedSentences, config)
{
    return await from(processedSentences)
        .pipe(mergeMap(processedSentence => from(processedSentence)))
        .pipe(filter(tokInfo=> tokInfo.POS.startsWith("NN")))
        .pipe(concatMap(async tokInfo => ({...tokInfo, definitions: await wordpos.lookupNoun(tokInfo.pureForm)})))
        .pipe(map(tokInfo =>
        {
            tokInfo.definitions = tokInfo.definitions.filter(def => config.allowedLexNames.includes(def.lexName));
            return tokInfo;
        }))
        .pipe(filter(tokInfo => Array.isArray(tokInfo.definitions) && tokInfo.definitions.length))
        .pipe(toArray())
        .toPromise();
}

async function getAssociatedVerbs(tokInfoObjects, processedSentences, config)
{
    return await from(tokInfoObjects)
        .pipe(concatMap(async tokInfoObject =>
        {
            //Search the nearest verb in the dependency parse tree
            let nearestVerb = null;
            if(config.useDepTreeToFindAssociatedVerb)
            {
                let sentence = processedSentences[tokInfoObject.indexSentence];
                let rootNode = tokInfoObject.depParsed.parent === -1;
                let currTok = sentence[tokInfoObject.depParsed.parent] ;
                while(nearestVerb === null && !rootNode)
                {
                    if(currTok.depParsed.type === "VP" || currTok.depParsed.type.startsWith("VB"))
                    {
                        nearestVerb = currTok;
                        nearestVerb = {...nearestVerb, definitions: await wordpos.lookupVerb(nearestVerb.pureForm)};
                    }
                    else
                    {
                        if(currTok.depParsed.parent === -1)
                        {
                            rootNode = true;
                        }
                        else
                        {
                            currTok = sentence[currTok.depParsed.parent];
                        }
                    }
                }
            }
            else
            {
                nearestVerb = await from(processedSentences[tokInfoObject.indexSentence])
                    .pipe(filter(tokInfo => tokInfo.POS.startsWith("VB")))
                    .pipe(reduce((goodTokInfoVerb, tokInfoVerb) =>
                    {
                        if(goodTokInfoVerb === null || (Math.abs(tokInfoObject.indexToken - tokInfoVerb.indexToken) < Math.abs(tokInfoObject.indexToken - goodTokInfoVerb.indexToken)))
                        {
                            goodTokInfoVerb = tokInfoVerb;
                        }
                        return goodTokInfoVerb;
                    }, null))
                    .pipe(filter(goodTokInfoVerb => goodTokInfoVerb !== null))
                    .pipe(concatMap(async verbTokInfo => ({...verbTokInfo, definitions: await wordpos.lookupVerb(verbTokInfo.pureForm)})))
                    .toPromise();
            }

            //If no verb in sentence or the nearest verb has no definition in wordnet
            if(nearestVerb === undefined || nearestVerb === null || nearestVerb.definitions.length === 0)
            {
                return null;
            }
            else
            {
                return [nearestVerb, tokInfoObject];
            }
        }))
        .pipe(filter(arr => arr !== null))
        .pipe(toArray())
        .toPromise();
}

async function getOrderedObjectsFromTextFin(cleanText, predeterminedObjectsOneActivty, config)
{
    let tokenizedText = (new Lexed(cleanText)).lexer().tokens;
    let clonedTokenizedText = clone(tokenizedText);
    let normalizedTokenizedText = clonedTokenizedText.map(sentenceArr => normalizeCaps(sentenceArr));
    let POSText = normalizedTokenizedText.map(sentenceArr => new Tag(sentenceArr).initial().smooth().tags);
    let depParsed = normalizedTokenizedText.map((tokensOneSentence, indexOneSentence) => parser(POSText[indexOneSentence], tokensOneSentence));

    let processedSentences = normalizedTokenizedText.map((normalizedTokensOneSentence, indexOneSentence) =>
        normalizedTokensOneSentence.map((normalizedToken, indexTok) =>
        {
            let pureForm = normalizedToken.toLowerCase();
            if(POSText[indexOneSentence][indexTok].startsWith("VB"))
            {
                pureForm = new Inflectors(pureForm).toPresent();
            }
            else if (POSText[indexOneSentence][indexTok].startsWith("NN"))
            {
                pureForm = new Inflectors(pureForm).toSingular();
            }
                return {
                    indexSentence: indexOneSentence,
                    indexToken: indexTok,
                    originalToken: tokenizedText[indexOneSentence][indexTok],
                    normalizedToken: normalizedToken.toLowerCase(),
                    pureForm: pureForm,
                    POS: POSText[indexOneSentence][indexTok],
                    depParsed: depParsed[indexOneSentence][indexTok]
                }}));

    let validTokensInfos = await keepTokensNounAndValidLexName(processedSentences, config);// add definitions

    //Order them using indexes (to be sure it's ordered)
    validTokensInfos = validTokensInfos
        .sort((tokInfo1, tokInfo2) =>
        {
            if(tokInfo1.indexSentence < tokInfo2.indexSentence)
            {
                if(tokInfo1.indexToken < tokInfo2.indexToken)
                {
                    return -1;
                }
            }
            else if(tokInfo1.indexSentence === tokInfo2.indexSentence)
            {
                return 0;
            }
            return 1;
        });

    if(config.useOfPredeterminedObjects)
    {
        //Search definitions of each predetermined object
        let promiseAddDefs = predeterminedObjectsOneActivty.objects.map(async obj => ({name:obj, definitions: await wordpos.lookupNoun(obj) }));
        let predObjWithDefinitions = await Promise.all(promiseAddDefs);
        let predObjLemmas = predObjWithDefinitions.map(obj => obj.definitions[0].lemma);

        //Intersection between valid tokens found in text and predetermined objects
        validTokensInfos = validTokensInfos.filter(tokInfo => predObjLemmas.includes(tokInfo.definitions[0].lemma));
    }

    if(config.useVerb)
    {
        //Use sentences where valid tokens are to add to nearest verb
        //Return arrays of array of type [tokInfoVerb, tokInfoObject]
        let tokInfosWithVerbs = await getAssociatedVerbs(validTokensInfos, processedSentences, config);

        //Only keep the pure form of the token to avoid synonyms abundance
        let validTokens = tokInfosWithVerbs.map(([nearestVerb, tokInfoObject]) =>
        {
            return `${nearestVerb.definitions[0].lemma}||${tokInfoObject.definitions[0].lemma}`;
        });

        //Delete duplicates (keep the first only)
        let uniqueValidTokens = validTokens.filter((tok, index, array) => array.indexOf(tok) === index);

        return uniqueValidTokens;
    }
    else
    {
        //Only keep the pure form of the token to avoid synonyms abundance
        let validTokens = validTokensInfos.map(tokInfo => tokInfo.definitions[0].lemma);

        //Delete duplicates (keep the first only)
        let uniqueValidTokens = validTokens.filter((tok, index, array) => array.indexOf(tok) === index);

        return uniqueValidTokens;
    }
}

async function getOrderedObjectsFromHTML(pathWebPage, predeterminedObjectsOneActivty, config)
{
    console.log("pathWebPage", pathWebPage);
    try
    {
        let cleanText= "";
        if(config.useSpecificStruct)
        {
            let plans = await extractPlans(pathWebPage);
            let plan = plans[0];
            let steps = plan.join(" ");

            //Clean the text
            cleanText = stringToCleanText(steps, config);

            //Write a new text file
            let pathToTextFile = `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`;
            TOOLS.writeTextFile(cleanText, pathToTextFile);
        }
        else
        {
            //Get the HTML string
            let htmlString = TOOLS.readTextFile(pathWebPage);
            //Clean the text
            cleanText = htmlStringToCleanText(htmlString, config);
            //Write a new text file
            let pathToTextFile = `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`;
            TOOLS.writeTextFile(cleanText, pathToTextFile);
        }

        //Extract object in order from text
        return await getOrderedObjectsFromTextFin(cleanText, predeterminedObjectsOneActivty, config);
    }
    catch (e)
    {
        console.error(e);
        return [];
    }

}

async function addOrderedObjectsToObj(resOneWebPage, predeterminedObjectsOneActivty, config)
{
    return {
        ...resOneWebPage,
        orderedObjects: await getOrderedObjectsFromHTML(resOneWebPage.path, predeterminedObjectsOneActivty, config)
    };
}

async function processOneActivity(activityResult, dataset, config)
{
    //Get the array of corresponding predeterminedObjects
    let predeterminedObjectsOneActivty = predeterminedObjects.find(el => el.activityName === activityResult.activityName);

    let resAllPages = await from(filesSystem.readdirSync(activityResult.pathToWebPages, { encoding: 'utf8', withFileTypes: true }))
        //Stream of files and dir names in one activity folder
        .pipe(filter(dirent => !dirent.isDirectory()))
        //Stream of files in one activity folder
        .pipe(map(dirent => ({fileName: dirent.name, path: `${activityResult.pathToWebPages}/${dirent.name}`})))
        //Stream of {fileName, path} in one activity folder (Get the path for each webpage)
        .pipe(take(config.limitNumberPagesByActivityForDebug))
        //Stream of {fileName, path} in one activity folder (Get the path for each webpage)
        .pipe(filter(resOneWebPage => !config.filterUsingDataset || dataset.find(data => data.fileName === resOneWebPage.fileName).class === "descriptive"))
        //Stream of {fileName, path} in one activity folder (Filter the web pages which are not "descriptive" using dataset)
        .pipe(concatMap(resOneWebPage => from(addOrderedObjectsToObj(resOneWebPage, predeterminedObjectsOneActivty, config))))
        //Stream of {fileName, path, orderedObjects} in one activity folder (Extract ordered objects from html files)
        .pipe(toArray())
        .toPromise();

    let allOrderedLists = resAllPages.map(res => res.orderedObjects);

    activityResult.numberOfPlans = allOrderedLists.length;
    activityResult.minSupport = config.minSupport;
    activityResult.frequentSequentialPatterns = SPM.PrefixSpan(allOrderedLists, config.minSupport, config.closedMention, config.maximalMention);

    return activityResult;
}

(async ()=>
{
    //Get the folders names of all activities
    let folderNames = filesSystem.readdirSync(GENERAL_CONFIG.pathToWebPagesFolder, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    //Read csv dataset
    let text = filesSystem.readFileSync(GENERAL_CONFIG.pathToGenreDataset, { encoding: 'utf8'});
    let dataset  = csvParse(text, {columns: true, skip_empty_lines: true});

    //Progress variables
    let initTime = new Date();
    let currentActivityProcessed = 0;
    TOOLS.showProgress(currentActivityProcessed, folderNames.length, initTime);

    //Use the HTML files in folders to deduce RawNumPOSETs
    let res = await from(folderNames)
        //Stream of folders names
        .pipe(map(activity => new ActivityResult(activity, `${GENERAL_CONFIG.pathToWebPagesFolder}${activity}`, new Map(), 0, 0)))
        //Stream of folders names
        .pipe(take(GENERAL_CONFIG.limitNumberActivityForDebug))
        //Stream of activity result
        .pipe(concatMap(activityRes => processOneActivity(activityRes, dataset, GENERAL_CONFIG)))
        //Stream of activity result
        .pipe(tap((activityResult) =>
        {
            //console.log("activityResult", activityResult);
            currentActivityProcessed++;
            TOOLS.showProgress(currentActivityProcessed, folderNames.length, initTime);
        }))
        //Stream of activity result
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();

    let preparedActivityResults = res.map(activityResult => activityResult.prepareActivityResultToJSON());
    TOOLS.writeJSONFile(preparedActivityResults, "./output/rawActivityResults.json", GENERAL_CONFIG.indentRawFile);
})();