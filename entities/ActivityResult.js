export default class ActivityResult
{
	constructor(activityName, pathToWebPages, frequentSequentialPatterns, numberOfWebPages, minSupport)
	{
		this._activityName = activityName;
		this._pathToWebPages = pathToWebPages;
		this._frequentSequentialPatterns = frequentSequentialPatterns;
		this._numberOfWebPages = numberOfWebPages;
		this._minSupport = minSupport;
	}

	prepareActivityResultToJSON()
	{
		this._frequentSequentialPatterns = [...this._frequentSequentialPatterns];
		return this;
	}

	get activityName()
	{
		return this._activityName;
	}

	set activityName(activityName)
	{
		this._activityName = activityName;
	}

	get pathToWebPages()
	{
		return this._pathToWebPages;
	}

	set pathToWebPages(pathToWebPages)
	{
		this._pathToWebPages = pathToWebPages;
	}

	get frequentSequentialPatterns()
	{
		return this._frequentSequentialPatterns;
	}

	set frequentSequentialPattern(frequentSequentialPatterns)
	{
		this._frequentSequentialPatterns = frequentSequentialPatterns;
	}

	get numberOfWebPages()
	{
		return this._numberOfWebPages;
	}

	set numberOfWebPages(numberOfWebPages)
	{
		this._numberOfWebPages = numberOfWebPages;
	}

	get minSupport()
	{
		return this._minSupport;
	}

	set minSupport(minSupport)
	{
		this._minSupport= minSupport;
	}
}