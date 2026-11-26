// @tested-by test/link-propose.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const {
  fnLineAt, fvnLineStart, faRoots, fasIdProved, fvsTermForText
} = require( "./spec-map.js" );
const {
  fsSha1, fsPosix, fxJsonRead
} = require( "./spec-coverage-collect.js" );
const { fsPathMeasurement } = require( "./spec-coverage-measure.js" );
const {
  fbScript, faFactsForFile, TermIndex
} = require( "./link-propose-source.js" );

const reSpace = /\s/;
const reLeadRelative = /^(?:\.\.?\/)+/;
const reEncoded = /[\s,%]/g;
const sReasonStale = "stale hash";
const aWeight = {
  executes: 1.2,
  loads: 1.0,
  reaches: 0.45,
  mentions: 0.8,
  defines: 0.9,
  names: 0.3,
  sibling: 0.6
};
const vsKindTest = [ "loads", "reaches", "mentions" ];

const frLog = ( c ) => Math.log( 1 + c );
const frShared = ( c ) => 1 / ( 1 + Math.log( Math.max( 1, c )));
// @implements s-fbr7pr@356ffee
const fbPathSpaced = ( sPath ) => reSpace.test( sPath );

const fsTermEncoded = ( sTerm ) => sTerm.replace( reEncoded, ( ch ) => (
  "%" + ch.charCodeAt( 0 ).toString( 16 ).toUpperCase().padStart( 2, "0" )
));

const fbMeasurementWell = ( a ) => (
  a !== null && typeof a === "object"
  && Array.isArray( a.vaUnit ) && Array.isArray( a.vaRegion )
  && a.aFile !== null && typeof a.aFile === "object"
);

class CoverageReader {
  constructor( sDirRoot ){
    this.sDirRoot = sDirRoot;
  }

  // @implements s-i4ogyf@33bfa48
  faMeasurement(){
    try{
      const a = fxJsonRead( fsPathMeasurement( this.sDirRoot ));
      return fbMeasurementWell( a ) ? a : null;
    }
    catch( xErr ){ return null;}
  }
}

class LoadGraph {
  constructor( sDirRoot, vsDirIgnored, asTextForPath ){
    this.sDirReal = fs.realpathSync( sDirRoot );
    this.vsDirIgnored = vsDirIgnored;
    this.asTextForPath = asTextForPath;
    this.aaFactsForPath = new Map();
    this.asPathForKey = new Map();
    this.aasLoadForPath = new Map();
  }

  fsText( sPath ){
    if( this.asTextForPath.has( sPath )){
      return this.asTextForPath.get( sPath );
    }
    try{
      return fs.readFileSync( path.join( this.sDirReal, sPath ), "utf8" );
    }
    catch( xErr ){ return "";}
  }

  faFacts( sPath ){
    if( !this.aaFactsForPath.has( sPath )){
      this.aaFactsForPath.set(
        sPath, faFactsForFile( sPath, this.fsText( sPath ))
      );
    }
    return this.aaFactsForPath.get( sPath );
  }

  fsPathProject( sPathAbs ){
    let sReal = null;
    try{ sReal = fs.realpathSync( sPathAbs );}
    catch( xErr ){ return null;}
    const sRel = path.relative( this.sDirReal, sReal );
    if( sRel === "" || sRel.startsWith( ".." ) || path.isAbsolute( sRel )){
      return null;
    }
    return sRel.split( path.sep ).some(( sPart ) => (
      this.vsDirIgnored.includes( sPart )
    )) ? null : fsPosix( sRel );
  }

  fsPathFresh( sDir, sSpecifier ){
    try{
      const sAbs = require.resolve( sSpecifier, { paths: [ sDir ]});
      return path.isAbsolute( sAbs ) ? this.fsPathProject( sAbs ) : null;
    }
    catch( xErr ){ return null;}
  }

  fsPathResolved( sPathFrom, sSpecifier ){
    const sDir = path.dirname( path.join( this.sDirReal, sPathFrom ));
    const sKey = sDir + "\0" + sSpecifier;
    if( !this.asPathForKey.has( sKey )){
      this.asPathForKey.set( sKey, this.fsPathFresh( sDir, sSpecifier ));
    }
    return this.asPathForKey.get( sKey );
  }

