"use strict";

const fs = require( "fs" );
const path = require( "path" );
const {
  fsDirTree, fsHashOf, faRun, fsSpecMap, fvsSection, fsText, faSnapshot,
  fRemoveFixtures
} = require( "./link-propose-fixture.js" );

const sSpecAlpha = [
  "# Alpha",
  "",
  "## Sums",
  "",
  "* {#s-aaaaa1} Alpha adds with `fzSum`.",
  "* {#s-aaaaa2} Alpha doubles.",
  "* {#s-aaaaa3} Alpha halves.",
  "",
  "## Terms",
  "",
  "* {#d-ddddd1} **Sum** — two numbers added.",
  ""
].join( "\n" );

const sSpecBeta = [
  "# Beta",
  "",
  "## Rules",
  "",
  "* {#s-ccccc1} Beta counts.",
  "* {#s-dupdup} One place.",
  "* {#s-dupdup} Another place.",
  ""
].join( "\n" );

const fsTestProving = ( sId, sBody ) => [
  "// @proves @@" + sId,
  "test( \"" + sId + "\", () => {",
  "  " + sBody,
  "});",
  ""
].join( "\n" );

const aasFileBase = {
  "specs/alpha.md": sSpecAlpha,
  "specs/beta.md": sSpecBeta,
  "src/sum.js": "\"use strict\";\nmodule.exports = 1;\n",
  "src/doc.js": [
    "// @implements @@s-aaaaa2",
    "// @tested-by test/two.test.js",
    "\"use strict\";",
    "module.exports = 2;",
    ""
  ].join( "\n" ),
  "src/stale.js": "// @implements s-aaaaa3@0000000\nmodule.exports = 4;\n",
  "src/page.css": ".a { color: red; }\n",
  "src/page.html": "<!DOCTYPE html>\n<p>hi</p>\n",
  "src/charset.css": "@charset \"utf-8\";\n.b { color: blue; }\n",
  "src/bang.js": "#!/usr/bin/env node\nmodule.exports = 3;\n",
  "src/beta.js": "// @implements @@s-ccccc1\nmodule.exports = 5;\n",
  "test/one.test.js": fsTestProving(
    "s-aaaaa1", "require( \"../src/sum.js\" );"
  ),
  "test/two.test.js": fsTestProving( "s-aaaaa2", "expect( 2 ).toBe( 2 );" ),
  "test/three.test.js": fsTestProving( "s-aaaaa3", "expect( 3 ).toBe( 3 );" ),
  "test/beta.test.js": fsTestProving( "s-ccccc1", "expect( 4 ).toBe( 4 );" )
};

const fsHash = ( sId ) => fsHashOf( aasFileBase, sId );

const fsRefFor = ( sId ) => sId + "@" + fsHash( sId );

const fsDirConfirm = ( vsLine, aasExtra ) => {
  const sDir = fsDirTree({ ...aasFileBase, ...( aasExtra || {}) });
  fs.writeFileSync( path.join( sDir, "confirm.txt" ), vsLine.join( "\n" ));
  return sDir;
};

const faApply = ( vsLine, aasExtra ) => {
  const sDir = fsDirConfirm( vsLine, aasExtra );
  return { sDir, ...faRun( sDir, [ "--apply", "confirm.txt" ]) };
};

const fvsOut = ( aRun ) => aRun.sOut.replace( /\n$/, "" ).split( "\n" );

const fvsBad = ( sDir ) => fvsSection(
  fsSpecMap( sDir, []), "malformed, unresolved or stale code references"
);

const fvsUnlinked = ( sDir ) => fvsSection(
  fsSpecMap( sDir, []), "statements with no implementation link"
).map(( sLine ) => sLine.split( /\s+/ )[ 1 ]);

afterAll( fRemoveFixtures );

