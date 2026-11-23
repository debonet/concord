// @spec specs/concord-process.md
"use strict";

const assert = require( "assert" );
const fs = require( "fs" );
const path = require( "path" );
const { fzMain: fzConcord } = require( "../scripts/concord.js" );
const { fzMain: fzInit } = require( "../scripts/concord-init.js" );
const sDirRepo = path.join( __dirname, ".." );

const fInitFixture = () => {
  const sRoot = fs.mkdtempSync( path.join( sDirRepo, "tmp", "concord-init-" ));
  fs.mkdirSync( path.join( sRoot, "test" ), { recursive: true });
  return sRoot;
};

const fInit = ( sRoot, aResult = { status: 0, stdout: "already installed\n", stderr: "" } ) => {
  let sOut = "";
  let sErr = "";
  const cExit = fzInit(
    [], sRoot, ( s ) => { sOut += s; }, ( s ) => { sErr += s; },
    {
      sPackageRoot: path.join( sDirRepo, "tmp", "installed-concord" ),
      spawnSync: () => aResult
    }
  );
  return { cExit, sOut, sErr };
};

// @proves s-39o0xv@51b819a
test( "concord prints help and rejects unknown utilities", () => {
  let sOut = "";
  let sErr = "";
  assert.strictEqual(
    fzConcord( [], "/project", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }),
    0
  );
  assert.match( sOut, /usage: concord <utility>/ );
  assert.strictEqual( sErr, "" );

  sOut = "";
  assert.strictEqual(
    fzConcord( [ "missing" ], "/project", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }),
    2
  );
  assert.strictEqual( sOut, "" );
  assert.match( sErr, /usage: concord <utility>/ );
});

// @proves s-ssquhw@5229772
// @proves s-4pyvbb@ca117f6
// @proves s-n5ue8s@5c90c01
test( "concord forwards utility arguments, working directory and status", () => {
  let aSpawn = null;
  const nExit = fzConcord(
    [ "spec-map", "--gate" ], "/project",
    () => {}, () => {},
    {
      sDirBin: "/package/bin",
      sNode: "/node",
      spawnSync: ( ...aArgs ) => { aSpawn = aArgs; return { status: 7 }; }
    }
  );
  assert.strictEqual( nExit, 7 );
  assert.deepStrictEqual( aSpawn, [
    "/node", [ "/package/bin/spec-map", "--gate" ],
    { cwd: "/project", stdio: "inherit" }
  ]);
});

// @proves s-mo4ncx@7fcbe1b
// @proves s-xrmdr0@5803a25
test( "concord dispatches spec-conflicts through the master command", () => {
  let aSpawn = null;
  const nExit = fzConcord(
    [ "spec-conflicts", "--limit", "5" ], "/project",
    () => {}, () => {},
    {
      sDirBin: "/package/bin",
      sNode: "/node",
      spawnSync: ( ...aArgs ) => { aSpawn = aArgs; return { status: 0 }; }
    }
  );
  assert.strictEqual( nExit, 0 );
  assert.deepStrictEqual( aSpawn, [
    "/node", [ "/package/bin/spec-conflicts", "--limit", "5" ],
    { cwd: "/project", stdio: "inherit" }
  ]);
});

// @proves s-wq42my@339610a
// @proves s-hp433f@86be765
test( "concord dispatches context through the master command", () => {
  let aSpawn = null;
  const nExit = fzConcord(
    [ "context", "--for", "architect", "--intent", "Improve Bash coverage", "--budget", "500" ],
    "/project", () => {}, () => {},
    {
      sDirBin: "/package/bin",
      sNode: "/node",
      spawnSync: ( ...aArgs ) => { aSpawn = aArgs; return { status: 0 }; }
    }
  );
  assert.strictEqual( nExit, 0 );
  assert.deepStrictEqual( aSpawn, [
    "/node", [
      "/package/bin/context", "--for", "architect", "--intent", "Improve Bash coverage",
      "--budget", "500"
    ],
    { cwd: "/project", stdio: "inherit" }
  ]);
});

// @proves s-48tk0i@7bc9472
test( "concord dispatches tree through the master command", () => {
  let aSpawn = null;
  const nExit = fzConcord(
    [ "tree", "--output", "tmp/tree.html" ], "/project",
    () => {}, () => {},
    {
      sDirBin: "/package/bin",
      sNode: "/node",
      spawnSync: ( ...aArgs ) => { aSpawn = aArgs; return { status: 0 }; }
    }
  );
  assert.strictEqual( nExit, 0 );
  assert.deepStrictEqual( aSpawn, [
    "/node", [ "/package/bin/tree", "--output", "tmp/tree.html" ],
    { cwd: "/project", stdio: "inherit" }
  ]);
});

