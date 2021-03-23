//Personal imports
import GENERAL_CONFIG from "./configFiles/generalConfig.json";
import * as TOOLS from "./tools";
import * as getSeqPat from "./getSequentialPatterns";


(async ()=>
{
    let preparedActivityResults = await getSeqPat.run(GENERAL_CONFIG);

    TOOLS.writeJSONFile(preparedActivityResults, "./output/rawActivityResults.json", GENERAL_CONFIG.indentRawFile);
})();