// @proves s-5eou7w@05eaa15
// @proves s-oncg4p@5c9d766
// @proves s-i3n7xx@722d3b2
// @proves s-bswa11@ce8569d
// @proves s-3smw7c@122e254
// @proves s-68w9rn@12484c8
test( "link-propose — --apply adds a confirmed reference at the header's "
  + "start with the file's missing test-file reference, and reports "
  + "each change", () => {
  const aRun = faApply([ "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js" ]);
  expect( aRun.z ).toBe( 0 );
  expect( fvsOut( aRun )).toEqual([
    "src/sum.js:1  + @implements " + fsRefFor( "s-aaaaa1" ),
    "src/sum.js:2  + @tested-by test/one.test.js",
    "Applied: 1 added, 0 re-stamped, 1 tested-by, 0 refused"
  ]);
  expect( fsText( aRun.sDir, "src/sum.js" )).toBe( [
    "// @implements " + fsRefFor( "s-aaaaa1" ),
    "// @tested-by test/one.test.js",
    "\"use strict\";",
    "module.exports = 1;",
    ""
  ].join( "\n" ));
});

// @proves s-68w9rn@12484c8
// @proves s-aok5ze@9be1053
// @proves s-6ch142@2ca8557
test( "link-propose — added lines follow the last reference already in the "
  + "header, and a test-file reference with no evidence is marked "
  + "unverified", () => {
  const aRun = faApply([ "y " + fsRefFor( "s-aaaaa1" ) + " src/doc.js" ]);
  expect( fvsOut( aRun )).toEqual([
    "src/doc.js:3  + @implements " + fsRefFor( "s-aaaaa1" ),
    "src/doc.js:4  + @tested-by test/one.test.js  unverified",
    "Applied: 1 added, 0 re-stamped, 1 tested-by, 0 refused"
  ]);
  expect( fsText( aRun.sDir, "src/doc.js" ).split( "\n" ).slice( 0, 5 ))
    .toEqual([
      "// @implements " + fsRefFor( "s-aaaaa2" ),
      "// @tested-by test/two.test.js",
      "// @implements " + fsRefFor( "s-aaaaa1" ),
      "// @tested-by test/one.test.js",
      "\"use strict\";"
    ]);
  const aSum = faApply([ "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js" ]);
  expect( aSum.sOut ).not.toContain( "unverified" );
});

// @proves s-txnavs@85a2c4c
// @proves s-8qoeyd@9f39652
test( "link-propose — a reference with another hash is re-stamped, and the "
  + "file differs only by that hash and the added lines", () => {
  const aRun = faApply([ "y " + fsRefFor( "s-aaaaa3" ) + " src/stale.js" ]);
  expect( aRun.z ).toBe( 0 );
  expect( fvsOut( aRun )).toEqual([
    "src/stale.js:1  ~ @implements s-aaaaa3@0000000 -> " + fsHash( "s-aaaaa3" ),
    "src/stale.js:2  + @tested-by test/three.test.js  unverified",
    "Applied: 0 added, 1 re-stamped, 1 tested-by, 0 refused"
  ]);
  expect( fsText( aRun.sDir, "src/stale.js" )).toBe( [
    "// @implements " + fsRefFor( "s-aaaaa3" ),
    "// @tested-by test/three.test.js",
    "module.exports = 4;",
    ""
  ].join( "\n" ));
});

// @proves s-yua8vz@7373601
// @proves s-cgc0vb@ecec457
test( "link-propose — a link the file already holds writes nothing, and a "
  + "repeated y line is applied once", () => {
  const aHeld = faApply([ "y " + fsRefFor( "s-aaaaa2" ) + " src/doc.js" ]);
  expect( aHeld.z ).toBe( 0 );
  expect( fvsOut( aHeld )).toEqual([
    "Applied: 0 added, 0 re-stamped, 0 tested-by, 0 refused"
  ]);
  expect( fsText( aHeld.sDir, "src/doc.js" ))
    .toBe( faSnapshot( fsDirTree( aasFileBase ))[ "src/doc.js" ]);
  const sLine = "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js";
  const aTwice = faApply([ sLine, sLine, "y  " + fsRefFor( "s-aaaaa1" )
    + "   ./src/sum.js" ]);
  expect( fvsOut( aTwice ).slice( -1 )).toEqual([
    "Applied: 1 added, 0 re-stamped, 1 tested-by, 0 refused"
  ]);
  expect( fsText( aTwice.sDir, "src/sum.js" ).split( "@implements" ))
    .toHaveLength( 2 );
});

