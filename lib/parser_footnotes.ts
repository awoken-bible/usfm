import { Marker } from './marker';
import { StyleBlockBase } from './parser_types';

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
