// @tested-by test/spec-coverage.test.js
// @implements s-k77gwh@280fec1
// @implements s-toq51s@2181080
// @implements s-aw1u7o@b1c984b
// @implements s-lhwdqe@03f70a8
// @implements s-nk7r14@3eaebff
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { fsPosix, fbPathInScope, fxJsonRead } = require(
  "./spec-coverage-collect.js"
);
const {
  fsDirOut, fsPathMeasurement, SuiteRunner, fzMeasure
} = require( "./spec-coverage-measure.js" );
const {
  LinkReader,
  ReviewReader,
  faMapJoined,
  faReview,
  fsReport,
  faMapFile,
  fsFile,
  fsSid
} = require( "./spec-coverage-map.js" );
const { ConfigReader } = require( "./concord-config.js" );

const sFileMap = "map.json";

const faMapForRoot = ( aCtx, aMeasurement ) => faMapJoined({
  sDirRoot: aCtx.sDirRoot,
  aMeasurement,
  aLinks: new LinkReader( aCtx.sDirRoot, aCtx.aConfig ).faLinks()
});

// @implements s-xd7yc0@45836a2
// @implements s-vn5mcf@35ccc16
const fzReport = ( aCtx, aMeasurement ) => {
  const aMap = faMapForRoot( aCtx, aMeasurement );
  const sPathReview = aCtx.aCoverage.sPathReview;
  fs.writeFileSync(
    path.join( fsDirOut( aCtx.sDirRoot ), sFileMap ),
    JSON.stringify( faMapFile( aMap ))
  );
  aCtx.fWrite( fsReport( aMap, faReview(
    new ReviewReader( aCtx.sDirRoot, sPathReview ).fsText(), aMap, sPathReview
  )));
  return 0;
};

const fsProblemForId = ( sId, cMarker ) => (
  cMarker === 0
    ? "spec-coverage: no spec marks " + sId + "\n"
    : "spec-coverage: " + sId + " is marked at " + cMarker + " places\n"
);

// @implements s-q18fnp@16fcb05
const fzSid = ( aCtx, aMeasurement, sId ) => {
  const aMap = faMapForRoot( aCtx, aMeasurement );
  const vaMarker = aMap.aLinks.aModel.avaMarkerForId.get( sId ) || [];
  if( vaMarker.length !== 1 ){
    aCtx.fWriteErr( fsProblemForId( sId, vaMarker.length ));
    return 1;
  }
  aCtx.fWrite( fsSid( aMap, vaMarker[ 0 ]));
  return 0;
};

const fsScopeShown = ( vsDirSource ) => vsDirSource
  .map(( sDir ) => sDir.replace( /\/*$/, "/" ))
  .join( ", " );

// @implements s-kmdwax@72be12e
// @implements s-sy3erx@af25b4e
// @implements s-m9434k@ce26ae6
const fzFile = ( aCtx, aMeasurement, sArg ) => {
  const vsDirSource = aCtx.aCoverage.vsDirSource;
  const sPath = fsPosix( path.relative(
    aCtx.sDirRoot, path.resolve( aCtx.sDirRoot, sArg || "" )
  ));
  if( !fbPathInScope( sPath, vsDirSource )){
    aCtx.fWriteErr( "spec-coverage: " + sArg + " is not source in scope ("
      + fsScopeShown( vsDirSource ) + ")\n" );
    return 1;
  }
  aCtx.fWrite( fsFile( faMapForRoot( aCtx, aMeasurement ), sPath ));
  return 0;
};

const afzQueryForFlag = {
  "--report": ( aCtx, aMeasurement ) => fzReport( aCtx, aMeasurement ),
  "--sid": ( aCtx, aMeasurement, sArg ) => fzSid( aCtx, aMeasurement, sArg ),
  "--file": ( aCtx, aMeasurement, sArg ) => fzFile( aCtx, aMeasurement, sArg )
};

// @implements s-xd7yc0@45836a2
// @implements s-xd7yc0@45836a2
// @implements s-q18fnp@16fcb05
// @implements s-qmobm8@0f37080
// @implements s-bbd75g@9d2bf8c
const fzQuery = ( aCtx, vsArg ) => {
  const aMeasurement = fxJsonRead( fsPathMeasurement( aCtx.sDirRoot ));
  if( aMeasurement === null ){
    aCtx.fWriteErr( "spec-coverage: no completed measurement under "
      + "tmp/spec-coverage/; run npm run spec-coverage first\n" );
    return 1;
  }
  return afzQueryForFlag[ vsArg[ 0 ]]( aCtx, aMeasurement, vsArg[ 1 ]);
};

// @implements s-c4ht17@d637c42
// @implements s-sywry8@9ecbcbb
// @implements s-vn5mcf@35ccc16
// @implements s-bbd75g@9d2bf8c
const fzMeasureAndReport = ( aCtx ) => {
  fs.mkdirSync( fsDirOut( aCtx.sDirRoot ), { recursive: true });
  const zMeasure = fzMeasure( aCtx );
  if( zMeasure !== 0 ){ return zMeasure;}
  return fzReport( aCtx, fxJsonRead( fsPathMeasurement( aCtx.sDirRoot )));
};

const fsProblemForConfig = ( aRead ) => {
  if( aRead.sProblem !== null ){ return aRead.sProblem;}
  return aRead.aConfig.aCoverage === undefined
    ? "concord.json declares no coverage"
    : null;
};

// @implements s-sywry8@9ecbcbb
// @implements s-pa182t@8008053
// @implements s-4jegoj@05acd9f
// @implements s-xd7yc0@45836a2
// @implements s-bbd75g@9d2bf8c
const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps ) => {
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  const sProblem = fsProblemForConfig( aRead );
  if( sProblem !== null ){
    fWriteErr( "spec-coverage: " + sProblem + "\n" );
    return 2;
  }
  const aCtx = {
    sDirRoot,
    aConfig: aRead.aConfig,
    aCoverage: aRead.aConfig.aCoverage,
    fWrite,
    fWriteErr,
    runner: ( aDeps || {}).runner || new SuiteRunner( sDirRoot, fWriteErr ),
    fsTime: ( aDeps || {}).fsTime || (() => new Date().toISOString())
  };
  if( vsArg.length === 0 ){ return fzMeasureAndReport( aCtx );}
  if( Object.hasOwn( afzQueryForFlag, vsArg[ 0 ])){
    return fzQuery( aCtx, vsArg );
  }
  fWriteErr( "spec-coverage: unknown argument " + vsArg[ 0 ]
    + "; use --report, --sid <id> or --file <path>\n" );
  return 2;
};

module.exports = { fzMain };
