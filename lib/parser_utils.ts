import { Marker, IntOrRange } from './marker';

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
};

export type PushErrorFunction = (marker : Marker, message : string) => void;

/**
 * Parses an IntOrRange type
 */
export function parseIntOrRange(str: string) : IntOrRange | undefined{
	if (str.match(/^\d+$/)) {
		return parseInt(str);
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
