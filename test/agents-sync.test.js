"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );

const sDirRepo = path.join( __dirname, ".." );
const sPathCommand = path.join( sDirRepo, "bin", "agents-sync" );
const sDirRolesOwn = path.join( sDirRepo, "roles" );
const sDirScratch = path.join( sDirRepo, "tmp", "agents-sync-" + process.pid );
const sDirRoles = path.join( sDirScratch, "roles" );
const sDirTarget = path.join( sDirScratch, "agents" );
const sDirHome = path.join( sDirScratch, "home" );
const sFileRecord = ".concord-agents-sync.json";
const sPathRecord = path.join( sDirTarget, sFileRecord );

const yFrontA = Buffer.from( "---\r\nname: alpha\r\n---", "utf8" );
const yTextA = Buffer.from( "\n# Alpha — role ✓\n\ntext\n", "utf8" );
const yFrontB = Buffer.from( "---\nname: beta\n---\n", "utf8" );
const yTextB = Buffer.from( "# Beta\n", "utf8" );
const yCodexFrontA = Buffer.from(
  'name = "alpha"\ndescription = "Alpha role"\n', "utf8"
);
const yCodexFrontB = Buffer.from(
  'name = "beta"\ndescription = "Beta role"\n', "utf8"
);

const fsSha = ( y ) => (
  crypto.createHash( "sha256" ).update( y ).digest( "hex" )
);

const yAgentA = Buffer.concat([ yFrontA, yTextA ]);
const yAgentB = Buffer.concat([ yFrontB, yTextB ]);
const yAgentCodexA = Buffer.concat([
  yCodexFrontA,
  Buffer.from(
    "developer_instructions = " + JSON.stringify( yTextA.toString( "utf8" ))
      + "\n", "utf8"
  )
]);
const yAgentCodexB = Buffer.concat([
  yCodexFrontB,
  Buffer.from(
    "developer_instructions = " + JSON.stringify( yTextB.toString( "utf8" ))
      + "\n", "utf8"
  )
]);

const fWriteRoles = ( ayForName ) => {
  fs.mkdirSync( sDirRoles, { recursive: true });
  Object.entries( ayForName ).forEach(([ sName, y ]) => (
    fs.writeFileSync( path.join( sDirRoles, sName ), y )
  ));
};

const fSetup = ( aOption ) => {
  const aSet = { bRoles: true, bTarget: true, ...( aOption || {}) };
  fs.rmSync( sDirScratch, { recursive: true, force: true });
  fs.mkdirSync( sDirHome, { recursive: true });
  if( aSet.bRoles ){
    fWriteRoles({
      "beta.md": yTextB,
      "beta.claude-frontmatter": yFrontB,
      "beta.codex-frontmatter": yCodexFrontB,
      "alpha.md": yTextA,
      "alpha.claude-frontmatter": yFrontA,
      "alpha.codex-frontmatter": yCodexFrontA
    });
  }
  if( aSet.bTarget ){ fs.mkdirSync( sDirTarget, { recursive: true });}
};

const faRun = ( vsArg, sCwd ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathCommand ].concat( vsArg ),
    {
      cwd: sCwd || sDirScratch,
      encoding: "utf8",
      env: { ...process.env, HOME: sDirHome, CODEX_HOME: path.join( sDirHome, ".codex" ) }
    }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const vsArgSync = [ "--roles", "roles", "--dir", "agents" ];

const fvsScratchFile = () => fs.readdirSync( sDirScratch, { recursive: true })
  .map(( sPath ) => path.join( sDirScratch, sPath ))
  .sort()
  .map(( sPath ) => (
    sPath + "\n" + (
      fs.statSync( sPath ).isFile()
        ? fs.readFileSync( sPath ).toString( "hex" )
        : ""
    )
  ));

const fyTarget = ( sName ) => fs.readFileSync( path.join( sDirTarget, sName ));

const faRecord = () => JSON.parse( fs.readFileSync( sPathRecord, "utf8" ));

const fvsLineErr = ( aRun ) => aRun.sStderr.split( "\n" ).filter( Boolean );

