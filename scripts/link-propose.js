"use strict";

const fs = require( "fs" );
const path = require( "path" );
// @implements s-wx8o4v@de91e1a
const { faModel, TreeReader } = require( "./spec-map.js" );
const { ConfigReader } = require( "./concord-config.js" );
const { fsPosix } = require( "./spec-coverage-collect.js" );
const {
  CoverageReader, LoadGraph, EvidenceReader, Proposer, faExecution,
  fbPathSpaced
} = require( "./link-propose-evidence.js" );
const { faConfirmParsed, LinkWriter } = require( "./link-propose-apply.js" );

const sName = "link-propose";
// @implements s-ms5aa9@80076b2
const cTopDefault = 5;
const reTop = /^[1-9][0-9]*$/;
const vcTopEvaluated = [ 1, 3, 5 ];
const asFlagMode = new Set([
  "--file", "--apply", "--tested-by", "--evaluate"
]);
const asFlagPath = new Set([ "--file", "--apply" ]);
const asModeTop = new Set([ "propose", "--file" ]);
const sUsage = (
  "usage: concord link-propose [<spec path>] [--top <n>] | --file <path> [--top <n>] "
  + "| --apply <confirm file> | --tested-by [<spec path>] "
  + "| --evaluate [<spec path>]\n"
);

const fbFlagArgBad = ( s ) => s === undefined || s.startsWith( "--" );

// @implements s-ms5aa9@80076b2
// @tested-by test/link-propose.test.js#tu-d6b3cf49
const faArgsStep = ( aArgs, vsArg, n ) => {
  const s = vsArg[ n ];
  if( s === "--top" ){
    const bBad = aArgs.nTop !== null || !reTop.test( vsArg[ n + 1 ] || "" );
    return [{ ...aArgs, bBad, nTop: Number( vsArg[ n + 1 ]) }, n + 2 ];
  }
  if( asFlagMode.has( s )){
    const bPath = asFlagPath.has( s );
    const bBad = aArgs.sMode !== "propose"
      || ( bPath && fbFlagArgBad( vsArg[ n + 1 ]));
    return [{
      ...aArgs, bBad, sMode: s, sPath: bPath ? vsArg[ n + 1 ] : null
    }, n + ( bPath ? 2 : 1 )];
  }
  const bBad = s.startsWith( "--" ) || aArgs.sPathSpec !== null;
  return [{ ...aArgs, bBad, sPathSpec: s }, n + 1 ];
};

// @implements s-xtahx4@5a052db
// @tested-by test/link-propose.test.js#tu-61d97fb2
const faArgs = ( vsArg ) => {
  let aArgs = { sMode: "propose", sPathSpec: null, sPath: null, nTop: null };
  let n = 0;
  while( n < vsArg.length ){
    const [ aNext, nNext ] = faArgsStep( aArgs, vsArg, n );
    if( aNext.bBad ){ return null;}
    aArgs = aNext;
    n = nNext;
  }
  if( asFlagPath.has( aArgs.sMode ) && aArgs.sPathSpec !== null ){
    return null;
  }
  return aArgs.nTop !== null && !asModeTop.has( aArgs.sMode ) ? null : aArgs;
};

// @implements s-wx8o4v@de91e1a
class ProjectReading {
  constructor( sDirRoot, aConfig ){
    const reader = new TreeReader( sDirRoot, aConfig );
    const vaSpec = reader.fvaSpec();
    const vaTest = reader.fvaTest();
    const aFilesRead = reader.faFilesRead();
    this.sDirRoot = sDirRoot;
    this.aConfig = aConfig;
    this.aModel = faModel({
      vaSpec,
      vaTest,
      ...aFilesRead,
      vaRecord: reader.fvaRecord(),
      fbExists: ( sPath ) => reader.fbExists( sPath ),
      aFiles: reader
    });
    this.asTextForPath = new Map( vaTest.concat( aFilesRead.vaCiter ).map((
      aFile
    ) => [ fsPosix( aFile.sPath ), aFile.sText ]));
    this.vsPathImpl = aFilesRead.vaCiter
      .map(( aFile ) => fsPosix( aFile.sPath ))
      .sort();
    this.vsPathSpec = vaSpec.map(( aSpec ) => fsPosix( aSpec.sPath ));
    this.aMeasurement = undefined;
    this.evidence = null;
  }

  fsPathRel( sArg ){
    return fsPosix( path.relative(
      this.sDirRoot, path.resolve( this.sDirRoot, sArg )
    ));
  }

  // @implements s-u56cnv@5620146
  faMeasurement(){
    if( this.aMeasurement === undefined ){
      this.aMeasurement = new CoverageReader( this.sDirRoot ).faMeasurement();
    }
    return this.aMeasurement;
  }

