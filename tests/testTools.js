import ConfusionMatrix from 'ml-confusion-matrix';
import * as TOOLs from "../tools";
import { plot, stack, clear} from 'nodeplotlib';

(async () =>
{
    let confusionMatrix = new ConfusionMatrix([[6, 2], [1, 3]], ["Cat", "Dog"]);
    let res = TOOLs.MCC(confusionMatrix);

    console.log(res);

    const data = [{
        x: [ 1, 3, 4, 6, 7],
        y: [ 2, 4, 6, 8, 9],
        type: 'scatter'
    }];

    stack(data);
    stack(data);
    stack(data);
    plot();
})();