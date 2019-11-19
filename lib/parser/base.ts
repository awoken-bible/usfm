/**
 * Defines a base class for parsers, where derived classes are able
 * to handle some subset of markers
 */
import { StyleBlockBase } from './parser_utils.ts';

/**
 * Resulting object produced by a Parser
 */
interface ParserResult<T extends StyleBlockBase> {
	text    : string;
	styling : T[];
	errors  : ParseError[];
}

/**
 * Set of functions which may be used by a ParserMarkerHandler
 * during the parsing operation
 */
class ParserMethods<T extends StyleBlockBase> extends ParserResult<T> {
	constructor(){
		this.text    = "";
		this.styling = [];
		this.errors  = [];

		this.parsing_completed   = false;
		this.consume_last_marker = false;
	}

	public parsing_completed   : boolean;
	public consume_last_marker : boolean;

	/**
	 * Maps `category` strings to the currently open
	 * style block
	 */
	public cur_open : { [string: index] => T };

	/**
	 * Opens a new styling block of a particular category, after
	 * first closing any existing style block in the same category
	 *
	 * Note that the `category` should be derived from, but may not equal,
	 * the `marker.kind` field. This is to allow for grouping together all
	 * mutually exclusive markers together. For example both "p" (paragraph) and
	 * "m" (margin paragraph) markers will be grouped into the "p" `category`,
	 * such that opening a "m" style block closes a currently open "p" style block
	 *
	 * @param style - The values of the style block, with the exception of the
	 * `max` field which is expected to have a dummy value to be later filled
	 * in by the `closeStyleBlock` method
	 */
	openStyleBlock(category: string, style: T) : void {

	}

	/**
	 * Closes a currently open but as of yet unclosed style block
	 * @param category - String representing style group
	 * @param t_idx    - Value for `max` of the style block
	 */
	closeStyleBlock(category: string, t_idx: number) : void {

	}

	pushError(marker: Marker, message: string) : void{
		this.errors.push({ marker, message });
	}

	/**
	 * Stops the current `performParse` loop
	 * @param consume_current - If true then the marker passed into the handler
	 * should be considered to have been successfully processed and consumed.
	 * Else it will still be considered for parsing by a subsequent `performParse`
	 * call
	 */
	stopParse(boolean: consume_current) : void {
		this.parsing_complete = true;
		this.consume_last_marker = consume_current;
	}
}

/**
 * Function which does the work of processing the next Marker in a sequence
 * produced by some lexer in order to build up a ParserResult object
 *
 * @param this   - set of utility methods to help build up the result object
 *                 (also includes the actual fields of the result)
 * @param marker - The next marker in the sequence to be parsed
 *
 * @return True if the handler was able to deal with the marker, else false
 */
export type ParserMarkerHandler<T> = (
	this: ParserMethods<T>,
	marker: Marker
) => boolean;


/**
 * Performs a parsing operation by repeatedly calling the handler(s)
 * for each marker in the sequence
 *
 * @param handler - handler function, or array of functions, in which
 *                  case they will be called in turn until the first
 *                  handler is able to deal with the marker
 * @param makers  - Array of markers to be parsed
 * @param m_idx   - The index of the marker at which to start parsing
 *                - (if undefined, will default to 0)
 *
 * @return Index of the next marker to be parsed. Will equal markers.length
 * if every input marker could be parsed before the handlers indicated
 * parse was complete
 */
function performParse<T extends StyleBlockBase>(
	handler: ParserMarkerHandler<T> | ParserMarkerHandler<T>[],
	markers: Marker[],
	m_idx? : number,
) : number {

	if(m_idx === undefined){ m_idx = 0; }

	let methods = new ParserMethods<T>();

	let h_func : ParserMarkerHandler<T> = (
		handler.length ? _combineParserHandlers(handler) : handler
	).bind(methods);

	for(; !methods.parsing_complete && m_idx < markers.length; ++m_idx){
		h_func(markers[m]);
	}

	if(methods.consume_last_marker){ ++m_idx; }

	// Close all outstanding blocks implicity upon parser completion
	let max = methods.text.length;
	for(let k of Object.keys(methods.cur_open)){
		methods.closeStyleBlock(k, max);
	}

	sortStyleBlocks(result.styling);
	return result;

	return m_idx;
}

/**
 * Combines a set of ParserMarkerHandler functions such that each is called in
 * turn until the first is able to handle the marker
 */
function _combineParserHandlers(handlers: ParserMarkerHandler<T>[]) => ParserMarkerHandler<T> {
	return function(this: ParserMethods, marker: Marker){
		for(let h of handlers){
			if(h(this, marker)){ return true; }
		}
		return false;
	}
}