  fEvidence(){
    if( this.evidence !== null ){ return this.evidence;}
    const graph = new LoadGraph(
      this.sDirRoot, this.aConfig.vsDirIgnored, this.asTextForPath
    );
    this.evidence = new EvidenceReader({
      aModel: this.aModel,
      graph,
      aExecution: faExecution(
        this.faMeasurement(),
        this.aModel,
        ( sPath ) => graph.fsText( sPath ),
        new Set( this.vsPathImpl )
      ),
      vsPathImpl: this.vsPathImpl
    });
    return this.evidence;
  }
}

const fzCompareMarker = ( aA, aB ) => (
  ( aA.sPath < aB.sPath ? -1 : aA.sPath > aB.sPath ? 1 : 0 )
  || aA.nLine - aB.nLine
);

const fsRef = ( aMarker ) => (
  ( aMarker.sId || "placeholder" ) + "@" + aMarker.sHash
);

const fsLineCoverage = ( aMeasurement ) => (
  aMeasurement === null
    ? "# coverage: none read"
    : "# coverage: " + aMeasurement.sGranularity + " granularity, revision "
      + String( aMeasurement.sRevision || "unknown" ).slice( 0, 7 )
);

const fsLineStmt = ( aMarker, bUntested, bNone ) => [
  "#", fsRef( aMarker ), aMarker.sPath + ":" + aMarker.nLine
].concat(
  bUntested ? [ "untested" ] : [],
  bNone ? [ "none" ] : [],
  [ aMarker.sText ]
).join( " " );

const fsLineCandidate = ( aMarker, aCandidate ) => [
  "?", fsRef( aMarker ), aCandidate.sPath, aCandidate.rScore.toFixed( 2 )
].concat( aCandidate.vsEvidence ).join( " " );

const fsLineSummary = ( c, cWith ) => (
  "# Proposals: " + c + " statements, " + cWith + " with candidates, "
  + ( c - cWith ) + " without"
);

// @implements s-fchiq4@ec7418c
const fvaMarkerUnlinked = ( aModel, sPathSpec ) => aModel.aLines
  .vaNoImplementation
  .filter(( aMarker ) => sPathSpec === null || aMarker.sPath === sPathSpec )
  .slice()
  .sort( fzCompareMarker );

const faProposer = ( reading, vaMarker ) => {
  const proposer = new Proposer( reading.aModel, reading.fEvidence());
  proposer.fIndexTerms( vaMarker );
  return proposer;
};

const fvaCandidateFor = ( proposer, aMarker ) => (
  aMarker.sId === null ? [] : proposer.fvaCandidate( aMarker, false )
);

// @implements s-39kb2j@ad74a84
// @implements s-h6nvbh@0de0c64
// @implements s-1ihvga@a3dbb44
// @implements s-lnre2x@9a8bc8f
// @implements s-v1uxhn@3cc3521
// @implements s-ibre86@6608f9c
// @implements s-ae8jdy@607e4e4
// @implements s-577ckm@21f72df
// @implements s-gbgn3f@f4cbab4
const fsProposals = ( reading, vaMarker, fvaShown ) => {
  const proposer = faProposer( reading, vaMarker );
  const vsLine = [ fsLineCoverage( reading.faMeasurement()) ];
  let c = 0;
  let cWith = 0;
  vaMarker.forEach(( aMarker ) => {
    const vaCandidate = fvaShown( fvaCandidateFor( proposer, aMarker ));
    if( vaCandidate === null ){ return;}
    c++;
    if( vaCandidate.length > 0 ){ cWith++;}
    vsLine.push( fsLineStmt(
      aMarker, proposer.fbUntested( aMarker ), vaCandidate.length === 0
    ));
    vaCandidate.forEach(( aCandidate ) => vsLine.push(
      fsLineCandidate( aMarker, aCandidate )
    ));
  });
  return vsLine.concat( fsLineSummary( c, cWith )).join( "\n" ) + "\n";
};

const fsPercent = ( c, cAll ) => (
  cAll === 0 ? "0.0" : ( 100 * c / cAll ).toFixed( 1 )
);

const favsPathForId = ( aModel ) => {
  const avsPath = new Map();
  aModel.aLines.vaImplements.forEach(( aRef ) => {
    const vsPath = avsPath.get( aRef.sId ) || [];
    const sPath = fsPosix( aRef.sPath );
    if( !vsPath.includes( sPath )){ vsPath.push( sPath );}
    avsPath.set( aRef.sId, vsPath );
  });
  return avsPath;
};

