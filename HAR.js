import filesSystem from "fs";
import * as TOOLS from "./tools";
import * as COMMON from "./sequentialPatternMining/common";
import Event from "./patternUse/Event";

let simulatedTrace = ["water", "cup", "tea", "water", "cup", "tea", "vacuum", "cup", "tea"];
let patternPerActivityOriginal = JSON.parse(filesSystem.readFileSync("./selectedPatterns/patterns.json"), TOOLS.reviverDate);
let patternPerActivityImageExtractor = JSON.parse(filesSystem.readFileSync("./selectedPatterns/patternsImageExtractor.json"), TOOLS.reviverDate);

function preprocessTrace(events)
{
    return events;
}

function cutUsingSlidingWindowTechnique(trace, windowSize, overlap)
{
    let cutTrace = [];
    let index = 0;
    while(index + windowSize <= trace.length)
    {
        //Store index of related event
        let indexEvent = index + windowSize -1;

        cutTrace.push([trace.slice(index, windowSize + index), indexEvent]);
        //Compute new index
        index += Math.round(windowSize * (1 - overlap));
    }
    return cutTrace;
}

function cutUsingSlidingWindowTechniqueTime(trace, windowSizeHAR)
{
    if(trace.length !== 0)
    {
        let cutTrace = [];
        let firstData = trace[0];
        let lastData = trace[trace.length - 1];
        let indexBegin = trace.findIndex(d => d.timestamp > firstData.timestamp + windowSizeHAR/2);
        let indexEnd = TOOLS.findLastIndex(trace, d => d.timestamp < lastData.timestamp - windowSizeHAR/2);

        for(let index = indexBegin; index < indexEnd; index++)
        {
            let beginWindow =  trace[index].timestamp - windowSizeHAR/2;
            let endWindow =  trace[index].timestamp + windowSizeHAR/2;
            let usedData = trace.filter(d => d.timestamp > beginWindow && d.timestamp <= endWindow);
            cutTrace.push([usedData, index]);
        }

        return cutTrace.map(([usedData, index]) => [usedData.map(d => d.data), index]);
    }
    else
    {
        return [];
    }
}

function computeRelevanceScoresAndSortBy(part, indexEvent, patternsPerActivity)
{
    //Find patterns used
    let activitiesWithRelevanceScore =
        patternsPerActivity
            //Find existing patterns
            .map(o => ({activityName: o.activityName, activityPatterns: o.activityPatterns.filter(activityPat =>
                {
                    let res = COMMON.isSupported(activityPat.pattern, part);
                    if(res && o.activityName === "make_tea")
                    {
                        return true;
                    }
                    else if(res)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                })}))
            //Accumulate score
            .map(o =>
            {
                o.relevanceScore = o.activityPatterns.reduce((count, curr) => count + curr.annotation, 0.0);
                return o;
            })
            //Decreasing order
            .sort((o1, o2) => o2.relevanceScore - o1.relevanceScore);

    let sumScore = activitiesWithRelevanceScore.reduce((sum, curr) => sum + curr.relevanceScore, 0.0);

    let normalizedActivitiesWithRelevanceScore = [];
    if(sumScore === 0)
    {
        normalizedActivitiesWithRelevanceScore = activitiesWithRelevanceScore.map(o => {o.relevanceScore = 0.0;return o;});
    }
    else
    {
        normalizedActivitiesWithRelevanceScore = activitiesWithRelevanceScore.map(o => {o.relevanceScore = o.relevanceScore / sumScore;return o;});
    }

    return [part, indexEvent, normalizedActivitiesWithRelevanceScore];
}

function chooseLabelFromRelevanceScore(part, indexEvent, normalizedActivitiesWithRelevanceScore)
{
    let label = "noActivity";
    if(normalizedActivitiesWithRelevanceScore.length > 0 && normalizedActivitiesWithRelevanceScore[0].relevanceScore !== 0)
    {
        label = normalizedActivitiesWithRelevanceScore[0].activityName;
    }
    return [part, indexEvent, normalizedActivitiesWithRelevanceScore, label];
}

function addLabelToTrace(trace, indexEvent, label)
{
    trace[indexEvent] = label;
    return trace;
}

//Inspired by riboni et al.
export function HARUsingObjectsOnly(events, objectsByActivity, numberEvents)
{
    let labelledTrace = events.map(event => [event, "null"]);

    let activities = objectsByActivity.activities;
    //P(A|O)
    let probAWithO = [];
    //DEBUG
    activities = ["make_tea", "cook"];
    //DEBUG

    events.forEach((e, indexEvent) =>
    {
        let [maxActivity, maxWeight] = activities
        .map(a =>
        {
            //Compute w(a, tj)
            let weight = 0.0;

            return [a, weight];

        })
        //Find activity with max score
        .reduce(([oldA, oldWeight], [a, weight]) => weight >= oldWeight ? [a, weight] : [oldA, oldWeight], ["null", -1]);

        addLabelToTrace(labelledTrace, indexEvent, maxActivity);
    });

    return labelledTrace;
}

//For each element in trace, produce a label for the activity being
export function HARUsingSlidingWindowAndPatterns(events, useImageExtractorPatterns, windowSizeHAR)
{
    let patternsToUse = useImageExtractorPatterns ? patternPerActivityImageExtractor : patternPerActivityOriginal;
    //Default labelling
    let labelledTrace = events.map(event => "noActivity");

    //For each part of cutTrace, infer an activity relevance score
    cutUsingSlidingWindowTechniqueTime(events, windowSizeHAR)
        .map(([part, indexEvent]) => computeRelevanceScoresAndSortBy(part, indexEvent, patternsToUse))
        .map(([part, indexEvent, normalizedActivitiesWithRelevanceScore]) => chooseLabelFromRelevanceScore(part, indexEvent, normalizedActivitiesWithRelevanceScore))
        .forEach(([, indexEvent, , label]) => addLabelToTrace(labelledTrace, indexEvent, label));

    return labelledTrace;
}

(async () =>
{
    /*
    let events = simulatedTrace;
    preprocessTrace(events);
    let res = HARUsingSlidingWindowAndPatterns(events, patternPerActivity, 4, 0.5);

    console.log(res);*/
})();