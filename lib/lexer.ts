import { Marker, MarkerAttributes, MarkerStyleType,
				 getMarkerDataRegexp, getMarkerDefaultAttribute, getMarkerStyleType,
			 } from './marker';

import { tokenizer, isWhitespace, TokenType, Token } from './tokenizer';

function isDigit(c: string){
	return (c.charCodeAt(0) >= '0'.charCodeAt(0) &&
					c.charCodeAt(0) <= '9'.charCodeAt(0)
				 );
}

// Parses the string following a | character representing the attributes of a
// marker
function parseAttributes(kind: string, attrib_string: string) : MarkerAttributes {
	let attribs : MarkerAttributes = {};

	attrib_string = attrib_string.trim();

	let cur_k = "";
	let cur_v = "";

	let in_quote = false;
	let i = 0;
	while(i < attrib_string.length){
		cur_k = "";
		cur_v = "";

		// Consume leading whitespace
		while(isWhitespace(attrib_string.charAt(i))){ ++i; }

		/////////////////////////
		// Parse keyless attribute value surrounded by "
		if(attrib_string.charAt(i) === '"'){
			// Then this is a keyless attribute but quoted so may contain spaces
			let cur_k = getMarkerDefaultAttribute(kind);
			if(cur_k === undefined){
				throw new Error(`Keyless attribute specified for marker of kind ${kind} but this kind has no default`);
			}
			++i; // skip opening "

			while(i < attrib_string.length &&
						attrib_string.charAt(i) !== '"'){
				cur_v += attrib_string.charAt(i);
				++i;
			}

			++i; //skip the closing "
			attribs[cur_k] = cur_v;
			continue;
		}

		/////////////////////////
		// Parse token until space (if value of keyless attribute) or
		// until `= if keyed attribute
		while(i < attrib_string.length &&
					attrib_string.charAt(i) !== '=' &&
					attrib_string.charAt(i) !== ' '
				 ){
			cur_v += attrib_string.charAt(i);
			++i;
		}

		if(attrib_string.charAt(i) === ' ' || i === attrib_string.length){
			// then this attrib has no key
			let cur_k = getMarkerDefaultAttribute(kind);
			if(cur_k === undefined){
				throw new Error(`Keyless attribute specified for marker of kind ${kind} but this kind has no default`);
			}
			attribs[cur_k] = cur_v;
			continue;
		} else if (attrib_string.charAt(i) !== '='){
			throw new Error("Invalid character found in attribute key, got: '" + attrib_string.charAt(i) + "'");
		}

		// If still going we've just hit an '=' character, so what we've parsed so
		// so far is actually the key
		cur_k = cur_v;
		cur_v = "";

		++i;
		if(attrib_string.charAt(i) !== '"'){
			throw new Error('Expected " character to open attribute value');
		}
		++i;

		while(attrib_string.charAt(i) !== '"'){
			cur_v += attrib_string.charAt(i);
			++i;
		}
		attribs[cur_k] = cur_v;

		++i;
	}

	return attribs;
}

// Parses the characters within a marker Token to produce a Marker object
// Note that the .data and .text fields will NOT be filled in, since
// they are represented by subsequent Tokens
function parseMarker(mtex: string) : Marker {
	let marker : Marker = { kind: '', text: '' };

	let t = 1; // skip openning '\'

	// Parse a '+', indicating a marker nested within the current context
	// See: https://ubsicap.github.io/usfm/characters/nesting.html
	if(mtex.charAt(t) == '+'){
		marker.nested = true;
		++t;
	}

	// parse kind (lower case sequence of a-z chars), eg 'id' in \id
	while(mtex.charCodeAt(t) >= 'a'.charCodeAt(0) &&
				mtex.charCodeAt(t) <= 'z'.charCodeAt(0)
			 ){
		marker.kind += mtex.charAt(t);
		++t;
	}

	// Parse a level indicator, eg 'mt2' is a second level major title
	if(isDigit(mtex.charAt(t))){
		let start : string = "";
		let end   : string = "";

		while(isDigit(mtex.charAt(t))){
			start += mtex.charAt(t);
			++t;
		}

		if(mtex.charAt(t) !== '-'){
			marker.level = parseInt(start);
		} else {
			++t; // skip the -
			while(isDigit(mtex.charAt(t))){
				end += mtex.charAt(t);
				++t;
			}
			marker.level = { is_range : true,
											 start    : parseInt(start),
											 end      : parseInt(end),
										 };
		}
	}

	// Parse trailing * to indicate a closing marker
	if(mtex.charAt(t) == '*'){
		marker.closing = true;
		++t;
	}

	if(t !== mtex.length){
		throw new Error("Unexpected character beyond expected end of marker, got " + mtex.charAt(t) + " in " + mtex);
	}

	return marker;
}

