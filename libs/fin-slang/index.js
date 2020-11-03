//https://github.com/FinNLP/fin-slang/tree/master/src

import {rules} from "./list";

export function reverseSlang(string)
{
    for(let index = 0; index < rules.length; index++)
    {
        let rule = rules[index];
        string = string.replace(rule.regex,rule.replacement);
    }
    return string;
}