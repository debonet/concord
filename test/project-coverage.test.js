"use strict";

const path = require( "path" );
const { spawnSync } = require( "child_process" );

const sDirRepo = path.join( __dirname, ".." );

// @proves s-ins4p7@19e76c1
test( "Concord's own complete specs have no unlinked statements, code or tests", () => {
  const aRun = spawnSync(
    process.execPath,
    [ path.join( sDirRepo, "bin", "spec-map" ), "--gate" ],
    { cwd: sDirRepo, encoding: "utf8" }
  );
  expect( aRun.status ).toBe( 0 );
  expect( aRun.stdout ).toBe( "Gate: pass\n" );
  expect( aRun.stderr ).toBe( "" );
});
