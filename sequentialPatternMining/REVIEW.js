import * as TOOLS from "../tools";
import * as COMMON from "./common";

function sumValuesArray(arr)
{
	return arr.reduce((acc, curr) => acc + curr, 0.0);
}

function mean(allValues)
{
	return sumValuesArray(allValues) / allValues.length;
}

function standardDeviation(allValues, mean)
{
	return Math.sqrt(sumValuesArray(allValues.map(val => Math.pow(val - mean, 2))) / allValues.length);
}

function standardisation(value, mean, standardDeviation)
{
	return (value - mean) / standardDeviation;
}

function condSupp(sequence, item)
{
	return 0.0;
}

function inverseCondSupp(sequence, item)
{
	return 0.0;
}

function f_S(sequence, uniqueItems)
{
	let res = new Map();
	for(let item of uniqueItems)
	{
		res.set(item, condSupp(sequence, item));
	}
	return res;
}

function f_barre_S(sequence, uniqueItems)
{
	let res = new Map();
	for(let item of uniqueItems)
	{
		res.set(item, inverseCondSupp(sequence, item));
	}
	return res;
}

function Imp(f_S_a, f_barre_S_a, sum_f_S, sum_f_barre_S)
{
	if(sum_f_S * sum_f_barre_S === 0.0)
	{
		return 0.0;
	}
	else
	{
		let prop_f_S_a = f_S_a / sum_f_S;
		let prop_f_barre_S_a = f_barre_S_a / sum_f_barre_S;
		return Math.abs(prop_f_S_a - prop_f_barre_S_a) / Math.max(prop_f_S_a, prop_f_barre_S_a);
	}
}

function Ind(imp, impMean, impDeviation)
{
	return standardisation(imp, impMean, impDeviation);
}

export function run(database, minSupport, minImportance, boolLog)
{
	if(boolLog)
	{
		console.log(`REVIEW: Getting sequential patterns with min support ${minSupport} and minImportance ${minImportance}...`);
	}
	//Get length DB
	let dbLength = database.length;
	if(dbLength === 0)
	{
		return;
	}

	let uniqueItems = [...new Set(database.flat())];
	//Cycle variable
	let k = 1;

	//Find frequent 1-sequences
	let importantSequences = uniqueItems.reduce((acc, currItem) => {
		//Count the freq of each item
		let supp = 0.0;
		database.forEach(transaction =>
		{
			if(COMMON.isSupported([currItem], transaction))
			{
				supp += 1.0;
			}
		});
		supp = supp / dbLength;

		//Only keep itemSets with sufficient support
		if(supp >= minSupport)
		{
			acc.push([[currItem], supp]);
		}

		return acc;
	}, []);

	while(true)
	{
		for(let [pat, supp] of importantSequences)
		{
			if(pat.length === k)
			{
				let newImportSeqs = [];

				//Compute F_S and F_barre_S
				let [F_S, F_barre_S] = [f_S(pat, uniqueItems), f_barre_S(pat, uniqueItems)];
				let [sum_f_S, sum_f_barre_S] = [sumValuesArray(F_S), sumValuesArray(F_barre_S)];
				let allImpWithItem = uniqueItems.map(item => [item, Imp(F_S.get(item), F_barre_S.get(item), sum_f_S, sum_f_barre_S)]);
				let allImpNoItems = allImpWithItem.map(([item, importance]) => importance);
				let [impMean, impDeviation] = [mean(allImpNoItems), standardDeviation(allImpNoItems)];

				for(let [item, imp] of allImpWithItem)
				{
					//Compute ind
					let ind = Ind(imp, impMean, impDeviation);
					if(Math.abs(ind) >= minImportance)
					{
						//Concat pat with the item
						let newPat = [...pat, item];
						newImportSeqs.push(newPat);
					}
				}

				//We return if there is no new important sequences
				if(newImportSeqs.length === 0)
				{
					if(boolLog)
					{
						console.log(`${importantSequences.size} sequential patterns found!`);
					}
					return importantSequences;
				}
				else
				{
					newImportSeqs.forEach(impSeq => importantSequences.push(impSeq));
				}
			}
		}
		//Increment cycle variable
		k++;
	}
}