// @implements s-wr76ai@453246a
// @implements s-ffxkxt@1c8d35f
// @implements s-h6zcx6@c576da5
// @implements s-n1ht3r@d1f80fd
// @implements s-k5ttgk@52242db
// @implements s-u56cnv@5620146
// @tested-by test/link-propose.test.js#tu-c8fb5e95
// @tested-by test/link-propose.test.js#tu-d1fcd456
const fsEvaluation = ( reading, sPathSpec ) => {
  const avsPathForId = favsPathForId( reading.aModel );
  const vaMarker = reading.aModel.vaMarker
    .filter(( aMarker ) => sPathSpec === null || aMarker.sPath === sPathSpec )
    .filter(( aMarker ) => aMarker.sType === "s" && aMarker.sId !== null )
    .filter(( aMarker ) => avsPathForId.has( aMarker.sId ))
    .sort( fzCompareMarker );
  const proposer = faProposer( reading, vaMarker );
  const vsLine = [];
  const acWithin = new Map( vcTopEvaluated.map(( c ) => [ c, 0 ]));
  let cMissed = 0;
  vaMarker.forEach(( aMarker ) => {
    const vsPath = avsPathForId.get( aMarker.sId ).slice().sort();
    const vsRanked = proposer.fvaCandidate( aMarker, true )
      .map(( aCandidate ) => aCandidate.sPath );
    const vnRank = vsPath.map(( sPath ) => vsRanked.indexOf( sPath ) + 1 );
    vsLine.push([ aMarker.sId ].concat( vsPath.map(( sPath, n ) => (
      sPath + " " + ( vnRank[ n ] === 0 ? "missed" : vnRank[ n ])
    ))).join( "  " ));
    if( vnRank.includes( 0 )){ cMissed++;}
    vcTopEvaluated.forEach(( cTop ) => {
      if( vnRank.every(( nRank ) => nRank > 0 && nRank <= cTop )){
        acWithin.set( cTop, acWithin.get( cTop ) + 1 );
      }
    });
  });
  return vsLine.concat(
    [ "Evaluated: " + vaMarker.length + " statements" ],
    vcTopEvaluated.map(( cTop ) => (
      "Top " + cTop + ": " + acWithin.get( cTop ) + " ("
      + fsPercent( acWithin.get( cTop ), vaMarker.length ) + "%)"
    )),
    [ "Missed: " + cMissed + " ("
      + fsPercent( cMissed, vaMarker.length ) + "%)" ]
  ).join( "\n" ) + "\n";
};

// @implements s-fbr7pr@356ffee
const fWarnSpaced = ( reading, fWriteErr ) => reading.vsPathImpl
  .filter( fbPathSpaced )
  .forEach(( sPath ) => fWriteErr(
    sName + ": " + sPath + " is never proposed: its path holds whitespace\n"
  ));

// @implements s-tlgm8e@acf5b9e
// @implements s-39kb2j@ad74a84
// @implements s-fchiq4@ec7418c
// @implements s-fbr7pr@356ffee
// @implements s-gizegg@e0e4146
// @implements s-k5ttgk@52242db
// @implements s-u56cnv@5620146
// @tested-by test/link-propose.test.js#tu-e236fd60
// @tested-by test/link-propose.test.js#tu-55931c13
// @tested-by test/link-propose.test.js#tu-8e9daf2b
// @tested-by test/link-propose.test.js#tu-80cabba2
// @tested-by test/link-propose.test.js#tu-c8fb5e95
// @tested-by test/link-propose.test.js#tu-d1fcd456
const fzPropose = ( reading, aArgs, aOut ) => {
  const cTop = aArgs.nTop === null ? cTopDefault : aArgs.nTop;
  fWarnSpaced( reading, aOut.fWriteErr );
  if( aArgs.sMode === "--file" ){
    const sPath = reading.fsPathRel( aArgs.sPath );
    aOut.fWrite( fsProposals(
      reading,
      fvaMarkerUnlinked( reading.aModel, null ),
      ( vaCandidate ) => {
        const vaShown = vaCandidate.filter(( a ) => a.sPath === sPath );
        return vaShown.length === 0 ? null : vaShown;
      }
    ));
    return 0;
  }
  aOut.fWrite( fsProposals(
    reading,
    fvaMarkerUnlinked( reading.aModel, aArgs.sPathSpec ),
    ( vaCandidate ) => vaCandidate.slice( 0, cTop )
  ));
  return 0;
};

