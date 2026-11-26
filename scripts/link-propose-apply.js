// @tested-by test/link-propose-apply.test.js
// @implements s-kx8ajy@9826e66
// @implements s-3smw7c@122e254
"use strict";

const fs = require( "fs" );
const path = require( "path" );
// @implements s-wx8o4v@de91e1a
const { fvaCodeReferenceResolved } = require( "./spec-map.js" );
const { fsPosix } = require( "./spec-coverage-collect.js" );

const reConfirm = new RegExp(
  "^([yn?]) +([a-z]-[a-z0-9]{6})@([0-9a-f]{7}) +(\\S+)(?:\\s.*)?$"
);
const reFileCss = /\.css$/;
const reFileHtml = /\.html?$/;
const reCharset = /^﻿?@charset/;
const sReasonStale = "stale hash";
const sKindImpl = "implements";
const sKindTest = "tested-by";

// @implements s-q2lggv@b84d55b
// @implements s-ieckkc@85e1247
const faConfirmParsed = ( sText ) => {
  const aConfirm = { vaLine: [], vaBad: []};
  sText.split( "\n" ).forEach(( sLineRaw, n ) => {
    const sLine = sLineRaw.replace( /\r$/, "" );
    if( sLine.trim() === "" || sLine.startsWith( "#" )){ return;}
    const vsGroup = sLine.match( reConfirm );
    if( vsGroup === null ){
      aConfirm.vaBad.push({ nLine: n + 1, sLine });
      return;
    }
    aConfirm.vaLine.push({
      nLine: n + 1,
      sVerdict: vsGroup[ 1 ],
      sId: vsGroup[ 2 ],
      sHash: vsGroup[ 3 ],
      sPath: vsGroup[ 4 ]
    });
  });
  return aConfirm;
};

const fsDirective = ( sPath, sKind, sTarget ) => {
  const sBody = "@" + sKind + " " + sTarget;
  if( reFileCss.test( sPath )){ return "/* " + sBody + " */";}
  if( reFileHtml.test( sPath )){ return "<!-- " + sBody + " -->";}
  return "// " + sBody;
};

// @implements s-97oh4r@a333fff
const fbHeaderPlace = ( sPath, sText ) => (
  !( reFileCss.test( sPath ) && reCharset.test( sText ))
);

// @implements s-68w9rn@12484c8
// @implements s-mfht72@18981bb
const fnInsertAt = ( vsLine, vaRef ) => {
  if( vaRef.length > 0 ){
    return Math.max( ...vaRef.map(( aRef ) => aRef.nLine ));
  }
  return vsLine[ 0 ].startsWith( "#!" ) ? 1 : 0;
};

// @implements s-5eou7w@05eaa15
// @implements s-txnavs@85a2c4c
// @implements s-oncg4p@5c9d766
// @implements s-98n0jr@68a4e48
// @implements s-68w9rn@12484c8
// @implements s-mfht72@18981bb
// @implements s-8qoeyd@9f39652
// @implements s-lqs3hw@4ca074c
const faEdited = ( aPlan ) => {
  const bCrlf = aPlan.sText.includes( "\r\n" );
  const vsLine = aPlan.sText.split( "\n" );
  const vaChange = [];
  aPlan.vaRestamp.forEach(( aRestamp ) => {
    const sOld = aRestamp.sId + "@" + aRestamp.sHashOld;
    vsLine[ aRestamp.nLine - 1 ] = vsLine[ aRestamp.nLine - 1 ].replace(
      sOld, aRestamp.sId + "@" + aRestamp.sHashNew
    );
    vaChange.push({
      nLine: aRestamp.nLine,
      sKind: sKindImpl,
      sOut: "~ @implements " + sOld + " -> " + aRestamp.sHashNew
    });
  });
  const nInsert = fnInsertAt( vsLine, aPlan.vaRef );
  const vaAdd = aPlan.vsTargetImpl.map(( sTarget ) => ({
    sKind: sKindImpl, sTarget
  })).concat( aPlan.vsTargetTest.map(( sTarget ) => ({
    sKind: sKindTest, sTarget
  })));
  vsLine.splice( nInsert, 0, ...vaAdd.map(( aAdd ) => (
    fsDirective( aPlan.sPath, aAdd.sKind, aAdd.sTarget ) + ( bCrlf ? "\r" : "" )
  )));
  vaAdd.forEach(( aAdd, n ) => vaChange.push({
    nLine: nInsert + n + 1,
    sKind: aAdd.sKind,
    sTarget: aAdd.sTarget,
    sOut: "+ @" + aAdd.sKind + " " + aAdd.sTarget
  }));
  return { sText: vsLine.join( "\n" ), vaChange };
};

// @implements s-0dezvq@81ba7b7
// @implements s-wx8o4v@de91e1a
const fbEditResolves = ( aModel, sPath, aEdited ) => {
  const vaRef = fvaCodeReferenceResolved({
    ...aModel, vaCode: [{ sPath, sText: aEdited.sText }]
  });
  return aEdited.vaChange.every(( aChange ) => vaRef.some(( aRef ) => (
    aRef.nLine === aChange.nLine
    && aRef.sKind === aChange.sKind
    && aRef.sReason === null
  )));
};