afterAll(() => {
  fs.rmSync( sDirScratch, { recursive: true, force: true });
});

// @proves s-n7q049@e6823a7
// @proves s-xszaj3@4653a38
describe( "agents-sync — its form", () => {
  test.each([
    [[ "extra" ]],
    [[ "--force", "--force" ]],
    [[ "--dir", "agents", "--dir", "agents" ]],
    [[ "--roles", "roles", "--roles", "roles" ]],
    [[ "--dir" ]],
    [[ "--roles" ]],
    [[ "--roles", "roles", "--dir" ]],
    [[ "--quiet" ]]
  ])( "%j writes nothing, prints its usage line and exits 2", ( vsArg ) => {
    fSetup();
    const vsBefore = fvsScratchFile();
    const aRun = faRun( vsArg );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( aRun.sStderr ).toMatch( /^usage: concord agents-sync / );
    expect( fvsScratchFile()).toEqual( vsBefore );
  });

  test( "PAIRED: each option once, in any order, runs", () => {
    fSetup();
    const aRun = faRun([ "--force", "--dir", "agents", "--roles", "roles" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStderr ).toBe( "" );
  });
});

// @proves s-dvkjf9@2c46b39
describe( "agents-sync — no project", () => {
  test( "it reads no concord.json, a bad one beside it included, and "
    + "resolves relative paths from its working directory", () => {
    fSetup();
    fs.writeFileSync( path.join( sDirScratch, "concord.json" ), "{ bad" );
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStderr ).toBe( "" );
    expect( fyTarget( "alpha.md" )).toEqual( yAgentA );
  });

  test( "PAIRED: run from another directory, relative paths resolve there",
  () => {
    fSetup();
    const aRun = faRun(
      [ "--roles", "../roles", "--dir", "../agents" ], sDirHome
    );
    expect( aRun.cExit ).toBe( 0 );
    expect( fyTarget( "beta.md" )).toEqual( yAgentB );
  });
});

// @proves s-z7h1uz@6f81274
// @proves s-yf8wyo@0128e34
// @proves s-jlo94e@7c8068c
// @proves s-ab1xqm@af290be
describe( "agents-sync — Concord's own roles", () => {
  test( "with no --roles it reads the roles directory of the Concord "
    + "project it belongs to, whatever its working directory", () => {
    fSetup({ bRoles: false });
    const aRun = faRun([ "--dir", sDirTarget ], sDirHome );
    expect( aRun.cExit ).toBe( 0 );
    const vsRole = Array.from( new Set(
      fs.readdirSync( sDirRolesOwn ).map(( sName ) => sName.split( "." )[ 0 ])
    )).sort();
    expect( vsRole.length ).toBeGreaterThan( 0 );
    expect( fs.readdirSync( sDirTarget ).sort()).toEqual(
      vsRole.flatMap(( sRole ) => [ sRole + ".md", sRole + ".toml" ])
        .concat([ sFileRecord ]).sort()
    );
    const fyOwn = ( sName ) => fs.readFileSync(
      path.join( sDirRolesOwn, sName )
    );
    vsRole.forEach(( sRole ) => expect( fyTarget( sRole + ".md" )).toEqual(
      Buffer.concat([
        fyOwn( sRole + ".claude-frontmatter" ), fyOwn( sRole + ".md" )
      ])
    ));
    vsRole.forEach(( sRole ) => {
      const sText = fyOwn( sRole + ".md" ).toString( "utf8" );
      const sMeta = fyOwn( sRole + ".codex-frontmatter" ).toString( "utf8" );
      expect( fyTarget( sRole + ".toml" ).toString( "utf8" )).toBe(
        sMeta + "developer_instructions = " + JSON.stringify( sText ) + "\n"
      );
    });
  });
});

