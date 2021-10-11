import filesSystem from "fs";
import * as TOOLS from "../tools";
import * as EXPERIMENTATION_UTILS from "./experimentationUtils.js";
import * as HAR from "../HAR.js";
import Event from "./Event.js";

let EXPERIMENTATION_CONFIG = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationConfig.json"), TOOLS.reviverDate);

function preprocessEnergeticJulien(energetic)
{
    return energetic.flatMap(rd =>
        Object.entries(rd["Appliance states"])
            .map(([key, nameState])=> nameState.split("-").map(e => e.trim()))
            .filter(([name, stateString])=> stateString === "ON")
            .map(([name, stateString]) => new Event((new Date(rd.Timestamp)).getTime(), name, rd.label))
    );
}

function preprocessRFID(rfid)
{
    return rfid;
}
//Return in format [rfid, preprocessedEnergetic]
function preprocessGroundTruthData(data)
{
    if(data.length === 0)
    {
        return [[], []];
    }
    let [rfid, energetic] = data;
    let newEnergeticData = preprocessEnergeticJulien(energetic);
    let newRfidData =  preprocessRFID(rfid);
    return [newRfidData, newEnergeticData];
}



(async () =>
{
    //Gather ground truth data for all activities
    let groundTruthData = [];
    //Each ground truth is [RFID, Energetic Julien]
    groundTruthData.push(["cook_pasta", [JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/groundTruthDataExample/rfid.json"), TOOLS.reviverDate), JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/groundTruthDataExample/energetic_julien.json"), TOOLS.reviverDate)]]);
    groundTruthData.push(["make_coffee", []]);
    groundTruthData.push(["make_tea", []]);
    groundTruthData.push(["clean", []]);
    groundTruthData.push(["vacuum", []]);

    //Transform ground truth data in one big array of Events
    let preprocessedData = groundTruthData.map(([activityName, data]) => [activityName, preprocessGroundTruthData(data)]);

    preprocessedData = preprocessedData.reduce(([accRfidData, accEnergeticData], [activityName, [newRfidData, newEnergeticData]]) =>
        [[...accRfidData, ...newRfidData], [...accEnergeticData, ...newEnergeticData]], [[], []]);

    //Launch experimentations
    EXPERIMENTATION_UTILS.testAllCombinations(preprocessedData, HAR.HARUsingSlidingWindowAndPatterns, EXPERIMENTATION_CONFIG);

})();