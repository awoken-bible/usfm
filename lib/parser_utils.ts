import { Marker, MarkerAttributes, IntOrRange } from './marker';

/**
 * Represents an error message produced by the parser
 */
export type ParserError = {
	message : string,
	marker  : Marker,
};

/**
 * Base type for all StyleBlocks
 */
export interface StyleBlockBase {
	/**
	 * Minimum extent of the styling as expressed in "gap index" (gap 0 is before
	 * first character, gap 1 is after first character, thus a StyleBlock from 0
	 * to 1 applies to just the first character)
	 */
	min : number;

	/*
	 * Maximum extent of the styling as expressed in "gap index"
	 */
	max : number;

	/**
	 * Raw attribute strings associated with opening marker for this
	 * style block
	 */
	attributes? : MarkerAttributes,
};

export type PushErrorFunction = (marker : Marker, message : string) => void;

/**
 * Parses an IntOrRange type
 */
export function parseIntOrRange(str: string) : IntOrRange | undefined{
	if (str.match(/^\d+$/)) {
		return { is_range: false, value: parseInt(str) };
	} else if (str.match(/^\d+-\d+$/)) {
		let parts = str.split('-');
		return  { is_range : true,
							start    : parseInt(parts[0]),
							end      : parseInt(parts[1]),
						};
	} else {
		return undefined;
	}
}


export function sortStyleBlocks<T extends StyleBlockBase & { kind: string }>(styling : T[]) : T[] {
	styling.sort((a,b) => {
		if(a.min === b.min){
			if(b.max == a.max){
				// :TODO: this isn't really nessacery, except for ensuring fully
				// consistant sort order for unit tests
				// (without this blocks with same min and max are indistinguishable,
				//  so sorting depends on input order)
				return a.kind.localeCompare(b.kind);
			} else {
				return b.max - a.max;
			}
		}
		return a.min - b.min;
	});
	return styling;
}
