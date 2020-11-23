import POSET from "../entities/POSET.js";
import NumPOSET from "../entities/NumPOSET";
import GraphAdjList from "../entities/GraphAdjList";

(async ()=>
{
    let pos1 = new POSET(["water", "pan", "spoon", "cup", "mug"]);

    pos1.setMatValue("water", "pan", true);
    pos1.setMatValue("pan", "spoon", true);
    pos1.setMatValue("pan", "cup", true);
    pos1.setMatValue("pan", "mug", true);

    pos1.print();

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

    let graphAdjList1 = new GraphAdjList();

    graphAdjList1.addNode("mug", 0, true);

    graphAdjList1.printAdjList();
    graphAdjList1.addNode("fork", 0, true);

    graphAdjList1.printAdjList();
    graphAdjList1.addNode("spoon", 0, true);

    graphAdjList1.printAdjList();

    graphAdjList1.deleteNode("spoon");
    console.log(graphAdjList1.adjList.get("fork"));

    graphAdjList1.printAdjList();

    graphAdjList1.addWeightToAnEdge("mug", "fork", 12, true);

    graphAdjList1.printAdjList();

    graphAdjList1.addWeightToAnEdge("fork", "spoon", 42, true);

    graphAdjList1.printAdjList();

    graphAdjList1.deleteEdge("mug", "fork");

    graphAdjList1.printAdjList();

    graphAdjList1.addWeightToANode("mug", 68, true);

    graphAdjList1.printAdjList();

    graphAdjList1.addWeightToANode("fork", 15, true);

    graphAdjList1.printAdjList();

    graphAdjList1.addWeightToAnEdge("mug", "fork", 42, true);

    graphAdjList1.printAdjList();

    graphAdjList1.deleteEdge("fork", "mug");

    graphAdjList1.printAdjList();

    console.log(graphAdjList1.adjList.get("fork"));


})()