// @proves s-jlo94e@7c8068c
// @proves s-ab1xqm@af290be
// @proves s-gaewu5@b5462f6
describe( "agents-sync — the agent file", () => {
  test( "for each name with both files it writes the frontmatter's bytes "
    + "followed directly by the role text's, unconverted", () => {
    fSetup();
    fWriteRoles({ "notes.txt": "not a role\n" });
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    expect( fyTarget( "alpha.md" )).toEqual( yAgentA );
    expect( fyTarget( "beta.md" )).toEqual( yAgentB );
    expect( fyTarget( "alpha.toml" )).toEqual( yAgentCodexA );
    expect( fyTarget( "beta.toml" )).toEqual( yAgentCodexB );
    expect( fs.readdirSync( sDirTarget ).sort()).toEqual([
      sFileRecord, "alpha.md", "alpha.toml", "beta.md", "beta.toml"
    ]);
  });
});

const vtRolesBad = [
  [ "a roles directory that does not exist", () => (
    fs.rmSync( sDirRoles, { recursive: true, force: true })
  ), "roles" ],
  [ "a roles directory holding no role", () => {
    fs.rmSync( sDirRoles, { recursive: true, force: true });
    fWriteRoles({ "notes.txt": "x" });
  }, "roles" ],
  [ "a role text with no frontmatter", () => (
    fWriteRoles({ "gamma.md": "# Gamma\n" })
  ), "gamma" ],
  [ "a frontmatter with no role text", () => (
    fWriteRoles({ "delta.claude-frontmatter": "---\n---\n" })
  ), "delta" ]
];

// @proves s-npmw3x@2ff75c0
// @proves s-048ffy@dc732cc
describe( "agents-sync — incomplete roles", () => {
  test.each( vtRolesBad )( "%s: one stderr line naming the problem, "
    + "nothing written, exit 2", ( sWhat, fBreak, sNeedle ) => {
    fSetup();
    fBreak();
    const vsBefore = fvsScratchFile();
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( fvsLineErr( aRun )).toHaveLength( 1 );
    expect( aRun.sStderr ).toContain( sNeedle );
    expect( fvsScratchFile()).toEqual( vsBefore );
  });
});

// @proves s-pite2d@c490345
describe( "agents-sync — the target directory", () => {
  test( "with no --dir it writes into $HOME/.claude/agents and prints that "
    + "path with $HOME expanded", () => {
    fSetup();
    const sDirAgents = path.join( sDirHome, ".claude", "agents" );
    const sDirClaude = path.join( sDirScratch, "claude" );
    fs.mkdirSync( path.join( sDirClaude, "agents" ), { recursive: true });
    fs.symlinkSync( sDirClaude, path.join( sDirHome, ".claude" ));
    const aRun = faRun([ "--roles", "roles" ]);
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe(
      "wrote " + path.join( sDirAgents, "alpha.md" ) + "\n"
      + "wrote " + path.join( sDirHome, ".codex", "agents", "alpha.toml" ) + "\n"
      + "wrote " + path.join( sDirAgents, "beta.md" ) + "\n"
      + "wrote " + path.join( sDirHome, ".codex", "agents", "beta.toml" ) + "\n"
    );
    expect( fs.readFileSync( path.join( sDirAgents, "beta.md" )))
      .toEqual( yAgentB );
    expect( fs.readFileSync( path.join( sDirHome, ".codex", "agents", "beta.toml" )))
      .toEqual( yAgentCodexB );
  });

  test( "PAIRED: creates default and explicit target directories", () => {
    fSetup();
    fs.rmSync( sDirTarget, { recursive: true, force: true });
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    expect( fyTarget( "alpha.toml" )).toEqual( yAgentCodexA );
  });

  test( "PAIRED: uses CODEX_HOME for the Codex target", () => {
    fSetup();
    const sCodexHome = path.join( sDirScratch, "custom-codex-home" );
    const aRun = faRunEnv( [ "--roles", "roles" ], {
      ...process.env, HOME: sDirHome, CODEX_HOME: sCodexHome
    });
    const sCodexAgent = path.join( sCodexHome, "agents", "alpha.toml" );
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toContain( "wrote " + sCodexAgent );
    expect( fs.readFileSync( sCodexAgent )).toEqual( yAgentCodexA );
  });
});

