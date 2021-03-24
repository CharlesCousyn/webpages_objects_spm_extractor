//Import libs
import * as inputReader from "wait-console-input";

//Personal imports
import ACTIVITY_RESULTS from "../output/rawActivityResults.json";
import ActivityResult from "../entities/ActivityResult";
import * as TOOLS from "../tools";
import GENERAL_CONFIG from "../configFiles/generalConfig.json";
import filesSystem from "fs";
import ExperimentationResult from "../entities/ExperimentationResult";

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

function annotateCouplesActivityNamePatterns(notAnnotatedUniqueCouples)
{
    const pathAnnotated = `./experimentationResults/allConfAnnotatedExperimentalResults`;
    const nameFiles = filesSystem.readdirSync( pathAnnotated, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);

    const filePathsAnnotated = nameFiles.map(name => `${pathAnnotated}/${name}`);

    let dataFilesAnnotated = filePathsAnnotated.map((filePath) => [filePath, new ExperimentationResult(JSON.parse(filesSystem.readFileSync(filePath))[0])]);

    //Progress variables
    let initTime = new Date();
    let currentPatternsProcessed = 0;
    TOOLS.showProgress(currentPatternsProcessed, notAnnotatedUniqueCouples.length, initTime);

    notAnnotatedUniqueCouples.forEach(([activityName, pattern]) =>
    {
        //Annotation process
        console.log("Activity name: ", activityName);
        console.log("Pattern: ", pattern);
        let annotation = inputReader.readInteger("From 1 to 4, how much the following pattern is relevant? ");

        //Progress variables
        currentPatternsProcessed++;
        TOOLS.showProgress(currentPatternsProcessed, notAnnotatedUniqueCouples.length, initTime);

        let triplet = [activityName, pattern, annotation];

        //Save the annotation in dataFilesAnnotated and write file
        dataFilesAnnotated.forEach(([pathToWrite, dataToUpdate])=>
        {
            //If triplet is in dataToUpdate, update
            for(let activityResult of dataToUpdate.activityResults.map(a => new ActivityResult(a)))
            {
                let indexCorrespondingPat = activityResult.frequentSequentialPatterns.findIndex(patInfo => activityResult.activityName === triplet[0] && TOOLS.arraysMatch(patInfo.pattern, triplet[1]));
                //If one correspondance
                if(indexCorrespondingPat !== -1)
                {
                    //Update to add annotation
                    activityResult.frequentSequentialPatterns[indexCorrespondingPat].annotation = triplet[2];
                    //Save that annotation
                    TOOLS.writeJSONFile([dataToUpdate], pathToWrite, true);
                }
            }

        });
    });
}

(async () =>
{
    //Read all files in experimentationResults folder
    const path = `./experimentationResults/allConfAnnotatedExperimentalResults`;
    const filePaths = filesSystem.readdirSync( path, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `${path}/${dirent.name}`);

    //Gel all patterns in all files
    const allNotAnnotatedCoupleActivityNamePatterns = filePaths.map(filePath =>
    {
        return JSON.parse(filesSystem.readFileSync(filePath))
            .map(e => new ExperimentationResult(e))
            .map(experimentalResult =>
                experimentalResult.activityResults
                    .map(a => new ActivityResult(a))
                    .map(actRes =>
                        actRes.frequentSequentialPatterns
                            .map(patInfo => patInfo.annotation === undefined ? [actRes.activityName, patInfo.pattern] : undefined)
                            .filter(couple => couple !== undefined)
                    )
                );
    }).flat(3);
    console.log("allNotAnnotatedCoupleActivityNamePatterns.length", allNotAnnotatedCoupleActivityNamePatterns.length);

    //Gel all unique couples (activityName, pattern) in all files
    let allNotAnnotatedUniqueCoupleActivityNamePatterns = (new ArraySet(allNotAnnotatedCoupleActivityNamePatterns)).toArray();
    console.log("allNotAnnotatedUniqueCoupleActivityNamePatterns.length", allNotAnnotatedUniqueCoupleActivityNamePatterns.length);

    //Annotate method
    annotateCouplesActivityNamePatterns(allNotAnnotatedUniqueCoupleActivityNamePatterns);

})();