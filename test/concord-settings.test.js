"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );
const {
  sPathSpecMap,
  sPathSpecCoverage,
  aConfigFixture,
  aCoverageFixture,
  fsConcordJson
} = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join(
  sDirRepo, "tmp", "concord-settings-" + process.pid
);

const fsHash = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const fWriteTree = ( asBodyForPath ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fs.mkdirSync( sDirFixture, { recursive: true });
  Object.entries( asBodyForPath ).forEach(([ sPathRel, sBody ]) => (
    fWriteFile( sPathRel, sBody )
  ));
};

const fsRead = ( sPathRel ) => fs.readFileSync(
  path.join( sDirFixture, sPathRel ), "utf8"
);

const faRunCommand = ( sPathCommand, vsArg ) => {
  const aResult = spawnSync( sPathCommand, vsArg, {
    cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024
  });
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const faRun = ( vsArg ) => faRunCommand( sPathSpecMap, vsArg );

const sPathConcordHook = path.join( sDirRepo, "bin", "concord-hook" );
const sPathAgentsSync = path.join( sDirRepo, "bin", "agents-sync" );

const faRunNode = ( sPathCommand, vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathCommand ].concat( vsArg ),
    {
      cwd: sDirFixture,
      encoding: "utf8",
      env: {
        ...process.env,
        CONCORD_GIT: path.join( sDirFixture, "no-git-here" ),
        HOME: path.join( sDirFixture, "home" )
      }
    }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fsSpec = ( sTitle, vsBody ) => (
  [ "# " + sTitle, "", "## API", "" ].concat( vsBody, [ "" ]).join( "\n" )
);

const vsTreeFile = () => fs.readdirSync( sDirFixture, { recursive: true })
  .map(( sPath ) => path.join( sDirFixture, sPath ))
  .filter(( sPath ) => fs.statSync( sPath ).isFile())
  .sort()
  .map(( sPath ) => sPath + "\n" + fs.readFileSync( sPath, "utf8" ));

const sTextGuide = "Write it this way.";
const sSpecGuide = fsSpec( "G", [
  "* {#g-cfg001 for=fixer} " + sTextGuide
]);
const sFollows = "// @follows g-cfg001@" + fsHash( sTextGuide ) + "\n";

const fvsCiter = () => faRun([ "--guidance" ]).sStdout.split( "\n" )
  .filter(( sLine ) => sLine.startsWith( "    " ))
  .map(( sLine ) => sLine.trim().split( ":" )[ 0 ]);

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

// @proves s-2fs4an@26c553f
// @proves s-jhtp93@4c4ca3c
describe( "concord-settings — a command run with no settings file", () => {
  test( "spec-map and spec-coverage each print one stderr line naming "
    + "concord.json and exit 2", () => {
    fWriteTree({ "specs/a.md": fsSpec( "A", [ "* {#s-cfg001} A rule." ]) });
    [ sPathSpecMap, sPathSpecCoverage ].forEach(( sPathCommand ) => {
      const aRun = faRunCommand( sPathCommand, [ "--report" ]);
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStdout ).toBe( "" );
      expect( aRun.sStderr.split( "\n" ).filter( Boolean )).toHaveLength( 1 );
      expect( aRun.sStderr ).toContain( "concord.json" );
    });
  });

  test( "PAIRED: concord-hook, which acts on a project, does the same in a "
    + "work tree's root; agents-sync, which acts on none, runs", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [ "* {#s-cfg001} A rule." ]),
      ".git/HEAD": "",
      "roles/r.md": "# R\n",
      "roles/r.claude-frontmatter": "---\n---\n",
      "agents/keep": ""
    });
    [[ "install" ], [ "check" ]].forEach(( vsArg ) => {
      const aRun = faRunNode( sPathConcordHook, vsArg );
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStdout ).toBe( "" );
      expect( aRun.sStderr.split( "\n" ).filter( Boolean )).toHaveLength( 1 );
      expect( aRun.sStderr ).toContain( "concord.json" );
    });
    const aRunSync = faRunNode(
      sPathAgentsSync, [ "--roles", "roles", "--dir", "agents" ]
    );
    expect( aRunSync.cExit ).toBe( 0 );
    expect( fsRead( "agents/r.md" )).toBe( "---\n---\n# R\n" );
  });
});

