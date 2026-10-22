"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { spawnSync } = require( "child_process" );

const { sPathSpecMap, fWriteConcord } = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sPathHookCommand = path.join( sDirRepo, "bin", "concord-hook" );
const sDirScratch = path.join( sDirRepo, "tmp", "concord-hook-" + process.pid );
const sDirProject = path.join( sDirScratch, "proj" );
const sDirGitBin = path.join( sDirScratch, "gitbin" );
const sPathGit = path.join( sDirGitBin, "git" );
const sPathGitOther = path.join( sDirGitBin, "other-git" );
const sPathGitState = path.join( sDirGitBin, "state.json" );
const sPathGitLog = path.join( sDirGitBin, "log.jsonl" );
const sPathHook = path.join( sDirProject, ".githooks", "pre-commit" );
const sLineGate = "\"$HOME/@concord/bin/spec-map\" --gate || exit 1";
const sHookInstalled = "#!/bin/sh\n" + sLineGate + "\n";
const sDirGitCommon = "git-common";

const fsFakeGit = ( sName ) => [
  "#!" + process.execPath,
  "\"use strict\";",
  "const fs = require( \"fs\" );",
  "const vsArg = process.argv.slice( 2 );",
  "fs.appendFileSync( " + JSON.stringify( sPathGitLog ) + ", JSON.stringify({",
  "  sName: " + JSON.stringify( sName ) + ", vsArg, sCwd: process.cwd()",
  "}) + \"\\n\" );",
  "const sPathState = " + JSON.stringify( sPathGitState ) + ";",
  "const aState = fs.existsSync( sPathState )",
  "  ? JSON.parse( fs.readFileSync( sPathState, \"utf8\" )) : {};",
  "if( vsArg[ 0 ] === \"config\" && vsArg[ 1 ] === \"--get\" ){",
  "  if( aState[ vsArg[ 2 ]] === undefined ){ process.exit( 1 );}",
  "  process.stdout.write( aState[ vsArg[ 2 ]] + \"\\n\" );",
  "  process.exit( 0 );",
  "}",
  "if( vsArg[ 0 ] === \"config\" && vsArg.length === 3 ){",
  "  aState[ vsArg[ 1 ]] = vsArg[ 2 ];",
  "  fs.writeFileSync( sPathState, JSON.stringify( aState ));",
  "  process.exit( 0 );",
  "}",
  "if( vsArg[ 0 ] === \"rev-parse\" && vsArg[ 1 ] === \"--git-common-dir\" ){",
  "  process.stdout.write( " + JSON.stringify( sDirGitCommon + "\n" ) + " );",
  "  process.exit( 0 );",
  "}",
  "process.exit( 129 );",
  ""
].join( "\n" );

const sSpecClean = "# A\n\n## API\n\n* {#s-hok001} A rule.\n";
const sTestProving = "// @proves s-hok001@0000000\ntest( \"a\", () => {} );\n";

const fWriteFile = ( sPathRel, sBody ) => {
  const sPath = path.join( sDirProject, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, sBody );
};

const fSetup = ( aOption ) => {
  const aSet = { bGit: true, bRefusing: false, ...( aOption || {}) };
  fs.rmSync( sDirScratch, { recursive: true, force: true });
  fs.mkdirSync( sDirGitBin, { recursive: true });
  fs.writeFileSync( sPathGit, fsFakeGit( "git" ), { mode: 0o755 });
  fs.writeFileSync( sPathGitOther, fsFakeGit( "other-git" ), { mode: 0o755 });
  fs.writeFileSync( sPathGitLog, "" );
  if( aSet.sHooksPath !== undefined ){
    fs.writeFileSync( sPathGitState, JSON.stringify({
      "core.hooksPath": aSet.sHooksPath
    }));
  }
  fWriteConcord( sDirProject );
  fWriteFile( "specs/a.md", sSpecClean );
  if( aSet.bRefusing ){ fWriteFile( "test/t.test.js", sTestProving );}
  if( aSet.bGit ){ fs.mkdirSync( path.join( sDirProject, ".git" ));}
  if( aSet.sHookOld !== undefined ){
    fWriteFile( sDirGitCommon + "/hooks/pre-commit", aSet.sHookOld );
  }
  if( aSet.sHook !== undefined ){
    fWriteFile( ".githooks/pre-commit", aSet.sHook );
    fs.chmodSync( sPathHook, aSet.nMode === undefined ? 0o755 : aSet.nMode );
  }
};