// @spec specs/build.md
// @proves s-0scrxa@422bf40
test( "concord dispatches migrate through the master command", () => {
  let aSpawn = null;
  const nExit = fzConcord(
    [ "migrate" ], "/project", () => {}, () => {},
    {
      sDirBin: "/package/bin",
      sNode: "/node",
      spawnSync: ( ...aArgs ) => { aSpawn = aArgs; return { status: 0 }; }
    }
  );
  assert.strictEqual( nExit, 0 );
  assert.deepStrictEqual( aSpawn, [
    "/node", [ "/package/bin/concord-migrate" ],
    { cwd: "/project", stdio: "inherit" }
  ]);
});

// @proves s-t99cvq@daf5b13
// @proves s-nur3h4@3793438
// @proves s-s6e3j6@4aad693
test( "the npm package exposes concord and routes helper scripts through it", () => {
  const aPackage = JSON.parse( fs.readFileSync(
    path.join( __dirname, "..", "package.json" ), "utf8"
  ));
  assert.deepStrictEqual( aPackage.bin, { concord: "bin/concord" });
  assert.strictEqual( aPackage.private, undefined );
  for( const sCommand of [
    "spec-map", "spec-coverage", "agents-sync", "hook-install", "link-propose"
  ]){
    assert.match( aPackage.scripts[ sCommand ], /^bin\/concord / );
  }
  for( const sPath of [
    "AGENTS.md", "README.md", "observations.md", "orchestration.md",
    "bin/", "docs/", "roles/", "scripts/", "specs/"
  ]){
    assert.ok( aPackage.files.includes( sPath ));
  }
});

