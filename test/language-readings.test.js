"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );
const { sPathSpecMap, fsConcordJson } = require( "./concord-fixture.js" );
const { asLanguageName, faReaders } = require( "../scripts/languages" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "language-readings-" + process.pid
);

const sTitleFollowsBad = "guidance references that do not resolve or are stale";
const sTitleCodeRefBad = "malformed, unresolved or stale code references";
const sTitleLinkBad = "link lines that do not resolve";
const sTitleNoImplementation = "statements with no implementation link";
const sTitleNoTestedBy = "implementation files with no test link";
const sTitleNoCode = "interactive checks with no implementation link";
const sTitleOwnerBad = "owner lines that do not resolve";

// @proves s-rh750h@cc70238
// @proves s-p54hx2@dfa5570
// @proves s-k9xdwy@eb62f8a
// @proves s-3fzgrr@cc19c25
test( "language readings — each language has one registered reader with the "
  + "common operations", () => {
  const fStub = new Proxy({}, { get: () => () => ({}) });
  const maReader = faReaders( fStub );
  expect( Array.from( maReader.keys() )).toEqual( asLanguageName );
  expect( asLanguageName ).toEqual([
    "javascript", "typescript", "css", "html", "rust", "bash"
  ]);
  for( const aReader of maReader.values() ){
    for( const sOperation of [
      "faSource", "faHeader", "fvaTestUnit", "fsNormal", "fvsClass",
      "fvaCodeReference", "fvaFollows", "ftComments", "freCallWrapper"
    ]){
      expect( typeof aReader[ sOperation ]).toBe( "function" );
    }
  }
});

// @proves s-ycwj4o@7836a5a
// @proves s-9fk6j3@cf4d322
// @proves s-g76ukd@a8b4b44
test( "language-readings — Bash shebang files, comments, directives and suite units",
() => {
  const sHereDocument = "cat <<'EOF'\n# not a directive\nEOF\n"
    + "# @implements s-lng005@0000000\n";
  const [ , vnCommentBash ] = require( "../scripts/languages/bash" )
    .ftMaskBash( sHereDocument );
  expect( vnCommentBash ).toEqual([ sHereDocument.lastIndexOf( "#" ) ]);
  fWriteTree([ "bash" ], {
    "src/tool": [
      "#!/usr/bin/env bash",
      "# @implements " + fsRef( "s-lng005" ),
      "# @tested-by test/run_tests.sh",
      "printf '%s\\n' 'literal # is not a comment'",
      ""
    ].join( "\n" ),
    "test/run_tests.sh": [
      "#!/usr/bin/env bash",
      "# @spec specs/a.md",
      "# @proves " + fsRef( "s-lng001" ),
      "# @proves " + fsRef( "s-lng005" ),
      "printf '%s\\n' 'run suite'",
      ""
    ].join( "\n" ),
    "test/stubs/tool.sh": "#!/bin/sh\n# a helper, not a suite\n"
  });
  fs.chmodSync( path.join( sDirFixture, "src/tool" ), 0o755 );
  const sOut = fsReport();
  expect( fvsProver( "s-lng001" )).toEqual([ "test/run_tests.sh:3  run_tests" ]);
  expect( fvsLineInSection( sOut, sTitleNoImplementation )).not.toContain(
    expect.stringContaining( "s-lng005" )
  );
  expect( fvsLineInSection( sOut, sTitleNoTestedBy )).toEqual( [] );
  expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual( [] );
  expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 1" );
});

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const asTextForId = {
  "s-lng001": "A rule the test files prove.",
  "s-lng002": "A rule nothing here proves.",
  "s-lng003": "A rule the last test proves.",
  "s-lng004": "A rule the group proves.",
  "s-lng005": "A rule the page implements.",
  "s-lng006": "A rule no well-formed reference implements.",
  "g-lng007": "Write it this way.",
  "i-lng008": "**Do:** open the page. **Look for:** a box."
};

const fsAttrForId = ( sId ) => sId.startsWith( "g-" ) ? " for=fixer" : "";