// @proves s-98n0jr@68a4e48
// @proves s-wx8o4v@de91e1a
test( "link-propose — each added line is a directive comment of the file's "
  + "language that spec-map reads as a resolving reference", () => {
  const aRun = faApply([
    "y " + fsRefFor( "s-aaaaa1" ) + " src/page.css",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/page.html",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js"
  ]);
  expect( aRun.z ).toBe( 0 );
  expect( fsText( aRun.sDir, "src/page.css" ).split( "\n" )[ 0 ])
    .toBe( "/* @implements " + fsRefFor( "s-aaaaa1" ) + " */" );
  expect( fsText( aRun.sDir, "src/page.html" ).split( "\n" ).slice( 0, 3 ))
    .toEqual([
      "<!-- @implements " + fsRefFor( "s-aaaaa1" ) + " -->",
      "<!-- @tested-by test/one.test.js -->",
      "<!DOCTYPE html>"
    ]);
  expect( fvsBad( aRun.sDir ).filter(( s ) => /^src\/(?:page|sum)/.test( s )))
    .toEqual([]);
  expect( fvsBad( aRun.sDir )).toHaveLength( 1 );
  expect( fvsUnlinked( aRun.sDir )).not.toContain( "s-aaaaa1" );
  const vsNoTest = fvsSection(
    fsSpecMap( aRun.sDir, []), "implementation files with no test link"
  );
  [ "src/page.css", "src/page.html", "src/sum.js" ].forEach(( sPath ) => (
    expect( vsNoTest ).not.toContain( sPath )
  ));
});

// @proves s-mfht72@18981bb
// @proves s-0dezvq@81ba7b7
// @proves s-97oh4r@a333fff
test( "link-propose — JavaScript and CSS files accept links after a shebang, "
  + "while a stylesheet opening with @charset has no header place", () => {
  const sBangCss = "#!/usr/bin/env node\n.a { color: red; }\n";
  const aRun = faApply([
    "y " + fsRefFor( "s-aaaaa1" ) + " src/bang.js",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/bang.css",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/charset.css"
  ], { "src/bang.css": sBangCss });
  expect( aRun.z ).toBe( 1 );
  expect( fvsOut( aRun )).toEqual([
    "src/bang.css:2  + @implements " + fsRefFor( "s-aaaaa1" ),
    "src/bang.css:3  + @tested-by test/one.test.js  unverified",
    "src/bang.js:2  + @implements " + fsRefFor( "s-aaaaa1" ),
    "src/bang.js:3  + @tested-by test/one.test.js  unverified",
    "confirm.txt:3  refused: no header place",
    "Applied: 2 added, 0 re-stamped, 2 tested-by, 1 refused"
  ]);
  expect( fsText( aRun.sDir, "src/bang.css" )).toContain(
    "@implements " + fsRefFor( "s-aaaaa1" )
  );
  expect( fsText( aRun.sDir, "src/bang.js" ).split( "\n" )[ 0 ])
    .toBe( "#!/usr/bin/env node" );
  expect( fsText( aRun.sDir, "src/charset.css" ))
    .toBe( aasFileBase[ "src/charset.css" ]);
});

// @proves s-pzjwup@6654181
// @proves s-pyr21s@b5afae0
test( "link-propose — --apply refuses y lines naming no single statement, a "
  + "line of another type, a stale hash or no implementation file, and "
  + "applies the others", () => {
  const aRun = faApply([
    "y s-zzzzz9@1234567 src/sum.js",
    "y " + fsRefFor( "s-dupdup" ) + " src/sum.js",
    "y " + fsRefFor( "d-ddddd1" ) + " src/sum.js",
    "y s-aaaaa1@0000000 src/sum.js",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/none.js",
    "y " + fsRefFor( "s-aaaaa1" ) + " test/one.test.js",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js"
  ]);
  expect( aRun.z ).toBe( 1 );
  expect( fvsOut( aRun )).toEqual([
    "confirm.txt:1  refused: no such statement",
    "confirm.txt:2  refused: marked at 2 places",
    "confirm.txt:3  refused: not a statement",
    "confirm.txt:4  refused: stale proposal",
    "confirm.txt:5  refused: no implementation file",
    "confirm.txt:6  refused: no implementation file",
    "src/sum.js:1  + @implements " + fsRefFor( "s-aaaaa1" ),
    "src/sum.js:2  + @tested-by test/one.test.js",
    "Applied: 1 added, 0 re-stamped, 1 tested-by, 6 refused"
  ]);
  expect( fsText( aRun.sDir, "test/one.test.js" ))
    .toBe( faSnapshot( fsDirTree( aasFileBase ))[ "test/one.test.js" ]);
});

