import * as COMMON from "./../sequentialPatternMining/common";

function PrefixSpanRecurs(database, minSupport, sequentialPattern, length, fullDBLength)
{
    //Scan DB to find set of frequent items
    //Compute 1-sequences
    let uniqueItems = [...new Set(database.flat())];

    //Find unique 1-sequences: give a map of form[ ["a"]: 0.3, ["b"]:0.4, ...]
    let oneSizedItemSetsWithSupp = uniqueItems.reduce((acc, currItem) => {
        //Count the freq of each item
        let supp = 0.0;
        database.forEach(sequence =>
        {
            if(sequence.includes(currItem))
            {
                supp += 1.0;
            }
        });
        supp = supp / fullDBLength;

        //Only keep itemSets with sufficient support
        if(supp >= minSupport)
        {
            acc.set([currItem], supp);
        }
        return acc;
    }, new Map());
    let oneSizedItemSets = Array.from(oneSizedItemSetsWithSupp.keys());

    //If no frequent itemSets
    if(oneSizedItemSetsWithSupp.size === 0)
    {
        return new Map();
    }
    else
    {
        //Init projection map
        let databaseWithProj = new Map(database.map(dataSequence => [dataSequence, new Map()]));
        //Adding pseudo projection to database
        for(let [dataSequence, pseudoProjMap] of databaseWithProj)
        {
            for(let oneSizedItemSet of oneSizedItemSets)
            {
                pseudoProjMap.set(oneSizedItemSet, COMMON.getIndexesSuffixes(oneSizedItemSet, dataSequence, true));
            }
        }

        //Built new seq patterns: [] + ["a"]
        let newPatterns = oneSizedItemSets.map( item => [...sequentialPattern, ...item]);

        //Create a Map of databases, key: prefix, value: db
        let allNewDBs = new Map();
        for(let i = 0; i < newPatterns.length; i++)
        {
            let db = [...databaseWithProj]
                //Only keep the sequence when the suffix is empty or not containing -1
                .filter(([, pseudoProjMap]) => pseudoProjMap.get(oneSizedItemSets[i]).length === 0 || pseudoProjMap.get(oneSizedItemSets[i])[0] !== -1)
                //Use indexes to extract suffixes
                .flatMap(([dataSeq, pseudoProjMap]) =>
                    pseudoProjMap.get(oneSizedItemSets[i])
                        .map(index => dataSeq.filter((item, i) => i >= index))
                        .filter((val, index) => index === 0));

            allNewDBs.set(newPatterns[i], db);
        }

        //Create map with freq patterns detected
        let mapPattern = new Map();
        oneSizedItemSetsWithSupp.forEach((value, key) =>
        {
            mapPattern.set([...sequentialPattern, ...key], value);
        });

        //Create a big map with all future patterns detected
        let bigMap = new Map();
        for(let [pat, db] of allNewDBs)
        {
            bigMap = new Map([...bigMap, ...PrefixSpanRecurs(db, minSupport, pat, length + 1, fullDBLength)])
        }

        //Return the fusion of this 2 maps
        return new Map([...mapPattern, ...bigMap]);
    }
}

export function run(database, minSupport, closedMention, maximalMention)
{
    console.log(`PrefixSpan: Getting sequential patterns with minSupport ${minSupport}...`);
    //Get length DB
    let fullDBLength = database.length;
    if(fullDBLength === 0)
    {
        return;
    }
    let mapOfSeqPatterns = PrefixSpanRecurs(database, minSupport, [], 0, fullDBLength);

    console.log(`${mapOfSeqPatterns.size} sequential patterns found!`);
    return COMMON.handleClosedAndMaximalPat(mapOfSeqPatterns, closedMention, maximalMention);
}