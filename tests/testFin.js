import Lexed from 'lexed';
import {Tag} from 'en-pos';
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

})();
