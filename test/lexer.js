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

  it('Edge/Failure Cases', () => {
    // empty string
    expect(Array.from(lexer(""))).to.deep.equal([]);

    // missing mandatory whitespace after close tag
    expect(() => Array.from(lexer("\\f*\\v 1 hi"))).to.throw();
    expect(      Array.from(lexer("\\f* \\v 1 hi"))).to.deep.equal([
      { kind: 'f*' },
      { kind: 'v', data: '1', text: 'hi' },
    ]);

    // missing data
    expect(() => Array.from(lexer("\\c\n\n\\v 4"))).to.throw();

    // bad data
    expect(() => Array.from(lexer("\\c hello"))).to.throw();
    expect(      Array.from(lexer("\\c 1"))).to.deep.equal([
      { kind: 'c', data: '1' },
    ]);

    // missing mandatory whitespace after data
    expect(() => Array.from(lexer("\\c 1\\v 3 hello"))).to.throw();
    expect(      Array.from(lexer("\\c 1\n\\v 3 hello"))).to.deep.equal([
      { kind: 'c', data: '1' },
      { kind: 'v', data: '3', text: 'hello' },
    ]);
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
  });
});
