import * as TOOLS from "../tools";
import filesSystem from "fs";

(async () =>
{
    //Produce files for JASP
    import filesSystem from "fs";

    let allExperimentalResults = filePaths.map(filePath =>
    {
        //Get resultFile
        const expFile = JSON.parse(filesSystem.readFileSync(filePath));
        let realExperimentationResult = expFile.map(confRes => new ExperimentationResult(confRes._configuration, confRes._activityResults, confRes._dateBegin, confRes._dateEnd));
        return realExperimentationResult[0];
    });
    let dataForJASP = [];
    TOOLS.writeJSONFile(dataForJASP, "./experimentationResults/JASPFiles/jasp.json");

})();
