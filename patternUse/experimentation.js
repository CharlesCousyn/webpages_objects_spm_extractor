import filesSystem from "fs";
import ConfusionMatrix from 'ml-confusion-matrix';
import * as TOOLS from "../tools";
let EXPERIMENTATION_CONFIG = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationConfig.json"), TOOLS.reviverDate);

function addValues(EXPERIMENTATION_CONFIG)
{
    let keys = EXPERIMENTATION_CONFIG.parameters;
    keys.forEach((key) =>
    {
        let range = EXPERIMENTATION_CONFIG.testedValues[key];
        let arr = [];
        for(let i = range.min; i <= range.max; i+= range.step)
        {
            arr.push(i);
        }
        EXPERIMENTATION_CONFIG.testedValues[key] = arr;
    });
    return EXPERIMENTATION_CONFIG;
}

function addConfigurations(EXPERIMENTATION_CONFIG)
{
    //Getting all arrays of values
    let arraysOfValues = [];
    let keys = EXPERIMENTATION_CONFIG.parameters;
    keys.forEach((key) =>
    {
        arraysOfValues.push(EXPERIMENTATION_CONFIG.testedValues[key]);
    });
    EXPERIMENTATION_CONFIG.configurations = TOOLS.cartesian(...arraysOfValues);
    return EXPERIMENTATION_CONFIG;
}

function executeConfiguration(metricToUse, windowSize, overlap, thresholdDistanceRFID )
{
    //Take the labelled traces

    //Do HAR using conf to produce label for each event

    //Compute confusion matrix to get an idea of performance
    //DEBUG
    let trueLabels = ["make_tea", "make_tea", "make_tea", "make_tea", "make_tea", "make_tea", "vacuum", "make_tea", "make_tea"];
    let predictedLabels = ["vacuum", "make_tea", "make_tea", "make_tea", "make_tea", "make_tea", "vacuum", "make_tea", "make_tea"];
    let confusionMatrix = ConfusionMatrix.fromLabels(trueLabels, predictedLabels);
    console.log(confusionMatrix.labels);
    console.log(confusionMatrix.getMatrix());
    //DEBUG

    return TOOLS[metricToUse](confusionMatrix);
}

(async () =>
{
    EXPERIMENTATION_CONFIG = addValues(EXPERIMENTATION_CONFIG);
    EXPERIMENTATION_CONFIG = addConfigurations(EXPERIMENTATION_CONFIG);

    //DEBUG
    EXPERIMENTATION_CONFIG.configurations = [EXPERIMENTATION_CONFIG.configurations[12]];
    //DEBUG

    let performancesByConfiguration =
        EXPERIMENTATION_CONFIG.configurations
        .map(conf =>
            {
                console.log("Computing HAR performance for configuration:");
                console.log(EXPERIMENTATION_CONFIG.parameters);
                console.log(conf);
                let performance = executeConfiguration(EXPERIMENTATION_CONFIG.performanceMetric, ...conf);
                let res = ({parameters: EXPERIMENTATION_CONFIG.parameters, configuration: conf});
                res[EXPERIMENTATION_CONFIG.performanceMetric] = performance;
                return res;
            })
        .sort((a, b) => b[EXPERIMENTATION_CONFIG.performanceMetric] - a[EXPERIMENTATION_CONFIG.performanceMetric]);

    //Order configurations by performances
    TOOLS.writeJSONFile(performancesByConfiguration, "./patternUse/experimentationResults.json", true);

})();