const faRun = ( vsArg, aEnv ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathHookCommand ].concat( vsArg ),
    {
      cwd: sDirProject,
      encoding: "utf8",
      env: { ...process.env, CONCORD_GIT: sPathGit, ...( aEnv || {}) }
    }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const fvaGitCall = () => fs.readFileSync( sPathGitLog, "utf8" )
  .split( "\n" ).filter( Boolean ).map(( sLine ) => JSON.parse( sLine ));

const fsHooksPath = () => (
  fs.existsSync( sPathGitState )
    ? JSON.parse( fs.readFileSync( sPathGitState, "utf8" ))[ "core.hooksPath" ]
    : undefined
);

const fvsProjectFile = () => fs.readdirSync( sDirProject, { recursive: true })
  .map(( sPath ) => path.join( sDirProject, sPath ))
  .sort()
  .map(( sPath ) => {
    const aStat = fs.statSync( sPath );
    return sPath + " " + aStat.mode + "\n" + (
      aStat.isFile() ? fs.readFileSync( sPath, "utf8" ) : ""
    );
  });

const fvsLineErr = ( aRun ) => aRun.sStderr.split( "\n" ).filter( Boolean );

const fbSetsConfig = ( aCall ) => (
  aCall.vsArg[ 0 ] === "config" && aCall.vsArg[ 1 ] !== "--get"
);

afterAll(() => {
  fs.rmSync( sDirScratch, { recursive: true, force: true });
});

// @proves s-khifjg@c398f54
// @proves s-5r1y67@f5cc739
describe( "concord-hook — its forms", () => {
  test.each([
    [[]],
    [[ "uninstall" ]],
    [[ "--help" ]],
    [[ "install", "now" ]],
    [[ "check", "--verbose" ]]
  ])( "%j acts on nothing, prints its usage line and exits 2", ( vsArg ) => {
    fSetup({ bRefusing: true });
    const vsBefore = fvsProjectFile();
    const aRun = faRun( vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toMatch( /^usage: concord-hook install\|check\n$/ );
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fvaGitCall()).toEqual([]);
  });

  // @proves s-92u5vq@475d2f0
  test( "PAIRED: install and check each act on the project whose root is "
    + "the working directory", () => {
    fSetup();
    expect( faRun([ "install" ]).cExit ).toBe( 0 );
    expect( fs.readFileSync( sPathHook, "utf8" )).toBe( sHookInstalled );
    expect( faRun([ "check" ])).toEqual({
      cExit: 0, sStdout: "installed\n", sStderr: ""
    });
    fvaGitCall().forEach(( aCall ) => (
      expect( fs.realpathSync( aCall.sCwd ))
        .toBe( fs.realpathSync( sDirProject ))
    ));
  });
});

// @proves s-j6etdh@aba052d
describe( "concord-hook — which git it runs", () => {
  test( "the program CONCORD_GIT names, and through it alone it reads and "
    + "changes git settings", () => {
    fSetup();
    const aRun = faRun([ "install" ], { CONCORD_GIT: sPathGitOther });
    expect( aRun.cExit ).toBe( 0 );
    const vaCall = fvaGitCall();
    expect( vaCall.length ).toBeGreaterThan( 0 );
    vaCall.forEach(( aCall ) => expect( aCall.sName ).toBe( "other-git" ));
    expect( vaCall.some( fbSetsConfig )).toBe( true );
    expect( fsHooksPath()).toBe( ".githooks" );
    expect( fs.readdirSync( path.join( sDirProject, ".git" ))).toEqual([]);
  });

  test( "PAIRED: `git` on the PATH when CONCORD_GIT is empty", () => {
    fSetup();
    const aRun = faRun([ "install" ], { CONCORD_GIT: "", PATH: sDirGitBin });
    expect( aRun.cExit ).toBe( 0 );
    const vaCall = fvaGitCall();
    expect( vaCall.length ).toBeGreaterThan( 0 );
    vaCall.forEach(( aCall ) => expect( aCall.sName ).toBe( "git" ));
    expect( fsHooksPath()).toBe( ".githooks" );
  });
});

