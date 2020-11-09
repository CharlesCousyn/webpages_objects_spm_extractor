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

//Personal imports
import predeterminedObjects from "./configFiles/predeterminedObjects.json";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import NumPOSET from "./entities/NumPOSET";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";
import GraphAdjList from "./entities/GraphAdjList";

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

function htmlStringToCleanText(htmlString)
{
    let text = htmlToText.fromString(htmlString, GENERAL_CONFIG.configHTML2Text);

    //Delete all non pure text things...
    //JSON strings
    let processedText = text.replace(new RegExp("({\".*})", "gs"), "");
    //Urls
    processedText = processedText.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");
    //HTML entities and slang
    processedText = replaceHTMLEntities(reverseSlang(resolveContractions(replaceConfusables(processedText))));

    return processedText;
}

async function keepTokensNounAndValidLexName(processedSentences)
{
    return await from(processedSentences)
        .pipe(mergeMap(processedSentence => from(processedSentence)))
        .pipe(filter(tokInfo=> tokInfo.POS.startsWith("NN")))
        .pipe(concatMap(async tokInfo => ({...tokInfo, definitions: await wordpos.lookupNoun(tokInfo.pureForm)})))
        .pipe(map(tokInfo =>
        {
            tokInfo.definitions = tokInfo.definitions.filter(def => GENERAL_CONFIG.allowedLexNames.includes(def.lexName));
            return tokInfo;
        }))
        .pipe(filter(tokInfo => Array.isArray(tokInfo.definitions) && tokInfo.definitions.length))
        .pipe(toArray())
        .toPromise();
}

