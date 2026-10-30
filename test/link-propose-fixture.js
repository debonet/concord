"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { faModel, fzMain: fzSpecMap } = require( "../scripts/spec-map.js" );
const { fzMain } = require( "../scripts/link-propose.js" );
const { fsSha1 } = require( "../scripts/spec-coverage-collect.js" );
const { fWriteConcord } = require( "./concord-fixture.js" );

const sDirRepo = path.join( __dirname, ".." );
const sDirBase = path.join(
  sDirRepo, "tmp", "link-propose-fixture-" + process.pid
);
const reStampWanted = /@@([a-z]-[a-z0-9]{6})/g;
let cFixture = 0;

const aConfigLinkFixture = {
  vaSuite: [{ sName: "root", vsDir: [ "test" ]}],
  vsLanguage: [ "javascript", "css", "html" ],
  vsDirRead: [ "src", "test" ]
};

const fasHashForSpecs = ( aasFile ) => {
  const aModel = faModel({
    vaSpec: Object.entries( aasFile )
      .filter(([ sPath ]) => sPath.startsWith( "specs/" ))
      .map(([ sPath, sText ]) => ({ sPath, sText })),
    vaTest: []
  });
  return new Map( aModel.vaMarker
    .filter(( aMarker ) => aMarker.sId !== null )
    .map(( aMarker ) => [ aMarker.sId, aMarker.sHash ]));
};

const fsStamped = ( sText, asHash ) => sText.replace(
  reStampWanted, ( sAll, sId ) => sId + "@" + asHash.get( sId )
);

const fsDirTree = ( aasFile, aConfig ) => {
  const sDir = path.join( sDirBase, String( cFixture++ ));
  fs.rmSync( sDir, { recursive: true, force: true });
  fWriteConcord( sDir, { ...aConfigLinkFixture, ...( aConfig || {}) });
  const asHash = fasHashForSpecs( aasFile );
  Object.entries( aasFile ).forEach(([ sPath, sText ]) => {
    const sPathAbs = path.join( sDir, sPath );
    fs.mkdirSync( path.dirname( sPathAbs ), { recursive: true });
    fs.writeFileSync( sPathAbs, fsStamped( sText, asHash ));
  });
  return sDir;
};

const fsHashOf = ( aasFile, sId ) => fasHashForSpecs( aasFile ).get( sId );

const faRun = ( sDir, vsArg ) => {
  const aRun = { sOut: "", sErr: "" };
  aRun.z = fzMain(
    vsArg, sDir, ( s ) => { aRun.sOut += s;}, ( s ) => { aRun.sErr += s;}
  );
  return aRun;
};

const fsSpecMap = ( sDir, vsArg ) => {
  let sOut = "";
  fzSpecMap( vsArg, sDir, ( s ) => { sOut += s;}, ( s ) => { sOut += s;});
  return sOut;
};

const fvsSection = ( sReport, sTitle ) => {
  const vsLine = sReport.split( "\n" );
  const n = vsLine.findIndex(( sLine ) => sLine.startsWith( sTitle + " (" ));
  const vs = [];
  for( let m = n + 1; m < vsLine.length; m++ ){
    if( !vsLine[ m ].startsWith( "  " )){ break;}
    vs.push( vsLine[ m ].trim());
  }
  return vs;
};

const fsText = ( sDir, sPath ) => fs.readFileSync(
  path.join( sDir, sPath ), "utf8"
);

const faSnapshot = ( sDir ) => Object.fromEntries(
  fs.readdirSync( sDir, { recursive: true })
    .map(( sPath ) => sPath.split( path.sep ).join( "/" ))
    .filter(( sPath ) => fs.statSync( path.join( sDir, sPath )).isFile())
    .sort()
    .map(( sPath ) => [ sPath, fsText( sDir, sPath ) ])
);

const fnLineOf = ( sText, sNeedle ) => (
  sText.split( "\n" ).findIndex(( sLine ) => sLine.includes( sNeedle )) + 1
);

const fWriteMeasurement = ( sDir, aMeasurement ) => {
  const sPath = path.join( sDir, "tmp", "spec-coverage", "measurement.json" );
  fs.mkdirSync( path.dirname( sPath ), { recursive: true });
  fs.writeFileSync( sPath, JSON.stringify({
    sGranularity: "test",
    sRevision: "abc1234def5678",
    bDirty: false,
    sTime: "2026-10-29T12:00:00.000Z",
    aSuite: {},
    vaUnmeasured: [],
    ...aMeasurement
  }));
};

const faFileMeasured = ( sDir, vsPath ) => Object.fromEntries(
  vsPath.map(( sPath ) => {
    const sText = fsText( sDir, sPath );
    return [ sPath, { sHash: fsSha1( sText ), sText }];
  })
);

const fvsCandidateLines = ( sOut, sId ) => sOut.split( "\n" )
  .filter(( sLine ) => sLine.startsWith( "? " + sId + "@" ));

const fsLineFor = ( sOut, sId, sPath ) => fvsCandidateLines( sOut, sId )
  .find(( sLine ) => sLine.split( " " )[ 2 ] === sPath );

const frScoreFor = ( sOut, sId, sPath ) => Number(
  fsLineFor( sOut, sId, sPath ).split( " " )[ 3 ]
);

const fvsPathCandidate = ( sOut, sId ) => fvsCandidateLines( sOut, sId )
  .map(( sLine ) => sLine.split( " " )[ 2 ]);

const fRemoveFixtures = () => {
  fs.rmSync( sDirBase, { recursive: true, force: true });
};

module.exports = {
  sDirRepo,
  fsDirTree,
  fsHashOf,
  faRun,
  fsSpecMap,
  fvsSection,
  fsText,
  faSnapshot,
  fnLineOf,
  fWriteMeasurement,
  faFileMeasured,
  fvsCandidateLines,
  fsLineFor,
  frScoreFor,
  fvsPathCandidate,
  fRemoveFixtures
};
