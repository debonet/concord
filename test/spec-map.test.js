"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap: sPathScript, fWriteConcord } = require(
  "./concord-fixture.js"
);
const { TreeReader, faModel } = require( "../scripts/spec-map.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "spec-map-fixture-" + process.pid
);

const sSpecAlpha = [
  "# Alpha",
  "",
  "Some prose naming `alpha-not-a-case-id` in passing.",
  "",
  "A rule that is fenced. REQUIRED —",
  "`alpha-beta-delta`: the rule holds.",
  "",
  "## Required cases",
  "",
  "* `alpha-beta-gamma` — the bullet case holds.",
  "",
  "## Error Handling",
  "",
  "* `alpha-after-section-id` — not a case, outside the section.",
  ""
].join( "\n" );

const sSpecBeta = [
  "# Beta",
  "",
  "## Required Cases — the beta rules",
  "",
  "* **`beta-bold-case-id`.** The bold bullet case holds.",
  ""
].join( "\n" );

const sTestCarrying = [
  "// @spec specs/alpha.md",
  "// @spec specs/beta/beta.md",
  "describe( \"alpha-beta-gamma — the bullet case\", () => {",
  "  test( \"holds\", () => {} );",
  "} );",
  "test( \"alpha-beta-epsilon — names no listed case\", () => {} );",
  "test( \"plain words lead this name\", () => {} );",
  "test( \x60beta-bold-case-id: the bold case\x60, () => {} );",
  ""
].join( "\n" );

const sSpecGamma = [
  "# Gamma",
  "",
  "## Required cases",
  "",
  "* `gamma-each-table-id` — a table-driven case holds.",
  "* `gamma-quoted-lead-id` — a case whose name quotes its id holds.",
  ""
].join( "\n" );

const sTestGamma = [
  "// @spec specs/gamma.md",
  "test.each([",
  "  [ \"a (paren\", 1 ],",
  "  [ \"b\", 2 ]",
  "])( \"gamma-each-table-id (%s): holds\", () => {} );",
  "it( \"`gamma-quoted-lead-id`: holds\", () => {} );",
  ""
].join( "\n" );

const fWriteFixture = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const faRun = ( vsArg, sDirCwd ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathScript ].concat( vsArg ),
    { cwd: sDirCwd || sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sOut: aResult.stdout + aResult.stderr,
    sStdout: aResult.stdout
  };
};

const sPathSpecRel = path.join( "specs", "alpha.md" );

beforeEach(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  fWriteFixture( sPathSpecRel, sSpecAlpha );
  fWriteFixture( path.join( "specs", "beta", "beta.md" ), sSpecBeta );
  fWriteFixture( path.join( "specs", "gamma.md" ), sSpecGamma );
  fWriteFixture( path.join( "test", "gamma.test.js" ), sTestGamma );
  fWriteFixture( path.join( "test", "alpha.test.js" ), sTestCarrying );
});

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

const sTestPlainNames = [
  "// @spec specs/alpha.md",
  "// @spec specs/beta/beta.md",
  "describe( \"a block of plain words\", () => {",
  "  test( \"holds\", () => {} );",
  "} );",
  "test( \"a second plain name\", () => {} );",
  "test( \"plain words lead this name\", () => {} );",
  "test( \x60a third plain name\x60, () => {} );",
  ""
].join( "\n" );

const sTestKebabModel = [
  "// @spec specs/gamma.md",
  "test( \"claude-opus-4-8 maps to its window\", () => {} );",
  "test( \"legacy-name-here — an unrelated old name\", () => {} );",
  "it( \"gamma-each-table-id, gamma-quoted-lead-id: both\", () => {} );",
  ""
].join( "\n" );

const sTestPlainModel = [
  "// @spec specs/gamma.md",
  "test( \"a model maps to its window\", () => {} );",
  "test( \"an unrelated old name\", () => {} );",
  "it( \"both of them\", () => {} );",
  ""
].join( "\n" );

const fvaRunForNames = ( sTestAlpha, sTestModel ) => {
  fWriteFixture( path.join( "test", "alpha.test.js" ), sTestAlpha );
  fWriteFixture( path.join( "test", "model.test.js" ), sTestModel );
  return [ [], [ sPathSpecRel ], [ path.join( "specs", "gamma.md" ) ] ]
    .map(( vsArg ) => faRun( vsArg ));
};

const reNameList = /case ids?|orphan|kebab|carried|listing spec/i;

describe( "test names carry nothing", () => {
  // @proves s-ns2gme@9b9beb2
  // @proves s-l9g0ah@33e01a9
  test( "kebab-case, backticked and comma-run names beside a Required list "
    + "give the same output and exit as plain names, PAIRED with those "
    + "plain names", () => {
    const vaRunKebab = fvaRunForNames( sTestCarrying, sTestKebabModel );
    const vaRunPlain = fvaRunForNames( sTestPlainNames, sTestPlainModel );
    vaRunKebab.forEach(( aRun, n ) => {
      expect( aRun.sOut ).toBe( vaRunPlain[ n ].sOut );
      expect( aRun.cExit ).toBe( vaRunPlain[ n ].cExit );
      expect( aRun.sOut ).not.toMatch( reNameList );
      expect( aRun.sOut ).not.toMatch( /alpha-beta|claude-opus|legacy-name/ );
    });
    expect( vaRunKebab.map(( aRun ) => aRun.cExit )).toEqual([ 0, 0, 0 ]);
  });
});

describe( "a spec path", () => {
  // @proves s-92u5vq@475d2f0
  test( "given absolute is the same spec as given relative", () => {
    const aRunRel = faRun( [ sPathSpecRel ] );
    const aRunAbs = faRun( [ path.join( sDirFixture, sPathSpecRel ) ] );
    expect( aRunAbs.sOut ).toBe( aRunRel.sOut );
    expect( aRunAbs.cExit ).toBe( aRunRel.cExit );
  });

  // @proves s-1fwxnq@6500111
  test( "that does not exist exits non-zero", () => {
    const aRun = faRun( [ path.join( "specs", "absent.md" ) ] );
    expect( aRun.cExit ).not.toBe( 0 );
  });
});

// @proves s-cwbb50@b1fa155
// @proves s-k9c32y@39fbb4e
describe( "unterminated test syntax", () => {
  test( "a test name with no closing quote is scanned without inventing a name", () => {
    fWriteFixture( path.join( "test", "unterminated-name.test.js" ), [
      "// @spec specs/alpha.md",
      "test( \"alpha-beta-gamma — an unterminated name, () => {} );",
      ""
    ].join( "\n" ));
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sOut ).not.toContain( "unterminated name" );
  });

  test( "an unterminated bracket group is masked through end of test source", () => {
    fWriteFixture( path.join( "test", "unterminated-group.test.js" ), [
      "// @spec specs/alpha.md",
      "test.each([ [ \"alpha-beta-gamma\", 1 ] )( \"table case\", () => {} );",
      "test( \"this follows the unclosed group\", () => {} );",
      ""
    ].join( "\n" ));
    const aRun = faRun([]);
    expect( aRun.cExit ).toBe( 0 );
  });
});

describe( "tree entries and worklist paths", () => {
  // @proves s-2l6ys1@d966d32
  test( "implementation file paths are sorted and non-file entries are ignored", () => {
    fWriteFixture( "src/z.js", "const z = 1;\n" );
    fWriteFixture( "src/a.js", "const a = 1;\n" );
    fs.symlinkSync( "/dev/null", path.join( sDirFixture, "src", "special" ));
    const reader = new TreeReader( sDirFixture, {
      vsLanguage: [ "javascript" ], vsDirRead: [ "src" ],
      vsDirIgnored: [], vaSuite: []
    });
    expect( reader.fsKind( "src/special" )).toBeNull();
    expect( reader.fvsPathFile( "src" )).toEqual([ "src/a.js", "src/z.js" ]);
    expect( faModel({ vaSpec: [], vaTest: [] }).vaCodeRef ).toEqual([]);
  });

  // @proves s-z7gbzu@ab3b738
  test( "a missing implementation work file is reported without writing a page", () => {
    const aRun = faRun([
      "--worklist", "page.html", "--work", "missing-implementation.txt"
    ]);
    expect( aRun.cExit ).toBe( 1 );
    expect( aRun.sOut ).toContain( "no file at missing-implementation.txt" );
  });

  // @proves s-khw3hm@18fc4f5
  test( "recording a check also validates its spec pointer targets", () => {
    fWriteFixture( "specs/pointers.md", [
      "# Pointer targets",
      "",
      "## API",
      "",
      "* {#p-abc123 >specs/missing.md} Points to an absent spec.",
      "* {#i-check1 >src/a.js} **Do:** open it. **Look for:** a box.",
      ""
    ].join( "\n" ));
    const aRun = faRun([ "--pass", "i-check1" ]);
    expect( aRun.cExit ).toBe( 0 );
  });
});

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWriteConcord( sDirFixture );
  const asBody = { ...asBodyForPath };
  const asStatement = new Map();
  Object.entries( asBody ).filter(([ sPath, sText ]) => (
    sPath.startsWith( "specs/" ) && /Statement ids: complete/.test( sText )
  )).forEach(([ sPath, sText ]) => {
    sText.split( "\n" ).forEach(( sLine ) => {
      const vsMarker = sLine.match(
        /^\s*\*\s+\{#(s-[a-z0-9]{6})(?: [^}]*)?\}\s*(.*)$/
      );
      if( vsMarker !== null ){
        asStatement.set( vsMarker[ 1 ], fsHash( vsMarker[ 2 ].trim()));
      }
    });
  });
  const amTestsForStatement = new Map();
  Object.entries( asBody ).filter(([ sPath ]) => (
    /(?:^|\/)test\/.*\.test\.[cm]?js$/.test( sPath )
  )).forEach(([ sPath, sText ]) => {
    Array.from( sText.matchAll(
      /^\s*\/\/ @proves (s-[a-z0-9]{6})@([0-9a-f]{7})\s*$/gm
    ))
      .filter(( vsLink ) => asStatement.has( vsLink[ 1 ])
        && asStatement.get( vsLink[ 1 ]) === vsLink[ 2 ])
      .forEach(( vsLink ) => {
        const vsPath = amTestsForStatement.get( vsLink[ 1 ]) || [];
        amTestsForStatement.set( vsLink[ 1 ], vsPath.concat( sPath ));
      });
  });
  if( amTestsForStatement.size > 0 ){
    const vsCode = Array.from( amTestsForStatement.keys()).map(( sId ) => (
      "// @implements " + sId + "@" + asStatement.get( sId )
    ));
    const vsTests = Array.from( new Set(
      Array.from( amTestsForStatement.values()).flat()
    )).map(( sPath ) => "// @tested-by " + sPath );
    asBody[ "src/spec-map-fixture.js" ] = vsCode.concat( vsTests )
      .concat([ "const fixture = true;", "" ]).join( "\n" );
  }
  Object.entries( asBody ).forEach(( [ sPathRel, sBody ] ) => (
    fWriteFixture( sPathRel, sBody )
  ));
};

const fvsIdInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd )
    .map(( sLine ) => sLine.trim().split( /\s+/ )[ 0 ])
    .sort();
};

const sTextForm = "The form rule holds.";
const sPathSpecForm = path.join( "specs", "forms.md" );

const fsLinkForm = () => fsLink( "s-frm001", fsHash( sTextForm ));

const fWriteForm = ( asBodyForPath ) => fWriteTree({
  [ sPathSpecForm ]: fsSpecStmt( "Forms", [ "* {#s-frm001} " + sTextForm ]),
  ...asBodyForPath
});

const fvsNameLinkedForm = () => faRun( [ "--sid", "s-frm001" ]).sStdout
  .trim().split( "\n" ).slice( 1 )
  .map(( sLine ) => sLine.split( "  " ));

describe( "how a test name is read", () => {
  // @proves s-dpoj4a@064704f
  test( "a .each name keeps its placeholders and joined literals are their "
    + "join, PAIRED with a backticked name read as written", () => {
    fWriteForm({
      [ path.join( "test", "forms.test.js" ) ]: [
        "// @spec specs/forms.md",
        fsLinkForm(),
        "test.each([ [ \"a\" ] ])( \"form-level-three-id (%s) — each\", "
          + "() => {} );",
        fsLinkForm(),
        "test( \"form-joined-\" + \"literal-id — joined\", () => {} );",
        fsLinkForm(),
        "test( \"`form-level-two-id` — backticked\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ])).toEqual([
      "form-level-three-id (%s) — each",
      "form-joined-literal-id — joined",
      "`form-level-two-id` — backticked"
    ]);
  });

  // @proves s-dpoj4a@064704f
  test( "a name holding an escaped quote and a regex holding a backtick or "
    + "a quote hide no later test's name", () => {
    fWriteForm({
      [ path.join( "test", "escape.test.js" ) ]: [
        "// @spec specs/forms.md",
        "test( \"only `\\\"`, then more\", () => {} );",
        fsLinkForm(),
        "test( \"form-after-escape-id — holds\", () => {} );",
        ""
      ].join( "\n" ),
      [ path.join( "test", "regex.test.js" ) ]: [
        "// @spec specs/forms.md",
        "const n = ( \"a\".match( /`+/g ) || [] ).length / 2;",
        "const re = /[\"'/]/;",
        fsLinkForm(),
        "test( \"form-after-regex-id — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ] + "  " + vs[ 3 ]))
      .toEqual([
        "form-after-escape-id — holds  current",
        "form-after-regex-id — holds  current"
      ]);
  });

  // @proves s-dpoj4a@064704f
  test( "a tagged-template .each table keeps its placeholders, and a quote "
    + "or escaped backtick in the table hides no later test's name", () => {
    fWriteForm({
      [ path.join( "test", "table.test.js" ) ]: [
        "// @spec specs/forms.md",
        fsLinkForm(),
        "test.each\x60",
        "  s       | z",
        "  ${ \"(\" } | ${ \"\\\x60'\" }",
        "\x60( \"form-tagged-table-id ($s) — holds\", () => {} );",
        fsLinkForm(),
        "test( \"form-after-table-id — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    expect( fvsNameLinkedForm().map(( vs ) => vs[ 1 ] + "  " + vs[ 3 ]))
      .toEqual([
        "form-tagged-table-id ($s) — holds  current",
        "form-after-table-id — holds  current"
      ]);
  });
});

const sPathSpecMarker = path.join( "specs", "marker.md" );
const sPathTestMarker = path.join( "test", "marker.test.js" );

const fsSpecMarker = ( vsBullet, sLineRequired ) => [
  "# Marker",
  "",
  "Statement ids: complete",
  "",
  "## API",
  "",
  "* {#s-mkaaa0} The marker rule holds.",
  "",
  sLineRequired,
  ""
].concat( vsBullet, [ "" ]).join( "\n" );

const vsBulletMarkerLead = [
  "* {#s-mkaaa1} `marker-plain-lead-id` — the plain case holds.",
  "* {#s-mkaaa2 <arch} `marker-root-lead-id` — the root case holds.",
  "* {#s-mkaaa3} **`marker-bold-lead-id`.** The bold case holds."
];

const fsTestMarker = () => [ "// @spec specs/marker.md" ].concat(
  [
    [ "s-mkaaa0", "The marker rule holds." ],
    [ "s-mkaaa1", "`marker-plain-lead-id` — the plain case holds." ],
    [ "s-mkaaa2", "`marker-root-lead-id` — the root case holds." ],
    [ "s-mkaaa3", "**`marker-bold-lead-id`.** The bold case holds." ]
  ].map(( t ) => fsLink( t[ 0 ], fsHash( t[ 1 ]))),
  [ "test( \"proves every marker rule\", () => {} );", "" ]
).join( "\n" );

describe( "a bullet under a Required heading", () => {
  // @proves s-ilmml1@de70889
  // @proves s-b1flmr@52ccc3c
  test( "is an ordinary statement whose marker covers the backticked token, "
    + "PAIRED with an unmarked one, a completeness failure", () => {
    [ "## Required cases", "### Required: the manager", "Required cases:" ]
      .forEach(( sLineRequired ) => {
        fWriteTree({
          [ sPathSpecMarker ]: fsSpecMarker(
            vsBulletMarkerLead, sLineRequired
          ),
          [ sPathTestMarker ]: fsTestMarker()
        });
        const aRun = faRun( [ sPathSpecMarker ]);
        expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual( [] );
        expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
        expect( aRun.sOut ).not.toMatch( reNameList );
        expect( aRun.cExit ).toBe( 0 );
        expect( fsHashRun( "s-mkaaa1" )).toBe(
          fsHash( "`marker-plain-lead-id` — the plain case holds." )
        );
        fWriteFixture( sPathSpecMarker, fsSpecMarker(
          vsBulletMarkerLead.concat(
            "* `marker-bare-id` — the unmarked case holds."
          ),
          sLineRequired
        ));
        const aRunBare = faRun( [ sPathSpecMarker ]);
        const vsFail = fvsLineInSection( aRunBare.sOut, sTitleComplete );
        expect( vsFail ).toEqual([
          expect.stringMatching( /^specs\/marker\.md:14 .*marker-bare-id/ )
        ]);
        expect( aRunBare.cExit ).not.toBe( 0 );
    });
  });
});

const sTitleNoOwner = "test files with no owner line";
const sTitleUnresolved = "owner lines that do not resolve";

const fvsLineInSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd ).map(( sLine ) => sLine.trim());
};

const fsSpecOwner = ( sTitle, vsId ) => [
  "# " + sTitle,
  "",
  "## Required cases",
  ""
].concat(
  vsId.map(( sId ) => "* `" + sId + "` — the case holds." ),
  [ "" ]
).join( "\n" );

const sPathSpecA = path.join( "specs", "a.md" );
const sPathSpecB = path.join( "specs", "b.md" );
const sPathTestOne = path.join( "test", "one.test.js" );
const sPathTestTwo = path.join( "test", "two.test.js" );
const sTestAlphaOne = "test( \"alpha-one-case — holds\", () => {} );\n";

describe( "a declared spec directory", () => {
  // @proves s-98jxk4@d886f7c
  // @proves s-3pkw1n@e23773f
  // @proves s-i63o6a@6dbc87e
  test( "holds the specs owner lines name and --assign rewrites, PAIRED "
    + "with a spec outside every declared directory, which no owner line "
    + "names and whose placeholder stays", () => {
    const sSpecOutside = fsSpecStmt( "B", [ "* {#s-?} An undeclared rule." ]);
    fWriteTree({
      "spec/a.md": fsSpecStmt( "A", [ "* {#s-?} A declared rule." ]),
      "specs/b.md": sSpecOutside,
      [ sPathTestOne ]: [
        "// @spec spec/a.md", "// @spec specs/b.md", sTestAlphaOne
      ].join( "\n" )
    });
    fWriteConcord( sDirFixture, { spec_directories: [ "spec" ]});
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUnresolved )).toEqual(
      [ "test/one.test.js:2  // @spec specs/b.md  (no such spec)" ]
    );
    expect( faRun( [ "--assign" ]).cExit ).toBe( 0 );
    const fsRead = ( sPathRel ) => fs.readFileSync(
      path.join( sDirFixture, sPathRel ), "utf8"
    );
    expect( fsRead( "spec/a.md" )).toMatch(
      /\{#s-[a-z0-9]{6}\} A declared rule\./
    );
    expect( fsRead( "specs/b.md" )).toBe( sSpecOutside );
  });
});

// @proves s-98jxk4@d886f7c
// @proves s-3pkw1n@e23773f
describe( "spec-map-owner-file-missing — a file with no owner line", () => {
  test( "is named and an owned file is not, PAIRED with an @spec inside a "
    + "block comment, which owns nothing", () => {
    const sTestPlain = "test( \"plain words\", () => {} );\n";
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestPlain,
      [ sPathTestTwo ]: sTestPlain
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestPlain,
      [ sPathTestTwo ]: "/** @spec specs/a.md */\n" + sTestPlain
    });
    const aRunBlock = faRun( [] );
    expect( fvsLineInSection( aRunBlock.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    expect( fvsLineInSection( aRunBlock.sOut, sTitleUnresolved )).toEqual(
      []
    );
    expect( aRunBlock.cExit ).toBe( 0 );
  });
});

// @proves s-0abyvp@9e5dd00
// @proves s-te9wza@59881f7
describe( "spec-map-helper-file-ignored — a file not named *.test.js", () => {
  test( "is read for nothing, PAIRED with it renamed *.test.js, which is "
    + "then read", () => {
    const sHelper = [
      "// @proves s-nosuch@abcdef0",
      "test( \"helper call\", () => {} );",
      ""
    ].join( "\n" );
    const fWriteHelper = ( sName ) => fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ path.join( "test", "a.test.js" ) ]:
        "// @spec specs/a.md\ntest( \"plain words\", () => {} );\n",
      [ path.join( "test", sName ) ]: sHelper
    });
    fWriteHelper( "ftHelper.js" );
    const aRun = faRun( [] );
    expect( aRun.sOut ).not.toMatch( /ftHelper/ );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 1 of 1$/m );
    expect( aRun.cExit ).toBe( 0 );
    fWriteHelper( "ftHelper.test.js" );
    const aRunTest = faRun( [] );
    expect( fvsLineInSection( aRunTest.sOut, sTitleNoOwner )).toEqual(
      [ "test/ftHelper.test.js" ]
    );
    expect( fvsLineInSection( aRunTest.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( /^test\/ftHelper\.test\.js:1 / ) ]
    );
    expect( aRunTest.sOut ).toMatch( /^Unlinked tests: 2 of 2$/m );
  });
});

