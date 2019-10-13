import { Marker } from './marker';
import { StyleBlockBase, parseIntOrRange, PushErrorFunction } from './parser_utils';

export interface StyleBlockFootnoteReference extends StyleBlockBase {
	kind: 'fr';
	chapter: number;
	verse  : number | { is_range: true, start: number, end: number };
};

export interface StyleBlockFootnoteVerse extends StyleBlockBase {
	kind: 'fv';
	verse: number | { is_range: true, start: number, end: number };
};

export interface StyleBlockFootnoteNoData extends StyleBlockBase {
	kind: 'fq' | 'fqa' | 'fk' | 'fl' | 'fw' | 'fp' | 'fv' | 'ft' | 'fdc' | 'fm';
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

export function parseFootnote(markers: Marker[],
															pushError: PushErrorFunction,
															m_idx : number
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
				break;


				////////////////////////////////////
				// Markers with data
			case 'fr':
				closeTagType('f', t_idx);

				if(marker.data === undefined){
					pushError(marker, "Expected data to be associated with fr marker");
					break;
				}

				let parts = marker.data.split(':');
				if(parts.length !== 2){
					pushError(marker, "Expected fr to have data of the form CHAPTER:VERSE");
					break;
				}

				let chapter = parseInt       (parts[0]);
				let verse   = parseIntOrRange(parts[1]);

				if(verse === undefined){
					pushError(marker, `Expected fr's verse data to be single int, or integer range, got: ${parts[1]}`);
					break;
				}

				cur_open['f'] = {
					kind: 'fr', min: t_idx, max: t_idx, chapter: chapter, verse: verse
				};
				break;

			case 'fv':
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
	if(next_text.length){ next_text = " " + next_text; }

	return [ m_idx, result, next_text ];
}
