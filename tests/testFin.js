import Lexed from 'lexed';
import {Tag} from 'en-pos';
import parser from 'en-parse';
import {normalizeCaps,replaceConfusables,resolveContractions} from "en-norm";

import htmlToText  from "html-to-text";
import filesSystem from "fs";
import GENERAL_CONFIG from "../configFiles/generalConfig.json";

function processHTMLWebPage()
{

}

(async () =>
{
	let pathHTML = "D:/webpages_retrieval/outputData/answer_the_phone/answer_the_phone_1.html";

	let htmlText = filesSystem.readFileSync(pathHTML, 'utf8');
	let text = htmlToText.fromString(htmlText, GENERAL_CONFIG.configHTML2Text);
	//Delete all non pure text things...
	text = text.replace(new RegExp("({\".*})", "gs"), "");//JSON strings
	text = text.replace(new RegExp("(https?:\\/\\/)?([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)", "g"), "");//Urls



	let someText = "This is some text. This is another sentence.";
	let processedText = resolveContractions(replaceConfusables(text));

	let tokenizedText = (new Lexed(processedText)).lexer().tokens;
	tokenizedText = tokenizedText.map(sentenceArr => normalizeCaps(sentenceArr));

	console.log(tokenizedText);

	let POSText = tokenizedText.map(sentenceArr => new Tag(sentenceArr).initial().smooth().tags);

	console.log(POSText);

	let POSText2 = new Tag(tokenizedText.flat()).initial().smooth().tags;

	console.log(POSText2);


})();
