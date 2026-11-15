"use strict";

const assert = require( "assert" );
const { fzMain } = require( "../scripts/concord-migrate.js" );

const fzRun = ( sText, vsArg = [], aExtra = {} ) => {
  let sOut = "";
  let sErr = "";
  let sWritten = null;
  const aDeps = {
    sPackageRoot: "/installed/concord",
    existsSync: ( sPath ) => sPath === "/fixture/AGENTS.md" && sText !== null,
    readFileSync: () => sText,
    writeFileSync: ( sPath, sContent, sEncoding ) => {
      assert.strictEqual( sPath, "/fixture/AGENTS.md" );
      assert.strictEqual( sEncoding, "utf8" );
      sWritten = sContent;
    },
    ...aExtra
  };
  const nExit = fzMain(
    vsArg, "/fixture", ( s ) => { sOut += s; }, ( s ) => { sErr += s; }, aDeps
  );
  return { nExit, sOut, sErr, sWritten };
};

// @proves s-idlwf3@398beec
test( "concord migrate updates only the old adoption marker and preserves CRLF", () => {
  const sBefore = [
    "# Project\r\n",
    "Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.\r\n",
    "Keep this instruction.\r\n"
  ].join( "" );
  const aResult = fzRun( sBefore );
  assert.strictEqual( aResult.nExit, 0 );
  assert.strictEqual( aResult.sErr, "" );
  assert.match( aResult.sOut, /updated the adoption marker/ );
  assert.strictEqual( aResult.sWritten, [
    "# Project\r\n",
    "Read @/installed/concord/AGENTS.md before any other work; this project uses Concord.\r\n",
    "Keep this instruction.\r\n"
  ].join( "" ));
});

// @proves s-idlwf3@398beec
test( "concord migrate updates the former opt-out marker", () => {
  const aResult = fzRun( "# Project\nThis project does not use ConcordSTC.\n" );
  assert.strictEqual( aResult.nExit, 0 );
  assert.match( aResult.sOut, /updated the opt-out marker/ );
  assert.strictEqual( aResult.sWritten,
    "# Project\nThis project does not use Concord.\n"
  );
});

// @proves s-idlwf3@398beec
test( "concord migrate leaves current markers untouched", () => {
  const sText = "Read @/installed/concord/AGENTS.md before any other work; this project uses Concord.\n";
  const aResult = fzRun( sText );
  assert.strictEqual( aResult.nExit, 0 );
  assert.match( aResult.sOut, /already uses the current name/ );
  assert.strictEqual( aResult.sWritten, null );
});

// @proves s-idlwf3@398beec
test( "concord migrate rejects multiple markers without changing the file", () => {
  const aResult = fzRun( [
    "Read @~/@concord/AGENTS.md before any other work; this project uses ConcordSTC.",
    "This project does not use Concord."
  ].join( "\n" ));
  assert.strictEqual( aResult.nExit, 1 );
  assert.match( aResult.sErr, /conflicting or duplicate/ );
  assert.strictEqual( aResult.sWritten, null );
});

// @proves s-idlwf3@398beec
test( "concord migrate reports missing AGENTS and rejects arguments", () => {
  const aMissing = fzRun( null );
  assert.strictEqual( aMissing.nExit, 0 );
  assert.match( aMissing.sOut, /not found; nothing changed/ );
  assert.strictEqual( aMissing.sWritten, null );

  const aArgs = fzRun( "", [ "--help" ] );
  assert.strictEqual( aArgs.nExit, 2 );
  assert.strictEqual( aArgs.sErr, "usage: concord migrate\n" );
  assert.strictEqual( aArgs.sWritten, null );
});