const vtBad = [
  [ "not JSON", "{ \"sName\": ", "is not one JSON object" ],
  [ "an array", "[]", "is not one JSON object" ],
  [ "no name", fsConcordJson({ sName: undefined }), "sName is missing" ],
  [ "an empty name", fsConcordJson({ sName: "" }), "sName" ],
  [ "an unknown member", fsConcordJson({ xOther: 1 }), "xOther" ],
  [ "no suites", fsConcordJson({ vaSuite: []}), "vaSuite" ],
  [
    "a suite with no directory",
    fsConcordJson({ vaSuite: [{ sName: "a", vsDir: []}]}),
    "vaSuite[0].vsDir"
  ],
  [
    "a suite named twice",
    fsConcordJson({ vaSuite: [
      { sName: "a", vsDir: [ "t1" ]}, { sName: "a", vsDir: [ "t2" ]}
    ]}),
    "vaSuite"
  ],
  [ "an unknown language", fsConcordJson({ vsLanguage: [ "cobol" ]}),
    "vsLanguage" ],
  [ "a read list of another form", fsConcordJson({ vsDirRead: "src" }),
    "vsDirRead" ],
  [ "an ignored list of another form", fsConcordJson({ vsDirIgnored: [ 1 ]}),
    "vsDirIgnored" ],
  [ "a record path of another form", fsConcordJson({ sPathRecord: 3 }),
    "sPathRecord" ],
  [
    "a coverage with no runs",
    fsConcordJson({ aCoverage: { ...aCoverageFixture, vaRun: []}}),
    "aCoverage.vaRun"
  ],
  [
    "a coverage missing its review path",
    fsConcordJson({
      aCoverage: { ...aCoverageFixture, sPathReview: undefined }
    }),
    "aCoverage.sPathReview"
  ]
];

// @proves s-w8ivpb@ffb0e3a
// @proves s-zstgty@57da9d2
// @proves s-am7qu4@f0bbacd
// @proves s-i0n88z@442670e
// @proves s-j38rej@fd07b13
// @proves s-sx6vdb@2b2e720
// @proves s-wu6tv6@3c7912b
// @proves s-xqx0r5@13898cb
describe( "concord-settings — a bad settings file", () => {
  test.each( vtBad )( "%s makes every command print one line naming the "
    + "file and the member, exit 2 and act on nothing", (
    sWhat, sText, sMember
  ) => {
    fWriteTree({
      "concord.json": sText,
      "specs/a.md": fsSpec( "A", [ "* {#s-?} A placeholder rule." ]),
      ".git/HEAD": ""
    });
    const vsBefore = vsTreeFile();
    [
      faRun([ "--assign" ]),
      faRunCommand( sPathSpecCoverage, [ "--report" ]),
      faRunNode( sPathConcordHook, [ "install" ])
    ].forEach(( aRun ) => {
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStdout ).toBe( "" );
      const vsLine = aRun.sStderr.split( "\n" ).filter( Boolean );
      expect( vsLine ).toHaveLength( 1 );
      expect( vsLine[ 0 ]).toContain( "concord.json" );
      expect( vsLine[ 0 ]).toContain( sMember );
    });
    expect( vsTreeFile()).toEqual( vsBefore );
  });

  test( "PAIRED: the same tree with a well-formed file assigns its "
    + "placeholder", () => {
    fWriteTree({
      "concord.json": fsConcordJson(),
      "specs/a.md": fsSpec( "A", [ "* {#s-?} A placeholder rule." ])
    });
    expect( faRun([ "--assign" ]).cExit ).toBe( 0 );
    expect( fsRead( "specs/a.md" )).toMatch( /\{#s-[a-z0-9]{6}\} A/ );
  });
});

// @proves s-4j8qm7@1fe7250
test( "concord-settings — spec-coverage in a project declaring no coverage "
  + "prints one stderr line saying so and exits 2", () => {
  fWriteTree({ "concord.json": fsConcordJson() });
  [[], [ "--report" ], [ "--file", "src/a.js" ]].forEach(( vsArg ) => {
    const aRun = faRunCommand( sPathSpecCoverage, vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toBe(
      "spec-coverage: concord.json declares no coverage\n"
    );
  });
  expect( fs.existsSync( path.join( sDirFixture, "tmp" ))).toBe( false );
});

// @proves s-zupjie@8e06977
// @proves s-nrp172@a8afa18
describe( "concord-settings — where guidance references are read", () => {
  test( "under every directory a `*` segment names, in files of a declared "
    + "language, outside the ignored directories, and nowhere else", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        vsLanguage: [ "javascript" ],
        vsDirRead: [ "lib/*", "tools" ],
        vsDirIgnored: [ "vendor" ]
      }),
      "specs/g.md": sSpecGuide,
      "lib/one/a.js": sFollows,
      "lib/two/deep/b.mjs": sFollows,
      "lib/top.js": sFollows,
      "lib/one/c.css": "/* @follows g-cfg001@" + fsHash( sTextGuide )
        + " */\n",
      "lib/one/vendor/d.js": sFollows,
      "tools/e.cjs": sFollows,
      "src/f.js": sFollows
    });
    expect( fvsCiter()).toEqual([
      "lib/one/a.js", "lib/two/deep/b.mjs", "tools/e.cjs"
    ]);
  });

  test( "PAIRED: declaring css reads the css file too", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        vsLanguage: [ "javascript", "css" ],
        vsDirRead: [ "lib/*" ]
      }),
      "specs/g.md": sSpecGuide,
      "lib/one/a.js": sFollows,
      "lib/one/c.css": "/* @follows g-cfg001@" + fsHash( sTextGuide )
        + " */\n"
    });
    expect( fvsCiter()).toEqual([ "lib/one/a.js", "lib/one/c.css" ]);
  });
});

