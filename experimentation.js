import EXPERIMENTATION_CONFIG from './configFiles/experimentationConfig.json';
import * as TOOLS from "./tools";
import * as getSeqPat from "./getSequentialPatterns";

function generateAllConfigurations(criteria)
{
    if (criteria.length === 1)
    {
        return criteria[0];
    }
    else
    {
        let result = [];
        let allCasesOfRest = generateAllConfigurations(criteria.slice(1));  // recur with the rest of array
        let  [nameNext, valueNext] = criteria[0];
        //For each value of criterion
        for (let i = 0; i < allCasesOfRest.length; i++)
        {
            for (let j = 0; j < valueNext.length; j++)
            {
                if(Array.isArray(allCasesOfRest[i]) && Array.isArray(allCasesOfRest[0]))
                {
                    result.push([[nameNext, valueNext[j]], ...allCasesOfRest[i]]);
                }
                else
                {
                    result.push([[nameNext, valueNext[j]], [allCasesOfRest[0], allCasesOfRest[1][i]]]);
                }
            }
        }
        return result;
    }
}

function filterUselessCombinations(configurations)
{
    return configurations.filter(conf => conf.verbAssociatorUsed || conf.verbAssociatorProximityBasedOrSyntacticBased);
}

(async () =>
{
    //Generate all configurations
    const criteriaExp = EXPERIMENTATION_CONFIG.criteria;
    let configurationsKeyVal = generateAllConfigurations(Object.entries(criteriaExp));
    let configurations = configurationsKeyVal.map(combKeyVal => Object.fromEntries(combKeyVal));
    configurations = filterUselessCombinations(configurations);
    console.log(`Computing results for ${configurations.length} configurations....`);

    //Use every combination
    for(let i = 0; i < configurations.length; i++)
    {
        //Show used config
        console.log("Used configuration:");
        console.log(configurations[i]);

        //Compute patterns for this config
        let activityResults = await getSeqPat.run(configurations[i]);

        //Evaluate on combination
        //evaluateComb(configurations[i], groundTruth);
    }

    //Produce files for JASP
    //TOOLS.writeJSONFile(dataForJASP, "./configFiles/dataForJASP.json");

})();
