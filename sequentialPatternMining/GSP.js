import * as TOOLS from "../tools";
import * as COMMON from "./common";

//GSP implementation with the hypothesis of having a database only containing sequences of 1-itemSets
export function run(database, minSupport, closedMention, maximalMention, boolLog)
{
    if(boolLog)
    {
        console.log(`GSP: Getting sequential patterns with min support ${minSupport}...`);
    }
    //Get length DB
    let dbLength = database.length;
    if(dbLength === 0)
    {
        return;
    }

    //Compute 1-sequences
    let uniqueItems = [...new Set(database.flat())];

    //Find frequent 1-sequences
    let freqItemSetsLevelOne = uniqueItems.reduce((acc, currItem) => {
        //Count the freq of each item
        let supp = 0.0;
        database.forEach(transaction =>
        {
            if(COMMON.isSupported([currItem], transaction))
            {
                supp += 1.0;
            }
        });
        supp = supp / dbLength;

        //Only keep itemSets with sufficient support
        if(supp >= minSupport)
        {
            acc.set([currItem], supp);
        }

        return acc;
    }, new Map());

    let freqItemSetsFixedLevel = freqItemSetsLevelOne;
    //Initiate return value
    let allFrequentItemSets = freqItemSetsLevelOne;
    //Loop until no more freq item set found
    while(freqItemSetsFixedLevel.size !== 0)
    {
        //Generate candidate sets of one level higher
        let candidateSets = new Map();
        for(let [orderedItems1, ] of freqItemSetsFixedLevel)
        {
            for(let [orderedItems2, ] of freqItemSetsFixedLevel)
            {
                let arr1 = orderedItems1.slice(1);
                let arr2 = orderedItems2.slice(0, orderedItems2.length - 1);
                //Merge if compatible: Merging [a, b], with [b, c] give [a, b, c]
                if(TOOLS.arraysMatch(arr1, arr2))
                {
                    candidateSets.set([...orderedItems1, orderedItems2[orderedItems2.length - 1]], 0.0);
                }
            }
        }

        //Increment count support
        for(let trans of database)
        {
            for(let [orderedItems, countSupp] of candidateSets)
            {
                //Increment count if trans support candidateSet
                if(COMMON.isSupported(orderedItems, trans))
                {
                    candidateSets.set(orderedItems, countSupp + 1.0 );
                }
            }
        }

        //Compute supp
        for(let [orderedItems, countSupp] of candidateSets)
        {
            //Divide by dbLength
            candidateSets.set(orderedItems, countSupp / dbLength);
        }

        //Only keep itemSets with sufficient support
        for (let [orderedItems, supp] of candidateSets)
        {
            if (supp < minSupport)
            {
                candidateSets.delete(orderedItems);
            }
        }

        freqItemSetsFixedLevel = candidateSets;

        //Add all freqItemSetsFixedLevel to allFrequentItemSets
        allFrequentItemSets = new Map([...allFrequentItemSets, ...freqItemSetsFixedLevel]);
    }

    if(boolLog)
    {
        console.log(`${allFrequentItemSets.size} sequential patterns found!`);
    }
    return COMMON.handleClosedAndMaximalPat(allFrequentItemSets, closedMention, maximalMention);
}