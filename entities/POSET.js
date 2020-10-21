export default class POSET
{
    //elementsIds --- array of ids ["cup", "mug", ...]
    //matrix -- squared array of array of booleans [[true, false, true], [true, false, true],[true, false, true]]
    constructor(elementsIds, matrix)
    {
        //Check duplicates
        if(new Set(elementsIds).size !== elementsIds.length )
        {
            throw new Error("Impossible input, duplicates in elementsIds");
        }

        this._elementsIds = elementsIds;

        //Check bad dimensions
        if(matrix !== undefined && (elementsIds.length * elementsIds.length !== matrix.map(el => el.length).reduce((acc, curr) => acc + curr, 0)))
        {
            throw new Error("Impossible input, please check elements and matrix sizes");
        }

        //Check if matrix is defined in constructor
        if(matrix === undefined)
        {
            this._matrix = this.getInitMatFromElements();
        }
        else
        {
            this._matrix = matrix;
        }
    }

    //id1 > id2
    setMatValue(id1, id2, val)
    {
        //Check if ids exists
        let indexId1 = this._elementsIds.indexOf(id1);
        let indexId2 = this._elementsIds.indexOf(id2);
        if(indexId1 === -1 || indexId2 === -1)
        {
            throw new Error("One of ids doesn't exist!");
        }

        //Check if ids identical
        if(id1 === id2)
        {
            throw new Error("Cannot update diagonal of matrix");
        }

        //Check if val is boolean
        if (typeof val !== "boolean")
        {
            throw new Error("The value is not a boolean!");
        }

        this._matrix[indexId1][indexId2] = val;
    }

    addId()
    {

    }

    getInitMatFromElements()
    {
        return this._elementsIds
            .map((line, indexLine) => this._elementsIds
                .map((column, indexColumn) =>
                {
                    if(indexLine === indexColumn)
                    {
                        return null;
                    }
                    return false;
                }));
    }

    getNumberElementsMat()
    {
        return this._matrix
            .map(el => el.length)
            .reduce((acc, curr) => acc + curr, 0)
    }

    print()
    {
        let tableToPrint = [];
        //Adding column names
        tableToPrint.push([null, ...this._elementsIds]);


        tableToPrint = [...tableToPrint, ...(this._matrix.map((el, index) => [this._elementsIds[index], ...el]))];

        console.table(tableToPrint);
    }

    //Getters and setters

    set elementsIds(elementsIds)
    {
        this._elementsIds = elementsIds;
    }

    set matrix(matrix)
    {
        this._matrix = matrix;
    }

    get elementsIds()
    {
        return this._elementsIds;
    }

    get matrix()
    {
        return this._matrix;
    }


}