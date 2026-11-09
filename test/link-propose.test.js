"use strict";

const fs = require( "fs" );
const path = require( "path" );
const childProcess = require( "child_process" );
const {
  sDirRepo, fsDirTree, faRun, fsSpecMap, fvsSection, faSnapshot, fnLineOf,
  fsText, fWriteMeasurement, faFileMeasured, fvsCandidateLines, fsLineFor,
  frScoreFor, fvsPathCandidate, fRemoveFixtures
} = require( "./link-propose-fixture.js" );

const sSpecAlpha = [
  "# Alpha",
  "",
  "## Sums",
  "",
  "* {#s-aaaaa1} Alpha adds two numbers with `fzSum`.",
  "* {#s-aaaaa2} Alpha doubles a number with `fzDouble`.",
  "* {#s-aaaaa3} Alpha never fails.",
  "",
  "## Page",
  "",
  "* {#s-bbbbb1} The page shows the `banner` class.",
  ""
].join( "\n" );

const sSpecBeta = [
  "# Beta",
  "",
  "## Rules",
  "",
  "* {#s-ccccc1} Beta keeps a `fzCount` of calls.",
  ""
].join( "\n" );

const aasFileBase = {
  "specs/alpha.md": sSpecAlpha,
  "specs/beta.md": sSpecBeta,
  "src/sum.js": [
    "\"use strict\";",
    "const { fzHelp } = require( \"./help.js\" );",
    "const fzSum = ( zA, zB ) => fzHelp( zA + zB );",
    "module.exports = { fzSum };",
    ""
  ].join( "\n" ),
  "src/help.js": [
    "\"use strict\";",
    "const fzHelp = ( z ) => z;",
    "module.exports = { fzHelp };",
    ""
  ].join( "\n" ),
  "src/double.js": [
    "\"use strict\";",
    "const fzDouble = ( z ) => z * 2;",
    "module.exports = { fzDouble };",
    ""
  ].join( "\n" ),
  "src/count.js": [
    "\"use strict\";",
    "let fzCount = 0;",
    "module.exports = { fzCount };",
    ""
  ].join( "\n" ),
  "src/page.css": ".banner { color: red; }\n",
  "src/unrelated.js": "module.exports = 1;\n",
  "test/sum.test.js": [
    "// @proves @@s-aaaaa1",
    "test( \"sums\", () => {",
    "  expect( require( \"../src/sum.js\" ).fzSum( 1, 2 )).toBe( 3 );",
    "});",
    ""
  ].join( "\n" ),
  "test/double.test.js": [
    "const { fzDouble } = require( \"../src/double.js\" );",
    "// @proves @@s-aaaaa2",
    "test( \"doubles\", () => {",
    "  expect( fzDouble( 2 )).toBe( 4 );",
    "});",
    ""
  ].join( "\n" ),
  "test/page.test.js": [
    "const fs = require( \"fs\" );",
    "// @proves @@s-bbbbb1",
    "test( \"page\", () => {",
    "  expect( fs.readFileSync( \"src/page.css\", \"utf8\" ))",
    "    .toContain( \"banner\" );",
    "});",
    ""
  ].join( "\n" )
};

const fsDirBase = ( aasExtra ) => fsDirTree({ ...aasFileBase, ...aasExtra });