// Determines whether the Token.Whitespace which preceeds the passed
// in token is "significant" as per the USFM spec
// (see: https://ubsicap.github.io/usfm/about/syntax.html?highlight=whitespace#whitespace)
// Such "significant" whitespace is required to adhear to the USFM
// syntax, and thus should NOT be included in the final text
function isPreceedingWhitespaceSignificant(tok: Token){
	switch(tok.kind){
		case TokenType.Word:
			// whitespace seperating words in a paragraph is never significant, since it
			// could simply be one long word (IE: the space in "hello world" is not
			// required by the USFM syntax - but rather by english syntax)
			return false;
		case TokenType.Marker:
			// Given from the spec:
			// - Multiple whitespace preceding a paragraph marker is normalized to a single newline. (https://ubsicap.github.io/usfm/about/syntax.html?highlight=whitespace#whitespace-normalization)
			// - The newline preceeding a new paragraph marker is significant (https://ubsicap.github.io/usfm/about/syntax.html?highlight=whitespace#whitespace)
			// - Significant whitespace should not be added to the text. (https://ubsicap.github.io/usfm/about/syntax.html?highlight=whitespace#whitespace-normalization)
			//
			// We can imply that ANY whitespace preceeding a paragraph marker
			// should be treated as significant
			//
			// We also treat \v tags in the same way, even though technically they are
			// character markers (but weird ones, since they are never closed by a \v* tag)

			let m = parseMarker(tok.value);
			return (getMarkerStyleType(m.kind) === MarkerStyleType.Paragraph ||
							m.kind === 'v'
						 );
		case TokenType.VBar:
			// Space is never required before a VBar
			return false;
	}
}

export function* lexer(text: string) : IterableIterator<Marker> {
	let tok_iter = tokenizer(text);
	let marker : Marker = { kind: '', text: '' };

	function emit() : Marker{
		if(marker.text === ''){ delete marker.text; }
		return marker;
	}

	let tok = tok_iter.next();

	// Skip leading whitespace
	if(!tok.done && tok.value.kind === TokenType.Whitespace){
		tok = tok_iter.next();
	}

	while(!tok.done){
		if(tok.value.kind !== TokenType.Marker) {
			throw new Error("Expected \\ at position " + tok.value.min + ", got token: '" + tok.value.value + "'");
		}

		marker = parseMarker(tok.value.value);

		tok = tok_iter.next();
		if(tok.done){ yield emit(); break; }

		if(!marker.closing){
			if(tok.value.kind !== TokenType.Whitespace){
				throw new Error("Expected mandatory whitespace after marker at position " + tok.value.min);
			}
			tok = tok_iter.next(); // skip the whitespace token
		} else {
			if(tok.value.kind === TokenType.Whitespace){
				tok = tok_iter.next(); // skip the whitespace token
				if(!tok.done && !isPreceedingWhitespaceSignificant(tok.value)){
					marker.text += " ";
				}
			} else {
				marker.text = "";
			}
		}

		if(tok.done){ yield emit(); break; }

		//////////////////////////////////////////////////
		// Build marker text string from subsequent whitepace and word tokens
		let marker_text = marker.text || "";
		let parsing_marker_text = true;
		while(parsing_marker_text && !tok.done){
			switch(tok.value.kind){
				case TokenType.Whitespace:
					tok = tok_iter.next();
					if(!tok.done && !isPreceedingWhitespaceSignificant(tok.value)){
						marker_text += " ";
					}
					break;
				case TokenType.Word:
					marker_text += tok.value.value;
					tok = tok_iter.next();
					break;
				case TokenType.VBar:
				case TokenType.Marker:
					parsing_marker_text = false;
					break;
			}
		}
		marker.text = marker_text;

		//////////////////////////////////////////////////
		// Parse front of text string to see if it contains data for marker
		let data_regexp = getMarkerDataRegexp(marker);
		if(data_regexp){
			let match = marker_text.match(data_regexp);
			if(!match){
				throw new Error("Expected data to follow marker '" + marker.kind +
												"' at position, got: " + marker_text);
			}
			marker.data = match[0];
			marker.text = marker_text.substring(match[0].length+1); //+1 to skip the whitespace
		}

		if(tok.done){ yield emit(); break; }

		//////////////////////////////////////////////////
		// Parse attrib list
		if(tok.value.kind === TokenType.VBar){
			tok = tok_iter.next(); // skip the VBar

			let marker_attrib_string = "";

			let parsing_marker_attribs = true;
			while(parsing_marker_attribs && !tok.done){
				switch(tok.value.kind){
					case TokenType.Whitespace:
						marker_attrib_string += " ";
						tok = tok_iter.next();
						break;
					case TokenType.Word:
						marker_attrib_string += tok.value.value;
						tok = tok_iter.next();
						break;
					case TokenType.VBar:
						// :TODO: in USFM 2.0 attributes did not exist, and thus multiple
						// | characters could occur when parsing a \fig marker that uses |
						// to seperate the fields
						throw new Error("Unexpected | token within marker attribute string");
						break;
					case TokenType.Marker:
						parsing_marker_attribs = false;
						break;
				}
			}
			marker.attributes = parseAttributes(marker.kind, marker_attrib_string);
		}

		yield emit();
	}
}

export default(lexer);
