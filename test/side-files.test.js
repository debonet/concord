"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { spawnSync } = require( "child_process" );
const { faContextModel } = require( "../scripts/spec-map.js" );
const { faGraph } = require( "../scripts/context.js" );
const { faTreeData } = require( "../scripts/tree.js" );
const { sPathSpecMap, fsConcordJson } = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirFixture = path.join( sDirRepo, "tmp", "side-files-" + process.pid );
const asText = {
  "s-sid001": "The artifact implements this rule.",
  "s-sid002": "The artifact remains a distinct implementation target.",
  "i-sid003": "**Do:** inspect the artifact. **Look for:** its bytes.",
  "g-sid004": "Keep the artifact readable."
};
const fsHashText = ( sText ) => crypto.createHash( "sha1" )
  .update( sText.replace( /\s+/g, " " ).trim(), "utf8" )
  .digest( "hex" ).slice( 0, 7 );
const fsHashBytes = ( yBytes ) => crypto.createHash( "sha1" )
  .update( yBytes ).digest( "hex" ).slice( 0, 7 );
const fsRef = ( sId ) => sId + "@" + fsHashText( asText[ sId ]);
const sSpec = [
  "# Fixture",
  "",
  "> {#m-sid000} Artifact implementation rule",
  "",
  "## Sidecar rules",
  "",
  "* {#s-sid001 <m-sid000} " + asText[ "s-sid001" ],
  "* {#s-sid002} " + asText[ "s-sid002" ],
  "* {#i-sid003} " + asText[ "i-sid003" ],
  "* {#g-sid004 for=fixer} " + asText[ "g-sid004" ],
  ""
].join( "\n" );
const sTest = [
  "// @proves " + fsRef( "s-sid001" ),
  "test( \"the artifact rule\", () => {} );",
  ""
].join( "\n" );

const fWrite = ( sPathRel, xBody ) => {
  const sPath = path.join( sDirFixture, sPathRel );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, xBody );
};

const fWriteTree = ( asBody ) => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
  fWrite( "concord.json", fsConcordJson());
  fWrite( "specs/a.md", sSpec );
  fWrite( "test/artifact.test.js", sTest );
  Object.entries( asBody ).forEach(([ sPath, xBody ]) => fWrite( sPath, xBody ));
};

const faRun = ( vsArg ) => {
  const aResult = spawnSync(
    process.execPath,
    [ sPathSpecMap, "--cache-checksum" ].concat( vsArg ),
    { cwd: sDirFixture, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return {
    cExit: aResult.status,
    sOut: aResult.stdout + aResult.stderr
  };
};

const fSection = ( sOut, sTitle ) => {
  const vsLine = sOut.split( "\n" );
  const nStart = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle ));
  if( nStart < 0 ){ return null;}
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nStart && !sLine.startsWith( "  " )
  ));
  return vsLine.slice( nStart + 1, nEnd < 0 ? undefined : nEnd )
    .map(( sLine ) => sLine.slice( 2 ));
};

afterAll(() => {
  fs.rmSync( sDirFixture, { recursive: true, force: true });
});

// @proves s-pkmrq7@79d0e81
// @proves s-zpv3y7@dc2aae2
// @proves s-yecw0i@c83eff2
// @proves s-i13kgq@b2a9854
// @proves s-22a0wo@13886ff
// @proves s-m4fr78@238c65f
// @proves s-hux5ev@ce910fd
test( "an eligible sidecar supplies the artifact's implementation links", () => {
  fWriteTree({
    "src/artifact.json": "{\"message\":\"hello\"}\n",
    "src/artifact.json.concord": [
      "@implements " + fsRef( "s-sid001" ),
      "@tested-by test/artifact.test.js",
      "@checks " + fsRef( "i-sid003" ),
      "@follows " + fsRef( "g-sid004" ),
      ""
    ].join( "\n" )
  });
  const aRun = faRun([]);
  expect( aRun.cExit ).toBe( 0 );
  expect( fSection( aRun.sOut, "statements with no implementation link" ) )
    .toEqual([ expect.stringContaining( "s-sid002" ) ]);
  expect( fSection( aRun.sOut, "implementation files with no test link" ))
    .toEqual( [] );
  expect( fSection( aRun.sOut, "malformed, unresolved or stale code references" ))
    .toEqual( [] );
  expect( fSection( aRun.sOut, "side files that are not read" )).toEqual( [] );
  expect( faRun([ "--sid", "s-sid001" ]).sOut )
    .toContain( "src/artifact.json.concord:1" );
  expect( faRun([ "--guidance" ]).sOut )
    .toContain( "src/artifact.json.concord:4" );
  const aModel = faContextModel( sDirFixture ).aModel;
  const aContext = faGraph( aModel, "artifact implementation rule", "fixer" );
  const aCodeContext = aContext.vaNode.find(( aNode ) => (
    aNode.sKey === "src/artifact.json"
  ));
  expect( aCodeContext.sContent ).toContain(
    "1: {\"message\":\"hello\"}"
  );
  const aTree = faTreeData( aModel );
  expect( aTree.vaNode.some(( aNode ) => (
    aNode.sType === "c" && aNode.sText === "{\"message\":\"hello\"}"
  ))).toBe( true );
});

