import { Marker, MarkerAttributes,
				 getMarkerDataRegexp, getMarkerDefaultAttribute
			 } from './marker';

function isWhitespace(c : string){
	return (c.charAt(0) == ' '  ||
					c.charAt(0) == '\t' ||
					c.charAt(0) == '\r' ||
					c.charAt(0) == '\n'
				 );
}

function isDigit(c: string){
	return (c.charCodeAt(0) >= '0'.charCodeAt(0) &&
					c.charCodeAt(0) <= '9'.charCodeAt(0)
				 );
}

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

export function* lexer(text: string) : IterableIterator<Marker> {
	const EMPTY_MARKER : Marker = {
		kind: '',
	};

	let marker = { ...EMPTY_MARKER };

	function emit() : Marker{
		if(marker.text){
			marker.text = marker.text.trim();

			let parts = marker.text.split('|');
			switch(parts.length){
				case 1: break; // no-op, all is text
				case 2:
					marker.text = parts[0];
					marker.attributes = parseAttributes(marker.kind, parts[1]);
					break;
				default:
					throw new Error("Marker text should not include | except for to indicate attribute list");
			}
		}
		let retval = marker;

		marker = { ...EMPTY_MARKER };

		return retval;
	}

	for(let i = 1; i < text.length; ++i){
		// Consume whitespace
		while(isWhitespace(text.charAt(i))){ ++i; }

		// Start marker with \ char
		if(text.charAt(0) != '\\'){
			throw new Error("Expected \\ at position " + i + ", got: '" + text.substring(i, i+5) + "..." + "'");
		}

		// Parse a '+', indicating a marker nested within the current context
		// See: https://ubsicap.github.io/usfm/characters/nesting.html
		if(text.charAt(i) == '+'){
			marker.nested = true;
			++i;
		}

		// parse kind (lower case sequence of a-z chars), eg 'id' in \id
		while(text.charCodeAt(i) >= 'a'.charCodeAt(0) &&
					text.charCodeAt(i) <= 'z'.charCodeAt(0)
				 ){
			marker.kind += text.charAt(i);
			++i;
		}

		// Parse a level indicator, eg 'mt2' is a second level major title
		if(isDigit(text.charAt(i))){
			let start : string = "";
			let end   : string = "";

			while(isDigit(text.charAt(i))){
				start += text.charAt(i);
				++i;
			}

			if(text.charAt(i) !== '-'){
				marker.level = parseInt(start);
			} else {
				++i; // skip the -
				while(isDigit(text.charAt(i))){
					end += text.charAt(i);
					++i;
				}
				marker.level = { is_range : true,
												 start    : parseInt(start),
												 end      : parseInt(end),
											 };
			}
		}

		if(text.charAt(i) == '*'){
			// Then its a closing marker
			marker.closing = true;
			++i;
		} else {
			if(!isWhitespace(text.charAt(i))){
				throw new Error("Expected mandatory whitespace after marker at position " + i);
			}
		}
		if(i >= text.length-1){
			yield emit();
			break;
		}
		// consume any extra whitespace
		while(isWhitespace(text.charAt(i))){ ++i; }

		// Parse data string
		let data_regexp = getMarkerDataRegexp(marker);
		if(data_regexp){
			let match = text.substring(i).match(data_regexp);
			if(!match){
				throw new Error("Expected data to follow marker '" + marker.kind +
												"' at position " + i + ", got: " + text.substring(i, i+5) + "...");
			}
			marker.data = match[0];
			i += marker.data.length;

			if(i >= text.length-1){
				yield emit();
				break;
			}

			if(text.charAt(i) === '\\'){
				// then there is no whitespace after the marker's data as, we
				// immediately hit another marker, skip rest of loop body
				yield emit();
				continue;
			}

			if(!isWhitespace(text.charAt(i))){
				throw new Error("Expected mandatory whitespace after marker data at position " + i);
			}
			// consume any extra whitespace
			while(isWhitespace(text.charAt(i))){ ++i; }
		}

		if(text.charAt(i) != '\\'){
			marker.text = "";
			while(text.charAt(i) != '\\' && i < text.length){
				marker.text += text.charAt(i);
				++i;
			}
		}

		yield emit();
	}
}

export default(lexer);
