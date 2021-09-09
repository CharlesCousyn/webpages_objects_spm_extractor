export default class Event
{
    constructor(timestamp, data)
    {
        if (typeof timestamp === "object" && data === undefined) {
            this._timestamp = timestamp.timestamp;
        } else {
            this._timestamp = timestamp;
        }
        this._timestamp = timestamp;
        this._data = data;
    }


    get timestamp()
    {
        return this._timestamp;
    }

    set timestamp(value)
    {
        this._timestamp = value;
    }

    get data()
    {
        return this._data;
    }

    set data(value)
    {
        this._data = value;
    }
}