import filesSystem from "fs";
import {JSDOM} from "jsdom";

export function writeJSONFile(data, path, isIndent)
{
    let string = "";
    if(isIndent)
    {
        string = JSON.stringify(data, null, 4);
    }
    else
    {
        string = JSON.stringify(data);
    }
    filesSystem.writeFileSync(path, string, "utf8");
}

export function writeTextFile(data, path)
{
    filesSystem.writeFileSync(path, data, {encoding:"utf8"});
}

export function readTextFile(path)
{
    return filesSystem.readFileSync(path, 'utf8');
}

export function timeConversion(ms)
{
    let seconds = (ms / 1000).toFixed(1);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

    if (seconds < 60) {
        return seconds + " Sec";
    } else if (minutes < 60) {
        return minutes + " Min";
    } else if (hours < 24) {
        return hours + " Hrs";
    } else {
        return days + " Days"
    }
}

export function showProgress(currentNumberOfResults, totalNumberOfResults, beginTime)
{
    const timeElapsed = timeConversion(new Date() - beginTime);
    console.log(`Progress ${currentNumberOfResults}/${totalNumberOfResults} (${100.0 * currentNumberOfResults/totalNumberOfResults} %) (${timeElapsed} elapsed)`);
}

export function prepareActivityResultToJSON(activityResult)
{
    activityResult.graphAdjList.adjList = [...activityResult.graphAdjList.adjList];//adjList is now an array of array [node, Map]
    activityResult.graphAdjList.adjList = activityResult.graphAdjList.adjList.map(neighbors => [neighbors[0], [...neighbors[1]]]);
    return activityResult;
}

export async function extractPlans(path)
{
    let selectorPlansHTML = "[id^=mf-section-] > div.steps.steps_first.sticky";
    let selectorStepsHTML = "[id^=step-id-] .step";
    let document = (await JSDOM.fromFile(path)).window.document;

    //Extract all plans with all steps for each plan
    let plans = [];
    let plansHTML = document.querySelectorAll(selectorPlansHTML);
    plansHTML.forEach(planHTML =>
    {
        let steps = [];
        let stepsHTML = planHTML.querySelectorAll(selectorStepsHTML);

        stepsHTML.forEach(stepHTML =>
        {
            stepHTML.querySelectorAll('*').forEach(n => n.remove());
            steps.push(stepHTML.textContent);
        });
        plans.push(steps);
    });

    return plans;
}
