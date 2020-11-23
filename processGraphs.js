//Libs
import { from, of, ReplaySubject, partition} from 'rxjs';
import { filter, map, concatMap, tap, groupBy, reduce, mergeMap, mergeAll, toArray, takeLast, bufferCount, count, distinct, take} from 'rxjs/operators';
import filesSystem from "fs";
import clone from "clone";

//Personal imports
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import ActivityResult from "./entities/ActivityResult";
import * as TOOLS from "./tools";
import GraphAdjList from "./entities/GraphAdjList";


function normalizeNodesGraph(graph, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
{
    let newGraph = clone(graph);
    //console.log("activityResAfter", activityRes.graphAdjList.adjList.get("help||dwelling"));
    if(normOrStandOrByPage === "byPage")
    {
        if(numberOfWebPages === 0)
        {
            return newGraph;//Deep copy of the matrix
        }
        else
        {
            //Get support for each node
            newGraph.adjList.forEach((nodeInfos, keyNode) =>
            {
                nodeInfos[0] /= numberOfWebPages;
            });

            return newGraph;
        }
    }
    else {
        throw new Error("Not yet implemented");
    }
}

function normalizeRelationsGraph(graph, numberOfWebPages)
{
    let newGraph = clone(graph);

    //For each relations, compute confidence = occurences(A -> B)/occurences(A)

    //Get support for each node
    newGraph.adjList.forEach(([occurenceBigId, mapBigId], bigId) =>
    {
        mapBigId.forEach((occurenceRelation, littleId, littleMap)=>
        {
            littleMap.set(littleId, occurenceRelation / (occurenceBigId*numberOfWebPages));
        });
    });

    return newGraph;
}

function normalizeNodesActivityResult(activityRes, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
{
    activityRes.graphAdjList = normalizeNodesGraph(activityRes.graphAdjList, newMin, newMax, normOrStandOrByPage, numberOfWebPages);
    return activityRes;
}

function normalizeRelationsActivityResult(activityRes)
{
    activityRes.graphAdjList = normalizeRelationsGraph(activityRes.graphAdjList, activityRes.numberOfWebPages);
    return activityRes;
}

function applyThresholdToNodeInGraph(graph, threshold)
{
    //console.log("graph applyThresholdToGraph", graph);
    graph.adjList.forEach((nodeInfos, id, bigMap) =>
    {
        if(nodeInfos[0] !== null)
        {
            if(nodeInfos[0] < threshold)
            {
                bigMap.set(id, null);
            }
        }
    });

    return graph;
}

function applyThresholdToRelationsInGraph(graph, threshold)
{
    //console.log("graph applyThresholdToGraph", graph);
    graph.adjList.forEach(([, map], id) =>
    {
        map.forEach((weight, key, littleMap) =>
        {
            if(weight !== null)
            {
                if(weight < threshold)
                {
                    littleMap.set(key, null);
                }
            }
        });
    });

    return graph;
}

function applyThresholdToNodesInActivityResult(activityRes, minSupportNode)
{
    activityRes.minSupportNode = minSupportNode;
    activityRes.graphAdjList = applyThresholdToNodeInGraph(activityRes.graphAdjList, minSupportNode);
    return activityRes;
}

function applyThresholdToRelationsInActivityResult(activityRes, minConfidenceRelation)
{
    activityRes.minConfidenceRelation = minConfidenceRelation;
    activityRes.graphAdjList = applyThresholdToRelationsInGraph(activityRes.graphAdjList, minConfidenceRelation);
    return activityRes;
}

function cleanRelationsGraph(graph)
{
    //Delete edges with 0 in relations
    let edgesToDelete = [];
    graph.adjList.forEach(([, map], bigNode) =>
    {
        map.forEach((weight, littleNode) =>
        {
            if(weight === null)
            {
                edgesToDelete.push([bigNode, littleNode]);
            }
        });
    });

    //Delete edges with null in relation weight
    edgesToDelete.forEach(([firstId, secondId]) => graph.deleteEdge(firstId, secondId));

    return graph;
}

function cleanNodesGraph(graph)
{
    //Delete nodes with null in value
    let nodesToDelete = [];

    graph.adjList.forEach((value, id) =>
    {
        if(value === null)
        {
            nodesToDelete.push(id);
        }
    });

    nodesToDelete.forEach(idNode => graph.deleteNode(idNode));
    return graph;
}

function cleanNodesActivityRes(activityRes)
{
    activityRes.graphAdjList = cleanNodesGraph(activityRes.graphAdjList);
    return activityRes;
}

function cleanRelationsActivityRes(activityRes)
{
    activityRes.graphAdjList = cleanRelationsGraph(activityRes.graphAdjList);
    return activityRes;
}

(async () =>
{
    //Get raw activity Results
    let JSONActivityResults = JSON.parse(filesSystem.readFileSync("./output/rawActivityResults.json", { encoding: 'utf8'}));
    let rawActivityResults = JSONActivityResults.map(jsonActRes =>
    {
        //console.log("jsonActRes", jsonActRes._graphAdjList);
        //console.log("jsonActRes", jsonActRes._graphAdjList._adjList);
        //console.log("jsonActRes", jsonActRes._graphAdjList._adjList.map(array => [array[0], new Map(array[1])]));
        //console.log("jsonActRes", jsonActRes._graphAdjList._adjList.map(array => [array[0], new Map(array[1])]));
        return  new ActivityResult(
            jsonActRes._activityName,
            jsonActRes._pathToWebPages,
            new GraphAdjList(new Map(jsonActRes._graphAdjList._adjList.map(([id, [occurences, neighbors]]) => [id, [occurences, new Map(neighbors)]]))),
            jsonActRes._numberOfWebPages,
            jsonActRes._minSupportNode,
            jsonActRes._minConfidenceRelation);
    });


    //Compute processed Activity results
    let res = await from(clone(rawActivityResults))
        //Stream of activity results
        .pipe(map(activityRes => normalizeNodesActivityResult(activityRes, 0, 1, GENERAL_CONFIG.normOrStandOrByPage, activityRes.numberOfWebPages)))
        //Stream of normalized activity results
        .pipe(map(activityRes => applyThresholdToNodesInActivityResult(activityRes, GENERAL_CONFIG.minSupportNode)))
        //Stream of normalized activity results and filter relation using a thresholdStrongRelations
        .pipe(map(activityRes => cleanNodesActivityRes(activityRes)))
        //Stream of normalized activity results and objects without any relation
        .pipe(map(activityRes => normalizeRelationsActivityResult(activityRes)))
        .pipe(map(activityRes => applyThresholdToRelationsInActivityResult(activityRes, GENERAL_CONFIG.minConfidenceRelation)))
        .pipe(map(activityRes => cleanRelationsActivityRes(activityRes)))
        .pipe(toArray())
        //Stream of array activity result (only one)
        .toPromise();

    let preparedActivityResults = res.map(activityResult => TOOLS.prepareActivityResultToJSON(activityResult));
    TOOLS.writeJSONFile(preparedActivityResults, "./output/processedActivityResults.json", GENERAL_CONFIG.indentProcessedFile);

})();