// @proves s-q2lggv@b84d55b
// @proves s-ck7s5x@7b81fa6
// @proves s-ieckkc@85e1247
// @proves s-gj3tfl@fb293e7
// @proves s-0m5r6m@7d5188e
test( "link-propose — only a y line writes; blank, # and n or ? lines "
  + "write nothing, trailing text is ignored, and a file no proposal "
  + "named is applied", () => {
  const sDir = fsDirConfirm([
    "# a context line",
    "",
    "n " + fsRefFor( "s-aaaaa1" ) + " src/doc.js 0.90 loads=1",
    "? " + fsRefFor( "s-aaaaa1" ) + " src/page.css 0.50 names=x",
    "y   " + fsRefFor( "s-aaaaa1" ) + "  src/sum.js   0.10 my own pick",
    "   "
  ]);
  const aBefore = faSnapshot( sDir );
  const aRun = faRun( sDir, [ "--apply", "confirm.txt" ]);
  expect( aRun.z ).toBe( 0 );
  const aAfter = faSnapshot( sDir );
  expect( Object.keys( aAfter ).filter(( sPath ) => (
    aAfter[ sPath ] !== aBefore[ sPath ]
  ))).toEqual([ "src/sum.js" ]);
  expect( aAfter[ "src/sum.js" ]).toContain(
    "// @implements " + fsRefFor( "s-aaaaa1" )
  );
});

// @proves s-kx8ajy@9826e66
test( "link-propose — a confirm file holding a malformed line writes "
  + "nothing, names each such line on stderr and exits 1", () => {
  const sDir = fsDirConfirm([
    "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js",
    "maybe " + fsRefFor( "s-aaaaa1" ) + " src/doc.js",
    "y s-aaaaa1 src/doc.js",
    " y " + fsRefFor( "s-aaaaa1" ) + " src/doc.js"
  ]);
  const aBefore = faSnapshot( sDir );
  const aRun = faRun( sDir, [ "--apply", "confirm.txt" ]);
  expect( aRun.z ).toBe( 1 );
  expect( aRun.sOut ).toBe( "" );
  expect( aRun.sErr.split( "\n" ).filter( Boolean ).map(( s ) => (
    s.split( " " )[ 1 ]
  ))).toEqual([ "confirm.txt:2", "confirm.txt:3", "confirm.txt:4" ]);
  expect( faSnapshot( sDir )).toEqual( aBefore );
});

// @proves s-gbgn3f@f4cbab4
test( "link-propose — a proposal run's output is a well formed confirm "
  + "file", () => {
  const sDir = fsDirTree( aasFileBase );
  const sProposal = faRun( sDir, []).sOut;
  fs.writeFileSync( path.join( sDir, "confirm.txt" ), sProposal );
  const aUnjudged = faRun( sDir, [ "--apply", "confirm.txt" ]);
  expect( aUnjudged.z ).toBe( 0 );
  expect( aUnjudged.sOut )
    .toBe( "Applied: 0 added, 0 re-stamped, 0 tested-by, 0 refused\n" );
  fs.writeFileSync(
    path.join( sDir, "confirm.txt" ), sProposal.replace( /^\? /m, "y " )
  );
  const aJudged = faRun( sDir, [ "--apply", "confirm.txt" ]);
  expect( aJudged.z ).toBe( 0 );
  expect( aJudged.sOut ).toMatch( /Applied: 1 added/ );
});

// @proves s-b2wi6l@57c601c
test( "link-propose — a file another writer changes during the run is left "
  + "as that writer left it and its y lines are refused", () => {
  const sDir = fsDirConfirm([
    "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js"
  ]);
  const sPathSum = path.join( sDir, "src", "sum.js" );
  const fxRead = fs.readFileSync;
  let cRead = 0;
  const xSpy = jest.spyOn( fs, "readFileSync" ).mockImplementation((
    sPath, ...vxArg
  ) => {
    if( path.resolve( String( sPath )) === sPathSum && ++cRead === 2 ){
      fs.writeFileSync( sPathSum, "// another writer\n" );
    }
    return fxRead( sPath, ...vxArg );
  });
  const aRun = faRun( sDir, [ "--apply", "confirm.txt" ]);
  xSpy.mockRestore();
  expect( aRun.z ).toBe( 1 );
  expect( fvsOut( aRun )).toEqual([
    "confirm.txt:1  refused: changed during run",
    "Applied: 0 added, 0 re-stamped, 0 tested-by, 1 refused"
  ]);
  expect( fsText( sDir, "src/sum.js" )).toBe( "// another writer\n" );
});

