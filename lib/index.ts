import { readFile } from 'fs';

import { parse, ParseResultBook, ParseResultBody } from './parser';

export { parse, ParseResultBook, ParseResultBody };

/**
 * Yields a promise which eventually resolves to the parsed content for
 * some file
 */
export function parseFile(path : string) : Promise<ParseResultBook> {
	return new Promise((resolve, reject) => {
		readFile(path, (err, data) => {
			if(err){ return reject(err); }

			return resolve(parse(data.toString()));
		});
	});
}