// @proves s-bnkk62@d702f3b
// @proves s-3pkw1n@e23773f
describe( "spec-map-owner-header-placement — a header owner line", () => {
  test( "after a jest docblock and above 'use strict' owns the file, "
    + "PAIRED with one after a require and a blank line, misplaced", () => {
    const sTestDocblock = [
      "/**",
      " * @jest-environment jsdom",
      " */",
      "// @spec specs/a.md",
      "'use strict';",
      sTestAlphaOne
    ].join( "\n" );
    const sTestLate = [
      "'use strict';",
      "const fs = require( \"fs\" );",
      "// @spec specs/a.md",
      "",
      "describe( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
      [ sPathTestOne ]: sTestDocblock,
      [ sPathTestTwo ]: sTestLate
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual(
      [ sPathTestTwo ]
    );
    const vsUnresolved = fvsLineInSection( aRun.sOut, sTitleUnresolved );
    expect( vsUnresolved ).toHaveLength( 1 );
    expect( vsUnresolved[ 0 ]).toMatch(
      new RegExp( "^" + sPathTestTwo + ":3 .*// @spec specs/a\\.md" )
    );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-pslzjw@bb3ff6d
// @proves s-3pkw1n@e23773f
describe( "spec-map-owner-block-replaces — a block owner line", () => {
  test( "replaces the file's owners inside its describe, PAIRED with the "
    + "file owner's test moved inside, which b then owns and a does not",
  () => {
    const fsTestBlock = ( sInside, sOutside ) => [
      "// @spec specs/a.md",
      "'use strict';",
      "// @spec specs/b.md",
      "describe( \"block of b\", () => {",
      "  test( \"inner test\", () => {} );",
      sInside + "} );",
      sOutside
    ].join( "\n" );
    const sTestOuter = "test( \"outer test\", () => {} );\n";
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-oba001} Rule a." ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-obb001} Rule b." ], true )
    };
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    fWriteTree({
      ...aBodyForSpec, [ sPathTestOne ]: fsTestBlock( "", sTestOuter )
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleUnresolved )).toEqual(
      []
    );
    expect( fvsNameFailing( sPathSpecA )).toEqual([ "outer test" ]);
    expect( fvsNameFailing( sPathSpecB )).toEqual([ "inner test" ]);
    fWriteTree({
      ...aBodyForSpec,
      [ sPathTestOne ]: fsTestBlock( "  " + sTestOuter, "" )
    });
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "inner test", "outer test" ]
    );
  });
});

// @proves s-3pkw1n@e23773f
describe( "spec-map-owner-stale-path-fails — an owner line naming no spec",
  () => {
    test( "fails the path run and is named by the full run, PAIRED with it "
      + "re-aimed at an existing spec", () => {
      const fsTestStale = ( sPathOwner ) => (
        "// @spec specs/a.md\n// @spec " + sPathOwner + "\n" + sTestAlphaOne
      );
      const aBodyForSpec = {
        [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
        [ sPathSpecB ]: fsSpecOwner( "B", [] )
      };
      fWriteTree({
        ...aBodyForSpec, [ sPathTestOne ]: fsTestStale( "specs/gone.md" )
      });
      const aRunPath = faRun( [ sPathSpecA ] );
      expect( fvsLineInSection( aRunPath.sOut, sTitleUnresolved )).toEqual(
        [ sPathTestOne + ":2  // @spec specs/gone.md  (no such spec)" ]
      );
      expect( aRunPath.cExit ).not.toBe( 0 );
      const aRunAll = faRun( [] );
      expect( aRunAll.sOut ).toMatch( /:2 {2}\/\/ @spec specs\/gone\.md/ );
      expect( aRunAll.cExit ).toBe( 0 );
      fWriteTree({
        ...aBodyForSpec, [ sPathTestOne ]: fsTestStale( "specs/b.md" )
      });
      const aRunAimed = faRun( [ sPathSpecA ] );
      expect( fvsLineInSection( aRunAimed.sOut, sTitleUnresolved )).toEqual(
        []
      );
      expect( aRunAimed.cExit ).toBe( 0 );
    });
  }
);

// @proves s-3pkw1n@e23773f
describe( "spec-map-owner-scope-other-file — the path run's files", () => {
  test( "leave out a file naming neither the spec nor its ids, PAIRED with "
    + "the full run naming that file's stale line", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [ "alpha-one-case" ]),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestAlphaOne,
      [ sPathTestTwo ]: (
        "// @spec specs/gone.md\ntest( \"plain words\", () => {} );\n"
      )
    });
    const aRunPath = faRun( [ sPathSpecA ] );
    expect( aRunPath.sOut ).not.toMatch( /two\.test\.js/ );
    expect( aRunPath.cExit ).toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnresolved )).toEqual(
      [ sPathTestTwo + ":1  // @spec specs/gone.md  (no such spec)" ]
    );
    expect( aRunAll.cExit ).toBe( 0 );
  });
});

const sTitleMarker = "malformed markers and duplicate ids";
const sTitleUnproved = "statements no test proves";
const sTitleLinkBad = "link lines that do not resolve";
const sTitleStale = "stale links";
const sTitleComplete = "completeness failures";
const sTitleRemovable = "removable owner lines";
const sTitlePlaceholder = "placeholders";
const sLineComplete = "Statement ids: complete";

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsSpecStmt = ( sTitle, vsBody, bComplete ) => [
  "# " + sTitle,
  ""
].concat(
  bComplete ? [ sLineComplete, "" ] : [],
  [ "## API", "" ],
  vsBody,
  [ "" ]
).join( "\n" );

const fsLink = ( sId, sHash ) => "// @proves " + sId + "@" + sHash;

const fsHashRun = ( sId ) => faRun( [ "--hash", sId ]).sStdout.trim();

// @proves s-qln1ta@564522c
// @proves s-eel840@1bbc17a
// @proves s-ilmml1@de70889
describe( "spec-map-stmt-hash-normalised — the text hash", () => {
  test( "is the SHA-1 of the normalised text, PAIRED with a rewrap, a "
    + "changed word and a second marker", () => {
    const sPathSpec = path.join( "specs", "h.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "H", vsBody, false )
    });
    fWriteBody([ "* {#s-aaaaa1} The `fooBar` call returns  \"x\"." ]);
    const aRun = faRun( [ "--hash", "s-aaaaa1" ]);
    const sHashWhole = fsHash( "The `fooBar` call returns \"x\"." );
    expect( aRun.sStdout ).toBe( sHashWhole + "\n" );
    expect( aRun.cExit ).toBe( 0 );
    fWriteBody([
      "* {#s-aaaaa1} The `fooBar` call",
      "    returns \"x\"."
    ]);
    expect( fsHashRun( "s-aaaaa1" )).toBe( sHashWhole );
    fWriteBody([ "* {#s-aaaaa1} The `fooBar` call yields \"x\"." ]);
    expect( fsHashRun( "s-aaaaa1" )).not.toBe( sHashWhole );
    fWriteBody([
      "* {#s-aaaaa1} The `fooBar` call. {#s-aaaaa2} It returns \"x\"."
    ]);
    expect( fsHashRun( "s-aaaaa1" )).toBe( fsHash( "The `fooBar` call." ));
    expect( fsHashRun( "s-aaaaa2" )).toBe( fsHash( "It returns \"x\"." ));
  });
});

// @proves s-gry2es@de73667
// @proves s-emmdvh@4dffcdc
// @proves s-b8vvpd@9e72e40
describe( "spec-map-stmt-marker-forms — a marker", () => {
  test( "is malformed in each bad form, PAIRED with ids in a code span and "
    + "a fenced block, which are no markers", () => {
    const sPathSpec = path.join( "specs", "m.md" );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* {#s-abcde} Five characters.",
        "* {#s-abCdef} An uppercase letter.",
        "",
        "### A heading {#s-abcdef}",
        "",
        "### Another {#s-?}",
        "",
        "* {#s-bbbbb1} {#s-bbbbb2} Directly before another.",
        "* A trailing marker {#s-ccccc1}",
        "* Label first {#s-ddddd1} then text."
      ], false )
    });
    const aRunPath = faRun( [ sPathSpec ]);
    const vsMalformed = fvsLineInSection( aRunPath.sOut, sTitleMarker );
    expect( vsMalformed ).toHaveLength( 6 );
    [ 5, 6, 8, 10, 12, 13 ].forEach(( nLine ) => {
      expect( vsMalformed.some(( sLine ) => (
        sLine.startsWith( "specs/m.md:" + nLine + " " )
      ))).toBe( true );
    });
    expect( aRunPath.cExit ).not.toBe( 0 );
    expect( fsHashRun( "s-ddddd1" )).toBe( fsHash( "then text." ));
    expect( fsHashRun( "s-bbbbb2" )).toBe(
      fsHash( "Directly before another." )
    );
    expect( faRun( [] ).cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* A rule naming `{#s-eeeee1}` in a span.",
        "",
        "```text",
        "{#s-eeeee2}",
        "```"
      ], false )
    });
    const aRunCode = faRun( [ sPathSpec ]);
    expect( fvsLineInSection( aRunCode.sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--hash", "s-eeeee1" ]).cExit ).not.toBe( 0 );
    expect( faRun( [ "--hash", "s-eeeee2" ]).cExit ).not.toBe( 0 );
    expect( aRunCode.cExit ).toBe( 0 );
  });
});

const sTitleUnclosed = "unclosed fences";

const fbReadRun = ( sId ) => faRun( [ "--hash", sId ]).cExit === 0;

describe( "spec-map-fence-codespan-wrap — a fence", () => {
  // @proves s-ytmdql@7d7407c
  // @proves s-pwxuov@536babd
  // @proves s-mm67bx@fb5e980
  test( "after a code span wrapped onto a line opening with a fence's "
    + "characters is still read, in a later section, as a marker and a "
    + "placeholder, PAIRED with the line outside a span, a backtick line "
    + "inside it and an unmatched backtick", () => {
    const sPathSpec = path.join( "specs", "m.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", vsBody, false )
    });
    fWriteBody([
      "* {#s-fen001} Before.",
      "",
      "~~~text",
      "{#s-fen002} Inside the fence.",
      "~~~",
      "",
      "* {#s-fen003} After the fence."
    ]);
    const aRunOutside = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-fen002" )).toBe( false );
    expect( fsHashRun( "s-fen003" )).toBe( fsHash( "After the fence." ));
    expect( fvsLineInSection( aRunOutside.sOut, sTitleUnclosed )).toEqual( [] );
    fWriteBody([
      "~~~",
      "```",
      "{#s-fen004} Inside.",
      "```",
      "~~~",
      "",
      "* {#s-fen005} After."
    ]);
    expect( fbReadRun( "s-fen004" )).toBe( false );
    expect( fbReadRun( "s-fen005" )).toBe( true );
    fWriteBody([
      "* A rule with a stray ` backtick",
      "~~~",
      "{#s-fen006} Inside the fence.",
      "~~~",
      "* {#s-fen007} After, naming `x`."
    ]);
    const aRunStray = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-fen006" )).toBe( false );
    expect( fsHashRun( "s-fen007" )).toBe( fsHash( "After, naming `x`." ));
    expect( fvsLineInSection( aRunStray.sOut, sTitleUnclosed )).toEqual( [] );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "M", [
        "* A rule naming `~~~ask <panel/>",
        "  ~~~` wrapped onto two lines.",
        "",
        "## Later",
        "",
        "* {#s-?} A later placeholder rule.",
        "* {#s-fff001} A later marked rule."
      ], false )
    });
    const aRunPath = faRun( [ sPathSpec ]);
    const vsPlaceholder = fvsLineInSection( aRunPath.sOut, sTitlePlaceholder );
    expect( vsPlaceholder ).toHaveLength( 1 );
    expect( vsPlaceholder[ 0 ].startsWith( "specs/m.md:10 " )).toBe( true );
    expect( fvsLineInSection( aRunPath.sOut, sTitleMarker )).toEqual( [] );
    expect( fsHashRun( "s-fff001" )).toBe( fsHash( "A later marked rule." ));
    expect( fvsLineInSection( aRunPath.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunPath.cExit ).toBe( 0 );
  });

  // @proves s-w2msh4@29d36fe
  // @proves s-jg7ill@f9c0b61
  test( "opens on three or more backticks or tildes whatever follows, and "
    + "closes only on a run of its character at least as long with nothing "
    + "after it", () => {
    const sPathSpec = path.join( "specs", "c.md" );
    const fWriteBody = ( vsBody ) => fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "C", vsBody, false )
    });
    fWriteBody([
      "~~~text {#s-cls001} on the opening line",
      "{#s-cls002} Inside.",
      "~~~ not a close",
      "~~",
      "```",
      "  ~~~~  ",
      "",
      "* {#s-cls003} After.",
      "",
      "> ~~~ a quoted line",
      "",
      "* {#s-cls004} After the quote."
    ]);
    const aRun = faRun( [ sPathSpec ]);
    expect( fbReadRun( "s-cls001" )).toBe( false );
    expect( fbReadRun( "s-cls002" )).toBe( false );
    expect( fsHashRun( "s-cls003" )).toBe( fsHash( "After." ));
    expect( fsHashRun( "s-cls004" )).toBe( fsHash( "After the quote." ));
    expect( fvsLineInSection( aRun.sOut, sTitleUnclosed )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    fWriteBody([
      "````",
      "```",
      "{#s-cls005} Inside.",
      "`````",
      "",
      "* {#s-cls006} After."
    ]);
    expect( fbReadRun( "s-cls005" )).toBe( false );
    expect( fbReadRun( "s-cls006" )).toBe( true );
  });
});

describe( "spec-map-unclosed-fence-fails — an unclosed fence", () => {
  // @proves s-du4nns@bbb6351
  // @proves s-cov7pg@e6a079b
  // @proves s-vcpu9h@6d6ac07
  test( "is named and fails its spec's run, PAIRED with a clean spec's run "
    + "and the fence closed", () => {
    const sPathU = path.join( "specs", "u.md" );
    const sPathV = path.join( "specs", "v.md" );
    const vsBodyU = [
      "* {#s-unc001} Before.",
      "",
      "~~~text",
      "{#s-unc002} Inside."
    ];
    const fWriteU = ( vsBody ) => fWriteTree({
      [ sPathU ]: fsSpecStmt( "U", vsBody, false ),
      [ sPathV ]: fsSpecStmt( "V", [ "* {#s-unc003} A rule." ], false )
    });
    fWriteU( vsBodyU );
    const aRunU = faRun( [ sPathU ]);
    expect( fvsLineInSection( aRunU.sOut, sTitleUnclosed )).toEqual(
      [ "specs/u.md:7  ~~~text" ]
    );
    expect( aRunU.cExit ).not.toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnclosed )).toEqual(
      [ "specs/u.md:7  ~~~text" ]
    );
    expect( aRunAll.cExit ).toBe( 0 );
    const aRunV = faRun( [ sPathV ]);
    expect( fvsLineInSection( aRunV.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunV.cExit ).toBe( 0 );
    fWriteU( vsBodyU.concat([ "~~~" ]));
    const aRunClosed = faRun( [ sPathU ]);
    expect( fvsLineInSection( aRunClosed.sOut, sTitleUnclosed )).toEqual( [] );
    expect( aRunClosed.cExit ).toBe( 0 );
  });
});

// @proves s-mijuu3@eb255fe
// @proves s-kzyb2a@f30bbf3
// @proves s-b8vvpd@9e72e40
describe( "spec-map-stmt-duplicate-id — an id marked twice", () => {
  test( "is reported at both places and resolves nowhere, PAIRED with an "
    + "id no spec marks", () => {
    const sTextDup = "The duplicated rule holds.";
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-dup001} " + sTextDup ]),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-dup001} " + sTextDup ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-dup001", fsHash( sTextDup )),
        "test( \"plain words\", () => {} );",
        ""
      ].join( "\n" )
    });
    [ sPathSpecA, sPathSpecB ].forEach(( sPathSpec ) => {
      const aRun = faRun( [ sPathSpec ]);
      const vsDup = fvsLineInSection( aRun.sOut, sTitleMarker );
      expect( vsDup ).toHaveLength( 2 );
      expect( vsDup.join( "\n" )).toMatch( /specs\/a\.md:5 / );
      expect( vsDup.join( "\n" )).toMatch( /specs\/b\.md:5 / );
      expect( aRun.cExit ).not.toBe( 0 );
    });
    const vsLinkBad = fvsLineInSection( faRun( [] ).sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 1 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    [ "--hash", "--sid", "--candidates" ].forEach(( sFlag ) => {
      const aRun = faRun( [ sFlag, "s-dup001" ]);
      expect( aRun.sStdout ).toBe( "" );
      expect( aRun.cExit ).not.toBe( 0 );
    });
    const aRunNone = faRun( [ "--hash", "s-zzzzz9" ]);
    expect( aRunNone.sStdout ).toBe( "" );
    expect( aRunNone.cExit ).not.toBe( 0 );
  });
});

const sTextLink = "The link rule holds.";
const sSpecLinkComplete = fsSpecStmt(
  "A", [ "* {#s-lnk001} " + sTextLink ], true
);

