import Wordpos from "wordpos";
import htmlToText  from "html-to-text";
import csvParse from "csv-parse/lib/sync"
import fileSystem from "fs";
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, take, bufferCount, count, distinct} from 'rxjs/operators';

import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import filesSystem from "fs";
import NumPOSET from "./entities/NumPOSET";

//Init wordpos
let wordpos = new Wordpos();

function writeJSONFile(data, path)
{
    filesSystem.writeFileSync(path, JSON.stringify(data, null, 4), "utf8");
}

function initiatePOSET(pathWebPage)
{

}

async function getPOSETFromHTML(pathWebPage)
{
    let objIndex = await getOrderedObjectsFromHTML(pathWebPage);

    //InitiateNumPOSET
    let pos = new NumPOSET(objIndex);

    for(let i= 0; i< objIndex.length; i++)
    {
        for(let j= i+1; j <objIndex.length; j++)
        {
            pos.addMatValue(objIndex[i], objIndex[j], 1);
        }
    }

    return pos;
}

async function initPOSETFromHTML(pathWebPage)
{
    let objects = await getOrderedObjectsFromHTML(pathWebPage);

    return new NumPOSET(objects);
}

async function updatePOSETFromHTML(pathWebPage, POSET)
{
    let objIndex = await getOrderedObjectsFromHTML(pathWebPage);

    //InitiateNumPOSET
    let pos = new NumPOSET(objIndex);

    for(let i= 0; i< objIndex.length; i++)
    {
        for(let j= i+1; j <objIndex.length; j++)
        {
            pos.addMatValue(objIndex[i], objIndex[j], 1);
        }
    }

    return pos;
}

async function getOrderedObjectsFromHTML(pathWebPage)
{
    //Extract text from HTML
    let htmlText = fileSystem.readFileSync(pathWebPage, 'utf8');
    let text = htmlToText.fromString(htmlText);

    //console.log(await wordpos.parse(text));

    //Extract objects from text
    let nouns = await wordpos.getNouns(text);

    console.log(nouns);
    writeJSONFile(nouns, "./nouns.json");

    let objects = await from(nouns)
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


    //Get indexes for each object
    let objIndex = objects.map(object =>
    {
        const reg = new RegExp(`(${object})`);
        return [object, text.match(reg).index];
    });

    //Sort the objects and keep only the name in lower case
    objIndex = objIndex
        .filter((el, index) => index <10)
        .sort((a, b) => a[1]- b[1])
        .map(el => el[0].toLowerCase());
}

(async ()=>
{
    //For each activity
        //initiatePOSET()
        //For each descriptive web page
            //Extract text from HTML
            //Extract objects from text
            //Find index of objects in text
            //Update NumPOSET


    //Get the folders names of all activities
    let folderNames = filesSystem.readdirSync(GENERAL_CONFIG.pathToWebPagesFolder, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    //Read csv dataset
    let text = filesSystem.readFileSync(GENERAL_CONFIG.pathToGenreDataset, { encoding: 'utf8'});
    let dataset  = csvParse(text, {columns: true, skip_empty_lines: true});

    await from(folderNames)
        //Get the path for each activity folder and init POSET
        .pipe(map(activity => ({activityName:activity, pathToWebPages: `${GENERAL_CONFIG.pathToWebPagesFolder}/${activity}`, numPOSET: new NumPOSET([])})))
        .pipe(mergeMap(activityObj =>
            //Get the path for each webpage
            from(filesSystem.readdirSync(activityObj.pathToWebPages, { encoding: 'utf8', withFileTypes: true }))
                .pipe(filter(dirent => !dirent.isDirectory()))
                //Get the path for each webpage
                .pipe(map(dirent => ({fileName: dirent.name, path: `${activityObj.pathToWebPages}/${dirent.name}`})))
                //Filter the web pages which are not "descriptive"
                .pipe(filter(el => dataset.find(data => data.fileName === el.fileName).class === "descriptive"))
                //Extract ordered objects from html files
                .pipe(mergeMap(from(async JSObj => ({...JSObj, orderedObjects: await getOrderedObjectsFromHTML(JSObj.path)}))))
                //Adding ids in POSET when they doesn't exist
                .pipe(map(JSObj =>
                {
                    JSObj.orderedObjects.forEach(id =>
                    {
                        //if id doesn't already exist
                        if(!activityObj.numPOSET.checkIdExist(id))
                        {
                            activityObj.numPOSET.addId(id);
                        }
                    });
                    return JSObj;
                }))
                //Updating values in NumPOSET matrix
                .pipe(map(JSObj =>
                {
                    for(let i= 0; i< JSObj.orderedObjects.length; i++)
                    {
                        for(let j= i+1; j <JSObj.orderedObjects.length; j++)
                        {
                            activityObj.numPOSET.addMatValue(JSObj.orderedObjects[i], JSObj.orderedObjects[j], 1);
                        }
                    }
                }))
        ))
        .pipe(toArray())
        .toPromise();

    try
    {
        let poset = await getPOSETFromHTML("./descriptiveWebPages/cook_pasta_100.html");

        let res = await wordpos.getPOS('We use cookies to personalise content and ads, to provide social media features\n' +
            'and to analyse our traffic. We also share information about your use of our site\n' +
            'with our social media, advertising and analytics partners who may combine it\n' +
            'with other information that you’ve provided to them or that they’ve collected\n' +
            'from your use of their services. You consent to our cookies if you continue to\n' +
            'use our Website.');

        console.log(res);
    }
    catch (e)
    {
        console.error(e);
    }


})();