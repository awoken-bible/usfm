import { Marker } from './marker';
import { StyleBlockBase, parseIntOrRange, PushErrorFunction, sortStyleBlocks } from './parser_utils';
import { IntOrRange } from './marker';
import { BibleRef } from 'awoken-bible-reference';

/**
 * Specifies the verse to which a footnote is making reference
 */
export interface StyleBlockFootnoteReference extends StyleBlockBase {
	kind: 'fr';

	/**
	 * The [[BibleRef]] to which this footnote is attached, callout to the actual note
	 * is normally rendered after this BibleRef
	 */
	ref: BibleRef
};

/**
 * Represents a new verse number within the text of a footnote
 */
export interface StyleBlockFootnoteVerse extends StyleBlockBase {
	kind: 'fv';
	verse: IntOrRange;
};

export interface StyleBlockFootnoteNoData extends StyleBlockBase {
	kind: (
		// footnote specific
		'fq' | 'fqa' | 'fk' | 'fl' | 'fw' | 'fp' | 'fv' | 'ft' | 'fdc' | 'fm' | 'bk' |

		// generic text formatting
		'nd' | 'ord' | 'pn' | 'png' | 'addpn' | 'qt' | 'sig' | 'sls' | 'tl' | 'wj' | 'em' | 'bd' | 'it' | 'bdit' | 'no' | 'sc' | 'sup' | 'w' | 'vp'
	);
};

export type StyleBlockFootnoteContent = ( StyleBlockFootnoteReference |
																					StyleBlockFootnoteVerse |
																					StyleBlockFootnoteNoData
																				);

export interface StyleBlockFootnote extends StyleBlockBase {
	// Either standard foot note, or "end note" (rendered at end of chapter)
	kind: 'f' | 'fe',

	// The caller string to use to link to the footnote
	caller: string,

	// The content of the footnote
	text: string,

	// Styling applied to the text of the footnote
	styling: StyleBlockFootnoteContent[],
}

/**
 * Parses a footnote
 * @private
 *
 * @param markers     - The array of markers to read from (IE: the lexed tokens)
 * @param pushError   - Function to use to indicate an error occured during parsing
 * @param m_idx       - Initial index in `markers` array to read from
 * @param book_id     - Name of current book being parsed, used to generate BibleRef instances
 * @param chapter_num - Current chapter being being parsed, used to generate BibleRef instances
 */