// @proves s-eawgvu@e029ecf
// @proves s-tw3l62@fa30747
// @proves s-jcgn2k@220009d
describe( "spec-map-link-placement — a link line", () => {
  test( "above a describe covers its tests and between an owner line and a "
    + "test resolves, PAIRED with a blank line and a block comment", () => {
    const sLink = fsLink( "s-lnk001", fsHash( sTextLink ));
    fWriteTree({
      [ sPathSpecA ]: sSpecLinkComplete,
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "'use strict';",
        sLink,
        "describe( \"block\", () => {",
        "  test( \"inner one\", () => {} );",
        "  test( \"inner two\", () => {} );",
        "} );",
        ""
      ].join( "\n" ),
      [ sPathTestTwo ]: [
        "// @spec specs/a.md",
        "'use strict';",
        "// @spec specs/a.md",
        sLink,
        "test( \"between\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: sSpecLinkComplete,
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "'use strict';",
        sLink,
        "",
        "test( \"after blank\", () => {} );",
        "/* @proves s-lnk001@0000000 */",
        "test( \"after block comment\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRunBad = faRun( [ sPathSpecA ]);
    const vsLinkBad = fvsLineInSection( aRunBad.sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 1 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:3 / );
    expect( aRunBad.sOut ).not.toMatch( /0000000/ );
    expect( aRunBad.cExit ).not.toBe( 0 );
  });
});

const sTextWrapper = "The wrapper rule holds.";
const sSpecWrapper = fsSpecStmt( "A", [ "* {#s-wrp001} " + sTextWrapper ]);
const sLinkWrapper = fsLink( "s-wrp001", fsHash( sTextWrapper ));
const sLineWrapper = "// @test-wrapper testHost";
const fsTestWrapper = ( vsHeader, vsBody ) => vsHeader.concat(
  [ "\"use strict\";", "const testHost = test;" ], vsBody, [ "" ]
).join( "\n" );
const vsBodyWrapped = [
  sLinkWrapper,
  "testHost( \"alpha-beta-gamma: the wrapped \" + \"call\", () => {} );"
];
const reLinkMisplaced = /^test\/one\.test\.js:\d+ .*\(misplaced\)$/;

describe( "spec-map-declared-wrapper-counts — a declared wrapper", () => {
  // @proves s-8xr9d5@2a15ba6
  // @proves s-0nmcwv@fcc34b4
  test( "call is a test that a link proves and that is counted and owned, "
    + "PAIRED with the wrapper line removed and moved to a second file",
  () => {
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", sLineWrapper ], vsBodyWrapped
      )
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 0 of 1$/m );
    expect( aRun.cExit ).toBe( 0 );
    expect( faRun( [ "--sid", "s-wrp001" ]).sStdout ).toMatch(
      /alpha-beta-gamma: the wrapped call {2}\S+ {2}current/
    );
    const fExpectNoTest = () => {
      const aRunBare = faRun( [ sPathSpecA ]);
      const vsLinkBad = fvsLineInSection( aRunBare.sOut, sTitleLinkBad );
      expect( vsLinkBad ).toHaveLength( 1 );
      expect( vsLinkBad[ 0 ]).toMatch( reLinkMisplaced );
      expect( fvsLineInSection( aRunBare.sOut, sTitleUnproved )).toEqual(
        [ expect.stringMatching( /^s-wrp001 / ) ]
      );
      expect( aRunBare.cExit ).not.toBe( 0 );
    };
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], vsBodyWrapped
      )
    });
    fExpectNoTest();
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], vsBodyWrapped
      ),
      [ sPathTestTwo ]: fsTestWrapper(
        [ "// @spec specs/a.md", sLineWrapper ],
        [ "testHost( \"plain words\", () => {} );" ]
      )
    });
    fExpectNoTest();
  });

  // @proves s-pjx54j@88fdbba
  // @proves s-8xr9d5@2a15ba6
  test( "line below the header declares nothing, PAIRED with a declared "
    + "wrapper whose first argument is no string literal", () => {
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md" ], [ sLineWrapper ].concat( vsBodyWrapped )
      )
    });
    const aRunBelow = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunBelow.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( reLinkMisplaced ) ]
    );
    expect( aRunBelow.cExit ).not.toBe( 0 );
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", "  //   @test-wrapper   testHost  " ],
        [
          "const sName = \"alpha-beta-gamma: by a variable\";",
          sLinkWrapper,
          "testHost( sName, () => {} );"
        ]
      )
    });
    const aRunVar = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunVar.sOut, sTitleLinkBad )).toEqual(
      [ expect.stringMatching( reLinkMisplaced ) ]
    );
    expect( aRunVar.sOut ).toMatch( /^Unlinked tests: 0 of 0$/m );
    fWriteTree({
      [ sPathSpecA ]: sSpecWrapper,
      [ sPathTestOne ]: fsTestWrapper(
        [ "// @spec specs/a.md", "  //   @test-wrapper   testHost  " ],
        vsBodyWrapped
      )
    });
    expect( faRun( [ sPathSpecA ]).cExit ).toBe( 0 );
  });
});

// @proves s-e287lm@a1b403a
// @proves s-b8vvpd@9e72e40
// @proves s-emmdvh@4dffcdc
// @proves s-eawgvu@e029ecf
// @proves s-jcgn2k@220009d
describe( "spec-map-link-malformed-fails — an unresolved link", () => {
  test( "fails the path run, PAIRED with both lines corrected", () => {
    const sText = "The rule holds.";
    const fsTest = ( sLinkFirst, sLinkSecond ) => [
      "// @spec specs/a.md",
      sLinkFirst,
      "test( \"first\", () => {} );",
      sLinkSecond,
      "test( \"second\", () => {} );",
      ""
    ].join( "\n" );
    const sSpec = fsSpecStmt( "A", [ "* {#s-mal001} " + sText ]);
    fWriteTree({
      [ sPathSpecA ]: sSpec,
      [ sPathTestOne ]: fsTest(
        fsLink( "s-nosuch", "0123456" ), fsLink( "s-mal001", "abcdef" )
      )
    });
    const aRunPath = faRun( [ sPathSpecA ]);
    const vsLinkBad = fvsLineInSection( aRunPath.sOut, sTitleLinkBad );
    expect( vsLinkBad ).toHaveLength( 2 );
    expect( vsLinkBad[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsLinkBad[ 1 ]).toMatch( /^test\/one\.test\.js:4 / );
    expect( aRunPath.cExit ).not.toBe( 0 );
    expect( faRun( [] ).cExit ).toBe( 0 );
    const sLink = fsLink( "s-mal001", fsHash( sText ));
    fWriteTree({
      [ sPathSpecA ]: sSpec, [ sPathTestOne ]: fsTest( sLink, sLink )
    });
    const aRunFixed = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunFixed.sOut, sTitleLinkBad )).toEqual( [] );
    expect( aRunFixed.cExit ).toBe( 0 );
  });
});

// @proves s-b8vvpd@9e72e40
// @proves s-emmdvh@4dffcdc
describe( "spec-map-link-stale-fails — a stale link", () => {
  test( "in another spec's file fails the path run, PAIRED with the hash "
    + "replaced by the current one", () => {
    const fWrite = ( sHash ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-stl001} The stale rule." ]),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: [
        "// @spec specs/b.md",
        fsLink( "s-stl001", sHash ),
        "test( \"plain words\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "0000000" );
    const sHashNow = fsHash( "The stale rule." );
    const aRun = faRun( [ sPathSpecA ]);
    const vsStale = fvsLineInSection( aRun.sOut, sTitleStale );
    expect( vsStale ).toHaveLength( 1 );
    expect( vsStale[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsStale[ 0 ]).toMatch( /s-stl001/ );
    expect( vsStale[ 0 ]).toMatch( /0000000/ );
    expect( vsStale[ 0 ]).toMatch( new RegExp( sHashNow ));
    expect( aRun.cExit ).not.toBe( 0 );
    fWrite( fsHashRun( "s-stl001" ));
    const aRunFixed = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunFixed.sOut, sTitleStale )).toEqual( [] );
    expect( aRunFixed.cExit ).toBe( 0 );
  });
});

const sTitleStaleSibling = "other specs' stale links in this spec's test files";

// @proves s-5vv5ht@bdd521d
// @proves s-nudxy0@3495135
describe( "spec-map-link-stale-sibling-listed — a stale link to another "
  + "spec's statement", () => {
  test( "is listed under its own heading by the owning spec's run, which "
    + "passes, and fails the marking spec's run, PAIRED with the hash "
    + "replaced by the current one", () => {
    const fWrite = ( sHash ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-sib001} The sibling rule." ]),
      [ sPathSpecB ]: fsSpecOwner( "B", [ "bee-sib-one" ]),
      [ sPathTestOne ]: [
        "// @spec specs/b.md",
        fsLink( "s-sib001", sHash ),
        "test( \"bee-sib-one — holds\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "0000000" );
    const sHashNow = fsHash( "The sibling rule." );
    const aRunB = faRun( [ sPathSpecB ]);
    const vsSibling = fvsLineInSection( aRunB.sOut, sTitleStaleSibling );
    expect( vsSibling ).toHaveLength( 1 );
    expect( vsSibling[ 0 ]).toMatch( /^test\/one\.test\.js:2 / );
    expect( vsSibling[ 0 ]).toMatch( /bee-sib-one/ );
    expect( vsSibling[ 0 ]).toMatch( /s-sib001/ );
    expect( vsSibling[ 0 ]).toMatch( /specs\/a\.md/ );
    expect( vsSibling[ 0 ]).toMatch( /0000000/ );
    expect( vsSibling[ 0 ]).toMatch( new RegExp( sHashNow ));
    expect( fvsLineInSection( aRunB.sOut, sTitleStale )).toEqual( [] );
    expect( aRunB.cExit ).toBe( 0 );
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunA.sOut, sTitleStale )).toHaveLength( 1 );
    expect( aRunA.cExit ).not.toBe( 0 );
    fWrite( fsHashRun( "s-sib001" ));
    const aRunBFixed = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunBFixed.sOut, sTitleStaleSibling ))
      .toEqual( [] );
    expect( aRunBFixed.cExit ).toBe( 0 );
  });
});

// @proves s-emmdvh@4dffcdc
// @proves s-b8vvpd@9e72e40
// @proves s-tv24sx@df2c2d6
describe( "spec-map-unproved-statement-reported — a statement", () => {
  test( "is named and passes, PAIRED with the spec made complete, which "
    + "fails", () => {
    const sPathSpec = path.join( "specs", "u.md" );
    const vsBody = [ "* {#s-unp001} The unproved rule holds." ];
    fWriteTree({ [ sPathSpec ]: fsSpecStmt( "U", vsBody, false ) });
    const aRun = faRun( [ sPathSpec ]);
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-unp001" ]
    );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({ [ sPathSpec ]: fsSpecStmt( "U", vsBody, true ) });
    expect( faRun( [ sPathSpec ]).cExit ).not.toBe( 0 );
  });
});

const sPathSpecC = path.join( "specs", "c.md" );

// @proves s-tv24sx@df2c2d6
// @proves s-u2lhta@c6845db
describe( "spec-map-complete-unmarked-fails — a complete spec", () => {
  test( "fails on unmarked text, PAIRED with the text marked and every "
    + "exempt form left unmarked, and with the line moved down", () => {
    const vsExempt = [
      "| a | table row |",
      "",
      "```text",
      "unmarked code",
      "```",
      "",
      "* The forms are:"
    ];
    const vsTail = [
      "",
      "## Dependencies",
      "",
      "* Unmarked dependency.",
      ""
    ];
    const fsSpec = ( vsApi, vsHead ) => [ "# C", "" ].concat(
      vsHead,
      [ "## Purpose", "", "Unmarked purpose prose.", "", "## API", "" ],
      vsApi,
      vsTail
    ).join( "\n" );
    const vsHeadComplete = [ sLineComplete, "" ];
    const sTest = [
      "// @spec specs/c.md",
      fsLink( "s-cmp001", fsHash( "The marked rule holds." )),
      fsLink( "s-cmp002", fsHash( "The second rule holds." )),
      fsLink( "s-cmp003", fsHash( "The labelled rule holds." )),
      "test( \"cmp-case-one-id — holds\", () => {} );",
      ""
    ].join( "\n" );
    const vsApiBad = [
      "* {#s-cmp001} The marked rule holds.",
      "* An unmarked rule holds.",
      "* **Label.** {#s-cmp003} The labelled rule holds."
    ];
    fWriteTree({
      [ sPathSpecC ]: fsSpec( vsApiBad, vsHeadComplete ),
      [ sPathTestOne ]: sTest
    });
    const aRun = faRun( [ sPathSpecC ]);
    const vsFail = fvsLineInSection( aRun.sOut, sTitleComplete );
    expect( vsFail ).toHaveLength( 2 );
    expect( vsFail[ 0 ]).toMatch( /An unmarked rule/ );
    expect( vsFail[ 1 ]).toMatch( /Label/ );
    expect( aRun.cExit ).not.toBe( 0 );
    fWriteTree({
      [ sPathSpecC ]: fsSpec( [
        "* {#s-cmp001} The marked rule holds.",
        "* {#s-cmp002} The second rule holds.",
        "* {#s-cmp003} The labelled rule holds.",
        ""
      ].concat( vsExempt ), vsHeadComplete ),
      [ sPathTestOne ]: sTest
    });
    const aRunMarked = faRun( [ sPathSpecC ]);
    expect( fvsLineInSection( aRunMarked.sOut, sTitleComplete )).toEqual( [] );
    expect( fvsLineInSection( aRunMarked.sOut, sTitleUnproved )).toEqual( [] );
    expect( aRunMarked.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpecC ]: fsSpec(
        vsApiBad, [ "A paragraph first.", "", sLineComplete, "" ]
      ),
      [ sPathTestOne ]: sTest
    });
    const aRunMoved = faRun( [ sPathSpecC ]);
    expect( fvsLineInSection( aRunMoved.sOut, sTitleComplete )).toEqual( [] );
  });
});

// @proves s-u2lhta@c6845db
describe( "spec-map-complete-unproving-test-fails — a complete spec's test",
  () => {
    test( "proving nothing is named whatever its name opens with, PAIRED "
      + "with a link added, after which none is", () => {
      const sText = "The proved rule holds.";
      const sSpec = fsSpecStmt( "P", [
        "* {#s-prv001} " + sText,
        "",
        "## Required cases",
        "",
        "* {#s-prv002} `prv-case-one-id` — the case holds."
      ], true );
      const fsTest = ( sLinkLast ) => [
        "// @spec specs/p.md",
        fsLink( "s-prv001", fsHash( sText )),
        fsLink( "s-prv002", fsHash( "`prv-case-one-id` — the case holds." )),
        "test( \"linked\", () => {} );",
        sLinkLast,
        "test( \"prv-case-one-id — holds\", () => {} );",
        sLinkLast,
        "test( \"`prv-case-one-id`, prv-case-two-id: plain\", () => {} );",
        ""
      ].join( "\n" );
      const sPathSpec = path.join( "specs", "p.md" );
      fWriteTree({ [ sPathSpec ]: sSpec, [ sPathTestOne ]: fsTest( "" ) });
      const aRun = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toEqual([
        expect.stringMatching( /^test\/one\.test\.js:6 .*prv-case-one-id — /),
        expect.stringMatching( /^test\/one\.test\.js:8 .*prv-case-two-id/ )
      ]);
      expect( aRun.cExit ).not.toBe( 0 );
      fWriteTree({
        [ sPathSpec ]: sSpec,
        [ sPathTestOne ]: fsTest( fsLink( "s-prv001", fsHash( sText )))
      });
      const aRunLinked = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRunLinked.sOut, sTitleComplete )).toEqual(
        []
      );
      expect( aRunLinked.cExit ).toBe( 0 );
    });
  }
);

const sTitleUnlinked = "test files with unlinked tests";

// @proves s-tvuwev@e251ade
// @proves s-ggaonb@b8526d7
// @proves s-zvzlp8@2e63bdc
describe( "spec-map-unlinked-tests-counted — the unlinked tests", () => {
  test( "are counted per file once, whatever their owners or names, PAIRED "
    + "with links added, after which none is", () => {
    const sText = "The first rule holds.";
    const sLink = fsLink( "s-unl001", fsHash( sText ));
    const fsTest = ( sLinkRest ) => [
      "// @spec specs/a.md",
      "// @spec specs/b.md",
      sLink,
      "test( \"linked\", () => {} );",
      sLinkRest,
      "test( \"beta-unl-case — named like a case\", () => {} );",
      sLinkRest,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-unl001} " + sText ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [
        "* {#s-unl002} The second rule holds."
      ], true )
    };
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( "" ) });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  2" ]
    );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 2 of 3$/m );
    expect( fvsLineInSection( aRun.sOut, sTitleComplete )).toHaveLength( 5 );
    expect( aRun.cExit ).toBe( 0 );
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    expect( fvsNameFailing( sPathSpecA )).toEqual(
      [ "beta-unl-case — named like a case", "plain words" ]
    );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "linked", "beta-unl-case — named like a case", "plain words" ]
    );
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( sLink ) });
    const aRunLinked = faRun( [] );
    expect( fvsLineInSection( aRunLinked.sOut, sTitleUnlinked )).toEqual( [] );
    expect( aRunLinked.sOut ).toMatch( /^Unlinked tests: 0 of 3$/m );
  });

  test( "with a spec path are counted over that spec's test files only, "
    + "never changing the exit code", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecOwner( "A", [] ),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: "// @spec specs/a.md\ntest( \"one\", () => {} );\n",
      [ sPathTestTwo ]: "// @spec specs/b.md\n"
        + "test( \"two\", () => {} );\ntest( \"three\", () => {} );\n"
    });
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleUnlinked )).toEqual(
      [ "test/two.test.js  2", "test/one.test.js  1" ]
    );
    expect( aRunAll.sOut ).toMatch( /^Unlinked tests: 3 of 3$/m );
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunA.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  1" ]
    );
    expect( aRunA.sOut ).toMatch( /^Unlinked tests: 1 of 1$/m );
    expect( aRunA.cExit ).toBe( 0 );
  });
});

// @proves s-s7wgz7@eae0eef
// @proves s-n7deu7@edc83ae
// @proves s-emmdvh@4dffcdc
describe( "spec-map-derived-owner-removable — a fully linked file", () => {
  test( "takes its owners from its links alone, PAIRED with one link "
    + "removed, after which the owner line decides", () => {
    const sText = "The derived rule holds.";
    const sLink = fsLink( "s-drv001", fsHash( sText ));
    const fsTest = ( sLinkSecond ) => [
      "// @spec specs/b.md",
      sLink,
      "test( \"alpha-one-case — holds\", () => {} );",
      sLinkSecond,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBodyForSpec = {
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-drv001} " + sText ], true ),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-drv002} Rule b." ], true )
    };
    const fvsNameFailing = ( sPathSpec ) => fvsLineInSection(
      faRun( [ sPathSpec ]).sOut, sTitleComplete
    ).map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( sLink ) });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual( [] );
    const vsRemovable = fvsLineInSection( aRun.sOut, sTitleRemovable );
    expect( vsRemovable ).toHaveLength( 1 );
    expect( vsRemovable[ 0 ]).toMatch( /^test\/one\.test\.js:1\b/ );
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual( [] );
    fWriteTree({ ...aBodyForSpec, [ sPathTestOne ]: fsTest( "" ) });
    const aRunCut = faRun( [] );
    expect( fvsLineInSection( aRunCut.sOut, sTitleRemovable )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecA )).toEqual( [] );
    expect( fvsNameFailing( sPathSpecB )).toEqual(
      [ "alpha-one-case — holds", "plain words" ]
    );
  });
});

