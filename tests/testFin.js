import Lexed from 'lexed';
import {Tag} from 'en-pos';
import parser from 'en-parse';
import {normalizeCaps,replaceConfusables,resolveContractions} from "en-norm";
import {replaceHTMLEntities} from "../libs/fin-html-entities";
import {reverseSlang} from "../libs/fin-slang";

import htmlToText  from "html-to-text";
import filesSystem from "fs";
import GENERAL_CONFIG from "../configFiles/generalConfig.json";

function processHTMLWebPage()
{

}

(async () =>
{
	let pathHTML = "C:/Users/Charles/WebstormProjects/webpages_retrieval/outputData/answer_the_phone/answer_the_phone_1.html";

	let htmlText = filesSystem.readFileSync(pathHTML, 'utf8');
	let text = htmlToText.fromString(htmlText, GENERAL_CONFIG.configHTML2Text);
	//Delete all non pure text things...
	text = text.replace(new RegExp("({\".*})", "gs"), "");//JSON strings
	text = text.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");//Urls



	let someText = "When you’re answering the phone at your office, you won’t always know who is on the other end of the phone. It could be your boss, a customer, one of your colleagues, or even a wrong number.";
	let processedText = replaceHTMLEntities(reverseSlang(resolveContractions(replaceConfusables(text))));

	let tokenizedText = (new Lexed(processedText)).lexer().tokens;
	let normalizedTokenizedText = tokenizedText.map(sentenceArr => normalizeCaps(sentenceArr));
	let POSText = normalizedTokenizedText.map(sentenceArr => new Tag(sentenceArr).initial().smooth().tags);
	let depParsed = tokenizedText.map((tokensOneSentence, indexOneSentence) => parser(POSText[indexOneSentence], tokensOneSentence));

	let struct = tokenizedText.map((tokensOneSentence, indexOneSentence) =>
		tokensOneSentence.map((token, indexTok) =>
			({token: token, POS: POSText[indexOneSentence][indexTok], depParsed: depParsed[indexOneSentence][indexTok]})));

	console.log(struct[10]);
})();
