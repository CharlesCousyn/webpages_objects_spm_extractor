import * as TOOLS from "./tools.js";

export function GSP(database, minSupport, closedMention, maximalMention)
{
	console.log("Getting sequential patterns...");
	//Get length DB
	let dbLength = database.length;
	if(dbLength === 0)
	{
		return;
	}

	//Compute 1-sequences
	let uniqueItems = [...new Set(database.flat())];

	//Find frequent 1-sequences
	let freqItemSetsLevelOne = uniqueItems.reduce((acc, currItem) => {
		//Count the freq of each item
		let countItem = 0.0;
		database.forEach(transaction =>
		{
			if(isSupported([currItem], transaction))
			{
				countItem += (1 / dbLength);
			}
		});

		//Only keep itemSets with sufficient support
		if(countItem >= minSupport)
		{
			acc.set([currItem], countItem);
		}

		return acc;
	}, new Map());

	let freqItemSetsFixedLevel = freqItemSetsLevelOne;
	//Initiate return value
	let allFrequentItemSets = freqItemSetsLevelOne;
	//Loop until no more freq item set found
	while(freqItemSetsFixedLevel.size !== 0)
	{
		//Generate candidate sets of one level higher
		let candidateSets = new Map();
		for(let [orderedItems1, ] of freqItemSetsFixedLevel)
		{
			for(let [orderedItems2, ] of freqItemSetsFixedLevel)
			{
				let arr1 = orderedItems1.slice(1);
				let arr2 = orderedItems2.slice(0, orderedItems2.length - 1);
				//Merge if compatible: Merging [a, b], with [b, c] give [a, b, c]
				if(TOOLS.arraysMatch(arr1, arr2))
				{
					candidateSets.set([...orderedItems1, orderedItems2[orderedItems2.length - 1]], 0.0);
				}
			}
		}

		//Increment counts
		for(let trans of database)
		{
			for(let [orderedItems, count] of candidateSets)
			{
				//Increment count if trans support candidateSet
				if(isSupported(orderedItems, trans))
				{
					candidateSets.set(orderedItems, count + (1 / dbLength));
				}
			}
		}

		//Only keep itemSets with sufficient support
		for (let [orderedItems, count] of candidateSets)
		{
			if (count < minSupport)
			{
				candidateSets.delete(orderedItems);
			}
		}

		freqItemSetsFixedLevel = candidateSets;

		//Add all freqItemSetsFixedLevel to allFrequentItemSets
		allFrequentItemSets = new Map([...allFrequentItemSets, ...freqItemSetsFixedLevel]);
	}

	console.log(`${allFrequentItemSets.size} sequential patterns found!`);
	return handleClosedAndMaximalPat(allFrequentItemSets, closedMention, maximalMention);
}

export function isSupported(orderedElements, sequence)
{
	let minIndex = -1;
	for(let el of orderedElements)
	{
		//Find all indexes of one element
		let indexesEl = sequence.reduce((a, e, i) => {
			if (e === el)
			{
				a.push(i);
			}
			return a;
		}, []);

		//If el does not exist or if the el is not after minIndex
		if(indexesEl.length === 0 || !indexesEl.some(index => index > minIndex))
		{
			return false;
		}
		else
		{
			let newMinIndex = indexesEl.filter(index => index > minIndex)[0];
			//Update minIndex with at least 1
			if(minIndex === newMinIndex)
			{
				minIndex++;
			}
			else
			{
				minIndex = newMinIndex;
			}
		}
	}
	return true;
}

function isClosed(pat1, freq1, mapOfSeqPatterns)
{
	return ![...mapOfSeqPatterns]
	.some(([pat2, freq2]) => freq1 === freq2 && pat2.length > pat1.length && isSupported(pat1, pat2));
}

function isMaximal(pat1, freq1, mapOfSeqPatterns)
{
	return ![...mapOfSeqPatterns]
	.filter(([, [, closed]]) => closed)
	.some(([pat2, [, ]]) => pat2.length > pat1.length && isSupported(pat1, pat2));
}

export function getIndexesSuffixes(orderedElements, sequence)
{
	let minIndex = -1;
	let lastIndexes = [];
	for(let el of orderedElements)
	{
		//Find all indexes of one element
		let indexesEl = sequence.reduce((a, e, i) => {
			if (e === el)
			{
				a.push(i);
			}
			return a;
		}, []);

		//If el does not exist or if the el is not after minIndex
		if(indexesEl.length === 0 || !indexesEl.some(index => index > minIndex))
		{
			return [-1];
		}
		else
		{
			let newMinIndex = indexesEl.filter(index => index > minIndex)[0];
			//Update minIndex with at least 1
			if(minIndex === newMinIndex)
			{
				minIndex++;
			}
			else
			{
				minIndex = newMinIndex;
			}

			lastIndexes = indexesEl.filter(index => index >= minIndex);
			let i = 0;
		}
	}
	return lastIndexes.map(i => i+1);
}

