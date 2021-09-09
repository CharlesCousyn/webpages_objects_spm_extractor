import filesSystem from "fs";
import * as TOOLS from "./tools";
import * as COMMON from "./sequentialPatternMining/common";
import clone from "clone";

let simulatedTrace = ["water", "cup", "tea", "water", "cup", "tea", "vacuum", "cup", "tea"];
let patternPerActivity = JSON.parse(filesSystem.readFileSync("./selectedPatterns/patterns.json"), TOOLS.reviverDate);

//TODO
function preprocessTrace(events)
{
    return events;
}

//For each element in trace, produce a label for the activity being
function HARFromTrace(events, patternsPerActivity, windowSize, overlap)
{
    events = events.sort((e1, e2) => e1.timestamp - e2.timestamp);

    //Cut trace using windowSize and overlap
    let cutTrace = [];
    let index = 0;
    while(index + windowSize <= events.length)
    {
        //Store index of related event
        let indexEvent = index + windowSize -1;

        cutTrace.push([events.slice(index, windowSize + index), indexEvent]);
        //Compute new index
        index += Math.round(windowSize * (1 - overlap));
    }

    //For each part of cutTrace, infer an activity relevance score
    return cutTrace
            .map(([part, indexEvent]) =>
            {
                //Find patterns used
                let activitiesWithRelevanceScore =
                    patternsPerActivity
                        //Find existing patterns
                        .map(o => ({activityName: o.activityName, activityPatterns: o.activityPatterns.filter(activityPat => COMMON.isSupported(activityPat.pattern, part))}))
                        //Accumulate score
                        .map(o =>
                        {
                            o.relevanceScore = o.activityPatterns.reduce((count, curr) => {count += curr.annotation;return count;}, 0.0);
                            return o;
                        })
                        //Decreasing order
                        .sort((o1, o2) => o2.relevanceScore - o1.relevanceScore);

                let sumScore = activitiesWithRelevanceScore.reduce((sum, curr) => {sum += curr.relevanceScore;return sum}, 0.0);

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
            });
}

(async () =>
{
    let events = simulatedTrace;
    preprocessTrace(events);
    let res = HARFromTrace(events, patternPerActivity, 4, 0.75);

    console.log(res);
})();