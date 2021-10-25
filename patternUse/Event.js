export default class Event
{
    constructor(timestamp, data, label)
    {
        if (typeof timestamp === "object" && data === undefined)
        {
            this._timestamp = timestamp.timestamp;
            this._data = timestamp.data;
            this._label = timestamp.label;
        }
        else
        {
            this._timestamp = timestamp;
            this._data = data;
            this._label = label;
        }
    }

    get label() {
        return this._label;
    }

    set label(value) {
        this._label = value;
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