// @proves s-3pkw1n@e23773f
describe( "spec-map-scope-includes-linked-file — the path run's files", () => {
  test( "include a file linking the spec's statement, PAIRED with the link "
    + "removed", () => {
    const sText = "The scoped rule holds.";
    const fsTestTwo = ( sLink ) => [
      "// @spec specs/gone.md",
      sLink,
      "test( \"plain words\", () => {} );",
      ""
    ].join( "\n" );
    const aBody = {
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-scp001} " + sText,
        "",
        "## Required cases",
        "",
        "* `alpha-one-case` — the case holds."
      ]),
      [ sPathTestOne ]: "// @spec specs/a.md\n" + sTestAlphaOne
    };
    fWriteTree({
      ...aBody,
      [ sPathTestTwo ]: fsTestTwo( fsLink( "s-scp001", fsHash( sText )))
    });
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleUnresolved )).toEqual(
      [ sPathTestTwo + ":1  // @spec specs/gone.md  (no such spec)" ]
    );
    expect( aRun.cExit ).not.toBe( 0 );
    fWriteTree({ ...aBody, [ sPathTestTwo ]: fsTestTwo( "" ) });
    const aRunCut = faRun( [ sPathSpecA ]);
    expect( aRunCut.sOut ).not.toMatch( /two\.test\.js/ );
    expect( aRunCut.cExit ).toBe( 0 );
  });
});

// @proves s-6gfnun@f467b05
describe( "spec-map-sid-lists-links — the --sid query", () => {
  test( "prints the marker and every link, the stale one marked, PAIRED "
    + "with a statement no test links", () => {
    const sText = "The listed rule holds.";
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-sid001} " + sText,
        "* {#s-sid002} Another rule holds."
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-sid001", fsHash( sText )),
        "test( \"first test\", () => {} );",
        fsLink( "s-sid001", "0000000" ),
        "describe( \"second block\", () => {",
        "  test( \"inner\", () => {} );",
        "} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ "--sid", "s-sid001" ]);
    const vsLine = aRun.sStdout.trim().split( "\n" );
    expect( vsLine ).toHaveLength( 3 );
    expect( vsLine[ 0 ]).toMatch( /^specs\/a\.md:5\b/ );
    expect( vsLine[ 1 ]).toMatch( /^test\/one\.test\.js:2 .*first test/ );
    expect( vsLine[ 1 ]).toMatch( new RegExp( fsHash( sText )));
    expect( vsLine[ 1 ]).not.toMatch( /stale/ );
    expect( vsLine[ 2 ]).toMatch( /^test\/one\.test\.js:4 .*second block/ );
    expect( vsLine[ 2 ]).toMatch( /0000000.*stale/ );
    expect( aRun.cExit ).toBe( 0 );
    const aRunNone = faRun( [ "--sid", "s-sid002" ]);
    expect( aRunNone.sStdout ).toMatch( /^specs\/a\.md:6\b/ );
    expect( aRunNone.sStdout ).toMatch( /no link/ );
    expect( aRunNone.cExit ).toBe( 0 );
  });
});

// @proves s-ar1i87@b6009f5
// @proves s-u2lhta@c6845db
// @proves s-b8vvpd@9e72e40
// @proves s-emmdvh@4dffcdc
describe( "spec-map-placeholder-reported-not-failing — a placeholder", () => {
  test( "is named and passes, PAIRED with the spec made complete, which "
    + "fails on it", () => {
    const sText = "The linked rule holds.";
    const sPathSpec = path.join( "specs", "pl.md" );
    const vsBody = [
      "* {#s-plc001} " + sText,
      "* {#s-?} The placeholder rule holds."
    ];
    const sTest = [
      "// @spec specs/pl.md",
      fsLink( "s-plc001", fsHash( sText )),
      "test( \"linked\", () => {} );",
      ""
    ].join( "\n" );
    const nLine = 6;
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "P", vsBody, false ),
      [ sPathTestOne ]: sTest
    });
    const aRun = faRun( [ sPathSpec ]);
    const vsPlace = fvsLineInSection( aRun.sOut, sTitlePlaceholder );
    expect( vsPlace ).toHaveLength( 1 );
    expect( vsPlace[ 0 ]).toMatch(
      new RegExp( "^specs/pl\\.md:" + nLine + " .*The placeholder rule" )
    );
    expect( fvsLineInSection( aRun.sOut, sTitleUnproved )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( aRun.cExit ).toBe( 0 );
    fWriteTree({
      [ sPathSpec ]: fsSpecStmt( "P", vsBody, true ),
      [ sPathTestOne ]: sTest
    });
    const aRunComplete = faRun( [ sPathSpec ]);
    const vsFail = fvsLineInSection( aRunComplete.sOut, sTitleComplete );
    expect( vsFail ).toHaveLength( 1 );
    expect( vsFail[ 0 ]).toMatch( /The placeholder rule/ );
    expect( aRunComplete.cExit ).not.toBe( 0 );
  });
});

// @proves s-i63o6a@6dbc87e
// @proves s-pe5j7a@8fee8c2
// @proves s-taoc14@2518951
describe( "spec-map-assign-replaces-placeholders — --assign", () => {
  // @proves s-yurmkw@ee703cc
  test( "gives each placeholder a fresh id and changes nothing else, PAIRED "
    + "with a second run, which does nothing", () => {
    const sPathSpecSub = path.join( "specs", "sub", "b.md" );
    const sSpecA = fsSpecStmt( "A", [
      "* {#s-?} The first placeholder rule.",
      "* {#s-asg001} The marked rule.",
      "* A span `{#s-?}` stays.",
      "",
      "```text",
      "{#s-?}",
      "```"
    ]);
    const sSpecB = fsSpecStmt( "B", [
      "* {#s-?} The second placeholder rule.",
      "* {#s-?} The third placeholder rule."
    ]);
    fWriteTree({ [ sPathSpecA ]: sSpecA, [ sPathSpecSub ]: sSpecB });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = aRun.sStdout.trim().split( "\n" );
    expect( vsLine ).toHaveLength( 3 );
    const reLine = /^(specs\/[a-z/]+\.md):(\d+) {2}(s-[a-z0-9]{6}) {2}(.*)$/;
    const vtAssign = vsLine.map(( sLine ) => sLine.match( reLine ));
    vtAssign.forEach(( t ) => expect( t ).not.toBeNull());
    expect( vtAssign.map(( t ) => t[ 1 ] + ":" + t[ 2 ])).toEqual(
      [ "specs/a.md:5", "specs/sub/b.md:5", "specs/sub/b.md:6" ]
    );
    expect( vtAssign[ 0 ][ 4 ]).toMatch( /^The first placeholder/ );
    expect( vtAssign[ 2 ][ 4 ]).toMatch( /^The third placeholder/ );
    const vsId = vtAssign.map(( t ) => t[ 3 ]);
    expect( new Set( vsId ).size ).toBe( 3 );
    expect( vsId ).not.toContain( "s-asg001" );
    const fsAssigned = ( sSpec, vt ) => {
      const vsSpecLine = sSpec.split( "\n" );
      vt.forEach(( t ) => {
        const n = Number( t[ 2 ]) - 1;
        vsSpecLine[ n ] = vsSpecLine[ n ].replace(
          "{#s-?}", "{#" + t[ 3 ] + "}"
        );
      });
      return vsSpecLine.join( "\n" );
    };
    const sReadA = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    const sReadB = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecSub ), "utf8"
    );
    const sAfterA = fsAssigned( sSpecA, vtAssign.slice( 0, 1 ));
    const sAfterB = fsAssigned( sSpecB, vtAssign.slice( 1 ));
    expect( sReadA()).toBe( sAfterA );
    expect( sReadB()).toBe( sAfterB );
    expect( sAfterA ).toMatch( /`\{#s-\?\}`/ );
    expect( sAfterA ).toMatch( /\n\{#s-\?\}\n/ );
    const aRunAgain = faRun( [ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( aRunAgain.cExit ).toBe( 0 );
    expect( sReadA()).toBe( sAfterA );
    expect( sReadB()).toBe( sAfterB );
  });
});

// @proves s-i6rjuw@e83d07a
// @proves s-tdw4gj@8d6d23d
// @proves s-gpqy5p@7ed12de
// @proves s-4hsltb@35856a9
test( "the three-way report names missing statement links, unlinked code "
  + "and malformed code references, with whole-tree and spec-scoped exits",
() => {
  const sTextLinked = "The linked rule holds.";
  const sTextUnlinked = "The uncovered rule holds.";
  const sHashLinked = fsHash( sTextLinked );
  fWriteTree({
    "specs/a.md": [
      "# A", "", "Statement ids: complete", "", "## API", "",
      "* {#s-cod001} " + sTextLinked,
      "* {#s-cod002} " + sTextUnlinked,
      ""
    ].join( "\n" ),
    "test/a.test.js": [
      "// @spec specs/a.md",
      "// @proves s-cod001@" + sHashLinked,
      "test( \"proves the linked rule\", () => {} );",
      ""
    ].join( "\n" ),
    "src/unlinked.js": "const unlinked = true;\n",
    "src/bad.js": "// @tested-by test/missing.test.js\nconst bad = true;\n"
  });
  const aReport = faRun([]);
  expect( aReport.cExit ).toBe( 0 );
  expect( fvsLineInSection(
    aReport.sOut, "statements with no implementation link"
  )).toEqual([ expect.stringContaining( "s-cod002" ) ]);
  expect( fvsLineInSection(
    aReport.sOut, "implementation files with no test link"
  )).toEqual([ "src/bad.js", "src/unlinked.js" ]);
  expect( fvsLineInSection(
    aReport.sOut, "malformed, unresolved or stale code references"
  )).toEqual([
    "src/bad.js:1  // @tested-by test/missing.test.js "
      + "(no such declared test file)"
  ]);
  expect( faRun([ "specs/a.md" ]).cExit ).not.toBe( 0 );
});

// @proves s-wrdbhk@01b46ef
describe( "spec-map-candidates-ranked — the --candidates query", () => {
  test( "ranks the spec's tests by term alone, PAIRED with a test named "
    + "for a case, a test outside the spec and a test already linking the "
    + "statement", () => {
    const sText = "The `fooBar` call returns \"bazqux\".";
    fWriteTree({
      [ sPathSpecA ]: [
        "# A",
        "",
        "## Behaviour",
        "",
        "The rules below are fenced by `alpha-beta-gamma`.",
        "",
        "* {#s-cnd001} " + sText,
        "",
        "## Required cases",
        "",
        "* `alpha-beta-gamma` — the case holds.",
        ""
      ].join( "\n" ),
      [ sPathSpecB ]: fsSpecOwner( "B", [] ),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "test( \"names fooBar only\", () => {} );",
        "test( \"holds nothing\", () => {} );",
        "test( \"plain body\", () => {",
        "  const s = \"fooBar bazqux\";",
        "} );",
        "test( \"alpha-beta-gamma — holds\", () => {} );",
        fsLink( "s-cnd001", fsHash( sText )),
        "test( \"linked fooBar bazqux\", () => {} );",
        ""
      ].join( "\n" ),
      [ sPathTestTwo ]: [
        "// @spec specs/b.md",
        "test( \"outside fooBar bazqux\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ "--candidates", "s-cnd001" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = aRun.sStdout.trim().split( "\n" );
    const fnLineNamed = ( sName ) => vsLine.findIndex(( sLine ) => (
      sLine.includes( sName )
    ));
    expect( vsLine ).toHaveLength( 2 );
    expect( vsLine[ 0 ]).toMatch(
      /plain body {2}score 2 {2}terms: fooBar,bazqux$/
    );
    expect( vsLine[ 1 ]).toMatch(
      /names fooBar only {2}score 1 {2}terms: fooBar$/
    );
    expect( fnLineNamed( "alpha-beta-gamma — holds" )).toBe( -1 );
    expect( fnLineNamed( "holds nothing" )).toBe( -1 );
    expect( fnLineNamed( "outside" )).toBe( -1 );
    expect( fnLineNamed( "linked" )).toBe( -1 );
  });
});

const sTitleRootBad = "malformed root lists";
const sTitleRoot = "roots";
const sTitleArch = "statements rooted in arch";
const sTitleRederive = "re-derive: stale root references";
const sTitleUnstamped = "unstamped root references";
const vsTitleRoot = [
  sTitleRootBad, sTitleRoot, sTitleArch, sTitleRederive, sTitleUnstamped
];

const fWriteSpecs = ( avsBodyForPath, asExtra ) => fWriteTree({
  ...Object.fromEntries( Object.entries( avsBodyForPath ).map(
    ( [ sPathRel, vsBody ] ) => [
      sPathRel, fsSpecStmt( path.basename( sPathRel ), vsBody, false )
    ]
  )),
  ...( asExtra || {})
});

const fsTestLinking = ( sPathOwner, vtLink ) => [ "// @spec " + sPathOwner ]
  .concat( vtLink.flatMap(( t, n ) => [
    fsLink( t[ 0 ], fsHash( t[ 1 ])),
    "test( \"linked " + n + "\", () => {} );"
  ]), [ "" ])
  .join( "\n" );

// @proves s-l2muht@e9fb34f
// @proves s-s0vyhy@802fc2f
// @proves s-v20yz5@b63123d
// @proves s-y462l3@3b6cea9
describe( "spec-map-root-list-forms — a marker's root list", () => {
  test( "is read in each form with nothing malformed, PAIRED with a root "
    + "list added, changed and stamped, which keeps the hash", () => {
    const sPathSpec = path.join( "specs", "f.md" );
    fWriteSpecs({ [ sPathSpec ]: [
      "* {#s-aaaaaa} Root one holds.",
      "* {#s-bbbbbb} Root two holds.",
      "* {#s-ccccc1 <s-aaaaaa} One root.",
      "* {#s-ccccc2 <s-aaaaaa,s-bbbbbb} Two roots.",
      "* {#s-ccccc3 <arch} An arch decision.",
      "* {#s-ccccc4 <s-aaaaaa@" + fsHash( "Root one holds." ) + "} Stamped.",
      "* {#s-?r} A labelled root.",
      "* {#s-ccccc5 <s-?r} A label reference.",
      "* {#s-ccccc6 <arch,s-aaaaaa} Arch first.",
      "* {#s-ccccc7 <s-bbbbbb,arch} Arch last."
    ]});
    const aRun = faRun( [ sPathSpec ]);
    expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRederive )).toEqual( [] );
    const sRoot = fvsLineInSection( aRun.sOut, sTitleRoot ).join( "\n" );
    [
      "s-ccccc1", "s-ccccc2", "s-ccccc4", "s-ccccc5", "s-ccccc6", "s-ccccc7"
    ].forEach(( sId ) => {
      expect( sRoot ).toMatch( new RegExp( "specs/f\\.md:\\d+ +" + sId ));
    });
    const sArch = fvsLineInSection( aRun.sOut, sTitleArch ).join( "\n" );
    expect( sArch ).toMatch( /s-ccccc3 +An arch decision/ );
    expect( sArch ).toMatch( /s-ccccc6 +Arch first\. +beside s-aaaaaa/ );
    expect( sArch ).toMatch( /s-ccccc7 +Arch last\. +beside s-bbbbbb/ );
    expect( aRun.cExit ).toBe( 0 );
    const sText = "The hashed rule holds.";
    const vsList = [
      "", " <arch", " <s-aaaaaa", " <s-aaaaaa@" + fsHash( "Root one holds." ),
      " <arch,s-aaaaaa"
    ];
    vsList.forEach(( sList ) => {
      fWriteSpecs({ [ sPathSpec ]: [
        "* {#s-aaaaaa} Root one holds.",
        "* {#s-ddddd1" + sList + "} " + sText
      ]});
      expect( fsHashRun( "s-ddddd1" )).toBe( fsHash( sText ));
    });
  });
});

// @proves s-6or7az@00097e5
// @proves s-gq9hu3@a2edb9f
// @proves s-lkfk0g@47ba420
// @proves s-n8uc4k@a405885
// @proves s-fm2sqk@135c61a
// @proves s-sfuntg@4b5ec33
describe( "spec-map-root-malformed-fails — a malformed root list", () => {
  const fvsSpecA = ( bFixed ) => [
    "* {#s-raaaa1} The root holds.",
    bFixed
      ? "* {#s-rbad01 <s-raaaa1} Names a statement."
      : "* {#s-rbad01 <s-nosuch} Names no statement.",
    "* {#s-rbad02 <s-" + ( bFixed ? "raaaa1" : "rbad02" ) + "} Itself.",
    "* {#s-rcyc01 <s-" + ( bFixed ? "raaaa1" : "rcyc02" ) + "} Cycle one.",
    "* {#s-rbad03 <" + ( bFixed ? "arch,s-raaaa1" : "arch,s-raaaa1,arch" )
      + "} Arch.",
    "* {#s-rbad04 <s-raaaa1" + ( bFixed ? "" : ",s-raaaa1" ) + "} Twice.",
    "* {#s-rbad05 <s-raaaa1@"
      + ( bFixed ? fsHash( "The root holds." ) : "abcdef" ) + "} Stamp.",
    "* {#s-rbad06 <s-?" + ( bFixed ? "one" : "none" ) + "} No label.",
    "* {#s-rbad07 <s-?" + ( bFixed ? "one" : "far" ) + "} Far label.",
    "* {#s-?" + ( bFixed ? "one" : "two" ) + "} Label one.",
    "* {#s-?two} Label two.",
    "* {#s-rbad08 <s-?two} Two-carried label.",
    "* {#s-rbad09 <s-rdup01} A duplicate id."
  ];
  const vsSpecB = [
    "* {#s-rcyc02 <s-rcyc01} Cycle two.",
    "* {#s-?far} A far placeholder.",
    "* {#s-rdup01} Duplicate one."
  ];
  const sPathSpecM = path.join( "specs", "m.md" );

  test( "is reported for each fault and fails its spec, PAIRED with every "
    + "list corrected", () => {
    fWriteSpecs({
      [ sPathSpecA ]: fvsSpecA( false ),
      [ sPathSpecB ]: vsSpecB,
      [ sPathSpecM ]: [ "* {#s-rdup01} Duplicate two." ]
    });
    const aRunA = faRun( [ sPathSpecA ]);
    const vsBadA = fvsLineInSection( aRunA.sOut, sTitleRootBad );
    const vnLineA = [ 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ];
    expect( vsBadA ).toHaveLength( vnLineA.length );
    vnLineA.forEach(( nLine ) => {
      expect( vsBadA.some(( sLine ) => (
        sLine.startsWith( "specs/a.md:" + nLine + " " )
      ))).toBe( true );
    });
    expect( fvsLineInSection( aRunA.sOut, sTitleMarker )).toEqual( [] );
    expect( aRunA.cExit ).not.toBe( 0 );
    const aRunB = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunB.sOut, sTitleRootBad )).toEqual(
      [ expect.stringMatching( /^specs\/b\.md:5 / ) ]
    );
    expect( aRunB.cExit ).not.toBe( 0 );
    const aRunAll = faRun( [] );
    expect( fvsLineInSection( aRunAll.sOut, sTitleRootBad )).toHaveLength(
      vnLineA.length + 1
    );
    expect( fvsLineInSection( aRunAll.sOut, sTitleMarker ).join( "\n" ))
      .not.toMatch( /\(malformed\)/ );
    expect( aRunAll.cExit ).toBe( 0 );
    fWriteSpecs({
      [ sPathSpecA ]: fvsSpecA( true ), [ sPathSpecB ]: vsSpecB
    });
    [ sPathSpecA, sPathSpecB ].forEach(( sPathSpec ) => {
      const aRun = faRun( [ sPathSpec ]);
      expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
      expect( aRun.cExit ).toBe( 0 );
    });
  });
});

