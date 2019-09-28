"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { lexer } = require('../src/lexer.ts');

let text;

describe("lexer", () => {
  it('Simple Iterator', () => {
    let it = lexer('\\id GEN Test Text');
    expect(it.next()).to.deep.equal(({
      done: false,
      value: {
        kind  : 'id',
        data  : 'GEN',
        text  : 'Test Text'
      },
    }));
    expect(it.next()).to.deep.equal(({
      done: true,
      value: undefined,
    }));

    it = lexer('\\id GEN Test Text\n\n\\ide UTF-8');
    expect(it.next()).to.deep.equal(({
      done: false,
      value: {
        kind  : 'id',
        data  : 'GEN',
        text  : 'Test Text'
      },
    }));
    expect(it.next()).to.deep.equal(({
      done: false,
      value: {
        kind  : 'ide',
        data  : 'UTF-8',
      },
    }));
    expect(it.next()).to.deep.equal(({
      done: true,
      value: undefined,
    }));
  });

  it('Footnotes', () => {
    text = '\\f + \\fk Issac:\\ft In Hebrew means "laughter"\\f*"';
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'f', data: '+' },
      { kind: 'fk', text: 'Issac:' },
      { kind: 'ft', text: 'In Hebrew means "laughter"' },
      { kind: 'f*' },
    ]);

    text = "\\v 1 In the beginning, God\\f + \\fr 1:1  \\ft The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).\\f* created the heavens and the earth.";
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'v',  data: '1', text: 'In the beginning, God' },
      { kind: 'f',  data: '+' },
      { kind: 'fr', data: '1:1' },
      { kind: 'ft', text: 'The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).' },
      { kind: 'f*', text: 'created the heavens and the earth.' },
    ]);
  });

  it('World English Bible Extracts', () => {
    text = `\\id GEN World English Bible (WEB)
            \\ide UTF-8
            \\h Genesis
            \\toc1 The First Book of Moses, Commonly Called Genesis
            \\toc2 Genesis
            \\toc3 Genesis
            \\mt2 The First Book of Moses,
            \\mt3 Commonly Called
            \\mt1 Genesis
            \\c 1
            \\p
            \\v 1 In the beginning, God created the heavens and the earth.\n`;

    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'id',            data: 'GEN', text: 'World English Bible (WEB)' },
      { kind: 'ide',           data: 'UTF-8'},
      { kind: 'h',             text: 'Genesis' },
      { kind: 'toc', level: 1, text: 'The First Book of Moses, Commonly Called Genesis' },
      { kind: 'toc', level: 2, text: 'Genesis' },
      { kind: 'toc', level: 3, text: 'Genesis' },
      { kind: 'mt',  level: 2, text: 'The First Book of Moses,' },
      { kind: 'mt',  level: 3, text: 'Commonly Called' },
      { kind: 'mt',  level: 1, text: 'Genesis' },
      { kind: 'c', data: '1' },
      { kind: 'p' },
      { kind: 'v', data: '1', text: 'In the beginning, God created the heavens and the earth.' },
    ]);
  });
});
