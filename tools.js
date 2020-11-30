import filesSystem from "fs";
import {JSDOM} from "jsdom";

export function writeJSONFile(data, path, isIndent)
{
    let string = "";
    if(isIndent)
    {
        string = JSON.stringify(data, null, 4);
    }
    else
    {
        string = JSON.stringify(data);
    }
    filesSystem.writeFileSync(path, string, "utf8");
}

export function writeTextFile(data, path)
{
    filesSystem.writeFileSync(path, data, {encoding:"utf8"});
}

export function readTextFile(path)
{
    return filesSystem.readFileSync(path, 'utf8');
}

export function timeConversion(ms)
{
    let seconds = (ms / 1000).toFixed(1);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

    if (seconds < 60) {
        return seconds + " Sec";
    } else if (minutes < 60) {
        return minutes + " Min";
    } else if (hours < 24) {
        return hours + " Hrs";
    } else {
        return days + " Days"
    }
}

export function showProgress(currentNumberOfResults, totalNumberOfResults, beginTime)
{
    const timeElapsed = timeConversion(new Date() - beginTime);
    console.log(`Progress ${currentNumberOfResults}/${totalNumberOfResults} (${100.0 * currentNumberOfResults/totalNumberOfResults} %) (${timeElapsed} elapsed)`);
}

export function prepareActivityResultToJSON(activityResult)
{
    activityResult.graphAdjList = [...activityResult.graphAdjList];
    //activityResult.graphAdjList.adjList = activityResult.graphAdjList.adjList.map(([id, [occurences, neighbors]]) => [id, [occurences, [...neighbors]]]);
    return activityResult;
}

export async function extractPlans(path)
{
    let selectorPlansHTML = "div.steps.sticky:not(.sample)";
    let selectorStepsHTML = "[id^=step-id-] .step b";
    let document = (await JSDOM.fromFile(path)).window.document;

    //Extract all plans with all steps for each plan
    let plans = [];
    let plansHTML = document.querySelectorAll(selectorPlansHTML);

    plansHTML.forEach(planHTML =>
    {
        let steps = [];
        let stepsHTML = planHTML.querySelectorAll(selectorStepsHTML);

        stepsHTML.forEach(stepHTML =>
        {
            //stepHTML.querySelectorAll('*').forEach(n => n.remove());
            steps.push(stepHTML.textContent);
        });
        plans.push(steps);
    });


    //Check if it's multiple plans or multiple parts
    if(plansHTML.length > 1)
    {
        let discriminatingEl = plansHTML[0].querySelector("h3 > div > div");
        discriminatingEl.querySelectorAll('*').forEach(n => n.remove());
        let typeOfContent= discriminatingEl.textContent;
        //Only one plan
        if(typeOfContent.startsWith("Part"))
        {
            plans = [plans.flat()];
        }
    }

    return plans;
}

export function GSP(database, minSupport)
{
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
        let countItem = 0.0;
        database.forEach(transaction =>
        {
            if(isSupported([currItem], transaction))
            {
                countItem += (1 / dbLength);
            }
        });

        //Only keep itemSets with sufficient support
        if(countItem >= minSupport)
        {
            acc.set([currItem], countItem);
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
                if(arraysMatch(arr1, arr2))
                {
                    candidateSets.set([...orderedItems1, orderedItems2[orderedItems2.length - 1]], 0.0);
                }
            }
        }

        //Increment counts
        for(let trans of database)
        {
            for(let [orderedItems, count] of candidateSets)
            {
                //Increment count if trans support candidateSet
                if(isSupported(orderedItems, trans))
                {
                    candidateSets.set(orderedItems, count + (1 / dbLength));
                }
            }
        }

        //Only keep itemSets with sufficient support
        for (let [orderedItems, count] of candidateSets)
        {
            if (count < minSupport)
            {
                candidateSets.delete(orderedItems);
            }
        }

        freqItemSetsFixedLevel = candidateSets;

        //Add all freqItemSetsFixedLevel to allFrequentItemSets
        allFrequentItemSets = new Map([...allFrequentItemSets, ...freqItemSetsFixedLevel]);
    }

    return allFrequentItemSets;
}

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

export function arraysMatch (arr1, arr2)
{
    // Check if the arrays are the same length
    if (arr1.length !== arr2.length)
    {
        return false;
    }

    // Check if all items exist and are in the same order
    for (let i = 0; i < arr1.length; i++)
    {
        if (arr1[i] !== arr2[i])
        {
            return false;
        }
    }

    // Otherwise, return true
    return true;
}

export function getIndexesSuffixes(orderedElements, sequence)
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
    return lastIndexes.map(i => i+1);
}

function PrefixSpanRecurs(database, minSupport, sequentialPattern, length, fullDBLength)
{
    //Scan DB to find set of frequent items
    //Compute 1-sequences
    let uniqueItems = [...new Set(database.flat())];

    //Find unique 1-sequences: give a map of form[ ["a"]: 0.3, ["b"]:0.4, ...]
    let oneSizedItemSetsWithSupp = uniqueItems.reduce((acc, currItem) => {
        //Count the freq of each item
        let countItem = 0.0;
        database.forEach(sequence =>
        {
            if(sequence.includes(currItem))
            {
                countItem += (1 / fullDBLength);
            }
        });

        //Only keep itemSets with sufficient support
        if(countItem >= minSupport)
        {
            acc.set([currItem], countItem);
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
                pseudoProjMap.set(oneSizedItemSet, getIndexesSuffixes(oneSizedItemSet, dataSequence));
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

export function PrefixSpan(database, minSupport, closedMention, maximalMention)
{
    //Get length DB
    let fullDBLength = database.length;
    if(fullDBLength === 0)
    {
        return;
    }
    let mapOfSeqPatterns = PrefixSpanRecurs(database, minSupport, [], 0, fullDBLength);

    if(closedMention)
    {
        mapOfSeqPatterns = new Map(
            [...mapOfSeqPatterns]
            .map(([pat, freq]) => [pat, [freq, isClosed(pat, freq, mapOfSeqPatterns)]])
        );
        if(maximalMention)
        {
            mapOfSeqPatterns = new Map(
                [...mapOfSeqPatterns]
                .map(([pat, [freq, closed]]) => [pat, [freq, closed, isMaximal(pat, freq, mapOfSeqPatterns)]])
            );
        }
    }

    return mapOfSeqPatterns;
}