 # Awoken Bible USFM [![Build Status](https://travis-ci.org/awoken-bible/usfm.svg?branch=master)](https://travis-ci.org/awoken-bible/usfm) [![Coverage Status](https://coveralls.io/repos/github/awoken-bible/usfm/badge.svg?branch=jt/awoken-ref-refactor)](https://coveralls.io/github/awoken-bible/usfm?branch=jt/awoken-ref-refactor)

_USFM (Unified Standard Format Markers) Bible Parser_

This repo provides an NPM module with typescript typings for parsing USFM files containing biblical text, as per the [USFM documentation](https://ubsicap.github.io/usfm/)

Developed for [awokenbible.com](https://awokenbible.com), but released under MIT licence.

## PRERELEASE

> :warning: **THIS LIBRARY IS A PRERELEASE**

Please note that this library is currently in pre-release, and thus the version number is < 1.0.0. While this is true breaking API changes may occur between releases without warning.

The output format for the main chapter body content is (probably) stable, but book meta data/introduction material is currently simply skipped, and thus the meta data attached to the parse result for a book is highly likely to change before a 1.0.0 release.

The library has currently been tested on USFM files from https://ebible.org/Scriptures/ and can successfully cope with:

English Translations
- ASV (American Standard Version)
- WEB (World English Bible)
- KJV (King James Version)
- OEB (Open English Bible)
- WMB (World Messianic Bible)
- T4T (Translation for Translators)

Original Hebrew / Greek:
- HBO (Hebrew Masoretic Old Testament)
- GRCMT (Greek Majority Text New Testament)
- GRCTR (Greek Textus Receptus with Annotations)

Before releasing as 1.0.0 I want to do at least the following:
- [ ] Add support for introduction material in book headers (https://ubsicap.github.io/usfm/introductions/index.html)
- [ ] Add support for generic formatting markers inside footnotes / cross references (likely requiring refactor of login into "subparsers", see: https://github.com/awoken-bible/usfm/issues/4)
- [ ] Test the library on some more modern and widely used translations (eg, NIV, ESV, CEB, NLT, etc) - unfortunately these are not in the public domain and thus I don't have access to the USFM files currently
- [ ] Add proper documentation
