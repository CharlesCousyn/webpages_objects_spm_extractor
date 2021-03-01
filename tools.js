import filesSystem from "fs";
import Plot from "@stdlib/plot/ctor";

//File processing
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

//Progress functions
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

//Stats
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

function getMax(arr)
{
    return arr.reduce((max, v) => max >= v ? max : v, -Infinity);
}

function getMin(arr)
{
    return arr.reduce((max, v) => max <= v ? max : v, +Infinity);
}

export function minMaxNorm(array, min, max)
{
    let minArray = getMin(array);
    let maxArray = getMax(array);
    return array.map(val => min +  (max - min) * (val - minArray) / (maxArray - minArray));
}

//Imply using array of same size on the same scale
export function limitsOfAgreement(array1, array2)
{
    //Compute differences between each pair
    let differences = array1.map((dataPoint1, index) => dataPoint1 - array2[index]);

    let hist = createHistFromData(differences, false, "none");
    console.log("hist", hist);

    //View histogram 1
    let plot1 = new Plot(
        {
            x : [hist.map(([x,])=> x)],
            y : [hist.map(([, value])=> value)],
            labels: ["DATA1 - DATA2"],
            xLabel: "Difference",
            yLabel: "Frequency",
            lineStyle: ["none"],
            colors: ["blue"],
            description: "This histogram describes all the possible differences between DATA1 and DATA2",
            title: "This histogram describes all the possible differences between between DATA1 and DATA2",
            symbols: ["closed-circle"],
            width: 1000,
            height: 562,
            xNumTicks: 10,
            yNumTicks: 10,
            renderFormat: "vdom",
            viewer: "browser",
            autoRender: false,
            autoView: false
        });
    plot1.render();
    plot1.view();
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

export function samplePearsonCorrelationCoefficient(data1, data2)
{
    let meanData1 = mean(data1);
    let meanData2 = mean(data2);
    let sdData1 = standardDeviation(data1);
    let sdData2 = standardDeviation(data2);
    let dataMultiplied = data1.map((curr, index) => data1[index] * data2[index]);
    let meanDataMultiplied = mean(dataMultiplied);

    return ( meanDataMultiplied - meanData1 * meanData2) / (sdData1 * sdData2);
}

export function spearmanRankCorrelationCoefficient(data1, data2)
{
    return samplePearsonCorrelationCoefficient(dataToRankData(data1), dataToRankData(data2));
}

export function kendallRankCorrelationCoefficient(data1, data2)
{
    let n = data1.length;

    let sum = 0.0;
    for(let i = 0; i < data1.length; i++)
    {
        for(let j = 0; j < data2.length; j++)
        {
            if(i < j)
            {
                let xi = data1[i];
                let xj = data1[j];
                let yi = data2[i];
                let yj = data2[j];

                sum += Math.sign(xi - xj) * Math.sign(yi - yj);
            }
        }
    }

    return (2 / n * (n - 1)) * sum;
}

//http://www.r-tutor.com/gpu-computing/correlation/kendall-tau-b
export function kendallRankCorrelationCoefficient_B(data1, data2)
{
    let nc = 0;
    let nd = 0;
    let N1 = 0;
    let N2 = 0;
    //Getting nc, nd, N1 and N2
    for(let i = 0; i < data1.length; i++)
    {
        for(let j = 0; j < data2.length; j++)
        {
            if(i < j)
            {
                let xi = data1[i];
                let xj = data1[j];
                let yi = data2[i];
                let yj = data2[j];

                let signMult = Math.sign(xi - xj) * Math.sign(yi - yj);
                if(signMult === 1)
                {
                    nc++;
                    N1++;
                    N2++;
                }
                else if(signMult === 0)
                {
                    if(xi !== xj)
                    {
                        N1++;
                    }
                    if(yi !== yj)
                    {
                        N2++;
                    }
                }
                else
                {
                    nd++;
                    N1++;
                    N2++;
                }
            }
        }
    }

    return (nc - nd) / Math.sqrt(N1 * N2);
}

export function dataToRankData(array)
{
    let noDuplicatesSorted = [...new Set(array)].sort((a, b) => b - a);
    return array.map((val) => noDuplicatesSorted.indexOf(val) + 1);
}

//Bayes
export function createHistFromData(data, cumulative, normalization)
{
    let xMax = getMax(data);
    let xMin = getMin(data);
    let numberOfPins = Math.ceil(Math.sqrt(data.length));
    let width = (xMax - xMin) / numberOfPins;

    //Generate an array of arrays
    let hist = [...Array(numberOfPins).keys()]
    .map(index =>
    {
        let value = data.filter(point =>
        {
            if(index === 0)
            {
                return xMin <= point && point < xMin + width ;
            }
            if(cumulative)
            {
                return point < xMin + width * (index + 1);
            }
            return (xMin + width * index <= point) && (point < xMin + width * (index + 1));
        }).length ;

        if(normalization === "density")
        {
            value = value / (data.length * width);
        }
        else if(normalization === "classic")
        {
            value = value / data.length;
        }
        return [xMin + width * ( 2 * index + 1) / 2, value];
    });

    return hist;
}

function findNearestValueIndex(value, values)
{
    return values
    .reduce((acc, curr, currIndex, arr) =>
    {
        if(Math.abs(curr - value) < Math.abs(arr[acc] - value))
        {
            acc = currIndex;
        }
        return acc;
    }, 0);
}

export function findEstimatedCredibleInterval(credibility, cdfHist, type, trialsIfHDI)
{
    let cdfHistXs = cdfHist.map(([x, ])=> x);
    let cdfHistValues = cdfHist.map(([, value])=> value);

    let inferiorCredibilityBound;
    let superiorCredibilityBound;
    let inferiorVariableBound;
    let superiorVariableBound;
    if(type === "equalTailed")
    {
        inferiorCredibilityBound = (1.0 - credibility) / 2;
        superiorCredibilityBound = 1.0 - inferiorCredibilityBound;

        //Find index of value which is closer to inferiorConfProbBound
        let indexNearestToInferiorLimit = findNearestValueIndex(inferiorCredibilityBound, cdfHist.map(([, value])=> value));

        //Find index of value which is closer to superiorConfProbBound
        let indexNearestToSuperiorLimit = findNearestValueIndex(superiorCredibilityBound, cdfHist.map(([, value])=> value));

        //Find the corresponding values of variable
        inferiorVariableBound = cdfHist.map(([x, ])=> x)[indexNearestToInferiorLimit];
        superiorVariableBound = cdfHist.map(([x, ])=> x)[indexNearestToSuperiorLimit];
    }
    else if(type === "HDI")
    {
        if(Number.isNaN(trialsIfHDI))
        {
            throw new Error("Bad value for parameter trialsIfHDI: must be a number !");
        }
        //Bound initialization
        inferiorVariableBound = -Infinity;
        superiorVariableBound = +Infinity;

        let allInferiorBoundTested = generateArrayOfNumbers(0.0, 1.0 - credibility, trialsIfHDI);
        for(let currInferiorBound of allInferiorBoundTested)
        {
            let currSuperiorBound = credibility + currInferiorBound;

            //Find index of value which is closer to currInferiorBound
            let currIndexNearestToInferiorLimit = findNearestValueIndex(currInferiorBound, cdfHistValues);

            //Find index of value which is closer to currSuperiorBound
            let currIndexNearestToSuperiorLimit = findNearestValueIndex(currSuperiorBound, cdfHistValues);

            //Find the corresponding values of variable
            let currInferiorVariableBound = cdfHistXs[currIndexNearestToInferiorLimit];
            let currSuperiorVariableBound = cdfHistXs[currIndexNearestToSuperiorLimit];

            if(Math.abs(currSuperiorVariableBound - currInferiorVariableBound) < Math.abs(superiorVariableBound - inferiorVariableBound))
            {
                inferiorCredibilityBound = currInferiorBound;
                superiorCredibilityBound = currSuperiorBound;
                inferiorVariableBound = currInferiorVariableBound;
                superiorVariableBound = currSuperiorVariableBound;
            }
        }
    }
    else
    {
        throw new Error("Bad value for type parameter: only 'equalTailed' and 'HDI' are supported !");
    }

    return {
        credibility: credibility,
        type,
        inferiorCredibilityBound,
        superiorCredibilityBound,
        inferiorVariableBound,
        superiorVariableBound,
    };
}

//Format conversion
export function dbToSPMFFormat(db, path)
{
    let dataString = db.map(sequence => sequence.join(" ")).join(". ");
    writeTextFile(dataString, path);
}