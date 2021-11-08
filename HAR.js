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
//10.1109/WETICE.2017.38
export function HARUsingObjectsOnly(events, patternsImageExtractor, slidingWindowNumberEvents, smoothingFactor)
{
    let labelledTrace = events.map(event => "noActivity");
    let activities = patternsImageExtractor.map(p => p.activityName);

    events.forEach((e, indexEvent) =>
    {
        let [maxActivity, maxWeight] = ["noActivity", -1];
        if(indexEvent > slidingWindowNumberEvents)
        {
            [maxActivity, maxWeight] = activities
                .map(a =>
                {
                    //Get correct patterns from activity
                    let activityPatterns = patternsImageExtractor.find(o => o.activityName === a).activityPatterns;
                    //Compute w(a, tj)
                    let weight = 1.0;
                    for(let indexE = indexEvent; indexE > indexEvent - slidingWindowNumberEvents; indexE--)
                    {
                        let object = events[indexE].data;
                        let myPattern = activityPatterns.find(ap => ap.pattern[0] === object);
                        if(myPattern !== undefined)
                        {
                            let probObjectConditionalA = myPattern.annotation;
                            let exponent = indexEvent - indexE;
                            weight *= probObjectConditionalA * Math.pow(smoothingFactor, exponent);
                        }
                    }
                    return [a, weight];
                })
                //Find activity with max score
                .reduce(([oldA, oldWeight], [a, weight]) => weight >= oldWeight ? [a, weight] : [oldA, oldWeight], ["noActivity", -1]);
        }

        addLabelToTrace(labelledTrace, indexEvent, maxActivity);
    });

    return labelledTrace;
}

function choosePatternsToUse(useImageExtractorPatternsOrSPMPatterns)
{
    let patternsToUse = [];
    switch(useImageExtractorPatternsOrSPMPatterns)
    {
        case "BOTH":
            //Get all activities
            let allActivities = [...new Set(patternPerActivityImageExtractor.map(a => a.activityName))];
            //Merge activity patterns
            patternsToUse = allActivities.map((a, index) =>
            {
                let patternIm = patternPerActivityImageExtractor.find(obj => obj.activityName === a);
                let patternSPM = patternPerActivityOriginal.find(obj => obj.activityName === a);
                let activityPatterns = [];
                if(patternIm !== undefined)
                {
                    activityPatterns = [...activityPatterns, ...patternIm.activityPatterns];
                }
                if(patternSPM !== undefined)
                {
                    activityPatterns = [...activityPatterns, ...patternSPM.activityPatterns];
                }
                return ({activityName:a, activityPatterns});
            });
            break;
        case "IMAGE_EXTRACTOR":
            patternsToUse = patternPerActivityImageExtractor;
            break;
        case "SPM":
            patternsToUse = patternPerActivityOriginal;
            break;
        default:
            throw new Error("Invalid value for useImageExtractorPatternsOrSPMPatterns parameter")
    }

    return patternsToUse;
}

//For each element in trace, produce a label for the activity being
export function HARUsingSlidingWindowAndPatterns(events, mapParamValue)
{
    let useImageExtractorPatternsOrSPMPatterns = mapParamValue.get("useImageExtractorPatternsOrSPMPatterns");
    let windowSizeHAR = mapParamValue.get("windowSizeHAR");

    let patternsToUse = choosePatternsToUse(useImageExtractorPatternsOrSPMPatterns);

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