// @proves s-7ul58j@7eae97c
// @proves s-jmhct4@e503ded
describe( "agents-sync — what it writes and prints", () => {
  test( "only the agent files and the record file, in the target directory; "
    + "every other file there is left as it was", () => {
    fSetup();
    fs.writeFileSync( path.join( sDirTarget, "other.md" ), "mine\n" );
    fs.mkdirSync( path.join( sDirTarget, "sub" ));
    fs.writeFileSync( path.join( sDirTarget, "sub", "alpha.md" ), "kept\n" );
    const vsBefore = fvsScratchFile();
    const aRun = faRun( vsArgSync );
    expect( aRun ).toEqual({
      cExit: 0,
      sStdout: "wrote agents/alpha.md\nwrote agents/alpha.toml\n"
        + "wrote agents/beta.md\nwrote agents/beta.toml\n",
      sStderr: ""
    });
    const vsAfter = fvsScratchFile();
    const sPrefixNew = [ "alpha.md", "alpha.toml", "beta.md", "beta.toml", sFileRecord ].map(( sName ) => (
      path.join( sDirTarget, sName ) + "\n"
    ));
    expect( vsAfter.filter(( s ) => !sPrefixNew.some(( sP ) => (
      s.startsWith( sP )
    )))).toEqual( vsBefore );
  });

  test( "PAIRED: run again with nothing changed, each line says unchanged, "
    + "in role-name order, with the directory as given", () => {
    fSetup();
    faRun([ "--roles", "roles", "--dir", "agents/" ]);
    expect( faRun([ "--roles", "roles", "--dir", "agents/" ])).toEqual({
      cExit: 0,
      sStdout: "unchanged agents/alpha.md\nunchanged agents/alpha.toml\n"
        + "unchanged agents/beta.md\nunchanged agents/beta.toml\n",
      sStderr: ""
    });
  });
});

// @proves s-utqlgq@59ec117
// @proves s-ct9wos@02f9aaf
// @proves s-jmhct4@e503ded
describe( "agents-sync — the record file", () => {
  test( "maps each agent file to the SHA-256 of the bytes written, keeping "
    + "entries for names no role has", () => {
    fSetup();
    const sHashOther = "a".repeat( 64 );
    fs.writeFileSync( sPathRecord, JSON.stringify({ "gone.md": sHashOther }));
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    expect( faRecord()).toEqual({
      "gone.md": sHashOther,
      "alpha.md": fsSha( yAgentA ),
      "beta.md": fsSha( yAgentB ),
      "alpha.toml": fsSha( yAgentCodexA ),
      "beta.toml": fsSha( yAgentCodexB )
    });
  });
});

// @proves s-j4tine@a618915
// @proves s-h1qxdb@0e70fa9
// @proves s-gim8db@1c2e9d7
describe( "agents-sync — a hand edit", () => {
  test( "a file changed since it was written refuses the run: one line "
    + "naming it and --force, nothing written, exit 2", () => {
    fSetup();
    faRun( vsArgSync );
    fs.writeFileSync( path.join( sDirTarget, "beta.md" ), "edited\n" );
    fWriteRoles({ "alpha.md": "# Alpha changed\n" });
    const vsBefore = fvsScratchFile();
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    const vsLine = fvsLineErr( aRun );
    expect( vsLine ).toHaveLength( 1 );
    expect( vsLine[ 0 ]).toContain( "agents/beta.md" );
    expect( vsLine[ 0 ]).toContain( "--force" );
    expect( fvsScratchFile()).toEqual( vsBefore );
  });

  test( "PAIRED: with --force every agent file is written", () => {
    fSetup();
    faRun( vsArgSync );
    fs.writeFileSync( path.join( sDirTarget, "beta.md" ), "edited\n" );
    const aRun = faRun( vsArgSync.concat([ "--force" ]));
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe(
      "unchanged agents/alpha.md\nunchanged agents/alpha.toml\n"
        + "wrote agents/beta.md\nunchanged agents/beta.toml\n"
    );
    expect( fyTarget( "beta.md" )).toEqual( yAgentB );
    expect( fyTarget( "beta.toml" )).toEqual( yAgentCodexB );
    expect( faRecord()[ "beta.md" ])
      .toBe( fsSha( yAgentB ));
    expect( faRecord()[ "beta.toml" ]).toBe( fsSha( yAgentCodexB ));
  });

  test( "PAIRED: a file it wrote that nobody changed is rewritten when its "
    + "role changes", () => {
    fSetup();
    faRun( vsArgSync );
    fWriteRoles({ "alpha.md": "# Alpha changed\n" });
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 0 );
    expect( aRun.sStdout ).toBe(
      "wrote agents/alpha.md\nwrote agents/alpha.toml\n"
        + "unchanged agents/beta.md\nunchanged agents/beta.toml\n"
    );
    expect( fyTarget( "alpha.md" ).toString( "utf8" ))
      .toBe( yFrontA.toString( "utf8" ) + "# Alpha changed\n" );
  });

  // @proves s-kn4es1@360bbdd
  test( "PAIRED: a file the record does not name is hand-edited when its "
    + "bytes differ, and unchanged when they match", () => {
    fSetup();
    fs.writeFileSync( path.join( sDirTarget, "alpha.md" ),
      yAgentA );
    fs.writeFileSync( path.join( sDirTarget, "beta.md" ), "by hand\n" );
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 2 );
    expect( fvsLineErr( aRun )).toHaveLength( 1 );
    expect( aRun.sStderr ).toContain( "agents/beta.md" );
    fs.rmSync( path.join( sDirTarget, "beta.md" ));
    expect( faRun( vsArgSync ).sStdout ).toBe(
      "unchanged agents/alpha.md\nwrote agents/alpha.toml\n"
        + "wrote agents/beta.md\n"
        + "wrote agents/beta.toml\n"
    );
  });
});