const sTextRule = "A rule both suites check.";
const sSpecRule = fsSpec( "A", [ "* {#s-cfg002} " + sTextRule ]);
const fsTestLinked = () => [
  "// @proves s-cfg002@" + fsHash( sTextRule ),
  "test( \"checks the rule\", () => {} );",
  ""
].join( "\n" );

// @proves s-3oxidy@1ccac2e
describe( "concord-settings — test files lie under the declared suites",
() => {
  test( "a .test.js file under a declared suite's directory is a test file, "
    + "one elsewhere is not, and --cross-suite counts the declared suites",
  () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        vaSuite: [
          { sName: "unit", vsDir: [ "checks/unit" ]},
          { sName: "flow", vsDir: [ "checks/flow", "more/flow" ]}
        ]
      }),
      "specs/a.md": sSpecRule,
      "checks/unit/u.test.js": fsTestLinked(),
      "more/flow/f.test.js": fsTestLinked(),
      "test/t.test.js": fsTestLinked()
    });
    expect( faRun([ "--sid", "s-cfg002" ]).sStdout ).toBe([
      "specs/a.md:5  s-cfg002  " + sTextRule,
      "checks/unit/u.test.js:1  checks the rule  "
        + fsHash( sTextRule ) + "  whole  current",
      "more/flow/f.test.js:1  checks the rule  "
        + fsHash( sTextRule ) + "  whole  current",
      ""
    ].join( "\n" ));
    expect( faRun([ "--cross-suite" ]).sStdout ).toBe([
      "specs/a.md:5  s-cfg002",
      "  checks/unit/u.test.js:1",
      "  more/flow/f.test.js:1",
      ""
    ].join( "\n" ));
  });

  test( "PAIRED: two test files in one declared suite are not "
    + "cross-suite", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        vaSuite: [{ sName: "unit", vsDir: [ "checks/unit", "more/flow" ]}]
      }),
      "specs/a.md": sSpecRule,
      "checks/unit/u.test.js": fsTestLinked(),
      "more/flow/f.test.js": fsTestLinked()
    });
    expect( faRun([ "--cross-suite" ]).sStdout ).toBe( "" );
  });
});

const sSpecCheck = fsSpec( "C", [
  "* {#i-cfg003 >src/x.js} **Do:** open it. **Look for:** a box."
]);

// @proves s-iz8176@bb80e0d
// @proves s-4jegoj@05acd9f
describe( "concord-settings — the record file and the page title", () => {
  test( "a verdict is recorded in the declared record file and the worklist "
    + "page is titled with the declared name", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        sName: "Seed & Co",
        sPathRecord: "checks/verdicts.jsonl"
      }),
      "specs/c.md": sSpecCheck,
      "src/x.js": "module.exports = 1;\n"
    });
    expect( faRun([ "--pass", "i-cfg003" ]).cExit ).toBe( 0 );
    const vaRecord = fsRead( "checks/verdicts.jsonl" ).split( "\n" )
      .filter( Boolean ).map(( sLine ) => JSON.parse( sLine ));
    expect( vaRecord.map(( aRecord ) => [ aRecord.sId, aRecord.sVerdict ]))
      .toEqual([[ "i-cfg003", "pass" ]]);
    expect( fs.existsSync(
      path.join( sDirFixture, "test", "interactive-passes.jsonl" )
    )).toBe( false );
    expect( faRun([ "--worklist", "out/page.html" ]).cExit ).toBe( 0 );
    const sPage = fsRead( "out/page.html" );
    expect( sPage ).toContain( "<title>Seed &amp; Co hand checks</title>" );
    expect( sPage ).toContain( "<h1>Seed &amp; Co hand checks</h1>" );
    expect( sPage ).not.toContain( "__NAME__" );
  });
});

