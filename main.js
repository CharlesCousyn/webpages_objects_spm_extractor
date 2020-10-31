//Libs
import Wordpos from "wordpos";
import htmlToText  from "html-to-text";
import csvParse from "csv-parse/lib/sync"
import {JSDOM} from "jsdom";
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take} from 'rxjs/operators';
import filesSystem from "fs";

//Personal imports
import predeterminedObjects from "./configFiles/predeterminedObjects.json";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import NumPOSET from "./entities/NumPOSET";
import ActivityResult from "./entities/ActivityResult";

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

function writeJSONFile(data, path)
{
    filesSystem.writeFileSync(path, JSON.stringify(data, null, 4), "utf8");
}

function writeTextFile(data, path)
{
    filesSystem.writeFileSync(path, data, {encoding:"utf8"});
}

async function getOrderedObjectsFromHTML(pathWebPage, useOfPredeterminedObjects, predeterminedObjectsOneActivty)
{
    //Extract text from HTML
    try
    {
        let htmlText = filesSystem.readFileSync(pathWebPage, 'utf8');
        let text = htmlToText.fromString(htmlText, GENERAL_CONFIG.configHTML2Text);

        //Delete all non pure text things...
        text = text.replace(new RegExp("({\".*})", "gs"), "");//JSON strings
        text = text.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");//Urls

        //writeTextFile(text, `./textWebPages/${pathWebPage.split("/").pop().split(".")[0]}.txt`);

        //console.log(await wordpos.parse(text));

        //Extract objects from text
        let nouns = await wordpos.getNouns(text);


        let detectedObjects = [];
        if(useOfPredeterminedObjects)
        {
            //Use our the predeterminedObjects
            let definitionsPresentNouns = await from(nouns)
                //Get definitions keeping + the original noun
                .pipe(mergeMap(noun => from((async () => (await wordpos.lookupNoun(noun)).map(el => ({noun, ...el})))())))
                //Keep only definition where the lexName is allowed
                .pipe(map(definitionsOneNoun => definitionsOneNoun.filter(def => GENERAL_CONFIG.allowedLexNames.includes(def.lexName))))
                //Keep only nouns where there's at least one definition
                .pipe(filter(definitionsOneNoun => Array.isArray(definitionsOneNoun) && definitionsOneNoun.length))
                .pipe(toArray())
                .toPromise();

            let predeterminedObjectsLemma = await from(predeterminedObjectsOneActivty)
                //Get definitions keeping + the original noun
                .pipe(mergeMap(noun => from((async () => (await wordpos.lookupNoun(noun)).map(el => ({noun, ...el})))())))
                //Keep only definition where the lexName is allowed
                .pipe(map(definitionsOneNoun => definitionsOneNoun.filter(def => GENERAL_CONFIG.allowedLexNames.includes(def.lexName))))
                .map(obj => obj.lemma)
                .pipe(toArray())
                .toPromise();

            //Get the intersection between the 2 arrays
            let intersec = definitionsPresentNouns.filter(presentNoun => predeterminedObjectsLemma.includes(presentNoun.lemma));

            //Get only the original forms of noun/objects
            detectedObjects = intersec.map(el => el.noun);
        }
        else
        {
            //Find our own set of objects
            detectedObjects = await from(nouns)
                //Get definitions keeping + the original noun
                .pipe(mergeMap(noun => from((async () => (await wordpos.lookupNoun(noun)).map(el => ({noun, ...el})))())))
                //Keep only definition where the lexName is allowed
                .pipe(map(definitionsOneNoun => definitionsOneNoun.filter(def => GENERAL_CONFIG.allowedLexNames.includes(def.lexName))))
                //Keep only nouns where there's at least one definition
                .pipe(filter(definitionsOneNoun => Array.isArray(definitionsOneNoun) && definitionsOneNoun.length))
                //Keep only the noun
                .pipe(map(noun => noun[0].noun))
                //Keep no duplicates when in lower case
                .pipe(distinct(noun => noun.toLowerCase()))
                .pipe(toArray())
                .toPromise();
        }

        //Get indexes for each object in text
        let objIndex = detectedObjects.map(object =>
        {
            const reg = new RegExp(`(${object})`);
            return [object, text.match(reg).index];
        });

        //Sort the objects by indexes and keep only the name in lower case
        return objIndex
            .filter((el, index) => index <10)
            .sort((a, b) => a[1]- b[1])
            .map(el => el[0].toLowerCase());
    }
    catch (e)
    {
        console.error(e);
        return [];
    }

}

async function addOrderedObjectsToObj(obj, useOfPredeterminedObjects, predeterminedObjectsOneActivty)
{
    return {
        ...obj,
        orderedObjects: await getOrderedObjectsFromHTML(obj.path, useOfPredeterminedObjects, predeterminedObjectsOneActivty)
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

function normalizeAndReturn(activityRes)
{
    activityRes.numPOSET.normalize(0, 1, GENERAL_CONFIG.normalizationOrStandardization);
    activityRes.numPOSET.flat = activityRes.numPOSET.matrix.flat();
    return activityRes;
}

function processOneActivity(activityResult, dataset)
{
    //Get the array of corresponding predeterminedObjects
    let predeterminedObjectsOneActivty = predeterminedObjects.find(el => el.activityName === activityResult.activityName);

    return from(filesSystem.readdirSync(activityResult.pathToWebPages, { encoding: 'utf8', withFileTypes: true }))
        //Stream of files and dir names in one activity folder
        .pipe(filter(dirent => !dirent.isDirectory()))
        //Stream of files in one activity folder
        .pipe(map(dirent => ({fileName: dirent.name, path: `${activityResult.pathToWebPages}/${dirent.name}`})))
        //Stream of {fileName, path} in one activity folder (Get the path for each webpage)
        .pipe(filter(resOneWebPage => dataset.find(data => data.fileName === resOneWebPage.fileName).class === "descriptive"))
        //Stream of {fileName, path} in one activity folder (Filter the web pages which are not "descriptive" using dataset)
        .pipe(concatMap(resOneWebPage => from(addOrderedObjectsToObj(resOneWebPage, GENERAL_CONFIG.useOfPredeterminedObjects, predeterminedObjectsOneActivty))))
        //Stream of {fileName, path, orderedObjects} in one activity folder (Extract ordered objects from html files)
        .pipe(map(resOneWebPage => updateActivityResultWithOnePage(resOneWebPage, activityResult)))
        //Stream of activityResult (for each webpage)
        .pipe(takeLast(1))
        //Stream of activityResult (for each webpage) (keeping only the last updated)
        .pipe(map(activityResult => normalizeAndReturn(activityResult)))
        //Stream of activityResult (for each webpage) (normalized Matrix produced)
        .pipe(tap(console.log))
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

    //Use the HTML files in folders to deduce NumPOSETs
    let res = await from(folderNames)
        //Stream of folders names
        .pipe(map(activity => new ActivityResult(activity, `${GENERAL_CONFIG.pathToWebPagesFolder}${activity}`, new NumPOSET([]), 0)))
        //Stream of folders names
        .pipe(take(GENERAL_CONFIG.limitNumberActivityForDebug))
        //Stream of activity result
        .pipe(concatMap(activityRes => processOneActivity(activityRes, dataset)))
        //Stream of activity result
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();

    writeJSONFile(res, "./finalResults.json");

})();