// @tested-by test/spec-coverage-jest.test.js#tu-b4802450
"use strict";

const path = require( "path" );
const crypto = require( "crypto" );

const sEnvRun = "SPEC_COVERAGE_RUN";
const sEnvEnvironment = "SPEC_COVERAGE_ENVIRONMENT";
const sEnvV8 = "NODE_V8_COVERAGE";
const sKeyTest = "spec-coverage.nKeyTest";
const reFrame =/\(?((?:\/|[A-Za-z]:\\)[^():]*):(\d+):(\d+)\)?\s*$/;

const fsSha1 = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
);

const fvzCount = ( aFileCov ) => Object.values( aFileCov.s );

const fvzRaised = ( vzBefore, vzAfter ) => {
  const vz = [];
  vzAfter.forEach(( z, n ) => {
    const dz = z - ( vzBefore === undefined ? 0 : vzBefore[ n ] || 0 );
    if( dz > 0 ){ vz.push( n, dz );}
  });
  return vz;
};

const favzSnapshot = ( aCoverage ) => Object.fromEntries(
  Object.entries( aCoverage || {}).map(( tEntry ) => [
    tEntry[ 0 ], fvzCount( tEntry[ 1 ])
  ])
);

// @implements s-l38b55@a9d4313
const favzRaised = ( avzBefore, avzAfter ) => Object.fromEntries(
  Object.entries( avzAfter )
    .map(( tEntry ) => [
      tEntry[ 0 ], fvzRaised( avzBefore[ tEntry[ 0 ]], tEntry[ 1 ])
    ])
    .filter(( tEntry ) => tEntry[ 1 ].length > 0 )
);

// @implements s-l38b55@a9d4313
// @implements s-m3tqg6@8e17ef1
// @implements s-yzz1r5@16c2353
const fvnLineFrameForStack = ( sStack, sPathTest ) => (
  String( sStack || "" ).split( "\n" )
    .map(( sLine ) => sLine.match( reFrame ))
    .filter(( vsGroup ) => vsGroup !== null && vsGroup[ 1 ] === sPathTest )
    .map(( vsGroup ) => Number( vsGroup[ 2 ]))
);

const fsPathWindow = ( sDirRun, sPathTest ) => path.join(
  sDirRun, "win-" + fsSha1( sPathTest ) + ".json"
);

const fsPathSpawnLog = ( sDirRun, sPathTest ) => path.join(
  sDirRun, "spawn-" + fsSha1( sPathTest ) + ".json"
);

const fsDirV8ForTest = ( sDirRun, sPathTest ) => path.join(
  sDirRun, "v8", fsSha1( sPathTest )
);

module.exports = {
  sEnvRun,
  sEnvEnvironment,
  sEnvV8,
  sKeyTest,
  fsSha1,
  fsPathSpawnLog,
  fsDirV8ForTest,
  fvzCount,
  favzSnapshot,
  favzRaised,
  fvnLineFrameForStack,
  fsPathWindow
};
