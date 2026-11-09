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

const aConfigReadable = {
  name: "Fixture",
  suites: [ { name: "root", directories: [ "test" ]} ],
  languages: [ "javascript", "css" ],
  read_directories: [ "src", "scripts", "test" ],
  ignored_directories: [ "node_modules" ],
  record_file: "test/interactive-passes.jsonl",
  observations_file: "observations.md",
  rules_files: [ "AGENTS.md" ],
  coverage: {
    runs: [ { name: "root", directory: "."} ],
    commands_before: [],
    source_directories: [ "src", "scripts" ],
    review_file: "spec-coverage-review.md"
  }
};

const fsReadableConcordJson = ( aOverride = {}) => JSON.stringify(
  { ...aConfigReadable, ...aOverride }, null, 2
) + "\n";

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

const faRun = ( vsArg ) => faRunCommand(
  sPathSpecMap, [ "--cache-checksum" ].concat( vsArg )
);

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
  .filter(( sPath ) => {
    const sPathRel = path.relative( sDirFixture, sPath );
    return !sPathRel.startsWith( path.join( "tmp", "spec-map", "cache" )
        + path.sep )
      && !sPathRel.startsWith( path.join( ".git", "spec-map", "cache" )
        + path.sep );
  })
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
// @proves s-pa182t@8008053
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

  // @proves s-ab1xqm@af290be
  test( "PAIRED: concord-hook, which acts on a project, does the same in a "
    + "work tree's root; agents-sync, which acts on none, runs", () => {
    fWriteTree({
      "specs/a.md": fsSpec( "A", [ "* {#s-cfg001} A rule." ]),
      ".git/HEAD": "",
      "roles/r.md": "# R\n",
      "roles/r.claude-frontmatter": "---\n---\n",
      "roles/r.codex-frontmatter": 'name = "r"\ndescription = "role"\n',
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
    expect( fsRead( "agents/r.toml" )).toBe(
      'name = "r"\ndescription = "role"\n'
        + 'developer_instructions = "# R\\n"\n'
    );
  });
});

// @proves s-am7qu4@d7b2d60
// @proves s-i0n88z@8f1c352
// @proves s-j38rej@b1a5c57
// @proves s-sx6vdb@f89dcd2
// @proves s-wu6tv6@dae6381
// @proves s-xqx0r5@8596529
test( "a project accepts the human-readable concord.json keys", () => {
  fWriteTree({
    "concord.json": fsReadableConcordJson(),
    "specs/a.md": fsSpec( "A", [ "* {#s-cfg001} A rule." ])
  });
  const aRun = faRun([ "--assign" ]);
  expect( aRun.cExit ).toBe( 0 );
  expect( aRun.sStderr ).toBe( "" );
});

// @proves s-tps44b@015cdec
// @proves s-ulp42m@25ec2c6
test( "each legacy concord.json key warns with its canonical key and spec link", () => {
  fWriteTree({
    "concord.json": JSON.stringify({
      sName: "Fixture",
      dirs_specs: [ "specs" ],
      vaSuite: [ { sName: "root", vsDir: [ "test" ]} ],
      vsLanguage: [ "javascript", "css" ],
      vsDirRead: [ "src", "scripts", "test" ],
      vsDirIgnored: [ "node_modules" ],
      sPathRecord: "test/interactive-passes.jsonl",
      sPathObservations: "observations.md",
      vsPathRules: [ "AGENTS.md" ],
      aCoverage: {
        vaRun: [ { sName: "root", sDirRun: "."} ],
        vsCommandBefore: [],
        vsDirSource: [ "src" ],
        sPathReview: "review.md"
      }
    }, null, 2 ) + "\n",
    "specs/a.md": fsSpec( "A", [ "* {#s-cfg002} A rule." ])
  });
  const aRun = faRun([ "--assign" ]);
  const vsWarning = aRun.sStderr.split( "\n" ).filter(( sLine ) => (
    sLine.includes( " is deprecated; use " )
  ));
  expect( aRun.cExit ).toBe( 0 );
  expect( vsWarning ).toHaveLength( 18 );
  expect( aRun.sStderr ).toContain(
    "dirs_specs is deprecated; use spec_directories "
      + "(see specs/concord-process.md#the-settings-file)"
  );
  expect( aRun.sStderr ).toContain(
    "sName is deprecated; use name (see specs/concord-process.md#the-settings-file)"
  );
  expect( aRun.sStderr ).toContain(
    "vaSuite[0].vsDir is deprecated; use suites[0].directories"
  );
  expect( aRun.sStderr ).toContain(
    "aCoverage.vaRun[0].sDirRun is deprecated; use coverage.runs[0].directory"
  );
});