const vsRecordBad = [
  "[]",
  "{ not json",
  JSON.stringify({ "alpha.md": "ABC" }),
  JSON.stringify({ "alpha.md": "A".repeat( 64 ) }),
  JSON.stringify({ "alpha.md": 7 })
];

// @proves s-0woned@b3f5245
// @proves s-lx979r@8ac38af
describe( "agents-sync — a bad record file", () => {
  test.each( vsRecordBad )( "%s: one line naming the file, nothing written, "
    + "exit 2", ( sRecord ) => {
    fSetup();
    fs.writeFileSync( sPathRecord, sRecord );
    const vsBefore = fvsScratchFile();
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStdout ).toBe( "" );
    expect( fvsLineErr( aRun )).toHaveLength( 1 );
    expect( aRun.sStderr ).toContain( sFileRecord );
    expect( fvsScratchFile()).toEqual( vsBefore );
  });

  test.each( vsRecordBad )( "PAIRED: %s with --force is replaced by the "
    + "roles' entries alone", ( sRecord ) => {
    fSetup();
    fs.writeFileSync( sPathRecord, sRecord );
    expect( faRun( vsArgSync.concat([ "--force" ])).cExit ).toBe( 0 );
    expect( faRecord()).toEqual({
      "alpha.md": fsSha( yAgentA ),
      "beta.md": fsSha( yAgentB ),
      "alpha.toml": fsSha( yAgentCodexA ),
      "beta.toml": fsSha( yAgentCodexB )
    });
  });
});

const dtmOld = new Date( "2001-01-01T00:00:00Z" );

const fvsPathTarget = () => fs.readdirSync( sDirTarget )
  .map(( sName ) => path.join( sDirTarget, sName ));

const fAgeTarget = () => {
  fvsPathTarget().forEach(( sPath ) => fs.utimesSync( sPath, dtmOld, dtmOld ));
  fs.utimesSync( sDirTarget, dtmOld, dtmOld );
};

const fLock = ( sPath ) => fs.chmodSync( sPath, 0o444 );

const fLockTarget = () => {
  fvsPathTarget().forEach( fLock );
  fs.chmodSync( sDirTarget, 0o555 );
};

const fUnlockTarget = () => {
  if( !fs.existsSync( sDirTarget )){ return;}
  fs.chmodSync( sDirTarget, 0o755 );
  fvsPathTarget().forEach(( sPath ) => fs.chmodSync(
    sPath, fs.statSync( sPath ).isDirectory() ? 0o755 : 0o644
  ));
};

