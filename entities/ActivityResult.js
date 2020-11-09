export default class ActivityResult
{
	constructor(activityName, pathToWebPages, graphAdjList, numberOfWebPages, threshold)
	{
		this._activityName = activityName;
		this._pathToWebPages = pathToWebPages;
		this._graphAdjList = graphAdjList;
		this._numberOfWebPages = numberOfWebPages;
		this._threshold = threshold;
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

	get graphAdjList()
	{
		return this._graphAdjList;
	}

	set graphAdjList(graphAdjList)
	{
		this._graphAdjList = graphAdjList;
	}

	get numberOfWebPages()
	{
		return this._numberOfWebPages;
	}

	set numberOfWebPages(numberOfWebPages)
	{
		this._numberOfWebPages = numberOfWebPages;
	}

	get threshold()
	{
		return this._threshold;
	}

	set threshold(threshold)
	{
		this._threshold = threshold;
	}
}