// @proves s-v7ww36@641e899
// @proves s-8qhv2d@478dcee
// @proves s-r95w4f@6a28bae
test( "unread sidecars name their target problem and refuse the gate", () => {
  fWriteTree({
    "src/missing.json.concord": "@implements " + fsRef( "s-sid001" ) + "\n",
    "src/commentable.js": "// @implements " + fsRef( "s-sid001" ) + "\n",
    "src/commentable.js.concord": "@implements " + fsRef( "s-sid001" ) + "\n",
    "src/inner.concord": "",
    "src/inner.concord.concord": "@implements " + fsRef( "s-sid001" ) + "\n",
    "test/unowned.test.js": "test( \"fixture\", () => {} );\n",
    "test/unowned.test.js.concord": "@implements " + fsRef( "s-sid001" ) + "\n"
  });
  const aRun = faRun([]);
  const vsBad = fSection( aRun.sOut, "side files that are not read" );
  expect( vsBad ).toEqual(expect.arrayContaining([
    expect.stringContaining( "src/missing.json.concord  (absent)" ),
    expect.stringContaining( "src/commentable.js.concord  (commentable)" ),
    expect.stringContaining( "src/inner.concord.concord  (side file)" ),
    expect.stringContaining( "test/unowned.test.js.concord  (test file)" )
  ]));
  expect( faRun([ "--gate" ]).cExit ).toBe( 1 );
});

// @proves s-yecw0i@c83eff2
// @proves s-v7ww36@641e899
test( "test directives and malformed text in a sidecar are rejected", () => {
  fWriteTree({
    "src/artifact.json": "{}\n",
    "src/artifact.json.concord": [
      "@implements s-sid001",
      "@proves " + fsRef( "s-sid001" ),
      "note text",
      ""
    ].join( "\n" )
  });
  const vsBad = fSection(
    faRun([]).sOut, "malformed, unresolved or stale code references"
  );
  expect( vsBad ).toHaveLength( 3 );
  expect( vsBad.join( "\n" ) ).toContain( "src/artifact.json.concord:1" );
  expect( vsBad.join( "\n" ) ).toContain( "src/artifact.json.concord:2" );
  expect( vsBad.join( "\n" ) ).toContain( "src/artifact.json.concord:3" );
});

// @proves s-h9tc2m@919d17b
test( "sidecar-backed interactive checks hash the artifact's raw bytes", () => {
  const yBody = Buffer.from([ 0x00, 0xff, 0x20, 0x0a ]);
  fWriteTree({
    "src/artifact.bin": yBody,
    "src/artifact.bin.concord": "@checks " + fsRef( "i-sid003" ) + "\n"
  });
  fWrite( "test/interactive-passes.jsonl", JSON.stringify({
    sId: "i-sid003",
    sHash: fsHashText( asText[ "i-sid003" ]),
    sVerdict: "pass",
    sDate: "2026-11-09",
    sNote: "",
    asHashForTarget: { "src/artifact.bin": fsHashBytes( yBody ) }
  }) + "\n" );
  expect( faRun([ "--interactive" ]).sOut ).toContain( "i-sid003  passed" );
  fWrite( "src/artifact.bin", Buffer.from([ 0x00, 0xff, 0x20, 0x0b ]) );
  expect( faRun([ "--interactive" ]).sOut ).toContain( "i-sid003  stale" );
});