const fsStateForPath = ( sPath ) => {
  const aStat = fs.statSync( sPath );
  return path.basename( sPath ) + " " + aStat.mtimeMs + " " + (
    aStat.isFile() ? fs.readFileSync( sPath ).toString( "hex" ) : ""
  );
};

const fvsTargetState = () => [ fsStateForPath( sDirTarget )].concat(
  fvsPathTarget().sort().map( fsStateForPath )
);

const fsStateTargetFile = ( sName ) => (
  fsStateForPath( path.join( sDirTarget, sName ))
);

afterEach( fUnlockTarget );

const sOutUnchanged = "unchanged agents/alpha.md\n"
  + "unchanged agents/alpha.toml\nunchanged agents/beta.md\n"
  + "unchanged agents/beta.toml\n";

// @proves s-sjq95s@3031d2d
// @proves s-i062i7@696127c
// @proves s-4gru26@be7ee15
describe( "agents-sync — an up-to-date run", () => {
  test( "with the target directory and every file in it denying writing, it "
    + "changes no file, its bytes or its time, and exits 0", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fAgeTarget();
    fLockTarget();
    const vsBefore = fvsTargetState();
    expect( faRun( vsArgSync )).toEqual({
      cExit: 0, sStdout: sOutUnchanged, sStderr: ""
    });
    expect( fvsTargetState()).toEqual( vsBefore );
  });

  test( "PAIRED: in a writable directory it changes nothing either", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fAgeTarget();
    const vsBefore = fvsTargetState();
    expect( faRun( vsArgSync )).toEqual({
      cExit: 0, sStdout: sOutUnchanged, sStderr: ""
    });
    expect( fvsTargetState()).toEqual( vsBefore );
  });

  test( "PAIRED: with every agent file current but no record file, the run "
    + "is not up to date and needs a write", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fs.rmSync( sPathRecord );
    fLockTarget();
    expect( faRun( vsArgSync ).cExit ).toBe( 3 );
  });
});

// @proves s-8e60a5@97bd2af
describe( "agents-sync — only what differs is written", () => {
  test( "a changed role rewrites its agent file and the record; the other "
    + "agent file keeps its bytes and time", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fAgeTarget();
    const sBetaBefore = fsStateTargetFile( "beta.md" );
    const sRecordBefore = fsStateTargetFile( sFileRecord );
    fWriteRoles({ "alpha.md": "# Alpha changed\n" });
    expect( faRun( vsArgSync ).sStdout ).toBe(
      "wrote agents/alpha.md\n"
        + "wrote agents/alpha.toml\nunchanged agents/beta.md\n"
        + "unchanged agents/beta.toml\n"
    );
    expect( fsStateTargetFile( "beta.md" )).toBe( sBetaBefore );
    expect( fsStateTargetFile( sFileRecord )).not.toBe( sRecordBefore );
    expect( fs.statSync( path.join( sDirTarget, "alpha.md" )).mtimeMs )
      .not.toBe( dtmOld.getTime());
  });

  test( "PAIRED: with every agent file current and the record file missing, "
    + "only the record file is written", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fs.rmSync( sPathRecord );
    fAgeTarget();
    const vsAgentBefore = [ "alpha.md", "alpha.toml", "beta.md", "beta.toml" ]
      .map( fsStateTargetFile );
    expect( faRun( vsArgSync )).toEqual({
      cExit: 0, sStdout: sOutUnchanged, sStderr: ""
    });
    expect([ "alpha.md", "alpha.toml", "beta.md", "beta.toml" ]
      .map( fsStateTargetFile ))
      .toEqual( vsAgentBefore );
    expect( faRecord()).toEqual({
      "alpha.md": fsSha( yAgentA ),
      "beta.md": fsSha( yAgentB ),
      "alpha.toml": fsSha( yAgentCodexA ),
      "beta.toml": fsSha( yAgentCodexB )
    });
  });
});

const fsRecordAfterRunFrom = ( vtEntry ) => {
  fSetup();
  fs.writeFileSync( path.join( sDirTarget, "alpha.md" ), yAgentA );
  fs.writeFileSync( sPathRecord, JSON.stringify(
    Object.fromEntries( vtEntry ), null, 2
  ) + "\n" );
  expect( faRun( vsArgSync ).cExit ).toBe( 0 );
  return fs.readFileSync( sPathRecord, "utf8" );
};