const fvsIdContext = ( sOut ) => sOut.split( "\n" )
  .filter(( sLine ) => /^# [a-z]-[a-z0-9]{6}@/.test( sLine ))
  .map(( sLine ) => sLine.slice( 2, 10 ));

afterAll( fRemoveFixtures );

// @proves s-39kb2j@ad74a84
// @proves s-ae8jdy@607e4e4
test( "link-propose — with no argument it proposes for every unlinked "
  + "statement of the project, and with a spec path for that spec's", () => {
  const sDir = fsDirBase();
  const aAll = faRun( sDir, []);
  expect( aAll.z ).toBe( 0 );
  expect( fvsIdContext( aAll.sOut )).toEqual([
    "s-aaaaa1", "s-aaaaa2", "s-aaaaa3", "s-bbbbb1", "s-ccccc1"
  ]);
  const vsLine = aAll.sOut.split( "\n" );
  const nContext = vsLine.findIndex(( s ) => s.startsWith( "# s-aaaaa1@" ));
  expect( vsLine[ nContext + 1 ]).toMatch( /^\? s-aaaaa1@/ );
  expect( vsLine[ nContext + 2 ]).toMatch( /^\? s-aaaaa1@/ );
  expect( vsLine[ nContext + 3 ]).toMatch( /^# s-aaaaa2@/ );
  const aBeta = faRun( sDir, [ "specs/beta.md" ]);
  expect( aBeta.z ).toBe( 0 );
  expect( fvsIdContext( aBeta.sOut )).toEqual([ "s-ccccc1" ]);
});

// @proves s-fchiq4@ec7418c
test( "link-propose — the statements it covers are exactly those spec-map "
  + "lists as having no implementation link, with or without a spec "
  + "path", () => {
  const sDir = fsDirBase({
    "src/sum.js": "// @implements @@s-aaaaa1\n" + aasFileBase[ "src/sum.js" ]
  });
  [[], [ "specs/alpha.md" ]].forEach(( vsArg ) => {
    const vsListed = fvsSection(
      fsSpecMap( sDir, vsArg ), "statements with no implementation link"
    ).map(( sLine ) => sLine.split( /\s+/ )[ 1 ]);
    expect( vsListed.length ).toBeGreaterThan( 1 );
    expect( fvsIdContext( faRun( sDir, vsArg ).sOut )).toEqual( vsListed );
  });
  expect( fvsIdContext( faRun( sDir, []).sOut )).not.toContain( "s-aaaaa1" );
});

// @proves s-58lkl7@02b2533
test( "link-propose — the command under bin acts on the project in its "
  + "working directory", () => {
  const sDir = fsDirBase();
  const aRun = childProcess.spawnSync(
    process.execPath, [ path.join( sDirRepo, "bin", "link-propose" ) ],
    { cwd: sDir, encoding: "utf8" }
  );
  expect( aRun.status ).toBe( 0 );
  expect( aRun.stdout ).toBe( faRun( sDir, []).sOut );
  expect( aRun.stdout ).toContain( "src/sum.js" );
});

// @proves s-tlgm8e@acf5b9e
test( "link-propose — --file prints every statement the file is a "
  + "candidate for, whatever its rank, with that file as the only "
  + "candidate line", () => {
  const sDir = fsDirBase();
  expect( fvsPathCandidate( faRun( sDir, [ "--top", "1" ]).sOut, "s-aaaaa1" ))
    .toEqual([ "src/sum.js" ]);
  const aRun = faRun( sDir, [ "--file", "src/help.js" ]);
  expect( aRun.z ).toBe( 0 );
  expect( fvsIdContext( aRun.sOut )).toEqual([ "s-aaaaa1" ]);
  expect( aRun.sOut.split( "\n" ).filter(( s ) => s.startsWith( "?" )))
    .toEqual([ fsLineFor( aRun.sOut, "s-aaaaa1", "src/help.js" )]);
  expect( faRun( sDir, [ "--file", "src/unrelated.js" ]).sOut )
    .not.toMatch( /^\?/m );
});

// @proves s-ms5aa9@80076b2
test( "link-propose — --top limits the candidates per statement, and "
  + "without it at most 5 are printed", () => {
  const aasExtra = {};
  [ "a", "b", "c", "d", "e", "f", "g" ].forEach(( s ) => {
    aasExtra[ "src/k" + s + ".js" ] = "module.exports = \"fzCount\";\n";
  });
  const sDir = fsDirBase( aasExtra );
  expect( fvsCandidateLines( faRun( sDir, []).sOut, "s-ccccc1" ).length )
    .toBe( 5 );
  expect( fvsCandidateLines(
    faRun( sDir, [ "--top", "2" ]).sOut, "s-ccccc1"
  ).length ).toBe( 2 );
  expect( fvsCandidateLines(
    faRun( sDir, [ "--top", "20" ]).sOut, "s-ccccc1"
  ).length ).toBe( 8 );
  expect( fvsCandidateLines(
    faRun( sDir, [ "--file", "src/kg.js", "--top", "1" ]).sOut, "s-ccccc1"
  ).length ).toBe( 1 );
});

// @proves s-xtahx4@5a052db
test( "link-propose — a run with arguments it cannot use maps nothing, "
  + "prints its usage to stderr and exits 2", () => {
  const sDir = fsDirBase();
  const aBefore = faSnapshot( sDir );
  [
    [ "--bogus" ],
    [ "specs/alpha.md", "specs/beta.md" ],
    [ "--file", "src/sum.js", "specs/alpha.md" ],
    [ "specs/alpha.md", "--apply", "confirm.txt" ],
    [ "--tested-by", "--top", "2" ],
    [ "--evaluate", "--top", "2" ],
    [ "--apply", "confirm.txt", "--top", "2" ],
    [ "--top" ],
    [ "--top", "0" ],
    [ "--top", "two" ],
    [ "--file" ],
    [ "--apply" ]
  ].forEach(( vsArg ) => {
    const aRun = faRun( sDir, vsArg );
    expect([ vsArg, aRun.z ]).toEqual([ vsArg, 2 ]);
    expect( aRun.sOut ).toBe( "" );
    expect( aRun.sErr ).toMatch( /^usage: concord link-propose/ );
  });
  expect( faSnapshot( sDir )).toEqual( aBefore );
});

// @proves s-hndu7a@6adee53
// @proves s-g1tzs3@9be4fe5
test( "link-propose — a candidate is always an implementation file, and "
  + "a file with no evidence for a statement is never its candidate", () => {
  const sDir = fsDirBase({
    "other/count.js": "module.exports = \"fzCount\";\n",
    "test/helper-count.js": "module.exports = \"fzCount\";\n"
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fvsPathCandidate( sOut, "s-ccccc1" )).toEqual([ "src/count.js" ]);
  expect( sOut ).not.toContain( "src/unrelated.js" );
  expect( fvsPathCandidate( sOut, "s-aaaaa2" )).toEqual([ "src/double.js" ]);
});

// @proves s-ozip2w@17a2822
// @proves s-2e76bt@a0fb60a
test( "link-propose — loads counts the proving test files that load a "
  + "file directly, and reaches those that load it through a chain", () => {
  const sDir = fsDirBase({
    "test/sum-two.test.js": [
      "const { fzSum } = require( \"../src/sum.js\" );",
      "const fzHelp = require( \"./helper.js\" );",
      "// @proves @@s-aaaaa1",
      "test( \"sums again\", () => { expect( fzSum( 2, 2 )).toBe( 4 ); });",
      ""
    ].join( "\n" ),
    "test/helper.js": "module.exports = require( \"../src/help.js\" );\n"
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-aaaaa1", "src/sum.js" )).toContain( " loads=2" );
  expect( fsLineFor( sOut, "s-aaaaa1", "src/sum.js" ))
    .not.toContain( "reaches=" );
  expect( fsLineFor( sOut, "s-aaaaa1", "src/help.js" ))
    .toContain( " reaches=2" );
  expect( fsLineFor( sOut, "s-aaaaa1", "src/help.js" ))
    .not.toContain( "loads=" );
});

// @proves s-kb99wj@9e816c1
test( "link-propose — a load is a literal require, dynamic import, import "
  + "or export-from declaration, resolved as Node resolves it, a package "
  + "inside the project included", () => {
  const sDir = fsDirBase({
    "specs/gamma.md": [
      "# Gamma", "", "## Loads", "",
      "* {#s-ddddd1} Gamma loads its parts.", ""
    ].join( "\n" ),
    "src/la.js": "module.exports = 1;\n",
    "src/lb.mjs": "export const z = 1;\n",
    "src/lc.mjs": "export const z = 2;\n",
    "src/ld.mjs": "export const z = 3;\n",
    "src/pkgdir/package.json":
      "{ \"name\": \"fixpkg\", \"main\": \"main.js\" }\n",
    "src/pkgdir/main.js": "module.exports = 4;\n",
    "src/lnot.js": "module.exports = 5;\n",
    "test/gamma.test.js": [
      "import { z } from \"../src/lb.mjs\";",
      "export { z as zC } from \"../src/lc.mjs\";",
      "const sName = \"../src/lnot.js\";",
      "// @proves @@s-ddddd1",
      "test( \"loads\", async () => {",
      "  require( \"../src/la.js\" );",
      "  await import( \"../src/ld.mjs\" );",
      "  require( sName );",
      "  require( \"../src/lnot.js\", 2 );",
      "  require( \"fixpkg\" );",
      "});",
      ""
    ].join( "\n" )
  });
  fs.mkdirSync( path.join( sDir, "node_modules" ));
  fs.symlinkSync(
    path.join( sDir, "src", "pkgdir" ),
    path.join( sDir, "node_modules", "fixpkg" )
  );
  const sOut = faRun( sDir, [ "specs/gamma.md" ]).sOut;
  expect( fvsPathCandidate( sOut, "s-ddddd1" ).sort()).toEqual([
    "src/la.js", "src/lb.mjs", "src/lc.mjs", "src/ld.mjs",
    "src/pkgdir/main.js"
  ]);
  fvsCandidateLines( sOut, "s-ddddd1" ).forEach(( sLine ) => (
    expect( sLine ).toContain( " loads=1" )
  ));
});

// @proves s-ebmvdj@1e3219b
test( "link-propose — files of other languages load nothing, so nothing "
  + "is reached through a stylesheet", () => {
  const sDir = fsDirBase({
    "src/base.css": ".banner { margin: 0; }\n",
    "src/page.css": "@import \"./base.css\";\n.banner { color: red; }\n",
    "test/page.test.js": [
      "// @proves @@s-bbbbb1",
      "test( \"page\", () => { require( \"../src/page.css\" ); });",
      ""
    ].join( "\n" )
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-bbbbb1", "src/page.css" ))
    .toContain( " loads=1" );
  expect( fsLineFor( sOut, "s-bbbbb1", "src/base.css" ))
    .not.toContain( "reaches=" );
});

// @proves s-twarwp@16b596c
test( "link-propose — mentions counts proving test files holding a literal "
  + "naming the file's path or a tail no other file ends with", () => {
  const sDir = fsDirBase({
    "src/a/shared.css": ".x {}\n",
    "src/b/shared.css": ".y {}\n",
    "src/b/only.css": ".z {}\n",
    "test/page.test.js": [
      "// @proves @@s-bbbbb1",
      "test( \"page\", () => {",
      "  [ \"src/page.css\", \"only.css\", \"./shared.css\" ].forEach(",
      "    ( s ) => s );",
      "});",
      ""
    ].join( "\n" )
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-bbbbb1", "src/page.css" ))
    .toContain( " mentions=1" );
  expect( fsLineFor( sOut, "s-bbbbb1", "src/b/only.css" ))
    .toContain( " mentions=1" );
  expect( fvsPathCandidate( sOut, "s-bbbbb1" )).not.toContain(
    "src/a/shared.css"
  );
});

// @proves s-50fqg8@d697296
// @proves s-x28dlo@eaa2cb6
test( "link-propose — defines names the statement's terms a script "
  + "declares, and names the terms found in a file outside its "
  + "comments", () => {
  const sDir = fsDirBase({
    "src/call.js": "module.exports = ( x ) => x.fzCount;\n",
    "src/note.js": "// fzCount is kept elsewhere\nmodule.exports = 2;\n"
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-ccccc1", "src/count.js" ))
    .toContain( " defines=fzCount" );
  expect( fsLineFor( sOut, "s-ccccc1", "src/call.js" ))
    .toContain( " names=fzCount" );
  expect( fvsPathCandidate( sOut, "s-ccccc1" )).not.toContain( "src/note.js" );
  expect( fsLineFor( sOut, "s-bbbbb1", "src/page.css" ))
    .toContain( " names=banner" );
});

// @proves s-x6xwzh@4f3c2c3
test( "link-propose — sibling counts the other statements under the same "
  + "heading that the file implements", () => {
  const sDir = fsDirBase({
    "src/double.js": "// @implements @@s-aaaaa1\n// @implements @@s-aaaaa2\n"
      + aasFileBase[ "src/double.js" ]
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-aaaaa3", "src/double.js" ))
    .toContain( " sibling=2" );
  expect( fvsPathCandidate( sOut, "s-bbbbb1" )).not.toContain(
    "src/double.js"
  );
});

// @proves s-kbxici@7728efc
// @proves s-qzz9rq@7fec6df
test( "link-propose — a file holding a stale reference to the statement "
  + "carries stale and ranks first", () => {
  const sDir = fsDirBase({
    "src/unrelated.js": "// @implements s-aaaaa1@0000000\nmodule.exports = 1;\n"
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fvsPathCandidate( sOut, "s-aaaaa1" )[ 0 ]).toBe( "src/unrelated.js" );
  expect( fsLineFor( sOut, "s-aaaaa1", "src/unrelated.js" ))
    .toContain( " stale=0000000" );
});

// @proves s-m58vba@88398a5
test( "link-propose — executes counts the proving tests that execute a "
  + "line of the file in the last measurement", () => {
  const sTest = [
    "// @proves @@s-ccccc1",
    "test( \"counts one\", () => {",
    "  expect( 1 ).toBe( 1 );",
    "});",
    "// @proves @@s-ccccc1",
    "test( \"counts two\", () => {",
    "  expect( 2 ).toBe( 2 );",
    "});",
    ""
  ].join( "\n" );
  const sDir = fsDirBase({ "test/count.test.js": sTest });
  fWriteMeasurement( sDir, {
    vaUnit: [
      { sPathTest: "test/count.test.js", sName: null, vnLineFrame: []},
      { sPathTest: "test/count.test.js", sName: "counts one",
        vnLineFrame: [ fnLineOf( sTest, "expect( 1 )" ) ]},
      { sPathTest: "test/count.test.js", sName: "counts two",
        vnLineFrame: [ fnLineOf( sTest, "expect( 2 )" ) ]}
    ],
    aFile: faFileMeasured( sDir, [ "src/count.js", "src/help.js" ]),
    vaRegion: [
      { sPath: "src/count.js", nFirst: 2, nLast: 2, vnUnit: [ 1, 2 ]},
      { sPath: "src/help.js", nFirst: 2, nLast: 2, vnUnit: [ 2 ]},
      { sPath: "src/help.js", nFirst: 3, nLast: 3, vnUnit: []}
    ]
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-ccccc1", "src/count.js" ))
    .toContain( " executes=2" );
  expect( fsLineFor( sOut, "s-ccccc1", "src/help.js" ))
    .toContain( " executes=1" );
});

// @proves s-i4ogyf@33bfa48
// @proves s-aj3ymw@77e461d
test( "link-propose — with no readable measurement, or for a file changed "
  + "since it, no candidate carries executes", () => {
  const sTest = [
    "// @proves @@s-ccccc1",
    "test( \"counts\", () => {",
    "  expect( 1 ).toBe( 1 );",
    "});",
    ""
  ].join( "\n" );
  const sDir = fsDirBase({ "test/count.test.js": sTest });
  const aMeasurement = {
    vaUnit: [{ sPathTest: "test/count.test.js", sName: "counts",
      vnLineFrame: [ 3 ]}],
    aFile: faFileMeasured( sDir, [ "src/count.js", "src/help.js" ]),
    vaRegion: [
      { sPath: "src/count.js", nFirst: 2, nLast: 2, vnUnit: [ 0 ]},
      { sPath: "src/help.js", nFirst: 2, nLast: 2, vnUnit: [ 0 ]}
    ]
  };
  fWriteMeasurement( sDir, aMeasurement );
  fs.appendFileSync( path.join( sDir, "src/help.js" ), "// changed\n" );
  const aFresh = faRun( sDir, []);
  expect( fsLineFor( aFresh.sOut, "s-ccccc1", "src/count.js" ))
    .toContain( " executes=1" );
  expect( fvsPathCandidate( aFresh.sOut, "s-ccccc1" ))
    .not.toContain( "src/help.js" );
  fs.writeFileSync(
    path.join( sDir, "tmp", "spec-coverage", "measurement.json" ), "{ nope"
  );
  const aBad = faRun( sDir, []);
  expect( aBad.z ).toBe( 0 );
  expect( aBad.sOut ).not.toContain( "executes=" );
  fs.rmSync( path.join( sDir, "tmp", "spec-coverage" ), { recursive: true });
  const aNone = faRun( sDir, []);
  expect( aNone.z ).toBe( 0 );
  expect( aNone.sOut ).not.toContain( "executes=" );
  expect( fsLineFor( aNone.sOut, "s-ccccc1", "src/count.js" ))
    .toContain( " defines=fzCount" );
});

// @proves s-qhnsu3@fbda5ed
// @proves s-qzbfo6@440f4f1
test( "link-propose — scores run from 0 to 1 with two decimals, highest "
  + "first and ties by path, and two runs print the same", () => {
  const sDir = fsDirBase({
    "src/zz.js": "module.exports = \"fzCount\";\n",
    "src/aa.js": "module.exports = \"fzCount\";\n",
    "src/mm.js": "module.exports = \"fzCount\";\n"
  });
  const sOut = faRun( sDir, []).sOut;
  expect( faRun( sDir, []).sOut ).toBe( sOut );
  const vsLine = fvsCandidateLines( sOut, "s-ccccc1" );
  const vrScore = vsLine.map(( sLine ) => sLine.split( " " )[ 3 ]);
  vrScore.forEach(( sScore ) => {
    expect( sScore ).toMatch( /^[01]\.\d\d$/ );
    expect( Number( sScore )).toBeLessThanOrEqual( 1 );
  });
  expect( vrScore.map( Number )).toEqual(
    vrScore.map( Number ).slice().sort(( rA, rB ) => rB - rA )
  );
  expect( fvsPathCandidate( sOut, "s-ccccc1" )).toEqual([
    "src/count.js", "src/aa.js", "src/mm.js", "src/zz.js"
  ]);
  expect( frScoreFor( sOut, "s-ccccc1", "src/aa.js" ))
    .toBe( frScoreFor( sOut, "s-ccccc1", "src/zz.js" ));
});

// @proves s-2f5c83@45e1d61
test( "link-propose — a candidate carrying one more evidence item than "
  + "another scores at least as high", () => {
  const sDir = fsDirBase({
    "src/zload.js": "module.exports = \"fzCount\";\n",
    "src/aname.js": "module.exports = \"fzCount\";\n",
    "test/count.test.js": [
      "// @proves @@s-ccccc1",
      "test( \"counts\", () => { require( \"../src/zload.js\" ); });",
      ""
    ].join( "\n" )
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-ccccc1", "src/zload.js" ))
    .toMatch( / loads=1 names=fzCount$/ );
  expect( fsLineFor( sOut, "s-ccccc1", "src/aname.js" ))
    .toMatch( / [0-9.]+ names=fzCount$/ );
  expect( frScoreFor( sOut, "s-ccccc1", "src/zload.js" ))
    .toBeGreaterThanOrEqual( frScoreFor( sOut, "s-ccccc1", "src/aname.js" ));
  const vsPath = fvsPathCandidate( sOut, "s-ccccc1" );
  expect( vsPath.indexOf( "src/zload.js" ))
    .toBeLessThan( vsPath.indexOf( "src/aname.js" ));
});

const fsLoader = ( vsPath ) => vsPath.map(( sPath ) => (
  "  require( \"../src/" + sPath + "\" );"
)).join( "\n" );

const fsTestLoading = ( sId, vsPath ) => [
  "// @proves @@" + sId,
  "test( \"loads\", () => {",
  fsLoader( vsPath ),
  "});",
  ""
].join( "\n" );

const sSpecDelta = [
  "# Delta", "", "## Ranks", "",
  "* {#s-eeeee1} Delta ranks its files.",
  "* {#s-eeeee2} Delta shares one file.",
  ""
].join( "\n" );

// @proves s-gfqr47@50e2cc1
test( "link-propose — of two candidates loaded by as many test files, the "
  + "one whose test files load fewer files scores higher", () => {
  const sDir = fsDirTree({
    "specs/delta.md": sSpecDelta,
    "src/abroad.js": "module.exports = 1;\n",
    "src/b1.js": "module.exports = 1;\n",
    "src/b2.js": "module.exports = 1;\n",
    "src/b3.js": "module.exports = 1;\n",
    "src/zspecific.js": "module.exports = 1;\n",
    "test/broad.test.js": fsTestLoading(
      "s-eeeee1", [ "abroad.js", "b1.js", "b2.js", "b3.js" ]
    ),
    "test/specific.test.js": fsTestLoading( "s-eeeee1", [ "zspecific.js" ])
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-eeeee1", "src/zspecific.js" ))
    .toMatch( / loads=1$/ );
  expect( fsLineFor( sOut, "s-eeeee1", "src/abroad.js" ))
    .toMatch( / loads=1$/ );
  const vsPath = fvsPathCandidate( sOut, "s-eeeee1" );
  expect( vsPath[ 0 ]).toBe( "src/zspecific.js" );
  expect( frScoreFor( sOut, "s-eeeee1", "src/zspecific.js" ))
    .toBeGreaterThan( frScoreFor( sOut, "s-eeeee1", "src/abroad.js" ));
});

// @proves s-kuxzw7@4e53af8
test( "link-propose — of two candidates with equal counts, the one fewer "
  + "statements' proving tests touch scores higher", () => {
  const sDir = fsDirTree({
    "specs/delta.md": sSpecDelta,
    "src/ashared.js": "module.exports = 1;\n",
    "src/zalone.js": "module.exports = 1;\n",
    "test/both.test.js": fsTestLoading(
      "s-eeeee1", [ "ashared.js", "zalone.js" ]
    ),
    "test/shared.test.js": fsTestLoading( "s-eeeee2", [ "ashared.js" ])
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-eeeee1", "src/zalone.js" ))
    .toMatch( / loads=1$/ );
  expect( fsLineFor( sOut, "s-eeeee1", "src/ashared.js" ))
    .toMatch( / loads=1$/ );
  expect( fvsPathCandidate( sOut, "s-eeeee1" )[ 0 ]).toBe( "src/zalone.js" );
});

// @proves s-wn8kvy@22ff217
// @proves s-3iaiek@c173bfd
test( "link-propose — a direct load outranks an indirect one, and a "
  + "declared term outranks the same term merely named", () => {
  const sDir = fsDirTree({
    "specs/delta.md": sSpecDelta + "* {#s-eeeee3} Delta uses `fzRank`.\n",
    "src/aindirect.js": "module.exports = 1;\n",
    "src/zdirect.js": "module.exports = require( \"./aindirect.js\" );\n",
    "src/anamed.js": "module.exports = ( x ) => x.fzRank;\n",
    "src/zdeclared.js": "const fzRank = 1;\nmodule.exports = 2;\n",
    "test/direct.test.js": fsTestLoading( "s-eeeee1", [ "zdirect.js" ])
  });
  const sOut = faRun( sDir, []).sOut;
  expect( fsLineFor( sOut, "s-eeeee1", "src/zdirect.js" ))
    .toMatch( / loads=1$/ );
  expect( fsLineFor( sOut, "s-eeeee1", "src/aindirect.js" ))
    .toMatch( / reaches=1$/ );
  expect( fvsPathCandidate( sOut, "s-eeeee1" )[ 0 ]).toBe( "src/zdirect.js" );
  expect( fsLineFor( sOut, "s-eeeee3", "src/zdeclared.js" ))
    .toMatch( / defines=fzRank$/ );
  expect( fsLineFor( sOut, "s-eeeee3", "src/anamed.js" ))
    .toMatch( / names=fzRank$/ );
  expect( fvsPathCandidate( sOut, "s-eeeee3" )[ 0 ]).toBe( "src/zdeclared.js" );
});

// @proves s-h6nvbh@0de0c64
// @proves s-1ihvga@a3dbb44
// @proves s-577ckm@21f72df
test( "link-propose — a proposal is plain text of context lines and "
  + "unconfirmed candidate lines, closed by a count line", () => {
  const sOut = faRun( fsDirBase(), []).sOut;
  const vsLine = sOut.replace( /\n$/, "" ).split( "\n" );
  vsLine.forEach(( sLine ) => expect( sLine ).toMatch(
    /^(?:#|\? [a-z]-[a-z0-9]{6}@[0-9a-f]{7} \S+ [01]\.\d\d(?: \S+)+$)/
  ));
  expect( vsLine.filter(( s ) => s.startsWith( "?" )).length )
    .toBeGreaterThan( 0 );
  expect( vsLine[ vsLine.length - 1 ])
    .toBe( "# Proposals: 5 statements, 4 with candidates, 1 without" );
});

// @proves s-lnre2x@9a8bc8f
test( "link-propose — the first line names the measurement read, with its "
  + "granularity and revision, or says none was read", () => {
  const sDir = fsDirBase();
  expect( faRun( sDir, []).sOut.split( "\n" )[ 0 ])
    .toBe( "# coverage: none read" );
  fWriteMeasurement( sDir, { vaUnit: [], aFile: {}, vaRegion: []});
  expect( faRun( sDir, []).sOut.split( "\n" )[ 0 ])
    .toBe( "# coverage: test granularity, revision abc1234" );
});

// @proves s-v1uxhn@3cc3521
// @proves s-ibre86@6608f9c
test( "link-propose — each statement opens with a context line giving its "
  + "id, hash, place, untested and none words and its whole text", () => {
  const aasFile = { ...aasFileBase };
  const sDir = fsDirTree( aasFile );
  const sOut = faRun( sDir, []).sOut;
  const vsContext = sOut.split( "\n" ).filter(( s ) => /^# s-/.test( s ));
  expect( vsContext[ 0 ]).toMatch( new RegExp(
    "^# s-aaaaa1@[0-9a-f]{7} specs/alpha.md:5 "
    + "Alpha adds two numbers with `fzSum`\\.$"
  ));
  expect( vsContext[ 2 ]).toMatch( new RegExp(
    "^# s-aaaaa3@[0-9a-f]{7} specs/alpha.md:7 untested none "
    + "Alpha never fails\\.$"
  ));
  expect( vsContext[ 4 ]).toMatch(
    /^# s-ccccc1@[0-9a-f]{7} specs\/beta.md:5 untested Beta keeps/
  );
});

// @proves s-fbr7pr@356ffee
test( "link-propose — a file whose path holds whitespace is never a "
  + "candidate and is named once on stderr", () => {
  const sDir = fsDirBase({
    "src/my count.js": "const fzCount = 1;\nmodule.exports = fzCount;\n"
  });
  const aRun = faRun( sDir, []);
  expect( aRun.sOut ).not.toContain( "my count" );
  expect( aRun.sErr.split( "\n" ).filter(( s ) => s.includes( "my count" )))
    .toHaveLength( 1 );
});

// @proves s-wr76ai@453246a
// @proves s-ffxkxt@1c8d35f
// @proves s-h6zcx6@c576da5
// @proves s-n1ht3r@d1f80fd
// @proves s-gizegg@e0e4146
test( "link-propose — --evaluate ranks each linked statement's files as "
  + "if its own references were absent and reports how many rank within "
  + "1, 3 and 5", () => {
  const aasExtra = {
    "src/sum.js": "// @implements @@s-aaaaa1\n// @implements @@s-aaaaa3\n"
      + aasFileBase[ "src/sum.js" ],
    "src/unrelated.js": "// @implements @@s-aaaaa2\nmodule.exports = 1;\n",
    "src/count.js": "// @implements @@s-ccccc1\n"
      + "module.exports = \"fzCount\";\n"
  };
  [ 1, 2, 3, 4, 5, 6 ].forEach(( n ) => {
    aasExtra[ "src/a" + n + ".js" ] = "module.exports = \"fzCount\";\n";
  });
  const sDir = fsDirBase( aasExtra );
  const aRun = faRun( sDir, [ "--evaluate" ]);
  expect( aRun.z ).toBe( 0 );
  expect( aRun.sOut.split( "\n" )).toEqual([
    "s-aaaaa1  src/sum.js 1",
    "s-aaaaa2  src/unrelated.js missed",
    "s-aaaaa3  src/sum.js 1",
    "s-ccccc1  src/count.js 7",
    "Evaluated: 4 statements",
    "Top 1: 2 (50.0%)",
    "Top 3: 2 (50.0%)",
    "Top 5: 2 (50.0%)",
    "Missed: 1 (25.0%)",
    ""
  ]);
  const aBeta = faRun( sDir, [ "--evaluate", "specs/beta.md" ]);
  expect( aBeta.sOut.split( "\n" ).slice( 0, 2 )).toEqual([
    "s-ccccc1  src/count.js 7", "Evaluated: 1 statements"
  ]);
});

// @proves s-k5ttgk@52242db
// @proves s-u56cnv@5620146
test( "link-propose — proposal, --file and --evaluate runs write nothing "
  + "and no run starts a process", () => {
  const sDir = fsDirBase();
  fWriteMeasurement( sDir, { vaUnit: [], aFile: {}, vaRegion: []});
  const aBefore = faSnapshot( sDir );
  const vsName = [
    "spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync",
    "fork"
  ];
  const vxSpy = vsName.map(( sName ) => jest.spyOn( childProcess, sName ));
  jest.isolateModules(() => {
    const { fzMain } = require( "../scripts/link-propose.js" );
    [[], [ "specs/alpha.md" ], [ "--file", "src/sum.js" ], [ "--evaluate" ],
      [ "--tested-by" ]].forEach(( vsArg ) => fzMain(
      vsArg, sDir, () => {}, () => {}
    ));
  });
  vxSpy.forEach(( xSpy ) => {
    expect( xSpy ).not.toHaveBeenCalled();
    xSpy.mockRestore();
  });
  const aAfter = faSnapshot( sDir );
  Object.keys( aAfter ).forEach(( sPath ) => {
    if( !sPath.startsWith( "src/" )){
      expect([ sPath, aAfter[ sPath ]]).toEqual([ sPath, aBefore[ sPath ]]);
    }
  });
  const sDirRead = fsDirBase();
  const aRead = faSnapshot( sDirRead );
  [[], [ "--file", "src/sum.js" ], [ "--evaluate" ]].forEach(( vsArg ) => (
    faRun( sDirRead, vsArg )
  ));
  expect( faSnapshot( sDirRead )).toEqual( aRead );
});

// @proves s-8qvv6k@4068ad2
// @proves s-ner018@a3a30a2
test( "link-propose — a missing or bad concord.json, an unknown spec, an "
  + "unknown implementation file and an unreadable confirm file exit "
  + "2", () => {
  const sDir = fsDirBase();
  [
    [ "specs/none.md" ], [ "--file", "src/none.js" ],
    [ "--file", "test/sum.test.js" ], [ "--apply", "none.txt" ]
  ].forEach(( vsArg ) => {
    const aRun = faRun( sDir, vsArg );
    expect([ vsArg, aRun.z, aRun.sOut ]).toEqual([ vsArg, 2, "" ]);
    expect( aRun.sErr ).toMatch( /^link-propose: / );
  });
  fs.writeFileSync( path.join( sDir, "concord.json" ), "{ nope" );
  expect( faRun( sDir, []).z ).toBe( 2 );
  fs.rmSync( path.join( sDir, "concord.json" ));
  const aMissing = faRun( sDir, []);
  expect( aMissing.z ).toBe( 2 );
  expect( aMissing.sErr ).toContain( "concord.json" );
  expect( fsText( sDir, "src/sum.js" )).toBe( aasFileBase[ "src/sum.js" ]);
});
