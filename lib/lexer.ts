import { Marker, MarkerAttributes,
				 getMarkerDataRegexp, getMarkerDefaultAttribute
			 } from './marker';

import { tokenizer, isWhitespace, TokenType } from './tokenizer';

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

		// Consume whitespace
		while(isWhitespace(attrib_string.charAt(i))){ ++i; }

		while(attrib_string.charAt(i).toLowerCase().match(/^[a-z_\-0-9]$/)){
			cur_v += attrib_string.charAt(i);
			++i;
		}

		if(attrib_string.charAt(i) === ' ' || i === attrib_string.length){
			// then this attrib has no key
			let cur_k = getMarkerDefaultAttribute(kind);
			if(cur_k === undefined){
				throw new Error(`Keyless attribute specified for marker of kind ${kind} but this kind has no default`);
			}
			attribs[cur_k] = cur_v.split(",");
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
		attribs[cur_k] = cur_v.split(",");

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

export function* lexer(text: string) : IterableIterator<Marker> {
	const EMPTY_MARKER : Marker = {
		kind: '', text: '',
	};

	let tok_iter = tokenizer(text);
	let marker   = { ...EMPTY_MARKER };

	function emit() : Marker{
		if(marker.text){
			marker.text = marker.text.trim();
		}
		if(marker.text === ''){
			delete marker.text;
		}
		let retval = marker;

		marker = { ...EMPTY_MARKER };

		return retval;
	}

	let tok = tok_iter.next();
	while(!tok.done){
		// Skip whitespace
		if(tok.value.kind === TokenType.Whitespace){
			tok = tok_iter.next();
		}

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
				marker.text = " ";
				tok = tok_iter.next(); // skip the whitespace token
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
					marker_text += " ";
					tok = tok_iter.next();
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
			marker.text = marker_text.substring(match[0].length);
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
