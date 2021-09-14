import filesSystem from "fs";
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

function executeConfiguration(windowSize, overlap, thresholdDistanceRFID)
{
    
}

(async () =>
{
    EXPERIMENTATION_CONFIG = addValues(EXPERIMENTATION_CONFIG);
    EXPERIMENTATION_CONFIG = addConfigurations(EXPERIMENTATION_CONFIG);
    EXPERIMENTATION_CONFIG.configurations.forEach(conf =>
    {
        executeConfiguration(...conf);
    });

    console.log(EXPERIMENTATION_CONFIG);
})();