// @proves s-cmdkv2@24d9372
describe( "agents-sync — the record's text", () => {
  const vtEntry = [
    [ "zeta.md", "b".repeat( 64 ) ],
    [ "beta.md", fsSha( yAgentB ) ],
    [ "alpha.md", fsSha( yAgentA ) ],
    [ "gone.md", "a".repeat( 64 ) ]
  ];

  test( "records holding one set of entries in different orders are written "
    + "as one text", () => {
    const sRecordFwd = fsRecordAfterRunFrom( vtEntry );
    const sRecordRev = fsRecordAfterRunFrom( vtEntry.slice().reverse());
    expect( sRecordRev ).toBe( sRecordFwd );
  });

  test( "PAIRED: a run after a run that exited 0, nothing changed between, "
    + "is up to date", () => {
    fsRecordAfterRunFrom( vtEntry );
    fAgeTarget();
    fLockTarget();
    const vsBefore = fvsTargetState();
    expect( faRun( vsArgSync )).toEqual({
      cExit: 0, sStdout: sOutUnchanged, sStderr: ""
    });
    expect( fvsTargetState()).toEqual( vsBefore );
  });
});

const fvsLineFailed = ( aRun, sPathShown ) => {
  const vsLine = fvsLineErr( aRun );
  expect( vsLine ).toHaveLength( 1 );
  expect( vsLine[ 0 ]).toContain( sPathShown );
  expect( vsLine[ 0 ]).toContain( "agents-sync" );
  expect( vsLine[ 0 ]).toContain( "writable" );
  return vsLine;
};

const fChangeBothRoles = () => fWriteRoles({
  "alpha.md": "# Alpha changed\n",
  "beta.md": "# Beta changed\n"
});

// @proves s-i1uuvg@f52fbd1
// @proves s-aqxbjg@5b401f4
// @proves s-tgbh92@04130f6
describe( "agents-sync — a failed write", () => {
  test( "a missing target directory whose parent is a file exits 3", () => {
    fSetup({ bTarget: false });
    fs.writeFileSync( sDirTarget, "not a directory" );
    const aRun = faRun([ "--roles", "roles", "--dir", "agents/sub" ]);
    expect( aRun.cExit ).toBe( 3 );
    expect( aRun.sStdout ).toBe( "" );
    fvsLineFailed( aRun, "agents/sub/." );
    fs.unlinkSync( sDirTarget );
  });

  test( "a target directory denying writing: one line naming the file and "
    + "saying where to run it, nothing written, exit 3", () => {
    fSetup();
    fAgeTarget();
    fs.chmodSync( sDirTarget, 0o555 );
    const vsBefore = fvsTargetState();
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 3 );
    expect( aRun.sStdout ).toBe( "" );
    fvsLineFailed( aRun, "agents/alpha.md" );
    expect( fvsTargetState()).toEqual( vsBefore );
  });

  test( "PAIRED: the first needed write refused, every later file is as it "
    + "was, the record included", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fChangeBothRoles();
    fAgeTarget();
    fLock( path.join( sDirTarget, "alpha.md" ));
    const vsBefore = fvsTargetState();
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 3 );
    fvsLineFailed( aRun, "agents/alpha.md" );
    expect( fvsTargetState()).toEqual( vsBefore );
  });

  test.each([
    [ "a hand-edited agent file", () => (
      fs.writeFileSync( path.join( sDirTarget, "beta.md" ), "edited\n" )
    ), []],
    [ "a bad record file", () => (
      fs.writeFileSync( sPathRecord, "[]" )
    ), []],
    [ "a usage error", () => null, [ "--quiet" ]]
  ])( "PAIRED: %s in a directory denying writing still exits 2",
  ( sWhat, fBreak, vsArgMore ) => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fChangeBothRoles();
    fBreak();
    fLockTarget();
    expect( faRun( vsArgSync.concat( vsArgMore )).cExit ).toBe( 2 );
  });
});

