import * as TOOLS from "./../tools";

let database = [
    ["a", "b", "c", "a"],
    ["b", "c", "d", "e", "b"],
    ["a", "b", "e"],
    ["b", "c", "e"]
];

(async() =>
{
    console.log(TOOLS.isSupported(["c", "c", "e"], ["b", "c", "d", "e", "b"]));
    console.log(TOOLS.GSP(database, 0.26));
})();