const vaKeyAliasConflict = [
  [ "name", "sName", ( a ) => ( a.sName = a.name, a ) ],
  [ "spec_directories", "dirs_specs", ( a ) => (
    a.spec_directories = [ "specs" ], a.dirs_specs = a.spec_directories, a
  ) ],
  [ "suites", "vaSuite", ( a ) => ( a.vaSuite = a.suites, a ) ],
  [ "languages", "vsLanguage", ( a ) => (
    a.vsLanguage = a.languages, a
  ) ],
  [ "read_directories", "vsDirRead", ( a ) => (
    a.vsDirRead = a.read_directories, a
  ) ],
  [ "ignored_directories", "vsDirIgnored", ( a ) => (
    a.vsDirIgnored = a.ignored_directories, a
  ) ],
  [ "record_file", "sPathRecord", ( a ) => (
    a.sPathRecord = a.record_file, a
  ) ],
  [ "observations_file", "sPathObservations", ( a ) => (
    a.sPathObservations = a.observations_file, a
  ) ],
  [ "rules_files", "vsPathRules", ( a ) => (
    a.vsPathRules = a.rules_files, a
  ) ],
  [ "suites[0].name", "suites[0].sName", ( a ) => (
    a.suites[ 0 ].sName = a.suites[ 0 ].name, a
  ) ],
  [ "suites[0].directories", "suites[0].vsDir", ( a ) => (
    a.suites[ 0 ].vsDir = a.suites[ 0 ].directories, a
  ) ],
  [ "coverage", "aCoverage", ( a ) => ( a.aCoverage = a.coverage, a ) ],
  [ "coverage.runs", "coverage.vaRun", ( a ) => (
    a.coverage.vaRun = a.coverage.runs, a
  ) ],
  [ "coverage.runs[0].name", "coverage.runs[0].sName", ( a ) => (
    a.coverage.runs[ 0 ].sName = a.coverage.runs[ 0 ].name, a
  ) ],
  [ "coverage.runs[0].directory", "coverage.runs[0].sDirRun", ( a ) => (
    a.coverage.runs[ 0 ].sDirRun = a.coverage.runs[ 0 ].directory, a
  ) ],
  [ "coverage.commands_before", "coverage.vsCommandBefore", ( a ) => (
    a.coverage.vsCommandBefore = a.coverage.commands_before, a
  ) ],
  [ "coverage.source_directories", "coverage.vsDirSource", ( a ) => (
    a.coverage.vsDirSource = a.coverage.source_directories, a
  ) ],
  [ "coverage.review_file", "coverage.sPathReview", ( a ) => (
    a.coverage.sPathReview = a.coverage.review_file, a
  ) ]
];

