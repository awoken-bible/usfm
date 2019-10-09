#!/usr/bin/env ts-node

/**
 * Generates a JSON object representing the meta data for each marker
 * kind by parsing a usfm .sty file, default copy can be found here:
 * https://github.com/ubsicap/usfm/blob/master/sty/usfm.sty
 */

import { MarkerStyleType } from '../lib/marker';
import * as fs from 'fs';

interface MarkerMetaData {
	/**
	 * List of other markers that this one is allowed to occur within
	 */
	occurs_under : string[],

	/**
	 * Whether this marker is of type Paragraph, Character or Note
	 */
	style_type   : MarkerStyleType,

	/**
	 * If true then the text content is indented to be included in the
	 * printed text
	 */
	publishable  : boolean,
};

interface MarkerMetaDataMap {
	[index: string] : MarkerMetaData;
};

////////////////////////////////////////////////////////////////////////////////

process.exit(main());

////////////////////////////////////////////////////////////////////////////////

function main(){
	let args : string[] = process.argv;

	if(args.length != 4){
		console.error("Error, bad usage, try: parseUsfmSty [INPUT_FILE] [OUTPUT_FILE]");
		return 1;
	}

	let content = fs.readFileSync(args[2]).toString();
	let lines   = content.split('\n').map((l : string) => l.trim());

	let result = _processLines(lines);

	console.log("Finished parsing input, writing output");
	fs.writeFileSync(args[3], JSON.stringify(result));


	return 0;
}

function _processLines(lines : string[]) : MarkerMetaDataMap {

	let result : MarkerMetaDataMap = {};
	let current_kind : string = "";
	let current : MarkerMetaData | undefined;

	for(let line_num = 1; line_num <= lines.length; ++line_num){
		let l = lines[line_num-1];

		if(current === undefined){
			// Skip subsequent blank lines
			if(l.length === 0){ continue; }

			// Skip comments
			if(l.charAt(0) === '#'){ continue; }

			if(l.charAt(0) === '\\'){
				if(l.startsWith('\\Marker ')){
					current_kind = l.substring(8);
					if(current_kind.split(' ').length != 1){
						throw new Error(`LINE ${line_num} - Expected \\Marker tag to be followed by single token`);
					}

					current_kind = _normalizeMarkerKind(line_num, current_kind);

					console.log(`LINE ${line_num} - Starting parse of meta data for marker ${current_kind}`);
					current = {
						occurs_under : [],
						publishable  : false,
						style_type   : MarkerStyleType.Paragraph,
					};
				} else {
					throw new Error(`LINE ${line_num} - Unknown opening marker: ${l}`);
				}
			}
			continue;
		}

		// If still going then current is defined

		if(l.length === 0){
			// Then we've reached end of current

			// Add it to result set if new
			if(result[current_kind] === undefined){
				result[current_kind] = current;
			} else {
				// Otherwise we have an existing data entry for this marker
				if(JSON.stringify(result[current_kind]) !== JSON.stringify(current)){

					console.log("WARNING - mismatch marker meta data for differing levels");
					console.log(JSON.stringify(result[current_kind], null, 2));
					console.log(JSON.stringify(current, null, 2));
				}
			}

			current = undefined;
			continue;
		}

		// Skip comments
		if(l.charAt(0) === '#'){ continue; }

		// Skip comments
		if(l.charAt(0) !== '\\'){
			throw new Error(`LINE ${line_num} - Unexpected first character of line, wanted \\`);
		}

		if(l.startsWith('\\StyleType')){
			switch(l.toLowerCase()){
				case '\\styletype paragraph':
					current.style_type = MarkerStyleType.Paragraph;
					break;
				case '\\styletype character':
					current.style_type = MarkerStyleType.Character;
					break;
				case '\\styletype note':
					current.style_type = MarkerStyleType.Note;
					break;
				default:
					throw new Error(`LINE ${line_num} - Unknown StyleType: ${l}`);
			}
		} else if (l.startsWith('\\OccursUnder')) {
			let markers = l.split(' ');
			markers.shift(); // remove the first "\OccursUnder" element
			markers = markers
				.filter((m : string) => m.length > 0) // remove empty elements
				.map((m : string) => _normalizeMarkerKind(line_num, m));
			markers = markers.filter((m : string, i : number, ar : string[]) => ar.indexOf(m) === i); // Deduplicate
			current.occurs_under = markers;
		} else if (l.startsWith('\\TextProperties')){
			current.publishable = l.includes('publishable');
		} else {
			// silently skip lines we don't care about
		}
	}
	return result;
}


/**
 * Strips a numeric identifier from the end of a marker, eg mt1 becomes mt
 */
function _normalizeMarkerKind(line_num : number, kind : string){
	if(kind === 'NEST'){ return 'NEST'; }

	let match = kind.match(/([a-z]+)\d*/);

	if(!match){
		throw new Error(`LINE ${line_num} - Marker kind '${kind}' did not match expected format ([a-z]+\\d*)`);
	}

	return match[1];
}
