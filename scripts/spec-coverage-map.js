// @implements s-1ysu8b@22d704d
// @implements s-e31j3s@8308811
// @implements s-2ievqg@7a7a4e9
// @implements s-4ppmq1@37f49d5
// @implements s-5d2c66@ad124de
// @implements s-g34sjl@00728c3
// @implements s-a15jla@46efff6
// @implements s-0295lu@4b88f3f
// @implements s-lhwdqe@03f70a8
// @implements s-kp5fav@f34662e
// @implements s-8ixmxa@32915a9
// @implements s-m0ujxb@03a5d5b
// @implements s-vqckkr@0e48f69
// @implements s-4ne8xs@f3e543e
// @implements s-vwvdtj@26b11d4
// @implements s-ba6b5c@a60801b
// @implements s-jr9fxe@06e6843
// @implements s-2ggdsa@c4eed56
// @implements s-xk9tq1@fa0d181
// @implements s-bbd75g@9d2bf8c
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const {
  faModel,
  faRoots,
  fasIdProved,
  fsWords,
  fvnLineStart,
  fnLineAt,
  TreeReader
} = require( "./spec-map.js" );
const { fsPosix, fsSha1 } = require( "./spec-coverage-collect.js" );
const { fsHashForRegion } = require( "./spec-coverage-measure.js" );

const sVerdictMissing = "missing-test";
const sVerdictUnspecified = "unspecified";
const reEntryLead = /^\s*[*+-]\s+\S+:\d+-\d+/;
const reEntry = new RegExp(
  "^\\*\\s+(\\S+):(\\d+)-(\\d+)\\s+([0-9a-f]{7})\\s+("
  + sVerdictMissing + "|" + sVerdictUnspecified + ")\\s+—\\s+(.*\\S)\\s*$"
);
const sMarkStale = "  [stale measurement]";
const sNoteUnproving = "  (executed only by tests proving nothing)";
const asGranularityNote = {
  test: "a line executed outside any one test is attributed to every test "
    + "in its file",
  file: "a line is attributed to every test in each file that executed it"
};

const cCharUnmeasured = 200;
const asTitleForKind = {
  env: "process started with an environment that drops the measurement's "
    + "settings",
  node: "Node.js process exited with no coverage collected",
  bundle: "built bundle with no source map"
};

const fvsSortedUnique = ( vs ) => Array.from( new Set( vs )).sort();

const faTestIndex = ( aModel, vaTestText ) => {
  const avnLineStartForPath = new Map( vaTestText.map(( aFile ) => [
    fsPosix( aFile.sPath ), fvnLineStart( aFile.sText.split( "\n" ))
  ]));
  return new Map( aModel.vaTestParsed.map(( aTest ) => {
    const vnLineStart = avnLineStartForPath.get( aTest.sPath ) || [ 0 ];
    return [
      aTest.sPath,
      aTest.vaCall
        .filter(( aCall ) => aCall.sKind === "test" )
        .map(( aCall ) => ({
          aCall,
          nLineFirst: aCall.nLine + 1,
          nLineLast: fnLineAt( vnLineStart, Math.max( 0, aCall.nEnd - 1 )) + 1
        }))
    ];
  }));
};

const faCallInnermost = ( vaPlace, nLine ) => vaPlace
  .filter(( aPlace ) => (
    aPlace.nLineFirst <= nLine && nLine <= aPlace.nLineLast
  ))
  .reduce(( aBest, aPlace ) => (
    aBest === null || aPlace.aCall.nStart > aBest.aCall.nStart ? aPlace : aBest
  ), null );

const faCallForUnit = ( aUnit, vaPlace ) => {
  if( aUnit.sName === null ){ return null;}
  for( const nLine of aUnit.vnLineFrame.slice().reverse()){
    const aPlace = faCallInnermost( vaPlace, nLine );
    if( aPlace !== null ){ return aPlace.aCall;}
  }
  return null;
};

