export default class ActivityResult
{
	constructor(activityName, pathToWebPages, frequentSequentialPatterns, numberOfPatterns, typeOfPattern, numberOfPlans, minSupport, minNumberPatterns, dateBegin, dateEnd)
	{
		if(typeof activityName === "object" && pathToWebPages === undefined)
		{
			this._activityName = activityName._activityName;
			this._pathToWebPages = activityName._pathToWebPages;
			this._frequentSequentialPatterns = activityName._frequentSequentialPatterns;
			this._numberOfPatterns = activityName._numberOfPatterns;
			this._typeOfPattern = activityName._typeOfPattern;
			this._numberOfPlans = activityName._numberOfPlans;
			this._minSupport = activityName._minSupport;
			this._minNumberPatterns = activityName._minNumberPatterns;
			this._dateBegin = activityName._dateBegin;
			this._dateEnd = activityName._dateEnd;
		}
		else
		{
			this._activityName = activityName;
			this._pathToWebPages = pathToWebPages;
			this._frequentSequentialPatterns = frequentSequentialPatterns;
			this._numberOfPatterns = numberOfPatterns;
			this._typeOfPattern = typeOfPattern;
			this._numberOfPlans = numberOfPlans;
			this._minSupport = minSupport;
			this._minNumberPatterns = minNumberPatterns;
			this._dateBegin = dateBegin;
			this._dateEnd = dateEnd;
		}
	}

	prepareActivityResultToJSON()
	{
		this._frequentSequentialPatterns = [...this._frequentSequentialPatterns];
		return this;
	}

	get dateBegin()
	{
		return this._dateBegin;
	}

	set dateBegin(value)
	{
		this._dateBegin = value;
	}

	get dateEnd()
	{
		return this._dateEnd;
	}

	set dateEnd(value)
	{
		this._dateEnd = value;
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

	set frequentSequentialPatterns(frequentSequentialPatterns)
	{
		this._frequentSequentialPatterns = frequentSequentialPatterns;
	}

	get numberOfPlans()
	{
		return this._numberOfPlans;
	}

	set numberOfPlans(numberOfPlans)
	{
		this._numberOfPlans = numberOfPlans;
	}

	get minSupport()
	{
		return this._minSupport;
	}

	set minSupport(minSupport)
	{
		this._minSupport= minSupport;
	}

	get numberOfPatterns()
	{
		return this._numberOfPatterns;
	}

	set numberOfPatterns(value)
	{
		this._numberOfPatterns = value;
	}

	get minNumberPatterns()
	{
		return this._minNumberPatterns;
	}

	set minNumberPatterns(value)
	{
		this._minNumberPatterns = value;
	}

	get typeOfPattern()
	{
		return this._typeOfPattern;
	}

	set typeOfPattern(value)
	{
		this._typeOfPattern = value;
	}

}