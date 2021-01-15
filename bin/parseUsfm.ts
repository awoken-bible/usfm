/**
 * Test script that converts a usfm file into json
 */

import * as AwokenUsfm from "../lib";

main()
	.then(process.exit)
	.catch((e) => {
		console.error("Top level exception caught!");
		console.error(e);
		process.exit(1);
	});

async function main() {
	let args : string[] = process.argv;

	if(args.length != 3){
		console.error("Error, bad usage, try: parseUsfmSty [INPUT_FILE]");
		return 1;
	}

	let data = await AwokenUsfm.parseFile(args[2]);

	console.log(JSON.stringify(data, null, 2));

	return 0;
}