// @proves s-vmwsli@d444cbb
// @proves s-rzukyl@30a8803
// @proves s-ysdk89@717c1d5
test( "link-propose — --tested-by adds every implementation file's missing "
  + "test-file references, or only those of files naming the given "
  + "spec's statements", () => {
  const aasExtra = {
    "src/multi.js": "// @implements @@s-aaaaa1\n// @implements @@s-aaaaa3\n"
      + "module.exports = 6;\n"
  };
  const sDirSpec = fsDirTree({ ...aasFileBase, ...aasExtra });
  const aSpec = faRun( sDirSpec, [ "--tested-by", "specs/beta.md" ]);
  expect( aSpec.z ).toBe( 0 );
  expect( fvsOut( aSpec )).toEqual([
    "src/beta.js:2  + @tested-by test/beta.test.js  unverified",
    "Applied: 0 added, 0 re-stamped, 1 tested-by, 0 refused"
  ]);
  expect( fsText( sDirSpec, "src/multi.js" ))
    .toBe( aasExtra[ "src/multi.js" ].replace( /@@(s-a{5}\d)/g, (
      s, sId
    ) => fsRefFor( sId )));
  const sDir = fsDirTree({ ...aasFileBase, ...aasExtra });
  const aAll = faRun( sDir, [ "--tested-by" ]);
  expect( aAll.z ).toBe( 0 );
  expect( fvsOut( aAll )).toEqual([
    "src/beta.js:2  + @tested-by test/beta.test.js  unverified",
    "src/multi.js:3  + @tested-by test/one.test.js  unverified",
    "src/multi.js:4  + @tested-by test/three.test.js  unverified",
    "Applied: 0 added, 0 re-stamped, 3 tested-by, 0 refused"
  ]);
  expect( fvsSection(
    fsSpecMap( sDir, []), "implementation files with no test link"
  )).not.toContain( "src/multi.js" );
});

// @proves s-tq6by8@5f0be54
// @proves s-lqs3hw@4ca074c
test( "link-propose — writing runs change only implementation files, never "
  + "remove a line and never touch other directive kinds", () => {
  const sDir = fsDirConfirm([
    "y " + fsRefFor( "s-aaaaa1" ) + " src/sum.js",
    "y " + fsRefFor( "s-aaaaa3" ) + " src/stale.js",
    "y " + fsRefFor( "s-aaaaa1" ) + " src/doc.js"
  ], {
    "src/doc.js": aasFileBase[ "src/doc.js" ]
      + "// @follows g-ggggg1@1234567\n// @checks i-iiiii1@1234567\n"
  });
  const aBefore = faSnapshot( sDir );
  faRun( sDir, [ "--apply", "confirm.txt" ]);
  faRun( sDir, [ "--tested-by" ]);
  const aAfter = faSnapshot( sDir );
  const vsChanged = Object.keys( aAfter ).filter(( sPath ) => (
    aAfter[ sPath ] !== aBefore[ sPath ]
  ));
  expect( vsChanged ).toEqual([
    "src/beta.js", "src/stale.js", "src/sum.js"
  ]);
  const reOther = /@(?:checks|proves|guards|spec|follows)\b/;
  vsChanged.forEach(( sPath ) => {
    const vsOld = aBefore[ sPath ].split( "\n" );
    const vsNew = aAfter[ sPath ].split( "\n" );
    expect( vsNew.filter(( s ) => reOther.test( s )))
      .toEqual( vsOld.filter(( s ) => reOther.test( s )));
    const vsKept = vsNew.filter(( s ) => !vsOld.includes( s ));
    vsKept.forEach(( s ) => (
      expect( s ).toMatch( /^\/\/ @(?:implements|tested-by) / )
    ));
    expect( vsNew.length ).toBeGreaterThanOrEqual( vsOld.length );
    vsOld.filter(( s ) => !/0000000/.test( s )).forEach(( s ) => (
      expect( vsNew ).toContain( s )
    ));
  });
});
