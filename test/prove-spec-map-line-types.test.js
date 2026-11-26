"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "prove-spec-map-line-types-" + process.pid
);

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive : true, force : true });
  fWriteConcord( sDirFixture );
  Object.entries( asBodyForPath ).forEach(( [ sPathRel, sBody ] ) => {
    const sPath = path.join( sDirFixture, sPathRel );
    fs.mkdirSync( path.dirname( sPath ), { recursive : true });
    fs.writeFileSync( sPath, sBody );
  });
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd : sDirFixture, encoding : "utf8", maxBuffer : 64 * 1024 * 1024 }
  );
  return {
    cExit : aResult.status,
    sOut : aResult.stdout + aResult.stderr,
    sStdout : aResult.stdout,
    sStderr : aResult.stderr
  };
};

const fsSpec = ( sTitle, vsBody ) => (
  [ "# " + sTitle, "", "## API", "" ].concat( vsBody, [ "" ]).join( "\n" )
);

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive : true, force : true });
});

describe( "spec-map-line-types a motive's arch root", () => {
  // @proves s-kgnjaq@cedcec8
  test( "a motive recording an architect's reason that carries arch is "
    + "named for the CEO to ratify; PAIRED with a motive that does not "
    + "carry arch, which is not named", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [
        "* {#m-aaaaa1} The CEO said: \"keep it plain\".",
        "* {#m-aaaaa2 <arch} The architect judged the cost too high.",
        "* {#s-aaaaa3 <m-aaaaa1} Keep it plain.",
        "* {#s-aaaaa4 <m-aaaaa2} Cost stays low."
      ])
    });
    const aRun = faRun( [ "specs/a.md" ]);
    const vsArch = fvsLineInSection( aRun.sOut, "statements rooted in arch" );
    const sArch = vsArch.join( "\n" );
    expect( sArch ).toMatch( /m-aaaaa2/ );
    expect( sArch ).not.toMatch( /m-aaaaa1/ );
  });
});

