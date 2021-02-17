import {JSDOM} from "jsdom";
import {extractPlans} from "../htmlProcessing";


//Keep JSDOM errors
/*const originalConsoleError = console.error;
console.error = function(msg)
{
    if(msg.startsWith('Error: Could not parse CSS stylesheet')) return;
    originalConsoleError(msg);
}*/

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