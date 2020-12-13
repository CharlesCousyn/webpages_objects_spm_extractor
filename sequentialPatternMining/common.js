import * as GSP from "./GSP";

export function isSupported(orderedElements, sequence)
{
    let minIndex = -1;
    for(let el of orderedElements)
    {
        //Find all indexes of one element
        let indexesEl = sequence.reduce((a, e, i) => {
            if (e === el)
            {
                a.push(i);
            }
            return a;
        }, []);

        //If el does not exist or if the el is not after minIndex
        if(indexesEl.length === 0 || !indexesEl.some(index => index > minIndex))
        {
            return false;
        }
        else
        {
            let newMinIndex = indexesEl.filter(index => index > minIndex)[0];
            //Update minIndex with at least 1
            if(minIndex === newMinIndex)
            {
                minIndex++;
            }
            else
            {
                minIndex = newMinIndex;
            }
        }
    }
    return true;
}

function isClosed(pat1, freq1, mapOfSeqPatterns)
{
    return ![...mapOfSeqPatterns]
        .some(([pat2, freq2]) => freq1 === freq2 && pat2.length > pat1.length && isSupported(pat1, pat2));
}

function isMaximal(pat1, freq1, mapOfSeqPatterns)
{
    return ![...mapOfSeqPatterns]
        .filter(([, [, closed]]) => closed)
        .some(([pat2, [, ]]) => pat2.length > pat1.length && isSupported(pat1, pat2));
}

export function getIndexesSuffixes(orderedElements, sequence, suffixIndex)
{
    let minIndex = -1;
    let lastIndexes = [];
    for(let el of orderedElements)
    {
        //Find all indexes of one element
        let indexesEl = sequence.reduce((a, e, i) => {
            if (e === el)
            {
                a.push(i);
            }
            return a;
        }, []);

        //If el does not exist or if the el is not after minIndex
        if(indexesEl.length === 0 || !indexesEl.some(index => index > minIndex))
        {
            return [-1];
        }
        else
        {
            let newMinIndex = indexesEl.filter(index => index > minIndex)[0];
            //Update minIndex with at least 1
            if(minIndex === newMinIndex)
            {
                minIndex++;
            }
            else
            {
                minIndex = newMinIndex;
            }

            lastIndexes = indexesEl.filter(index => index >= minIndex);
            let i = 0;
        }
    }

    if(suffixIndex)
    {
        return lastIndexes.map(i => i+1);
    }
    return lastIndexes;
}

export function handleClosedAndMaximalPat(mapOfSeqPatterns, closedMention, maximalMention)
{
    if(closedMention)
    {
        console.log("Finding closed sequential patterns...");
        mapOfSeqPatterns = new Map(
            [...mapOfSeqPatterns]
                .map(([pat, freq]) => [pat, [freq, isClosed(pat, freq, mapOfSeqPatterns)]])
        );
        console.log(`${[...mapOfSeqPatterns].filter(([pat, [freq, closed]]) => closed).length} closed patterns found!`);
        if(maximalMention)
        {
            console.log("Finding maximal sequential patterns...");
            mapOfSeqPatterns = new Map(
                [...mapOfSeqPatterns]
                    .map(([pat, [freq, closed]]) => [pat, [freq, closed, isMaximal(pat, freq, mapOfSeqPatterns)]])
            );
            console.log(`${[...mapOfSeqPatterns].filter(([pat, [freq, closed, maximal]]) => maximal).length} maximal patterns found!`);
        }
    }

    return mapOfSeqPatterns;
}

export function horizontalDBToVerticalDB(db)
{
    //Adding an id
    let mapHorizDb = new Map(db.map((sequence, index) => [index, sequence]));

    //Finding unique items
    let uniqueItems = [...new Set(db.flat())];

    //Constructing one DB by unique item
    //Store each DB in a map
    //return a big map
    return uniqueItems
        .map(item =>
            [[item], [...mapHorizDb]
                .flatMap(([id, sequence])=>
                    getIndexesSuffixes([item], sequence, false)
                        .map(idres => idres !== -1 ? [id, idres] : [])
                        .filter(arr => arr.length !== 0))])
        .map(([pat, idList]) => [pat, idList, (new Set(idList.map(([sid, eid])=> sid))).size / db.length]);
}

export function recoverAllSeqPatsFromMaximalPats(maximalPatterns)
{
    class ArraySet extends Set {
        add(arr) {
            super.add(JSON.stringify(arr));
        }
        has(arr) {
            return super.has(JSON.stringify(arr));
        }
    }

    let allPatterns = new ArraySet();
    //Using GSP to find all patterns for each max pattern
    for(let maxPat of maximalPatterns)
    {
        let patternsWithSupp = GSP.run([maxPat], 1.0, false, false, false);
        patternsWithSupp.forEach((support, pat)=>
        {
            allPatterns.add(pat);
        });
    }

    //From a set of string array to array of array
    allPatterns = [...allPatterns].map(stringArr => JSON.parse(stringArr));

    return allPatterns;
}

export function getSupportPatternsFromDB(db, arrayPatterns)
{
    let patternsWithSupp = arrayPatterns.map(pat => [pat, 0.0]);
    for(let sequence of db)
    {
        patternsWithSupp = patternsWithSupp.map(([pat, sup]) =>
        {
            console.log(isSupported(pat, sequence))
            if(isSupported(pat, sequence))
            {
                sup += 1.0 / db.length;
            }
            return [pat, sup];
        });
    }
    return new Map(patternsWithSupp);
}
