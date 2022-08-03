import ConfusionMatrix from 'ml-confusion-matrix';
import * as TOOLS from "../tools";
import * as CALIBRATION from "./calibrationRFIDPosition.js";
import filesSystem from "fs";
import {cohenKappa} from "../tools";

let patternPerActivityImageExtractor = JSON.parse(filesSystem.readFileSync("./selectedPatterns/patternsImageExtractor.json"), TOOLS.reviverDate);


function addValues(EXPERIMENTATION_CONFIG)
{
    let keys = EXPERIMENTATION_CONFIG.parameters;
    keys.forEach((key) =>
    {
        let range = EXPERIMENTATION_CONFIG.testedValues[key];
        if(range.type === "number")
        {
            let arr = [];
            for(let i = range.min; i <= range.max; i+= range.step)
            {
                arr.push(i);
            }
            EXPERIMENTATION_CONFIG.testedValues[key] = arr;
        }
        else if(range.type === "boolean")
        {
             EXPERIMENTATION_CONFIG.testedValues[key] = [false, true];
            //EXPERIMENTATION_CONFIG.testedValues[key] = [true, false];
        }
        else if(range.type === "enum")
        {
            EXPERIMENTATION_CONFIG.testedValues[key] = range.values;
        }

    });
    return EXPERIMENTATION_CONFIG;
}

function addCombinations(EXPERIMENTATION_CONFIG)
{
    //Getting all arrays of values
    let arraysOfValues = [];
    let keys = EXPERIMENTATION_CONFIG.parameters;
    keys.forEach((key) =>
    {
        arraysOfValues.push(EXPERIMENTATION_CONFIG.testedValues[key]);
    });
    EXPERIMENTATION_CONFIG.combinations = TOOLS.cartesian(...arraysOfValues);
    return EXPERIMENTATION_CONFIG;
}


function executeCombination(preprocessedGroundTruthDataOneActivity, predictionFunction, metricToUse, mapParamValue)
{
    let [RFIDData, preprocessedEnergetic] = preprocessedGroundTruthDataOneActivity;
    //Process RFID
    RFIDData = CALIBRATION.significantMovement(RFIDData, mapParamValue);

    //Merge energetic and processedRFIDData
    let mergedData = [...RFIDData, ...preprocessedEnergetic].sort((a, b) => a.timestamp - b.timestamp);

    //Take the labelled traces
    let trueLabels = mergedData.map(d => d.label);

    //Do HAR using conf to produce label for each event
    let predictedLabels = predictionFunction(mergedData, mapParamValue);
    //let predictedLabels = predictionFunction(mergedData, patternPerActivityImageExtractor, 500, 0.5);

    //Compute confusion matrix to get an idea of performance
    let performanceData = {/*trueLabels, predictedLabels,*/ confusionMatrix:{}, metrics: {}};
    if(trueLabels.length === predictedLabels.length && trueLabels.length !== 0)
    {
        let confusionMatrix = ConfusionMatrix.fromLabels(trueLabels, predictedLabels);
        performanceData.confusionMatrix.labels = confusionMatrix.labels;
        performanceData.confusionMatrix.matrix = confusionMatrix.getMatrix();
        performanceData.metrics.accuracy = confusionMatrix.getAccuracy();
        performanceData.metrics[metricToUse] = TOOLS[metricToUse](confusionMatrix);
        performanceData.metrics["cohenKappa"] = TOOLS["cohenKappa"](confusionMatrix);
        performanceData.metrics["macroAverageFScore"] = TOOLS["macroAverageFScore"](confusionMatrix);

        //Logs
        console.log(confusionMatrix.labels);
        console.table(confusionMatrix.getMatrix());
        console.log("Accuracy:", performanceData.metrics.accuracy);
        console.log(`${metricToUse}:`, performanceData.metrics[metricToUse]);
        console.log(`cohenKappa:`, performanceData.metrics["cohenKappa"]);
        console.log(`macroAverageFScore:`, performanceData.metrics["macroAverageFScore"]);
    }

    return performanceData;
}

export function testAllCombinations(preprocessedGroundTruthData, predictionFunction, config)
{
    config = addValues(config);
    config = addCombinations(config);

    //DEBUG
    //config.configurations = config.configurations.filter((el, index) => index === 42 || index === 86000);
    //DEBUG

    console.log(`Computing HAR performance for ${config.combinations.length} combinations of parameters`);
    let beginTime = new Date();
    let performancesByCombination =
        config.combinations
            .map((combination, indexComb) =>
            {
                console.log(`Computing HAR performance for combination of parameters: (${indexComb+1}/${config.combinations.length})`);
                let mapParamValue = new Map(config.parameters.map((param, index) => [param, combination[index]]));
                console.log(mapParamValue);
                let performanceData = executeCombination(preprocessedGroundTruthData, predictionFunction, config.performanceMetric, mapParamValue);
                TOOLS.showProgress(indexComb+1, config.combinations.length, beginTime);
                return ({parameters: config.parameters, combination: combination, performanceData});
            })
            .sort((a, b) => b.performanceData.metrics[config.performanceMetric] - a.performanceData.metrics[config.performanceMetric]);

    //Order configurations by performances
    TOOLS.writeJSONFile(performancesByCombination, `./patternUse/experimentationResults.json`, false);

    /*
    let g = globalPerformances.reduce((acc, [activityName, performancesByCombination]) =>
    {
        performancesByCombination.map(({parameters, combination, performanceData})=>
        {
            let mergedPerf = {parameters, combination};

        });
        acc.push();
        return acc;
    }, []);

    //Performances for all activities
    let globalPerformancesPerCombination = {parameters: performancesByCombination[0].parameters, combination: performancesByCombination[0].combination};
    globalPerformancesPerCombination.performanceData =  globalPerformances.reduce((acc, [activityName, performancesByConfiguration]) =>
    {
        acc.trueLabels = [...acc.trueLabels, ...performancesByConfiguration.performanceData.trueLabels];
        acc.predictedLabels = [...acc.predictedLabels, ...performancesByConfiguration.performanceData.predictedLabels];
        return acc;
    }, {trueLabels:[], predictedLabels: []});

    let confusionMatrix = ConfusionMatrix.fromLabels(globalPerformancesPerCombination.performanceData.trueLabels, globalPerformancesPerCombination.performanceData.predictedLabels);
    globalPerformancesPerCombination.performanceData.confusionMatrix.labels = confusionMatrix.labels;
    globalPerformancesPerCombination.performanceData.confusionMatrix.matrix = confusionMatrix.getMatrix();
    globalPerformancesPerCombination.performanceData.metrics.accuracy = confusionMatrix.getAccuracy();
    globalPerformancesPerCombination.performanceData.metrics[config.performanceMetric] = TOOLS[config.performanceMetric](confusionMatrix);

    //Logs
    console.log("PERFORMANCES FOR ALL ACTIVITIES");
    console.log(confusionMatrix.labels);
    console.log(confusionMatrix.getMatrix());
    console.log("Accuracy:", globalPerformancesPerCombination.performanceData.metrics.accuracy);
    console.log(`${config.performanceMetric}:`, globalPerformancesPerCombination.performanceData.metrics[config.performanceMetric]);*/
}