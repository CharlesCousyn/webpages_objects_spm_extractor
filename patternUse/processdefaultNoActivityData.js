import filesSystem from "fs";
import * as TOOLS from "../tools";
import csvStringify from "csv-stringify/lib/sync";
import { plot } from 'nodeplotlib';

let defaultNoActivityData = JSON.parse(filesSystem.readFileSync("C:/Users/Charles/ws-cli_output/defaultData/rfid.json"), TOOLS.reviverDate);

(async () =>
{
    let dataset = [...defaultNoActivityData
        .flatMap(event => event.lst_RFIDPosition)
        .reduce((acc, o) =>
        {
            let val = acc.get(o.TagName);
            if(val)
            {
                acc.set(o.TagName, {Coords: [...val.Coords, o.Coord]});
            }
            else
            {
                acc.set(o.TagName, {Coords: [o.Coord]});
            }
            return acc;
        }, new Map())]
        .map(([ID, val])=>
        {
            val.OMs = [];
            if(val.Coords.length >= 2)
            {
                for(let i = 0; i < val.Coords.length - 1; i++)
                {
                    val.OMs.push({dX: val.Coords[i + 1].X - val.Coords[i].X, dY: val.Coords[i + 1].Y - val.Coords[i].Y});
                }
            }
            else
            {
                val.OMs.push({dX: 0.0, dY: 0.0});
            }
            return [ID, val];
        })
        .map(([ID, val]) =>
        {
            val.distances = val.OMs.map(OM => Math.sqrt(Math.pow(OM.dX, 2) + Math.pow(OM.dY, 2)));
            return [ID, val];
        })
        .map(([ID, val]) =>
        {
            val.distancesDataset = val.distances.map(distance =>  ({distance}));
            return [ID, val];
        });

    console.log(dataset);

    //Generate csv and plot for each object
    dataset.forEach(([TagName, val])=>
        {
            console.log(val);
            const stringPatternData = csvStringify(val.distancesDataset,
                {
                    header: true,
                    columns: ["distance"],
                    cast: {
                        boolean: bool => bool + ""
                    }
                });

            TOOLS.writeTextFile(stringPatternData, `./patternUse/processedDefaultNoActivityData/${TagName}.csv`);

            plot([
                {
                    x: val.distances,
                    name: TagName,
                    type: "histogram"
                }],
                {
                    title: `PDF of ${TagName} distance`,
                    showlegend: true,
                    xaxis:{title: "distance"}
                }
                );
        }
    );


})();