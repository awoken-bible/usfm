import { readFileSync } from 'fs';

interface Marker {
	kind   : string,
	level? : number,
	data   : string,
	text   : string,
};

function isWhitespace(c : string){
	return (c.charAt(0) == ' '  ||
					c.charAt(0) == '\t' ||
					c.charAt(0) == '\r' ||
					c.charAt(0) == '\n'
				 );
}

export function* lexer(text: string) : IterableIterator<Marker> {
	let marker : Marker = { kind: '', level: undefined, data: '', text: '' };

	function emit() : Marker{
		marker.text = marker.text.trim();
		let retval = marker;

		marker = { kind: '', level: undefined, data: '', text: '' };

		return retval;
	}

	for(let i = 1; i < text.length; ++i){

		// Consume whitespace
		while(isWhitespace(text.charAt(i))){ ++i; }

		// Start marker
		if(text.charAt(0) != '\\'){
			throw new Error("Expected \\ at position " + i);
		}

		// parse kind (lower case sequence of a-z chars)
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
			yield emit();
			continue;
		}

		while(isWhitespace(text.charAt(i))){ ++i; }

		console.log("******** PARSING TEXT");
		while(text.charAt(i) != '\\' && i < text.length){
			marker.text += text.charAt(i);
			++i;
		}

		yield emit();
	}
}
let data = readFileSync('./test.usfm').toString();
//console.log(data);

let gen = lexer(data);
console.dir(gen.next());
console.dir(gen.next());
console.dir(gen.next());
console.dir(gen.next());
console.dir(gen.next());
console.dir(gen.next());
console.dir(gen.next());