// @implements s-vmwsli@d444cbb
// @implements s-5eou7w@05eaa15
// @implements s-wx8o4v@de91e1a
// @tested-by test/link-propose-apply.test.js#tu-1a1c0400
// @tested-by test/link-propose-apply.test.js#tu-8d2dc753
// @tested-by test/link-propose-apply.test.js#tu-170bc957
const fzWrite = ( reading, aArgs, aOut, aConfirm ) => {
  const writer = new LinkWriter({
    sDirRoot: reading.sDirRoot,
    aModel: reading.aModel,
    asTextForPath: reading.asTextForPath,
    asPathImpl: new Set( reading.vsPathImpl ),
    evidence: reading.fEvidence()
  });
  if( aConfirm !== null ){ writer.fApply( aArgs.sPath, aConfirm.vaLine );}
  else{
    const aModel = reading.aModel;
    writer.fTestedBy( Array.from( new Set( aModel.aLines.vaImplements
      .filter(( aRef ) => (
        aArgs.sPathSpec === null
        || aModel.avaMarkerForId.get( aRef.sId )[ 0 ].sPath === aArgs.sPathSpec
      ))
      .map(( aRef ) => fsPosix( aRef.sPath )))).sort());
  }
  aOut.fWrite( writer.fsReport());
  return writer.acCount.refused === 0 ? 0 : 1;
};

// @implements s-ner018@a3a30a2
const fsProblemForArgs = ( reading, aArgs ) => {
  if( aArgs.sPathSpec !== null
    && !reading.vsPathSpec.includes( reading.fsPathRel( aArgs.sPathSpec ))
  ){
    return "no spec at " + aArgs.sPathSpec;
  }
  if( aArgs.sMode === "--file"
    && !reading.vsPathImpl.includes( reading.fsPathRel( aArgs.sPath ))
  ){
    return "no implementation file at " + aArgs.sPath;
  }
  return null;
};

const fsTextConfirm = ( sDirRoot, sPath ) => {
  try{ return fs.readFileSync( path.resolve( sDirRoot, sPath ), "utf8" );}
  catch( xErr ){ return null;}
};

const fzConfirmBad = ( aArgs, aConfirm, fWriteErr ) => {
  aConfirm.vaBad.forEach(( aBad ) => fWriteErr(
    sName + ": " + aArgs.sPath + ":" + aBad.nLine + " is malformed: "
    + aBad.sLine + "\n"
  ));
  return 1;
};

// @implements s-5eou7w@05eaa15
// @implements s-ner018@a3a30a2
// @tested-by test/link-propose-apply.test.js#tu-1a1c0400
const fzRun = ( sDirRoot, aConfig, aArgs, aOut ) => {
  let aConfirm = null;
  if( aArgs.sMode === "--apply" ){
    const sText = fsTextConfirm( sDirRoot, aArgs.sPath );
    if( sText === null ){
      aOut.fWriteErr( sName + ": cannot read " + aArgs.sPath + "\n" );
      return 2;
    }
    aConfirm = faConfirmParsed( sText );
    if( aConfirm.vaBad.length > 0 ){
      return fzConfirmBad( aArgs, aConfirm, aOut.fWriteErr );
    }
  }
  const reading = new ProjectReading( sDirRoot, aConfig );
  const sProblem = fsProblemForArgs( reading, aArgs );
  if( sProblem !== null ){
    aOut.fWriteErr( sName + ": " + sProblem + "\n" );
    return 2;
  }
  const sPathSpec = aArgs.sPathSpec === null
    ? null
    : reading.fsPathRel( aArgs.sPathSpec );
  const aArgsRel = { ...aArgs, sPathSpec };
  // @implements s-wr76ai@453246a
  // @implements s-ffxkxt@1c8d35f
  if( aArgs.sMode === "--evaluate" ){
    aOut.fWrite( fsEvaluation( reading, sPathSpec ));
    return 0;
  }
  if( aArgs.sMode === "--apply" || aArgs.sMode === "--tested-by" ){
    return fzWrite( reading, aArgsRel, aOut, aConfirm );
  }
  return fzPropose( reading, aArgsRel, aOut );
};

// @implements s-58lkl7@02b2533
// @implements s-xtahx4@5a052db
// @implements s-8qvv6k@4068ad2
// @tested-by test/link-propose.test.js#tu-eefbf4e5
// @tested-by test/link-propose.test.js#tu-61d97fb2
// @tested-by test/link-propose.test.js#tu-174ba0ae
const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr ) => {
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  if( aRead.sProblem !== null ){
    fWriteErr( sName + ": " + aRead.sProblem + "\n" );
    return 2;
  }
  const aArgs = faArgs( vsArg );
  if( aArgs === null ){
    fWriteErr( sUsage );
    return 2;
  }
  return fzRun( sDirRoot, aRead.aConfig, aArgs, { fWrite, fWriteErr });
};

module.exports = { fzMain };