// @proves s-6d5erl@850ece1
describe( "concord-hook — the root of a work tree", () => {
  test.each([[ "install" ], [ "check" ]])(
    "%s where no .git entry is prints one line saying so and exits 2",
    ( sForm ) => {
      fSetup({ bGit: false });
      const vsBefore = fvsProjectFile();
      const aRun = faRun([ sForm ]);
      expect( aRun.cExit ).toBe( 2 );
      expect( aRun.sStdout ).toBe( "" );
      expect( fvsLineErr( aRun )).toHaveLength( 1 );
      expect( aRun.sStderr ).toContain( "not the root of a git work tree" );
      expect( fvsProjectFile()).toEqual( vsBefore );
      expect( fvaGitCall()).toEqual([]);
    }
  );

  test( "PAIRED: a .git file, as a linked work tree has, is a root", () => {
    fSetup({ bGit: false });
    fWriteFile( ".git", "gitdir: elsewhere\n" );
    expect( faRun([ "install" ]).cExit ).toBe( 0 );
  });
});

// @proves s-auxyb0@7cb2648
// @proves s-w7hypm@963555b
// @proves s-f15bz3@ccb7236
// @proves s-xu5wfs@6233752
// @proves s-gfxphd@17a5f25
describe( "concord-hook — install in a project with no hook", () => {
  test( "writes the two-line hook with mode 0755, sets core.hooksPath, "
    + "prints one line per change and exits 0", () => {
    fSetup();
    const aRun = faRun([ "install" ]);
    expect( aRun ).toEqual({
      cExit: 0,
      sStdout: "wrote .githooks/pre-commit\nset core.hooksPath .githooks\n",
      sStderr: ""
    });
    expect( fs.readFileSync( sPathHook, "utf8" )).toBe( sHookInstalled );
    expect( fs.statSync( sPathHook ).mode & 0o777 ).toBe( 0o755 );
    expect( fsHooksPath()).toBe( ".githooks" );
  });

  test( "PAIRED: run again, it changes nothing and prints `already "
    + "installed`", () => {
    fSetup();
    faRun([ "install" ]);
    const vsBefore = fvsProjectFile();
    const cSet = fvaGitCall().filter( fbSetsConfig ).length;
    expect( faRun([ "install" ])).toEqual({
      cExit: 0, sStdout: "already installed\n", sStderr: ""
    });
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fvaGitCall().filter( fbSetsConfig )).toHaveLength( cSet );
  });
});

// @proves s-gfxphd@17a5f25
// @proves s-w7hypm@963555b
describe( "concord-hook — install beside an existing hook holding a gate "
  + "line", () => {
  const sHookOwn = "#!/bin/sh\necho checking\n" + sLineGate + "\necho done\n";

  test( "leaves its text, makes it executable, and sets core.hooksPath",
  () => {
    fSetup({ sHook: sHookOwn, nMode: 0o644 });
    expect( faRun([ "install" ])).toEqual({
      cExit: 0,
      sStdout: "made .githooks/pre-commit executable\n"
        + "set core.hooksPath .githooks\n",
      sStderr: ""
    });
    expect( fs.readFileSync( sPathHook, "utf8" )).toBe( sHookOwn );
    expect( fs.statSync( sPathHook ).mode & 0o777 ).toBe( 0o755 );
  });

  test( "PAIRED: executable and with core.hooksPath set, it is already "
    + "installed", () => {
    fSetup({ sHook: sHookOwn, sHooksPath: ".githooks" });
    expect( faRun([ "install" ])).toEqual({
      cExit: 0, sStdout: "already installed\n", sStderr: ""
    });
    expect( fs.readFileSync( sPathHook, "utf8" )).toBe( sHookOwn );
  });
});

const vtRefused = [
  [ "core.hooksPath set elsewhere", { sHooksPath: "my-hooks" }, "my-hooks" ],
  [ "a pre-commit file in the hooks directory git uses unset",
    { sHookOld: "#!/bin/sh\nexit 0\n" }, sDirGitCommon + "/hooks/pre-commit" ],
  [ "a .githooks/pre-commit with no gate line",
    { sHook: "#!/bin/sh\nspec-map --gate\n" }, ".githooks/pre-commit" ]
];

