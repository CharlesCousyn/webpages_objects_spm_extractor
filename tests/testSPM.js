import * as GSP from "./../sequentialPatternMining/GSP";
import * as PrefixSpan from "./../sequentialPatternMining/PrefixSpan";
import * as VMSP from "./../sequentialPatternMining/VMSP";
import * as COMMON from "./../sequentialPatternMining/common";

let database = [
    ["a", "b", "c", "a"],
    ["b", "c", "d", "e", "b"],
    ["a", "b", "e"],
    ["b", "c", "e"],
    ["b", "c", "e", "d"],
    ["a", "b", "e", "v"],
    ["b", "a", "c", "e", "b", "c", "a"]
];
let database2 = [
    ["a", "b", "c", "f"],
    ["a", "d", "c", "b", "b"],
    ["a", "b", "e"],
    ["b", "c", "e", "t"],
    ["o", "b", "y", "v"]
];
let database3 = [
    ["a", "b", "c", "f"]
];


(async() =>
{
    console.log(COMMON.horizontalDBToVerticalDB(database));
    console.log(GSP.run(database, 0.3, true, true, true));
    console.log(PrefixSpan.run(database, 0.3, true, true));
    console.log(VMSP.run(database, 0.3));

    console.log(COMMON.horizontalDBToVerticalDB(database2));
    console.log(GSP.run(database2, 0.3, true, true, true));
    console.log(PrefixSpan.run(database2, 0.3, true, true));
    console.log(VMSP.run(database2, 0.3));

    let allPats = COMMON.recoverAllSeqPatsFromMaximalPats(database3);
    console.log(allPats);
    console.log(COMMON.getSupportPatternsFromDB(database2, allPats));
})();