const favaCallRanForPath = ( vaUnit, vaCallForUnit ) => {
  const aasCall = new Map();
  vaUnit.forEach(( aUnit, n ) => {
    if( vaCallForUnit[ n ] === null ){ return;}
    const asCall = aasCall.get( aUnit.sPathTest ) || new Set();
    asCall.add( vaCallForUnit[ n ]);
    aasCall.set( aUnit.sPathTest, asCall );
  });
  return new Map( Array.from( aasCall.entries()).map(( tEntry ) => [
    tEntry[ 0 ], Array.from( tEntry[ 1 ])
  ]));
};

const fvaCallForFile = ( sPathTest, avaCallRan, aTestIndex ) => (
  avaCallRan.get( sPathTest )
  || ( aTestIndex.get( sPathTest ) || []).map(( aPlace ) => aPlace.aCall )
);

const faUnitResolved = ( aUnit, aCall, vaCallFile ) => {
  const vaCall = aCall === null ? vaCallFile : [ aCall ];
  return {
    sPathTest: aUnit.sPathTest,
    aCall,
    vaCall,
    sLabel: aCall === null
      ? aUnit.sPathTest + "  (every test in the file)"
      : aUnit.sPathTest + ":" + ( aCall.nLine + 1 ) + "  " + aCall.sName,
    vsIdStmt: fvsSortedUnique( vaCall.flatMap(( aC ) => (
      aC.vaStmt.map(( aStmt ) => aStmt.sId )
    ))),
    vsOwner: fvsSortedUnique(
      vaCall.flatMap(( aC ) => Array.from( aC.asOwner ))
    )
  };
};

const faAttributionForUnits = ( vaUnit ) => ({
  vsTest: fvsSortedUnique( vaUnit.map(( aUnit ) => aUnit.sLabel )),
  vsIdStmt: fvsSortedUnique( vaUnit.flatMap(( aUnit ) => aUnit.vsIdStmt )),
  vsOwner: fvsSortedUnique( vaUnit.flatMap(( aUnit ) => aUnit.vsOwner ))
});

class LinkReader {
  constructor( sDirRoot, aConfig ){
    this.reader = new TreeReader( sDirRoot, aConfig );
  }

  faLinks(){
    const vaTest = this.reader.fvaTest();
    const aModel = faModel({ vaSpec: this.reader.fvaSpec(), vaTest });
    return { aModel, aTestIndex: faTestIndex( aModel, vaTest ) };
  }
}

const fbStaleFile = ( sDirRoot, sPath, aFile ) => {
  const sPathAbs = path.join( sDirRoot, sPath );
  return (
    !fs.existsSync( sPathAbs )
    || fsSha1( fs.readFileSync( sPathAbs, "utf8" )) !== aFile.sHash
  );
};

const fvaUnitResolved = ( vaUnitMeasured, aTestIndex ) => {
  const vaCallForUnit = vaUnitMeasured.map(( aUnit ) => faCallForUnit(
    aUnit, aTestIndex.get( aUnit.sPathTest ) || []
  ));
  const avaCallRan = favaCallRanForPath( vaUnitMeasured, vaCallForUnit );
  return vaUnitMeasured.map(( aUnit, n ) => faUnitResolved(
    aUnit,
    vaCallForUnit[ n ],
    fvaCallForFile( aUnit.sPathTest, avaCallRan, aTestIndex )
  ));
};

const ffaAttributionCached = ( vaUnit ) => {
  const aaForKey = new Map();
  return ( vnUnit ) => {
    const sKey = vnUnit.join( "," );
    if( !aaForKey.has( sKey )){
      aaForKey.set( sKey, faAttributionForUnits(
        vnUnit.map(( nUnit ) => vaUnit[ nUnit ])
      ));
    }
    return aaForKey.get( sKey );
  };
};

const faMapJoined = ({ sDirRoot, aMeasurement, aLinks }) => {
  const vaUnit = fvaUnitResolved( aMeasurement.vaUnit, aLinks.aTestIndex );
  const faAttribution = ffaAttributionCached( vaUnit );
  const absStale = new Map( Object.entries( aMeasurement.aFile ).map((
    tEntry
  ) => [ tEntry[ 0 ], fbStaleFile( sDirRoot, tEntry[ 0 ], tEntry[ 1 ]) ]));
  return {
    aMeasurement,
    aLinks,
    vaUnit,
    absStale,
    vaRegion: aMeasurement.vaRegion.map(( aRegion ) => {
      const aAttribution = faAttribution( aRegion.vnUnit );
      return {
        ...aRegion,
        bStale: absStale.get( aRegion.sPath ) === true,
        aAttribution,
        ...aAttribution
      };
    })
  };
};