// @proves s-8haq5h@4d22c53
// @proves s-fm2sqk@135c61a
describe( "spec-map-root-optional-unreported — a statement with no root",
  () => {
    test( "is never reported, PAIRED with one `<arch` statement, which only "
      + "the arch list names", () => {
      const sPathSpec = path.join( "specs", "o.md" );
      const vtStmt = [
        [ "s-opt001", "The first rule." ], [ "s-opt002", "The second rule." ]
      ];
      const fWrite = ( sList ) => fWriteTree({
        [ sPathSpec ]: fsSpecStmt( "O", [
          "* {#s-opt001} The first rule.",
          "* {#s-opt002" + sList + "} The second rule."
        ], true ),
        [ sPathTestOne ]: fsTestLinking( "specs/o.md", vtStmt )
      });
      fWrite( "" );
      const aRun = faRun( [ sPathSpec ]);
      vsTitleRoot.forEach(( sTitle ) => {
        expect( fvsLineInSection( aRun.sOut, sTitle )).toEqual( [] );
      });
      expect( aRun.cExit ).toBe( 0 );
      fWrite( " <arch" );
      const aRunArch = faRun( [ sPathSpec ]);
      vsTitleRoot.filter(( sTitle ) => sTitle !== sTitleArch )
        .forEach(( sTitle ) => {
          expect( fvsLineInSection( aRunArch.sOut, sTitle )).toEqual( [] );
        });
      const sArch = fvsLineInSection( aRunArch.sOut, sTitleArch ).join( "\n" );
      expect( sArch ).toMatch( /s-opt002/ );
      expect( sArch ).not.toMatch( /s-opt001/ );
      expect( aRunArch.cExit ).toBe( 0 );
    });
  }
);

// @proves s-gymqyq@6187733
// @proves s-6p2zp4@94323aa
// @proves s-5i1owy@cb86673
// @proves s-fm2sqk@135c61a
describe( "spec-map-root-coverage-reported — a root's coverage", () => {
  test( "counts its satisfied conclusions, PAIRED with an unproved "
    + "conclusion made a covered root", () => {
    const sPathSpecR = path.join( "specs", "r.md" );
    const sPathSpecC = path.join( "specs", "c.md" );
    const vsConc = [
      "* {#s-cov00a <s-cov001} A holds.",
      "* {#s-cov00b <s-cov001} B holds."
    ];
    const fWrite = ( vsMore, vtLink ) => fWriteTree({
      [ sPathSpecR ]: fsSpecStmt( "R", [ "* {#s-cov001} The root." ], false ),
      [ sPathSpecC ]: fsSpecStmt( "C", vsConc.concat( vsMore ), false ),
      [ sPathTestOne ]: fsTestLinking(
        "specs/c.md", [[ "s-cov00a", "A holds." ]].concat( vtLink )
      )
    });
    fWrite( [], [] );
    const aRun = faRun( [] );
    const vsRoot = fvsLineInSection( aRun.sOut, sTitleRoot );
    expect( vsRoot ).toEqual([
      "specs/r.md:5  s-cov001",
      "specs/c.md:5  s-cov00a  satisfied",
      "specs/c.md:6  s-cov00b  unsatisfied",
      "1 of 2 satisfied"
    ]);
    const vsUnproved = fvsIdInSection( aRun.sOut, sTitleUnproved );
    expect( vsUnproved ).toContain( "s-cov00b" );
    expect( vsUnproved ).not.toContain( "s-cov001" );
    expect( faRun( [ sPathSpecR ]).cExit ).toBe( 0 );
    fWrite(
      [ "* {#s-cov00c <s-cov00b} C holds." ], [[ "s-cov00c", "C holds." ]]
    );
    const aRunCovered = faRun( [] );
    const vsCovered = fvsLineInSection( aRunCovered.sOut, sTitleRoot );
    const nRoot = vsCovered.indexOf( "specs/r.md:5  s-cov001" );
    expect( vsCovered.slice( nRoot, nRoot + 4 )).toEqual([
      "specs/r.md:5  s-cov001",
      "specs/c.md:5  s-cov00a  satisfied",
      "specs/c.md:6  s-cov00b  satisfied",
      "covered"
    ]);
    expect( fvsIdInSection( aRunCovered.sOut, sTitleUnproved )).toEqual( [] );
  });
});

// @proves s-gg0pvt@84345af
// @proves s-cp0cte@9e6f9c2
describe( "spec-map-ruling-quote-unproved — a quote and an arch statement",
  () => {
    test( "an underived quote and an unlinked arch statement are each "
      + "named and fail a complete spec, PAIRED with a proved conclusion "
      + "of the quote and the arch statement linked", () => {
      const sPathSpecQ = path.join( "specs", "q.md" );
      const sTextQuote = "RULING (CEO) 2026-10-09: \"quotes need tests\"";
      const vtLinkFirst = [[ "s-qar001", "The first arch rule." ]];
      const fWrite = ( vsMore, vtLink ) => fWriteTree({
        [ sPathSpecQ ]: fsSpecStmt( "Q", [
          "> {#m-qut001} " + sTextQuote,
          "",
          "* {#s-qar001 <arch} The first arch rule.",
          "* {#s-qar002 <arch} The second arch rule."
        ].concat( vsMore ), true ),
        [ sPathTestOne ]: fsTestLinking(
          "specs/q.md", vtLinkFirst.concat( vtLink )
        )
      });
      fWrite( [], [] );
      const aRun = faRun( [ sPathSpecQ ]);
      expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
        [ "s-qar002" ]
      );
      expect( fvsLineInSection( aRun.sOut, "underived motives" )).toEqual([
        expect.stringMatching( /^specs\/q\.md:\d+ .*m-qut001/ )
      ]);
      expect( aRun.cExit ).not.toBe( 0 );
      fWrite(
        [
          "* {#s-qcn001 <m-qut001@" + fsHash( sTextQuote )
            + "} The conclusion holds."
        ],
        [
          [ "s-qcn001", "The conclusion holds." ],
          [ "s-qar002", "The second arch rule." ]
        ]
      );
      const aRunProved = faRun( [ sPathSpecQ ]);
      expect( fvsIdInSection( aRunProved.sOut, sTitleUnproved )).toEqual( [] );
      expect( fvsLineInSection( aRunProved.sOut, "underived motives" ))
        .toEqual( [] );
      expect( aRunProved.cExit ).toBe( 0 );
    });
  }
);

// @proves s-sfuntg@4b5ec33
// @proves s-8wn2ou@c5e7984
// @proves s-fm2sqk@135c61a
// @proves s-1f2z8r@e38b9ea
describe( "spec-map-root-arch-listed — the arch list", () => {
  test( "names each `<arch` statement grouped by spec, PAIRED with "
    + "`--root arch` printing the same list, and a mixed list named with "
    + "its reference", () => {
    const fWrite = ( vsMore ) => fWriteSpecs({
      [ sPathSpecA ]: [
        "* {#s-rul001} The ruling.",
        "* {#s-arc00a <arch} Arch in a.",
        "* {#s-rtd00a <s-rul001} Rooted in a."
      ],
      [ sPathSpecB ]: [
        "* {#s-arc00b <arch} Arch in b.",
        "* {#s-rtd00b <s-rul001} Rooted in b."
      ].concat( vsMore )
    });
    fWrite( [] );
    const aRun = faRun( [] );
    const vsArch = [
      "specs/a.md", "6  s-arc00a  Arch in a.",
      "specs/b.md", "5  s-arc00b  Arch in b."
    ];
    expect( fvsLineInSection( aRun.sOut, sTitleArch )).toEqual( vsArch );
    expect( aRun.cExit ).toBe( 0 );
    const aRunArch = faRun( [ "--root", "arch" ]);
    expect( fvsLineInSection( aRunArch.sStdout, sTitleArch )).toEqual( vsArch );
    expect( aRunArch.cExit ).toBe( 0 );
    fWrite( [ "* {#s-mix00b <arch,s-rul001} Partly his." ]);
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleArch )).toEqual(
      vsArch.concat([ "7  s-mix00b  Partly his.  beside s-rul001" ])
    );
    const vsRoot = faRun( [ "--root", "s-rul001" ]).sStdout.split( "\n" )
      .map(( sLine ) => sLine.trim());
    expect( vsRoot ).toContain( "specs/b.md:7  s-mix00b  unsatisfied" );
  });
});

// @proves s-jie6z5@09cd30a
// @proves s-hgk19s@2c0c557
// @proves s-fm2sqk@135c61a
// @proves s-n8uc4k@a405885
describe( "spec-map-root-rederive-listed — a stale root stamp", () => {
  test( "is absent while the stamp matches, PAIRED with the root reworded, "
    + "then the stamp replaced", () => {
    const sRootOld = "The root text holds.";
    const sRootNew = "The root text stands.";
    const fWrite = ( sRoot, sStamp ) => fWriteSpecs({
      [ sPathSpecA ]: [ "* {#s-rdv001} " + sRoot ],
      [ sPathSpecB ]: [ "* {#s-rdv002 <s-rdv001@" + sStamp + "} Derived." ]
    });
    fWrite( sRootOld, fsHash( sRootOld ));
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRederive )).toEqual( [] );
    const vcExit = [ sPathSpecA, sPathSpecB ].map(( sPathSpec ) => (
      faRun( [ sPathSpec ]).cExit
    ));
    fWrite( sRootNew, fsHash( sRootOld ));
    const vsStale = fvsLineInSection( faRun( [] ).sOut, sTitleRederive );
    expect( vsStale ).toHaveLength( 1 );
    expect( vsStale[ 0 ]).toMatch( /^specs\/b\.md:5 +s-rdv002 .*s-rdv001/ );
    expect( vsStale[ 0 ]).toMatch( new RegExp( fsHash( sRootOld )));
    expect( vsStale[ 0 ]).toMatch( new RegExp( fsHash( sRootNew )));
    [ sPathSpecA, sPathSpecB ].forEach(( s, n ) => {
      const aRun = faRun( [ s ]);
      expect( fvsLineInSection( aRun.sOut, sTitleRederive )).toHaveLength( 1 );
      expect( aRun.cExit ).toBe( vcExit[ n ]);
    });
    fWrite( sRootNew, fsHashRun( "s-rdv001" ));
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleRederive )).toEqual( [] );
  });
});

// @proves s-hgk19s@2c0c557
// @proves s-n8uc4k@a405885
// @proves s-fm2sqk@135c61a
// @proves s-sfuntg@4b5ec33
describe( "spec-map-root-unstamped-listed — an unstamped reference", () => {
  test( "is named by the full run, and the path run exits as without the "
    + "root list", () => {
    const fWrite = ( sList ) => fWriteSpecs({
      [ sPathSpecA ]: [ "* {#s-ust001} The root." ],
      [ sPathSpecB ]: [ "* {#s-ust002" + sList + "} The conclusion." ]
    });
    fWrite( "" );
    const cExitBare = faRun( [ sPathSpecB ]).cExit;
    fWrite( " <s-ust001" );
    const aRun = faRun( [] );
    const vsUnstamped = fvsLineInSection( aRun.sOut, sTitleUnstamped );
    expect( vsUnstamped ).toHaveLength( 1 );
    expect( vsUnstamped[ 0 ]).toMatch(
      /^specs\/b\.md:5 +s-ust002 .*s-ust001/
    );
    expect( aRun.cExit ).toBe( 0 );
    expect( faRun( [ sPathSpecB ]).cExit ).toBe( cExitBare );
  });
});

// @proves s-jhjrqa@2306326
// @proves s-n7yhjf@0cf1206
// @proves s-wqdxix@ceec0e2
// @proves s-tzxhy9@09c0d8a
// @proves s-pe5j7a@8fee8c2
describe( "spec-map-root-assign-stamps — --assign over root lists", () => {
  test( "assigns, rewrites and stamps references, leaving stale stamps and "
    + "malformed lists, PAIRED with a second run, which does nothing", () => {
    const vsBody = [
      "* {#s-?r} The labelled root.",
      "* {#s-? <s-?r} The labelled conclusion.",
      "* {#s-ast001} An existing root.",
      "* {#s-ast002 <s-ast001} Unstamped.",
      "* {#s-ast003 <s-ast001@0000000} A stale stamp.",
      "* {#s-ast004 <s-nosuch} A malformed list."
    ];
    const sSpec = fsSpecStmt( "A", vsBody, false );
    fWriteTree({ [ sPathSpecA ]: sSpec });
    const aRun = faRun( [ "--assign" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsOut = aRun.sStdout.trim().split( "\n" );
    expect( vsOut ).toHaveLength( 4 );
    const reAssign = /^specs\/a\.md:(\d+) {2}(s-[a-z0-9]{6}) {2}The /;
    const vtAssign = vsOut.slice( 0, 2 ).map(( s ) => s.match( reAssign ));
    expect( vtAssign.map(( t ) => t[ 1 ])).toEqual( [ "5", "6" ] );
    const [ sIdRoot, sIdConc ] = vtAssign.map(( t ) => t[ 2 ]);
    expect( sIdRoot ).not.toBe( sIdConc );
    const sStampRoot = sIdRoot + "@" + fsHash( "The labelled root." );
    const sStampOld = "s-ast001@" + fsHash( "An existing root." );
    expect( vsOut.slice( 2 )).toEqual([
      "specs/a.md:6  " + sIdConc + "  <" + sStampRoot,
      "specs/a.md:8  s-ast002  <" + sStampOld
    ]);
    const sAfter = fsSpecStmt( "A", [
      "* {#" + sIdRoot + "} The labelled root.",
      "* {#" + sIdConc + " <" + sStampRoot + "} The labelled conclusion.",
      "* {#s-ast001} An existing root.",
      "* {#s-ast002 <" + sStampOld + "} Unstamped."
    ].concat( vsBody.slice( 4 )), false );
    const sRead = () => fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    expect( sRead()).toBe( sAfter );
    const aRunAgain = faRun( [ "--assign" ]);
    expect( aRunAgain.sStdout ).toBe( "" );
    expect( aRunAgain.cExit ).toBe( 0 );
    expect( sRead()).toBe( sAfter );
  });
});

// @proves s-1f2z8r@e38b9ea
describe( "spec-map-root-query-lists — the --root query", () => {
  test( "prints a root's conclusions and count, PAIRED with a statement "
    + "that is no root and an unknown id", () => {
    fWriteSpecs(
      { [ sPathSpecA ]: [
        "* {#s-rq0001} The root.",
        "* {#s-rq0002 <s-rq0001} Proved.",
        "* {#s-rq0003 <s-rq0001} Unproved.",
        "* {#s-rq0004} A plain rule."
      ]},
      { [ sPathTestOne ]: fsTestLinking(
        "specs/a.md", [[ "s-rq0002", "Proved." ]]
      )}
    );
    const aRun = faRun( [ "--root", "s-rq0001" ]);
    expect( aRun.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:5  s-rq0001",
      "  specs/a.md:6  s-rq0002  satisfied",
      "  specs/a.md:7  s-rq0003  unsatisfied",
      "  1 of 2 satisfied"
    ]);
    expect( aRun.cExit ).toBe( 0 );
    const aRunPlain = faRun( [ "--root", "s-rq0004" ]);
    expect( aRunPlain.sStdout ).toMatch( /no conclusions/ );
    expect( aRunPlain.cExit ).toBe( 0 );
    const aRunNone = faRun( [ "--root", "s-zzzzzz" ]);
    expect( aRunNone.sStdout ).toBe( "" );
    expect( aRunNone.cExit ).not.toBe( 0 );
  });
});

// @proves s-rkzefi@94d4b4a
describe( "spec-map-extra-path-refused — an extra spec path", () => {
  const sPathGamma = path.join( "specs", "gamma.md" );

  const fExpectRefused = ( vsArg ) => {
    const aRun = faRun( vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sOut ).toMatch( /^usage: / );
  };

  test( "a second path, or a path beside a query form or --assign, maps "
    + "nothing and exits 2 with the usage line on stderr; PAIRED with one "
    + "path, which maps it", () => {
      fExpectRefused([ sPathSpecRel, sPathGamma ]);
      fExpectRefused([ "--sid", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--hash", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--candidates", "s-zzzzzz", sPathSpecRel ]);
      fExpectRefused([ "--root", "arch", sPathSpecRel ]);
      fExpectRefused([ "--assign", sPathSpecRel ]);
      const aRun = faRun([ sPathSpecRel ]);
      expect( aRun.sStdout ).toMatch( /^Unlinked tests: \d+ of \d+$/m );
      expect( aRun.cExit ).toBe( 0 );
    });
});

const sPathTestWeb = path.join(
  "packages", "web-client", "test", "w.test.js"
);

const fsLinkPart = ( sId, sHash, sPart ) => (
  fsLink( sId, sHash ) + " part=" + sPart
);

const fsTestLinks = ( vsOwner, vtLink ) => vsOwner
  .map(( sPathOwner ) => "// @spec " + sPathOwner )
  .concat( vtLink.flatMap(( tLink ) => [
    tLink[ 0 ], "test( \"" + tLink[ 1 ] + "\", () => {} );"
  ]), [ "" ])
  .join( "\n" );

const fvsReadTree = () => fs.readdirSync( sDirFixture, { recursive: true })
  .map(( sPathRel ) => path.join( sDirFixture, sPathRel ))
  .filter(( sPath ) => fs.statSync( sPath ).isFile())
  .sort()
  .map(( sPath ) => sPath + "\n" + fs.readFileSync( sPath, "utf8" ));

const sReSplit = /--split-parts splits it into derived statements/;

const fsTextDerived = ( sTextParent, sLabel ) => (
  sTextParent + " applied to the " + sLabel + "."
);

const fsHashDerived = ( sTextParent, sLabel ) => fsHash(
  fsTextDerived( sTextParent, sLabel )
);

describe( "a part list", () => {
  // @proves s-4qpk97@7e4bb82
  // @proves s-7llevg@6c2799e
  test( "on a marker of any type, in any form, is malformed and its (6) "
    + "entry says --split-parts splits it, the run with its spec failing, "
    + "PAIRED with the part lists removed, which leaves nothing in (6)",
  () => {
    const vsPart = [
      " parts=terminal,web", " <arch parts=terminal,web", " parts=web",
      " parts=Web,x"
    ];
    const fWrite = ( bParts ) => fWriteSpecs({ [ sPathSpecA ]: vsPart
      .map(( sParts, n ) => (
        "* {#s-pl000" + n + ( bParts ? sParts : "" ) + "} Rule pl " + n + "."
      ))
      .concat(
        "* {#p-pl0009 >specs/a.md" + ( bParts ? " parts=a,b" : "" )
        + "} A pointer.",
        "* {#s-pl0008} A rule with no part list."
      )});
    fWrite( true );
    const aRun = faRun( [ sPathSpecA ]);
    const vsBad = fvsLineInSection( aRun.sOut, sTitleMarker );
    expect( vsBad.map(( sLine ) => sLine.split( " " )[ 0 ])).toEqual([
      "specs/a.md:5", "specs/a.md:6", "specs/a.md:7", "specs/a.md:8",
      "specs/a.md:9"
    ]);
    vsBad.forEach(( sLine ) => expect( sLine ).toMatch( sReSplit ));
    expect( aRun.cExit ).not.toBe( 0 );
    fWrite( false );
    const aRunNone = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunNone.sOut, sTitleMarker )).toEqual( [] );
    expect( aRunNone.cExit ).toBe( 0 );
  });
});

