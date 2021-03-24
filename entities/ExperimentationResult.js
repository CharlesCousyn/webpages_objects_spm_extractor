export default class ExperimentationResult
{
    constructor(configuration, activityResults, dateBegin, dateEnd)
    {
        if(typeof configuration === "object" && activityResults === undefined)
        {
            this._configuration = configuration._configuration;
            this._activityResults = configuration._activityResults;
            this._dateBegin = configuration._dateBegin;
            this._dateEnd = configuration._dateEnd;
        }
        else
        {
            this._configuration = configuration;
            this._activityResults = activityResults;
            this._dateBegin = dateBegin;
            this._dateEnd = dateEnd;
        }
    }

    get dateBegin() {
        return this._dateBegin;
    }

    set dateBegin(value) {
        this._dateBegin = value;
    }

    get configuration() {
        return this._configuration;
    }

    set configuration(value) {
        this._configuration = value;
    }

    get activityResults() {
        return this._activityResults;
    }

    set activityResults(value) {
        this._activityResults = value;
    }

    get dateEnd() {
        return this._dateEnd;
    }

    set dateEnd(value) {
        this._dateEnd = value;
    }
}