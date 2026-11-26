// @tested-by test/concord-cli.test.js
// @implements s-4pq89a@7127ba0
"use strict";

const { spawnSync } = require( "child_process" );
const path = require( "path" );

// @implements s-mo4ncx@7fcbe1b
// @implements s-48tk0i@7bc9472
// @implements s-qwhv92@cc699b1
const asCommands = new Set([
  "agents-sync", "concord-hook", "context", "link-propose", "link-refine", "migrate",
  "spec-conflicts", "spec-coverage", "spec-map", "tree"
]);
const sUsage = (
  "usage: concord <utility> [arguments]\n"
  + "utilities: agents-sync, concord-hook, init, link-propose, link-refine, "
  + "context, migrate, spec-conflicts, spec-coverage, spec-map, tree\n"
);

// @implements s-4pyvbb@ca117f6
// @implements s-ssquhw@5229772
// @implements s-39o0xv@51b819a
// @implements s-0scrxa@422bf40
// @implements s-n5ue8s@5c90c01
// @implements s-mo4ncx@7fcbe1b
// @implements s-wq42my@339610a
// @implements s-hp433f@86be765
// @implements s-48tk0i@7bc9472
// @implements s-qwhv92@cc699b1
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
