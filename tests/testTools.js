import ConfusionMatrix from 'ml-confusion-matrix';
import * as TOOLs from "../tools"

(async () =>
{
    let confusionMatrix = new ConfusionMatrix([[6, 2], [1, 3]], ["Cat", "Dog"]);
    let res = TOOLs.MCC(confusionMatrix);

    console.log(res);
})();