import {replaceHTMLEntities} from "./libs/fin-html-entities";
import {reverseSlang} from "./libs/fin-slang";
import {normalizeCaps, replaceConfusables, resolveContractions} from "en-norm";
import {JSDOM} from "jsdom";
import htmlToText from "html-to-text";

export async function extractPlans(path)
{
    let selectorPlansHTML = "div.steps.sticky:not(.sample)";
    let selectorStepsHTML = "[id^=step-id-] .step b";
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
            //stepHTML.querySelectorAll('*').forEach(n => n.remove());
            steps.push(stepHTML.textContent);
        });
        plans.push(steps);
    });


    //Check if it's multiple plans or multiple parts
    if(plansHTML.length > 1)
    {
        let discriminatingEl = plansHTML[0].querySelector("h3 > div > div");
        if(discriminatingEl !== null)
        {
            discriminatingEl.querySelectorAll('*').forEach(n => n.remove());
            let typeOfContent= discriminatingEl.textContent;
            //Only one plan
            if(typeOfContent.startsWith("Part"))
            {
                plans = [plans.flat()];
            }
        }
    }

    return plans;
}

export function htmlStringToCleanText(htmlString, generalConfig)
{
    let text = htmlToText.fromString(htmlString, generalConfig.configHTML2Text);
    return stringToCleanText(text, generalConfig);
}

export function stringToCleanText(text, generalConfig)
{
    //Delete all non pure text things...
    //JSON strings
    let processedText = text.replace(new RegExp("({\".*})", "gs"), "");
    //Urls
    processedText = processedText.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");
    //HTML entities and slang
    processedText = replaceHTMLEntities(reverseSlang(resolveContractions(replaceConfusables(processedText))));

    if(generalConfig.showCleanTextForDebug)
    {
        console.log("processedText", processedText);
    }
    return processedText;
}