// @proves s-g8r0ur@f2d68ec
test( "a diff-sidecar @checks group hashes only its mapped source region", () => {
  const sCheck = fsRef( "i-sid003" );
  const sArtifact = [
    "{",
    "  \"checked\": 2",
    "}",
    ""
  ].join( "\n" );
  fWriteTree({
    "src/artifact.json": sArtifact,
    "src/artifact.json.concord": [
      "--- a/src/artifact.json",
      "+++ b/src/artifact.json",
      "@@ -1,1 +1,2 @@",
      " {",
      "+@checks " + sCheck,
      ""
    ].join( "\n" )
  });
  expect( faRun([ "--pass", "i-sid003" ]).cExit ).toBe( 0 );
  expect( faRun([ "--interactive" ]).sOut ).toContain( "i-sid003  passed" );
  fWrite( "src/artifact.json", fs.readFileSync(
    path.join( sDirFixture, "src/artifact.json" ), "utf8"
  ).replace( "\"checked\": 2", "\"checked\": 7" ));
  expect( faRun([ "--interactive" ]).sOut ).toContain( "i-sid003  stale" );
});

// @proves s-m9jtjo@3366616
test( "assign rewrites a retyped implementation reference in a sidecar", () => {
  const sTypedSpec = [
    "# Fixture",
    "",
    "## Sidecar rules",
    "",
    "* {#i-sid001} **Do:** run the task. **Look for:** the result.",
    ""
  ].join( "\n" );
  fWriteTree({
    "src/artifact.bin": "x",
    "src/artifact.bin.concord": "@implements s-sid001@1234567\n"
  });
  fWrite( "specs/a.md", sTypedSpec );
  const aRun = faRun([ "--assign" ]);
  expect( aRun.cExit ).toBe( 0 );
  expect( fs.readFileSync(
    path.join( sDirFixture, "src/artifact.bin.concord" ), "utf8"
  )).toBe( "@implements i-sid001@1234567\n" );
});

// @proves s-k3sml3@9ef30dd
test( "a changed statement makes the sidecar reference stale", () => {
  fWriteTree({
    "src/artifact.bin": "x",
    "src/artifact.bin.concord": "@implements s-sid001@0000000\n"
  });
  expect( faRun([]).sOut ).toContain(
    "src/artifact.bin.concord:1  lines 1-1  @implements s-sid001@0000000 (stale hash)"
  );
});

// @proves s-fh39a3@e943bea
// @proves s-n6yjkn@cfe625d
// @proves s-wt7bpq@73556cf
test( "an insertion-only sidecar diff adds a body implementation region", () => {
  const sBody = "The artifact implements this rule.";
  fWriteTree({
    "src/artifact.json": "{\n  \"x\": 1\n}\n",
    "src/artifact.json.concord": [
      "--- a/src/artifact.json",
      "+++ b/src/artifact.json",
      "@@ -1,1 +1,2 @@",
      " {",
      "+@implements " + fsRef( "s-sid001" ),
      ""
    ].join( "\n" )
  });
  const aRun = faRun([]);
  expect( aRun.cExit ).toBe( 0 );
  expect( fSection( aRun.sOut, "malformed, unresolved or stale code references" ))
    .toEqual( [] );
  expect( fSection( aRun.sOut, "statements with no implementation link" )
    .join( "\n" )).not.toContain( "s-sid001" );
  expect( faRun([ "--sid", "s-sid001" ]).sOut )
    .toContain( "src/artifact.json.concord:5  lines 2-3" );
  fWriteTree({
    "src/second.json": "{\n  \"x\": 1\n}\n",
    "src/second.json.concord": [
      "--- a/src/second.json",
      "+++ b/src/second.json",
      "@@ -1,0 +2,1 @@",
      "+@implements " + fsRef( "s-sid001" ),
      ""
    ].join( "\n" )
  });
  const aRunNoContext = faRun([]);
  expect( aRunNoContext.cExit ).toBe( 0 );
  expect( fSection( aRunNoContext.sOut,
    "malformed, unresolved or stale code references" )).toEqual( [] );
  expect( faRun([ "--sid", "s-sid001" ]).sOut )
    .toContain( "src/second.json.concord:4  lines 2-3" );
});

// @proves s-fh39a3@e943bea
test( "a sidecar diff that changes target content is rejected", () => {
  fWriteTree({
    "src/artifact.json": "{\n  \"x\": 1\n}\n",
    "src/artifact.json.concord": [
      "--- a/src/artifact.json",
      "+++ b/src/artifact.json",
      "@@ -1,2 +1,2 @@",
      " {",
      "-  \"x\": 1",
      "+@implements s-sid001@0000000",
      ""
    ].join( "\n" )
  });
  const sOut = faRun([]).sOut;
  expect( fSection( sOut, "side files that are not read" )?.join( "\n" ))
    .toContain( "may not remove or change target lines" );
  expect( sOut ).toContain( "side files that are not read (1)" );
});