// @proves s-d9mhcc@b3f38ff
describe( "agents-sync — the record is written last", () => {
  test( "a write refused after another agent file was written leaves the "
    + "record file as it was", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fChangeBothRoles();
    fAgeTarget();
    fLock( path.join( sDirTarget, "beta.md" ));
    const sRecordBefore = fsStateTargetFile( sFileRecord );
    const aRun = faRun( vsArgSync );
    expect( aRun.cExit ).toBe( 3 );
    fvsLineFailed( aRun, "agents/beta.md" );
    expect( fyTarget( "alpha.md" ).toString( "utf8" ))
      .toBe( yFrontA.toString( "utf8" ) + "# Alpha changed\n" );
    expect( fsStateTargetFile( sFileRecord )).toBe( sRecordBefore );
  });

  test( "PAIRED: a run that writes both is never left with the record older "
    + "than an agent file", () => {
    fSetup();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    fChangeBothRoles();
    fAgeTarget();
    expect( faRun( vsArgSync ).cExit ).toBe( 0 );
    const fmsMtime = ( sName ) => (
      fs.statSync( path.join( sDirTarget, sName )).mtimeMs
    );
    expect( fmsMtime( sFileRecord )).toBeGreaterThanOrEqual(
      Math.max( fmsMtime( "alpha.md" ), fmsMtime( "beta.md" ))
    );
  });
});

const faRunEnv = ( vsArg, aEnv ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathCommand ].concat( vsArg ),
    { cwd: sDirScratch, encoding: "utf8", env: aEnv }
  );
  return {
    cExit: aResult.status,
    sStdout: aResult.stdout,
    sStderr: aResult.stderr
  };
};

const aEnvTool = {
  CLAUDECODE: "1",
  CLAUDE_CODE_ENTRYPOINT: "cli",
  CLAUDE_CONFIG_DIR: "elsewhere",
  CODEX_SANDBOX: "seatbelt",
  GEMINI_CLI: "1",
  AGENTS_SYNC_TOOL: "codex",
  XDG_CONFIG_HOME: "elsewhere"
};

const faSyncForEnv = ( aEnvMore ) => {
  fSetup();
  const sDirClaude = path.join( sDirScratch, "claude" );
  fs.mkdirSync( path.join( sDirClaude, "agents" ), { recursive: true });
  fs.symlinkSync( sDirClaude, path.join( sDirHome, ".claude" ));
  const aRun = faRunEnv([ "--roles", "roles" ], {
    ...process.env, HOME: sDirHome, ...aEnvMore
  });
  const sDirAgents = path.join( sDirHome, ".claude", "agents" );
  const sDirCodexAgents = path.join( sDirHome, ".codex", "agents" );
  return {
    aRun,
    vsFile: [ sDirAgents, sDirCodexAgents ].flatMap(( sDir ) => (
      fs.readdirSync( sDir ).sort().map(( sName ) => (
        path.basename( sDir ) + "/" + sName + " "
          + fs.readFileSync( path.join( sDir, sName ), "hex" )
      ))
    ))
  };
};

// @proves s-7ul58j@7eae97c
// @proves s-jmhct4@e503ded
describe( "agents-sync — every tool, one run", () => {
  test( "what it writes and prints is the same under any agent tool's "
    + "environment, given the same HOME", () => {
    const aBare = faSyncForEnv({});
    expect( aBare.aRun.sStderr ).toBe( "" );
    expect( aBare.aRun.cExit ).toBe( 0 );
    expect( aBare.vsFile ).toHaveLength( 6 );
    expect( faSyncForEnv( aEnvTool )).toEqual( aBare );
  });

  test.each([
    [[ "--tool", "claude" ]],
    [[ "--claude" ]],
    [[ "--codex" ]]
  ])( "PAIRED: %j, an option naming a tool, is a usage error", ( vsArg ) => {
    fSetup();
    const aRun = faRun( vsArgSync.concat( vsArg ));
    expect( aRun.cExit ).toBe( 2 );
    expect( aRun.sStderr ).toMatch( /^usage: concord agents-sync / );
  });
});
