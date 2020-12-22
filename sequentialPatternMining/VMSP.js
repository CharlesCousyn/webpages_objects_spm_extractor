import * as COMMON from "./../sequentialPatternMining/common";

function temporalJoin([pat1, idList1, support1], [pat2, idList2, support2], fullDBLength)
{
    let [newPat, newIdList] = [[...pat1, pat2[pat2.length - 1]], idList2.filter(([sid2, eid2]) => idList1.some(([sid1, eid1]) => sid1 === sid2 && eid2 > eid1))];

    return [newPat, newIdList, (new Set(newIdList.map(([sid, eid])=> sid))).size / fullDBLength];
}

function addPatternWithStrategies([pattern, support], Z, maximalNotClosed)
{
    //Forward-Maximal Extension checking (FME)
    //Efficient Filtering of Non-maximal patterns (EFN)

    //Super pattern checking strategy: is pattern maximal until now?
    let maximalUntilNow = true;
    for(let [patternZ, supportZ] of Z)
    {
        if (patternZ.length > pattern.length && (maximalNotClosed ? support >= supportZ : support === supportZ) && COMMON.isSupported(pattern, patternZ))
        {
            maximalUntilNow = false;
            break;
        }
    }

    //If yes, we insert it
    if(maximalUntilNow)
    {
        Z.push([pattern, support]);

        //Sub pattern checking strategy
        let patternsToRemove = [];
        for(let [patternZ, supportZ] of Z)
        {
            if(pattern.length > patternZ.length && (maximalNotClosed ? supportZ >= support : supportZ === support) && COMMON.isSupported(patternZ, pattern))
            {
                patternsToRemove.push(patternZ);
            }
        }

        //Delete all sub patterns included in pattern
        for(let pat of patternsToRemove)
        {
            let index = Z.map(([patternZ, supportZ]) => patternZ).indexOf(pat);
            if(index > -1)
            {
                Z.splice(index, 1);
            }
        }
    }
}

function search([pattern, idList, support], freqItems, minSupport, fullDBLength, Z, maximalNotClosed)
{
    //Update Z
    addPatternWithStrategies([pattern, support], Z, maximalNotClosed);

    //Init STemp
    let STemp = [];
    for(let [pat, idListPat, supportPat] of freqItems)
    {
        //Compute S-Extension
        let [newPat, newIdList, newSupport] = temporalJoin([pattern, idList, support], [pat, idListPat, supportPat], fullDBLength);
        if(newSupport >= minSupport)
        {
            STemp.push([newPat, newIdList, newSupport]);
        }
    }

    //For all new frequent patterns
    for(let [pat, idListPat, supportPat] of STemp)
    {
        search(
            [pat, idListPat, supportPat],
            STemp,
            minSupport,
            fullDBLength,
            Z,
            maximalNotClosed);
    }

}

//VMSP implementation with the hypothesis of having a database only containing sequences of 1-itemSets
//Implementation of VMSP with partial EFN (With sub and sup checking but with Size check optimization and Support check optimization but not Sum of items optimization)
//Without Forward-Maximal Extension checking (FME)
//Without Candidate Pruning with Co-occurrence map (CPC)
//Can find closedPattern instead of maximal patterns
export function run(db, minSupport, maximalNotClosed)
{
    console.log(`VMSP: Getting ${maximalNotClosed ? "maximal" : "closed"} sequential patterns with minSupport ${minSupport}...`);
    //Get length DB
    let fullDBLength = db.length;
    if(fullDBLength === 0)
    {
        return;
    }

    //Init list of maximal patterns
    let Z = [];

    //Converting to vertical DB
    let verticalDB = COMMON.horizontalDBToVerticalDB(db);

    //Find frequent items
    let freqItems = [];
    for(let [pat, listId, support] of verticalDB)
    {
        if(support >= minSupport)
        {
            freqItems.push([pat, listId, support]);
        }
    }

    for(let [pat, listId, support] of freqItems)
    {
        search([pat, listId, support], freqItems, minSupport, fullDBLength, Z, maximalNotClosed);
    }

    console.log(`${Z.length} ${maximalNotClosed ? "maximal" : "closed"} patterns found!`);
    return new Map(Z);
}