const faEntryForLine = ( sLine, nLine ) => {
  const vsGroup = sLine.match( reEntry );
  const bLead = reEntryLead.test( sLine );
  if( vsGroup === null ){
    return bLead ? { nLine, sText: sLine.trim(), bMalformed: true } : null;
  }
  const nFirst = Number( vsGroup[ 2 ]);
  const nLast = Number( vsGroup[ 3 ]);
  return {
    nLine,
    sText: sLine.trim(),
    bMalformed: nFirst < 1 || nLast < nFirst,
    sPath: vsGroup[ 1 ],
    nFirst,
    nLast,
    sHash: vsGroup[ 4 ],
    sVerdict: vsGroup[ 5 ],
    sReason: vsGroup[ 6 ]
  };
};

const fvaEntryForReview = ( sText ) => (
  sText.split( "\n" )
    .map(( sLine, n ) => faEntryForLine( sLine, n + 1 ))
    .filter( Boolean )
);

const fnFirstForEntry = ( vsLine, aEntry ) => {
  const cLine = aEntry.nLast - aEntry.nFirst + 1;
  const fbAt = ( nFirst ) => (
    nFirst >= 1
    && nFirst + cLine - 1 <= vsLine.length
    && fsHashForRegion( vsLine, nFirst, nFirst + cLine - 1 ) === aEntry.sHash
  );
  if( fbAt( aEntry.nFirst )){ return aEntry.nFirst;}
  let nBest = null;
  for( let n = 1; n + cLine - 1 <= vsLine.length; n++ ){
    const bCloser = nBest === null
      || Math.abs( n - aEntry.nFirst ) < Math.abs( nBest - aEntry.nFirst );
    if( bCloser && fbAt( n )){ nBest = n;}
  }
  return nBest;
};

const fbOverlaps = ( aRegion, nFirst, nLast ) => (
  aRegion.nFirst <= nLast && aRegion.nLast >= nFirst
);

const fbCovered = ( aRegion ) => aRegion.vnUnit.length > 0;

const fbProving = ( aRegion ) => aRegion.vsIdStmt.length > 0;

const fbDischarging = ( aEntry, aRegion ) => (
  aEntry.sVerdict === sVerdictMissing
    ? fbCovered( aRegion )
    : fbProving( aRegion )
);

const faEntryResolved = ( aEntry, aMap ) => {
  const aFile = aMap.aMeasurement.aFile[ aEntry.sPath ];
  const nFirst = aFile === undefined
    ? null
    : fnFirstForEntry( aFile.sText.split( "\n" ), aEntry );
  if( nFirst === null ){ return { ...aEntry, sState: "stale", vaRegion: []};}
  const nLast = nFirst + aEntry.nLast - aEntry.nFirst;
  const vaRegion = aMap.vaRegion.filter(( aRegion ) => (
    aRegion.sPath === aEntry.sPath && fbOverlaps( aRegion, nFirst, nLast )
  ));
  if( vaRegion.length === 0 ){ return { ...aEntry, sState: "stale", vaRegion };}
  const bDischarged = vaRegion.some(( aRegion ) => (
    fbDischarging( aEntry, aRegion )
  ));
  return { ...aEntry, sState: bDischarged ? "discharged" : "live", vaRegion };
};

class ReviewReader {
  constructor( sDirRoot, sPathReview ){
    this.sPath = path.join( sDirRoot, sPathReview );
  }

  fsText(){
    try{ return fs.readFileSync( this.sPath, "utf8" );}
    catch( xErr ){ return null;}
  }
}