describe( "derived statements", () => {
  const sTextParent = "Every surface holds the rule.";
  const fasBodyDerived = ( vsLabelProved ) => ({
    [ sPathSpecA ]: fsSpecStmt( "A", [
      "* {#s-dv0000} " + sTextParent,
      "* {#s-dv0001 surface=terminal} {s-dv0000} applied to the terminal.",
      "* {#s-dv0002 <arch surface=web} {s-dv0000} applied to the web."
    ]),
    [ sPathTestOne ]: fsTestLinks( [], vsLabelProved
      .filter(( sLabel ) => sLabel === "terminal" )
      .map(( sLabel ) => [
        fsLink( "s-dv0001", fsHashDerived( sTextParent, sLabel )),
        "terminal arm"
      ])),
    [ sPathTestWeb ]: fsTestLinks( [], vsLabelProved
      .filter(( sLabel ) => sLabel === "web" )
      .map(( sLabel ) => [
        fsLink( "s-dv0002", fsHashDerived( sTextParent, sLabel )),
        "web arm"
      ]))
  });

  // @proves s-13qcjo@38e295c
  // @proves s-ixasv4@f731c6a
  // @proves s-qmf2lg@5795cc1
  // @proves s-efoflb@3670587
  // @proves s-6p2zp4@94323aa
  test( "make their parent a root that is no unproved statement, each "
    + "conclusion shown with its surface, the root unsatisfied while one "
    + "is unproved, PAIRED with the missing one proved from the web suite, "
    + "which covers the root", () => {
    fWriteTree( fasBodyDerived([ "terminal" ]));
    const aRun = faRun( [] );
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-dv0002" ]
    );
    expect( fvsLineInSection( aRun.sOut, sTitleRoot )).toEqual([
      "specs/a.md:5  s-dv0000",
      "specs/a.md:6  s-dv0001  surface=terminal  satisfied",
      "specs/a.md:7  s-dv0002  surface=web  unsatisfied",
      "1 of 2 satisfied"
    ]);
    expect( faRun( [ "--root", "s-dv0000" ]).sStdout ).toBe([
      "specs/a.md:5  s-dv0000",
      "  specs/a.md:6  s-dv0001  surface=terminal  satisfied",
      "  specs/a.md:7  s-dv0002  surface=web  unsatisfied",
      "  1 of 2 satisfied",
      ""
    ].join( "\n" ));
    fWriteTree( fasBodyDerived([ "terminal", "web" ]));
    const aRunBoth = faRun( [] );
    expect( fvsIdInSection( aRunBoth.sOut, sTitleUnproved )).toEqual( [] );
    expect( fvsLineInSection( aRunBoth.sOut, sTitleRoot ))
      .toContain( "covered" );
  });

  // @proves s-nktt4y@2747a61
  test( "for one surface only leave no list, exit code or gate entry "
    + "naming the parent for another surface, PAIRED with the second "
    + "surface's statement written, which changes only its own lines", () => {
    const sSpecOne = fsSpecStmt( "A", [
      "* {#s-sm0000} A permission question is plain text.",
      "* {#s-sm0001 <arch surface=browser} {s-sm0000} applied to the browser."
    ]);
    fWriteTree({ [ sPathSpecA ]: sSpecOne });
    const aRunOne = faRun( [] );
    const aRunPath = faRun( [ sPathSpecA ]);
    const aGate = faRun( [ "--gate" ]);
    expect( aGate.cExit ).toBe( 0 );
    expect( aGate.sStdout ).not.toMatch( /s-sm0000/ );
    expect( aRunPath.cExit ).toBe( 0 );
    expect( aRunOne.sOut ).not.toMatch( /terminal|missing/ );
    fWriteTree({ [ sPathSpecA ]: sSpecOne + [
      "* {#s-sm0002 <arch surface=terminal} {s-sm0000} applied to the "
        + "terminal.",
      ""
    ].join( "\n" )});
    const aRunTwo = faRun( [] );
    const vsAdded = aRunTwo.sOut.split( "\n" )
      .filter(( sLine ) => !aRunOne.sOut.split( "\n" ).includes( sLine ));
    vsAdded.forEach(( sLine ) => expect( sLine ).toMatch(
      /s-sm0002|^\S.*\(\d+\):$|^\s*\d+ of \d+|^Unlinked tests/
    ));
    expect( vsAdded.some(( sLine ) => /s-sm0002/.test( sLine ))).toBe( true );
  });

  // @proves s-df84cf@66e21c8
  // @proves s-2vyccd@d9ef2de
  test( "are each implemented whole: an @implements naming the parent "
    + "counts for none of them and (31) never names the root, PAIRED with "
    + "an @implements naming one of them, which removes only it", () => {
    const sImpl = ( vsRef ) => vsRef.concat(
      "// @tested-by test/one.test.js", "const x = 1;", ""
    ).join( "\n" );
    const asBody = fasBodyDerived([ "terminal", "web" ]);
    fWriteTree({
      ...asBody,
      "src/impl.js": sImpl([
        "// @implements s-dv0000@" + fsHash( sTextParent )
      ])
    });
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleNoImplementation )).toEqual(
      [ "specs/a.md:6  s-dv0001", "specs/a.md:7  s-dv0002" ]
    );
    fWriteTree({
      ...asBody,
      "src/impl.js": sImpl([
        "// @implements s-dv0001@" + fsHashDerived( sTextParent, "terminal" )
      ])
    });
    const aRunOne = faRun( [] );
    expect( fvsLineInSection( aRunOne.sOut, sTitleNoImplementation )).toEqual(
      [ "specs/a.md:7  s-dv0002" ]
    );
  });
});

// @proves s-lf00bp@0ec752e
// @proves s-jcgn2k@220009d
describe( "a part link", () => {
  test( "is malformed and resolves nothing, its (8) entry saying "
    + "--split-parts splits it, the statement unproved and the run with "
    + "its spec failing, PAIRED with the same links whole, which resolve",
  () => {
    const sText = "The rule holds.";
    const sHash = fsHash( sText );
    const fWrite = ( bPart ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-lr0001} " + sText ]),
      [ sPathTestOne ]: fsTestLinks( [ "specs/a.md" ], [
        [ bPart
          ? fsLinkPart( "s-lr0001", sHash, "cli" )
          : fsLink( "s-lr0001", sHash ), "cli" ],
        [ bPart
          ? fsLinkPart( "s-lr0001", "0000000", "web" ) + "  "
          : fsLink( "s-lr0001", "0000000" ), "web stale" ]
      ])
    });
    fWrite( true );
    const aRun = faRun( [ sPathSpecA ]);
    const vsBad = fvsLineInSection( aRun.sOut, sTitleLinkBad );
    expect( vsBad ).toHaveLength( 2 );
    expect( vsBad[ 0 ]).toMatch( /^test\/one\.test\.js:2 .*part=cli/ );
    expect( vsBad[ 1 ]).toMatch( /^test\/one\.test\.js:4 .*part=web/ );
    vsBad.forEach(( sLine ) => expect( sLine ).toMatch( sReSplit ));
    expect( fvsLineInSection( aRun.sOut, sTitleStale )).toEqual( [] );
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-lr0001" ]
    );
    expect( aRun.cExit ).not.toBe( 0 );
    fWrite( false );
    const aRunWhole = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunWhole.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleStale )).toHaveLength( 1 );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleUnproved )).toEqual( [] );
  });
});

// @proves s-lf00bp@0ec752e
describe( "a part link naming a statement with no part list", () => {
  test( "lists no proposed part and owns no file, the file with no owner "
    + "line named in (3) and its test unlinked, PAIRED with the links "
    + "whole, after which the statement is proved", () => {
    const sText = "The `fooBar` rule holds.";
    const sHash = fsHash( sText );
    const fWrite = ( bPart ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-pp0001} " + sText ]),
      [ sPathTestOne ]: fsTestLinks( [], [[
        bPart
          ? fsLinkPart( "s-pp0001", sHash, "terminal" )
          : fsLink( "s-pp0001", sHash ),
        "fooBar terminal arm"
      ]])
    });
    fWrite( true );
    const aRun = faRun( [] );
    expect( aRun.sOut ).not.toMatch( /proposed/ );
    expect( fvsLineInSection( aRun.sOut, sTitleNoOwner )).toEqual(
      [ "test/one.test.js" ]
    );
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad ).join( "" ))
      .toMatch( sReSplit );
    expect( fvsLineInSection( aRun.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  1" ]
    );
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-pp0001" ]
    );
    fWrite( false );
    const aRunWhole = faRun( [] );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleNoOwner )).toEqual( [] );
    expect( fvsLineInSection( aRunWhole.sOut, sTitleUnproved )).toEqual( [] );
  });
});

// @proves s-zybg31@316483b
// @proves s-b21zr4@c4562be
// @proves s-rkzefi@94d4b4a
// @proves s-6gfnun@f467b05
describe( "--cross-suite and --sid over derived statements", () => {
  test( "--sid gives each link's place, call, hash and state with no "
    + "label, PAIRED with --cross-suite listing each statement linked "
    + "from two suites, a parent's derived statements apart, writing "
    + "nothing, and refusing a spec path", () => {
    const fsH = ( sId ) => fsHash( "Rule " + sId + "." );
    const vsId = [ "s-cs0001", "s-cs0002", "s-cs0003", "s-cs0004" ];
    const vsHashDerived = [ "terminal", "web" ].map(( sLabel ) => (
      fsHashDerived( "Rule s-cs0004.", sLabel )
    ));
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-cs0001} Rule s-cs0001.",
        "* {#s-cs0002} Rule s-cs0002.",
        "* {#s-cs0003} Rule s-cs0003.",
        "* {#s-cs0004} Rule s-cs0004.",
        "* {#s-cs0005 surface=terminal} {s-cs0004} applied to the terminal.",
        "* {#s-cs0006 surface=web} {s-cs0004} applied to the web."
      ]),
      [ sPathTestOne ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( vsId[ 0 ], fsH( vsId[ 0 ])), "t one" ],
        [ fsLink( vsId[ 1 ], fsH( vsId[ 1 ])), "t two" ],
        [ fsLink( vsId[ 2 ], fsH( vsId[ 2 ])), "t three" ],
        [ fsLink( "s-cs0005", vsHashDerived[ 0 ]), "t four" ]
      ]),
      [ sPathTestTwo ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( vsId[ 2 ], fsH( vsId[ 2 ])), "u three" ]
      ]),
      [ sPathTestWeb ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( vsId[ 1 ], fsH( vsId[ 1 ])), "w two" ],
        [ fsLink( "s-cs0006", vsHashDerived[ 1 ]), "w four" ]
      ])
    });
    const aRunSid = faRun( [ "--sid", "s-cs0001" ]);
    expect( aRunSid.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:5  s-cs0001  Rule s-cs0001.",
      "test/one.test.js:2  t one  " + fsH( vsId[ 0 ]) + "  current"
    ]);
    expect( aRunSid.cExit ).toBe( 0 );
    const vsBefore = fvsReadTree();
    const aRunCross = faRun( [ "--cross-suite" ]);
    expect( aRunCross.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:6  s-cs0002",
      "  test/one.test.js:4",
      "  packages/web-client/test/w.test.js:2"
    ]);
    expect( aRunCross.cExit ).toBe( 0 );
    expect( fvsReadTree()).toEqual( vsBefore );
    const aRunRefused = faRun( [ "--cross-suite", sPathSpecA ]);
    expect( aRunRefused.cExit ).toBe( 2 );
    expect( aRunRefused.sStdout ).toBe( "" );
    expect( aRunRefused.sOut ).toMatch( /^usage: / );
  });
});

describe( "a surface flag", () => {
  // @proves s-s0x8ie@f630543
  // @proves s-m3nvmc@4ea2a37
  // @proves s-gry2es@de73667
  test( "is read after the root list and before the probe flag with "
    + "nothing malformed, and adding, changing or removing it keeps the "
    + "hash, PAIRED with the flag after the probe flag, which leaves the "
    + "marker unclosed", () => {
    const sTextParent = "Rule sf zero.";
    const fWrite = ( sMarker ) => fWriteSpecs({ [ sPathSpecA ]: [
      "* {#s-sf0000} " + sTextParent,
      "* {#s-sf0001" + sMarker + "} {s-sf0000} applied to the web."
    ]});
    [
      " <arch surface=web probe", " <arch surface=browser-2 probe",
      " <arch probe"
    ].forEach(( sMarker ) => {
      fWrite( sMarker );
      const aRun = faRun( [ sPathSpecA ]);
      expect( fvsLineInSection( aRun.sOut, sTitleMarker )).toEqual( [] );
      expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
      expect( fsHashRun( "s-sf0001" )).toBe(
        fsHashDerived( sTextParent, "web" )
      );
      expect( faRun( [ "--probes" ]).sStdout ).toBe(
        "specs/a.md:6  s-sf0001\n"
      );
    });
    fWrite( " probe surface=web" );
    expect( fvsLineInSection( faRun( [ sPathSpecA ]).sOut, sTitleMarker ))
      .toEqual([ expect.stringMatching( /^specs\/a\.md:6 .*\(malformed\)$/ )]);
  });

  // @proves s-ni7ark@e934261
  // @proves s-xo5d9n@08c26fd
  test( "is malformed on a statement with no inclusion, on a line of "
    + "another type, empty, in another form or with two labels, each in "
    + "(6), PAIRED with one well-formed label on a derived statement", () => {
    fWriteSpecs({ [ sPathSpecA ]: [
      "* {#s-sb0000} Rule sb zero.",
      "* {#s-sb0001 surface=web} No inclusion here.",
      "* {#p-sb0002 >specs/a.md surface=web} A pointer.",
      "* {#s-sb0003 surface=} {s-sb0000} applied to nothing.",
      "* {#s-sb0004 surface=Web} {s-sb0000} applied to the Web.",
      "* {#s-sb0005 surface=web,cli} {s-sb0000} applied to two.",
      "* {#s-sb0006 surface=web} {s-sb0000} applied to the web."
    ]});
    const vsBad = fvsLineInSection(
      faRun( [ sPathSpecA ]).sOut, sTitleMarker
    );
    expect( vsBad.map(( sLine ) => sLine.split( " " )[ 0 ])).toEqual([
      "specs/a.md:6", "specs/a.md:7", "specs/a.md:8", "specs/a.md:9",
      "specs/a.md:10"
    ]);
    vsBad.forEach(( sLine ) => expect( sLine ).toMatch( /surface flag/ ));
  });
});

describe( "an inclusion", () => {
  // @proves s-3vhy40@92707b8
  // @proves s-8ej89k@ad53a57
  // @proves s-yallh6@309b54b
  test( "names an s or m line by id, or by a label of its spec, anywhere "
    + "in a statement's text, PAIRED with the same characters in a code "
    + "span, a line of another type and unmarked text, which are plain "
    + "text", () => {
    fWriteSpecs({ [ sPathSpecA ]: [
      "> {#m-in0000} RULING (CEO): \"Hold it.\"",
      "",
      "* {#s-?rule} Rule in label.",
      "* {#s-in0001} Before {s-?rule} after.",
      "* {#s-in0002} Motive {m-in0000} kept.",
      "* {#s-in0003} A span `{s-in0001}` stays.",
      "* {#d-in0004} **Term in.** Means {s-zzzzzz}.",
      "",
      "Unmarked text {s-zzzzzz} here."
    ]});
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRootBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, "underived motives" )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRoot )).toEqual( expect
      .arrayContaining([
        "specs/a.md:7  placeholder", "specs/a.md:5  m-in0000"
      ]));
    expect( fsHashRun( "s-in0001" )).toBe(
      fsHash( "Before Rule in label. after." )
    );
    expect( fsHashRun( "s-in0002" )).toBe(
      fsHash( "Motive RULING (CEO): \"Hold it.\" kept." )
    );
    expect( fsHashRun( "s-in0003" )).toBe(
      fsHash( "A span `{s-in0001}` stays." )
    );
    expect( fsHashRun( "d-in0004" )).toBe(
      fsHash( "**Term in.** Means {s-zzzzzz}." )
    );
  });

  // @proves s-bbaxpr@4e51c3f
  // @proves s-ickx1f@508799a
  // @proves s-880seq@40723b9
  test( "in each malformed form is named in (13) with what is wrong, "
    + "leaving its marker well formed and its text as written, the gate "
    + "refusing only the one naming an id no marker holds, PAIRED with a "
    + "root list naming a parent, which is not malformed", () => {
    const vsBody = [
      "* {#s-mi0000} Rule mi zero.",
      "* {#s-mi0001} Short {s-abc} id.",
      "* {#s-mi0002} Stamped {s-mi0000@1234567} id.",
      "* {#s-mi0003} Pointer {p-mi0009} id.",
      "* {#p-mi0009 >specs/a.md} A pointer.",
      "* {#s-mi0004} Absent {s-zzzzzz} id.",
      "* {#s-mi0099} Dup one.",
      "* {#s-mi0099} Dup two.",
      "* {#s-mi0005} Twice {s-mi0099} id.",
      "* {#s-mi0006} Label {s-?nowhere} id.",
      "* {#s-mi0007} Own {s-mi0007} id.",
      "* {#s-mi0008 <s-mi0000} Also {s-mi0000} root.",
      "* {#s-mi0010} Cycle {s-mi0011} one.",
      "* {#s-mi0011} Cycle {s-mi0010} two.",
      "* {#s-mi0012} Unclosed {s-mi0000 here."
    ];
    fWriteSpecs({ [ sPathSpecA ]: vsBody });
    const aRun = faRun( [] );
    const vsBad = fvsLineInSection( aRun.sOut, sTitleRootBad );
    expect( vsBad.map(( sLine ) => sLine.split( "  " )[ 0 ])).toEqual([
      6, 7, 8, 10, 13, 14, 15, 16, 17, 18, 19
    ].map(( nLine ) => "specs/a.md:" + nLine ));
    [
      "{s-abc}", "{s-mi0000@1234567}", "{p-mi0009}", "{s-zzzzzz}",
      "{s-mi0099}", "{s-?nowhere}", "{s-mi0007}", "{s-mi0000}",
      "{s-mi0011}", "{s-mi0010}", "{s-mi0000"
    ].forEach(( sWritten, n ) => {
      expect( vsBad[ n ].split( "  " )[ 1 ]).toBe( sWritten );
      expect( vsBad[ n ]).toMatch( /\(.+\)$/ );
    });
    expect( fvsLineInSection( aRun.sOut, sTitleMarker ).join( "\n" ))
      .not.toMatch( /mi00(?!99)/ );
    expect( fsHashRun( "s-mi0004" )).toBe( fsHash( "Absent {s-zzzzzz} id." ));
    const vsGate = faRun( [ "--gate" ]).sStdout.split( "\n" )
      .filter(( sLine ) => sLine.startsWith( "(13)" ));
    expect( vsGate ).toEqual([ "(13) specs/a.md:10  {s-zzzzzz}  "
      + vsBad[ 3 ].replace( /^.*\{s-zzzzzz\} {2}/, "" ) ]);
  });

  // @proves s-n8uc4k@a405885
  // @proves s-hgk19s@2c0c557
  test( "malformed, is named in (13) by its own spec's path run, which "
    + "exits non-zero, PAIRED with another spec's path run, which neither "
    + "names it nor fails", () => {
    fWriteSpecs({
      [ sPathSpecA ]: [ "* {#s-nx0001} Absent {s-zzzzzz} id." ],
      [ sPathSpecB ]: [ "* {#s-nx0002} Rule nx two." ]
    });
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunA.sOut, sTitleRootBad )
      .map(( sLine ) => sLine.split( "  " ).slice( 0, 2 ).join( "  " )))
      .toEqual([ "specs/a.md:5  {s-zzzzzz}" ]);
    expect( aRunA.cExit ).not.toBe( 0 );
    const aRunB = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunB.sOut, sTitleRootBad )).toEqual( [] );
    expect( aRunB.cExit ).toBe( 0 );
  });

  // @proves s-fc4ubx@3f16155
  // @proves s-83mryk@52401d8
  // @proves s-qln1ta@564522c
  test( "is replaced, before hashing, by the normalised text of the line "
    + "it names, its own inclusions first, so editing the parent stales "
    + "each link and implementation reference to a derived statement, "
    + "PAIRED with an inclusion that does not resolve, kept as written",
  () => {
    const fWrite = ( sTextParent ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-hf0000} " + sTextParent,
        "* {#s-hf0001 surface=web} {s-hf0000} applied",
        "  to the web.",
        "* {#s-hf0002} {s-hf0001} Again, {s-zzzzzz} kept."
      ]),
      [ sPathTestOne ]: fsTestLinks( [], [[
        fsLink( "s-hf0001", fsHashDerived( "The parent `rule` holds.", "web" )),
        "web arm"
      ]]),
      "src/impl.js": [
        "// @implements s-hf0001@"
          + fsHashDerived( "The parent `rule` holds.", "web" ),
        "// @tested-by test/one.test.js",
        "const x = 1;",
        ""
      ].join( "\n" )
    });
    fWrite( "The parent `rule` holds." );
    expect( fsHashRun( "s-hf0002" )).toBe( fsHash(
      "The parent `rule` holds. applied to the web. Again, {s-zzzzzz} kept."
    ));
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleStale )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, "malformed, unresolved or stale "
      + "code references" )).toEqual( [] );
    fWrite( "The parent `rule` still holds." );
    const aRunEdited = faRun( [] );
    expect( fvsLineInSection( aRunEdited.sOut, sTitleStale ).join( "" ))
      .toMatch( /s-hf0001/ );
    expect( fvsLineInSection( aRunEdited.sOut, "malformed, unresolved or "
      + "stale code references" ).join( "" )).toMatch( /stale hash/ );
  });

  // @proves s-lqyq1i@946e8b2
  // @proves s-53ztk4@703b57d
  // @proves s-dglucu@bd4c60b
  test( "is never stamped or listed for re-derive, and --assign replaces "
    + "only its label with the id it gives, keeping the hash, PAIRED with "
    + "a root list naming the same parent, which is stamped and re-derived",
  () => {
    const vsBody = [
      "* {#s-?base} Base rule.",
      "* {#s-rd0001} {s-?base} applied to the cli.",
      "* {#s-rd0002 <s-?base} Rooted in base."
    ];
    fWriteSpecs({ [ sPathSpecA ]: vsBody });
    const sHashDerived = fsHashDerived( "Base rule.", "cli" );
    expect( fsHashRun( "s-rd0001" )).toBe( sHashDerived );
    expect( fvsIdInSection( faRun( [] ).sOut, sTitleUnstamped )).toEqual(
      [ "specs/a.md:7" ]
    );
    expect( faRun( [ "--assign" ]).cExit ).toBe( 0 );
    const sSpec = fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    const sId = sSpec.match( /\{#(s-[a-z0-9]{6})\} Base rule\./ )[ 1 ];
    expect( sSpec ).toBe( fsSpecStmt( "a.md", [
      "* {#" + sId + "} Base rule.",
      "* {#s-rd0001} {" + sId + "} applied to the cli.",
      "* {#s-rd0002 <" + sId + "@" + fsHash( "Base rule." )
        + "} Rooted in base."
    ], false ));
    expect( fsHashRun( "s-rd0001" )).toBe( sHashDerived );
    fs.writeFileSync(
      path.join( sDirFixture, sPathSpecA ),
      sSpec.replace( "} Base rule.", "} Base rule changed." )
    );
    const aRun = faRun( [] );
    expect( fvsIdInSection( aRun.sOut, sTitleRederive )).toEqual(
      [ "specs/a.md:7" ]
    );
    expect( fvsLineInSection( aRun.sOut, sTitleUnstamped )).toEqual( [] );
  });

  // @proves s-ihqgan@de8037f
  test( "gives --candidates the distinctive terms of the text it names, "
    + "PAIRED with the inclusion in a code span, which gives none", () => {
    const fWrite = ( sInclusion ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-cd0000} The `fooBar` call holds.",
        "* {#s-cd0001 surface=web} " + sInclusion + " applied to the web."
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        "test( \"calls fooBar\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "{s-cd0000}" );
    expect( faRun( [ "--candidates", "s-cd0001" ]).sStdout ).toBe(
      "test/one.test.js:2  calls fooBar  score 1  terms: fooBar\n"
    );
    fWrite( "`{s-cd0000}`" );
    expect( faRun( [ "--candidates", "s-cd0001" ]).sStdout ).toBe( "" );
  });
});

