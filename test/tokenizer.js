"use strict";

const chai     = require('chai');
const expect   = chai.expect;

const { tokenizer, TokenType } = require('../lib/tokenizer.ts');

let text;

describe("tokenizer", () => {
  it("Empty input", () => {
    expect(Array.from(tokenizer(''))).to.deep.equal([]);
  });

  describe("Single tokens", () => {
    it('Whitespace', () => {
      expect(Array.from(tokenizer(' '))).to.deep.equal([
        { kind: TokenType.Whitespace, value: ' ', min: 0, max: 0 }
      ]);

      expect(Array.from(tokenizer('\n'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n', min: 0, max: 0 }
      ]);

      expect(Array.from(tokenizer('\r'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n', min: 0, max: 0 }
      ]);

      expect(Array.from(tokenizer('\r\n'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n', min: 0, max: 1 }
      ]);

      expect(Array.from(tokenizer('\t'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\t', min: 0, max: 0 }
      ]);

      expect(Array.from(tokenizer('\t  \t  '))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\t  \t  ', min: 0, max: 5 }
      ]);

      expect(Array.from(tokenizer('\r \t\n\t\r\n  \t'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n \t\n\t\n  \t', min: 0, max: 9 }
      ]);
    });

    it('VBar', () => {
      expect(Array.from(tokenizer('|'))).to.deep.equal([
        { kind: TokenType.VBar, value: '|', min: 0, max: 0 }
      ]);
    });

    it('Word', () => {
      expect(Array.from(tokenizer('a'))).to.deep.equal([
        { kind: TokenType.Word, value: 'a', min: 0, max: 0 }
      ]);

      expect(Array.from(tokenizer('hello'))).to.deep.equal([
        { kind: TokenType.Word, value: 'hello', min: 0, max: 4 }
      ]);

      expect(Array.from(tokenizer('"hello"'))).to.deep.equal([
        { kind: TokenType.Word, value: '"hello"', min: 0, max: 6 }
      ]);

      expect(Array.from(tokenizer('here-is-some-text123**!'))).to.deep.equal([
        { kind: TokenType.Word, value: 'here-is-some-text123**!', min: 0, max: 22 }
      ]);
    });

    it('Marker', () => {
      expect(Array.from(tokenizer("\\v"))).to.deep.equal([
        { kind: TokenType.Marker, value: "\\v", min: 0, max: 1 }
      ]);

      expect(Array.from(tokenizer("\\litl"))).to.deep.equal([
        { kind: TokenType.Marker, value: "\\litl", min: 0, max: 4 }
      ]);

      expect(Array.from(tokenizer("\\lik*"))).to.deep.equal([
        { kind: TokenType.Marker, value: "\\lik*", min: 0, max: 4 }
      ]);
    });
  });

  it("Multiple Tokens", () => {
    expect(Array.from(tokenizer('hello world'))).to.deep.equal([
      { min: 0, max:  4, kind: TokenType.Word,       value: 'hello' },
      { min: 5, max:  5, kind: TokenType.Whitespace, value: ' '     },
      { min: 6, max: 10, kind: TokenType.Word,       value: 'world' },
    ]);

    expect(Array.from(tokenizer("\\v 1 In the beginning"))).to.deep.equal([
      { min:  0, max:  1, kind: TokenType.Marker,     value: "\\v"       },
      { min:  2, max:  2, kind: TokenType.Whitespace, value: " "         },
      { min:  3, max:  3, kind: TokenType.Word,       value: "1"         },
      { min:  4, max:  4, kind: TokenType.Whitespace, value: " "         },
      { min:  5, max:  6, kind: TokenType.Word,       value: "In"        },
      { min:  7, max:  7, kind: TokenType.Whitespace, value: " "         },
      { min:  8, max: 10, kind: TokenType.Word,       value: "the"       },
      { min: 11, max: 11, kind: TokenType.Whitespace, value: " "         },
      { min: 12, max: 20, kind: TokenType.Word,       value: "beginning" },
    ]);

    expect(Array.from(tokenizer("\\v 1\tIn  the\nbeginning"))).to.deep.equal([
      { min:  0, max:  1, kind: TokenType.Marker,     value: "\\v"       },
      { min:  2, max:  2, kind: TokenType.Whitespace, value: " "         },
      { min:  3, max:  3, kind: TokenType.Word,       value: "1"         },
      { min:  4, max:  4, kind: TokenType.Whitespace, value: "\t"        },
      { min:  5, max:  6, kind: TokenType.Word,       value: "In"        },
      { min:  7, max:  8, kind: TokenType.Whitespace, value: "  "        },
      { min:  9, max: 11, kind: TokenType.Word,       value: "the"       },
      { min: 12, max: 12, kind: TokenType.Whitespace, value: "\n"        },
      { min: 13, max: 21, kind: TokenType.Word,       value: "beginning" },
    ]);

    expect(Array.from(tokenizer("\\v 1 In \\w the|lemma=\"test\"\\w*beginning"))).to.deep.equal([
      { min:  0, max:  1, kind: TokenType.Marker,     value: "\\v"            },
      { min:  2, max:  2, kind: TokenType.Whitespace, value: " "              },
      { min:  3, max:  3, kind: TokenType.Word,       value: "1"              },
      { min:  4, max:  4, kind: TokenType.Whitespace, value: " "              },
      { min:  5, max:  6, kind: TokenType.Word,       value: "In"             },
      { min:  7, max:  7, kind: TokenType.Whitespace, value: " "              },
      { min:  8, max:  9, kind: TokenType.Marker,     value: "\\w"            },
      { min: 10, max: 10, kind: TokenType.Whitespace, value: " "              },
      { min: 11, max: 13, kind: TokenType.Word,       value: "the"            },
      { min: 14, max: 14, kind: TokenType.VBar,       value: "|"              },
      { min: 15, max: 26, kind: TokenType.Word,       value: "lemma=\"test\"" },
      { min: 27, max: 29, kind: TokenType.Marker,     value: "\\w*"           },
      { min: 30, max: 38, kind: TokenType.Word,       value: "beginning"      },
    ]);
  });

  it("Real extracts", () => {
    // ASV
    let text = "\\v 44  \\f + \\fr 9:44  \\ft Vs. 44 and 46 (which are identical to v. 48) are omitted by some ancient authorities. \\fqa where their worm dieth not, and the fire is not quenched. \\f*";
    let result = Array.from(tokenizer(text)).map((x) => {
      delete x.min;
      delete x.max;
      return x;
    });

    expect(result).to.deep.equal([
      { kind: TokenType.Marker,     value: "\\v"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "44"             },
      { kind: TokenType.Whitespace, value: "  "             },
      { kind: TokenType.Marker,     value: "\\f"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "+"              },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Marker,     value: "\\fr"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "9:44"           },
      { kind: TokenType.Whitespace, value: "  "             },
      { kind: TokenType.Marker,     value: "\\ft"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "Vs."            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "44"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "and"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "46"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "(which"         },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "are"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "identical"      },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "to"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "v."             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "48)"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "are"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "omitted"        },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "by"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "some"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "ancient"        },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "authorities."   },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Marker,     value: "\\fqa"          },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "where"          },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "their"          },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "worm"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "dieth"          },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "not,"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "and"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "the"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "fire"           },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "is"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "not"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "quenched."      },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Marker,     value: "\\f*"           },
    ]);
  });
});
