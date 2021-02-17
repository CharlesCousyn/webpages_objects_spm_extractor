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

function sampleCorrelationCoefficient(data1, data2)
{
    let meanData1 = TOOLS.mean(data1);
    let meanData2 = TOOLS.mean(data2);
    let sdData1 = TOOLS.standardDeviation(data1);
    let sdData2 = TOOLS.standardDeviation(data2);
    let dataMultiplied = data1.map((curr, index) => data1[index] * data2[index]);
    let meanDataMultiplied = TOOLS.mean(dataMultiplied);


    return ( meanDataMultiplied - meanData1 * meanData2) / (sdData1 * sdData2);
}

function dataToRankData(array)
{
    let noDuplicatesSorted = [...new Set(array)].sort((a, b) => b - a);
    return array.map((val) => noDuplicatesSorted.indexOf(val) + 1);
}

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
    console.log(dataToRankData(data1));
    console.log(dataToRankData(data2));

    showPlot(data1, data2);

    let pearson = sampleCorrelationCoefficient(data1, data2);
    console.log("samplePearsonCorrelationCoefficient", pearson);

    let spearman = sampleCorrelationCoefficient(dataToRankData(data1), dataToRankData(data2));
    console.log("sampleSpearmanCorrelationCoefficient", spearman);
})();