// @proves s-ualukl@413cc4f
// @proves s-qfk1yl@7d3f9a7
// @proves s-s3xpz5@265fff1
// @proves s-tyykqo@a902908
test( "concord init creates project settings, npm targets and adoption line, then installs the gate",
() => {
  const sRoot = fInitFixture();
  try{
    fs.writeFileSync( path.join( sRoot, "AGENTS.md" ), "# Project\n" );
    fs.writeFileSync( path.join( sRoot, "package.json" ), JSON.stringify({
      name: "bash-project", scripts: { test: "bash test/run_tests.sh" }
    }) + "\n" );
    fs.mkdirSync( path.join( sRoot, "src" ));
    fs.writeFileSync( path.join( sRoot, "src", "tool" ), "#!/usr/bin/env bash\necho ok\n" );
    fs.chmodSync( path.join( sRoot, "src", "tool" ), 0o755 );
    fs.writeFileSync( path.join( sRoot, "test", "run_tests.sh" ), "#!/usr/bin/env bash\ntrue\n" );
    const { cExit, sOut, sErr } = fInit( sRoot );
    assert.strictEqual( cExit, 0 );
    assert.strictEqual( sErr, "" );
    assert.match( sOut, /created concord\.json/ );
    assert.match( sOut, /added npm script spec-map/ );
    assert.match( sOut, /added npm script spec-coverage/ );
    assert.match( sOut, /updated AGENTS\.md adoption line/ );
    assert.match( sOut, /already installed/ );
    const aConfig = JSON.parse( fs.readFileSync( path.join( sRoot, "concord.json" ), "utf8" ));
    assert.deepStrictEqual( aConfig.languages, [ "bash" ] );
    assert.deepStrictEqual( aConfig.read_directories, [ "." ] );
    assert.deepStrictEqual( aConfig.coverage.runs, [
      { name: "bash-1", directory: "test", runner: "bash" }
    ]);
    assert.deepStrictEqual( aConfig.coverage.source_directories, [ "src" ] );
    assert.match( fs.readFileSync( path.join( sRoot, "AGENTS.md" ), "utf8" ),
      /Read @.*installed-concord\/AGENTS\.md before any other work; this project uses Concord\./
    );
    const aPackage = JSON.parse( fs.readFileSync( path.join( sRoot, "package.json" ), "utf8" ));
    assert.strictEqual( aPackage.scripts.test, "bash test/run_tests.sh" );
    assert.strictEqual( aPackage.scripts[ "spec-map" ], "concord spec-map" );
    assert.strictEqual( aPackage.scripts[ "spec-coverage" ], "concord spec-coverage" );
  } finally {
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});

// @proves s-1rrzwx@2cfa4a7
test( "concord init adds inferred Bash coverage to existing project settings", () => {
  const sRoot = fInitFixture();
  try{
    fs.writeFileSync( path.join( sRoot, "concord.json" ), JSON.stringify({
      name: "existing-bash-project",
      suites: [{ name: "shell", directories: [ "test" ] }],
      languages: [ "bash" ],
      read_directories: [ "." ],
      ignored_directories: [ ".git", "node_modules" ],
      record_file: "test/passes.jsonl"
    }, null, 2 ));
    fs.mkdirSync( path.join( sRoot, "src" ), { recursive: true });
    fs.writeFileSync( path.join( sRoot, "src", "main.sh" ), "echo ready\n" );
    fs.writeFileSync( path.join( sRoot, "test", "run_tests.sh" ), "true\n" );
    const { cExit, sOut } = fInit( sRoot );
    expect( cExit ).toBe( 0 );
    expect( sOut ).toMatch( /added Bash coverage declaration to concord\.json/ );
    const aConfig = JSON.parse( fs.readFileSync(
      path.join( sRoot, "concord.json" ), "utf8"
    ));
    expect( aConfig.name ).toBe( "existing-bash-project" );
    expect( aConfig.coverage ).toMatchObject({
      runs: [{ name: "bash-1", directory: "test", runner: "bash" }],
      source_directories: [ "src" ]
    });
  } finally {
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});

// @proves s-ualukl@413cc4f
// @proves s-tyykqo@a902908
// @proves s-ppyrc4@814bce2
test( "concord init upgrades one legacy adoption or opt-out line", () => {
  [
    "Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.\n",
    "This project does not use ConcordSTC.\n"
  ].forEach(( sOldLine ) => {
    const sRoot = fInitFixture();
    try{
      fs.writeFileSync( path.join( sRoot, "AGENTS.md" ), sOldLine );
      fs.writeFileSync( path.join( sRoot, "package.json" ), "{}\n" );
      const { cExit, sOut } = fInit( sRoot );
      assert.strictEqual( cExit, 0 );
      assert.match( sOut, /updated AGENTS\.md adoption line/ );
      const sAgents = fs.readFileSync( path.join( sRoot, "AGENTS.md" ), "utf8" );
      assert.match( sAgents, /this project uses Concord\./ );
      assert.doesNotMatch( sAgents, /ConcordSTC|does not use Concord/ );
    } finally {
      fs.rmSync( sRoot, { recursive: true, force: true });
    }
  });
});

// @proves s-ualukl@413cc4f
// @proves s-s3xpz5@265fff1
// @proves s-tyykqo@a902908
test( "concord init leaves conflicting markers and build commands unchanged", () => {
  const sRoot = fInitFixture();
  try{
    const sAgentsBefore = [
      "Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.",
      "Read @/installed/concord/AGENTS.md before any other work; this project uses Concord."
    ].join( "\n" );
    fs.writeFileSync( path.join( sRoot, "AGENTS.md" ), sAgentsBefore );
    fs.writeFileSync( path.join( sRoot, "package.json" ), JSON.stringify({
      scripts: { "spec-map": "other-checker" }
    }) );
    const { cExit, sErr } = fInit( sRoot );
    assert.strictEqual( cExit, 1 );
    assert.match( sErr, /conflicting or hand-written adoption markers/ );
    assert.strictEqual( fs.readFileSync( path.join( sRoot, "AGENTS.md" ), "utf8" ), sAgentsBefore );
    assert.strictEqual( fs.existsSync( path.join( sRoot, "concord.json" )), false );
  } finally {
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});

// @proves s-ualukl@413cc4f
test( "concord init reports when the spec gate blocks hook installation", () => {
  const sRoot = fInitFixture();
  try{
    fs.writeFileSync( path.join( sRoot, "package.json" ), "{}\n" );
    const { cExit, sOut } = fInit( sRoot, {
      status: 1, stdout: "statements no test proves (1)\n", stderr: ""
    });
    assert.strictEqual( cExit, 1 );
    assert.match( sOut, /setup files are ready/ );
    assert.match( sOut, /statements no test proves/ );
    assert.match( sOut, /rerun `concord init`/ );
  } finally {
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});

// @proves s-s3xpz5@265fff1
// @proves s-qfk1yl@7d3f9a7
test( "concord init creates a Makefile and missing test directory when needed", () => {
  const sRoot = fs.mkdtempSync( path.join( sDirRepo, "tmp", "concord-init-make-" ));
  try{
    const { cExit, sOut } = fInit( sRoot );
    assert.strictEqual( cExit, 0 );
    assert.match( sOut, /created test\// );
    assert.match( sOut, /created Makefile/ );
    const sMakefile = fs.readFileSync( path.join( sRoot, "Makefile" ), "utf8" );
    assert.match( sMakefile, /^spec-map:\n\tconcord spec-map \$\(ARGS\)$/m );
    assert.match( sMakefile, /^spec-coverage:\n\tconcord spec-coverage \$\(ARGS\)$/m );
    assert.match( fs.readFileSync( path.join( sRoot, "AGENTS.md" ), "utf8" ),
      /this project uses Concord\./
    );
  } finally {
    fs.rmSync( sRoot, { recursive: true, force: true });
  }
});

// @proves s-ualukl@413cc4f
test( "concord init rejects arguments", () => {
  let sErr = "";
  assert.strictEqual(
    fzInit( [ "--help" ], "/fixture", () => {}, ( s ) => { sErr += s; }),
    2
  );
  assert.strictEqual( sErr, "usage: concord init\n" );
});

// @proves s-ualukl@413cc4f
test( "concord init reports a working directory that is not a project directory", () => {
  let sErr = "";
  assert.strictEqual(
    fzInit( [], path.join( sDirRepo, "tmp", "missing-concord-project" ),
      () => {}, ( s ) => { sErr += s; }, { bSkipHookInstall: true }
    ),
    2
  );
  assert.match( sErr, /not a project directory/ );
});
