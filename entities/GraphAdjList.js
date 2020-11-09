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

    addNode(id, isUnsafe)
    {
        if(isUnsafe)
        {
            //Check if id exists
            if(this._adjList.has(id))
            {
                throw new Error("The id already exists!");
            }
        }
        this._adjList.set(id, new Map());
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
        let weight = this._adjList.get(firstId).get(secondId);
        if(weight === undefined)
        {
            weight = 0;
        }
        this._adjList.set(firstId, this._adjList.get(firstId).set(secondId, weight + value));
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
        this._adjList.set(firstId, this._adjList.get(firstId).set(secondId, value));
    }

    deleteNode(idToDelete)
    {
        //Delete id
        this._adjList.delete(idToDelete);

        //Delete id for all nodes
        this._adjList.forEach((adjMap, key, map) =>
        {
            adjMap.delete(idToDelete);
        });
    }

    deleteNodeSoft(idToDelete)
    {
        //Delete id
        this._adjList.delete(idToDelete);
    }

    deleteEdge(firstId, secondId)
    {
        this._adjList.get(firstId).delete(secondId);
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