const faReview = ( sText, aMap, sPathReview ) => {
  const vaEntry = sText === null ? [] : fvaEntryForReview( sText );
  const vaResolved = vaEntry
    .filter(( aEntry ) => !aEntry.bMalformed )
    .map(( aEntry ) => faEntryResolved( aEntry, aMap ));
  const aentryForRegion = new Map();
  vaResolved
    .filter(( aEntry ) => aEntry.sState === "live" )
    .forEach(( aEntry ) => aEntry.vaRegion.forEach(( aRegion ) => {
      if( !aentryForRegion.has( aRegion )){
        aentryForRegion.set( aRegion, aEntry );
    }}));
  return {
    sPath: sPathReview,
    bAbsent: sText === null,
    aentryForRegion,
    vaMalformed: vaEntry.filter(( aEntry ) => aEntry.bMalformed ),
    vaStale: vaResolved.filter(( aEntry ) => aEntry.sState === "stale" ),
    vaDischarged: vaResolved.filter(( aEntry ) => (
      aEntry.sState === "discharged"
    ))
  };
};

const fsVerdictFor = ( aReview, aRegion ) => {
  const aEntry = aReview.aentryForRegion.get( aRegion );
  return aEntry === undefined ? null : aEntry.sVerdict;
};

const fsMarkStale = ( aMap, sPath ) => (
  aMap.absStale.get( sPath ) === false ? "" : sMarkStale
);

const fsPlaceRegion = ( aRegion ) => (
  aRegion.sPath + ":" + aRegion.nFirst + "-" + aRegion.nLast
);

const fsLineUncovered = ( aMap, aReview, aRegion ) => {
  const aEntry = aReview.aentryForRegion.get( aRegion );
  return "    " + fsPlaceRegion( aRegion ) + "  " + aRegion.sHash
    + ( fbCovered( aRegion ) ? sNoteUnproving : "" )
    + ( aEntry === undefined ? "" : " — " + aEntry.sReason )
    + fsMarkStale( aMap, aRegion.sPath );
};

const fvsLineAttribution = ( aRegion, sIndent ) => [
  [ "test", aRegion.vsTest ],
  [ "statement", aRegion.vsIdStmt ],
  [ "owner spec", aRegion.vsOwner ]
].flatMap(( tList ) => tList[ 1 ].map(( s ) => (
  sIndent + tList[ 0 ] + "  " + s
)));

const fsHeading = ( sTitle, c ) => sTitle + " (" + c + "):";

const fvsLineHeader = ( aMeasurement ) => [
  "granularity: " + aMeasurement.sGranularity + " — "
  + asGranularityNote[ aMeasurement.sGranularity ],
  "revision: " + aMeasurement.sRevision
  + "  dirty: " + ( aMeasurement.bDirty ? "yes" : "no" )
  + "  measured: " + aMeasurement.sTime
].concat( Object.entries( aMeasurement.aSuite ).map(( tSuite ) => (
  tSuite[ 0 ] + " suite: " + tSuite[ 1 ].cPassed + " passed, "
  + tSuite[ 1 ].cFailed + " failed, " + tSuite[ 1 ].cSkipped + " skipped"
)));

const fvsSectionUncovered = ( aMap, aReview ) => {
  const vaUncovered = aMap.vaRegion.filter(( aRegion ) => (
    !fbCovered( aRegion )
  ));
  const fvaFor = ( sVerdict ) => vaUncovered.filter(( aRegion ) => (
    fsVerdictFor( aReview, aRegion ) === sVerdict
  ));
  const vaUnspecified = aMap.vaRegion.filter(( aRegion ) => (
    fsVerdictFor( aReview, aRegion ) === sVerdictUnspecified
    && !fbProving( aRegion )
  ));
  const fvsGroup = ( sTitle, vaRegion ) => [
    "  " + fsHeading( sTitle, vaRegion.length )
  ].concat( vaRegion.map(( aRegion ) => (
    fsLineUncovered( aMap, aReview, aRegion )
  )));
  return [ fsHeading( "(a) Uncovered", vaUncovered.length )].concat(
    fvsGroup( "unclassified", fvaFor( null )),
    fvsGroup(
      sVerdictMissing + " — a test is owed", fvaFor( sVerdictMissing )
    ),
    fvsGroup(
      sVerdictUnspecified + " — findings for the architect: no spec states "
      + "what this code does",
      vaUnspecified
    )
  );
};

