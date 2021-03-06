"use strict";

const chai             = require('chai');
const fs               = require('fs');
const { execFileSync } = require('child_process');

const { lexer  }       = require('../lib/lexer.ts');
const { parse  }       = require('../lib/parser.ts');

const expect           = chai.expect;

// English
testFullBible('https://ebible.org/Scriptures/engwebpb_usfm.zip', 'web');
testFullBible('https://ebible.org/Scriptures/eng-asv_usfm.zip',  'asv');
testFullBible('https://ebible.org/Scriptures/eng-kjv_usfm.zip',  'kjv');
testFullBible('https://ebible.org/Scriptures/engoebcw_usfm.zip', 'oeb');
testFullBible('https://ebible.org/Scriptures/engwmb_usfm.zip',   'wmb');
testFullBible('https://ebible.org/Scriptures/eng-t4t_usfm.zip',  't4t');

// This uses \ms tag in book header content. Accoridng to default.sty, \ms can only occur within a chapter body, so this is malformed
// testFullBible('https://ebible.org/Scriptures/engULB_usfm.zip', 'ulb');

// Ancient text
testFullBible('https://ebible.org/Scriptures/hbo_usfm.zip', 'hbo'); // Hebrew Masoretic Old Testemant
testFullBible('https://ebible.org/Scriptures/grcmt_usfm.zip', 'grcmt'); // Greek Majority Text NT
testFullBible('https://ebible.org/Scriptures/grctr_usfm.zip', 'grctr'); // Greek Textus Receptus w/ annotations

// This has no content for Proverbs chapter 30 (the USFM literally has "\c 30" "\c 31" on subsequent
// lines - this triggers our tests, so we don't run them
//testFullBible('https://ebible.org/Scriptures/grcbrent_usfm.zip', 'grcbrent'); // Brenton Septuagint

function testFullBible(download_url, version_id){
  let data_dir = __dirname + "/data";
  let usfm_dir  = data_dir + "/" + version_id;

  if(!fs.existsSync(usfm_dir)){
    fs.mkdirSync(usfm_dir);
  }

  if(fs.readdirSync(usfm_dir).length < 10){
    let path = usfm_dir + "/usfm.zip";

    console.log(`Downloading ${version_id} for full bible tests...`);
    execFileSync('wget', [download_url, '-O', path]);

    console.log("Unzipping...");
    execFileSync('unzip', [path, '-d', usfm_dir]);
    execFileSync('rm',    [path]);

    console.log("Download complete, proceeding with tests...");
  }

  describe(`full-bible-${version_id}`, () => {

    describe('lexer', () => {
      for(let f_path of fs.readdirSync(usfm_dir)){
        if(!f_path.endsWith('.usfm')){ continue; }
        let data = fs.readFileSync(usfm_dir + "/" + f_path).toString();
        it(f_path, () => {
          expect(() => Array.from(lexer(data))).to.not.throw();
        });
      }
    });

    describe('parser', () => {
      for(let f_path of fs.readdirSync(usfm_dir)){
        if(!f_path.endsWith('.usfm')){ continue; }

        // We can't currently parse extra frontmatter material (since it doesn't follow standard
        // bible text structure) (:TODO: implement this: https://ubsicap.github.io/usfm/introductions/index.html?highlight=imt#)
        if(f_path.startsWith('00-FRT')){ continue; }

        let data = fs.readFileSync(usfm_dir + "/" + f_path).toString();
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
}
