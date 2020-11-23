import Lexed from 'lexed';
import {Tag} from 'en-pos';
import parser from 'en-parse';
import clone from "clone";
import {normalizeCaps,replaceConfusables,resolveContractions} from "en-norm";
import Wordpos from "wordpos";
import { Inflectors } from "en-inflectors";

(async () =>
{
	let testText = 'The angry bear chased the frightened little squirrel. The event is traumatic.';
	let wordpos = new Wordpos();
	let posWordpos = await wordpos.getPOS(testText);
	console.log(posWordpos);

	let tokenizedText1 = (new Lexed(testText)).lexer().tokens;
	let normalizedTokenizedText1 = tokenizedText1.map(sentenceArr => normalizeCaps(sentenceArr));
	let POSText1 = normalizedTokenizedText1.map(sentenceArr => new Tag(sentenceArr).initial().smooth().tags);
	console.log(POSText1);

	let res = await wordpos.lookupVerb("Understands");

	console.log(res)

	let res12 = new Inflectors("updated").conjugate("VBP");

	console.log(res12);

	let cleanText = "Before killing you, i kill your father."
	let tokenizedText = (new Lexed(cleanText)).lexer().tokens;
	let clonedTokenizedText = clone(tokenizedText);
	let normalizedTokenizedText = clonedTokenizedText.map(sentenceArr => normalizeCaps(sentenceArr));
	let POSText = normalizedTokenizedText.map(sentenceArr => new Tag(sentenceArr).initial().smooth().tags);
	let depParsed = normalizedTokenizedText.map((tokensOneSentence, indexOneSentence) => parser(POSText[indexOneSentence], tokensOneSentence));

	let processedSentences = normalizedTokenizedText.map((normalizedTokensOneSentence, indexOneSentence) =>
		normalizedTokensOneSentence.map((normalizedToken, indexTok) =>
		{
			return {
				indexSentence: indexOneSentence,
				indexToken: indexTok,
				originalToken: tokenizedText[indexOneSentence][indexTok],
				normalizedToken: normalizedToken.toLowerCase(),
				POS: POSText[indexOneSentence][indexTok],
				depParsed: depParsed[indexOneSentence][indexTok]
			}}));

	console.log(processedSentences);

})();
