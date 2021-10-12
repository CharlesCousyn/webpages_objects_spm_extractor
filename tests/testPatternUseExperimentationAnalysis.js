import { plot } from 'nodeplotlib';
import filesSystem from "fs";
import * as TOOLS from "../tools";
import csvStringify from "csv-stringify/lib/sync";

let EXPERIMENTATION_RESULTS = JSON.parse(filesSystem.readFileSync("./patternUse/experimentationResults.json"), TOOLS.reviverDate);

(async () =>
{
    let parameters = ["windowSizeObjectUse", "thresholdMinDistanceRFID", "thresholdMaxDistanceRFID", "windowSizeHAR"];
    const stringPatternData = csvStringify(EXPERIMENTATION_RESULTS.map(e => [...e.combination, e.performanceData.metrics.cohenKappa]),
            {
                header: true,
                columns: [...parameters, "cohenKappa"],
                cast: {
                    boolean: bool => bool + ""
                }
            });

    TOOLS.writeTextFile(stringPatternData, `./patternUse/jaspAnalysis.csv`);
        /*plot([
                {
                    x: xs,
                    y: ys,
                    name: param,
                    type: "line"
                }],
            {
                title: `Kappa as a function of ${param} distance`,
                showlegend: true,
                xaxis:{title: param},
                yaxis:{title: "Cohen's Kappa"}
            }
        );*/
})();