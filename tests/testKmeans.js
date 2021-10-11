import * as TOOLS from "../tools";

(async ()=>
{
    // Data source: LinkedIn
    const data = [
        {'company': 'Microsoft' , 'X': 12, 'Y': 68},
        {'company': 'IBM' , 'X': 13, 'Y': 65},
        {'company': 'Yahoo!' , 'X': 55 , 'Y': 15 },
        {'company': 'Skype' , 'X': 14, 'Y': 62},
        {'company': 'SAP' , 'X': 15, 'Y': 66},
        {'company': 'Yahoo!' , 'X': 14 , 'Y': 64 },
        {'company': 'eBay' , 'X': 13, 'Y': 58},
        {'company': 'Microsoft' , 'X': 52, 'Y': 14},
        {'company': 'IBM' , 'X': 53, 'Y': 15},
        {'company': 'Skype' , 'X': 55, 'Y': 18},
        {'company': 'SAP' , 'X': 60, 'Y': 16},
        {'company': 'eBay' , 'X': 51, 'Y': 12},
    ];

// Create the data 2D-array (vectors) describing the data
    let vectors = [];
    for (let i = 0 ; i < data.length ; i++)
    {
        vectors[i] = [ data[i].X , data[i].Y];
    }
    let res = await TOOLS.kmeansPromise(vectors, 2);

    console.log(res);
})();