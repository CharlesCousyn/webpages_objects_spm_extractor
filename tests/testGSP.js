import * as TOOLS from "./../tools";

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
    console.log(TOOLS.isSupported(["c", "c", "e"], ["b", "c", "d", "e", "b"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "c"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "r"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "a", "c"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "b"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "a", "c", "e", "b", "c", "a"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes(["b", "a", "c", "e", "b", "c"], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.getIndexesSuffixes([], ["b", "a", "c", "e", "b", "c", "a"]));
    console.log(TOOLS.GSP(database, 0.3));
    console.log(TOOLS.PrefixSpan(database, 0.3, true, true));
})();