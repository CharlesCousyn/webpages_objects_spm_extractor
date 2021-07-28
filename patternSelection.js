//Imports
import filesSystem from "fs";
import * as TOOLS from "./tools";
import ExperimentationResult from "./entities/ExperimentationResult";

//Constants
const WANTED_CONFIGURATION= {
    genericOrSpecificParsing: false,
    verbAssociatorUsed: false,
    verbAssociatorProximityBasedOrSyntacticBased: true,
    hypernymMutation: false,
    closedOrMaximalPattern: true,
    minSupport: 1
};

const WANTED_ACTIVITIES = ["watch_tv", "answer_the_phone", "make_coffee", "make_tea", "vacuum", "clean", "cook_pasta"];

const THRESHOLD_ANNOTATION = 0.8;

const PATH_ANNOTATED_RESULTS = `./experimentationResults/allConfAnnotatedExperimentalResults`;

//Function to test equivalence by value of object (doesn't work with deep objects)
//source: http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
function isEqualsByValue(a, b)
{
    // Create arrays of property names
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length !== bProps.length)
    {
        return false;
    }

    for (let i = 0; i < aProps.length; i++)
    {
        let propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName])
        {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}


//Main
(async () =>
{
    //Find the wanted configuration
    //List all annotatedResults and keep only the wanted one (see wantedConfiguration)
    let resultsForWantedConfiguration =
        filesSystem.readdirSync(PATH_ANNOTATED_RESULTS, { encoding: 'utf8', withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => `${PATH_ANNOTATED_RESULTS}/${dirent.name}`)
            .map(filePath => JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate))
            .map(expFile => expFile.map(a => new ExperimentationResult(a)))
            .map(realExperimentationResultArray => realExperimentationResultArray[0])
            .filter(annotatedResult => isEqualsByValue(WANTED_CONFIGURATION, annotatedResult.configuration))[0];

    //List all patterns for wanted activities regarding the THRESHOLD_ANNOTATION
    let patternsPerActivity = resultsForWantedConfiguration.activityResults
            .filter(activityResult => WANTED_ACTIVITIES.includes(activityResult._activityName))
            .map(activityResult => (
                {
                    activityName: activityResult._activityName,
                    activityPatterns: activityResult
                    ._frequentSequentialPatterns
                    .map(sequentialPattern => ({pattern: sequentialPattern.pattern, annotation: sequentialPattern.annotation}))
                    .filter(sequentialPattern => sequentialPattern.annotation >= THRESHOLD_ANNOTATION)
                })
            );

    //Save that annotation
    TOOLS.writeJSONFile(patternsPerActivity, "./selectedPatterns/patterns.json", true);

    //Get the list of all objects/substances
    let objects = patternsPerActivity.map(obj => obj.activityPatterns.map(patternInfos => patternInfos.pattern), 2).flat(2);
    //Keep only unique objects
    let uniqueObjects = [new Set(objects)];

    //TODO evaluate which object can be used or simulated in the lab



    console.log("End");



})();
//Read all files