describe( "--split-parts", () => {
  const sTextOne = "Rule sp one. continuing line.";
  const sHashOne = fsHash( sTextOne );
  const sHashTwo = fsHash( "Rule sp two." );
  const vsSpecBefore = [
    "* {#s-sp0001 <arch parts=terminal,web probe} Rule sp one.",
    "  continuing line.",
    "* {#s-sp0002} Rule sp two.",
    "* {#s-? parts=a,b} Placeholder rule.",
    "* {#s-sp0003 parts=Bad,x} Bad form."
  ];
  const fvsTestOne = ( asIdForLabel ) => [
    "// @spec specs/a.md"
  ].concat(
    asIdForLabel === null
      ? [ "// @implements s-sp0001@" + sHashOne ]
      : [ "terminal", "web" ].map(( sLabel ) => (
        "// @implements " + asIdForLabel[ sLabel ] + "@"
        + fsHashDerived( sTextOne, sLabel )
      )),
    [ "describe( \"arms\", () => {" ],
    asIdForLabel === null
      ? [ "  // @proves s-sp0001@" + sHashOne + " part=terminal" ]
      : [ "  // @proves " + asIdForLabel.terminal + "@"
        + fsHashDerived( sTextOne, "terminal" ) ],
    [ "  test( \"terminal arm\", () => {} );" ],
    asIdForLabel === null
      ? [ "  // @proves s-sp0001@0000000 part=web  " ]
      : [ "  // @proves " + asIdForLabel.web + "@0000000  " ],
    [
      "  test( \"web arm\", () => {} );",
      "});",
      "// @guards s-sp0001@" + sHashOne,
      "test( \"guard\", () => {} );",
      "// @proves s-sp0002@" + sHashTwo + " part=x",
      "test( \"proposed\", () => {} );",
      ""
    ]
  );
  const sImpl = [
    "// @implements s-sp0001@" + sHashOne,
    "// @tested-by test/one.test.js",
    "const x = 1;",
    ""
  ].join( "\n" );
  const fsRead = ( sPathRel ) => fs.readFileSync(
    path.join( sDirFixture, sPathRel ), "utf8"
  );

  // @proves s-ol3soy@d2da0a6
  // @proves s-5fldjm@514a40a
  // @proves s-m69cme@f4c0170
  // @proves s-6ujq8d@696a8e1
  // @proves s-rn2itq@10cc3ef
  // @proves s-3rhim7@92937b7
  // @proves s-4y7ukm@b763556
  // @proves s-y5buk6@917c800
  // @proves s-iwko4c@581c6c6
  // @proves s-yurmkw@ee703cc
  test( "splits each well-formed part list into derived statements, "
    + "rewrites its part links and test-implementation references, leaves "
    + "the rest by hand and names a bad list on stderr, exiting 1, PAIRED "
    + "with a second run, which splits nothing again", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", vsSpecBefore ),
      [ sPathTestOne ]: fvsTestOne( null ).join( "\n" ),
      "src/x.js": sImpl
    });
    const sTreeBefore = fvsReadTree().join( "\n" );
    const aRun = faRun( [ "--split-parts" ]);
    expect( aRun.cExit ).toBe( 1 );
    const sSpec = fsRead( sPathSpecA );
    const vsId = Array.from(
      sSpec.matchAll( /\{#(s-[a-z0-9]{6}) surface=/g ), ( vs ) => vs[ 1 ]
    );
    expect( vsId ).toHaveLength( 2 );
    expect( new Set( vsId ).size ).toBe( 2 );
    vsId.forEach(( sId ) => {
      expect( sTreeBefore ).not.toContain( sId.slice( 2 ));
    });
    const asIdForLabel = { terminal: vsId[ 0 ], web: vsId[ 1 ] };
    expect( sSpec ).toBe( fsSpecStmt( "A", [
      "* {#s-sp0001 <arch probe} Rule sp one.",
      "  continuing line.",
      "* {#" + vsId[ 0 ] + " surface=terminal probe} {s-sp0001} applied to "
        + "the terminal.",
      "* {#" + vsId[ 1 ] + " surface=web probe} {s-sp0001} applied to the "
        + "web.",
      "* {#s-sp0002} Rule sp two.",
      "* {#s-? parts=a,b} Placeholder rule.",
      "* {#s-sp0003 parts=Bad,x} Bad form."
    ]));
    expect( fsRead( sPathTestOne )).toBe(
      fvsTestOne( asIdForLabel ).join( "\n" )
    );
    expect( fsRead( "src/x.js" )).toBe( sImpl );
    expect( aRun.sStdout.trim().split( "\n" ).sort()).toEqual([
      "specs/a.md:7  " + vsId[ 0 ] + "  s-sp0001  terminal",
      "specs/a.md:8  " + vsId[ 1 ] + "  s-sp0001  web",
      "test/one.test.js:2  s-sp0001 -> " + vsId[ 0 ],
      "test/one.test.js:2  s-sp0001 -> " + vsId[ 1 ],
      "test/one.test.js:4  s-sp0001 -> " + vsId[ 0 ],
      "test/one.test.js:6  s-sp0001 -> " + vsId[ 1 ],
      "src/x.js:1  s-sp0001  by hand",
      "test/one.test.js:9  s-sp0001  by hand",
      "test/one.test.js:11  s-sp0002  by hand"
    ].sort());
    const sErr = aRun.sOut.slice( aRun.sStdout.length );
    expect( sErr ).toMatch( /specs\/a\.md:8\b/ );
    expect( sErr ).toMatch( /specs\/a\.md:9\b/ );
    expect( sErr ).not.toMatch( /specs\/a\.md:1[01]\b/ );
    expect( fsHashRun( vsId[ 0 ])).toBe( fsHashDerived( sTextOne, "terminal" ));
    const aMap = faRun( [] );
    expect( fvsLineInSection( aMap.sOut, sTitleMarker )
      .map(( sLine ) => sLine.split( " " )[ 0 ]))
      .toEqual([ "specs/a.md:10", "specs/a.md:11" ]);
    expect( fvsLineInSection( aMap.sOut, sTitleRoot )).toEqual( expect
      .arrayContaining([
        "specs/a.md:7  " + vsId[ 0 ] + "  surface=terminal  satisfied"
      ]));
    const sTreeSplit = fvsReadTree().join( "\n" );
    const aRunAgain = faRun( [ "--split-parts" ]);
    expect( aRunAgain.cExit ).toBe( 1 );
    expect( fvsReadTree().join( "\n" )).toBe( sTreeSplit );
    expect( aRunAgain.sStdout ).toBe(
      "test/one.test.js:12  s-sp0002  by hand\n"
    );
  });

  // @proves s-9bzl8i@64430ba
  // @proves s-4y7ukm@b763556
  test( "leaves as written a test-implementation reference no label's link "
    + "covers and prints it by hand, PAIRED with one a part link covers, "
    + "which it rewrites", () => {
    const sImplOld = "// @implements s-sp0001@" + sHashOne;
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", vsSpecBefore.slice( 0, 2 )),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        sImplOld,
        "test( \"uncovered\", () => {} );",
        sImplOld,
        "// @proves s-sp0001@" + sHashOne + " part=web",
        "test( \"covered\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [ "--split-parts" ]);
    expect( aRun.cExit ).toBe( 0 );
    const vsLine = fsRead( sPathTestOne ).split( "\n" );
    expect( vsLine[ 1 ]).toBe( sImplOld );
    expect( vsLine[ 3 ]).toMatch( /^\/\/ @implements s-[a-z0-9]{6}@[0-9a-f]{7}$/ );
    expect( vsLine[ 3 ]).not.toBe( sImplOld );
    expect( aRun.sStdout ).toContain( "test/one.test.js:2  s-sp0001  by hand\n" );
    expect( aRun.sStdout ).not.toMatch( /test\/one\.test\.js:4 .*by hand/ );
  });

  // @proves s-gjk5r1@9d6e18f
  // @proves s-gy5mqc@76d7988
  test( "with no part list and no part label prints and writes nothing "
    + "and exits 0, PAIRED with another argument beside it, which maps "
    + "nothing and exits 2 with the usage line", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-sp0002} Rule sp two." ]),
      [ sPathTestOne ]: fsTestLinks( [ "specs/a.md" ], [
        [ fsLink( "s-sp0002", sHashTwo ), "whole" ]
      ])
    });
    const vsBefore = fvsReadTree();
    const aRun = faRun( [ "--split-parts" ]);
    expect( aRun ).toMatchObject({ cExit: 0, sOut: "" });
    expect( fvsReadTree()).toEqual( vsBefore );
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", vsSpecBefore ),
      [ sPathTestOne ]: fvsTestOne( null ).join( "\n" )
    });
    const vsBeforeParts = fvsReadTree();
    const aRunExtra = faRun( [ "--split-parts", sPathSpecA ]);
    expect( aRunExtra.cExit ).toBe( 2 );
    expect( aRunExtra.sStdout ).toBe( "" );
    expect( aRunExtra.sOut ).toMatch( /^usage: / );
    expect( fvsReadTree()).toEqual( vsBeforeParts );
  });
});

// @proves s-gry2es@de73667
// @proves s-ptc52y@20ab416
describe( "spec-map-probe-flag-query — the probe flag", () => {
  // @proves s-mp16u6@a924b32
  // @proves s-r1opde@e6a3bd1
  // @proves s-vwf1wr@af28dcd
  // @proves s-0ovkpr@5b8beb1
  // @proves s-nksahd@2aa742c
  // @proves s-rkzefi@94d4b4a
  test( "--probes lists each probe statement with the tests its links "
    + "cover, a derived statement's included, the flag leaving the hash "
    + "and the marker well formed, PAIRED with --probes refusing a spec "
    + "path", () => {
    const vsText = [ "Rule pr one.", "Rule pr two.", "Rule pr three." ];
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-pr0001 <arch probe} " + vsText[ 0 ],
        "* {#s-pr0002 <arch surface=a probe} {s-pr0003} applied to the a.",
        "* {#s-pr0003} " + vsText[ 2 ]
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsLink( "s-pr0001", fsHash( vsText[ 0 ])),
        "describe( \"probe group\", () => {",
        "  test( \"first probe\", () => {} );",
        "  test( \"second probe\", () => {} );",
        "});",
        fsLink( "s-pr0002", fsHashDerived( vsText[ 2 ], "a" )),
        "test( \"part probe\", () => {} );",
        fsLink( "s-pr0003", fsHash( vsText[ 2 ])),
        "test( \"plain\", () => {} );",
        ""
      ].join( "\n" )
    });
    const vsBefore = fvsReadTree();
    const aRun = faRun( [ "--probes" ]);
    expect( aRun.sStdout.trim().split( "\n" )).toEqual([
      "specs/a.md:5  s-pr0001",
      "  test/one.test.js:4  first probe",
      "  test/one.test.js:5  second probe",
      "specs/a.md:6  s-pr0002",
      "  test/one.test.js:8  part probe"
    ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsReadTree()).toEqual( vsBefore );
    const aRunMap = faRun( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleMarker )).toEqual( [] );
    expect( fvsLineInSection( aRunMap.sOut, sTitleRootBad )).toEqual( [] );
    expect( fsHashRun( "s-pr0001" )).toBe( fsHash( vsText[ 0 ]));
    const aRunRefused = faRun( [ "--probes", sPathSpecA ]);
    expect( aRunRefused.cExit ).toBe( 2 );
    expect( aRunRefused.sStdout ).toBe( "" );
    expect( aRunRefused.sOut ).toMatch( /^usage: / );
  });

  test( "is kept on a placeholder the assign command gives an id", () => {
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-? <arch probe} Rule pr four.",
        "* {#s-? probe} Rule pr five."
      ])
    });
    expect( fvsLineInSection( faRun( [] ).sOut, sTitleMarker )).toEqual( [] );
    expect( faRun( [ "--assign" ]).cExit ).toBe( 0 );
    const sSpec = fs.readFileSync(
      path.join( sDirFixture, sPathSpecA ), "utf8"
    );
    expect( sSpec ).toMatch( /\{#s-[a-z0-9]{6} <arch probe\} Rule pr four\./ );
    expect( sSpec ).toMatch( /\{#s-[a-z0-9]{6} probe\} Rule pr five\./ );
    expect( faRun( [ "--probes" ]).sStdout ).toMatch(
      /^specs\/a\.md:5  s-[a-z0-9]{6}\nspecs\/a\.md:6  s-[a-z0-9]{6}\n$/
    );
  });
});

describe( "the spec map over the real tree", () => {
  // @proves s-e287lm@a1b403a
  test( "with no argument it exits 0", () => {
    const aRun = faRun( [], sDirRepo );
    expect( aRun.cExit ).toBe( 0 );
  });
});

const sTitleUnbacked = "unbacked guard lines";

const fsGuard = ( sId, sHash ) => "// @guards " + sId + "@" + sHash;

// @proves s-9eix2j@0585aaf
// @proves s-4o88k8@e467b6b
// @proves s-i6cch2@70c8796
// @proves s-3klfsj@d4d9f32
// @proves s-ctbylk@c20e0f1
// @proves s-uny6ly@83363ca
// @proves s-1yuomz@b828506
describe( "spec-map-guard-line-forms — a guard line", () => {
  test( "in each bad form is named in (8) with the word guard, a guard on "
    + "a derived statement resolves, and a statement only guarded stays "
    + "unproved, its root unsatisfied and its probe listing no test, PAIRED "
    + "with @guards in a block comment and a string, which are not read",
  () => {
    const vsText = [
      fsTextDerived( "The guard root holds.", "a" ), "Rule gd two."
    ];
    const vsHash = vsText.map( fsHash );
    fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-gd0000} The guard root holds.",
        "* {#s-gd0001 surface=a probe} {s-gd0000} applied to the a.",
        "* {#s-gd0002} " + vsText[ 1 ],
        "* {#d-gd0004} **Term gd.** A definition."
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsGuard( "s-gd0001", vsHash[ 0 ]),
        "test( \"guards a derived rule\", () => {} );",
        "  " + fsGuard( "s-gd0002", vsHash[ 1 ]) + "   ",
        "test( \"guards rule two\", () => {} );",
        fsGuard( "s-gd0002", vsHash[ 1 ]) + " part=a",
        "test( \"part label\", () => {} );",
        fsGuard( "s-zzz999", "1234567" ),
        "test( \"no such id\", () => {} );",
        fsGuard( "s-gd0004", "1234567" ),
        "test( \"retyped id\", () => {} );",
        fsGuard( "d-gd0004", "1234567" ),
        "test( \"a definition\", () => {} );",
        fsGuard( "s-gd0002", "ABCDEFG" ),
        "test( \"upper hash\", () => {} );",
        "/* @guards s-gd0002@" + vsHash[ 1 ] + " */",
        "const sGuard = \"// @guards s-gd0002@" + vsHash[ 1 ] + "\";",
        fsGuard( "s-gd0002", vsHash[ 1 ]),
        "",
        "test( \"after a blank line\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [] );
    const vsBad = fvsLineInSection( aRun.sOut, sTitleLinkBad );
    expect( vsBad ).toHaveLength( 6 );
    [
      [ 6, /part=a +guard +\(malformed\)$/ ],
      [ 8, /s-zzz999@1234567 +guard +\(no such statement\)$/ ],
      [ 10, /guard +\(retyped: now d-gd0004/ ],
      [ 12, /guard +\(names a line of type definition \(d\)/ ],
      [ 14, /ABCDEFG +guard +\(malformed\)$/ ],
      [ 18, /guard +\(misplaced\)$/ ]
    ].forEach(( tBad, n ) => {
      expect( vsBad[ n ]).toMatch(
        new RegExp( "^test/one\\.test\\.js:" + tBad[ 0 ] + " " )
      );
      expect( vsBad[ n ]).toMatch( tBad[ 1 ]);
    });
    expect( fvsIdInSection( aRun.sOut, sTitleUnproved )).toEqual(
      [ "s-gd0001", "s-gd0002" ]
    );
    expect( fvsLineInSection( aRun.sOut, sTitleRoot ))
      .toContain( "0 of 1 satisfied" );
    expect( aRun.cExit ).toBe( 0 );
    expect( faRun( [ "--probes" ]).sStdout ).toBe( "specs/a.md:6  s-gd0001\n" );
    const aRunPath = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunPath.sOut, sTitleLinkBad )).toEqual( vsBad );
    expect( aRunPath.cExit ).not.toBe( 0 );
  });
});

