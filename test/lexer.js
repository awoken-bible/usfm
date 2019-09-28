"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { lexer } = require('../src/lexer.ts');

describe("lexer", () => {

  it('Simple Iterator', () => {
    let it = lexer('\\id GEN Test Text');
    expect(it.next()).to.deep.equal(({
      done: false,
      value: {
        kind  : 'id',
        level : undefined,
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
        level : undefined,
        data  : 'GEN',
        text  : 'Test Text'
      },
    }));
    expect(it.next()).to.deep.equal(({
      done: false,
      value: {
        kind  : 'ide',
        level : undefined,
        data  : 'UTF-8',
        text  : ''
      },
    }));
    expect(it.next()).to.deep.equal(({
      done: true,
      value: undefined,
    }));
  });
});
