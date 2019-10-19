all: dist/

lib/marker_meta.json: data/default.sty bin/parseUsfmSty.ts
	./bin/parseUsfmSty.ts ./data/default.sty ./lib/marker_meta.json

TS_FILES := $(wildcard lib/*.ts)
dist/: $(TS_FILES) lib/marker_meta.json
	tsc
	cp lib/marker_meta.json dist/marker_meta.json