// @proves s-cs9i6p@5d38c13
// @proves s-p6dv3k@447ea6b
// @proves s-svtfjm@7ad3935
// @proves s-8usccv@c0cc953
// @proves s-0e75fk@780e493
// @proves s-0yoabr@be8d70d
// @proves s-fsp1a2@02fcf0a
// @proves s-s7wgz7@eae0eef
describe( "spec-map-guard-backed-counts — a backed guard", () => {
  const vsText = [ "Rule bk one.", "Rule bk two." ];
  const vsHash = vsText.map( fsHash );
  const sTestGuarding = [
    "// @spec specs/b.md",
    fsLink( "s-bk0002", vsHash[ 1 ]),
    fsGuard( "s-bk0001", vsHash[ 0 ]),
    "test( \"linked and guarding\", () => {} );",
    fsGuard( "s-bk0001", vsHash[ 0 ]),
    "describe( \"guard block\", () => {",
    "  test( \"self-test\", () => {} );",
    "} );",
    ""
  ].join( "\n" );
  const fWrite = ( bBacked, bComplete ) => fWriteTree({
    [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-bk0001} " + vsText[ 0 ]],
      bComplete ),
    [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-bk0002} " + vsText[ 1 ]],
      bComplete ),
    [ sPathTestOne ]: sTestGuarding,
    [ sPathTestTwo ]: [
      "// @spec specs/a.md",
      bBacked ? fsLink( "s-bk0001", vsHash[ 0 ]) : "",
      "test( \"the proof\", () => {} );",
      ""
    ].join( "\n" )
  });
  const fvsNameFailing = ( sOut ) => fvsLineInSection( sOut, sTitleComplete )
    .map(( sLine ) => sLine.replace( /^.*proves nothing: /, "" ));

  test( "makes a file with linked tests fully linked, owned through the "
    + "guard, with no unlinked test and nothing in (30), PAIRED with the "
    + "guard unbacked, after which the file is not fully linked, its "
    + "guarded test is unlinked and owned by the owner line, and (30) names "
    + "each guard line", () => {
    fWrite( true, true );
    const aRun = faRun( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleRemovable ))
      .toContain( "test/one.test.js:1  // @spec specs/b.md" );
    expect( fvsLineInSection( aRun.sOut, sTitleUnlinked )).toEqual( [] );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 0 of 3$/m );
    expect( fvsLineInSection( aRun.sOut, sTitleUnbacked )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    const aRunA = faRun( [ sPathSpecA ]);
    expect( fvsNameFailing( aRunA.sOut )).toEqual( [] );
    expect( aRunA.cExit ).toBe( 0 );
    const aRunB = faRun( [ sPathSpecB ]);
    expect( fvsNameFailing( aRunB.sOut )).toEqual( [] );
    expect( aRunB.cExit ).toBe( 0 );
    fWrite( false, true );
    const aRunCut = faRun( [] );
    expect( fvsLineInSection( aRunCut.sOut, sTitleRemovable )).toEqual( [] );
    expect( fvsLineInSection( aRunCut.sOut, sTitleUnlinked )).toEqual(
      [ "test/one.test.js  1", "test/two.test.js  1" ]
    );
    expect( aRunCut.sOut ).toMatch( /^Unlinked tests: 2 of 3$/m );
    const vsUnbacked = [
      "test/one.test.js:3  linked and guarding  s-bk0001  specs/a.md",
      "test/one.test.js:5  guard block  s-bk0001  specs/a.md"
    ];
    expect( fvsLineInSection( aRunCut.sOut, sTitleUnbacked ))
      .toEqual( vsUnbacked );
    expect( aRunCut.cExit ).toBe( 0 );
    const aRunCutB = faRun( [ sPathSpecB ]);
    expect( fvsNameFailing( aRunCutB.sOut )).toEqual( [ "self-test" ]);
    expect( fvsLineInSection( aRunCutB.sOut, sTitleUnbacked )).toEqual( [] );
    expect( aRunCutB.cExit ).not.toBe( 0 );
    const aRunCutA = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunCutA.sOut, sTitleUnbacked ))
      .toEqual( vsUnbacked );
    expect( fvsNameFailing( aRunCutA.sOut )).toEqual( [ "the proof" ]);
  });

  test( "unbacked, never changes a path run's exit code", () => {
    fWrite( false, false );
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleUnbacked )).toHaveLength( 2 );
    expect( aRun.cExit ).toBe( 0 );
  });
});

// @proves s-aku8n2@4ffc4f1
describe( "spec-map-guard-scope-file — the path run's files", () => {
  test( "include a file holding a guard line naming the spec's statement, "
    + "PAIRED with the guard removed", () => {
    const sText = "Rule ak one.";
    const fWrite = ( sGuardLine ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-ak0001} " + sText ]),
      [ sPathTestOne ]: [
        "// @spec specs/gone.md",
        sGuardLine,
        "test( \"plain words\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( fsGuard( "s-ak0001", fsHash( sText )));
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleUnresolved )).toEqual(
      [ "test/one.test.js:1  // @spec specs/gone.md  (no such spec)" ]
    );
    expect( aRun.cExit ).not.toBe( 0 );
    fWrite( "" );
    const aRunCut = faRun( [ sPathSpecA ]);
    expect( aRunCut.sOut ).not.toMatch( /one\.test\.js/ );
    expect( aRunCut.cExit ).toBe( 0 );
  });
});

// @proves s-ctbylk@c20e0f1
// @proves s-yltboo@95a3db6
describe( "spec-map-guard-stale — a stale guard line", () => {
  test( "is named in (9) and (19) with the word guard, fails its "
    + "statement's spec, and still resolves and counts, PAIRED with the "
    + "hash corrected", () => {
    const vsText = [ "Rule st one.", "Rule st two." ];
    const vsHash = vsText.map( fsHash );
    const fWrite = ( sHashGuard ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [ "* {#s-st0001} " + vsText[ 0 ]]),
      [ sPathSpecB ]: fsSpecStmt( "B", [ "* {#s-st0002} " + vsText[ 1 ]]),
      [ sPathTestOne ]: [
        "// @spec specs/b.md",
        fsLink( "s-st0001", vsHash[ 0 ]),
        "test( \"proof\", () => {} );",
        fsLink( "s-st0002", vsHash[ 1 ]),
        fsGuard( "s-st0001", sHashGuard ),
        "test( \"stale guard\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( "0000000" );
    const aRun = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRun.sOut, sTitleStale )).toEqual([
      "test/one.test.js:5  stale guard  s-st0001 guard  recorded 0000000  "
      + "current " + vsHash[ 0 ]
    ]);
    expect( fvsLineInSection( aRun.sOut, sTitleLinkBad )).toEqual( [] );
    expect( fvsLineInSection( aRun.sOut, sTitleUnbacked )).toEqual( [] );
    expect( aRun.sOut ).toMatch( /^Unlinked tests: 0 of 2$/m );
    expect( aRun.cExit ).not.toBe( 0 );
    const aRunB = faRun( [ sPathSpecB ]);
    expect( fvsLineInSection( aRunB.sOut, sTitleStaleSibling )).toEqual([
      "test/one.test.js:5  stale guard  s-st0001 guard  specs/a.md  "
      + "recorded 0000000  current " + vsHash[ 0 ]
    ]);
    expect( aRunB.cExit ).toBe( 0 );
    fWrite( vsHash[ 0 ]);
    const aRunFixed = faRun( [ sPathSpecA ]);
    expect( fvsLineInSection( aRunFixed.sOut, sTitleStale )).toEqual( [] );
    expect( aRunFixed.cExit ).toBe( 0 );
  });
});

// @proves s-qr72mj@9691d37
// @proves s-nc5n19@aee9454
// @proves s-1yuomz@b828506
describe( "spec-map-guard-queries — the queries", () => {
  test( "--sid lists each guard line after the links with the word guard, "
    + "--candidates still ranks a guarding test, and --cross-suite counts "
    + "no guard, PAIRED with the web guard made a link, which is listed",
  () => {
    const vsText = [ "The `fooGuard` rule holds.", "Rule qy two." ];
    const vsHash = vsText.map( fsHash );
    const fWrite = ( sLineWeb ) => fWriteTree({
      [ sPathSpecA ]: fsSpecStmt( "A", [
        "* {#s-qy0001} " + vsText[ 0 ],
        "* {#s-qy0002} " + vsText[ 1 ]
      ]),
      [ sPathTestOne ]: [
        "// @spec specs/a.md",
        fsGuard( "s-qy0001", vsHash[ 0 ]),
        "test( \"fooGuard self-test\", () => {} );",
        fsLink( "s-qy0001", vsHash[ 0 ]),
        "test( \"fooGuard proof\", () => {} );",
        fsGuard( "s-qy0001", "0000000" ),
        "test( \"stale self-test\", () => {} );",
        fsLink( "s-qy0002", vsHash[ 1 ]),
        "test( \"root two\", () => {} );",
        ""
      ].join( "\n" ),
      [ sPathTestWeb ]: [
        "// @spec specs/a.md",
        sLineWeb,
        "test( \"web two\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWrite( fsGuard( "s-qy0002", vsHash[ 1 ]));
    const vsSid = faRun( [ "--sid", "s-qy0001" ]).sStdout.trim().split( "\n" );
    expect( vsSid ).toHaveLength( 4 );
    expect( vsSid[ 1 ]).toMatch( /^test\/one\.test\.js:4 +fooGuard proof/ );
    expect( vsSid[ 1 ]).not.toMatch( /guard$/ );
    expect( vsSid[ 2 ]).toBe(
      "test/one.test.js:2  fooGuard self-test  " + vsHash[ 0 ]
      + "  current  guard"
    );
    expect( vsSid[ 3 ]).toBe(
      "test/one.test.js:6  stale self-test  0000000  stale  guard"
    );
    const sCandidates = faRun( [ "--candidates", "s-qy0001" ]).sStdout;
    expect( sCandidates ).toMatch(
      /^test\/one\.test\.js:3  fooGuard self-test  score 1/m
    );
    expect( sCandidates ).not.toMatch( /fooGuard proof/ );
    expect( faRun( [ "--cross-suite" ]).sStdout ).toBe( "" );
    fWrite( fsLink( "s-qy0002", vsHash[ 1 ]));
    expect( faRun( [ "--cross-suite" ]).sStdout ).toMatch(
      /^specs\/a\.md:6  s-qy0002\n/
    );
  });
});

const asTextTir = {
  "s-tir001": "A held form makes one continuation.",
  "s-tir002": "A moved block makes none.",
  "s-tir003": "A grouped case holds.",
  "s-tir004": "A rule with two arms holds.",
  "s-tir005": "A rule with two arms holds. applied to the one."
};
const fsRefTir = ( sId ) => sId + "@" + fsHash( asTextTir[ sId ]);
const fsImplTir = ( sId ) => "// @implements " + fsRefTir( sId );
const fsSpecTir = ( bComplete ) => fsSpecStmt( "A", [
  "* {#s-tir001} " + asTextTir[ "s-tir001" ],
  "* {#s-tir002} " + asTextTir[ "s-tir002" ],
  "* {#s-tir003} " + asTextTir[ "s-tir003" ],
  "* {#s-tir004} " + asTextTir[ "s-tir004" ],
  "* {#s-tir005 surface=one} {s-tir004} applied to the one."
], bComplete );
const sTitleNoImplementation = "statements with no implementation link";
const sTitleNoTestedBy = "implementation files with no test link";
const sTitleCodeRefBad = "malformed, unresolved or stale code references";
const fvsIdNoImplementation = ( sOut ) => fvsLineInSection(
  sOut, sTitleNoImplementation
).map(( sLine ) => sLine.split( "  " )[ 1 ]);

describe( "test-implementation references", () => {
  // @proves s-fiabr2@b77174a
  // @proves s-obz7rg@010c79a
  // @proves s-ljxzt6@b06ab69
  // @proves s-0n3sm5@d016ebd
  // @proves s-nlzsly@d954de6
  // @proves s-9ho983@b227496
  test( "an @implements at a test that proves the statement counts in (31), "
    + "at a describe and for a derived statement, PAIRED with statements no "
    + "test implements", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( false ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        "",
        fsLink( "s-tir001", fsHash( asTextTir[ "s-tir001" ])),
        fsImplTir( "s-tir001" ),
        "test( \"one continuation\", () => {} );",
        "// @spec specs/a.md",
        fsImplTir( "s-tir003" ),
        "describe( \"grouped\", () => {",
        "  " + fsLink( "s-tir003", fsHash( asTextTir[ "s-tir003" ])),
        "  test( \"grouped case\", () => {} );",
        "} );",
        fsLink( "s-tir005", fsHash( asTextTir[ "s-tir005" ])),
        fsImplTir( "s-tir005" ),
        "test( \"one arm\", () => {} );",
        ""
      ].join( "\n" )
    });
    const sOut = faRun( [] ).sOut;
    expect( fvsIdNoImplementation( sOut )).toEqual([ "s-tir002" ]);
    expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual( [] );
    expect( fvsLineInSection( sOut, sTitleNoTestedBy )).toEqual( [] );
    expect( fvsLineInSection( sOut, "link lines that do not resolve" ))
      .toEqual( [] );
    expect( fvsLineInSection( sOut, sTitleUnresolved )).toEqual( [] );
    expect( fvsIdInSection( sOut, "statements no test proves" )).toEqual(
      [ "s-tir002" ]
    );
  });

  // @proves s-nlzsly@d954de6
  // @proves s-w4wun2@5ac8202
  // @proves s-dssqhc@404c3ff
  // @proves s-obz7rg@010c79a
  test( "a misplaced, malformed, unresolved, stale or unproved test "
    + "@implements is an entry of (33) naming the file, line, call and id, "
    + "and the spec's run fails on it", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( false ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        fsImplTir( "s-tir001" ),
        "",
        fsImplTir( "s-tir002" ),
        "test( \"proves nothing\", () => {} );",
        "// @implements s-tir001",
        "// @implements s-nosuch@0000000",
        "// @implements s-tir003@0000000",
        fsLink( "s-tir003", fsHash( asTextTir[ "s-tir003" ])),
        "test( \"grouped case\", () => {} );",
        ""
      ].join( "\n" )
    });
    const aRun = faRun( [] );
    expect( aRun.cExit ).toBe( 0 );
    expect( fvsLineInSection( aRun.sOut, sTitleCodeRefBad )).toEqual([
      "test/a.test.js:2  " + fsImplTir( "s-tir001" ) + " (misplaced)",
      "test/a.test.js:4  proves nothing  " + fsImplTir( "s-tir002" )
        + " (no test it covers proves the statement)",
      "test/a.test.js:6  grouped case  // @implements s-tir001 (malformed)",
      "test/a.test.js:7  grouped case  // @implements s-nosuch@0000000 "
        + "(no such statement)",
      "test/a.test.js:8  grouped case  // @implements s-tir003@0000000 "
        + "(stale hash)"
    ]);
    expect( fvsIdNoImplementation( aRun.sOut )).toEqual(
      [ "s-tir001", "s-tir002", "s-tir003", "s-tir005" ]
    );
    expect( faRun([ "specs/a.md" ]).cExit ).not.toBe( 0 );
    const aGate = faRun([ "--gate" ]);
    expect( aGate.cExit ).toBe( 1 );
    expect( aGate.sStdout ).toContain(
      "(33) test/a.test.js:8  grouped case  // @implements s-tir003@0000000"
    );
  });

  // @proves s-9wbr29@0f680c4
  test( "an @implements proves nothing: a test carrying only one is "
    + "unlinked and a complete spec's failure, PAIRED with its proving "
    + "neighbour", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( true ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        "",
        fsLink( "s-tir001", fsHash( asTextTir[ "s-tir001" ])),
        fsImplTir( "s-tir001" ),
        "test( \"one continuation\", () => {} );",
        fsImplTir( "s-tir002" ),
        "test( \"implements only\", () => {} );",
        ""
      ].join( "\n" )
    });
    const sOut = faRun( [] ).sOut;
    expect( sOut ).toMatch( /^Unlinked tests: 1 of 2$/m );
    expect( fvsLineInSection( sOut, sTitleRemovable )).toEqual( [] );
    expect( fvsIdInSection( sOut, "statements no test proves" ))
      .toContain( "s-tir002" );
    expect( fvsLineInSection( sOut, "completeness failures" )).toContain(
      "test/a.test.js:7  proves nothing: implements only"
    );
  });

  // @proves s-k3nucf@c0c7bf2
  test( "test-implementation references are read in a suite directory the "
    + "project does not declare for reading", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( false ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        "",
        fsLink( "s-tir001", fsHash( asTextTir[ "s-tir001" ])),
        fsImplTir( "s-tir001" ),
        "test( \"one continuation\", () => {} );",
        ""
      ].join( "\n" )
    });
    fWriteConcord( sDirFixture, { read_directories: [ "src" ]});
    const sOut = faRun( [] ).sOut;
    expect( fvsIdNoImplementation( sOut )).not.toContain( "s-tir001" );
    expect( fvsIdNoImplementation( sOut )).toContain( "s-tir002" );
  });

  // @proves s-sg7zoy@216a1b0
  // @proves s-sy7274@b9a1e14
  test( "a test file is never in (32), and a @tested-by or @checks in it is "
    + "a misplaced entry of (33)", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( false ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        "// @tested-by test/a.test.js",
        "",
        fsLink( "s-tir001", fsHash( asTextTir[ "s-tir001" ])),
        fsImplTir( "s-tir001" ),
        "test( \"one continuation\", () => {} );",
        "// @checks i-nosuch@0000000",
        ""
      ].join( "\n" ),
      "src/a.js": "// @tested-by test/a.test.js\nconst a = 1;\n"
    });
    const sOut = faRun( [] ).sOut;
    expect( fvsLineInSection( sOut, sTitleNoTestedBy )).toEqual(
      [ "src/a.js" ]
    );
    expect( fvsLineInSection( sOut, sTitleCodeRefBad )).toEqual([
      "src/a.js:1  // @tested-by test/a.test.js "
        + "(test proves no statement implemented here)",
      "test/a.test.js:2  // @tested-by test/a.test.js (misplaced)",
      "test/a.test.js:7  // @checks i-nosuch@0000000 (misplaced)"
    ]);
    expect( fvsIdNoImplementation( sOut )).not.toContain( "s-tir001" );
  });

  // @proves s-e6bz23@e35e7ac
  test( "--sid lists a test-implementation reference with its call, hash, "
    + "state and the word test", () => {
    fWriteTree({
      "specs/a.md": fsSpecTir( false ),
      "test/a.test.js": [
        "// @spec specs/a.md",
        "",
        fsLink( "s-tir001", fsHash( asTextTir[ "s-tir001" ])),
        fsImplTir( "s-tir001" ),
        "test( \"one continuation\", () => {} );",
        ""
      ].join( "\n" )
    });
    const vsSid = faRun( [ "--sid", "s-tir001" ]).sStdout.trim().split( "\n" );
    expect( vsSid ).toContain(
      "test/a.test.js:4  one continuation  "
      + fsHash( asTextTir[ "s-tir001" ]) + "  current  test"
    );
  });
});
