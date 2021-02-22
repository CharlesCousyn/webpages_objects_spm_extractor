//Import libs
import * as inputReader from "wait-console-input";

//Personal imports
import ACTIVITY_RESULTS from "./output/rawActivityResults.json";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";

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
            }
        );

    });
}

(async () =>
{
    //Convert into real activity results
    let realActivityResults = ACTIVITY_RESULTS.map(a => new ActivityResult(a));

    //Annotate method
    let annotatedActivityResults = annotateActivityResults(realActivityResults);

    //Prepare and write annotated files
    let preparedAnnotatedActivityResults = annotatedActivityResults.map(activityResult => activityResult.prepareActivityResultToJSON());
    TOOLS.writeJSONFile(preparedAnnotatedActivityResults, "./output/annotatedActivityResults.json", GENERAL_CONFIG.indentRawFile);

})();