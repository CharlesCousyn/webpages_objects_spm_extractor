//Import libs
import * as inputReader from "wait-console-input";
import arrayShuffle from "array-shuffle";

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

function questionsAboutPattern(pattern, numberOfActivity)
{
    let isSimplePattern = !pattern[0].includes("||");
    let annotationScore = 0.0;
    let proportionNumberObjectsLikely = 0.0;
    let proportionNumberVerbsAssociatedLikely = 0.0;
    let orderPlausibility = 0.0;
    let specificity = 0.0;

    //Objects plausibility
    let numberObjectsLikely = inputReader.readInteger("How many objects contained in the pattern are plausible with the realization of the activity? (-1 to go back) ");
    if(numberObjectsLikely === -1)
    {
        annotationScore = -1;
    }
    else
    {
        proportionNumberObjectsLikely = numberObjectsLikely / pattern.length;

        let precision = 0.0001;
        if(!isSimplePattern && Math.abs(proportionNumberObjectsLikely - 1.0) < precision)
        {
            //Verbs plausibility
            let numberVerbsAssociatedLikely = inputReader.readInteger("How many associated verbs contained in the pattern are plausible with the object and the realization of the activity? ");
            proportionNumberVerbsAssociatedLikely = numberVerbsAssociatedLikely / pattern.length;
        }

        if((!isSimplePattern && Math.abs(proportionNumberVerbsAssociatedLikely - 1.0) < precision) || (isSimplePattern && Math.abs(proportionNumberObjectsLikely - 1.0) < precision))
        {
            //Order plausibility
            orderPlausibility = inputReader.readFloat("Between 0.0 and 1.0, how much the order of the pattern is plausible for this activity? ");

            if(Math.abs(orderPlausibility - 1.0) < precision)
            {
                //Specificity
                let numberActivityWherePlausible = inputReader.readInteger("In how many activities other than the one considered, the pattern would be plausible? ");
                specificity = 1.0 - numberActivityWherePlausible / (numberOfActivity - 1 );
            }
        }


        //Annotation score formula
        if(isSimplePattern)
        {
            annotationScore = (proportionNumberObjectsLikely + orderPlausibility + specificity) / 3;
        }
        else
        {
            annotationScore = (proportionNumberObjectsLikely + proportionNumberVerbsAssociatedLikely + orderPlausibility + specificity) / 4;
        }
    }

    return annotationScore;
}

function annotateCouplesActivityNamePatterns(notAnnotatedUniqueCouples, totalNbrPat, nbrPatAlreadyAnnotated)
{
    const pathAnnotated = `./experimentationResults/allConfAnnotatedExperimentalResults`;
    const nameFiles = filesSystem.readdirSync( pathAnnotated, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);

    const filePathsAnnotated = nameFiles.map(name => `${pathAnnotated}/${name}`);

    let dataFilesAnnotated = filePathsAnnotated.map((filePath) => [filePath, new ExperimentationResult(JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate)[0])]);

    //Progress variables
    let initTime = new Date();
    let currentPatternsProcessed = nbrPatAlreadyAnnotated;
    TOOLS.showProgress(currentPatternsProcessed, totalNbrPat, initTime);

    let numberOfActivity = (new Set(notAnnotatedUniqueCouples.map(([activityName, pattern]) => activityName))).size;

    for(let i = 0; i < notAnnotatedUniqueCouples.length; i++)
    {
        let [activityName, pattern] = notAnnotatedUniqueCouples[i];

        //Annotation process
        console.log("");
        console.log("Activity name: ", activityName);
        console.log("Pattern: ", pattern, pattern.length);

        let annotationScore = questionsAboutPattern(pattern, numberOfActivity);
        if(annotationScore === -1)
        {
            //If we are at the beginning
            if(i < 1)
            {
                i--;
            }
            else
            {
                i -= 2;
            }
            currentPatternsProcessed--;
        }
        else
        {
            console.log("Annotation Score: ", annotationScore);

            //Progress variables
            currentPatternsProcessed++;
            TOOLS.showProgress(currentPatternsProcessed, totalNbrPat, initTime);

            let triplet = [activityName, pattern, annotationScore];

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
        }
    }
}

(async () =>
{
    //Read all files in experimentationResults folder
    const path = `./experimentationResults/allConfAnnotatedExperimentalResults`;
    const filePaths = filesSystem.readdirSync( path, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `${path}/${dirent.name}`);

    //Gel all patterns in all files
    const allCoupleActivityNamePatterns = filePaths.map(filePath =>
    {
        return JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate)
            .map(e => new ExperimentationResult(e))
            .map(experimentalResult =>
                experimentalResult.activityResults
                    .map(a => new ActivityResult(a))
                    .map(actRes =>
                        actRes.frequentSequentialPatterns
                            .map(patInfo => [actRes.activityName, patInfo.pattern, patInfo.annotation])
                    )
                );
    }).flat(3);

    console.log("allCoupleActivityNamePatterns.length", allCoupleActivityNamePatterns.length);

    //Gel all unique couples (activityName, pattern) in all files
    let allUniqueCoupleActivityNamePatterns = (new ArraySet(allCoupleActivityNamePatterns)).toArray();
    console.log("allUniqueCoupleActivityNamePatterns.length", allUniqueCoupleActivityNamePatterns.length);

    //Annotation verification
    allUniqueCoupleActivityNamePatterns = allUniqueCoupleActivityNamePatterns.map(([act, pat, anno])=>
    {
        //If annotation incorrect, we delete it
        if(anno < 0 || anno > 1)
        {
            return [act, pat, null];
        }
        return [act, pat, anno];
    });

    let allAnnotatedUniqueCoupleActivityNamePatterns = allUniqueCoupleActivityNamePatterns.filter(([act, pat, anno]) => anno !== null);
    console.log("allAnnotatedUniqueCoupleActivityNamePatterns.length", allAnnotatedUniqueCoupleActivityNamePatterns.length);

    let allNotAnnotatedUniqueCoupleActivityNamePatterns = allUniqueCoupleActivityNamePatterns.filter(([act, pat, anno]) => anno === null);
    console.log("allNotAnnotatedUniqueCoupleActivityNamePatterns.length", allNotAnnotatedUniqueCoupleActivityNamePatterns.length);

    //Shuffle allNotAnnotatedUniqueCoupleActivityNamePatterns
    allNotAnnotatedUniqueCoupleActivityNamePatterns = arrayShuffle(allNotAnnotatedUniqueCoupleActivityNamePatterns);

    //Annotate method
    annotateCouplesActivityNamePatterns(allNotAnnotatedUniqueCoupleActivityNamePatterns,  allUniqueCoupleActivityNamePatterns.length, allAnnotatedUniqueCoupleActivityNamePatterns.length);

})();