async function getAssociatedVerbs(tokInfoObjects, processedSentences)
{
    return await from(tokInfoObjects)
        .pipe(concatMap(async tokInfoObject =>
        {
            let nearestVerb = await from(processedSentences[tokInfoObject.indexSentence])
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

    /*let objVerbArrays = await Promise.all(
        tokInfoObjects.map(async tokInfoObject =>
    {
        let currentSentence = processedSentences[tokInfoObject.indexSentence];

        //Identify verbs in current sentence
        let promiseVerbs = currentSentence.filter(tokInfo => tokInfo.POS.startsWith("VB"))
            .map(async verbTokInfo => ({...verbTokInfo, definitions: await wordpos.lookupVerb(verbTokInfo.pureForm)}));

        let verbs = await Promise.all(promiseVerbs);

        //If no verb in sentence
        if(verbs.length === 0)
        {
            return null;
        }

        //Find the nearest verb
        let nearestVerb = verbs.reduce((goodTokInfoVerb, tokInfoVerb, index, array) =>
        {
            if(goodTokInfoVerb === null || (Math.abs(tokInfoObject.indexToken - tokInfoVerb.indexToken) < Math.abs(tokInfoObject.indexToken - goodTokInfoVerb.indexToken)))
            {
                goodTokInfoVerb = tokInfoVerb;
            }
            return goodTokInfoVerb;
        }, null);

        //If the nearest verb has no definition in wordnet
        if(nearestVerb.definitions.length === 0)
        {
            return null;
        }

        return [nearestVerb, tokInfoObject];
    }));

    //Removing null values (token without associated verbs)
    return objVerbArrays.filter(arr => arr !== null);*/
}

async function getOrderedObjectsFromTextFin(cleanText, useOfPredeterminedObjects, predeterminedObjectsOneActivty, useVerb)
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

    let validTokensInfos = await keepTokensNounAndValidLexName(processedSentences);// add definitions

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

    if(useOfPredeterminedObjects)
    {
        //Search definitions of each predetermined object
        let promiseAddDefs = predeterminedObjectsOneActivty.objects.map(async obj => ({name:obj, definitions: await wordpos.lookupNoun(obj) }));
        let predObjWithDefinitions = await Promise.all(promiseAddDefs);
        let predObjLemmas = predObjWithDefinitions.map(obj => obj.definitions[0].lemma);

        //Intersection between valid tokens found in text and predetermined objects
        validTokensInfos = validTokensInfos.filter(tokInfo => predObjLemmas.includes(tokInfo.definitions[0].lemma));
    }

    if(useVerb)
    {
        //Use sentences where valid tokens are to add to nearest verb
        //Return arrays of array of type [tokInfoVerb, tokInfoObject]
        let tokInfosWithVerbs = await getAssociatedVerbs(validTokensInfos, processedSentences);

        //Only keep the pure form of the token to avoid synonyms abundance
        let validTokens = tokInfosWithVerbs.map(tokInfoWithVerbs =>
        {
            return `${tokInfoWithVerbs[0].definitions[0].lemma}||${tokInfoWithVerbs[1].definitions[0].lemma}`
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

async function getOrderedObjectsFromHTML(pathWebPage, useOfPredeterminedObjects, predeterminedObjectsOneActivty, useVerb)
{
    console.log("pathWebPage", pathWebPage);
    try
    {
        //Get the HTML string
        let htmlString = TOOLS.readTextFile(pathWebPage);
        //Clean the text
        let cleanText = htmlStringToCleanText(htmlString);
        //Write a new text file
        let pathToTextFile = `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`;
        TOOLS.writeTextFile(cleanText, pathToTextFile);

        //Extract object in order from text
        return await getOrderedObjectsFromTextFin(cleanText, useOfPredeterminedObjects, predeterminedObjectsOneActivty, useVerb);
    }
    catch (e)
    {
        console.error(e);
        return [];
    }

}

async function addOrderedObjectsToObj(resOneWebPage, useOfPredeterminedObjects, predeterminedObjectsOneActivty, useVerb)
{
    return {
        ...resOneWebPage,
        orderedObjects: await getOrderedObjectsFromHTML(resOneWebPage.path, useOfPredeterminedObjects, predeterminedObjectsOneActivty, useVerb)
    };
}

function updateActivityResultWithOnePage(resOneWebPage, activityResult)
{
    //Add 1 to number of pages value
    activityResult.numberOfWebPages += 1;

    //Add the corresponding Ids in matrix
    resOneWebPage.orderedObjects.forEach(id =>
    {
        //if id doesn't already exist
        if(!activityResult.numPOSET.checkIdExist(id))
        {
            activityResult.numPOSET.addId(id);
        }
    });

    //Add 1 when there's a relation
    for(let i= 0; i< resOneWebPage.orderedObjects.length; i++)
    {
        for(let j= i+1; j <resOneWebPage.orderedObjects.length; j++)
        {
            activityResult.numPOSET.addMatValue(resOneWebPage.orderedObjects[i], resOneWebPage.orderedObjects[j], 1);
        }
    }
    return activityResult;
}



async function processOneActivity(activityResult, dataset)
{
    //Get the array of corresponding predeterminedObjects
    let predeterminedObjectsOneActivty = predeterminedObjects.find(el => el.activityName === activityResult.activityName);

    let resAllPages = await from(filesSystem.readdirSync(activityResult.pathToWebPages, { encoding: 'utf8', withFileTypes: true }))
        //Stream of files and dir names in one activity folder
        .pipe(filter(dirent => !dirent.isDirectory()))
        //Stream of files in one activity folder
        .pipe(map(dirent => ({fileName: dirent.name, path: `${activityResult.pathToWebPages}/${dirent.name}`})))
        //Stream of {fileName, path} in one activity folder (Get the path for each webpage)
        .pipe(filter(resOneWebPage => dataset.find(data => data.fileName === resOneWebPage.fileName).class === "descriptive"))
        //Stream of {fileName, path} in one activity folder (Filter the web pages which are not "descriptive" using dataset)
        .pipe(concatMap(resOneWebPage => from(addOrderedObjectsToObj(resOneWebPage, GENERAL_CONFIG.useOfPredeterminedObjects, predeterminedObjectsOneActivty, GENERAL_CONFIG.useVerb))))
        //Stream of {fileName, path, orderedObjects} in one activity folder (Extract ordered objects from html files)
        .pipe(toArray())
        .toPromise();

    let allOrderedLists = resAllPages.map(res => res.orderedObjects);

    //Get all the uniques ids
    let allUniqueIds = [...new Set(allOrderedLists.flat())];

    //Add uniques ids to numPOSET
    allUniqueIds.forEach(id => activityResult.graphAdjList.addNode(id, true));

    //Add Values in matrix
    //Add 1 when there's a relation
    allOrderedLists.forEach(orderedList =>
    {
        activityResult.numberOfWebPages += 1;
        for(let i= 0; i< orderedList.length; i++)
        {
            for(let j= i+1; j <orderedList.length; j++)
            {
                activityResult.graphAdjList.addWeightToAnEdge(orderedList[i], orderedList[j], 1, true);
            }
        }
    });

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
        .pipe(map(activity => new ActivityResult(activity, `${GENERAL_CONFIG.pathToWebPagesFolder}${activity}`, new GraphAdjList(), 0, 0)))
        //Stream of folders names
        .pipe(take(GENERAL_CONFIG.limitNumberActivityForDebug))
        //Stream of activity result
        .pipe(concatMap(activityRes => processOneActivity(activityRes, dataset)))
        //Stream of activity result
        .pipe(tap((activityResult) =>
        {
            console.log("activityResult", activityResult);
            currentActivityProcessed++;
            TOOLS.showProgress(currentActivityProcessed, folderNames.length, initTime);
        }))
        //Stream of activity result
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();

    let preparedActivityResults = res.map(activityResult => TOOLS.prepareActivityResultToJSON(activityResult));
    TOOLS.writeJSONFile(preparedActivityResults, "./output/rawActivityResults.json", false);

})();