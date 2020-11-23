export default class GraphAdjList
{
    constructor(map)
    {
        if(map !== undefined)
        {
            this._adjList = map;
        }
        else
        {
            this._adjList = new Map();
        }
    }

    addNode(id, occurences, isUnsafe)
    {
        if(isUnsafe)
        {
            //Check if id exists
            if(this._adjList.has(id))
            {
                throw new Error("The id already exists!");
            }
        }
        if(occurences === undefined)
        {
            occurences = 0;
        }
        this._adjList.set(id, [occurences, new Map()]);
    }

    addWeightToANode(id, value, isUnsafe)
    {
        if(isUnsafe)
        {
            if(!this._adjList.has(od))
            {
                throw new Error("Specified id does not exist!! " + id);
            }
        }
        let weight = this._adjList.get(id)[0];
        let successors = this._adjList.get(id)[1];
        if(weight === undefined)
        {
            weight = 0;
        }
        this._adjList.set(id, [weight + value, successors]);
    }

    //firstId precede secondId
    addWeightToAnEdge(firstId, secondId, value, isUnsafe)
    {
        if(isUnsafe)
        {
            if(!this._adjList.has(firstId))
            {
                throw new Error("First id for the edge does not exist!! " + firstId);
            }

            if(!this._adjList.has(secondId))
            {
                throw new Error("Second id for the edge does not exist!! " + secondId);
            }
        }
        let nodeInfosFirstId = this._adjList.get(firstId);
        let weight = nodeInfosFirstId[1].get(secondId);
        if(weight === undefined)
        {
            weight = 0;
        }
        this._adjList.set(firstId, [nodeInfosFirstId[0], nodeInfosFirstId[1].set(secondId, weight + value)]);
    }

    //firstId precede secondId
    addEdge(firstId, secondId, value, isUnsafe)
    {
        if(isUnsafe)
        {
            if(!this._adjList.has(firstId) || !this._adjList.has(secondId))
            {
                throw new Error("One of the ids given for the edge does not exist!!")
            }
        }
        let nodeInfos = this._adjList.get(firstId);
        this._adjList.set(firstId, [nodeInfos[0], nodeInfos[1].set(secondId, value)]);
    }

    deleteNode(idToDelete)
    {
        //Delete id
        this._adjList.delete(idToDelete);

        //Delete id for all nodes
        this._adjList.forEach((value, key, map) =>
        {
            if(value !== null)
            {
                let [, adjMap] = value;
                adjMap.delete(idToDelete);
            }
        });
    }

    deleteNodeSoft(idToDelete)
    {
        //Delete id
        this._adjList.delete(idToDelete);
    }

    deleteEdge(firstId, secondId)
    {
        this._adjList.get(firstId)[1].delete(secondId);
    }

    printAdjList()
    {
        console.table(this._adjList);
    }

    //Getters and setters
    get adjList()
    {
        return this._adjList;
    }

    set adjList(adjList)
    {
        this._adjList = adjList;
    }
}