import POSET from "../entities/POSET.js";
import NumPOSET from "../entities/NumPOSET";

(async ()=>
{
    let pos1 = new POSET(["water", "pan", "spoon", "cup", "mug"]);

    pos1.setMatValue("water", "pan", true);
    pos1.setMatValue("pan", "spoon", true);
    pos1.setMatValue("pan", "cup", true);
    pos1.setMatValue("pan", "mug", true);

    pos1.printMatrix();

    let pos2 = new NumPOSET(["water", "pan", "spoon", "cup", "mug"]);

    pos2.setMatValue("water", "pan", 4);
    pos2.setMatValue("pan", "spoon", 5);
    pos2.setMatValue("pan", "cup", 7);
    pos2.setMatValue("pan", "mug", 10);

    pos2.printMatrix();

    pos2.deleteId("water");
    pos2.printMatrix();

    pos2.addId("water");
    pos2.printMatrix();
})()