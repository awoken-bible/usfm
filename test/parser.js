"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { parse } = require('../src/parser.ts');

let text;

describe('Parser', () => {
  it('Headers', () => {
    let text = `\\id GEN Test Bible
                \\ide UTF-8
                \\toc1 Test Book
                \\toca2 Short Alt
                \\mt Hello World
               `;

    expect(parse(text)).to.deep.equal({
      success     : true,
      errors      : [],
      book_id     : 'GEN',
      id_text     : 'Test Bible',
      encoding    : 'UTF-8',
      toc         : { long_text: 'Test Book' },
      toca        : { short_text: 'Short Alt' },
      major_title : { 1 : "Hello World" },
      chapters    : [],
    });
  });
});
