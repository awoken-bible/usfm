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
        { kind: TokenType.Whitespace, value: ' ' }
      ]);

      expect(Array.from(tokenizer('\n'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n' }
      ]);

      expect(Array.from(tokenizer('\r'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n' }
      ]);

      expect(Array.from(tokenizer('\r\n'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n' }
      ]);

      expect(Array.from(tokenizer('\t'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\t' }
      ]);

      expect(Array.from(tokenizer('\t  \t  '))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\t  \t  ' }
      ]);

      expect(Array.from(tokenizer('\r \t\n\t\r\n  \t'))).to.deep.equal([
        { kind: TokenType.Whitespace, value: '\n \t\n\t\n  \t' }
      ]);
    });

    it('VBar', () => {
      expect(Array.from(tokenizer('|'))).to.deep.equal([
        { kind: TokenType.VBar, value: '|' }
      ]);
    });

    it('Word', () => {
      expect(Array.from(tokenizer('a'))).to.deep.equal([
        { kind: TokenType.Word, value: 'a' }
      ]);

      expect(Array.from(tokenizer('hello'))).to.deep.equal([
        { kind: TokenType.Word, value: 'hello' }
      ]);

      expect(Array.from(tokenizer('"hello"'))).to.deep.equal([
        { kind: TokenType.Word, value: '"hello"' }
      ]);

      expect(Array.from(tokenizer('here-is-some-text123**!'))).to.deep.equal([
        { kind: TokenType.Word, value: 'here-is-some-text123**!' }
      ]);
    });

    it('Marker', () => {
      expect(Array.from(tokenizer('\v'))).to.deep.equal([
        { kind: TokenType.Word, value: '\v' }
      ]);

      expect(Array.from(tokenizer('\litl'))).to.deep.equal([
        { kind: TokenType.Word, value: '\litl' }
      ]);

      expect(Array.from(tokenizer('\lik*'))).to.deep.equal([
        { kind: TokenType.Word, value: '\lik*' }
      ]);
    });
  });

  it("Multiple Tokens", () => {
    expect(Array.from(tokenizer('hello world'))).to.deep.equal([
      { kind: TokenType.Word,       value: 'hello' },
      { kind: TokenType.Whitespace, value: ' '     },
      { kind: TokenType.Word,       value: 'world' },
    ]);

    expect(Array.from(tokenizer("\\v 1 In the beginning"))).to.deep.equal([
      { kind: TokenType.Marker,     value: "\\v"       },
      { kind: TokenType.Whitespace, value: " "         },
      { kind: TokenType.Word,       value: "1"         },
      { kind: TokenType.Whitespace, value: " "         },
      { kind: TokenType.Word,       value: "In"        },
      { kind: TokenType.Whitespace, value: " "         },
      { kind: TokenType.Word,       value: "the"       },
      { kind: TokenType.Whitespace, value: " "         },
      { kind: TokenType.Word,       value: "beginning" },
    ]);

    expect(Array.from(tokenizer("\\v 1\tIn  the\nbeginning"))).to.deep.equal([
      { kind: TokenType.Marker,     value: "\\v"       },
      { kind: TokenType.Whitespace, value: " "         },
      { kind: TokenType.Word,       value: "1"         },
      { kind: TokenType.Whitespace, value: "\t"        },
      { kind: TokenType.Word,       value: "In"        },
      { kind: TokenType.Whitespace, value: "  "        },
      { kind: TokenType.Word,       value: "the"       },
      { kind: TokenType.Whitespace, value: "\n"        },
      { kind: TokenType.Word,       value: "beginning" },
    ]);

    expect(Array.from(tokenizer("\\v 1 In \\w the|lemma=\"test\"\\w*beginning"))).to.deep.equal([
      { kind: TokenType.Marker,     value: "\\v"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "1"              },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "In"             },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Marker,     value: "\\w"            },
      { kind: TokenType.Whitespace, value: " "              },
      { kind: TokenType.Word,       value: "the"            },
      { kind: TokenType.VBar,       value: "|"              },
      { kind: TokenType.Word,       value: "lemma=\"test\"" },
      { kind: TokenType.Marker,     value: "\\w*"           },
      { kind: TokenType.Word,       value: "beginning"      },
    ]);
  });

  it("Real extracts", () => {
    // ASV
    let text = "\\v 44  \\f + \\fr 9:44  \\ft Vs. 44 and 46 (which are identical to v. 48) are omitted by some ancient authorities. \\fqa where their worm dieth not, and the fire is not quenched. \\f*";

    expect(Array.from(tokenizer(text))).to.deep.equal([
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
