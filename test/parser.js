"use strict";

const chai     = require('chai');
const rewire   = require('rewire');
const expect   = chai.expect;

const { parse } = require('../src/parser.ts');
const lexer     = require('../src/lexer.ts').default;

const __parser__      = rewire('../src/parser.ts');
const bodyParser      = __parser__.__get__('bodyParser');
const sortStyleBlocks = __parser__.__get__('_sortStyleBlocks');

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

  describe('Body', () => {
    let text;
    it('Following chapter headers', () => {
      // Test to ensure that body can be picked out of chapters
      let text = `\\id GEN Test Bible3
                  \\c 1
                  \\p
                  \\v 1 Verse one text content is here.
                  \\v 2 Followed closely by verse 2.
                  \\p
                  \\v 3 We can even start new paragraphs.
                  \\c 2
                  \\v 1 Next chapter`;

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
                { min:  0, max: 59, kind: 'p' },
                { min:  0, max: 31, kind: 'v', data: { verse: 1 } },
                { min: 31, max: 59, kind: 'v', data: { verse: 2 } },
                { min: 59, max: 92, kind: 'p' },
                { min: 59, max: 92, kind: 'v', data: { verse: 3 } },
              ],
            }
          },
          { success: true,
            errors : [],
            chapter: 2,
            body   : {
              text: 'Next chapter',
              styling: [
                { min:  0, max: 12, kind: 'v', data: { verse: 1 } },
              ],
            }
          },
        ]
      });
    });

    it('Prose', () => {
      // Various types of paragraph, all should close all others,
      // and not affect flow of verses
      text = `\\p
              \\v 1 Hello World.
              \\pc Centered Text.
              \\pr Right Text.
              \\pmo
              \\v 2 Embedded opening.
              \\pm  Embedded content.
              \\pmc Embedded closing.
              \\v 3
              \\po  Letter opening.
              \\m   No indent.
              \\cls Letter closing.`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: 'Hello World.Centered Text.Right Text.Embedded opening.Embedded content.Embedded closing.Letter opening.No indent.Letter closing.',
        styling: sortStyleBlocks([
          { kind: 'v', min:  0, max:  37, data: { verse: 1 } },
          { kind: 'v', min: 37, max:  88, data: { verse: 2 } },
          { kind: 'v', min: 88, max: 128, data: { verse: 3 } },

          { kind: 'p',   min:   0, max:  12 },
          { kind: 'pc',  min:  12, max:  26 },
          { kind: 'pr',  min:  26, max:  37 },

          { kind: 'pmo', min:  37, max:  54 },
          { kind: 'pm',  min:  54, max:  71 },
          { kind: 'pmc', min:  71, max:  88 },

          { kind: 'po',  min:  88, max: 103 },
          { kind: 'm',   min: 103, max: 113 },
          { kind: 'cls', min: 113, max: 128 },
        ]),
      });

    });

    it('Poetry', () => {

      // Basic q tags
      // - multiple indentations
      // - interaction with p / v hierachies
      text = `\\p
              \\v 14 Yahweh God said to the serpent,
              \\q1 "Because you have done this,
              \\q2 you are cursed above all livestock,
              \\q2 and above every animal of the field.
              \\q1 You shall go on your belly
              \\q2 and you shall eat dust all the days of your life.
              \\q1
              \\v 15 I will put hostility between you and the woman,
              \\q2 and between your offspring and her offspring.
              \\q1 He will bruise your head,
              \\q2 and you will bruise his heel."
              \\p
              \\v 16 To the woman he said,
              \\q1 "I will greatly multiply your pain in childbirth.
              \\q2 You will bear children in pain.
              \\q1 Your desire will be for your husband,
              \\q2 and he will rule over you."`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: `Yahweh God said to the serpent,"Because you have done this,you are cursed above all livestock,and above every animal of the field.You shall go on your bellyand you shall eat dust all the days of your life.I will put hostility between you and the woman,and between your offspring and her offspring.He will bruise your head,and you will bruise his heel."To the woman he said,"I will greatly multiply your pain in childbirth.You will bear children in pain.Your desire will be for your husband,and he will rule over you."`,
        styling: sortStyleBlocks([
          { min:   0, max: 352, kind: 'p' },
          { min: 352, max: 517, kind: 'p' },

          { min:   0, max: 205, kind: 'v', data: { verse: 14 } },
          { min: 205, max: 352, kind: 'v', data: { verse: 15 } },
          { min: 352, max: 517, kind: 'v', data: { verse: 16 } },

          { min:  31, max:  59, kind: 'q', data: { indent: 1 } },
          { min:  59, max:  94, kind: 'q', data: { indent: 2 } },
          { min:  94, max: 130, kind: 'q', data: { indent: 2 } },
          { min: 130, max: 156, kind: 'q', data: { indent: 1 } },
          { min: 156, max: 205, kind: 'q', data: { indent: 2 } },

          { min: 205, max: 252, kind: 'q', data: { indent: 1 } },
          { min: 252, max: 297, kind: 'q', data: { indent: 2 } },
          { min: 297, max: 322, kind: 'q', data: { indent: 1 } },
          { min: 322, max: 352, kind: 'q', data: { indent: 2 } },

          { min: 373, max: 422, kind: 'q', data: { indent: 1 } },
          { min: 422, max: 453, kind: 'q', data: { indent: 2 } },
          { min: 453, max: 490, kind: 'q', data: { indent: 1 } },
          { min: 490, max: 517, kind: 'q', data: { indent: 2 } },
        ]),
      });

      // More complex q tags
      // - check qr closes q
      // - interaction with p / v hierachies
    });
  });
});
