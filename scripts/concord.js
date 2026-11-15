// @implements s-4pyvbb@ca117f6
// @implements s-nur3h4@3793438
// @implements s-s6e3j6@4aad693
// @implements s-t99cvq@daf5b13
// @implements s-ssquhw@5229772
// @implements s-39o0xv@51b819a
// @implements s-0scrxa@422bf40
// @implements s-n5ue8s@5c90c01
// @implements s-mo4ncx@7fcbe1b
// @implements s-xrmdr0@5803a25
// @tested-by test/concord-cli.test.js
"use strict";

const { spawnSync } = require( "child_process" );
const path = require( "path" );

const asCommands = new Set([
  "agents-sync", "concord-hook", "link-propose", "migrate",
  "spec-conflicts", "spec-coverage", "spec-map"
]);
const sUsage = (
  "usage: concord <utility> [arguments]\n"
  + "utilities: agents-sync, concord-hook, init, link-propose, "
  + "migrate, spec-conflicts, spec-coverage, spec-map\n"
);

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const fSpawn = aDeps.spawnSync || spawnSync;
  const sNode = aDeps.sNode || process.execPath;
  const sDirBin = aDeps.sDirBin || path.resolve( __dirname, "../bin" );

  if( vsArg.length === 0 || ( vsArg.length === 1 && vsArg[ 0 ] === "--help" )){
    fWrite( sUsage );
    return 0;
  }

  const sCommand = vsArg[ 0 ];
  if( sCommand === "init" || asCommands.has( sCommand )){
    const sCommandPath = path.join(
      sDirBin,
      sCommand === "init" ? "concord-init"
        : sCommand === "migrate" ? "concord-migrate" : sCommand
    );
    const aResult = fSpawn( sNode, [ sCommandPath, ...vsArg.slice( 1 ) ], {
      cwd: sDirRoot, stdio: "inherit"
    });
    if( aResult.error !== undefined ){
      fWriteErr( `concord: unable to run ${sCommand}: ${aResult.error.message}\n` );
      return 1;
    }
    return aResult.status === null ? 1 : aResult.status;
  }

  fWriteErr( sUsage );
  return 2;
};

module.exports = { fzMain, sUsage };
