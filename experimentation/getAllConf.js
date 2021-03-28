import EXPERIMENTATION_CONFIG from '../configFiles/experimentationConfig.json';
import GENERAL_CONFIG from '../configFiles/generalConfig.json';
import * as TOOLS from "../tools";
import * as getSeqPat from "../getSequentialPatterns";
import ExperimentationResult from "../entities/ExperimentationResult";
import filesSystem from "fs";
import { v4 as uuidv4 } from 'uuid';

//Cartesian product of all possible value of all criteria
function generateAllConfigurations(criteria)
{
    if(criteria.length === 1)
    {
        return criteria[0];// [nameCriterion, values]
    }
    else
    {
        let res = [];
        let otherCases = generateAllConfigurations(criteria.slice(1));
        let [nameCurrent, valuesCurrent] = criteria[0];
        //If otherCases of the form [nameCriterion, values]
        if(otherCases.length !== 0 && typeof otherCases[0] === "string")
        {
            let [nameOther, valuesOther] = otherCases;
            for(let i = 0; i < valuesOther.length; i++)
            {
                for(let j =0; j < valuesCurrent.length; j++)
                {
                    res.push([[nameCurrent, valuesCurrent[j]], [nameOther, valuesOther[i]]]);
                }
            }
        }
        //If otherCases of the form partial solution
        else
        {
            for(let i = 0; i < otherCases.length; i++)
            {
                for(let j =0; j < valuesCurrent.length; j++)
                {
                    res.push([[nameCurrent, valuesCurrent[j]], ...otherCases[i]]);
                }
            }
        }

        return res;
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
    let configurationsToCompute = configurationsKeyVal.map(combKeyVal => Object.fromEntries(combKeyVal));
    configurationsToCompute = filterUselessCombinations(configurationsToCompute);

    //Check configurations already computed
    const path = `./experimentationResults`;
    const filePaths = filesSystem.readdirSync( path, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `${path}/${dirent.name}`);
    const allConfigurationsComputed = filePaths.map(filePath =>
    {
        //Get resultFile
        const expFile = JSON.parse(filesSystem.readFileSync(filePath), TOOLS.reviverDate);
        let realExperimentationResult = expFile.map(confRes => new ExperimentationResult(confRes));
        return realExperimentationResult[0].configuration;
    });
    //and remove it
    configurationsToCompute = configurationsToCompute.filter(conf => !TOOLS.includeObjects(allConfigurationsComputed, conf));

    //For test
    //configurationsToCompute = configurationsToCompute.filter((val, index) => index >= 7 && index <= 7);

    console.log(`Computing results for ${configurationsToCompute.length} configurations....`);

    //Progress variables
    let initTime = new Date();
    let currentConfigProcessed = 0;
    TOOLS.showProgress(currentConfigProcessed, configurationsToCompute.length, initTime);

    //Use every combination
    for(let i = 0; i < configurationsToCompute.length; i++)
    {
        //Show used config
        console.log("Used configuration:");
        console.log(configurationsToCompute[i]);

        //Compute patterns for this config
        let dateBegin = new Date();
        let activityResults = await getSeqPat.run(configurationsToCompute[i]);
        let dateEnd = new Date();
        let experimentationResult = new ExperimentationResult(configurationsToCompute[i], activityResults, dateBegin, dateEnd);

        let nameFile = uuidv4();
        //Write file in not annotated folder
        TOOLS.writeJSONFile([experimentationResult], `./experimentationResults/allConfExperimentalResults/${nameFile}.json`, GENERAL_CONFIG.indentRawFile);

        //Write file in annotated folder if it does not exist
        if(!filesSystem.existsSync(`./experimentationResults/allConfAnnotatedExperimentalResults/${nameFile}.json`))
        {
            TOOLS.writeJSONFile([experimentationResult], `./experimentationResults/allConfAnnotatedExperimentalResults/${nameFile}.json`, GENERAL_CONFIG.indentRawFile);
        }

        console.log("////////////////////////////");
        console.log("//Experimentation progress//");
        console.log("////////////////////////////");
        currentConfigProcessed++;
        TOOLS.showProgress(currentConfigProcessed, configurationsToCompute.length, initTime);
    }
})();
