import filesSystem from "fs";
import * as TOOLS from "../tools";
import Event from "./Event";
import * as EXPERIMENTATION from "./experimentation";
let EXPERIMENTATION_CONFIG = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationConfig.json"), TOOLS.reviverDate);

let defaultNoActivityData = JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/20210927154950/rfid.json"), TOOLS.reviverDate);
let calibrationData = JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/RFID_CALIBRATION/rfid.json"), TOOLS.reviverDate);


export function applyScenarioToProduceLabels(d, initTimestamp)
{
    if(d.date >= initTimestamp && d.date < initTimestamp + 60000)
    {
        d.label = null;
    }
    else if(d.date >= initTimestamp + 60000 && d.date < initTimestamp + 60000 + 30000)
    {
        d.label = "Pasta";
    }
    else if(d.date >= initTimestamp + 90000 && d.date < initTimestamp + 120000)
    {
        d.label = null;
    }
    else if(d.date >= initTimestamp + 120000 && d.date < initTimestamp + 150000)
    {
        d.label = "Cereal";
    }
    else if(d.date >= initTimestamp + 150000 && d.date < initTimestamp + 180000)
    {
        d.label = null;
    }
    else if(d.date >= initTimestamp + 180000 && d.date < initTimestamp + 210000)
    {
        d.label = "Coffee";
    }
    else if(d.date >= initTimestamp + 210000)
    {
        d.label = null;
    }

    return d;
}

