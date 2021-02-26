import * as PP from "../patternsPerformance"
import ActivityResult from "../entities/ActivityResult";
import * as TOOLS from "../tools";

//Infos at https://en.wikipedia.org/wiki/Inter-rater_reliability
const performanceMeasureFunctions =
	[
		TOOLS.samplePearsonCorrelationCoefficient,
		TOOLS.spearmanRankCorrelationCoefficient,
		TOOLS.kendallRankCorrelationCoefficient
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
	console.log(performanceMeasureFunctions);
	//Convert into real activity results
	annotatedActivityResults = annotatedActivityResults.map(a => new ActivityResult(a));
	console.log(PP.getPerformancesFromAnnotatedActivityResults(annotatedActivityResults, performanceMeasureFunctions));
})();