function PrefixSpanRecurs(database, minSupport, sequentialPattern, length, fullDBLength)
{
	//Scan DB to find set of frequent items
	//Compute 1-sequences
	let uniqueItems = [...new Set(database.flat())];

	//Find unique 1-sequences: give a map of form[ ["a"]: 0.3, ["b"]:0.4, ...]
	let oneSizedItemSetsWithSupp = uniqueItems.reduce((acc, currItem) => {
		//Count the freq of each item
		let countItem = 0.0;
		database.forEach(sequence =>
		{
			if(sequence.includes(currItem))
			{
				countItem += (1 / fullDBLength);
			}
		});

		//Only keep itemSets with sufficient support
		if(countItem >= minSupport)
		{
			acc.set([currItem], countItem);
		}
		return acc;
	}, new Map());
	let oneSizedItemSets = Array.from(oneSizedItemSetsWithSupp.keys());

	//If no frequent itemSets
	if(oneSizedItemSetsWithSupp.size === 0)
	{
		return new Map();
	}
	else
	{
		//Init projection map
		let databaseWithProj = new Map(database.map(dataSequence => [dataSequence, new Map()]));
		//Adding pseudo projection to database
		for(let [dataSequence, pseudoProjMap] of databaseWithProj)
		{
			for(let oneSizedItemSet of oneSizedItemSets)
			{
				pseudoProjMap.set(oneSizedItemSet, getIndexesSuffixes(oneSizedItemSet, dataSequence));
			}
		}

		//Built new seq patterns: [] + ["a"]
		let newPatterns = oneSizedItemSets.map( item => [...sequentialPattern, ...item]);

		//Create a Map of databases, key: prefix, value: db
		let allNewDBs = new Map();
		for(let i = 0; i < newPatterns.length; i++)
		{
			let db = [...databaseWithProj]
			//Only keep the sequence when the suffix is empty or not containing -1
			.filter(([, pseudoProjMap]) => pseudoProjMap.get(oneSizedItemSets[i]).length === 0 || pseudoProjMap.get(oneSizedItemSets[i])[0] !== -1)
			//Use indexes to extract suffixes
			.flatMap(([dataSeq, pseudoProjMap]) =>
				pseudoProjMap.get(oneSizedItemSets[i])
				.map(index => dataSeq.filter((item, i) => i >= index))
				.filter((val, index) => index === 0));

			allNewDBs.set(newPatterns[i], db);
		}

		//Create map with freq patterns detected
		let mapPattern = new Map();
		oneSizedItemSetsWithSupp.forEach((value, key) =>
		{
			mapPattern.set([...sequentialPattern, ...key], value);
		});

		//Create a big map with all future patterns detected
		let bigMap = new Map();
		for(let [pat, db] of allNewDBs)
		{
			bigMap = new Map([...bigMap, ...PrefixSpanRecurs(db, minSupport, pat, length + 1, fullDBLength)])
		}

		//Return the fusion of this 2 maps
		return new Map([...mapPattern, ...bigMap]);
	}
}

export function PrefixSpan(database, minSupport, closedMention, maximalMention)
{
	console.log(`Getting sequential patterns with minSupport ${minSupport}...`);
	//Get length DB
	let fullDBLength = database.length;
	if(fullDBLength === 0)
	{
		return;
	}
	let mapOfSeqPatterns = PrefixSpanRecurs(database, minSupport, [], 0, fullDBLength);

	console.log(`${mapOfSeqPatterns.size} sequential patterns found!`);
	return handleClosedAndMaximalPat(mapOfSeqPatterns, closedMention, maximalMention);
}

function handleClosedAndMaximalPat(mapOfSeqPatterns, closedMention, maximalMention)
{
	if(closedMention)
	{
		console.log("Finding closed sequential patterns...");
		mapOfSeqPatterns = new Map(
			[...mapOfSeqPatterns]
				.map(([pat, freq]) => [pat, [freq, isClosed(pat, freq, mapOfSeqPatterns)]])
		);
		console.log(`${[...mapOfSeqPatterns].filter(([pat, [freq, closed]]) => closed).length} closed patterns found!`);
		if(maximalMention)
		{
			console.log("Finding maximal sequential patterns...");
			mapOfSeqPatterns = new Map(
				[...mapOfSeqPatterns]
					.map(([pat, [freq, closed]]) => [pat, [freq, closed, isMaximal(pat, freq, mapOfSeqPatterns)]])
			);
			console.log(`${[...mapOfSeqPatterns].filter(([pat, [freq, closed, maximal]]) => maximal).length} maximal patterns found!`);
		}
	}

	return mapOfSeqPatterns;
}