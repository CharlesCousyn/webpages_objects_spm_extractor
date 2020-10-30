export default class NumPOSET
{
    //elementsIds --- array of ids ["cup", "mug", ...]
    //matrix -- squared array of array of numbers [[1, 0, 4], [1, 0, 5],[5, 0, 4]]
    constructor(elementsIds, matrix, matrixNorm)
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

        //Check if matrixNorm is defined in constructor
        if(matrixNorm === undefined)
        {
            this._matrixNorm = this.getInitMatFromElements();
        }
        else
        {
            this._matrixNorm = matrix;
        }
    }

    addId(id)
    {
        //Check if id exists
        let indexId = this._elementsIds.indexOf(id);
        if(indexId !== -1)
        {
            throw new Error("The id already exists!");
        }

        //Adding the id
        this._elementsIds.push(id);

        //Adding the corresponding line and column
        this._matrix = this._matrix.map(line => [...line, 0]);
        this._matrix.push( [...(new Array(this._matrix.length).fill(0)), null]);
    }

    deleteId(idToDelete)
    {
        //Check if id exists
        let indexId = this._elementsIds.indexOf(idToDelete);
        if(indexId === -1)
        {
            throw new Error("The id doesn't exist!");
        }

        //Deleting the id
        this._elementsIds = this._elementsIds.filter(id => id !== idToDelete);

        //Deleting the corresponding line and column
        this._matrix = this._matrix.filter((line, index) => index !== indexId);
        console.log("indexId: ", indexId);
        this._matrix = this._matrix
            .map(line =>
            {
                line.splice(indexId, 1);
                return line;
            });
    }

    checkIdExist(id)
    {
        return this._elementsIds.indexOf(id) !== -1;
    }

    //id1 > id2
    setMatValue(id1, id2, val)
    {
        let [indexId1, indexId2] = this.checkMatValueInputs(id1, id2, val);
        this._matrix[indexId1][indexId2] = val;
    }

    addMatValue(id1, id2, val)
    {
        let [indexId1, indexId2] = this.checkMatValueInputs(id1, id2, val);
        this._matrix[indexId1][indexId2] += val;
    }

    checkMatValueInputs(id1, id2, val)
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

        //Check if val is number
        if (typeof val !== "number")
        {
            throw new Error("The value is not a number!");
        }

        return [indexId1, indexId2];
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
                    return 0;
                }));
    }

    getNumberElementsMat()
    {
        return this._matrix
            .map(el => el.length)
            .reduce((acc, curr) => acc + curr, 0)
    }

    printMatrix()
    {
        let tableToPrint = [];
        //Adding column names
        tableToPrint.push([null, ...this._elementsIds]);


        tableToPrint = [...tableToPrint, ...(this._matrix.map((el, index) => [this._elementsIds[index], ...el]))];

        console.table(tableToPrint);
    }
    printMatrixNorm()
    {
        let tableToPrint = [];
        //Adding column names
        tableToPrint.push([null, ...this._elementsIds]);

        tableToPrint = [...tableToPrint, ...(this._matrixNorm.map((el, index) => [this._elementsIds[index], ...el]))];

        console.table(tableToPrint);
    }


    normalize(newMin, newMax)
    {
        let flatMat = this._matrix.flat();
        let min = Math.min(...flatMat);
        let max = Math.max(...flatMat);
        if(min === max)
        {
            this._matrixNorm = this._matrix.map(line => [...line]);//Deep copy of the matrix
        }
        else
        {
            this._matrixNorm = this._matrix.map(line =>
                line.map(val =>
                {
                    if(val === null)
                    {
                        return null;
                    }
                    return newMin + (val - min) * (newMax - newMin) / (max - min);
                }));
        }
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