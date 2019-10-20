"use strict";

const chai     = require('chai');
const rewire   = require('rewire');
const expect   = chai.expect;

const { parse }       = require('../lib/parser.ts');
const lexer           = require('../lib/lexer.ts').default;
const sortStyleBlocks = require('../lib/parser_utils.ts').sortStyleBlocks;

const __parser__      = rewire('../lib/parser.ts');
const bodyParser      = __parser__.__get__('bodyParser');



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
          description : 'Here is some infomative text being used to describe the contents of this chapter',
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
                { min:  0, max: 31, kind: 'v', verse: 1 },
                { min: 31, max: 59, kind: 'v', verse: 2 },
                { min: 59, max: 92, kind: 'p' },
                { min: 59, max: 92, kind: 'v', verse: 3 },
              ],
            }
          },
          { success: true,
            errors : [],
            chapter: 2,
            body   : {
              text: 'Next chapter',
              styling: [
                { min:  0, max: 12, kind: 'v', verse: 1 },
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
          { kind: 'v', min:  0, max:  37, verse: 1 },
          { kind: 'v', min: 37, max:  88, verse: 2 },
          { kind: 'v', min: 88, max: 128, verse: 3 },

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

          { min:   0, max: 205, kind: 'v', verse: 14 },
          { min: 205, max: 352, kind: 'v', verse: 15 },
          { min: 352, max: 517, kind: 'v', verse: 16 },

          { min:  31, max:  59, kind: 'q', indent: 1 },
          { min:  59, max:  94, kind: 'q', indent: 2 },
          { min:  94, max: 130, kind: 'q', indent: 2 },
          { min: 130, max: 156, kind: 'q', indent: 1 },
          { min: 156, max: 205, kind: 'q', indent: 2 },

          { min: 205, max: 252, kind: 'q', indent: 1 },
          { min: 252, max: 297, kind: 'q', indent: 2 },
          { min: 297, max: 322, kind: 'q', indent: 1 },
          { min: 322, max: 352, kind: 'q', indent: 2 },

          { min: 373, max: 422, kind: 'q', indent: 1 },
          { min: 422, max: 453, kind: 'q', indent: 2 },
          { min: 453, max: 490, kind: 'q', indent: 1 },
          { min: 490, max: 517, kind: 'q', indent: 2 },
        ]),
      });

      // More complex markup
      text = `\\m
              \\qa Aleph
              \\m
              \\v 1 Hello World
              \\q1 Poetry line
              \\qr Right poetry
              \\qc Center poetry
              \\m
              \\qa Beth
              \\m
              \\q1
              \\v 2 Verse 2 opening
              \\q2 Indented
              \\qm3 Embedded
              \\v 3 Verse 3 opening
              \\q1 Hello \\qac B \\qac* en
              \\q2 Goodbye world \\qs Selah \\qs*`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: `AlephHello WorldPoetry lineRight poetryCenter poetryBethVerse 2 openingIndentedEmbeddedVerse 3 openingHello BenGoodbye world Selah`,
        styling: sortStyleBlocks([
          { min:   0, max:   5, kind: 'm'  },
          { min:   5, max:  52, kind: 'm'  },
          { min:  52, max:  56, kind: 'm'  },
          { min:  56, max: 130, kind: 'm'  },

          { min:   0, max:   5, kind: 'qa' },
          { min:  52, max:  56, kind: 'qa' },

          { min:   5, max:  56, kind: 'v',  verse: 1  },
          { min:  56, max:  87, kind: 'v',  verse: 2  },
          { min:  87, max: 130, kind: 'v',  verse: 3  },

          { min:  16, max:  27, kind: 'q',  indent: 1 },
          { min:  27, max:  39, kind: 'qr' },
          { min:  39, max:  52, kind: 'qc' },

          { min:  56, max:  71, kind: 'q',  indent: 1 },
          { min:  71, max:  79, kind: 'q',  indent: 2 },
          { min:  79, max: 102, kind: 'qm', indent: 3 },

          { min: 102, max: 111, kind: 'q',  indent: 1 },
          { min: 111, max: 130, kind: 'q',  indent: 2 },

          { min: 107, max: 109, kind: 'qac' },
          { min: 124, max: 130, kind: 'qs', },
        ]),
      });
    });

    it('Lists', () => {

      // https://ubsicap.github.io/usfm/lists/index.html#liv-liv
      text = `\\lh
              \\v 16-22 This is the list of the administrators of the tribes of Israel:
              \\li1 \\lik Reuben\\lik* \\liv1 Eliezer son of Zichri\\liv1*
              \\li1 \\lik Simeon\\lik* \\liv1 Shephatiah son of Maacah\\liv1*
              \\li1 \\lik Levi\\lik* \\liv1 Hashabiah son of Kemuel\\liv1*
              \\li1 \\lik Aaron\\lik* \\liv1 Zadok\\liv1*
              \\li1 \\lik Judah\\lik* \\liv1 Elihu, one of King David's brothers\\liv1*
              \\li1 \\lik Issachar\\lik* \\liv1 Omri son of Michael\\liv1*
              \\li1 \\lik Zebulun\\lik* \\liv1 Ishmaiah son of Obadiah\\liv1*
              \\li1 \\lik Naphtali\\lik* \\liv1 Jeremoth son of Azriel\\liv1*
              \\li1 \\lik Ephraim\\lik* \\liv1 Hoshea son of Azaziah\\liv1*
              \\li1 \\lik West Manasseh\\lik* \\liv1 Joel son of Pedaiah\\liv1*
              \\li1 \\lik East Manasseh\\lik* \\liv1 Iddo son of Zechariah\\liv1*
              \\li1 \\lik Benjamin\\lik* \\liv1 Jaasiel son of Abner\\liv1*
              \\li1 \\lik Dan\\lik* \\liv1 Azarel son of Jeroham\\liv1*
              \\lf This was the list of the administrators of the tribes of Israel.`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: "This is the list of the administrators of the tribes of Israel: ReubenEliezer son of Zichri SimeonShephatiah son of Maacah LeviHashabiah son of Kemuel AaronZadok JudahElihu, one of King David's brothers IssacharOmri son of Michael ZebulunIshmaiah son of Obadiah NaphtaliJeremoth son of Azriel EphraimHoshea son of Azaziah West ManassehJoel son of Pedaiah East ManassehIddo son of Zechariah BenjaminJaasiel son of Abner DanAzarel son of JerohamThis was the list of the administrators of the tribes of Israel.",
        styling: sortStyleBlocks([
          { kind: 'v',   min:   0, max: 507, verse: { is_range: true, start: 16, end: 22 } },

          { kind: 'list',       min:  0, max: 507, is_virtual: true },
          { kind: 'list_items', min: 63, max: 443, is_virtual: true },

          { kind: 'lh',  min:   0, max:  63 },

          { kind: 'li',  min:  63, max:  91, indent: 1 },
          { kind: 'lik', min:  63, max:  70 },
          { kind: 'liv', min:  70, max:  91, column: 1 },

          { kind: 'li',  min:  91, max: 122, indent: 1 },
          { kind: 'lik', min:  91, max:  98 },
          { kind: 'liv', min:  98, max: 122, column: 1 },

          { kind: 'li',  min: 122, max: 150, indent: 1 },
          { kind: 'lik', min: 122, max: 127 },
          { kind: 'liv', min: 127, max: 150, column: 1 },

          { kind: 'li',  min: 150, max: 161, indent: 1 },
          { kind: 'lik', min: 150, max: 156 },
          { kind: 'liv', min: 156, max: 161, column: 1 },

          { kind: 'li',  min: 161, max: 202, indent: 1 },
          { kind: 'lik', min: 161, max: 167 },
          { kind: 'liv', min: 167, max: 202, column: 1 },

          { kind: 'li',  min: 202, max: 230, indent: 1 },
          { kind: 'lik', min: 202, max: 211 },
          { kind: 'liv', min: 211, max: 230, column: 1 },

          { kind: 'li',  min: 230, max: 261, indent: 1 },
          { kind: 'lik', min: 230, max: 238 },
          { kind: 'liv', min: 238, max: 261, column: 1 },

          { kind: 'li',  min: 261, max: 292, indent: 1 },
          { kind: 'lik', min: 261, max: 270 },
          { kind: 'liv', min: 270, max: 292, column: 1 },

          { kind: 'li',  min: 292, max: 321, indent: 1 },
          { kind: 'lik', min: 292, max: 300 },
          { kind: 'liv', min: 300, max: 321, column: 1 },

          { kind: 'li',  min: 321, max: 354, indent: 1 },
          { kind: 'lik', min: 321, max: 335 },
          { kind: 'liv', min: 335, max: 354, column: 1 },

          { kind: 'li',  min: 354, max: 389, indent: 1 },
          { kind: 'lik', min: 354, max: 368 },
          { kind: 'liv', min: 368, max: 389, column: 1 },

          { kind: 'li',  min: 389, max: 418, indent: 1 },
          { kind: 'lik', min: 389, max: 398 },
          { kind: 'liv', min: 398, max: 418, column: 1 },

          { kind: 'li',  min: 418, max: 443, indent: 1 },
          { kind: 'lik', min: 418, max: 422 },
          { kind: 'liv', min: 422, max: 443, column: 1 },

          { kind: 'lf',  min: 443, max: 507 },
        ]),
      });


      // https://ubsicap.github.io/usfm/lists/index.html#litl-litl
      text = `\\b
              \\pm The list of the men of Israel:
              \\b
              \\lim1
              \\v 8 the descendants of Parosh - \\litl 2,172\\litl*
              \\lim1
              \\v 9 of Shephatiah - \\litl 372\\litl*
              \\lim1
              \\v 10 of Arah - \\litl 652\\litl*
              \\lim1
              \\v 11 of Pahath-Moab (through the line of Jeshua and Joab) - \\litl 2,818\\litl*
              \\lim1
              \\v 12 of Elam - \\litl 1,254\\litl*
              \\lim1
              \\v 13 of Zattu - \\litl 845\\litl*
              \\lim1
              \\v 14 of Zaccai - \\litl 760\\litl*`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: "The list of the men of Israel:the descendants of Parosh - 2,172of Shephatiah - 372of Arah - 652of Pahath-Moab (through the line of Jeshua and Joab) - 2,818of Elam - 1,254of Zattu - 845of Zaccai - 760",
        styling: sortStyleBlocks([
          { kind: 'b',  min:   0, max:   0 },
          { kind: 'b',  min:  30, max:  30 },

          { kind: 'pm', min:   0, max:  30 },

          { kind: 'list',       min:  30, max: 199, is_virtual: true },
          { kind: 'list_items', min:  30, max: 199, is_virtual: true },

          { kind: 'v',    min:  30, max:  63, verse: 8 },
          { kind: 'lim',  min:  30, max:  63, indent: 1 },
          { kind: 'litl', min:  57, max:  63 },

          { kind: 'v',    min:  63, max:  82, verse: 9 },
          { kind: 'lim',  min:  63, max:  82, indent: 1 },
          { kind: 'litl', min:  78, max:  82 },

          { kind: 'v',    min:  82, max:  95, verse: 10 },
          { kind: 'lim',  min:  82, max:  95, indent: 1 },
          { kind: 'litl', min:  91, max:  95 },

          { kind: 'v',    min:  95, max: 155, verse: 11 },
          { kind: 'lim',  min:  95, max: 155, indent: 1 },
          { kind: 'litl', min: 149, max: 155 },

          { kind: 'v',    min: 155, max: 170, verse: 12 },
          { kind: 'lim',  min: 155, max: 170, indent: 1 },
          { kind: 'litl', min: 164, max: 170 },

          { kind: 'v',    min: 170, max: 184, verse: 13 },
          { kind: 'lim',  min: 170, max: 184, indent: 1 },
          { kind: 'litl', min: 180, max: 184 },

          { kind: 'v',    min: 184, max: 199, verse: 14 },
          { kind: 'lim',  min: 184, max: 199, indent: 1 },
          { kind: 'litl', min: 195, max: 199 },
        ]),
      });

    });

    it('Table', () => {
      // Numbers 7:12-83 adapted to make test case more complex
      text = `\\p
              \\v 12-83 They presented their offerings in the following order:
              \\tr \\th1 Day  \\thr2 Tribe    \\th3 Leader
              \\tr \\tc1 1st  \\tcr2 Judah    \\tc3 Nahshon son of Amminadab
              \\tr \\tc1 2nd  \\tcr2 Issachar \\tc3 Nethanel son of Zuar
              \\tr \\tc1 3rd  \\tcr2 Zebulun  \\tc3 Eliab son of Helon
              \\tr \\tc1 4th  \\tcr2 Reuben   \\tc3 Elizur son of Shedeur
              \\tr \\tc1 5th  \\tcr2 Simeon   \\tc3 Shelumiel son of Zurishaddai
              \\tr \\tc1-3 Spanning text
              \\tr \\tc1 Goes \\tc2-3 Here
              \\p
              \\v 84 Paragraph should close table`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: "They presented their offerings in the following order:DayTribeLeader1stJudahNahshon son of Amminadab2ndIssacharNethanel son of Zuar3rdZebulunEliab son of Helon4thReubenElizur son of Shedeur5thSimeonShelumiel son of ZurishaddaiSpanning textGoesHereParagraph should close table",
        styling: sortStyleBlocks([
          { kind: 'v',    min:   0, max: 247, verse: { is_range: true, start: 12, end: 83 } },
          { kind: 'v',    min: 247, max: 275, verse: 84 },

          { kind: 'p',    min:   0, max:  54 },
          { kind: 'p',    min: 247, max: 275 },

          { kind: 'table', min:  54, max:  247, is_virtual: true },

          { kind: 'tr',   min:  54, max:  68 },
          { kind: 'th',   min:  54, max:  57, column: 1 },
          { kind: 'thr',  min:  57, max:  62, column: 2 },
          { kind: 'th',   min:  62, max:  68, column: 3 },

          { kind: 'tr',   min:  68, max: 100 },
          { kind: 'tc',   min:  68, max:  71, column: 1 },
          { kind: 'tcr',  min:  71, max:  76, column: 2 },
          { kind: 'tc',   min:  76, max: 100, column: 3 },

          { kind: 'tr',   min: 100, max: 131 },
          { kind: 'tc',   min: 100, max: 103, column: 1 },
          { kind: 'tcr',  min: 103, max: 111, column: 2 },
          { kind: 'tc',   min: 111, max: 131, column: 3 },

          { kind: 'tr',   min: 131, max: 159 },
          { kind: 'tc',   min: 131, max: 134, column: 1 },
          { kind: 'tcr',  min: 134, max: 141, column: 2 },
          { kind: 'tc',   min: 141, max: 159, column: 3 },

          { kind: 'tr',   min: 159, max: 189 },
          { kind: 'tc',   min: 159, max: 162, column: 1 },
          { kind: 'tcr',  min: 162, max: 168, column: 2 },
          { kind: 'tc',   min: 168, max: 189, column: 3 },

          { kind: 'tr',   min: 189, max: 226 },
          { kind: 'tc',   min: 189, max: 192, column: 1 },
          { kind: 'tcr',  min: 192, max: 198, column: 2 },
          { kind: 'tc',   min: 198, max: 226, column: 3 },

          { kind: 'tr',   min: 226, max: 239 },
          { kind: 'tc',   min: 226, max: 239, column: { is_range: true, start: 1, end: 3 } },

          { kind: 'tr',   min: 239, max: 247 },
          { kind: 'tc',   min: 239, max: 243, column: 1 },
          { kind: 'tc',   min: 243, max: 247, column: { is_range: true, start: 2, end: 3 } },
        ]),
      });
    });

    it('Footnote', () => {
      text = `\\f + \\ft Hello world \\f*`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: '',
        styling: [
          { kind: 'f',
            min: 0, max: 0,
            caller: '+',
            text: 'Hello world',
            styling: [
              { kind: 'ft', min: 0, max: 11 },
            ]
          },
        ],
      });


      text = `\\p
              \\v 1 Verse text \\f a \\ft Footnote content \\f* can surround the footnote
              \\v 2 Here is the next verse`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: 'Verse text can surround the footnoteHere is the next verse',
        styling: [
          { kind: 'p', min:  0, max: 58 },
          { kind: 'v', min:  0, max: 36, verse: 1 },


          { kind: 'f',
            min: 10, max: 10,
            caller: 'a',
            text: 'Footnote content',
            styling: [
              { kind: 'ft', min: 0, max: 16 },
            ]
          },

          { kind: 'v', min: 36, max: 58, verse: 2 },
        ],
      });

      // https://ubsicap.github.io/usfm/notes_basic/fnotes.html#fr
      text = `\\p
              \\v 37 On the last and most important day of the festival Jesus stood up and said in a loud voice, “Whoever is thirsty should come to me, and
              \\v 38 whoever believes in me should drink. As the scripture says, ‘Streams of life-giving water will pour out from his side.’” \\f + \\fr 7.38: \\ft Jesus' words in verses 37-38 may be translated: \\fqa “Whoever is thirsty should come to me and drink. \\fv 38\\fv* As the scripture says, ‘Streams of life-giving water will pour out from within anyone who believes in me.’”\\f*`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: 'On the last and most important day of the festival Jesus stood up and said in a loud voice, “Whoever is thirsty should come to me, andwhoever believes in me should drink. As the scripture says, ‘Streams of life-giving water will pour out from his side.’”',
        styling: sortStyleBlocks([
          { kind: 'p', min:   0, max: 254 },
          { kind: 'v', min:   0, max: 134, verse: 37 },
          { kind: 'v', min: 134, max: 254, verse: 38 },

          { kind: 'f', min: 254, max: 254, caller: '+',
            text: `Jesus' words in verses 37-38 may be translated:“Whoever is thirsty should come to me and drink.As the scripture says, ‘Streams of life-giving water will pour out from within anyone who believes in me.’”`,
            styling: [
              { kind: 'ft',  min:   0, max:  47 },
              { kind: 'fr',  min:   0, max:   0, chapter: 7, verse: 38 },
              { kind: 'fqa', min:  47, max: 202 },
              { kind: 'fv',  min:  95, max:  95, verse: 38},
            ],
          },
        ])
      });

      // Adapted: https://ubsicap.github.io/usfm/notes_basic/fnotes.html#fk
      text = `\\p
              \\v 20 Adam \\fe + \\fr 3.20: \\fk Adam: \\ft This name in Hebrew means “all human beings.”\\fe* named his wife Eve, \\f + \\fr 3.20: \\fk Eve: \\ft This name sounds similar to the Hebrew word for “living,” which is rendered in this context as “human beings.”\\f* because she was the mother of all human beings.
              \\v 21 And the Lord God made clothes out of animal skins for Adam and his wife, and he clothed them.`;

      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: `Adam named his wife Eve, because she was the mother of all human beings.And the Lord God made clothes out of animal skins for Adam and his wife, and he clothed them.`,
        styling: [
          { kind: 'p', min:   0, max: 165 },
          { kind: 'v', min:   0, max:  72, verse: 20 },

          { kind: 'fe', min: 4, max: 4, caller: '+',
            text: `Adam:This name in Hebrew means “all human beings.”`,
            styling: [
              { kind: 'fk', min:   0, max:   5 },
              { kind: 'fr', min:   0, max:   0, chapter: 3, verse: 20 },
              { kind: 'ft', min:   5, max:  50 },
            ],
          },

          { kind: 'f', min: 24, max: 24, caller: '+',
            text: `Eve:This name sounds similar to the Hebrew word for “living,” which is rendered in this context as “human beings.”`,
            styling: [
              { kind: 'fk', min:   0, max:   4 },
              { kind: 'fr', min:   0, max:   0, chapter: 3, verse: 20 },
              { kind: 'ft', min:   4, max: 114 },
            ],
          },

          { kind: 'v', min:  72, max: 165, verse: 21 },
        ],
      });
    });

    it('Cross Reference', () => {
      text = `\\x + \\xo 20:43 \\xt Psalm 110:1\\x*`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: '',
        styling: [{
          kind: 'x', min: 0, max: 0,
          caller:  '+',
          text: '20:43Psalm 110:1',
          styling: [
            { kind: 'xo', min: 0, max:  5 },
            { kind: 'xt', min: 5, max: 16 },
          ],
        }]
      });


      text = `\\v 27 He answered, "You shall love the Lord your God with all your heart, with all your soul, with all your strength, and with all your mind;\\x a \\xo 10:27  \\xt Deuteronomy 6:5\\x* and your neighbor as yourself."\\x - \\xot \\xo 10:27  \\xt Leviticus 19:18 \\xot* \\x*
`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: 'He answered, "You shall love the Lord your God with all your heart, with all your soul, with all your strength, and with all your mind; and your neighbor as yourself."',
        styling: [
          { kind: 'v', min: 0, max: 167, verse: 27 },

          { kind: 'x', min: 135, max: 135,
            caller:  'a',
            text: '10:27Deuteronomy 6:5',
            styling: [
              { kind: 'xo', min: 0, max:  5 },
              { kind: 'xt', min: 5, max: 20 },
            ],
          },

          { kind: 'x', min: 167, max: 167,
            caller:  '-',
            text: '10:27Leviticus 19:18',
            styling: [
              { kind: 'xot', min: 0, max: 20 },
              { kind: 'xo',  min: 0, max:  5 },
              { kind: 'xt',  min: 5, max: 20 },
            ],
          },
        ]
      });

    });

    it('Word level attributes', () => {
      text = `\\p
              \\v 1 Text \\nd LORD \\nd* here`;
      expect(bodyParser(Array.from(lexer(text)))).to.deep.equal({
        text: 'Text LORDhere',
        styling: [
          { kind: 'p',  min: 0, max: 13 },
          { kind: 'v',  min: 0, max: 13, verse: 1 },
          { kind: 'nd', min: 4, max:  9 },
        ]
      });
    });
  });
});
