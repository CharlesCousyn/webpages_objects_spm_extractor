import * as TOOLS from "../tools";
import Plot from "@stdlib/plot/ctor";

//Example for water plant activity
let resWaterPlant = [
    {
        "pattern": [
            "soak||plant"
        ],
        "patternFrequency": 0.16666666666666666,
        "inverseActivityFrequency": 1.255272505103306,
        "pfIaf": 0.20921208418388432
    },
    {
        "pattern": [
            "keep||plant"
        ],
        "patternFrequency": 0.16666666666666666,
        "inverseActivityFrequency": 1.255272505103306,
        "pfIaf": 0.20921208418388432
    },
    {
        "pattern": [
            "fill||bottle"
        ],
        "patternFrequency": 0.2222222222222222,
        "inverseActivityFrequency": 1.255272505103306,
        "pfIaf": 0.2789494455785124
    },
    {
        "pattern": [
            "fill||bottle",
            "fill||water"
        ],
        "patternFrequency": 0.16666666666666666,
        "inverseActivityFrequency": 1.255272505103306,
        "pfIaf": 0.20921208418388432
    },
    {
        "pattern": [
            "fill||water"
        ],
        "patternFrequency": 0.2222222222222222,
        "inverseActivityFrequency": 1.255272505103306,
        "pfIaf": 0.2789494455785124
    }
];

let patterns = resWaterPlant.map(obj => obj.pattern);
let data1 = resWaterPlant.map(obj => obj.pfIaf);
let data2 = [4, 2, 4, 3, 4];

function showPlot(arrayX, arrayY)
{
    //View histogram 1
    let plotCDF = new Plot(
        {
            x : [arrayX],
            y : [arrayY],
            xMin: 0.0,
            yMin: 0.0,
            labels: ["Correlation between relevance score and pfIaf"],
            xLabel: "pfIaf",
            yLabel: "Relevance score",
            lineStyle: ["none"],
            colors: ["blue"],
            description: "Correlation between relevance score and pfIaf",
            title: "Correlation between relevance score and pfIaf",
            symbols: ["closed-circle"],
            width: 1000,
            height: 562,
            xNumTicks: 10,
            yNumTicks: 10,
            renderFormat: "vdom",
            viewer: "browser",
            autoRender: false,
            autoView: false
        });
    plotCDF.render();
    plotCDF.view();

}

(async () =>
{
    console.log(data1);
    console.log(data2);
    console.log(TOOLS.dataToRankData(data1));
    console.log(TOOLS.dataToRankData(data2));

    //showPlot(data1, data2);

    let pearson = TOOLS.samplePearsonCorrelationCoefficient(data1, data2);
    console.log("samplePearsonCorrelationCoefficient", pearson);

    let spearman = TOOLS.spearmanRankCorrelationCoefficient(data1, data2);
    console.log("spearmanRankCorrelationCoefficient", spearman);

    //Min max normalisation
    data1 = TOOLS.minMaxNorm(data1, 0, 1);
    data2 = TOOLS.minMaxNorm(data2, 0, 1);
    console.log("data1", data1);
    console.log("data2", data2);

    TOOLS.limitsOfAgreement(data1, data2);

    //Compute differences between each pair
    let differences = data1.map((dataPoint1, index) => dataPoint1 - data2[index]);

    let interval = TOOLS.findEstimatedCredibleInterval(0.95, TOOLS.createHistFromData(differences, true, "none"), "equalTailed", 100000);

    console.log(interval);
})();