describe( "spec-map-line-types the guidance query for one audience", () => {
  const fWriteGuidance = () => fWriteTree({
    "specs/g.md": fsSpec( "G", [
      "* {#g-gaaa01 for=fixer} Write   plain",
      "  code in the fixer's way.",
      "* {#g-gaaa02 for=architect} Spec only the boundary.",
      "* {#g-gaaa03 for=fixer,architect} Both read this."
    ])
  });

  // @proves s-zi228u@46140ad
  test( "--guidance --for prints only the lines whose audience holds the "
    + "label, each with its whole normalised text; PAIRED with plain "
    + "--guidance, which lists every line", () => {
    fWriteGuidance();
    const aRun = faRun( [ "--guidance", "--for", "fixer" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toMatch( /g-gaaa01/ );
    expect( aRun.sStdout ).toMatch( /g-gaaa03/ );
    expect( aRun.sStdout ).not.toMatch( /g-gaaa02/ );
    expect( aRun.sStdout ).toContain( "Write plain code in the fixer's way." );
    expect( aRun.sStdout ).toContain( "Both read this." );
    expect( faRun( [ "--guidance" ]).sStdout ).toMatch( /g-gaaa02/ );
  });

  // @proves s-zx5mcq@5669484
  test( "--guidance --for prints no reference line under a selected line; "
    + "PAIRED with plain --guidance, which keeps its reference lines", () => {
    fWriteTree({
      "specs/g.md": fsSpec( "G", [
        "* {#g-gaaa01 for=fixer} Write plain code."
      ]),
      "src/x.js": "// @follows g-gaaa01@0000000\nconst x = 1;\n"
    });
    const aPlain = faRun( [ "--guidance" ]);
    expect( aPlain.sStdout ).toMatch( /\n    .*src\/x\.js/ );
    const aFor = faRun( [ "--guidance", "--for", "fixer" ]);
    expect( aFor.cExit ).toBe( 0 );
    expect( aFor.sStdout ).toMatch( /g-gaaa01/ );
    expect( aFor.sStdout ).not.toMatch( /x\.js/ );
    expect( aFor.sStdout ).not.toMatch( /stale/ );
    expect( aFor.sStdout ).not.toMatch( /^ {4}/m );
  });

  // @proves s-aphyp7@1f4c6b6
  test( "--for with no label or anywhere but directly after --guidance "
    + "prints the usage line to stderr and exits 2; PAIRED with the well "
    + "placed form, which exits 0", () => {
    fWriteGuidance();
    [
      [ "--guidance", "--for" ],
      [ "--for", "fixer" ],
      [ "--for", "fixer", "--guidance" ],
      [ "--guidance", "specs/g.md", "--for", "fixer" ]
    ].forEach(( vsArg ) => {
      const aRun = faRun( vsArg );
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStderr ).toMatch( /^usage: / );
      expect( aRun.sStdout ).toBe( "" );
    });
    expect( faRun( [ "--guidance", "--for", "fixer" ]).cExit ).toBe( 0 );
  });
});

const fsHashText = ( sText ) => require( "crypto" ).createHash( "sha1" )
  .update( sText, "utf8" ).digest( "hex" ).slice( 0, 7 );

const sTextMisplaced = "A rule an implementation file carries out.";
const sHashMisplaced = fsHashText( sTextMisplaced );

const fWriteMisplaced = ( asBody, vsLineExtra = []) => fWriteTree({
  "specs/a.md": fsSpec( "A", [
    "* {#s-mpl001} " + sTextMisplaced
  ].concat( vsLineExtra )).replace( "\n\n", "\n\nStatement ids: complete\n\n" ),
  "test/a.test.js": [
    "// @spec specs/a.md",
    "// @proves s-mpl001@" + sHashMisplaced,
    "test( \"proves it\", () => {});",
    ""
  ].join( "\n" ),
  ...asBody
});

const fvsMisplaced = ( aRun ) => (
  fvsLineInSection(
    aRun.sStdout, "malformed, unresolved or stale code references"
  ) || []
);

const sNoImplementation = /with no implementation link \(1\):\n\s+specs\/a\.md:\d+ {2}s-mpl001/;

// @proves s-fbqdbv@9e37ea5
// @proves s-lm68rf@a7ce036
// @proves s-dkjdl0@511a833
describe( "spec-map-line-types: a code reference outside the header", () => {
  test( "a mid-file @implements opens a source region, PAIRED with the "
    + "same reference in the header, which applies file-wide", () => {
    const sRef = "// @implements s-mpl001@" + sHashMisplaced;
    fWriteMisplaced({
      "src/a.js": [
        "// @tested-by test/a.test.js", "const a = 1;", sRef,
        "const b = 2;", ""
      ].join( "\n" )
    });
    const aRun = faRun([]);
    expect( fvsMisplaced( aRun )).toEqual( [] );
    expect( aRun.sStdout ).not.toMatch( sNoImplementation );
    expect( faRun([ "--sid", "s-mpl001" ]).sStdout )
      .toContain( "src/a.js:3  lines 4-4" );
    fWriteMisplaced({
      "src/a.js": [
        "// @tested-by test/a.test.js", sRef, "const a = 1;", ""
      ].join( "\n" )
    });
    const aControl = faRun([]);
    expect( fvsMisplaced( aControl )).toEqual([]);
    expect( aControl.sStdout ).not.toMatch( sNoImplementation );
  });

  // @proves s-gkhfa4@3deac5b
  // @proves s-bw4530@acfa706
  test( "mid-file @tested-by and @checks links are read and checked "
    + "against their region", () => {
    fWriteMisplaced({
      "src/a.js": [
        "const a = 1;",
        "// @tested-by test/a.test.js",
        "// @checks i-mpl002@0000000",
        ""
      ].join( "\n" )
    }, [ "* {#i-mpl002} Look at the page and see it drawn." ]);
    const aRun = faRun([]);
    expect( fvsMisplaced( aRun )).toEqual([
      expect.stringContaining( "test proves no statement implemented in this region" ),
      expect.stringContaining( "stale hash" )
    ]);
    expect( fvsLineInSection(
      aRun.sStdout, "implementation files with no test link"
    )).toContain( "src/a.js" );
  });

  test( "a malformed mid-file reference is reported, not skipped", () => {
    fWriteMisplaced({
      "src/a.js": [
        "const a = 1;", "// @implements nonsense", "/* @tested-by */", ""
      ].join( "\n" )
    });
    expect( fvsMisplaced( faRun([])).length ).toBe( 2 );
  });

  test( "a reference inside a string, not a comment, is not read", () => {
    fWriteMisplaced({
      "src/a.js": [
        "// @tested-by test/a.test.js",
        "// @implements s-mpl001@" + sHashMisplaced,
        "const a = \"// @implements s-mpl001@0000000\";", ""
      ].join( "\n" )
    });
    expect( fvsMisplaced( faRun([]))).toEqual([]);
  });

  test( "--gate accepts a header reference and a body region naming the "
    + "same statement", () => {
    const sRef = "// @implements s-mpl001@" + sHashMisplaced;
    const vsHead = [ "// @tested-by test/a.test.js", sRef, "const a = 1;" ];
    fWriteMisplaced({ "src/a.js": vsHead.concat([ "" ]).join( "\n" ) });
    expect( faRun([ "--gate" ]).cExit ).toBe( 0 );
    fWriteMisplaced({
      "src/a.js": vsHead.concat([ sRef, "" ]).join( "\n" )
    });
    const aGate = faRun([ "--gate" ]);
    expect( aGate.cExit ).toBe( 0 );
    expect( aGate.sStdout ).toBe( "Gate: pass\n" );
  });
});

// @proves s-0hg5qn@087947b
test( "a #! first line of a JavaScript file is part of the header, and "
  + "@implements after code opens a source region", () => {
  const sRef = "// @implements s-mpl001@" + sHashMisplaced;
  fWriteMisplaced({
    "src/a.js": [
      "#!/usr/bin/env node", "// @tested-by test/a.test.js", sRef,
      "const a = 1;", ""
    ].join( "\n" )
  });
  const aRun = faRun([]);
  expect( fvsMisplaced( aRun )).toEqual([]);
  expect( aRun.sStdout ).not.toMatch( sNoImplementation );
  fWriteMisplaced({
    "src/a.js": [
      "#!/usr/bin/env node", "const a = 1;", sRef, "const b = 2;", ""
    ].join( "\n" )
  });
  expect( fvsMisplaced( faRun([]))).toEqual( [] );
  expect( faRun([ "--sid", "s-mpl001" ]).sStdout )
    .toContain( "src/a.js:3  lines 4-4" );
});
