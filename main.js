//Libs
import filesSystem from "fs";
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take, isEmpty} from 'rxjs/operators';
import csvParse from "csv-parse/lib/sync";

//Personal imports
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import * as TOOLS from "./tools";
import ActivityResult from "./entities/ActivityResult";
import * as getSeqPat from "./getSequentialPatterns";


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
        .pipe(concatMap(activityRes => getSeqPat.processOneActivity(activityRes, dataset, GENERAL_CONFIG)))
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
    preparedActivityResults = getSeqPat.applyTfIdf(preparedActivityResults);

    TOOLS.writeJSONFile(preparedActivityResults, "./output/rawActivityResults.json", GENERAL_CONFIG.indentRawFile);
})();