function calibration(calibrationData)
{
    let initTimestamp = calibrationData[0].date;
    let calibrationDataWithTrueLabels = calibrationData.map(d => applyScenarioToProduceLabels(d, initTimestamp));

    let predictionFunction = (data, windowSizeInMillisecond, thresholdMin, thresholdMax) =>
    {
        return significantMovement(data, windowSizeInMillisecond, thresholdMin, thresholdMax)
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
    EXPERIMENTATION.testAllConfigurations(calibrationDataWithTrueLabels, predictionFunction, EXPERIMENTATION_CONFIG);



}

export function significantMovement(dataRFID, mapParamValue)
{
    let windowSizeInMillisecond = mapParamValue.get("windowSizeObjectUse");
    let thresholdMin = mapParamValue.get("thresholdMinDistanceRFID");
    let thresholdMax = mapParamValue.get("thresholdMaxDistanceRFID");
    if(dataRFID.length !== 0)
    {
        let allUniqueKeys= [...new Set(dataRFID.reduce((acc, curr)=> [...Object.keys(curr.obj), ...acc], []))];
        let listIndexesSignificance = [];
        let firstData = dataRFID[0];
        let indexBegin = dataRFID.findIndex(d => d.date > firstData.date + windowSizeInMillisecond/2);

        //For data at beginning
        let nullData = allUniqueKeys.map(key => [key, 0, false]);
        for(let index = 0; index < indexBegin; index++)
        {
            listIndexesSignificance.push(nullData);
        }

        for(let index = indexBegin; index < dataRFID.length; index++)
        {
            //take elements between indexDate - windowSize and indexDate
            let beginWindow =  dataRFID[index].date - windowSizeInMillisecond/2;
            let endWindow =  dataRFID[index].date + windowSizeInMillisecond/2;
            let usedData = dataRFID.filter(d => d.date > beginWindow && d.date <= endWindow);
            let dataBefore = usedData.filter(d => d.date < dataRFID[index].date);
            let dataAfter = usedData.filter(d => d.date >= dataRFID[index].date);

            let meanDataBefore = dataGroupToDataReduced(dataBefore);
            let meanDataAfter = dataGroupToDataReduced(dataAfter);


            //Computation distances
            let usedKeys = allUniqueKeys.filter(key => meanDataBefore.obj.hasOwnProperty(key) && meanDataAfter.obj.hasOwnProperty(key));

            let indexObjectsDistancesAcceptable = usedKeys.map(key =>
                {
                    let [XBef, YBef, ZBef]= meanDataBefore.obj[key];
                    let [XAft, YAft, ZAft]= meanDataAfter.obj[key];
                    let distance = Math.sqrt(Math.pow(XBef - XAft, 2) + Math.pow(YBef - YAft, 2) + Math.pow(ZBef - ZAft, 2));

                    return [index, key, distance];
                })
                .map(([index, key, distance]) => [key, distance, distance >= thresholdMin && distance <= thresholdMax, dataRFID[index].date, dataRFID[index].label]);

            listIndexesSignificance.push(indexObjectsDistancesAcceptable);
        }

        return listIndexesSignificance.flat().filter(([name, distance, moving, date, label]) => moving).map(([name, distance, moving, date, label]) => new Event(date, name, label));
    }
    else
    {
        return [];
    }
}

export async function significantMovementKmeans(dataRFID, windowSizeInMillisecond)
{
    if(dataRFID.length !== 0)
    {
        let allUniqueKeys= [...new Set(dataRFID.reduce((acc, curr)=> [...Object.keys(curr.obj), ...acc], []))];
        let listIndexesSignificance = [];
        let firstData = dataRFID[0];
        let indexBegin = dataRFID.findIndex(d => d.date > firstData.date + windowSizeInMillisecond/2);

        //For data at beginning
        let nullData = allUniqueKeys.map(key => [key, 0, false]);
        for(let index = 0; index < indexBegin; index++)
        {
            listIndexesSignificance.push(nullData);
        }

        for(let index = indexBegin; index < dataRFID.length; index++)
        {
            //take elements between indexDate - windowSize and indexDate
            let beginWindow =  dataRFID[index].date - windowSizeInMillisecond/2;
            let endWindow =  dataRFID[index].date + windowSizeInMillisecond/2;
            let usedData = dataRFID.filter(d => d.date > beginWindow && d.date <= endWindow);

            let objectDictionary = allUniqueKeys.map(object =>
            {
                let coords = usedData.map(d =>
                    {
                        let value = d.obj[object];
                        if(value)
                        {
                            return value;
                        }
                        else
                        {
                            return null
                        }
                    })
                    .filter(d => d !== null);

                return [object, coords];
            })
                .filter(([object, coords])=> coords.length > 2);

            let objectsToUse = objectDictionary.map(([object, coords]) => object);

            let kmeansResults = await Promise.all(objectDictionary.map(([object, coords]) => TOOLS.kmeansPromise(coords,2)));

            let allCounts = objectsToUse.map((object, indexObj) =>
            {
                let counts = kmeansResults[indexObj].map(({centroid, cluster, clusterInd})=>
                {
                    let countBeforeIndex = clusterInd.filter(i => dataRFID[i].date < dataRFID[index].date).length;
                    let countAfterIndex = clusterInd.filter(i => dataRFID[i].date >= dataRFID[index].date).length;
                    return [countBeforeIndex, countAfterIndex];
                });

                let sum = counts.flat().reduce((acc, curr)=> acc + curr, 0.0);

                let perf = (counts[0][0]+counts[1][1]) / sum;
                return [object, counts, perf];
            });

            let indexObjectsDistancesAcceptable = allCounts.map(([object, counts, perf])=> [object, perf, Math.abs(perf - 0.5) > 0.4999]);

            listIndexesSignificance.push(indexObjectsDistancesAcceptable);
        }

        return listIndexesSignificance;
    }
}

function lowerDataFrequency(dataRFID, freqInDataPerSecondToHave)
{
    if(dataRFID.length !== 0)
    {
        let dataGroups = [];
        let initTime = dataRFID[0].date;
        let dataToResume = [];
        let maxTime = initTime + 1000 / freqInDataPerSecondToHave;
        for(let i = 1; i < dataRFID.length; i++)
        {
            if(dataRFID[i].date >= initTime && dataRFID[i].date <= maxTime)
            {
                dataToResume.push(dataRFID[i]);
            }
            else
            {
                dataGroups.push(dataToResume);
                dataToResume = [dataRFID[i]];
                initTime = maxTime;
                maxTime = initTime + 1000 / freqInDataPerSecondToHave;
            }
        }

        return dataGroups.map(dataGroup => dataGroupToDataReduced(dataGroup));
    }
}

function dataGroupToDataReduced(dataGroup)
{
    let meanTimeStamp = Math.round(dataGroup.reduce((acc, curr) => acc + curr.date, 0.0) / dataGroup.length);
    let meanData = {date: meanTimeStamp, obj:{}}
    let allUniqueKeys= [...new Set(dataGroup.reduce((acc, curr)=> [...Object.keys(curr.obj), ...acc], []))];
    allUniqueKeys.forEach(key =>
    {
        let allCoords = dataGroup.map(d=> d.obj[key] ?  d.obj[key] : null).filter(coord => coord !== null);
        let [meanX, meanY, meanZ] = [TOOLS.mean(allCoords.map(([X, Y, Z])=> X)), TOOLS.mean(allCoords.map(([X, Y, Z])=> Y)), TOOLS.mean(allCoords.map(([X, Y, Z])=> Z))];
        meanData.obj[key] = [meanX, meanY, meanZ];
    });
    return meanData;
}

(async()=>
{
/*
    defaultNoActivityData = lowerDataFrequency(defaultNoActivityData, 2);

    console.log(defaultNoActivityData);

    let res = significantMovement(defaultNoActivityData, 3000, 0, 300);

    console.log(res);

    calibration(calibrationData);

    console.log("End calibration");*/


})();