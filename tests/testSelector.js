import {JSDOM} from "jsdom";


//Keep JSDOM errors
/*const originalConsoleError = console.error;
console.error = function(msg)
{
    if(msg.startsWith('Error: Could not parse CSS stylesheet')) return;
    originalConsoleError(msg);
}*/

async function extractPlans(path)
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
    let pathToFileTest = "C:/Users/Charles/WebstormProjects/webpages_retrieval/outputDataFiltered/bake_parmesan_turkey_meatballs/bake_parmesan_turkey_meatballs_0.html";
    console.log(await extractPlans(pathToFileTest));

})();