const fbUnspecifiedCovered = ( aRegion ) => (
  fbCovered( aRegion ) && !fbProving( aRegion )
);

const fvsSectionCoveredUnspecified = ( aMap ) => {
  const vaRegion = aMap.vaRegion.filter( fbUnspecifiedCovered );
  return [ fsHeading( "(b) Covered but unspecified", vaRegion.length )]
    .concat( vaRegion.flatMap(( aRegion ) => [
      "  " + fsPlaceRegion( aRegion ) + fsMarkStale( aMap, aRegion.sPath )
    ].concat( fvsLineAttribution( aRegion, "    " ))));
};

const fsLineEntry = ( sPathReview, aEntry, sWhy ) => (
  "  " + sPathReview + ":" + aEntry.nLine + "  " + aEntry.sText + "  (" + sWhy
  + ")"
);

const fvsSectionReview = ( aReview ) => {
  const fsLine = ( aEntry, sWhy ) => fsLineEntry( aReview.sPath, aEntry, sWhy );
  const vsLine = aReview.vaMalformed
    .map(( aEntry ) => fsLine( aEntry, "malformed" ))
    .concat( aReview.vaStale.map(( aEntry ) => (
      fsLine( aEntry, "stale: its code is found nowhere in its file" )
    )))
    .concat( aReview.vaDischarged.map(( aEntry ) => (
      fsLine( aEntry, "discharged: a test now executes it; removable" )
    )));
  return [ fsHeading( "(c) Review file problems", vsLine.length )]
    .concat( aReview.bAbsent ? [ "  " + aReview.sPath + " is absent" ] : [])
    .concat( vsLine );
};

const fsTextShort = ( sText ) => {
  const sFlat = sText.replace( /\s+/g, " " ).trim();
  return sFlat.length > cCharUnmeasured
    ? sFlat.slice( 0, cCharUnmeasured - 1 ) + "…"
    : sFlat;
};

const fvsSectionUnmeasured = ( aMap ) => {
  const vaEntry = aMap.aMeasurement.vaUnmeasured || [];
  return [ fsHeading( "(d) Unmeasured execution", vaEntry.length )]
    .concat( vaEntry.length === 0 ? [ "  none" ] : [])
    .concat( vaEntry.flatMap(( aEntry ) => [
      "  " + asTitleForKind[ aEntry.sKind ] + ": " + fsTextShort( aEntry.sText )
    ].concat( fvsSortedUnique( aEntry.vnUnit.map(( nUnit ) => (
      aMap.vaUnit[ nUnit ].sLabel
    ))).map(( sLabel ) => "    test  " + sLabel ))));
};

const fsReport = ( aMap, aReview ) => (
  fvsLineHeader( aMap.aMeasurement ).concat(
    fvsSectionUncovered( aMap, aReview ),
    fvsSectionCoveredUnspecified( aMap ),
    fvsSectionReview( aReview ),
    fvsSectionUnmeasured( aMap )
  ).join( "\n" ) + "\n"
);

class Interner {
  constructor(){
    this.anForX = new Map();
    this.vx = [];
  }

  fn( x ){
    if( !this.anForX.has( x )){
      this.anForX.set( x, this.vx.length );
      this.vx.push( x );
    }
    return this.anForX.get( x );
  }
}

const faMapFile = ( aMap ) => {
  const internTest = new Interner();
  const internAttribution = new Interner();
  const vaRegion = aMap.vaRegion.map(( aRegion ) => ({
    sPath: aRegion.sPath,
    nFirst: aRegion.nFirst,
    nLast: aRegion.nLast,
    bStale: aRegion.bStale,
    nAttribution: internAttribution.fn( aRegion.aAttribution )
  }));
  const vaAttribution = internAttribution.vx.map(( aAttribution ) => ({
    vnTest: aAttribution.vsTest.map(( sTest ) => internTest.fn( sTest )),
    vsIdStmt: aAttribution.vsIdStmt,
    vsOwner: aAttribution.vsOwner
  }));
  return {
    sGranularity: aMap.aMeasurement.sGranularity,
    sRevision: aMap.aMeasurement.sRevision,
    bDirty: aMap.aMeasurement.bDirty,
    sTime: aMap.aMeasurement.sTime,
    vsTest: internTest.vx,
    vaAttribution,
    vaRegion
  };
};

