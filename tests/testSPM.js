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

(async() =>
{
    console.log(COMMON.horizontalDBToVerticalDB(database));
    console.log(GSP.run(database, 0.3, true, true));
    console.log(PrefixSpan.run(database, 0.3, true, true));
    console.log(VMSP.run(database, 0.3));
})();