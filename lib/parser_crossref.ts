import { Marker } from './marker';
import { StyleBlockBase, parseIntOrRange, PushErrorFunction, sortStyleBlocks } from './parser_utils';

export interface StyleBlockCrossRefNoData extends StyleBlockBase {
	kind: 'xk' | 'xq' | 'xt' | 'xo' | 'xta' | 'xop' | 'xot' | 'xnt' | 'xdc' | 'rq';
};

export type StyleBlockCrossRefContent = ( StyleBlockCrossRefNoData );

export interface StyleBlockCrossRef extends StyleBlockBase {
	// Either standard foot note, or "end note" (rendered at end of chapter)
	kind: 'x',

	// The caller string to use to link to the footnote
	caller: string,

	// The content of the footnote
	text: string,

	// Styling applied to the text of the footnote
	styling: StyleBlockCrossRefContent[],
}

export function parseCrossRef(markers: Marker[],
															pushError: PushErrorFunction,
															m_idx : number
														 ) : [ number, StyleBlockCrossRef, string ] {

	let open_kind = markers[m_idx].kind;
	if(open_kind !== 'x'){
		throw new Error("parseCrossRef expects x tag to start");
	}

	let caller : string = "";
	if(markers[m_idx].data === undefined){
		pushError(markers[m_idx], "Cross reference opening marker must have data to specify caller type");
	} else {
		caller = markers[m_idx].data!;
	}

	let result : StyleBlockCrossRef = {
		min: 0, max: 0,
		kind: 'x',
		caller: caller,
		text: "",
		styling: [],
	};

	++m_idx;

	// maps marker kinds (eg p for \p) to the currently open block
	let cur_open : { [index: string] : StyleBlockCrossRefContent } = {};

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

		if(marker.kind === 'x'){
			if(!marker.closing){
				pushError(marker, "Cannot open cross reference environment inside another cross reference");
				break;
			}
			break;
		}

		let t_idx = result.text.length;

		switch(marker.kind){
				////////////////////////////////////
				// Basic no data marker types
			case 'xk':
			case 'xq':
			case 'xo':
			case 'xt':
			case 'xta':
				closeTagType('x', t_idx);
				result.text += marker.text || "";
				cur_open['x'] = {
					kind: marker.kind, min: t_idx, max: t_idx,
				};
				break;

				////////////////////////////////////
				// Paired markers
			case 'xop':
			case 'xot':
			case 'xnt':
			case 'xdc':
			case 'rq':
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

	sortStyleBlocks(result.styling);

	return [ m_idx, result, next_text ];
}
