// @spec specs/concord-process.md
"use strict";

const assert = require( "assert" );
const fs = require( "fs" );
const path = require( "path" );
const { fzMain: fzConcord } = require( "../scripts/concord.js" );
const { fzMain: fzInit } = require( "../scripts/concord-init.js" );

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
// @proves s-xrmdr0@5b1d45a
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

// @proves s-ualukl@c397c2a
test( "concord init prints project-specific setup instructions without writing", () => {
  const aFiles = new Map([
    [ "/fixture/AGENTS.md", "# Project\n" ],
    [ "/fixture/package.json", '{"scripts":{"spec-map":"concord spec-map","spec-coverage":"concord spec-coverage"}}' ],
    [ "/fixture/.githooks/pre-commit", "concord spec-map --gate || exit 1\n" ]
  ]);
  let sOut = "";
  let sErr = "";
  const nExit = fzInit(
    [], "/fixture", ( s ) => { sOut += s; }, ( s ) => { sErr += s; },
    {
      sPackageRoot: "/installed/@debonet/concord",
      existsSync: ( sPath ) => aFiles.has( sPath ),
      readFileSync: ( sPath ) => aFiles.get( sPath )
    }
  );
  assert.strictEqual( nExit, 0 );
  assert.strictEqual( sErr, "" );
  assert.match( sOut, /Concord agent guide: \/installed\/@debonet\/concord\/AGENTS\.md/ );
  assert.match( sOut, /Read @\/installed\/@debonet\/concord\/AGENTS\.md before any other work/ );
  assert.match( sOut, /spec-map target: master command found/ );
  assert.match( sOut, /spec-coverage target: master command found/ );
  assert.match( sOut, /Pre-commit hook file: present/ );
  assert.strictEqual( aFiles.size, 3 );
});

// @proves s-ualukl@c397c2a
test( "concord init rejects arguments", () => {
  let sErr = "";
  assert.strictEqual(
    fzInit( [ "--help" ], "/fixture", () => {}, ( s ) => { sErr += s; }),
    2
  );
  assert.strictEqual( sErr, "usage: concord init\n" );
});
