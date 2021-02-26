import * as PP from "../patternsPerformance"
import ActivityResult from "../entities/ActivityResult";
import * as TOOLS from "../tools";

//Infos at https://en.wikipedia.org/wiki/Inter-rater_reliability
const performanceMeasureFunctions =
	[
		TOOLS.samplePearsonCorrelationCoefficient,
		TOOLS.spearmanRankCorrelationCoefficient,
		TOOLS.kendallRankCorrelationCoefficient_B
	];

//Example for water plant activity
let annotatedActivityResults =
	[
		{
			"_activityName": "water_plants",
			"_pathToWebPages": "C:/Users/Charles/WebstormProjects/webpages_retrieval/outputData/water_plants",
			"_frequentSequentialPatterns": [
	{
		"pattern": [
			"soak||plant"
		],
		"patternFrequency": 0.16666666666666666,
		"inverseActivityFrequency": 1.255272505103306,
		"pfIaf": 0.20921208418388432,
		"annotation": 4
	},
	{
		"pattern": [
			"keep||plant"
		],
		"patternFrequency": 0.16666666666666666,
		"inverseActivityFrequency": 1.255272505103306,
		"pfIaf": 0.20921208418388432,
		"annotation": 2
	},
	{
		"pattern": [
			"fill||bottle"
		],
		"patternFrequency": 0.2222222222222222,
		"inverseActivityFrequency": 1.255272505103306,
		"pfIaf": 0.2789494455785124,
		"annotation": 4
	},
	{
		"pattern": [
			"fill||bottle",
			"fill||water"
		],
		"patternFrequency": 0.16666666666666666,
		"inverseActivityFrequency": 1.255272505103306,
		"pfIaf": 0.20921208418388432,
		"annotation": 3
	},
	{
		"pattern": [
			"fill||water"
		],
		"patternFrequency": 0.2222222222222222,
		"inverseActivityFrequency": 1.255272505103306,
		"pfIaf": 0.2789494455785124,
		"annotation": 4
	}],
			"_numberOfPatterns": 5,
			"_typeOfPattern": "closed",
			"_numberOfPlans": 18,
			"_minSupport": 0.15,
			"_minNumberPatterns": 1
		}];

(async() =>
{
	//Convert into real activity results
	annotatedActivityResults = annotatedActivityResults.map(a => new ActivityResult(a));

	//Get performance measures
	console.log("Performance measures");
	console.log(PP.getPerformancesFromAnnotatedActivityResults(annotatedActivityResults, performanceMeasureFunctions));

	//Get data1 and data2 from annotatedActivityResults
	let [data1, data2] = annotatedActivityResults
		.flat()
		.flatMap(annotatedActivityResult=> annotatedActivityResult.frequentSequentialPatterns)
		.reduce((acc, pattern) =>[[...acc[0], pattern.pfIaf], [...acc[1], pattern.annotation]], [[], []]);

	console.log("data1", data1);
	console.log("data2", data2);

	//Normalize data
	let normalizedData1 = TOOLS.minMaxNorm(data1, 0, 1);
	let normalizedData2 = TOOLS.minMaxNorm(data2, 0, 1);

	console.log("normalizedData1", normalizedData1);
	console.log("normalizedData2", normalizedData2);

	//Limits of agreement
	console.log("Limits of agreement")
	TOOLS.limitsOfAgreement(normalizedData1, normalizedData2);
})();