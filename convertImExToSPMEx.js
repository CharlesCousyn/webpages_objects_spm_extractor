import filesSystem from "fs";
import * as TOOLS from "./tools";


(async () =>
{
    let pathFolderResultsImageExtractor = "C:/Users/Charles/WebstormProjects/image_extractor/resultFiles/yolov3-608__20_0.05_0.5 duckduckgo 1000 sum";
    let results = filesSystem.readdirSync( pathFolderResultsImageExtractor, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name !== "finalResult.json")
        .map(dirent => `${pathFolderResultsImageExtractor}/${dirent.name}`)
        .map(filePath => JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate));

    let newResults = results.map(res =>
    {
        let activityName = res.query;
        let arrayOfLabels = res.data.map(o => o.label);
        let arrayOfRelevance = res.data.map(o => o.relevance);
        //Min max norm
        arrayOfRelevance = TOOLS.minMaxNorm(arrayOfRelevance, 0.0, 1.0);

        return ({activityName, activityPatterns: arrayOfRelevance.map((rel, index) => ({pattern:[arrayOfLabels[index]], annotation: rel}))})
    })

    TOOLS.writeJSONFile(newResults, "./selectedPatterns/patternsImageExtractor.json", true);


    /*
    * {
        "activityName": "clean",
        "activityPatterns": [
            {
                "pattern": [
                    "water"
                ],
                "annotation": 0.9019607843137255
            },*/

})();