// @implements s-rzukyl@30a8803
const fvsTestDue = ( aModel, asId ) => aModel.vaTestParsed
  .filter(( aTest ) => aTest.vaLink.some(( aLink ) => (
    aLink.sReason === null && asId.has( aLink.sId )
  )))
  .map(( aTest ) => aTest.sPath )
  .sort();

// @implements s-pzjwup@6654181
// @implements s-tq6by8@5f0be54
const fsReasonForLine = ( aModel, asPathImpl, aLine ) => {
  const vaMarker = aModel.avaMarkerForId.get( aLine.sId ) || [];
  if( vaMarker.length === 0 ){ return "no such statement";}
  if( vaMarker.length > 1 ){
    return "marked at " + vaMarker.length + " places";
  }
  if( vaMarker[ 0 ].sType !== "s" ){ return "not a statement";}
  if( vaMarker[ 0 ].sHash !== aLine.sHash ){ return "stale proposal";}
  return asPathImpl.has( aLine.sPath ) ? null : "no implementation file";
};

// @implements s-5eou7w@05eaa15
class LinkWriter {
  constructor({ sDirRoot, aModel, asTextForPath, asPathImpl, evidence }){
    this.sDirRoot = sDirRoot;
    this.aModel = aModel;
    this.asTextForPath = asTextForPath;
    this.asPathImpl = asPathImpl;
    this.evidence = evidence;
    this.vsOut = [];
    this.acCount = { added: 0, restamped: 0, tested: 0, refused: 0 };
  }

  fsPathRel( sPath ){
    return fsPosix( path.relative(
      this.sDirRoot, path.resolve( this.sDirRoot, sPath )
    ));
  }

  fvaRefForPath( sPath ){
    return this.aModel.aLines.vaCodeRef.filter(( aRef ) => (
      fsPosix( aRef.sPath ) === sPath && aRef.sReason !== "misplaced"
    ));
  }

  fasIdResolving( sPath ){
    return new Set( this.fvaRefForPath( sPath )
      .filter(( aRef ) => aRef.sKind === sKindImpl && aRef.sReason === null )
      .map(( aRef ) => aRef.sId ));
  }

  // @implements s-i3n7xx@722d3b2
  // @implements s-6ch142@2ca8557
  fvsTestMissing( sPath, asIdNew ){
    const asId = new Set([ ...this.fasIdResolving( sPath ), ...asIdNew ]);
    const asNamed = new Set( this.fvaRefForPath( sPath )
      .filter(( aRef ) => aRef.sKind === sKindTest )
      .map(( aRef ) => aRef.sTarget ));
    return fvsTestDue( this.aModel, asId )
      .filter(( sPathTest ) => !asNamed.has( sPathTest ));
  }

  fRefuse( sWhere, sReason ){
    this.vsOut.push( sWhere + "  refused: " + sReason );
    this.acCount.refused++;
  }

  fRefuseLines( sPathConfirm, vaLine, sReason ){
    vaLine.forEach(( aLine ) => this.fRefuse(
      sPathConfirm + ":" + aLine.nLine, sReason
    ));
  }

  // @implements s-b2wi6l@57c601c
  fsTextOnDisk( sPath ){
    try{
      return fs.readFileSync( path.join( this.sDirRoot, sPath ), "utf8" );
    }
    catch( xErr ){ return null;}
  }

  // @implements s-97oh4r@a333fff
  // @implements s-0dezvq@81ba7b7
  // @implements s-b2wi6l@57c601c
  fsReasonForPlan( aPlan, aEdited ){
    if( !fbHeaderPlace( aPlan.sPath, aPlan.sText )){ return "no header place";}
    if( !fbEditResolves( this.aModel, aPlan.sPath, aEdited )){
      return "would not resolve";
    }
    return this.fsTextOnDisk( aPlan.sPath ) === aPlan.sText
      ? null
      : "changed during run";
  }

  // @implements s-bswa11@ce8569d
  // @implements s-aok5ze@9be1053
  fsOutForChange( sPath, aChange ){
    const bUnverified = aChange.sKind === sKindTest
      && aChange.sOut.startsWith( "+" )
      && !this.evidence.fbTouches( aChange.sTarget, sPath );
    return sPath + ":" + aChange.nLine + "  " + aChange.sOut
      + ( bUnverified ? "  unverified" : "" );
  }

  // @implements s-yua8vz@7373601
  // @implements s-8qoeyd@9f39652
  // @implements s-lqs3hw@4ca074c
  fbWritePlan( aPlan, fRefused ){
    const aEdited = faEdited( aPlan );
    if( aEdited.vaChange.length === 0 ){ return true;}
    const sReason = this.fsReasonForPlan( aPlan, aEdited );
    if( sReason !== null ){
      fRefused( sReason );
      return false;
    }
    fs.writeFileSync( path.join( this.sDirRoot, aPlan.sPath ), aEdited.sText );
    aEdited.vaChange
      .sort(( aA, aB ) => aA.nLine - aB.nLine )
      .forEach(( aChange ) => {
        this.vsOut.push( this.fsOutForChange( aPlan.sPath, aChange ));
        if( aChange.sKind === sKindTest ){ this.acCount.tested++;}
        else if( aChange.sOut.startsWith( "~" )){ this.acCount.restamped++;}
        else{ this.acCount.added++;}
      });
    return true;
  }

