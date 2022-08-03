import * as TOOLS from "../tools";
import ConfusionMatrix from 'ml-confusion-matrix';



let labels = [
        "clean",
        "vacuum",
        "make_tea",
        "noActivity",
        "cook_pasta",
        "make_coffee"
    ];
let dtat= [[351,0,0,51,0,0],[0,1209,0,0,0,0],[0,0,1069,0,0,16],[0,0,0,112,0,0],[141,0,0,141,628,0],[0,0,0,111,0,1317]];

let conf = new ConfusionMatrix(dtat, labels);

let newTab = labels.map(label => [label, conf.getPositivePredictiveValue(label), conf.getTruePositiveRate(label), conf.getF1Score(label)]);

newTab = [["Activité", "Précision", "Rappel", "F-Score"], ...newTab]

console.log(newTab);