const sSpecHashes = [
  "# H",
  "",
  "## API",
  "",
  "* {#s-hsh001} First rule.",
  "* {#g-hsh002 for=fixer} A guide.",
  "* {#s-?} A placeholder.",
  "* {#s-hsh003} A duplicate.",
  "* {#s-hsh003} A duplicate again.",
  ""
].join( "\n" );

// @proves s-kyro7r@3064fa5
// @proves s-95ao2f@9b59968
describe( "concord-settings — the hash table", () => {
  test( "--hashes prints each singly-marked id of every type with the hash "
    + "--hash prints and its spec, by spec and line, writing nothing", () => {
    fWriteTree({
      "concord.json": fsConcordJson(),
      "specs/b.md": fsSpec( "B", [ "* {#m-hsh004} RULING (CEO): \"so\"" ]),
      "specs/a/h.md": sSpecHashes
    });
    const vsBefore = vsTreeFile();
    const aRun = faRun([ "--hashes" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStderr ).toBe( "" );
    const vsId = [ "s-hsh001", "g-hsh002", "m-hsh004" ];
    const vsHash = vsId.map(( sId ) => (
      faRun([ "--hash", sId ]).sStdout.trim()
    ));
    expect( aRun.sStdout ).toBe([
      "s-hsh001 " + vsHash[ 0 ] + " specs/a/h.md",
      "g-hsh002 " + vsHash[ 1 ] + " specs/a/h.md",
      "m-hsh004 " + vsHash[ 2 ] + " specs/b.md",
      ""
    ].join( "\n" ));
    expect( vsTreeFile()).toEqual( vsBefore );
  });

  test( "PAIRED: given a spec path beside it, it prints its usage line "
    + "and exits 2", () => {
    fWriteTree({
      "concord.json": fsConcordJson(), "specs/a/h.md": sSpecHashes
    });
    const aRun = faRun([ "--hashes", "specs/a/h.md" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toMatch( /^usage: / );
  });
});

// @proves s-92u5vq@475d2f0
// @proves s-4jegoj@05acd9f
describe( "concord-settings — a command acts on its working directory",
() => {
  test( "run by its path from a project root, it reads that project and "
    + "prints its paths relative to the root", () => {
    fWriteTree({
      "concord.json": fsConcordJson(),
      "specs/deep/a.md": sSpecRule,
      "test/t.test.js": fsTestLinked()
    });
    expect( faRun([ "--sid", "s-cfg002" ]).sStdout.split( "\n" )[ 0 ])
      .toBe( "specs/deep/a.md:5  s-cfg002  " + sTextRule );
  });
});

const sPathConcord = path.join( sDirRepo, "concord.json" );

// @proves s-230c67@63b134b
test( "concord-settings — Concord's own settings file declares Concord's "
  + "suite, language, directories, record file and coverage", () => {
  expect( JSON.parse( fs.readFileSync( sPathConcord, "utf8" ))).toEqual({
    sName: "Concord",
    vaSuite: [{ sName: "root", vsDir: [ "test" ]}],
    vsLanguage: [ "javascript" ],
    vsDirRead: [ "bin", "scripts", "test" ],
    vsDirIgnored: [ "node_modules" ],
    sPathRecord: "test/interactive-passes.jsonl",
    aCoverage: {
      vaRun: [{ sName: "root", sDirRun: "." }],
      vsCommandBefore: [],
      vsDirSource: [ "bin", "scripts" ],
      sPathReview: "spec-coverage-review.md"
    }
  });
});

const sDirBin = path.join( sDirRepo, "bin" );

// @proves s-c744tt@59ec83a
// @proves s-y7klju@f24bf51
test( "concord-settings — each command under bin is an executable file "
  + "with no extension opening with the node shebang", () => {
  const vsName = fs.readdirSync( sDirBin ).sort();
  expect( vsName ).toEqual([
    "agents-sync", "concord-hook", "spec-coverage", "spec-map"
  ]);
  vsName.forEach(( sName ) => {
    const sPath = path.join( sDirBin, sName );
    expect( fs.statSync( sPath ).mode & 0o111 ).not.toBe( 0 );
    expect( fs.readFileSync( sPath, "utf8" ).split( "\n" )[ 0 ])
      .toBe( "#!/usr/bin/env node" );
  });
});

const fsRepoText = ( sPathRel ) => fs.readFileSync(
  path.join( sDirRepo, sPathRel ), "utf8"
);

// @proves s-jblvc6@c2bd5a2
test( "concord-settings — Concord's root AGENTS.md names the Concord specs "
  + "under ~/@concord/specs and the role texts under ~/@concord/roles", () => {
  const sAgents = fsRepoText( "AGENTS.md" );
  [
    "~/@concord/specs/concord-process.md",
    "~/@concord/specs/spec-map.md",
    "~/@concord/specs/spec-map-interactive.md",
    "~/@concord/specs/spec-coverage.md",
    "~/@concord/roles/architect.md",
    "~/@concord/roles/fixer.md"
  ].forEach(( sPath ) => expect( sAgents ).toContain( sPath ));
});

// @proves s-jhoxdv@6b3c84f
test( "concord-settings — Concord's root AGENTS.md names, with their paths, "
  + "the tool files that must run agents-sync at session start", () => {
  const vsParagraph = fsRepoText( "AGENTS.md" ).split( /\n\s*\n/ );
  const vsSync = vsParagraph.filter(( s ) => (
    s.includes( "~/@concord/bin/agents-sync" ) && /start/.test( s )
  ));
  expect( vsSync.length ).toBeGreaterThan( 0 );
  [ "~/.claude/CLAUDE.md", "~/.codex/AGENTS.md" ].forEach(( sPath ) => (
    expect( vsSync.some(( s ) => s.includes( sPath ))).toBe( true )
  ));
});

// @proves s-3jwl32@7c1cd67
test( "concord-settings — each role, architect and fixer among them, has its "
  + "text and its Claude Code frontmatter side by side under roles/", () => {
  const vsName = fs.readdirSync( path.join( sDirRepo, "roles" )).sort();
  const vsRole = Array.from( new Set(
    vsName.map(( sName ) => sName.split( "." )[ 0 ])
  ));
  expect( vsRole ).toEqual( expect.arrayContaining([ "architect", "fixer" ]));
  expect( vsName ).toEqual( vsRole.flatMap(( sRole ) => [
    sRole + ".claude-frontmatter", sRole + ".md"
  ]).sort());
});

// @proves s-s4l32i@b41f304
test( "concord-settings — Concord's own commits are gated by its committed "
  + "pre-commit hook, which runs the gate", () => {
  const sPathHook = path.join( sDirRepo, ".githooks", "pre-commit" );
  expect( fs.statSync( sPathHook ).mode & 0o777 ).toBe( 0o755 );
  expect( fs.readFileSync( sPathHook, "utf8" )).toBe(
    "#!/bin/sh\n\"$HOME/@concord/bin/spec-map\" --gate || exit 1\n"
  );
});

const reRequire = /require\(\s*"([^".][^"]*)"\s*\)/g;
const asBuiltin = new Set( require( "module" ).builtinModules );

const fsPackageForRequest = ( sRequest ) => {
  const vsPart = sRequest.split( "/" );
  return sRequest.startsWith( "@" )
    ? vsPart.slice( 0, 2 ).join( "/" )
    : vsPart[ 0 ];
};

// @proves s-zrgt7e@a066ef0
test( "concord-settings — every npm module a command file loads is one "
  + "of Concord's own dependencies", () => {
  const aPackage = JSON.parse( fs.readFileSync(
    path.join( sDirRepo, "package.json" ), "utf8"
  ));
  const vsPackage = [ "bin", "scripts" ]
    .flatMap(( sDir ) => fs.readdirSync( path.join( sDirRepo, sDir ))
      .map(( sName ) => path.join( sDirRepo, sDir, sName )))
    .flatMap(( sPath ) => Array.from(
      fs.readFileSync( sPath, "utf8" ).matchAll( reRequire ),
      ( vs ) => vs[ 1 ]
    ))
    .filter(( sRequest ) => !asBuiltin.has( sRequest.replace( /^node:/, "" )))
    .map( fsPackageForRequest );
  expect( vsPackage.length ).toBeGreaterThan( 0 );
  vsPackage.forEach(( sPackage ) => (
    expect( Object.keys( aPackage.dependencies )).toContain( sPackage )
  ));
});