// @proves s-64wie3@7be9bbd
// @proves s-m50rhg@3816675
// @proves s-wor0b2@f496608
// @proves s-f79qxz@9d93d73
describe( "concord-hook — what install will not replace", () => {
  test.each( vtRefused )( "%s: one line naming it, nothing written, no "
    + "setting changed, the gate not run, exit 2", (
    sWhat, aOption, sNamed
  ) => {
    fSetup({ ...aOption, bRefusing: true });
    const vsBefore = fvsProjectFile();
    const sHooksPathBefore = fsHooksPath();
    const aRun = faRun([ "install" ]);
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( fvsLineErr( aRun )).toHaveLength( 1 );
    expect( aRun.sStderr ).toContain( sNamed );
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fsHooksPath()).toBe( sHooksPathBefore );
    expect( fvaGitCall().filter( fbSetsConfig )).toEqual([]);
  });
});

// @proves s-nqgv3l@f11b0c4
describe( "concord-hook — install where the gate refuses", () => {
  test( "prints the gate's output and one line saying the hook was not "
    + "installed, writes nothing, sets nothing, exits 1", () => {
    fSetup({ bRefusing: true });
    const aGate = spawnSync( process.execPath, [ sPathSpecMap, "--gate" ], {
      cwd: sDirProject, encoding: "utf8"
    });
    expect( aGate.status ).toBe( 1 );
    const vsBefore = fvsProjectFile();
    const aRun = faRun([ "install" ]);
    expect( aRun.cExit ).toBe( 1 );
    expect( aRun.sStdout.startsWith( aGate.stdout )).toBe( true );
    const vsAfter = aRun.sStdout.slice( aGate.stdout.length )
      .split( "\n" ).filter( Boolean );
    expect( vsAfter ).toHaveLength( 1 );
    expect( vsAfter[ 0 ]).toContain( "not installed" );
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fs.existsSync( path.join( sDirProject, ".githooks" )))
      .toBe( false );
    expect( fsHooksPath()).toBe( undefined );
  });
});

// @proves s-7fg356@bad1518
test( "concord-hook — install stages and commits nothing: git is only asked "
  + "to read or set settings", () => {
  fSetup();
  expect( faRun([ "install" ]).cExit ).toBe( 0 );
  const vaCall = fvaGitCall();
  expect( vaCall.length ).toBeGreaterThan( 0 );
  vaCall.forEach(( aCall ) => (
    expect([ "config", "rev-parse" ]).toContain( aCall.vsArg[ 0 ])
  ));
});

const vtCheckFailing = [
  [ "nothing installed", {}, [ "core.hooksPath", "missing" ]],
  [ "core.hooksPath unset", { sHook: sHookInstalled }, [ "core.hooksPath" ]],
  [ "a hook that is not executable",
    { sHook: sHookInstalled, nMode: 0o644, sHooksPath: ".githooks" },
    [ "not executable" ]],
  [ "a hook with no gate line",
    { sHook: "#!/bin/sh\n", sHooksPath: ".githooks" },
    [ "gate line" ]],
  [ "core.hooksPath elsewhere and a hook with no gate line",
    { sHook: "#!/bin/sh\n", sHooksPath: "my-hooks" },
    [ "core.hooksPath", "gate line" ]]
];

// @proves s-wkkgpn@5fa3420
// @proves s-6665sv@2322dac
// @proves s-wgkldv@ab7a9d7
describe( "concord-hook — check", () => {
  test( "prints `installed` and exits 0 when installed, writing nothing, "
    + "setting nothing and not running the gate", () => {
    fSetup({ sHook: sHookInstalled, sHooksPath: ".githooks", bRefusing: true });
    const vsBefore = fvsProjectFile();
    expect( faRun([ "check" ])).toEqual({
      cExit: 0, sStdout: "installed\n", sStderr: ""
    });
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fvaGitCall().filter( fbSetsConfig )).toEqual([]);
  });

  test.each( vtCheckFailing )( "PAIRED: %s prints one stderr line per "
    + "failing condition and exits 1", ( sWhat, aOption, vsNeedle ) => {
    fSetup( aOption );
    const vsBefore = fvsProjectFile();
    const aRun = faRun([ "check" ]);
    expect( aRun.cExit ).toBe( 1 );
    expect( aRun.sStdout ).toBe( "" );
    const vsLine = fvsLineErr( aRun );
    expect( vsLine ).toHaveLength( vsNeedle.length );
    vsNeedle.forEach(( sNeedle, n ) => (
      expect( vsLine[ n ]).toContain( sNeedle )
    ));
    expect( fvsProjectFile()).toEqual( vsBefore );
    expect( fvaGitCall().filter( fbSetsConfig )).toEqual([]);
  });
});
