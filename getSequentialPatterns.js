//Libs
import Wordpos from "wordpos";
import htmlToText  from "html-to-text";
import csvParse from "csv-parse/lib/sync";
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take, isEmpty} from 'rxjs/operators';
import filesSystem from "fs";
import clone from "clone";
import Lexed from 'lexed';
import {Tag} from 'en-pos';
import parser from 'en-parse';
import { Inflectors } from "en-inflectors";
import {normalizeCaps, replaceConfusables, resolveContractions} from "en-norm";

//Personal imports
import predeterminedObjects from "./configFiles/predeterminedObjects.json";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import ActivityResult from "./entities/ActivityResult";
import * as htmlProcessing from "./htmlProcessing";
import * as TOOLS from "./tools";
import * as GSP from "./sequentialPatternMining/GSP";
import * as PrefixSpan from "./sequentialPatternMining/PrefixSpan";
import * as VMSP from "./sequentialPatternMining/VMSP";
import {arraysMatch} from "./tools";

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

        return validTokens;
    }
    else
    {
        //Only keep the pure form of the token to avoid synonyms abundance
        let validTokens = validTokensInfos.map(tokInfo => tokInfo.definitions[0].lemma);

        return validTokens;
    }
}

async function getPlansFromHTML(pathWebPage, predeterminedObjectsOneActivty, config)
{
    console.log("pathWebPage", pathWebPage);

    try
    {
        let cleanPlans = [];
        if(config.useSpecificStruct)
        {
            let rawPlans = await htmlProcessing.extractPlans(pathWebPage);

            for(let rawPlan of rawPlans)
            {
                let rawSteps = rawPlan.join(" ");

                //Clean the text of each raw plan
                cleanPlans.push(htmlProcessing.stringToCleanText(rawSteps, config));

                //Write a new text file
                //let pathToTextFile = `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`;
                //TOOLS.writeTextFile(cleanText, pathToTextFile);
            }
        }
        else
        {
            //Get the HTML string
            let htmlString = TOOLS.readTextFile(pathWebPage);
            //Clean the text
            cleanPlans.push(htmlProcessing.htmlStringToCleanText(htmlString, config));

            //Write a new text file
            //let pathToTextFile = `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`;
            //TOOLS.writeTextFile(cleanText, pathToTextFile);
        }

        //Extract object in order from text
        return await Promise.all(cleanPlans.map(cleanPlan => getOrderedObjectsFromTextFin(cleanPlan, predeterminedObjectsOneActivty, config)));
    }
    catch(e)
    {
        console.error(e);
        return [];
    }
}

async function addPlansToObj(resOneWebPage, predeterminedObjectsOneActivty, config)
{
    return {
        ...resOneWebPage,
        plans: await getPlansFromHTML(resOneWebPage.path, predeterminedObjectsOneActivty, config)
    };
}

async function processOneActivity(activityResult, dataset, config)
{
    console.log(`\nProcessing activity ${activityResult.activityName}...`);
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
        .pipe(concatMap(resOneWebPage => from(addPlansToObj(resOneWebPage, predeterminedObjectsOneActivty, config))))
        //Stream of {fileName, path, plans} in one activity folder (Extract ordered objects from html files)
        .pipe(toArray())
        .toPromise();

    let allOrderedLists = resAllPages.flatMap(res => res.plans);

    if(config.pruningObjectsUsingWordnet)
    {
        allOrderedLists = await pruningObjectsByDirectHypernym(allOrderedLists);
    }

    //Saving allOrderedLists (useful in case of recovering of all frequent patterns from maximal only)
    TOOLS.writeJSONFile(allOrderedLists, `./output/${activityResult.activityName}__allOrderedLists.json`, true);

    activityResult.numberOfPlans = allOrderedLists.length;
    console.log(`${activityResult.numberOfPlans} plans found!`);
    console.log(`${(new Set(allOrderedLists.flat()).size)} distinct objects or couples (verb, object) found!`);
    activityResult.typeOfPattern = (config.maximalNotClosed ? "maximal" : "closed");
    activityResult.minNumberPatterns = config.minNumberPatterns;

    //Init minSupp
    let currentMinSupp = config.minSupport;
    do
    {
        activityResult.minSupport = currentMinSupp;
        //SPM!!
        //activityResult.frequentSequentialPatterns = GSP.run(allOrderedLists, config.minSupport, config.closedMention, config.maximalMention);
        //activityResult.frequentSequentialPatterns = PrefixSpan.run(allOrderedLists, config.minSupport, config.closedMention, config.maximalMention);
        activityResult.frequentSequentialPatterns = VMSP.run(allOrderedLists, currentMinSupp, config.maximalNotClosed);

        currentMinSupp -= config.stepSupport;
    }while(activityResult.minNumberPatterns !== null && currentMinSupp > 0 && activityResult.frequentSequentialPatterns.size < activityResult.minNumberPatterns);

    activityResult.numberOfPatterns = activityResult.frequentSequentialPatterns.size;

    return activityResult;
}