// @proves s-np5ty8@bb18bff
test.each( vaKeyAliasConflict )(
  "%s conflicts with its legacy alias %s even when the values match",
  ( sCanonical, sLegacy, fAddAlias ) => {
    const aConfig = fAddAlias( structuredClone( aConfigReadable ));
    fWriteTree({
      "concord.json": JSON.stringify( aConfig, null, 2 ) + "\n",
      "specs/a.md": fsSpec( "A", [ "* {#s-cfg003} A rule." ])
    });
    const vsBefore = vsTreeFile();
    const aRun = faRun([ "--assign" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toContain(
      "concord.json: " + sCanonical + " conflicts with legacy key " + sLegacy
    );
    expect( vsTreeFile()).toEqual( vsBefore );
  }
);

const vtBad = [
  [ "not JSON", "{ \"name\": ", "is not one JSON object" ],
  [ "an array", "[]", "is not one JSON object" ],
  [ "no name", fsConcordJson({ name: undefined }), "name is missing" ],
  [ "an empty name", fsConcordJson({ name: "" }), "name" ],
  [ "an unknown member", fsConcordJson({ xOther: 1 }), "xOther" ],
  [ "a spec directory with a parent segment",
    fsConcordJson({ spec_directories: [ "../spec" ] }), "spec_directories" ],
  [ "a spec directory with a wildcard",
    fsConcordJson({ spec_directories: [ "packages/p*" ] }),
    "spec_directories" ],
  [ "a Windows absolute spec directory",
    fsConcordJson({ spec_directories: [ "C:\\spec" ] }), "spec_directories" ],
  [ "an empty spec directory list",
    fsConcordJson({ spec_directories: [] }), "spec_directories" ],
  [ "a non-array spec directory list",
    fsConcordJson({ spec_directories: "specs" }), "spec_directories" ],
  [ "a declared spec directory naming no existing directory",
    fsConcordJson({ spec_directories: [ "nowhere" ] }), "spec_directories" ],
  [ "no suites", fsConcordJson({ suites: []}), "suites" ],
  [
    "a suite with no directory",
    fsConcordJson({ suites: [{ name: "a", directories: []}]}),
    "suites[0].directories"
  ],
  [
    "a suite named twice",
    fsConcordJson({ suites: [
      { name: "a", directories: [ "t1" ]},
      { name: "a", directories: [ "t2" ]}
    ]}),
    "suites"
  ],
  [ "an unknown language", fsConcordJson({ languages: [ "cobol" ]}),
    "languages" ],
  [ "a read list of another form", fsConcordJson({ read_directories: "src" }),
    "read_directories" ],
  [ "an ignored list of another form",
    fsConcordJson({ ignored_directories: [ 1 ]}), "ignored_directories" ],
  [ "a record path of another form", fsConcordJson({ record_file: 3 }),
    "record_file" ],
  [
    "a coverage with no runs",
    fsConcordJson({ coverage: { ...aCoverageFixture, runs: []}}),
    "coverage.runs"
  ],
  [
    "a coverage missing its review path",
    fsConcordJson({
      coverage: { ...aCoverageFixture, review_file: undefined }
    }),
    "coverage.review_file"
  ]
];

// @proves s-liocgl@6c02b38
test( "a project can set its spec directories in concord.json", () => {
  const sText = "A child project's rule.";
  fWriteTree({
    "concord.json": fsConcordJson({ spec_directories: [ "spec" ] }),
    "spec/a.md": fsSpec( "A", [ "* {#s-cfgs01} " + sText ]),
    "test/a.test.js": [
      "// @spec spec/a.md",
      "// @proves s-cfgs01@" + fsHash( sText ),
      "test( \"proves the child rule\", () => {} );",
      ""
    ].join( "\n" )
  });
  const aRun = faRun([ "--sid", "s-cfgs01" ]);
  expect( aRun.sStderr ).toBe( "" );
  expect( aRun.cExit ).toBe( 0 );
  expect( aRun.sStdout ).toContain( "spec/a.md:5  s-cfgs01" );
});

// @proves s-liocgl@6c02b38
// @proves s-dhs2hx@db209fb
test( "a project reads specs from each configured directory pattern", () => {
  const sCore = "A core rule.";
  const sPackage = "A package rule.";
  fWriteTree({
    "concord.json": fsConcordJson({ spec_directories: [
      "specs/*", "packages/*/specs"
    ]}),
    "specs/core/core.md": fsSpec( "Core", [
      "* {#s-cfgs02} " + sCore,
      "* {#p-cfgs04 >packages/alpha/specs/alpha.md} Package spec."
    ]),
    "packages/alpha/specs/alpha.md": fsSpec( "Alpha", [
      "* {#s-cfgs03} " + sPackage
    ]),
    "test/core.test.js": [
      "// @spec specs/core/core.md",
      "// @proves s-cfgs02@" + fsHash( sCore ),
      "test( \"proves core rule\", () => {} );", ""
    ].join( "\n" ),
    "test/package.test.js": [
      "// @spec packages/alpha/specs/alpha.md",
      "// @proves s-cfgs03@" + fsHash( sPackage ),
      "test( \"proves package rule\", () => {} );", ""
    ].join( "\n" )
  });
  const aCore = faRun([ "--sid", "s-cfgs02" ]);
  const aPackage = faRun([ "--sid", "s-cfgs03" ]);
  expect( aCore.cExit ).toBe( 0 );
  expect( aCore.sStdout ).toContain( "specs/core/core.md" );
  expect( aPackage.cExit ).toBe( 0 );
  expect( aPackage.sStdout ).toContain( "packages/alpha/specs/alpha.md" );
  const aPointer = faRun([ "--sid", "p-cfgs04" ]);
  expect( aPointer.cExit ).toBe( 0 );
  expect( aPointer.sStdout ).toContain( "packages/alpha/specs/alpha.md  resolves" );
});

// @proves s-liocgl@6c02b38
test( "a spec directory pattern may have no matches yet", () => {
  fWriteTree({
    "concord.json": fsConcordJson({
      spec_directories: [ "packages/*/specs" ]
    })
  });
  expect( faRun([ "--assign" ]).cExit ).toBe( 0 );
});

// @proves s-liocgl@6c02b38
test( "the legacy dirs_specs key is accepted as spec_directories", () => {
  const sText = "A legacy rule.";
  fWriteTree({
    "concord.json": fsConcordJson({ dirs_specs: [ "spec" ] }),
    "spec/a.md": fsSpec( "A", [ "* {#s-cfgs05} " + sText ])
  });
  const aRun = faRun([ "--sid", "s-cfgs05" ]);
  expect( aRun.cExit ).toBe( 0 );
  expect( aRun.sStdout ).toContain( "spec/a.md:5  s-cfgs05" );
  expect( aRun.sStderr ).toBe(
    "concord.json: dirs_specs is deprecated; use spec_directories "
      + "(see specs/concord-process.md#the-settings-file)\n"
  );
});

// @proves s-tps44b@015cdec
test( "a bad legacy dirs_specs value is reported under its canonical name",
() => {
  fWriteTree({
    "concord.json": fsConcordJson({ dirs_specs: "specs" }),
    "specs/a.md": fsSpec( "A", [ "* {#s-cfgs07} A rule." ])
  });
  const aRun = faRun([ "--assign" ]);
  expect( aRun.cExit ).toBe( 2 );
  expect( aRun.sStderr ).toContain(
    "concord.json: spec_directories is not a non-empty array"
  );
});

// @proves s-6rfqdf@00eba76
describe( "concord-settings — the default spec directory may be missing", () => {
  test( "a project with no spec_directories and no specs directory has no "
    + "specs and no command fails for it", () => {
    fWriteTree({ "concord.json": fsConcordJson() });
    [ [ "--assign" ], [], [ "--hashes" ], [ "--gate" ]].forEach(( vsArg ) => {
      const aRun = faRun( vsArg );
      expect( aRun.sStderr ).toBe( "" );
      expect( aRun.cExit ).toBe( 0 );
    });
  });

  test( "PAIRED: a project with no spec_directories reads the specs "
    + "directory when it exists", () => {
    fWriteTree({
      "concord.json": fsConcordJson(),
      "specs/a.md": fsSpec( "A", [ "* {#s-cfgs06} A default rule." ])
    });
    expect( faRun([ "--hashes" ]).sStdout ).toContain( "s-cfgs06" );
  });
});

// @proves s-n7ky2n@7cec1a6
test( "a matched nested Concord project keeps its own spec map", () => {
  fWriteTree({
    "concord.json": fsConcordJson({
      spec_directories: [ "specs/*", "packages/*/specs" ]
    }),
    "specs/core/core.md": fsSpec( "Core", [
      "* {#s-prnt01} Parent rule."
    ]),
    "packages/alpha/concord.json": fsConcordJson(),
    "packages/alpha/specs/alpha.md": fsSpec( "Alpha", [
      "* {#s-child1} Child-only rule."
    ])
  });
  const aParent = faRun([ "--sid", "s-prnt01" ]);
  const aChild = faRun([ "--sid", "s-child1" ]);
  expect( aParent.cExit ).toBe( 0 );
  expect( aChild.cExit ).toBe( 1 );
});

// @proves s-w8ivpb@ffb0e3a
// @proves s-zstgty@57da9d2
// @proves s-am7qu4@d7b2d60
// @proves s-i0n88z@8f1c352
// @proves s-j38rej@b1a5c57
// @proves s-sx6vdb@f89dcd2
// @proves s-wu6tv6@dae6381
// @proves s-xqx0r5@8596529
describe( "concord-settings — a bad settings file", () => {
  test( "a concord.json directory is reported as unreadable", () => {
    fWriteTree({});
    fs.mkdirSync( path.join( sDirFixture, "concord.json" ));
    const aRun = faRun([ "--assign" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toBe(
      "spec-map: concord.json cannot be read\n"
    );
  });

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

  // @proves s-j38rej@b1a5c57
  test( "PAIRED: a file naming every language Language readings defines "
    + "is well formed", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        languages: [ "javascript", "typescript", "css", "html", "rust" ]
      }),
      "specs/a.md": fsSpec( "A", [ "* {#s-?} A placeholder rule." ])
    });
    expect( faRun([ "--assign" ]).cExit ).toBe( 0 );
    expect( fsRead( "specs/a.md" )).toMatch( /\{#s-[a-z0-9]{6}\} A/ );
  });
});

const vtBadObservations = [
  [ "an observations path of another form", { observations_file: 3 },
    "observations_file" ],
  [ "an empty observations path", { observations_file: "" },
    "observations_file" ],
  [ "an observations path under specs/",
    { observations_file: "specs/observations.md" }, "observations_file" ],
  [ "a rules list of another form", { rules_files: "AGENTS.md" },
    "rules_files" ],
  [ "a rules list holding an empty path", { rules_files: [ "" ]},
    "rules_files" ],
  [ "a rules list naming the observations file", {
    observations_file: "observations.md",
    rules_files: [ "AGENTS.md", "observations.md" ]
  }, "rules_files" ]
];

// @proves s-pwo03p@679e44b
// @proves s-bqv6fu@d463477
describe( "concord-settings — the observations file and the rules files",
() => {
  test.each( vtBadObservations )( "%s is a bad settings file: one line "
    + "naming the member, exit 2, nothing written", (
    sWhat, aOverride, sMember
  ) => {
    fWriteTree({
      "concord.json": fsConcordJson( aOverride ),
      "specs/a.md": fsSpec( "A", [ "* {#s-?} A placeholder rule." ])
    });
    const vsBefore = vsTreeFile();
    const aRun = faRun([ "--assign" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    const vsLine = aRun.sStderr.split( "\n" ).filter( Boolean );
    expect( vsLine ).toHaveLength( 1 );
    expect( vsLine[ 0 ]).toContain( "concord.json" );
    expect( vsLine[ 0 ]).toContain( sMember );
    expect( vsTreeFile()).toEqual( vsBefore );
  });

  // @proves s-pwo03p@679e44b
  test( "the observations file cannot be under a secondary spec root", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        spec_directories: [ "specs", "docs/requirements" ],
        observations_file: "docs/requirements/observations.md"
      }),
      "specs/a.md": "# Specs\n",
      "docs/requirements/a.md": "# Requirements\n"
    });
    const aRun = faRun([ "--assign" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStderr ).toContain( "observations_file" );
  });

  test.each([
    [ "both members, the rules list empty",
      { observations_file: "observations.md", rules_files: []}],
    [ "both members, the rules list naming files",
      { observations_file: "notes/obs.md",
        rules_files: [ "AGENTS.md", "CLAUDE.md" ]}],
    [ "neither member", {}]
  ])( "PAIRED: a file declaring %s is well formed", ( sWhat, aOverride ) => {
    fWriteTree({
      "concord.json": fsConcordJson( aOverride ),
      "specs/a.md": fsSpec( "A", [ "* {#s-?} A placeholder rule." ])
    });
    expect( faRun([ "--assign" ]).cExit ).toBe( 0 );
    expect( fsRead( "specs/a.md" )).toMatch( /\{#s-[a-z0-9]{6}\} A/ );
  });
});

// @proves s-4j8qm7@89b7c16
test( "concord-settings — spec-coverage in a project declaring no coverage "
  + "prints one stderr line saying so and exits 2", () => {
  fWriteTree({ "concord.json": fsConcordJson(), "specs/.keep": "" });
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

// @proves s-zupjie@e48f894
// @proves s-nrp172@56b8541
describe( "concord-settings — where guidance references are read", () => {
  test( "under every directory a `*` segment names, in files of a declared "
    + "language, outside the ignored directories, and nowhere else", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        languages: [ "javascript" ],
        read_directories: [ "lib/*", "tools" ],
        ignored_directories: [ "vendor" ]
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
        languages: [ "javascript", "css" ],
        read_directories: [ "lib/*" ]
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
        suites: [
          { name: "unit", directories: [ "checks/unit" ]},
          { name: "flow", directories: [ "checks/flow", "more/flow" ]}
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
        + fsHash( sTextRule ) + "  current",
      "more/flow/f.test.js:1  checks the rule  "
        + fsHash( sTextRule ) + "  current",
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
        suites: [{ name: "unit", directories: [ "checks/unit", "more/flow" ]}]
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
// @proves s-m4jorm@da16eb4
describe( "concord-settings — the record file and the page title", () => {
  test( "a verdict is recorded in the declared record file and the worklist "
    + "page is titled with the declared name", () => {
    fWriteTree({
      "concord.json": fsConcordJson({
        name: "Seed & Co",
        record_file: "checks/verdicts.jsonl"
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
// @proves s-rapf8f@dd2cbd3
// @proves s-n7ky2n@7cec1a6
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

// @proves s-92u5vq@fbe31e8
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

// @proves s-ins4p7@19e76c1
test( "concord-settings — Concord's own settings file declares Concord's "
  + "suite, language, directories, record file and coverage", () => {
  expect( JSON.parse( fs.readFileSync( sPathConcord, "utf8" ))).toEqual({
    name: "Concord",
    suites: [{ name: "root", directories: [ "test" ]}],
    languages: [ "javascript" ],
    read_directories: [ "bin", "scripts", "test" ],
    ignored_directories: [ "node_modules" ],
    record_file: "test/interactive-passes.jsonl",
    observations_file: "observations.md",
    rules_files: [
      "AGENTS.md", "orchestration.md", "roles/architect.md", "roles/fixer.md"
    ],
    coverage: {
      runs: [{ name: "root", directory: "." }],
      commands_before: [],
      source_directories: [ "bin", "scripts" ],
      review_file: "spec-coverage-review.md"
    }
  });
  const aGate = spawnSync(
    process.execPath,
    [ path.join( sDirRepo, "bin", "spec-map" ), "--gate" ],
    { cwd: sDirRepo, encoding: "utf8" }
  );
  expect( aGate.status ).toBe( 0 );
  expect( aGate.stdout ).toBe( "Gate: pass\n" );
});

// @proves s-ins4p7@19e76c1
test( "concord-settings — Concord's npm helper scripts call the master command", () => {
  const aPackage = JSON.parse( fsRepoText( "package.json" ));
  expect( aPackage.scripts ).toMatchObject({
    "spec-map": "bin/concord spec-map",
    "spec-coverage": "bin/concord spec-coverage",
    "agents-sync": "bin/concord agents-sync",
    "hook-install": "bin/concord concord-hook install",
    "link-propose": "bin/concord link-propose"
  });
  fAssertProjectGate();
});

// @proves s-ins4p7@19e76c1
test( "concord-settings — Concord has one root containing its specs, build "
  + "spec, tests and README", () => {
  [ "specs", "test", "README.md", "package.json" ].forEach(( sPath ) => {
    expect( fs.existsSync( path.join( sDirRepo, sPath ))).toBe( true );
  });
  expect( fsRepoText( "README.md" )).toContain( "ConcordSTC" );
  const aGate = spawnSync(
    process.execPath, [ path.join( sDirRepo, "bin", "spec-map" ), "--gate" ],
    { cwd: sDirRepo, encoding: "utf8" }
  );
  expect( aGate.status ).toBe( 0 );
  expect( aGate.stdout ).toBe( "Gate: pass\n" );
});

const sDirBin = path.join( sDirRepo, "bin" );

// @proves s-c744tt@ebf0776
// @proves s-4pq89a@7127ba0
// @proves s-y7klju@10305b7
test( "concord-settings — each command under bin is an executable file "
  + "with no extension opening with the node shebang", () => {
  const vsName = fs.readdirSync( sDirBin ).sort();
  expect( vsName ).toEqual([
    "agents-sync", "concord-hook", "link-propose", "spec-coverage", "spec-map"
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
const fAssertProjectGate = () => {
  const aGate = spawnSync(
    process.execPath, [ path.join( sDirRepo, "bin", "spec-map" ), "--gate" ],
    { cwd: sDirRepo, encoding: "utf8" }
  );
  expect( aGate.status ).toBe( 0 );
  expect( aGate.stdout ).toBe( "Gate: pass\n" );
};

// @proves s-ins4p7@19e76c1
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
  fAssertProjectGate();
});

// @proves s-ins4p7@19e76c1
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
  fAssertProjectGate();
});

// @proves s-ins4p7@19e76c1
test( "concord-settings — each role, architect and fixer among them, has its "
  + "text and each tool's metadata side by side under roles/", () => {
  const vsName = fs.readdirSync( path.join( sDirRepo, "roles" )).sort();
  const vsRole = Array.from( new Set(
    vsName.map(( sName ) => sName.split( "." )[ 0 ])
  ));
  expect( vsRole ).toEqual( expect.arrayContaining([ "architect", "fixer" ]));
  expect( vsName ).toEqual( vsRole.flatMap(( sRole ) => [
    sRole + ".claude-frontmatter", sRole + ".codex-frontmatter", sRole + ".md"
  ]).sort());
  fAssertProjectGate();
});

// @proves s-s4l32i@b41f304
test( "concord-settings — Concord's own commits are gated by its committed "
  + "pre-commit hook, which runs the gate", () => {
  const sPathHook = path.join( sDirRepo, ".githooks", "pre-commit" );
  expect( fs.statSync( sPathHook ).mode & 0o777 ).toBe( 0o755 );
  expect( fs.readFileSync( sPathHook, "utf8" )).toBe(
    "#!/bin/sh\nconcord spec-map --gate || exit 1\n"
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