  // @implements s-yua8vz@7373601
  // @implements s-txnavs@85a2c4c
  faPlanForLines( sPath, vaLine ){
    const vaRef = this.fvaRefForPath( sPath );
    const asIdResolving = this.fasIdResolving( sPath );
    const vaLineWrite = vaLine.filter(( aLine ) => (
      !asIdResolving.has( aLine.sId )
    ));
    const vaRestamp = vaLineWrite.flatMap(( aLine ) => vaRef
      .filter(( aRef ) => (
        aRef.sKind === sKindImpl && aRef.sReason === sReasonStale
        && aRef.sTarget === aLine.sId
      ))
      .map(( aRef ) => ({
        nLine: aRef.nLine,
        sId: aLine.sId,
        sHashOld: aRef.sStamp,
        sHashNew: aLine.sHash
      })));
    const vsTargetImpl = vaLineWrite
      .filter(( aLine ) => !vaRestamp.some(( a ) => a.sId === aLine.sId ))
      .map(( aLine ) => aLine.sId + "@" + aLine.sHash );
    return {
      sPath,
      sText: this.asTextForPath.get( sPath ),
      vaRef,
      vaRestamp,
      vsTargetImpl,
      vsTargetTest: vaLineWrite.length === 0
        ? []
        : this.fvsTestMissing( sPath, new Set( vaLineWrite.map(( a ) => (
          a.sId
        )))),
      vaLineWrite
    };
  }

  // @implements s-ck7s5x@7b81fa6
  // @implements s-gj3tfl@fb293e7
  // @implements s-pzjwup@6654181
  // @implements s-pyr21s@b5afae0
  // @implements s-yua8vz@7373601
  // @implements s-cgc0vb@ecec457
  // @implements s-0m5r6m@7d5188e
  fvaLineAccepted( sPathConfirm, vaLine ){
    const asKey = new Set();
    return vaLine
      .filter(( aLine ) => aLine.sVerdict === "y" )
      .map(( aLine ) => ({ ...aLine, sPath: this.fsPathRel( aLine.sPath ) }))
      .filter(( aLine ) => {
        const sKey = aLine.sId + "@" + aLine.sHash + " " + aLine.sPath;
        if( asKey.has( sKey )){ return false;}
        asKey.add( sKey );
        const sReason = fsReasonForLine( this.aModel, this.asPathImpl, aLine );
        if( sReason === null ){ return true;}
        this.fRefuse( sPathConfirm + ":" + aLine.nLine, sReason );
        return false;
      });
  }

  // @implements s-ck7s5x@7b81fa6
  // @implements s-gj3tfl@fb293e7
  // @implements s-pyr21s@b5afae0
  // @implements s-yua8vz@7373601
  // @implements s-i3n7xx@722d3b2
  // @implements s-0m5r6m@7d5188e
  fApply( sPathConfirm, vaLine ){
    const avaLineForPath = new Map();
    this.fvaLineAccepted( sPathConfirm, vaLine ).forEach(( aLine ) => {
      if( !avaLineForPath.has( aLine.sPath )){
        avaLineForPath.set( aLine.sPath, []);
      }
      avaLineForPath.get( aLine.sPath ).push( aLine );
    });
    Array.from( avaLineForPath.keys()).sort().forEach(( sPath ) => {
      const aPlan = this.faPlanForLines( sPath, avaLineForPath.get( sPath ));
      this.fbWritePlan( aPlan, ( sReason ) => this.fRefuseLines(
        sPathConfirm, aPlan.vaLineWrite, sReason
      ));
    });
  }

  // @implements s-i3n7xx@722d3b2
  // @implements s-6ch142@2ca8557
  // @implements s-ysdk89@717c1d5
  // @implements s-tq6by8@5f0be54
  fTestedBy( vsPath ){
    vsPath.forEach(( sPath ) => this.fbWritePlan({
      sPath,
      sText: this.asTextForPath.get( sPath ),
      vaRef: this.fvaRefForPath( sPath ),
      vaRestamp: [],
      vsTargetImpl: [],
      vsTargetTest: this.fvsTestMissing( sPath, new Set())
    }, ( sReason ) => this.fRefuse( sPath, sReason )));
  }

  // @implements s-bswa11@ce8569d
  // @implements s-ysdk89@717c1d5
  fsReport(){
    return this.vsOut.concat([
      "Applied: " + this.acCount.added + " added, "
      + this.acCount.restamped + " re-stamped, "
      + this.acCount.tested + " tested-by, "
      + this.acCount.refused + " refused"
    ]).join( "\n" ) + "\n";
  }
}

module.exports = { faConfirmParsed, LinkWriter };