const sSpec = [ "# A", "", "## API", "" ]
  .concat( Object.keys( asTextForId ).map(( sId ) => (
    "* {#" + sId + fsAttrForId( sId ) + "} " + asTextForId[ sId ]
  )), [ "" ])
  .join( "\n" );

const fsRef = ( sId ) => sId + "@" + fsHash( asTextForId[ sId ]);
const fsLink = ( sId ) => "// @proves " + fsRef( sId );

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const fWriteTree = ( vsLanguage, asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteFile( "concord.json", fsConcordJson({ languages: vsLanguage }));
  fWriteFile( "specs/a.md", sSpec );
  Object.entries( asBodyForPath ).forEach(([ sPathRel, sBody ]) => (
    fWriteFile( sPathRel, sBody )
  ));
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync( sPathSpecMap, vsArg, {
    cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024
  });
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => (
    sLine.startsWith( sTitle + " (" )
  ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

const fsReport = () => faRun( [] ).sStdout;

const fsUnlinked = () => {
  const vsGroup = fsReport().match( /Unlinked tests: \d+ of \d+/ );
  return vsGroup === null ? null : vsGroup[ 0 ];
};

const fvsProver = ( sId ) => faRun([ "--sid", sId ]).sStdout.split( "\n" )
  .slice( 1 )
  .filter(( sLine ) => sLine !== "" && !sLine.startsWith( "no link names" ))
  .map(( sLine ) => sLine.split( "  " ).slice( 0, 2 ).join( "  " ));

const fvsCiter = () => faRun([ "--guidance" ]).sStdout.split( "\n" )
  .filter(( sLine ) => sLine.startsWith( "    " ))
  .map(( sLine ) => sLine.trim());

const fsStatus = ( sId ) => {
  const vsGroup = faRun([ "--sid", sId ]).sStdout.match( /status: (\w+)/ );
  return vsGroup === null ? null : vsGroup[ 1 ];
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

const fsTestLinked = ( sName ) => [
  fsLink( "s-lng001" ),
  "test( \"" + sName + "\", () => {} );",
  ""
].join( "\n" );

// @proves s-wthfms@d2c5ecd
// @proves s-dnog08@dde78ed
describe( "language-readings — the JavaScript reading's files", () => {
  test( "test files end .test.js, .test.mjs, .test.cjs or .test.jsx and are "
    + "read as a .test.js file is, and a .jsx file is read for guidance, "
    + "PAIRED with a .ts test file and a .jsx helper, which are no test "
    + "files", () => {
    fWriteTree([ "javascript" ], {
      "test/a.test.js": fsTestLinked( "js" ),
      "test/b.test.mjs": [
        "// @spec specs/a.md",
        "",
        fsLink( "s-lng001" ),
        "describe( \"group\", () => {",
        "  test( \"mjs\", () => {} );",
        "});",
        ""
      ].join( "\n" ),
      "test/c.test.cjs": fsTestLinked( "cjs" ),
      "test/d.test.jsx": fsTestLinked( "jsx" ),
      "test/e.test.ts": fsTestLinked( "ts" ),
      "test/f.jsx": fsTestLinked( "helper" ),
      "src/g.jsx": "// @follows " + fsRef( "g-lng007" )
        + "\nexport const e = <p>it's</p>;\n"
    });
    expect( fvsProver( "s-lng001" )).toEqual([
      "test/a.test.js:1  js",
      "test/b.test.mjs:3  group",
      "test/c.test.cjs:1  cjs",
      "test/d.test.jsx:1  jsx"
    ]);
    expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 4" );
    expect( fvsCiter()).toContain( "src/g.jsx:1  current" );
  });
});

// @proves s-qap8tu@38172ce
// @proves s-3mnehj@681e132
// @proves s-qkq11z@1273ca2
test( "language-readings — TypeScript test files, directives, groups and "
  + "test modifiers use the JavaScript reading", () => {
  fWriteTree([ "typescript" ], {
    "test/a.test.ts": [
      "// @spec specs/a.md",
      "// @proves " + fsRef( "s-lng001" ),
      "describe.each([ 1 ])(\"group %i\", ( n ) => {",
      "  test.only(\"typescript\", () => { void n; });",
      "});",
      ""
    ].join( "\n" ),
    "test/b.test.tsx": [
      "// @spec specs/a.md",
      "// @proves " + fsRef( "s-lng001" ),
      "it.skip(\"tsx case\", () => {});",
      ""
    ].join( "\n" ),
    "test/not-a-test.ts": "test( \"helper\", () => {} );\n"
  });
  expect( fvsProver( "s-lng001" )).toEqual([
    "test/a.test.ts:2  group %i",
    "test/b.test.tsx:2  tsx case"
  ]);
  expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 2" );
  expect( fvsLineInSection( fsReport(), sTitleOwnerBad )).toEqual( [] );
});

const fsJsxInside = () => [
  "const eText = <div>",
  fsLink( "s-lng002" ),
  "test( \"in text\", fDone );",
  "</div>;",
  "const eAttr = <p title=\"",
  fsLink( "s-lng002" ),
  "test( 'in attribute', fDone );",
  "\">x</p>;",
  "",
  fsLink( "s-lng003" ),
  "test( \"after\", () => {} );",
  ""
].join( "\n" );

const vtJsxFile = [
  [ "test/x.test.jsx", [ "javascript" ]],
  [ "test/x.test.tsx", [ "typescript" ]]
];

// @proves s-lwbls1@62d3bb8
describe( "language-readings — JSX text and attribute strings are literals",
() => {
  test.each( vtJsxFile )( "in %s, a link line and a test call inside JSX "
    + "text or a JSX attribute string are not read", ( sPath, vsLanguage ) => {
    fWriteTree( vsLanguage, { [ sPath ]: fsJsxInside() });
    expect( fvsProver( "s-lng002" )).toEqual( [] );
    expect( fvsProver( "s-lng003" )).toEqual([ sPath + ":10  after" ]);
    expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 1" );
  });

  const vtElement = [
    [ "an apostrophe in text", "<p>Don't stop</p>" ],
    [ "a quote in text", "<p>Say \"hi</p>" ],
    [ "// in text", "<p>see http://a.b</p>" ],
    [ "a backtick in text", "<p>Press ` to start</p>" ],
    [ "/* in text", "<p>Match src/*.js</p>" ],
    [ "a backslash ending an attribute string", "<p title=\"C:\\\">x</p>" ]
  ];

  test.each( vtElement )( "PAIRED: %s opens no literal and no comment, so "
    + "the group around it ends where it ends and the link line after it is "
    + "read", ( sWhat, sElement ) => {
    fWriteTree([ "javascript" ], {
      "test/x.test.jsx": [
        fsLink( "s-lng004" ),
        "describe( \"group\", () => " + sElement + " );",
        "",
        "const e = " + sElement + ";",
        "",
        fsLink( "s-lng003" ),
        "test( \"after\", () => {} );",
        "",
        "test( \"outside\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsProver( "s-lng003" )).toEqual([ "test/x.test.jsx:6  after" ]);
    expect( fsUnlinked()).toBe( "Unlinked tests: 1 of 2" );
  });
});

// @proves s-z7g07z@6db8f99
test( "language-readings — a comment in a JSX expression container is a "
  + "block comment, so no directive in it is read, PAIRED with the link line "
  + "after it, which is", () => {
  fWriteTree([ "javascript" ], {
    "test/x.test.jsx": [
      "const e = <div>",
      "  {/* @spec specs/b.md */}",
      "  {/*",
      fsLink( "s-lng002" ),
      "test( \"in comment\", fDone );",
      "  */}",
      "</div>;",
      "",
      fsLink( "s-lng003" ),
      "test( \"after\", () => {} );",
      ""
    ].join( "\n" )
  });
  const sOut = fsReport();
  expect( fvsLineInSection( sOut, sTitleOwnerBad )).toEqual( [] );
  expect( fvsProver( "s-lng002" )).toEqual( [] );
  expect( fvsProver( "s-lng003" )).toEqual([ "test/x.test.jsx:9  after" ]);
  expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 1" );
});

// @proves s-9guyrl@067706f
test( "language-readings — a .js file is read with no JSX, so what JSX "
  + "would hide is read there", () => {
  fWriteTree([ "javascript" ], { "test/x.test.js": fsJsxInside() });
  expect( fvsProver( "s-lng002" )).toEqual([
    "test/x.test.js:2  in text",
    "test/x.test.js:6  in attribute"
  ]);
  expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 3" );
});

const fsChecked = ( sBody ) => (
  "// @checks " + fsRef( "i-lng008" ) + "\n" + sBody + "\n"
);

const vtJsxNormal = [
  [ "src/v.jsx", [ "javascript" ]],
  [ "src/v.tsx", [ "typescript" ]]
];

// @proves s-rolffo@1dccf9b
describe( "language-readings — JSX normalisation", () => {
  test.each( vtJsxNormal )( "in %s, a hand check passed stays passed when "
    + "only a run of whitespace in JSX text changes, PAIRED with whitespace "
    + "removed from JSX text, a changed attribute string's whitespace and a "
    + "changed word, each of which makes it stale", ( sPath, vsLanguage ) => {
    const fsElement = ( sTitle, sText ) => (
      "export const e = <p title=\"" + sTitle + "\">" + sText + "</p>;"
    );
    fWriteTree( vsLanguage, {
      [ sPath ]: fsChecked( fsElement( "a  b", "Hello ,  world" ))
    });
    expect( faRun([ "--pass", "i-lng008" ]).cExit ).toBe( 0 );
    expect( fsStatus( "i-lng008" )).toBe( "passed" );
    [
      [ "a  b", "Hello ,\n    world", "passed" ],
      [ "a  b", "Hello, world", "stale" ],
      [ "a b", "Hello ,  world", "stale" ],
      [ "a  b", "Hello ,  there", "stale" ]
    ].forEach(([ sTitle, sText, sStatus ]) => {
      fWriteFile( sPath, fsChecked( fsElement( sTitle, sText )));
      expect( fsStatus( "i-lng008" )).toBe( sStatus );
    });
  });
});

const vsLanguageHtml = [ "javascript", "html" ];

// @proves s-nachij@b9de24b
// @proves s-uhmyhr@5d69172
// @proves s-z28ucn@585ecdf
describe( "language-readings — the HTML reading's files", () => {
  const sFollows = "<!-- @follows " + fsRef( "g-lng007" ) + " -->";
  const sPage = [
    sFollows,
    "<!-- @spec specs/b.md -->",
    "<!-- " + fsLink( "s-lng002" ).slice( 3 ) + " -->",
    "<script>",
    fsLink( "s-lng002" ),
    "test( \"in html\", fDone );",
    "</script>",
    fsLink( "s-lng002" ),
    "test( \"bare\", fDone );",
    ""
  ].join( "\n" );
  const asTree = {
    "src/a.html": sFollows + "\n<p>x</p>\n",
    "src/b.htm": sFollows + "\n<p>x</p>\n",
    "test/page.html": sPage,
    "test/page.test.html": sPage
  };

  test( ".html and .htm files are read for guidance, in a suite's directory "
    + "too, and none is a test file", () => {
    fWriteTree( vsLanguageHtml, asTree );
    expect( fvsCiter()).toEqual([
      "src/a.html:1  current",
      "src/b.htm:1  current",
      "test/page.html:1  current",
      "test/page.test.html:1  current"
    ]);
    expect( fvsProver( "s-lng002" )).toEqual( [] );
    expect( fvsLineInSection( fsReport(), sTitleOwnerBad )).toEqual( [] );
    expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 0" );
  });

  test( "PAIRED: with html undeclared, no HTML file is read", () => {
    fWriteTree([ "javascript" ], asTree );
    expect( fvsCiter()).toEqual( [] );
  });
});

// @proves s-tn4ty4@2ce57be
// @proves s-1j5z4y@58afac8
test( "language-readings — an HTML comment is read outside script and style "
  + "content and attribute values, on any line, PAIRED with directives in "
  + "each of those, which are not", () => {
  const sBad = "@follows g-lng007@0000000";
  fWriteTree( vsLanguageHtml, {
    "src/p.html": [
      "<!DOCTYPE html>",
      "<!-- @follows " + fsRef( "g-lng007" ) + " -->",
      "<html>",
      "<body data-x=\"<!-- " + sBad + " -->\" data-y='<!-- " + sBad + " -->'>",
      "<script>",
      "// " + sBad,
      "const s = \"<!-- " + sBad + " -->\";",
      "</script>",
      "<style>",
      "/* " + sBad + " */",
      ".a { content: \"<!-- " + sBad + " -->\"; }",
      "</style>",
      "<p>text <!-- " + sBad + " --></p>",
      "  <!-- @follows g-lng007@1111111 -->",
      "</body>",
      "</html>",
      ""
    ].join( "\n" )
  });
  const vsBad = fvsLineInSection( fsReport(), sTitleFollowsBad );
  expect( vsBad ).toEqual([
    expect.stringMatching( /^src\/p\.html:13 {2}g-lng007 {2}\(malformed\)$/ ),
    expect.stringMatching(
      /^src\/p\.html:14 {2}g-lng007 {2}stale {2}recorded 1111111 /
    )
  ]);
  expect( fvsCiter()).toContain( "src/p.html:2  current" );
});

// @proves s-2jld9b@f37640f
// @proves s-zney60@13f1359
// @proves s-qb233y@6930374
// @proves s-7tlfzo@3813b5e
describe( "language-readings — HTML code references", () => {
  test( "one-line comments above or below the doctype in the header are "
    + "directives for the whole file, PAIRED with one sharing its line and "
    + "one spanning lines, which are malformed, and ones after the header, "
    + "which are misplaced", () => {
    fWriteTree( vsLanguageHtml, {
      "test/a.test.js": [
        fsLink( "s-lng005" ), "test( \"proves\", () => {} );", ""
      ].join( "\n" ),
      "src/h.html": [
        "<!-- @implements " + fsRef( "s-lng005" ) + " -->",
        "<!DOCTYPE html>",
        "<!-- @tested-by test/a.test.js -->",
        "  <!-- @checks " + fsRef( "i-lng008" ) + " -->",
        "<!-- @implements " + fsRef( "s-lng006" ) + " --> <!-- second -->",
        "<!-- @implements",
        "     " + fsRef( "s-lng006" ) + " -->",
        "<html><!-- @implements " + fsRef( "s-lng006" ) + " -->",
        "<!-- @implements " + fsRef( "s-lng006" ) + " -->",
        "</html>",
        ""
      ].join( "\n" )
    });
    const sOut = fsReport();
    expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual([
      expect.stringMatching( /^src\/h\.html:5 .*\(malformed\)$/ ),
      expect.stringMatching( /^src\/h\.html:6 .*\(malformed\)$/ ),
      expect.stringMatching( /^src\/h\.html:8 .*\(misplaced\)$/ ),
      expect.stringMatching( /^src\/h\.html:9 .*\(misplaced\)$/ )
    ]);
    const vsNoImplementation = fvsLineInSection( sOut, sTitleNoImplementation );
    expect( vsNoImplementation.some(( s ) => s.includes( "s-lng006" )))
      .toBe( true );
    expect( vsNoImplementation.some(( s ) => s.includes( "s-lng005" )))
      .toBe( false );
    expect( fvsLineInSection( sOut, sTitleNoTestedBy )).toEqual( [] );
    expect( fvsLineInSection( sOut, sTitleNoCode )).toEqual( [] );
  });
});

// @proves s-jqqjjj@cfe7b54
// @proves s-rdpnaf@0033647
// @proves s-z6r8qu@bc64f8c
// @proves s-p069rs@d53d867
// @proves s-m7xrlq@a850adb
// @proves s-trdu1m@34986f1
// @proves s-wut129@714b56a
// @proves s-846yjd@fa50804
// @proves s-n4r9dw@4bcc808
// @proves s-op9bak@37c9f3e
// @proves s-8tx2ob@cc1c510
// @proves s-5un01z@b74caaa
// @proves s-rkbz86@59f60c9
// @proves s-k6leed@80135a4
describe( "language-readings — the Rust reading", () => {
  test( "Rust test attributes, nested modules and links are read, while "
    + "comments, literals and wrapper declarations follow Rust rules", () => {
    const sHash = fsHash( asTextForId[ "s-lng001" ]);
    fWriteTree([ "rust" ], {
      "test/rust.test.rs": [
        "// @spec specs/a.md",
        "// @proves s-lng001@" + sHash,
        "#[test]",
        "fn rust_unit() {}",
        "// @spec specs/a.md",
        "// @proves s-lng001@" + sHash,
        "mod nested {",
        "  #[tokio::test]",
        "  async fn async_unit() {}",
        "  /// @proves s-lng002@0000000",
        "  #[test]",
        "  fn doc_comment_is_not_a_link() {}",
        "}",
        "const S: &str = r#\"// @proves s-lng002@0000000\"#;",
        "/* outer /* @proves s-lng002@0000000 */ inner */",
        "const C: char = '/';",
        ""
      ].join( "\n" )
    });
    expect( fvsProver( "s-lng001" )).toEqual([
      "test/rust.test.rs:2  rust_unit",
      "test/rust.test.rs:6  nested"
    ]);
    expect( fvsProver( "s-lng002" )).toEqual( [] );
    expect( fvsLineInSection( fsReport(), sTitleLinkBad )).toEqual( [] );
    expect( fsUnlinked()).toBe( "Unlinked tests: 0 of 3" );
  });
});

// @proves s-rv4wbq@86ed5ff
// @proves s-2l6ys1@d966d32
// @proves s-01nsp8@60401fe
// @proves s-23wmhe@fec8ae0
// @proves s-3m6dwj@187ed85
test( "language-readings — implementation files of each reading use its "
  + "comment syntax, PAIRED with a directive in a string and in an "
  + "attribute value, which are not read", () => {
  const fsImpl = ( sId ) => "@implements " + fsRef( sId );
  fWriteTree([ "javascript", "css", "html" ], {
    "src/a.js": "// " + fsImpl( "s-lng001" ) + "\nconst s = \"// "
      + fsImpl( "s-lng002" ) + "\";\n",
    "src/b.css": "/* " + fsImpl( "s-lng003" ) + " */\n.a { content: \"/* "
      + fsImpl( "s-lng002" ) + " */\"; }\n",
    "src/c.html": "<!-- " + fsImpl( "s-lng004" ) + " -->\n<p title=\"<!-- "
      + fsImpl( "s-lng002" ) + " -->\">x</p>\n"
  });
  const sOut = fsReport();
  const vsNoImplementation = fvsLineInSection( sOut, sTitleNoImplementation )
    .map(( s ) => s.split( "  " )[ 1 ]);
  expect( vsNoImplementation ).toContain( "s-lng002" );
  [ "s-lng001", "s-lng003", "s-lng004" ].forEach(( sId ) => (
    expect( vsNoImplementation ).not.toContain( sId )
  ));
  expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual( [] );
});

// @proves s-rv4wbq@86ed5ff
// @proves s-zrjuk3@760428d
// @proves s-tghouh@f811aec
// @proves s-bqioq5@e78161a
test( "language-readings — Rust code references are header line comments, "
  + "not doc comments or literals, and ones after the header are "
  + "misplaced", () => {
  const sImpl = fsRef( "s-lng005" );
  const sCheck = fsRef( "i-lng008" );
  const sSpecLink = "// @proves " + fsRef( "s-lng005" );
  fWriteTree([ "rust" ], {
    "src/r.rs": [
      "// @implements " + sImpl,
      "// @tested-by test/rust.test.rs",
      "// @checks " + sCheck,
      "/// @implements s-lng006@0000000",
      "#![allow(dead_code)]",
      "// @implements s-lng006@0000000",
      "fn page() {",
      "  let s = r#\"// @implements s-lng006@0000000\"#;",
      "}",
      "// @implements s-lng006@0000000",
      ""
    ].join( "\n" ),
    "test/rust.test.rs": [
      "// @spec specs/a.md",
      sSpecLink,
      "#[test]",
      "fn implementation_is_checked() {}",
      ""
    ].join( "\n" )
  });
  const sOut = fsReport();
  expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual([
    expect.stringMatching( /^src\/r\.rs:6 .*\(misplaced\)$/ ),
    expect.stringMatching( /^src\/r\.rs:10 .*\(misplaced\)$/ )
  ]);
  expect( fvsLineInSection( sOut, sTitleNoTestedBy )).toEqual( [] );
  expect( fvsLineInSection( sOut, sTitleNoCode )).toEqual( [] );
  expect( fvsLineInSection( sOut, sTitleNoImplementation )
    .map(( s ) => s.split( "  " )[ 1 ])).toContain( "s-lng006" );
});

// @proves s-tghouh@f811aec
test( "language-readings — malformed Rust implementation references are "
  + "reported in their source file", () => {
  fWriteTree([ "rust" ], {
    "src/bad.rs": "// @implements s-lng005@NOT-A-HASH\nfn bad() {}\n"
  });
  expect( fvsLineInSection( fsReport(), sTitleCodeRefBad )).toEqual([
    expect.stringMatching( /^src\/bad\.rs:1 .*\(malformed\)$/ )
  ]);
});

// @proves s-tghouh@f811aec
test( "language-readings — an implementation reference to a non-statement is rejected", () => {
  fWriteTree([ "javascript" ], {
    "src/wrong.js": "// @implements " + fsRef( "g-lng007" ) + "\n"
      + "const value = 1;\n"
  });
  expect( fvsLineInSection( fsReport(), sTitleCodeRefBad )).toEqual([
    expect.stringMatching( /^src\/wrong\.js:1 .*names a line of type guidance/ )
  ]);
});

// @proves s-4hsltb@35856a9
test( "language-readings — an implementation with no tested-by line is listed", () => {
  fWriteTree([ "javascript" ], {
    "src/untested.js": "// @implements " + fsRef( "s-lng001" ) + "\n"
      + "const value = 1;\n",
    "test/a.test.js": [
      "// @spec specs/a.md",
      fsLink( "s-lng001" ),
      "test( \"proves the rule\", () => {} );",
      ""
    ].join( "\n" )
  });
  fWriteFile( "specs/a.md", [
    "# A",
    "",
    "Statement ids: complete",
    "",
    "## API",
    "",
    "* {#s-lng001} " + asTextForId[ "s-lng001" ],
    ""
  ].join( "\n" ));
  expect( fvsLineInSection( fsReport(), sTitleNoTestedBy )).toContain(
    "src/untested.js"
  );
});

// @proves s-me9dys@227966a
test( "language-readings — TypeScript type-only syntax is erased when "
  + "checking a hand-checked file", () => {
  const fsTypeSource = ( sSpace ) => fsChecked(
    "const amount" + sSpace + ": number = 1;\nexport { amount };"
  );
  fWriteTree([ "typescript" ], { "src/checked.ts": fsTypeSource( " " ) });
  expect( faRun([ "--pass", "i-lng008" ]).cExit ).toBe( 0 );
  expect( fsStatus( "i-lng008" )).toBe( "passed" );
  fWriteFile( "src/checked.ts", fsTypeSource( "" ));
  expect( fsStatus( "i-lng008" )).toBe( "passed" );
  fWriteFile( "src/checked.ts", fsChecked(
    "const amount: number = 2;\nexport { amount };"
  ));
  expect( fsStatus( "i-lng008" )).toBe( "stale" );
});

// @proves s-1a9ecj@2117295
test( "language-readings — Rust normalisation removes comments and "
  + "whitespace-only edits but preserves code changes", () => {
  const fsRust = ( sBody ) => fsChecked( sBody );
  fWriteTree([ "rust" ], {
    "src/checked.rs": fsRust( "fn amount() { let count = 1; }" )
  });
  expect( faRun([ "--pass", "i-lng008" ]).cExit ).toBe( 0 );
  fWriteFile( "src/checked.rs", fsRust(
    "// a comment\nfn  amount ( ) { let count=1; }"
  ));
  expect( fsStatus( "i-lng008" )).toBe( "passed" );
  fWriteFile( "src/checked.rs", fsRust(
    "// a comment\nfn  amount ( ) { let count=2; }"
  ));
  expect( fsStatus( "i-lng008" )).toBe( "stale" );
});

// @proves s-zsxa7g@af4b09e
// @proves s-3bftr3@5507835
describe( "language-readings — HTML normalisation", () => {
  const fsPage = ( sBody ) => (
    "<!-- @checks " + fsRef( "i-lng008" ) + " -->\n<!DOCTYPE html>\n" + sBody
  );
  const sBody = "<p title=\"a  b\">Hello   world</p>\n"
    + "<script>var s = \"<!-- k -->\";</script>\n";
  const vtEdit = [
    [ "comments added and whitespace reflowed", "passed",
      "<!-- a note --><p  title=\"a b\">Hello\n world</p>\n"
        + "<script>var s = \"<!-- k -->\";</script>\n<!-- end -->\n" ],
    [ "a word changed", "stale",
      "<p title=\"a  b\">Hello   there</p>\n"
        + "<script>var s = \"<!-- k -->\";</script>\n" ],
    [ "a comment-like string in a script changed", "stale",
      "<p title=\"a  b\">Hello   world</p>\n"
        + "<script>var s = \"<!-- j -->\";</script>\n" ]
  ];

  test.each( vtEdit )( "a hand check passed is, with %s, %s", (
    sWhat, sStatus, sBodyNew
  ) => {
    fWriteTree( vsLanguageHtml, { "src/p.html": fsPage( sBody ) });
    expect( faRun([ "--pass", "i-lng008" ]).cExit ).toBe( 0 );
    expect( fsStatus( "i-lng008" )).toBe( "passed" );
    fWriteFile( "src/p.html", fsPage( sBodyNew ));
    expect( fsStatus( "i-lng008" )).toBe( sStatus );
  });
});

// @proves s-9ho983@b227496
// @proves s-obz7rg@010c79a
test( "language-readings — a Rust test's @implements stands in the run "
  + "above its test attribute and counts for its statement, PAIRED with one "
  + "after a blank line", () => {
  fWriteTree([ "rust" ], {
    "test/rust.test.rs": [
      "// @spec specs/a.md",
      "",
      "// @spec specs/a.md",
      fsLink( "s-lng001" ),
      "// @implements " + fsRef( "s-lng001" ),
      "#[test]",
      "fn implements_and_proves() {}",
      "// @implements " + fsRef( "s-lng003" ),
      "",
      fsLink( "s-lng003" ),
      "#[test]",
      "fn proves_only() {}",
      ""
    ].join( "\n" )
  });
  const sOut = fsReport();
  const vsNoImplementation = fvsLineInSection( sOut, sTitleNoImplementation )
    .map(( s ) => s.split( "  " )[ 1 ]);
  expect( vsNoImplementation ).not.toContain( "s-lng001" );
  expect( vsNoImplementation ).toContain( "s-lng003" );
  expect( fvsLineInSection( sOut, sTitleOwnerBad )).toEqual( [] );
  expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual([
    "test/rust.test.rs:8  // @implements " + fsRef( "s-lng003" )
      + " (misplaced)"
  ]);
});