  // @implements s-ozip2w@17a2822
  fasLoad( sPath ){
    if( !this.aasLoadForPath.has( sPath )){
      const vsSpecifier = fbScript( sPath )
        ? this.faFacts( sPath ).vsSpecifier
        : [];
      this.aasLoadForPath.set( sPath, new Set( vsSpecifier
        .map(( sSpecifier ) => this.fsPathResolved( sPath, sSpecifier ))
        .filter(( sTarget ) => sTarget !== null )));
    }
    return this.aasLoadForPath.get( sPath );
  }

  // @implements s-2e76bt@a0fb60a
  fasReach( sPath ){
    const asLoad = this.fasLoad( sPath );
    const asSeen = new Set([ sPath ]);
    const vsQueue = Array.from( asLoad );
    for( let n = 0; n < vsQueue.length; n++ ){
      const sNext = vsQueue[ n ];
      if( asSeen.has( sNext )){ continue;}
      asSeen.add( sNext );
      this.fasLoad( sNext ).forEach(( s ) => vsQueue.push( s ));
    }
    return new Set( Array.from( asSeen ).filter(( s ) => (
      s !== sPath && !asLoad.has( s )
    )));
  }
}

const fvaPlaceForTest = ( aTest, sText ) => {
  const vnLineStart = fvnLineStart( sText.split( "\n" ));
  return aTest.vaCall
    .filter(( aCall ) => aCall.sKind === "test" )
    .map(( aCall ) => ({
      aCall,
      nLineFirst: aCall.nLine + 1,
      nLineLast: fnLineAt( vnLineStart, Math.max( 0, aCall.nEnd - 1 )) + 1
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
  if( aUnit.sName === null || !Array.isArray( aUnit.vnLineFrame )){
    return null;
  }
  for( const nLine of aUnit.vnLineFrame.slice().reverse()){
    const aPlace = faCallInnermost( vaPlace, nLine );
    if( aPlace !== null ){ return aPlace.aCall;}
  }
  return null;
};

const fvvaCallForUnits = ( vaUnit, avaPlace ) => {
  const vaCallOwn = vaUnit.map(( aUnit ) => faCallForUnit(
    aUnit, avaPlace.get( aUnit.sPathTest ) || []
  ));
  const avaCallRan = new Map();
  vaUnit.forEach(( aUnit, n ) => {
    if( vaCallOwn[ n ] === null ){ return;}
    const vaCall = avaCallRan.get( aUnit.sPathTest ) || [];
    if( !vaCall.includes( vaCallOwn[ n ])){ vaCall.push( vaCallOwn[ n ]);}
    avaCallRan.set( aUnit.sPathTest, vaCall );
  });
  return vaUnit.map(( aUnit, n ) => {
    if( vaCallOwn[ n ] !== null ){ return [ vaCallOwn[ n ]];}
    return avaCallRan.get( aUnit.sPathTest )
      || ( avaPlace.get( aUnit.sPathTest ) || []).map(( a ) => a.aCall );
  });
};

const fasnUnitForPath = ( aMeasurement, fbFresh ) => {
  const aasnUnit = new Map();
  aMeasurement.vaRegion.forEach(( aRegion ) => {
    if( !Array.isArray( aRegion.vnUnit ) || aRegion.vnUnit.length === 0 ){
      return;
    }
    if( !fbFresh( aRegion.sPath )){ return;}
    const asn = aasnUnit.get( aRegion.sPath ) || new Set();
    aRegion.vnUnit.forEach(( nUnit ) => asn.add( nUnit ));
    aasnUnit.set( aRegion.sPath, asn );
  });
  return aasnUnit;
};

const fAddTo = ( aas, xKey, sValue ) => {
  if( !aas.has( xKey )){ aas.set( xKey, new Set());}
  aas.get( xKey ).add( sValue );
};

// @implements s-m58vba@88398a5
// @implements s-i4ogyf@33bfa48
const faExecution = ( aMeasurement, aModel, fsText, asPathImpl ) => {
  const aExecution = { aasPathForCall: new Map(), aasPathForTest: new Map() };
  if( aMeasurement === null ){ return aExecution;}
  const avaPlace = new Map( aModel.vaTestParsed.map(( aTest ) => [
    aTest.sPath, fvaPlaceForTest( aTest, fsText( aTest.sPath ))
  ]));
  const vaUnit = aMeasurement.vaUnit;
  const vvaCall = fvvaCallForUnits( vaUnit, avaPlace );
  // @implements s-aj3ymw@77e461d
  const fbFresh = ( sPath ) => (
    asPathImpl.has( sPath )
    && aMeasurement.aFile[ sPath ] !== undefined
    && fsSha1( fsText( sPath )) === aMeasurement.aFile[ sPath ].sHash
  );
  fasnUnitForPath( aMeasurement, fbFresh ).forEach(( asn, sPath ) => {
    asn.forEach(( nUnit ) => {
      const aUnit = vaUnit[ nUnit ];
      if( aUnit === undefined ){ return;}
      fAddTo( aExecution.aasPathForTest, aUnit.sPathTest, sPath );
      vvaCall[ nUnit ].forEach(( aCall ) => (
        fAddTo( aExecution.aasPathForCall, aCall, sPath )
      ));
    });
  });
  return aExecution;
};

const favaCallForId = ( aModel ) => {
  const avaCall = new Map();
  aModel.vaCallTest.forEach(( aCall ) => {
    new Set( aCall.vaStmt.map(( aStmt ) => aStmt.sId )).forEach(( sId ) => {
      if( !avaCall.has( sId )){ avaCall.set( sId, []);}
      avaCall.get( sId ).push( aCall );
    });
  });
  return avaCall;
};

const favaConclusionForRoot = ( aModel ) => new Map(
  faRoots( aModel, fasIdProved( aModel )).vaRoot.map(( aRoot ) => [
    aRoot.aMarker,
    aRoot.vaConclusion.map(( aConclusion ) => aConclusion.aMarker )
  ])
);

const fsKeyHeading = ( aSpec, nLine ) => {
  for( let n = nLine - 1; n >= 0; n-- ){
    if( aSpec.vsKind[ n ] === "heading" ){ return aSpec.sPath + ":" + n;}
  }
  return aSpec.sPath + ":-";
};

const fbStmtUnique = ( aModel, aMarker ) => (
  aMarker.sType === "s" && !aMarker.bMalformed && aMarker.sId !== null
  && aModel.avaMarkerForId.get( aMarker.sId ).length === 1
);

const favaSiblingForKey = ( aModel ) => {
  const avaMarker = new Map();
  aModel.vaSpecParsed.forEach(( aSpec ) => aSpec.vaMarker
    .filter(( aMarker ) => fbStmtUnique( aModel, aMarker ))
    .forEach(( aMarker ) => {
      const sKey = fsKeyHeading( aSpec, aMarker.nLine );
      if( !avaMarker.has( sKey )){ avaMarker.set( sKey, []);}
      avaMarker.get( sKey ).push( aMarker );
    }));
  return avaMarker;
};

const fasTailUnique = ( vsPath ) => {
  const acPathForTail = new Map();
  const asPathForTail = new Map();
  vsPath.forEach(( sPath ) => {
    const vsPart = sPath.split( "/" );
    vsPart.forEach(( sPart, n ) => {
      const sTail = vsPart.slice( n ).join( "/" );
      acPathForTail.set( sTail, ( acPathForTail.get( sTail ) || 0 ) + 1 );
      asPathForTail.set( sTail, sPath );
    });
  });
  return new Map( Array.from( asPathForTail ).filter(([ sTail ]) => (
    acPathForTail.get( sTail ) === 1
  )));
};

const fvsEvidenceForCandidate = ( aCandidate ) => [].concat(
  aCandidate.sStale === null ? [] : [ "stale=" + aCandidate.sStale ],
  [ "executes", "loads", "reaches", "mentions" ]
    .filter(( sKind ) => aCandidate.acKind[ sKind ] > 0 )
    .map(( sKind ) => sKind + "=" + aCandidate.acKind[ sKind ]),
  [ "defines", "names" ]
    .filter(( sKind ) => aCandidate.avsTerm[ sKind ].length > 0 )
    .map(( sKind ) => sKind + "=" + aCandidate.avsTerm[ sKind ]
      .map( fsTermEncoded ).join( "," )),
  aCandidate.cSibling > 0 ? [ "sibling=" + aCandidate.cSibling ] : []
);

// @implements s-qzz9rq@7fec6df
// @implements s-qzbfo6@440f4f1
const fzCompareCandidate = ( aA, aB ) => (
  Number( aB.sStale !== null ) - Number( aA.sStale !== null )
  || aB.rScore - aA.rScore
  || ( aA.sPath < aB.sPath ? -1 : aA.sPath > aB.sPath ? 1 : 0 )
);

const faCandidateEmpty = ( sPath ) => ({
  sPath,
  sStale: null,
  acKind: { executes: 0, loads: 0, reaches: 0, mentions: 0 },
  acSpread: { executes: 0, loads: 0, reaches: 0, mentions: 0 },
  avsTerm: { defines: [], names: []},
  cSibling: 0
});

class EvidenceReader {
  constructor({ aModel, graph, aExecution, vsPathImpl }){
    this.aModel = aModel;
    this.graph = graph;
    this.aExecution = aExecution;
    this.vsPathImpl = vsPathImpl;
    this.asPathImpl = new Set( vsPathImpl );
    this.asPathTail = fasTailUnique( vsPathImpl );
    this.aasForKey = new Map();
  }

  fasMemo( sKey, fas ){
    if( !this.aasForKey.has( sKey )){ this.aasForKey.set( sKey, fas());}
    return this.aasForKey.get( sKey );
  }

  fasImpl( as ){
    return new Set( Array.from( as ).filter(( sPath ) => (
      this.asPathImpl.has( sPath )
    )));
  }

  // @implements s-twarwp@16b596c
  fsPathMentioned( sLiteral ){
    const sTail = sLiteral.replace( reLeadRelative, "" );
    if( this.asPathImpl.has( sTail )){ return sTail;}
    return this.asPathTail.get( sTail ) || null;
  }

  // @implements s-twarwp@16b596c
  fasForTest( sKind, sPathTest ){
    return this.fasMemo( sKind + "\0" + sPathTest, () => {
      if( sKind === "loads" ){
        return this.fasImpl( this.graph.fasLoad( sPathTest ));
      }
      if( sKind === "reaches" ){
        return this.fasImpl( this.graph.fasReach( sPathTest ));
      }
      if( sKind === "executes" ){
        return this.aExecution.aasPathForTest.get( sPathTest ) || new Set();
      }
      return new Set( this.graph.faFacts( sPathTest ).vsLiteral
        .map(( sLiteral ) => this.fsPathMentioned( sLiteral ))
        .filter(( sPath ) => sPath !== null ));
    });
  }

  fcSpreadTest( sPathTest ){
    return new Set([ "loads", "reaches", "executes" ].flatMap(( sKind ) => (
      Array.from( this.fasForTest( sKind, sPathTest ))
    ))).size;
  }

  fasExecCall( aCall ){
    return this.aExecution.aasPathForCall.get( aCall ) || new Set();
  }

  fbTouches( sPathTest, sPath ){
    return [ "loads", "reaches", "mentions", "executes" ].some(( sKind ) => (
      this.fasForTest( sKind, sPathTest ).has( sPath )
    ));
  }
}

class Proposer {
  constructor( aModel, evidence ){
    this.aModel = aModel;
    this.evidence = evidence;
    this.avaCallForId = favaCallForId( aModel );
    this.avaConclusion = favaConclusionForRoot( aModel );
    this.avaSibling = favaSiblingForKey( aModel );
    this.aSpecForPath = new Map( aModel.vaSpecParsed.map(( aSpec ) => [
      aSpec.sPath, aSpec
    ]));
    this.avsPathForId = new Map();
    aModel.aLines.vaImplements.forEach(( aRef ) => fAddTo(
      this.avsPathForId, aRef.sId, aRef.sPath
    ));
    this.avaStaleForId = new Map();
    aModel.aLines.vaCodeRef
      .filter(( aRef ) => (
        aRef.sKind === "implements" && aRef.sReason === sReasonStale
      ))
      .forEach(( aRef ) => {
        const vaStale = this.avaStaleForId.get( aRef.sTarget ) || [];
        vaStale.push( aRef );
        this.avaStaleForId.set( aRef.sTarget, vaStale );
      });
    this.acStmtForPath = null;
    this.aasPathForTerm = null;
    this.aasDefineForPath = new Map();
  }

  fvaCallProving( aMarker ){
    const asCall = new Set();
    const asMarkerSeen = new Set();
    const vaMarker = [ aMarker ];
    while( vaMarker.length > 0 ){
      const aNext = vaMarker.pop();
      if( asMarkerSeen.has( aNext )){ continue;}
      asMarkerSeen.add( aNext );
      ( this.avaCallForId.get( aNext.sId ) || []).forEach(( aCall ) => (
        asCall.add( aCall )
      ));
      ( this.avaConclusion.get( aNext ) || []).forEach(( aConclusion ) => (
        vaMarker.push( aConclusion )
      ));
    }
    return Array.from( asCall );
  }

  fvsPathTest( vaCall ){
    return Array.from( new Set( vaCall.map(( aCall ) => aCall.sPath ))).sort();
  }

  fasTouched( aMarker ){
    const vaCall = this.avaCallForId.get( aMarker.sId ) || [];
    const asPath = new Set();
    this.fvsPathTest( vaCall ).forEach(( sPathTest ) => [ "loads", "reaches" ]
      .forEach(( sKind ) => this.evidence.fasForTest( sKind, sPathTest )
        .forEach(( sPath ) => asPath.add( sPath ))));
    vaCall.forEach(( aCall ) => this.evidence.fasExecCall( aCall )
      .forEach(( sPath ) => asPath.add( sPath )));
    return asPath;
  }

  fcStmtForPath( sPath ){
    if( this.acStmtForPath === null ){
      this.acStmtForPath = new Map();
      this.aModel.vaMarker
        .filter(( aMarker ) => fbStmtUnique( this.aModel, aMarker ))
        .forEach(( aMarker ) => this.fasTouched( aMarker ).forEach((
          sPathTouched
        ) => this.acStmtForPath.set(
          sPathTouched, ( this.acStmtForPath.get( sPathTouched ) || 0 ) + 1
        )));
    }
    return this.acStmtForPath.get( sPath ) || 0;
  }

  // @implements s-50fqg8@d697296
  fIndexTerms( vaMarker ){
    const vsTerm = vaMarker.flatMap(( aMarker ) => (
      fvsTermForText( aMarker.sText )
    ));
    const index = new TermIndex( vsTerm );
    this.aasPathForTerm = new Map();
    this.evidence.vsPathImpl.forEach(( sPath ) => {
      const aFacts = this.evidence.graph.faFacts( sPath );
      this.aasDefineForPath.set( sPath, aFacts.asDefine );
      index.fasTermIn( aFacts.sCode ).forEach(( sTerm ) => (
        fAddTo( this.aasPathForTerm, sTerm, sPath )
      ));
    });
  }

  fasPathForTerm( sTerm ){
    return this.aasPathForTerm.get( sTerm ) || new Set();
  }

  // @implements s-x6xwzh@4f3c2c3
  fvaSibling( aMarker ){
    const aSpec = this.aSpecForPath.get( aMarker.sPath );
    return ( this.avaSibling.get( fsKeyHeading( aSpec, aMarker.nLine )) || [])
      .filter(( aOther ) => aOther.sId !== aMarker.sId );
  }

  // @implements s-m58vba@88398a5
  fAddCalls( faCandidate, vaCall ){
    vaCall.forEach(( aCall ) => {
      const asPath = this.evidence.fasExecCall( aCall );
      asPath.forEach(( sPath ) => {
        const aCandidate = faCandidate( sPath );
        aCandidate.acKind.executes++;
        aCandidate.acSpread.executes += asPath.size;
      });
    });
  }

  // @implements s-ozip2w@17a2822
  // @implements s-2e76bt@a0fb60a
  // @implements s-twarwp@16b596c
  fAddTests( faCandidate, vsPathTest ){
    vsPathTest.forEach(( sPathTest ) => {
      const cSpread = this.evidence.fcSpreadTest( sPathTest );
      vsKindTest.forEach(( sKind ) => this.evidence
        .fasForTest( sKind, sPathTest )
        .forEach(( sPath ) => {
          const aCandidate = faCandidate( sPath );
          aCandidate.acKind[ sKind ]++;
          aCandidate.acSpread[ sKind ] += cSpread;
        }));
    });
  }

  // @implements s-50fqg8@d697296
  fAddTerms( faCandidate, aMarker ){
    fvsTermForText( aMarker.sText ).forEach(( sTerm ) => (
      this.fasPathForTerm( sTerm ).forEach(( sPath ) => {
        const sKind = this.aasDefineForPath.get( sPath ).has( sTerm )
          ? "defines"
          : "names";
        faCandidate( sPath ).avsTerm[ sKind ].push( sTerm );
      })
    ));
  }

  // @implements s-x6xwzh@4f3c2c3
  fAddSiblings( faCandidate, aMarker ){
    this.fvaSibling( aMarker ).forEach(( aOther ) => (
      this.avsPathForId.get( aOther.sId ) || new Set()
    ).forEach(( sPath ) => { faCandidate( sPath ).cSibling++; }));
  }

  // @implements s-kbxici@7728efc
  fAddStale( faCandidate, aMarker ){
    ( this.avaStaleForId.get( aMarker.sId ) || []).forEach(( aRef ) => {
      const aCandidate = faCandidate( aRef.sPath );
      if( aCandidate.sStale === null ){ aCandidate.sStale = aRef.sStamp;}
    });
  }

  frTermWeight( sTerm ){
    return frShared( this.fasPathForTerm( sTerm ).size );
  }

  // @implements s-qhnsu3@fbda5ed
  // @implements s-2f5c83@45e1d61
  // @implements s-gfqr47@50e2cc1
  // @implements s-kuxzw7@4e53af8
  // @implements s-wn8kvy@22ff217
  // @implements s-3iaiek@c173bfd
  frRaw( aCandidate ){
    const rShared = frShared( this.fcStmtForPath( aCandidate.sPath ));
    const rKind = Object.keys( aCandidate.acKind ).reduce(( r, sKind ) => {
      const c = aCandidate.acKind[ sKind ];
      if( c === 0 ){ return r;}
      return r + aWeight[ sKind ] * frLog( c )
        * frShared( aCandidate.acSpread[ sKind ] / c )
        * ( sKind === "mentions" ? 1 : rShared );
    }, 0 );
    const rTerm = [ "defines", "names" ].reduce(( r, sKind ) => (
      r + aCandidate.avsTerm[ sKind ].reduce(( rT, sTerm ) => (
        rT + aWeight[ sKind ] * this.frTermWeight( sTerm )
      ), 0 )
    ), 0 );
    return rKind + rTerm + aWeight.sibling * frLog( aCandidate.cSibling );
  }

  // @implements s-qhnsu3@fbda5ed
  // @implements s-2f5c83@45e1d61
  frScore( aCandidate ){
    return aCandidate.sStale === null
      ? 1 - Math.exp( -this.frRaw( aCandidate ))
      : 1;
  }

  // @implements s-hndu7a@6adee53
  // @implements s-g1tzs3@9be4fe5
  // @implements s-qzz9rq@7fec6df
  // @implements s-qhnsu3@fbda5ed
  // @implements s-qzbfo6@440f4f1
  // @implements s-fbr7pr@356ffee
  fvaCandidate( aMarker, bOwnAbsent ){
    const aaCandidate = new Map();
    const faCandidate = ( sPath ) => {
      if( !aaCandidate.has( sPath )){
        aaCandidate.set( sPath, faCandidateEmpty( sPath ));
      }
      return aaCandidate.get( sPath );
    };
    const vaCall = this.fvaCallProving( aMarker );
    this.fAddCalls( faCandidate, vaCall );
    this.fAddTests( faCandidate, this.fvsPathTest( vaCall ));
    this.fAddTerms( faCandidate, aMarker );
    this.fAddSiblings( faCandidate, aMarker );
    if( !bOwnAbsent ){ this.fAddStale( faCandidate, aMarker );}
    return Array.from( aaCandidate.values())
      .filter(( aCandidate ) => (
        this.evidence.asPathImpl.has( aCandidate.sPath )
        && !fbPathSpaced( aCandidate.sPath )
      ))
      .map(( aCandidate ) => ({
        ...aCandidate,
        rScore: this.frScore( aCandidate ),
        vsEvidence: fvsEvidenceForCandidate( aCandidate )
      }))
      .sort( fzCompareCandidate );
  }

  fbUntested( aMarker ){
    return this.fvaCallProving( aMarker ).length === 0;
  }
}

module.exports = {
  CoverageReader,
  LoadGraph,
  EvidenceReader,
  Proposer,
  faExecution,
  fbPathSpaced
};
