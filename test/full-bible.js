"use strict";

const chai             = require('chai');
const fs               = require('fs');
const { execFileSync } = require('child_process');

const { lexer }        = require('../lib/lexer.ts');

const expect           = chai.expect;

let data_dir = __dirname + "/data";
let web_dir  = data_dir + "/web";

if(!fs.existsSync(web_dir)){
  fs.mkdirSync(web_dir);
}

if(!fs.existsSync(web_dir + "/02-GENengwebpb.usfm")){
  let web_url = "https://ebible.org/Scriptures/engwebpb_usfm.zip";
  let path = web_dir + "/usfm.zip";

  console.log("Downloading world english bible for full bible tests...");
  execFileSync('wget', [web_url, '-O', path]);

  console.log("Unzipping...");
  execFileSync('unzip', [path, '-d', web_dir]);
  execFileSync('rm',    [path]);

  console.log("Download complete, proceeding with tests...");
}

describe('full-bible-web', () => {
  for(let f_path of fs.readdirSync(web_dir)){
    if(!f_path.endsWith('.usfm')){ continue; }
    let data = fs.readFileSync(web_dir + "/" + f_path).toString();
    it(f_path, () => {
      expect(() => Array.from(lexer(data))).to.not.throw();
    });
  }
});
