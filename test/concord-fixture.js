"use strict";

const fs = require( "fs" );
const path = require( "path" );

const sDirRepo = path.join( __dirname, ".." );
const sPathSpecMap = path.join( sDirRepo, "bin", "spec-map" );
const sPathSpecCoverage = path.join( sDirRepo, "bin", "spec-coverage" );

const aCoverageFixture = {
  runs: [
    { name: "root", directory: "." },
    { name: "web", directory: "packages/web-client" }
  ],
  commands_before: [],
  source_directories: [ "src", "packages/*/src", "scripts", "eval" ],
  review_file: "spec-coverage-review.md"
};

const aConfigFixture = {
  name: "Fixture",
  suites: [
    { name: "root", directories: [ "test" ] },
    { name: "web", directories: [ "packages/web-client/test" ] },
    { name: "remote-pacts", directories: [ "packages/remote-pacts/test" ] }
  ],
  languages: [ "javascript", "css" ],
  read_directories: [ "src", "scripts", "test", "packages/*", "lib", "web" ],
  ignored_directories: [ "node_modules" ],
  record_file: "test/interactive-passes.jsonl"
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
