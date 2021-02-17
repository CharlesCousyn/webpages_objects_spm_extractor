import filesSystem from "fs";

export function writeJSONFile(data, path, isIndent)
{
    let string = "";
    if(isIndent)
    {
        string = JSON.stringify(data, null, 4);
    }
    else
    {
        string = JSON.stringify(data);
    }
    filesSystem.writeFileSync(path, string, "utf8");
}

export function writeTextFile(data, path)
{
    filesSystem.writeFileSync(path, data, {encoding:"utf8"});
}

export function readTextFile(path)
{
    return filesSystem.readFileSync(path, 'utf8');
}

export function timeConversion(ms)
{
    let seconds = (ms / 1000).toFixed(1);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

    if (seconds < 60) {
        return seconds + " Sec";
    } else if (minutes < 60) {
        return minutes + " Min";
    } else if (hours < 24) {
        return hours + " Hrs";
    } else {
        return days + " Days"
    }
}

export function showProgress(currentNumberOfResults, totalNumberOfResults, beginTime)
{
    const timeElapsed = timeConversion(new Date() - beginTime);
    console.log(`Progress ${currentNumberOfResults}/${totalNumberOfResults} (${100.0 * currentNumberOfResults/totalNumberOfResults} %) (${timeElapsed} elapsed)`);
}

export function mean(array)
{
    return array.reduce((acc, curr) =>
    {
        acc+= curr;
        return acc;
    }, 0.0)/array.length;
}

export function standardDeviation(array)
{
    let avg = mean(array);
    let n = array.length;
    return Math.sqrt(array.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / n);
}

export function cov(array1, array2)
{
    let avg1 = mean(array1);
    let avg2 = mean (array2);
    let N = array1.length + 1;
    return Math.sqrt(array.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / n);
}

export function arraysMatch (arr1, arr2)
{
    // Check if the arrays are the same length
    if (arr1.length !== arr2.length)
    {
        return false;
    }

    // Check if all items exist and are in the same order
    for (let i = 0; i < arr1.length; i++)
    {
        if (arr1[i] !== arr2[i])
        {
            return false;
        }
    }

    // Otherwise, return true
    return true;
}

export function dbToSPMFFormat(db, path)
{
    let dataString = db.map(sequence => sequence.join(" ")).join(". ");
    writeTextFile(dataString, path);
}