"use strict";

const fs = require( "fs" );
const path = require( "path" );

const sDirRepo = path.join( __dirname, ".." );
const sPathSpecMap = path.join( sDirRepo, "bin", "spec-map" );
const sPathSpecCoverage = path.join( sDirRepo, "bin", "spec-coverage" );

const aCoverageFixture = {
  vaRun: [
    { sName: "root", sDirRun: "." },
    { sName: "web", sDirRun: "packages/web-client" }
  ],
  vsCommandBefore: [],
  vsDirSource: [ "src", "packages/*/src", "scripts", "eval" ],
  sPathReview: "spec-coverage-review.md"
};

const aConfigFixture = {
  sName: "Fixture",
  vaSuite: [
    { sName: "root", vsDir: [ "test" ] },
    { sName: "web", vsDir: [ "packages/web-client/test" ] },
    { sName: "remote-pacts", vsDir: [ "packages/remote-pacts/test" ] }
  ],
  vsLanguage: [ "javascript", "css" ],
  vsDirRead: [ "src", "scripts", "test", "packages/*" ],
  vsDirIgnored: [ "node_modules" ],
  sPathRecord: "test/interactive-passes.jsonl"
};

const fsConcordJson = ( aOverride ) => JSON.stringify(
  { ...aConfigFixture, ...( aOverride || {}) }, null, 2
) + "\n";

const fWriteConcord = ( sDir, aOverride ) => {
  fs.mkdirSync( sDir, { recursive: true });
  fs.writeFileSync(
    path.join( sDir, "concord.json" ), fsConcordJson( aOverride )
  );
};

module.exports = {
  sPathSpecMap,
  sPathSpecCoverage,
  aConfigFixture,
  aCoverageFixture,
  fsConcordJson,
  fWriteConcord
};
