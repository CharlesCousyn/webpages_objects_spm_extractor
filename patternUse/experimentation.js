import filesSystem from "fs";
import * as TOOLS from "../tools";
import * as EXPERIMENTATION_UTILS from "./experimentationUtils.js";
import * as HAR from "../HAR.js";
import Event from "./Event.js";

let EXPERIMENTATION_CONFIG = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationConfig.json"), TOOLS.reviverDate);

function preprocessEnergeticJulien(energetic, dictionary)
{
    //Gather uses object only and mutate object names
    return energetic.flatMap(rd =>
        Object.entries(rd["Appliance states"])
            .map(([key, nameState])=> nameState.split("-").map(e => e.trim()))
            .filter(([name, stateString])=> stateString === "ON")
            .map(([name, stateString]) => new Event((new Date(rd.Timestamp)).getTime(), (dictionary.has(name) ? dictionary.get(name) : name), rd.label))
    );
}

function preprocessRFID(rfid, dictionary)
{
    //Mutate object names
    let allUniqueKeys= [...new Set(rfid.reduce((acc, curr)=> [...Object.keys(curr.obj), ...acc], []))];
    let objectsToChange = allUniqueKeys.filter(e => dictionary.has(e));

    rfid = rfid.map(rd =>
    {
        let o = rd.obj;
        objectsToChange.forEach(oldObj =>
        {
            if(o.hasOwnProperty(oldObj))
            {
                let newObj = dictionary.get(oldObj);
                if (oldObj !== newObj)
                {
                    Object.defineProperty(o, newObj, Object.getOwnPropertyDescriptor(o, oldObj));
                    delete o[oldObj];
                }
            }
        });
        return rd;
    })
    return rfid;
}
//Return in format [rfid, preprocessedEnergetic]
function preprocessGroundTruthData(data, activityName, EXPERIMENTATION_CONFIG)
{
    //Get corresponding dictionary
    let dictionary = new Map(EXPERIMENTATION_CONFIG.objectDictionaries[activityName]);
    if(data.length === 0)
    {
        return [[], []];
    }
    let [rfid, energetic] = data;
    let newEnergeticData = preprocessEnergeticJulien(energetic, dictionary);
    let newRfidData =  preprocessRFID(rfid, dictionary);
    return [newRfidData, newEnergeticData];
}



(async () =>
{
    //Gather ground truth data for all activities
    let groundTruthData = [];
    //Each ground truth is [RFID, Energetic Julien]
    groundTruthData.push(["cook_pasta", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/cook_pasta_2/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/cook_pasta_2/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["make_coffee", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/make_coffee_2/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/make_coffee_2/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["make_tea", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/make_tea/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/make_tea/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["clean", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/clean/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/clean/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["vacuum", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/vacuum/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/vacuum/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["noActivity", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/noActivity/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/noActivity/energetic_julien.json"), TOOLS.reviverDate)]]);

    //Transform ground truth data in one big array of Events
    let preprocessedData = groundTruthData.map(([activityName, data]) => [activityName, preprocessGroundTruthData(data, activityName, EXPERIMENTATION_CONFIG)]);

    preprocessedData = preprocessedData.reduce(([accRfidData, accEnergeticData], [activityName, [newRfidData, newEnergeticData]]) =>
        [[...accRfidData, ...newRfidData], [...accEnergeticData, ...newEnergeticData]], [[], []]);

    //Launch experimentations
    EXPERIMENTATION_UTILS.testAllCombinations(preprocessedData, HAR.HARUsingSlidingWindowAndPatterns, EXPERIMENTATION_CONFIG);

})();