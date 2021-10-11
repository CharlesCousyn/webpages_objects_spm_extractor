
import * as EXPERIMENTATION from "../patternUse/experimentation";
import * as CALIBRATION from "../patternUse/calibrationRFIDPosition";
import filesSystem from "fs";
import * as TOOLS from "../tools";
import {significantMovementKmeans} from "../patternUse/calibrationRFIDPosition";

let EXPERIMENTATION_CONFIG = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationConfig.json"), TOOLS.reviverDate);
let calibrationData = JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/RFID_CALIBRATION/rfid.json"), TOOLS.reviverDate);

(async () =>
{
        let initTimestamp = calibrationData[0].date;
        let calibrationDataWithTrueLabels = calibrationData.map(d => CALIBRATION.applyScenarioToProduceLabels(d, initTimestamp));

        console.log(calibrationDataWithTrueLabels);

        let predictionFunction = async (data, windowSizeInMillisecond, thresholdMin, thresholdMax) =>
        {
                return (await CALIBRATION.significantMovement(data, windowSizeInMillisecond, thresholdMin, thresholdMax))
                    .map(pred =>
                    {
                            if(pred.every(([key, distance, moving]) => !moving ))
                            {
                                    return null;
                            }
                            else
                            {
                                    return pred
                                        .filter(([key, distance, moving]) => moving)
                                        .map(p => p[0])
                                        .sort()
                                        .join("_");
                            }
                    })
        };
        await EXPERIMENTATION.executeConfiguration(calibrationDataWithTrueLabels, predictionFunction, EXPERIMENTATION_CONFIG.performanceMetric, 9950, 42, 150);
})();