function applyTfIdf(activityResults)
{
    let activitiesNumber = activityResults.length;

    //Transform pattern infos into objects
    activityResults = activityResults.map(activityResult =>
    {
        activityResult.frequentSequentialPatterns = activityResult.frequentSequentialPatterns.map(([pattern, patternFrequency]) => ({pattern, patternFrequency}));
        return activityResult;
    });

    //Apply TFIDF for real
    activityResults = activityResults.map(activityResult =>
    {
        activityResult.frequentSequentialPatterns = activityResult.frequentSequentialPatterns.map(({pattern, patternFrequency}) =>
        {
            let numberOfActivitiesWhereThePatternAppears = activityResults.reduce((count, activityResult) =>
            {
                if(activityResult.frequentSequentialPatterns.filter(patInfos => arraysMatch(pattern, patInfos.pattern)).length !== 0)
                {
                    count += 1;
                }
                return count;
            }, 0);
            let inverseActivityFrequency = Math.log10(activitiesNumber / numberOfActivitiesWhereThePatternAppears);
            let pfIaf = patternFrequency * inverseActivityFrequency;
            return {pattern, patternFrequency, inverseActivityFrequency, pfIaf};
        });
        return activityResult;
    });
    return activityResults;
}

async function pruningObjectsByDirectHypernym(allOrderedLists)
{
    console.log("Pruning objects by search of direct hypernym...");

    //Get ordered objects and orderedVerbs
    let allOrderedVerbs = allOrderedLists.map(orderedList => orderedList.map(string => string.split("||")[0]));
    let allOrderedObjects = allOrderedLists.map(orderedList => orderedList.map(string => string.split("||")[1]));

    //Extract all the unique objects
    let uniqueObjects = [...new Set(allOrderedObjects.flat())];

    //Getting direct hypernyms
    let objWithHypernyms = await Promise.all(uniqueObjects.map(async object => ({name: object, directHypernyms: await getDirectHypernyms(object)})));

    //Find objects to transform
    let arrayOfObjectToTransform = [];
    objWithHypernyms.forEach(obj1=>
    {
        //If a hypernym of name1 exists in the objects
        objWithHypernyms.forEach(obj2=>
        {
            if(obj1.name !== obj2.name && obj1.directHypernyms.includes(obj2.name))
            {
                arrayOfObjectToTransform.push([obj1.name, obj2.name]);
            }
        });
    });

    //Apply transformation...
    allOrderedLists = allOrderedObjects.map((orderedObjects, indexPlan) =>
        orderedObjects.map((objectString, indexCouple)=>
        {
            let transformation = arrayOfObjectToTransform.filter(([hypo, hyper]) => hypo === objectString);
            let newObject = transformation.length === 1 ? transformation[0][1] : objectString;
            return `${allOrderedVerbs[indexPlan][indexCouple]}||${newObject}`;
        }));

    return allOrderedLists;
}

async function getDirectHypernyms(object)
{
    let groupsOfPointers = (await wordpos.lookupNoun(object))
        //Keeping definitions of senses included in our categories
        .filter(def => GENERAL_CONFIG.allowedLexNames.includes(def.lexName))
        //Keeping pointers only
        .map(def => def.ptrs)
        //Keeping the most common sense only
        .filter((pointers, index) => index === 0);
    //Getting the hypernyms pointers only
    let relationsToUse = groupsOfPointers.flatMap(pointers => pointers.find(relation => relation.pointerSymbol === "@"));
    //using hypernymPointers to get hypernyms
    return Promise.all(relationsToUse.map(async hypernymPointer => (await wordpos.seek(hypernymPointer.synsetOffset, hypernymPointer.pos)).lemma));
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
        .pipe(tap(() =>
        {
            currentActivityProcessed++;
            TOOLS.showProgress(currentActivityProcessed, folderNames.length, initTime);
        }))
        //Stream of activity result
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();

    let preparedActivityResults = res.map(activityResult => activityResult.prepareActivityResultToJSON());

    //Apply TFIDF
    preparedActivityResults = applyTfIdf(preparedActivityResults);

    TOOLS.writeJSONFile(preparedActivityResults, "./output/rawActivityResults.json", GENERAL_CONFIG.indentRawFile);
})();