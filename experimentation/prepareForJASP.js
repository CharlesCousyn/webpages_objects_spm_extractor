import * as TOOLS from "../tools";
import filesSystem from "fs";
import ExperimentationResult from "../entities/ExperimentationResult";
import csvStringify from "csv-stringify/lib/sync";
import ActivityResult from "../entities/ActivityResult";
import summary from "summary";

(async () =>
{
    //Read all files in experimentationResults folder
    const path = `./experimentationResults/allConfAnnotatedExperimentalResults`;
    const filePaths = filesSystem.readdirSync( path, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `${path}/${dirent.name}`);

    let allConfAnnotatedExperimentalResults = filePaths.map(filePath =>
    {
        //Get resultFile
        const expFile = JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate);
        let realExperimentationResult = expFile.map(a => new ExperimentationResult(a));
        return realExperimentationResult[0];
    });

    //Get criteria names automatically
    let columnsNamesCriteria = Object.keys(allConfAnnotatedExperimentalResults[0].configuration);

    //GETTING DATA FOR EACH CAS patternData, activityData, configData

    //PATTERN DATA
    let patternData = allConfAnnotatedExperimentalResults.map(experimentalResult =>
        experimentalResult.activityResults
            .map(a => new ActivityResult(a))
            .map(actRes =>
                actRes.frequentSequentialPatterns
                    .map(patInfo => [...Object.values(experimentalResult.configuration), actRes.activityName, patInfo.pattern.join(","), patInfo.pfIaf, patInfo.annotation])
            )
    ).flat(2);

    let stringPatternData = csvStringify(patternData,
        {
            header: true,
            columns: [...columnsNamesCriteria, "activityName", "pattern", "pfIaf", "annotation"],
            cast: {
                boolean: bool => bool +""
            }
        });

    TOOLS.writeTextFile(stringPatternData, "./experimentationResults/JASPFiles/patternData.csv");

    //CONFIG DATA
    let configData = allConfAnnotatedExperimentalResults.map(experimentalResult =>
    {
        let secondElapsed = ((experimentalResult.dateEnd - experimentalResult.dateBegin) / 1000).toFixed(2);
        return [...Object.values(experimentalResult.configuration), secondElapsed]
    });

    let stringConfigData = csvStringify(configData,
        {
            header: true,
            columns: [...columnsNamesCriteria, "secondElapsed"],
            cast: {
                boolean: bool => bool +""
            }
        });

    TOOLS.writeTextFile(stringConfigData, "./experimentationResults/JASPFiles/configData.csv");

    //Get the top of configurations
    let topConfData = allConfAnnotatedExperimentalResults
        .map(experimentalResult =>
        {
            let annotationByConf = experimentalResult.activityResults
                .map(a => new ActivityResult(a))
                .map(actRes => actRes.frequentSequentialPatterns.map(patInfo => patInfo.annotation))
                .flat(1)

            return [experimentalResult.configuration, annotationByConf];
        })
        .map(([configuration, annotationByConf]) =>
        {
            let data = summary(annotationByConf);
            return [configuration, data.median(), data.quartile(0.75) - data.quartile(0.25)];
        })
        .map(([configuration, central, dispersion]) => [configuration, Math.round((central + Number.EPSILON) * 1000) / 1000, Math.round((dispersion + Number.EPSILON) * 1000) / 1000])
        .sort((a, b) => b[1] - a[1])
        .map(([configuration, central, dispersion]) => [...Object.values(configuration), central, dispersion]);

    let stringTopConfData = csvStringify(topConfData,
        {
            header: true,
            columns: [...columnsNamesCriteria, "median", "IQR"],
            cast: {
                boolean: bool => bool + ""
            }
        });


    TOOLS.writeTextFile(stringTopConfData, "./experimentationResults/JASPFiles/topConfData.csv");
})();
