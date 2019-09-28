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
	 */
	level? : number,

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
	 * Value of data field following the marker, eg "\c 1" represents chapter
	 * 1, and thus data is set to "1"
	 */
	data?   : string,

	/**
	 * Free text content following this marker, up until the next marker is found
	 */
	text?   : string,
};

export enum MarkerType {
	// Comments taken from: https://ubsicap.github.io/usfm/about/syntax.html

	/**
	 * Paragraph markers end with the next space character
	 */
	Paragraph,

	/**
	 * Character markers occur in pairs, marking a span of text within a paragraph.
	 */
	Character,

	/**
	 * Note markers also occur in pairs, marking the start and end of the footnote,
	 * cross reference, or study note content.
	 */
	Note,

	/**
	 * For marker pairs (character and note), the opening marker ends with the
	 * next space character (as with paragraph markers). The matching closing
	 * marker is identical to the opening marker but ends with an asterisk character *.
	 * Example: \w grace\w*.
	 */
};

const _regexpInt : RegExp = /^[0-9]+/;
const _markerDataRegexp : {
	[ index: string ] : RegExp;
} = {
	'c'   : _regexpInt,
	'v'   : _regexpInt,
	'sts' : _regexpInt,

	// you MUST include the leading ^ to ensure lexer works correctly!

	// id -> followed by book id, eg, GEN
	'id'  : /^[A-Za-z1-9]{3}/,

	// encoding, eg "UTF-16", "Custom (FONT.TTF)"
	'ide' : /^[A-Za-z1-9-]+|Custom \(\W+\)/,

	// footnote, followed by one of:
	// + (footnote number is generated)
	// - (footnote is not used)
	// . (a custom character used to reference the footnote)
	'f'   : /^[\+\-a-zA-Z0-9]/,

	// footnote chapter/verse reference, eg, 12:3
	'fr'  : /^\d+[:\.v]\d+/,
};

/**
 * Retrieves a regex representing the data that should follow a particular marker
 */
export function getMarkerDataRegexp(kind : string) : RegExp | undefined {
	// Never get data following a closing tag
	if(kind.endsWith('*')){ return undefined; }

	return _markerDataRegexp[kind];
}
