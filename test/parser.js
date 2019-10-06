"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { parse } = require('../src/parser.ts');

let text;

describe('Parser', () => {
  it('Book Headers', () => {
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

  it('Chapter Headers', () => {
    let text = `\\id GEN Test Bible2
                \\cl Book Chapter Label
                \\c 1
                \\ca 2 \\ca*
                \\cp A
                \\c 2
                \\cl Chapter Label
                \\cd Here is some infomative text being used
to describe the contents of this chapter
               `;

    expect(parse(text)).to.deep.equal({
      success       : true,
      errors        : [],
      book_id       : 'GEN',
      id_text       : 'Test Bible2',
      toc           : {},
      toca          : {},
      major_title   : {},
      chapter_label : 'Book Chapter Label',
      chapters      : [
        { success: true,
          errors      : [],
          chapter     : 1,
          chapter_alt : 2,
          drop_cap    : 'A',
          body: { text: '', styling: [] },
        },
        { success: true,
          errors      : [],
          chapter     : 2,
          label       : 'Chapter Label',
          description : 'Here is some infomative text being used\nto describe the contents of this chapter',
          body: { text: '', styling: [] },
        },
      ],
    });
  });

  it('Body', () => {
    let text = `\\id GEN Test Bible3
                \\c 1
                \\p
                \\v 1 Verse one text content is here.
                \\v 2 Followed closely by verse 2.
                \\p
                \\v 3 We can even start new paragraphs.
               `;

    expect(parse(text)).to.deep.equal({
      success: true,
      errors : [],
      book_id: 'GEN',
      id_text: 'Test Bible3',
      toc: {},
      toca: {},
      major_title: {},
      chapters: [
        { success: true,
          errors : [],
          chapter: 1,
          body   : {
            text: 'Verse one text content is here.Followed closely by verse 2.We can even start new paragraphs.',
            styling: [
              { min:  0, max: 59,
                kind: 'p'
              },
              { min:  0, max: 31,
                kind: 'v',
                data: { verse: 1 },
              },
              { min: 31, max: 59,
                kind: 'v',
                data: { verse: 2 },
              },
              { min: 59, max: 92,
                kind: 'p'
              },
              { min: 59, max: 92,
                kind: 'v',
                data: { verse: 3 },
              },
            ],
          }
        },
      ]
    });

  });

});
