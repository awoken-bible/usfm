"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { lexer } = require('../lib/lexer.ts');

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

  it('Edge/Failure Cases', () => {
    // empty string
    expect(Array.from(lexer(""))).to.deep.equal([]);

    // Don't need whitespace after close tag, hence it is not "significant"
    // whitespace and should be included in publishable text
    expect(Array.from(lexer("\\f*hi" ))).to.deep.equal([
      { kind: 'f', closing: true, text: 'hi' },
    ]);
    expect(Array.from(lexer("\\f* hi"))).to.deep.equal([
      { kind: 'f', closing: true, text: ' hi' },
    ]);

    // missing data
    expect(() => Array.from(lexer("\\c\n\n\\v 4"))).to.throw();

    // bad data
    expect(() => Array.from(lexer("\\c hello"))).to.throw();
    expect(      Array.from(lexer("\\c 1"))).to.deep.equal([
      { kind: 'c', data: '1' },
    ]);

    // missing mandatory whitespace after data
    // Note I think the first test case here without whitespace should throw
    // however we see examples of missing whitespace in real USFM, eg "\fv 38\fv*"
    // within: https://ubsicap.github.io/usfm/notes_basic/fnotes.html#fv-fv
    let result = [
      { kind: 'c', data: '1' },
      { kind: 'v', data: '3', text: 'hello' },
    ];
    expect(Array.from(lexer("\\c 1\\v 3 hello"  ))).to.deep.equal(result);
    expect(Array.from(lexer("\\c 1\n\\v 3 hello"))).to.deep.equal(result);
    expect(Array.from(lexer("\\c 1 \\v 3 hello" ))).to.deep.equal(result);

    // verse marker can have range as data value
    expect(Array.from(lexer("\\v 10-11 testing"))).to.deep.equal([
      { kind: 'v', data: '10-11', text: "testing" },
    ]);
  });

  it('Footnotes', () => {
    text = '\\f + \\fk Issac:\\ft In Hebrew means "laughter"\\f*';
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'f', data: '+' },
      { kind: 'fk', text: 'Issac:' },
      { kind: 'ft', text: 'In Hebrew means "laughter"' },
      { kind: 'f', closing: true },
    ]);

    text = "\\v 1 In the beginning, God\\f + \\fr 1:1  \\ft The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).\\f* created the heavens and the earth.";
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'v',  data: '1', text: 'In the beginning, God' },
      { kind: 'f',  data: '+' },
      { kind: 'fr', data: '1:1' },
      { kind: 'ft', text: 'The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).' },
      { kind: 'f',  closing: true, text: ' created the heavens and the earth.' },
    ]);
  });

  it('Word Level Attributes', () => {
    text = `\\v 1 Text \\nd LORD\\nd* here`;
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'v',  data: '1', text: 'Text ' },
      { kind: 'nd', text: 'LORD' },
      { kind: 'nd', closing: true, text: ' here' },
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

    text = `\\v 13 Yahweh God said to the woman, “What have you done?”
            \\p The woman said, “The serpent deceived me, and I ate.”
            \\p
            \\v 14 Yahweh God said to the serpent,
            \\q1 “Because you have done this,
            \\q2 you are cursed above all livestock,
            \\q2 and above every animal of the field.
            \\q1 You shall go on your belly
            \\q2 and you shall eat dust all the days of your life.
            \\q1
            \\v 15 I will put hostility between you and the woman,
            \\q2 and between your offspring and her offspring.
            \\q1 He will bruise your head,
            \\q2 and you will bruise his heel.”
            \\p
            \\v 16 To the woman he said,
            \\q1 “I will greatly multiply your pain in childbirth.
            \\q2 You will bear children in pain.
            \\q1 Your desire will be for your husband,
            \\q2 and he will rule over you.”`;
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'v', data: '13', text: 'Yahweh God said to the woman, “What have you done?”' },
      { kind: 'p',             text: 'The woman said, “The serpent deceived me, and I ate.”' },
      { kind: 'p' },
      { kind: 'v', data: '14', text: "Yahweh God said to the serpent," },
      { kind: "q", level: 1,   text: "“Because you have done this," },
      { kind: "q", level: 2,   text: "you are cursed above all livestock," },
      { kind: "q", level: 2,   text: "and above every animal of the field." },
      { kind: "q", level: 1,   text: "You shall go on your belly" },
      { kind: "q", level: 2,   text: "and you shall eat dust all the days of your life." },
      { kind: "q", level: 1 },
      { kind: "v", data: '15', text: "I will put hostility between you and the woman," },
      { kind: "q", level: 2,   text: "and between your offspring and her offspring." },
      { kind: "q", level: 1,   text: "He will bruise your head," },
      { kind: "q", level: 2,   text: "and you will bruise his heel.”" },
      { kind: "p" },
      { kind: "v", data: '16', text: "To the woman he said," },
      { kind: "q", level: 1,   text: "“I will greatly multiply your pain in childbirth." },
      { kind: "q", level: 2,   text: "You will bear children in pain." },
      { kind: "q", level: 1,   text: "Your desire will be for your husband," },
      { kind: "q", level: 2,   text: "and he will rule over you.”" },
    ]);

    // Extract from Sirach (from Apocrypha)
    // Contains various complex data strings with ranges that have tripped up lexer in past
    text = `\\v 14 Good things and bad, life and death,
            \\q2 poverty and riches, are from the Lord.
            \\v 15-16  \\f + \\fr 11:15-16  \\ft Verses 15 and 16 are omitted by the best authorities.\\f*
            \\q1
            \\v 17 The Lord’s gift remains with the godly.
            \\q2 His good pleasure will prosper forever.`;
    expect(Array.from(lexer(text))).to.deep.equal([
      { kind: 'v',   data: '14', text: 'Good things and bad, life and death,' },
      { kind: 'q',   level: 2,   text: 'poverty and riches, are from the Lord.' },
      { kind: 'v',   data: '15-16' },
      { kind: 'f',   data: '+' },
      { kind: 'fr',  data: '11:15-16' },
      { kind: 'ft',              text: 'Verses 15 and 16 are omitted by the best authorities.' },
      { kind: 'f', closing: true },
      { kind: 'q', level: 1 },
      { kind: 'v', data: '17',   text: 'The Lord’s gift remains with the godly.' },
      { kind: 'q', level: 2,     text: 'His good pleasure will prosper forever.' },
    ]);
  });


  it('Attributes', () => {
    expect(Array.from(lexer('\\w gracious|lemma="grace"'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace" } },
    ]);

    expect(Array.from(lexer('\\w gracious|grace'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace" } },
    ]);

    expect(Array.from(lexer('\\w gracious|grace strong="H1234,G5485"'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace", strong: "H1234,G5485" } },
    ]);

    expect(Array.from(lexer('\\w gracious|lemma="grace" strong="H1234,G5485"'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace", strong: "H1234,G5485" } },
    ]);

    expect(Array.from(lexer('\\w gracious|strong="H1234,G5485" grace'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace", strong: "H1234,G5485" } },
    ]);


    expect(Array.from(lexer('\\w gracious|strong="H1234,G5485" lemma="grace"'))).to.deep.equal([
      { kind: 'w', text: 'gracious', attributes: { lemma: "grace", strong: "H1234,G5485" } },
    ]);

    expect(Array.from(lexer('\\fig Hello world|src="test.png" alt="Image" size="col"'))).to.deep.equal([
      { kind: 'fig', text: 'Hello world', attributes: { src: "test.png", alt: "Image", size: "col"  } },
    ]);

    expect(() => Array.from(lexer('\\fig hello|test'    ))).to.throw(); // fig has no default attribute
    expect(() => Array.from(lexer('\\p hello|test'      ))).to.throw(); // p   has no default attribute
    expect(() => Array.from(lexer('\\w hello|world|test'))).to.throw(); // cannot have multiple |
  });
});
