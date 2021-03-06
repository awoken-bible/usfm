/**
 * Contains types and implementation for a tokenizer
 */


/**
 * Determines if the first character of some string is whitespace
 * as per the USFM spec:
 * https://ubsicap.github.io/usfm/about/syntax.html#whitespace
 */
export function isWhitespace(c : string){
	return (c.charAt(0) === ' '  ||
	        c.charAt(0) === '\t' ||
	        c.charAt(0) === '\r' ||
	        c.charAt(0) === '\n' ||
	        c.charAt(0) === '¶'
	       );
}

export enum TokenType {
	// Any continous sequence of whitespace characters
	Whitespace,

	// The "|" character
	VBar,

	// Any continous sequence of characters not including whitespace or |
	// where the sequence is NOT prefixed by the "\" character
	Word,

	// Any continous sequence of characters not including whitespace or |
	// where the sequence IS prefixed by the "\" character
	Marker,
};

export interface Token {
	/** The kind of this token */
	kind       : TokenType;

	/**
	 * The string value of this token.
	 * Will be taken from the input string verbatim, except for newlines
	 * where CR, LF and CRLF will all be represented by the string "\n"
	 * as per the USFM spec: https://ubsicap.github.io/usfm/about/syntax.html#newlines
	 */
	value      : string;

	/**
	 * Index of the first character in the token
	 */
	min: number,

	/**
	 * Index of the last character in the token
	 */
	max: number,
};

/**
 * Given a string of text yields a sequence of Token instances
 */
export function* tokenizer(text: string) : IterableIterator<Token> {

	let cur_value : string = "";
	let cur_start : number = 0;
	let cur_kind  : TokenType | undefined = undefined;

	let i = 0;
	while(i < text.length){
		let c = text.charAt(i);

		switch(cur_kind){
			case undefined:
				cur_value = c;
				cur_start = i;
				if(isWhitespace(c)){ cur_kind = TokenType.Whitespace; }
				else if(c === '|' ){ cur_kind = TokenType.VBar;       }
				else if(c === '\\'){ cur_kind = TokenType.Marker;     }
				else {               cur_kind = TokenType.Word;       }
				++i;
				break;
			case TokenType.Whitespace:
				if(isWhitespace(c)){
					cur_value += c;
					++i;
				} else {
					// CR, LF and CRLF should all be treated as LF (IE: \n)
					// https://ubsicap.github.io/usfm/about/syntax.html?highlight=whitespace#newlines
					cur_value = cur_value.replace(/\r\n?/g, "\n");
					yield { kind: cur_kind, value: cur_value, min: cur_start, max: i-1 };
					cur_kind = undefined;
				}
				break;
			case TokenType.VBar:
				yield { kind: cur_kind, value: cur_value, min: cur_start, max: i-1 };
				cur_kind = undefined;
				break;
			case TokenType.Marker:
				if(!isWhitespace(c) && c !== '|' && c !== '*' && c !== "\\"){
					cur_value += c;
					++i;
				} else {
					if(c === '*'){
						cur_value += '*';
						++i;
					}
					yield { kind: cur_kind, value: cur_value, min: cur_start, max: i-1 };
					cur_kind = undefined;
				}
				break;
			case TokenType.Word:
				if(!isWhitespace(c) && c !== '|' && c !== "\\"){
					cur_value += c;
					++i;
				} else {
					yield { kind: cur_kind, value: cur_value, min: cur_start, max: i-1 };
					cur_kind = undefined;
				}
				break;
			default:
				throw new Error("CODE ERROR - Unhandled TokenType in switch statement");
		}
	}

	if(cur_kind !== undefined){
		cur_value = cur_value.replace(/\r\n?/g, "\n");
		yield { kind: cur_kind, value: cur_value, min: cur_start, max: text.length-1 };
	}
}

export default tokenizer;
