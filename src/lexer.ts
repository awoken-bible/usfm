import { Marker, getMarkerDataRegexp } from './marker';

function isWhitespace(c : string){
	return (c.charAt(0) == ' '  ||
					c.charAt(0) == '\t' ||
					c.charAt(0) == '\r' ||
					c.charAt(0) == '\n'
				 );
}

export function* lexer(text: string) : IterableIterator<Marker> {
	const EMPTY_MARKER : Marker = {
		kind: '',
	};

	let marker = { ...EMPTY_MARKER };

	function emit() : Marker{
		if(marker.text){
			marker.text = marker.text.trim();
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
			marker.level = text.charCodeAt(i) - '0'.charCodeAt(0);
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
		if(text.charCodeAt(i) >= '1'.charCodeAt(0) && text.charCodeAt(i) <= '9'.charCodeAt(0)){
			marker.level = text.charCodeAt(i) - '0'.charCodeAt(0);
			++i;
		}

		if(text.charAt(i) == '*'){
			// Then its a closing marker
			marker.kind += '*';
			++i;
		}

		if(i >= text.length-1){
			yield emit();
			break;
		}
		if(!isWhitespace(text.charAt(i))){
			throw new Error("Expected mandatory whitespace after marker at position " + i);
		}
		// consume any extra whitespace
		while(isWhitespace(text.charAt(i))){ ++i; }

		// Parse data string
		let data_regexp = getMarkerDataRegexp(marker.kind);
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
