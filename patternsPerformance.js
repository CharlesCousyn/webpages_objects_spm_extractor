import * as TOOLS from "./tools";
import ActivityResult from "./entities/ActivityResult";
import GENERAL_CONFIG from "./configFiles/generalConfig.json";



function getDistributionOfPerformanceMeasures()
{

}

function getPerformancesFromCouples(couples, performanceMeasureFunctions)
{
	console.log(couples);
	//Get scores
	let [pfIafs, annotations] = couples;
	console.log("pfIafs", pfIafs);
	console.log("annotations", annotations);

	//Compute all performances measures
	let perfObj = {};
	performanceMeasureFunctions.forEach(measure =>
	{
		perfObj[measure.name] = measure(pfIafs, annotations);
	});
	return perfObj;
}

export function getPerformancesFromAnnotatedActivityResults(annotatedActivityResults, performanceMeasureFunctions)
{
	//Performances for each activity
	let couplesScoreAnnotationPerActivity = annotatedActivityResults.map(annotatedActivityResult =>
	{
		//Get pfIafs
		let pfIafs = annotatedActivityResult.frequentSequentialPatterns.map(patInfos => patInfos.pfIaf);
		//Get annotations
		let annotations = annotatedActivityResult.frequentSequentialPatterns.map(patInfos => patInfos.annotation);

		return [pfIafs, annotations];
	});
	let performancesPerActivity = couplesScoreAnnotationPerActivity.map(couples => getPerformancesFromCouples(couples, performanceMeasureFunctions));

	//Performances for all activities
	let couplesScoreAnnotationAllActivities = couplesScoreAnnotationPerActivity.flat();
	let performancesAllActivities = getPerformancesFromCouples(couplesScoreAnnotationAllActivities, performanceMeasureFunctions);

	return {performancesAllActivities, performancesPerActivity};
}
/*
(async () =>
{
	//Convert into real activity results
	let annotatedActivityResults = annotatedActivityResults.map(a => new ActivityResult(a));

	let performances = getDistributionOfPerformanceMeasures(annotatedActivityResults);

	//Prepare and write performance files
	TOOLS.writeJSONFile(performances, "./output/performances.json", GENERAL_CONFIG.indentRawFile);
})();*/