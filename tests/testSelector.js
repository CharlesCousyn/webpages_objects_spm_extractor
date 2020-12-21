import {JSDOM} from "jsdom";
import {extractPlans} from "../htmlProcessing";


//Keep JSDOM errors
/*const originalConsoleError = console.error;
console.error = function(msg)
{
    if(msg.startsWith('Error: Could not parse CSS stylesheet')) return;
    originalConsoleError(msg);
}*/

async function extractPlans2(path)
{
    let selectorPlansHTML = "[id^=mf-section-] > div.steps.steps_first.sticky";
    let selectorStepsHTML = "[id^=step-id-] .step";
    let document = (await JSDOM.fromFile(path)).window.document;

    //Extract all plans with all steps for each plan
    let plans = [];
    let plansHTML = document.querySelectorAll(selectorPlansHTML);
    console.log(plansHTML.length);
    plansHTML.forEach(planHTML =>
    {
        let steps = [];
        let stepsHTML = planHTML.querySelectorAll(selectorStepsHTML);
        console.log(stepsHTML);
        stepsHTML.forEach(stepHTML =>
        {
            stepHTML.querySelectorAll('*').forEach(n => n.remove());
            console.log(stepHTML.textContent);
            steps.push(stepHTML.textContent);
        });
        plans.push(steps);
    });

    return plans;
}

(async () =>
{
    let allPlans = [];
    for(let i = 0; i < 10; i++)
    {
        let pathToFileTest = `C:/Users/Charles/WebstormProjects/webpages_retrieval/outputDataFiltered/cook_pasta/cook_pasta_${i}.html`;
        let plans = await extractPlans(pathToFileTest);
        plans.forEach(plan => allPlans.push(plan));
    }
    console.log("totalNumberOfPlans: ", allPlans.length);
    console.log("allPlans: ", allPlans);


})();