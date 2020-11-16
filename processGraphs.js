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


function normalizeGraph(graph, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
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
            newGraph.adjList.forEach(map =>
            {
                map.forEach((weight, key, littleMap) =>
                {
                    if(weight !== null)
                    {
                        littleMap.set(key, weight/ numberOfWebPages);
                    }
                });
            });

            return newGraph;
        }
    }
    else {
        throw new Error("Not yet implemented");
    }
}

function normalizeActivityResult(activityRes, newMin, newMax, normOrStandOrByPage, numberOfWebPages)
{
    //console.log("numberOfWebPages", numberOfWebPages);
    //console.log("activityResBefore", activityRes);
    activityRes.graphAdjList = normalizeGraph(activityRes.graphAdjList, newMin, newMax, normOrStandOrByPage, numberOfWebPages);
    return activityRes;
}

function applyThresholdToGraph(graph, threshold)
{
    //console.log("graph applyThresholdToGraph", graph);
    graph.adjList.forEach((map, node) =>
    {
        map.forEach((weight, key, littleMap) =>
        {
            if(weight !== null)
            {
                if(weight < threshold)
                {
                    littleMap.set(key, 0);
                }
            }
        });
    });

    return graph;
}

function applyThresholdToActivityResult(activityRes, threshold)
{
    activityRes.threshold = threshold;
    activityRes.graphAdjList = applyThresholdToGraph(activityRes.graphAdjList, threshold);
    return activityRes;
}

function cleanGraph(graph)
{
    //console.log("cleanGraph before", graph);
    //Delete edges with 0 in relations
    let edgesToDelete = [];
    let numberOfEdges = 0;
    graph.adjList.forEach((map, bigNode) =>
    {
        map.forEach((weight, littleNode) =>
        {
            numberOfEdges++;
            if(weight === 0)
            {
                edgesToDelete.push([bigNode, littleNode]);
            }
        });
    });


    //Delete edges with 0 in relation weight
    edgesToDelete.forEach(arr => graph.deleteEdge(arr[0], arr[1]));

    //Delete nodes without any connection..
    let listNodeWithConnections = [];
    graph.adjList.forEach((map, bigNode) =>
    {
        //Edge from bigNode, Connection out
        if(map.size !== 0)
        {
            listNodeWithConnections.push(bigNode);
        }
        //Edges to bigNode!!
        else if([...graph.adjList].some((arr) => arr[1].has(bigNode)))
        {
            listNodeWithConnections.push(bigNode);
        }
    });

    let nodesToDelete = [...graph.adjList.keys()].filter(key => !listNodeWithConnections.includes(key));
    nodesToDelete.forEach(node => graph.deleteNode(node));

    return graph;
}

function cleanActivityRes(activityRes)
{
    activityRes.graphAdjList = cleanGraph(activityRes.graphAdjList);
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
            new GraphAdjList(new Map(jsonActRes._graphAdjList._adjList.map(array => [array[0], new Map(array[1])]))),
            jsonActRes._numberOfWebPages,
            jsonActRes._threshold);
    });


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

    let preparedActivityResults = res.map(activityResult => TOOLS.prepareActivityResultToJSON(activityResult));
    TOOLS.writeJSONFile(preparedActivityResults, "./output/processedActivityResults.json", GENERAL_CONFIG.indentProcessedFile);

})();