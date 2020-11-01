export default class ActivityResult
{
	constructor(activityName, pathToWebPages, numPOSET, numberOfWebPages, threshold)
	{
		this._activityName = activityName;
		this._pathToWebPages = pathToWebPages;
		this._numPOSET = numPOSET;
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

	get numPOSET()
	{
		return this._numPOSET;
	}

	set numPOSET(numPOSET)
	{
		this._numPOSET = numPOSET;
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