//Import libs
import * as inputReader from "wait-console-input";

//Personal imports
import ACTIVITY_RESULTS from "./output/rawActivityResults.json";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import filesSystem from "fs";

//Personal classes
//Class of set of array allowing to get unique arrays
class ArraySet extends Set
{
    add(arr)
    {
        super.add(JSON.stringify(arr));
    }
    has(arr)
    {
        return super.has(JSON.stringify(arr));
    }
    toArray()
    {
        return  [...this].map(stringArr => JSON.parse(stringArr));
    }
}

function annotateActivityResults(realActivityResults)
{
    //Get total number of patterns
    let totalNumberPatterns = realActivityResults.reduce((acc, curr) =>
    {
        acc += curr.frequentSequentialPatterns.length;
        return acc;
    }, 0.0);

    //Progress variables
    let initTime = new Date();
    let currentPatternsProcessed = 0;
    TOOLS.showProgress(currentPatternsProcessed, totalNumberPatterns, initTime);

    return realActivityResults.map(activityResult =>
    {
        activityResult.frequentSequentialPatterns = activityResult.frequentSequentialPatterns.map(
            patternInfo =>
            {
                //Annotation process
                console.log("Activity name: ", activityResult.activityName);
                console.log("Pattern: ", patternInfo.pattern);
                patternInfo.annotation = inputReader.readInteger("From 1 to 4, how much the following pattern is relevant? ");

                //Progress variables
                currentPatternsProcessed++;
                TOOLS.showProgress(currentPatternsProcessed, totalNumberPatterns, initTime);

                return patternInfo;
            }
        );

    });
}

(async () =>
{
    //Read all files in experimentationResults folder
    const path = `experimentationResults`;
    const filePaths = filesSystem.readdirSync( path, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `${path}/${dirent.name}`);

    //Gel all unique patterns in all files
    const allPatterns = filePaths.map(filePath =>
    {
        //Get resultFile
        const expFile = JSON.parse(filesSystem.readFileSync(filePath));

        return expFile.map(combinationRes =>
        {
            let realActivityResults = combinationRes.activityResults.map(a => new ActivityResult(a));
            return realActivityResults.map(actRes => actRes.frequentSequentialPatterns);
        });
    }).flat(3).map(patInfo => patInfo.pattern);
    console.log("allPatterns.length", allPatterns.length);

    let uniquePatterns = (new ArraySet(allPatterns)).toArray();
    console.log("uniquePatterns.length", uniquePatterns.length);


    //Convert into real activity results
    let realActivityResults = ACTIVITY_RESULTS.map(a => new ActivityResult(a));

    //Annotate method
    let annotatedActivityResults = annotateActivityResults(realActivityResults);

    //Prepare and write annotated files
    let preparedAnnotatedActivityResults = annotatedActivityResults.map(activityResult => activityResult.prepareActivityResultToJSON());
    TOOLS.writeJSONFile(preparedAnnotatedActivityResults, "./output/annotatedActivityResults.json", GENERAL_CONFIG.indentRawFile);

})();