export function parseFootnote(markers: Marker[],
															pushError: PushErrorFunction,
															m_idx : number,
															book_id: string,
															chapter_num : number,
														 ) : [ number, StyleBlockFootnote, string ] {

	let open_kind = markers[m_idx].kind;
	if(open_kind !== 'f' && open_kind !== 'fe'){
		throw new Error("parseFootnote expects f or fe tag to start");
	}

	let caller : string = "";
	if(markers[m_idx].data === undefined){
		pushError(markers[m_idx], "Footnote opening marker must have data to specify caller type");
	} else {
		caller = markers[m_idx].data!;
	}

	let result : StyleBlockFootnote = {
		min: 0, max: 0,
		kind: open_kind,
		caller: caller,
		text: "",
		styling: [],
	};

	++m_idx;

	// maps marker kinds (eg p for \p) to the currently open block
	// of that type. Note that we cheat and group certain mutually exclusive tags
	// eg, a \qr marker (poetry right aligned) will automatically close as
	// \q1 marker (poetry left aligned, indent 1) tag, thus we store both
	// as simply 'q' in this map
	let cur_open : { [index: string] : StyleBlockFootnoteContent } = {};

	// utility function that closes a currently open block
	function closeTagType(kind : string, t_idx : number){
		if(cur_open[kind]){
			cur_open[kind].max = t_idx;
			result.styling.push(cur_open[kind]);
			delete cur_open[kind];
		}
	}

	for(; m_idx < markers.length; ++m_idx){
		let marker = markers[m_idx];

		if(marker.kind === 'f' || marker.kind === 'fe'){
			if(!marker.closing){
				pushError(marker, "Cannot open footnote environment inside another footnote");
				break;
			}
			if(marker.kind === open_kind){
				// Then this is a valid closing marker, no-op
			} else {
				pushError(marker, `Attempt to close footnote of type ${marker.kind} but within type ${open_kind}`);
			}
			break;
		}

		let t_idx = result.text.length;

		switch(marker.kind){
				////////////////////////////////////
				// Basic no data marker types
			case 'fq':
			case 'fqa':
			case 'fk':
			case 'fl':
			case 'fw':
			case 'fp':
			case 'ft':
				closeTagType('f', t_idx);
				result.text += marker.text || "";
				cur_open['f'] = {
					kind: marker.kind, min: t_idx, max: t_idx,
				};
				break;

				////////////////////////////////////
				// Paired markers
			case 'fdc':
			case 'fm':
			case 'bk':
				result.text += marker.text || "";
				if(marker.closing){
					if(cur_open[marker.kind] === undefined){
						pushError(marker, `Attempt to close paired makrer of kind ${marker.kind}, but the environment is not currently open`);
					} else {
						closeTagType(marker.kind, t_idx);
					}
				} else {
					cur_open[marker.kind] = {
						min: t_idx, max: t_idx, kind: marker.kind
					};
				}
				break;

				////////////////////////////////////
				// Generic text markers and formatting (deity name, bold, super, etc, etc)
				// (https://ubsicap.github.io/usfm/characters/index.html#special-text)
				// :TODO: -> code duplicated with main parser.ts
			case 'nd':
			case 'ord':
			case 'pn':
			case 'png':
			case 'addpn': // :TODO: this deprecated by usfm 3.0, should be mapped to \add \+pn ..... \+pn* \add*
			case 'qt':
			case 'sig':
			case 'sls':
			case 'tl':
			case 'wj':
			case 'em':
			case 'bd':
			case 'it':
			case 'bdit': // :TODO: map this to \bd \+it ... \+it* \bd*
			case 'no':
			case 'sc':
			case 'sup':
			case 'w':
			case 'vp':
				if(marker.closing){
					closeTagType(marker.kind, t_idx);
				} else {
					cur_open[marker.kind] = {
						min: t_idx, max: t_idx, kind: marker.kind,
						attributes: marker.attributes,
					};
				}
				break;



				////////////////////////////////////
				// Markers with data
			case 'fr':
				closeTagType('f', t_idx);

				if(marker.data === undefined){
					pushError(marker, "Expected data to be associated with fr marker");
					break;
				}
				let matches = marker.data.match(/^(\d+)[:\.v](\d+(-[0-9]+)?):?$/);

				if(!matches){
					throw new Error("CODE ERROR - fr marker data does not match expected format - please alter the regex in marker.ts accrodingly");
				}

				let chapter = parseInt       (matches[1]);
				let verse   = parseIntOrRange(matches[2])!;

				cur_open['f'] = {
					kind: 'fr',
					min: t_idx, max: t_idx,
					ref: (verse.is_range ?
								{ is_range : true,
									start    : { book: book_id, chapter: chapter, verse: verse.start },
									end      : { book: book_id, chapter: chapter, verse: verse.end },
								} :
								{ book: book_id, chapter: chapter, verse: verse.value }
							 ),
				};
				break;

			case 'fv':
				result.text += marker.text || "";
				if(marker.closing){
					if(cur_open[marker.kind] === undefined){
						pushError(marker, `Attempt to close paired makrer of kind ${marker.kind}, but the environment is not currently open`);
					} else {
						closeTagType(marker.kind, t_idx);
					}
				} else {
					if(marker.text){
						pushError(marker, "fv markers are not expected to have any text content, it will be skipped");
					}
					if(marker.data === undefined){
						pushError(marker, "fv markers are expected to have associated verse number as data");
						break;
					}
					let verse = parseIntOrRange(marker.data);
					if(verse === undefined){
						pushError(marker, "Unexpected format for data for fv marker, wanted int or int range, got: " + marker.data);
						break;
					}
					cur_open[marker.kind] = {
						kind: marker.kind, min: t_idx, max: t_idx, verse: verse,
					};
				}
				break;
			default:
				pushError(marker, "Skipping unexpected marker kind within footnote context, got: " + marker.kind);
				break;
		}
	}

	// Close all outstanding blocks implicity at end of footnote
	let max = result.text.length;
	for(let k of Object.keys(cur_open)){
		if(cur_open[k] == null){ continue; }
		cur_open[k].max = max;
		result.styling.push(cur_open[k]);
	}

	// Gather text outside of the footnote, but before the next marker
	let next_text : string = (markers[m_idx].text || "");

	sortStyleBlocks(result.styling);

	return [ m_idx, result, next_text ];
}
