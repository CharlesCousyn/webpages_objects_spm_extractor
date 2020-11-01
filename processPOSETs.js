//Libs
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take} from 'rxjs/operators';
import filesSystem from "fs";
import clone from "clone"

//Personal imports
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import NumPOSET from "./entities/NumPOSET";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";

function normalizePOSET(POSET, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
{
    let flatMat = POSET.matrix.flat();
    let matrixNorm = [];

    if(normOrStandOrByPage === "byPage")
    {
        if(numberOfWebPages === 0)
        {
            matrixNorm = POSET.matrix.map(line => [...line]);//Deep copy of the matrix
        }
        else
        {
            matrixNorm = POSET.matrix.map(line => line.map(val =>
            {
                if(val === null)
                {
                    return null;
                }
                return val / numberOfWebPages;
            }));
        }
    }
    else if(normOrStandOrByPage === "norm")
    {
        let min = Math.min(...flatMat);
        let max = Math.max(...flatMat);
        if(min === max)
        {
            matrixNorm = POSET.matrix.map(line => [...line]);//Deep copy of the matrix
        }
        else
        {
            matrixNorm = POSET.matrix.map(line =>
                line.map(val =>
                {
                    if(val === null)
                    {
                        return null;
                    }
                    return newMin + (val - min) * (newMax - newMin) / (max - min);
                }));
        }
    }
    else if(normOrStandOrByPage === "stand")
    {
        let avg = flatMat.reduce((sum, curr) => sum + curr, 0) / flatMat.length;
        let sd = Math.sqrt(flatMat.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / flatMat.length);
        if(avg === sd)
        {
            matrixNorm = POSET.matrix.map(line => [...line]);//Deep copy of the matrix
        }
        else
        {
            matrixNorm = POSET.matrix.map(line =>
                line.map(val =>
                {
                    if(val === null)
                    {
                        return null;
                    }
                    return (val - avg)/sd;
                }));
        }
    }

    let newPOSET = clone(POSET);
    newPOSET.matrix = matrixNorm;

    return newPOSET;
}

function normalizeActivityResult(activityRes, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
{
    activityRes.numPOSET = normalizePOSET(activityRes.numPOSET, newMin, newMax, normOrStandOrByPage, numberOfWebPages);
    return activityRes;
}

function applyThresholdToPOSET(POSET, threshold)
{
    POSET.matrix = POSET.matrix.map( line => line
        .map(value =>
        {
            if(value === null)
            {
                return null;
            }
            else if(value < threshold)
            {
                return 0;
            }
            return value;
        }));

    return POSET;
}

function applyThresholdToActivityResult(activityRes, threshold)
{
    activityRes.threshold = threshold;
    activityRes.numPOSET = applyThresholdToPOSET(activityRes.numPOSET, threshold);
    return activityRes;
}

function cleanPOSET(POSET)
{
    //Identify node without relations ID =====> X
    let idNoRelationsIDtoX = [];
    POSET.matrix.forEach((line, indexId) =>
    {
        let setLine = new Set(line);

        if(setLine.size === 2 && setLine.has(0) && setLine.has(null))
        {
            idNoRelationsIDtoX.push(POSET.elementsIds[indexId])
        }
    });

    //Identify node without relations X =====> ID
    let transposedMat = POSET.matrix[0].map((_, colIndex) => POSET.matrix.map(row => row[colIndex]));
    let idNoRelationsXToID = [];
    transposedMat.forEach((line, indexId) =>
    {
        let setLine = new Set(line);
        if(setLine.size === 2 && setLine.has(0) && setLine.has(null))
        {
            idNoRelationsXToID.push(POSET.elementsIds[indexId])
        }
    });

    //Get the intersection between the 2 arrays
    let idNoRelations = idNoRelationsXToID.filter(id => idNoRelationsIDtoX.includes(id));

    //Delete ids without any relation
    idNoRelations.forEach(id => POSET.deleteId(id));

    return POSET;
}

function cleanActivityRes(activityRes)
{
    activityRes.numPOSET = cleanPOSET(activityRes.numPOSET);
    return activityRes;
}

(async () =>
{
    //Get raw activity Results
    let JSONActivityResults = JSON.parse(filesSystem.readFileSync("./output/rawActivityResults.json", { encoding: 'utf8'}));
    let rawActivityResults = JSONActivityResults.map(jsonActRes =>
        new ActivityResult(
            jsonActRes._activityName,
            jsonActRes._pathToWebPages,
            new NumPOSET(jsonActRes._numPOSET._elementsIds, jsonActRes._numPOSET._matrix),
            jsonActRes._numberOfWebPages,
            jsonActRes._threshold));

    //Compute processed Activity results
    let res = await from(clone(rawActivityResults))
        //Stream of activity results
        .pipe(map(activityRes => normalizeActivityResult(activityRes, 0, 1, GENERAL_CONFIG.normOrStandOrByPage, activityRes.numberOfWebPages)))
        //Stream of normalized activity results
        .pipe(map(activityRes => applyThresholdToActivityResult(activityRes, GENERAL_CONFIG.thresholdStrongRelations)))
        //Stream of normalized activity results and filter relation using a thresholdStrongRelations
        .pipe(map(activityRes => cleanActivityRes(activityRes)))
        //Stream of normalized activity results and objects without any relation
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();


    TOOLS.writeJSONFile(res, "./output/processedActivityResults.json");

})();