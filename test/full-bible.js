"use strict";

const chai             = require('chai');
const fs               = require('fs');
const { execFileSync } = require('child_process');

const { lexer  }       = require('../lib/lexer.ts');
const { parse  }       = require('../lib/parser.ts');

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

  describe('lexer', () => {
    for(let f_path of fs.readdirSync(web_dir)){
      if(!f_path.endsWith('.usfm')){ continue; }
      let data = fs.readFileSync(web_dir + "/" + f_path).toString();
      it(f_path, () => {
        expect(() => Array.from(lexer(data))).to.not.throw();
      });
    }
  });

  describe('parser', () => {
    for(let f_path of fs.readdirSync(web_dir)){
      if(!f_path.endsWith('.usfm')){ continue; }
      let data = fs.readFileSync(web_dir + "/" + f_path).toString();
      it(f_path, () => {
        expect(() => parse(data)).to.not.throw();
        let result = parse(data);
        expect(result.errors).to.deep.equal([]);
        expect(result.success).to.deep.equal(true);
        for(let c of result.chapters){
          expect(c.success).to.deep.equal(true);
          expect(c.errors ).to.deep.equal([]);
          expect(c.body.text   ).to.exist;
          expect(c.body.text   ).to.not.be.empty;
          expect(c.body.styling).to.exist;
          expect(c.body.styling.length).to.exist;
          expect(c.body.styling).to.not.be.empty;
        }
      });
    }
  });
});