const fsFile = ( aMap, sPath ) => {
  const vaRegion = aMap.vaRegion.filter(( aRegion ) => (
    aRegion.sPath === sPath
  ));
  const vsLine = fvsLineHeader( aMap.aMeasurement ).slice( 0, 1 ).concat(
    sPath + fsMarkStale( aMap, sPath )
  );
  if( aMap.aMeasurement.aFile[ sPath ] === undefined ){
    return vsLine.concat( "  not in the last measurement" ).join( "\n" ) + "\n";
  }
  return vsLine.concat( vaRegion.flatMap(( aRegion ) => [
    "  " + aRegion.nFirst + "-" + aRegion.nLast + "  " + aRegion.sHash
    + ( fbCovered( aRegion ) ? "" : "  uncovered" )
  ].concat( fvsLineAttribution( aRegion, "    " )))).join( "\n" ) + "\n";
};

const fvaMarkerBeneath = ( aModel, aMarker ) => {
  const vaRoot = faRoots( aModel, fasIdProved( aModel )).vaRoot;
  const avaConclusion = new Map( vaRoot.map(( aRoot ) => [
    aRoot.aMarker, aRoot.vaConclusion.map(( aC ) => aC.aMarker )
  ]));
  const asSeen = new Set([ aMarker ]);
  const vaTodo = [ aMarker ];
  while( vaTodo.length > 0 ){
    ( avaConclusion.get( vaTodo.pop()) || []).forEach(( aNext ) => {
      if( !asSeen.has( aNext )){
        asSeen.add( aNext );
        vaTodo.push( aNext );
    }});
  }
  return Array.from( asSeen );
};

const fsSid = ( aMap, aMarker ) => {
  const aModel = aMap.aLinks.aModel;
  const vaMarker = fvaMarkerBeneath( aModel, aMarker );
  const asId = new Set( vaMarker.map(( aM ) => aM.sId ).filter( Boolean ));
  const vaCall = aModel.vaCallTest.filter(( aCall ) => (
    aCall.vaStmt.some(( aStmt ) => asId.has( aStmt.sId ))
  ));
  const asCall = new Set( vaCall );
  const vaRegion = aMap.vaRegion.filter(( aRegion ) => (
    aRegion.vnUnit.some(( nUnit ) => (
      aMap.vaUnit[ nUnit ].vaCall.some(( aCall ) => asCall.has( aCall ))
  ))));
  const vsLine = fvsLineHeader( aMap.aMeasurement ).slice( 0, 1 ).concat(
    aMarker.sPath + ":" + aMarker.nLine + "  " + aMarker.sId + "  "
    + fsWords( aMarker.sText )
  ).concat( vaMarker.length > 1
    ? [ "statements beneath it: " + Array.from( asId )
      .filter(( sId ) => sId !== aMarker.sId ).join( ", " )]
    : []
  );
  if( vaCall.length === 0 ){
    return vsLine.concat( "no test proves " + aMarker.sId ).join( "\n" ) + "\n";
  }
  return vsLine
    .concat( fsHeading( "tests proving it", vaCall.length ))
    .concat( vaCall.map(( aCall ) => (
      "  " + aCall.sPath + ":" + ( aCall.nLine + 1 ) + "  " + aCall.sName
    )))
    .concat( fsHeading( "regions those tests execute", vaRegion.length ))
    .concat( vaRegion.map(( aRegion ) => (
      "  " + fsPlaceRegion( aRegion ) + fsMarkStale( aMap, aRegion.sPath )
    )))
    .join( "\n" ) + "\n";
};

module.exports = {
  LinkReader,
  ReviewReader,
  faMapJoined,
  faReview,
  fsReport,
  faMapFile,
  fsFile,
  fsSid
};
