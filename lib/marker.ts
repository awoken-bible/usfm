import { readFileSync } from 'fs';

let __MARKER_META__ : any = undefined;
function MARKER_META(kind: string) : any {
	if(__MARKER_META__ === undefined){
		// This file should be created by bin/parseUsfmSty.ts
		// Run make in the root of the git repo if you experience
		// a crash here
		__MARKER_META__ = JSON.parse(
			readFileSync(__dirname + '/marker_meta.json').toString()
		);
	}

	return __MARKER_META__[kind] || {};
}

export type IntOrRange = { is_range: false, value: number } | { is_range: true, start: number, end: number };

export interface MarkerAttributes {
	[index: string] : string;
};

export interface Marker {
	/**
	 * The marker identifier, eg 'c' for \c, 'mt' for \mt
	 */
	kind   : string,

	/**
	 * Optional level value, for example major titles can be 1 of 3 levels:
	 * \mt1, \mt2, \mt3
	 * USFM spec states that omitting the level is equivalent to level 1,
	 * IE \mt == \mt1
	 * Note however in our representation we leave level as undefined if it is
	 * not specified
	 * Finally, some tags (eg, \tc for table cell) can have a range specifier
	 * as their level (in the case of tc, to indicate spanning multiple columns)
	 */
	level? : IntOrRange,

	/**
	 * If set then the marker's kind is prefixed by a '+' character, indicating it
	 * is nested within the context of the previous marker, rather than implicitly
	 * closing the previous marker
	 * For example, consider:
	 *    The following is a \add translator's addition
	 *    containing the word \+nd Lord\+nd within it\add*
	 * Here the "LORD" is nested within the \add environment
	 * Without the +, the \nd tag would implictly close the \add environment
	 */
	nested?: boolean,

	/**
	 * If set then this marker closes a Character or Note span, eg, \qs*
	 * in "\qs ... \qs*"
	 */
	closing?: boolean,

	/**
	 * Value of data field following the marker, eg "\c 1" represents chapter
	 * 1, and thus data is set to "1"
	 */
	data?   : string,

	/**
	 * Free text content following this marker, up until the next marker is found
	 */
	text?   : string,

	/**
	 * Additional attributes for a marker, eg lemma = ["grace"] in
	 * \w gracious|lemma="grace"
	 */
	attributes? : MarkerAttributes,
};

export enum MarkerStyleType {
	// Comments taken from: https://ubsicap.github.io/usfm/about/syntax.html

	/**
	 * Paragraph markers end with the next space character
	 */
	Paragraph = "paragraph",

	/**
	 * Character markers occur in pairs, marking a span of text within a paragraph.
	 */
	Character = "character",

	/**
	 * Note markers also occur in pairs, marking the start and end of the footnote,
	 * cross reference, or study note content.
	 */
	Note = "note",

	/**
	 * For marker pairs (character and note), the opening marker ends with the
	 * next space character (as with paragraph markers). The matching closing
	 * marker is identical to the opening marker but ends with an asterisk character *.
	 * Example: \w grace\w*.
	 */
};
export function getMarkerStyleType(kind: string) : MarkerStyleType | undefined {
	return MARKER_META(kind).style_type;
}


const _markerDataRegexp : {
	[ index: string ] : RegExp;
} = {
	/////////////////////////////////////////////////////////////////////
	//
	// Note: You MUST include the leading ^ to ensure lexer works correctly!
	//
	/////////////////////////////////////////////////////////////////////

	// single ints
	'c'   : /^[0-9]+/,
	'sts' : /^[0-9]+/,

	// Verse specifiers - usually just a single int, however due to inconsistant
	// versifications it can occasionally be a range (eg: 28-29) where two verses
	// are combined into a single flowing sentence
	'v'   : /^[0-9]+(-[0-9]+)?/, // standard verse
	'fv'  : /^[0-9]+(-[0-9]+)?/, // verse specifier inside footnote

	// footnote chapter/verse reference, eg, 12:3, or 12:3-4
	// Note the potential for a trailing :, eg, in GNT (https://ubsicap.github.io/usfm/notes_basic/fnotes.html#fr)
	'fr'  : /^\d+[:\.v]\d+(-[0-9]+)?:?/,

	// id -> followed by book id, eg, GEN
	'id'  : /^[A-Za-z1-9]{3}/,

	// encoding, eg "UTF-16", "Custom (FONT.TTF)"
	'ide' : /^([A-Za-z1-9-]+|Custom \(\W+\))/,

	// footnote, followed by one of:
	// + (footnote number is generated)
	// - (footnote is not used)
	// . (a custom character used to reference the footnote)
	'f'   : /^[\+\-a-zA-Z0-9]/, // standard footnote
	'fe'  : /^[\+\-a-zA-Z0-9]/, // endnote footnote (in books, rendered at end of chapter rather than bottom of page)
	'x'   : /^[\+\-a-zA-Z0-9]/, // cross reference
};

/**
 * Retrieves a regex representing the data that should follow a particular marker
 */
export function getMarkerDataRegexp(marker : Marker) : RegExp | undefined {
	// Never get data following a closing tag
	if(marker.closing){ return undefined; }

	return _markerDataRegexp[marker.kind];
}

const _marker_default_attribs : {
	[index: string] : string,
} = {
	// https://ubsicap.github.io/usfm/attributes/index.html#character-markers-providing-attributes
	w  : "lemma",
	rb : "gloss",
	xt : "link-href",
};

export function getMarkerDefaultAttribute(kind: string) : string | undefined {
	return _marker_default_attribs[kind];
}
