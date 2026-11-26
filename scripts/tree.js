// @tested-by test/tree.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { faContextModel } = require( "./spec-map.js" );

const sUsage = "usage: concord tree [--output <path>]\n";
const asType = new Set([ "m", "s", "i", "g", "proof", "impl", "tu", "t", "c" ]);

// @implements s-ru39z3@5f5c95c
// @implements s-e4hinp@ceaad25
const faArgs = ( vsArg ) => {
  if( vsArg.length === 1 && vsArg[ 0 ] === "--help" ){
    return { bHelp: true };
  }
  if( vsArg.length === 0 ){
    return { sOutput: "tmp/concord-tree.html" };
  }
  if( vsArg.length === 2 && vsArg[ 0 ] === "--output"
    && vsArg[ 1 ].trim() !== ""
  ){
    return { sOutput: vsArg[ 1 ] };
  }
  return null;
};

const fsNodeId = ( sType, sKey ) => sType + ":" + sKey;
const fnLineOffset = ( sText, nLine ) => {
  const vsLine = sText.split( "\n" );
  return vsLine.slice( 0, nLine - 1 ).reduce(( n, sLine ) => n + sLine.length + 1, 0 );
};
// @implements s-hux5ev@ce910fd
const faSourceRegion = ( aFile, aRef ) => {
  const nStart = aRef.nSourceStartLine || 1;
  const nEnd = aRef.nSourceEndLine || nStart + 1;
  if( aFile.bSide ){
    const vsTarget = ( aFile.sTextTarget || "" ).split( "\n" );
    if( aRef.bSourceTargetRange ){
      return {
        nStartLine: nStart,
        sText: vsTarget.slice( nStart - 1, nEnd - 1 ).join( "\n" )
      };
    }
    const vaLine = ( aFile.vnLineMap || [] )
      .slice( nStart - 1, nEnd - 1 )
      .filter(( nLine ) => nLine !== null )
      .map(( nLine ) => ({ nLine, sText: vsTarget[ nLine - 1 ] || "" }));
    if( vaLine.length === 0 ){ return { nStartLine: nStart, sText: "" };}
    return {
      nStartLine: vaLine[ 0 ].nLine,
      sText: vaLine.map(( aLine ) => aLine.sText).join( "\n" )
    };
  }
  const vsSource = aFile.sText.split( "\n" );
  return {
    nStartLine: nStart,
    sText: vsSource.slice( nStart - 1, nEnd - 1 ).join( "\n" )
  };
};

// @implements s-3xlcr2@358acd7
const faTreeSources = ( aModel ) => {
  const maSource = new Map();
  const fAddDirectiveTag = ( aSource, aRef, sNodeId = null ) => {
    if( !aSource || !Number.isInteger( aRef.nLine ) || !aRef.sText ){ return;}
    const sToken = aRef.sText.match(
      /@(?:spec|implements|tested-by|checks|proves|guards|follows|test-implements)\s+[^\s]+/
    )?.[ 0 ];
    if( !sToken ){ return;}
    const nLineStart = fnLineOffset( aSource.sText, aRef.nLine );
    const nStart = aSource.sText.indexOf( sToken, nLineStart );
    if( nStart < nLineStart ){ return;}
    const aExisting = aSource.vaTag.find(( aTag ) => aTag.nStart === nStart );
    if( aExisting ){
      if( aRef.sGroupKey ){ aExisting.sGroupKey = aRef.sGroupKey;}
      return;
    }
    aSource.vaTag.push({
      sToken, nStart, nEnd: nStart + sToken.length,
      sGroupKey: aRef.sGroupKey || ( aRef.nSourceStartLine === undefined
        ? `directive:${aRef.nLine}`
        : `directive:${aRef.nSourceStartLine}:${aRef.nSourceEndLine}` ),
      sNodeId
    });
  };
  const fAddFile = ( sPath, sText, sPathSidecar = null ) => {
    if( typeof sPath !== "string" || typeof sText !== "string" ){ return null;}
    if( !maSource.has( sPath )){
      maSource.set( sPath, { sPath, sText, sPathSidecar, vaTag: [] });
    }
    return maSource.get( sPath );
  };
  const fFindSource = ( sPath ) => maSource.get( sPath )
    || Array.from( maSource.values()).find(( aSource ) => (
      aSource.sPathSidecar === sPath
    ));
  ( aModel.vaSpecParsed || []).forEach(( aSpec ) => {
    const aSource = fAddFile( aSpec.sPath, aSpec.sText );
    ( aSpec.vaMarker || []).forEach(( aMarker ) => {
      if( !Number.isInteger( aMarker.nOffset ) || !aMarker.sToken ){ return;}
      const nStart = aMarker.nOffset;
      const nEnd = nStart + aMarker.sToken.length;
      aSource.vaTag.push({
        sToken: aMarker.sToken, nStart, nEnd,
        sGroupKey: `spec:${aMarker.nBlock}:${aMarker.nLine}`,
        sNodeId: [ "m", "s", "i", "g" ].includes( aMarker.sType )
          && aMarker.sId ? fsNodeId( aMarker.sType, aMarker.sId ) : null
      });
    });
  });
  ( aModel.vaCode || []).forEach(( aFile ) => fAddFile(
    aFile.sPath, aFile.sText, aFile.sPathSidecar
  ));
  ( aModel.vaTestParsed || []).forEach(( aFile ) => fAddFile( aFile.sPath, aFile.sText ));
  ( aModel.vaTestParsed || []).forEach(( aFile ) => {
    const aSource = fFindSource( aFile.sPath );
    ( aFile.vaOwner || []).concat(
      aFile.vaLink || [], aFile.vaGuard || [], aFile.vaImplements || []
    ).forEach(( aRef ) => fAddDirectiveTag( aSource, aRef ));
  });
  [ "vaImplements", "vaTestedBy", "vaChecks", "vaFollows" ].forEach(( sKey ) => {
    ( aModel.aLines?.[ sKey ] || []).forEach(( aRef ) => (
      fAddDirectiveTag( fFindSource( aRef.sPathCode || aRef.sPath ), aRef )
    ));
  });
  // @implements s-hux5ev@ce910fd
  ( aModel.vaCode || []).filter(( aFile ) => aFile.bSide).forEach(( aFile ) => {
    const aSource = maSource.get( aFile.sPath );
    const sGroupKey = aSource?.vaTag[ 0 ]?.sGroupKey || "sidecar";
    ( aFile.vaOverlayDirective || []).forEach(( aDirective ) => fAddDirectiveTag(
      aSource,
      {
        nLine: aDirective.nVirtualLine,
        sText: aDirective.sText,
        sGroupKey
      }
    ));
  });
  return maSource;
};

// @implements s-3xlcr2@358acd7
// @implements s-fnp72m@24bf7f0
const fApplyTaggedSnippets = ( maSource, maNode ) => {
  maSource.forEach(( aSource ) => {
    aSource.vaTag.filter(( aTag ) => aTag.bVirtual).forEach(( aTag ) => {
      const aNode = aTag.sNodeId === null ? null : maNode.get( aTag.sNodeId );
      if( aNode !== null && aNode !== undefined ){
        aNode.sText = aSource.sText.slice(
          aTag.nSnippetStart, aTag.nSnippetEnd
        ).trim();
      }
    });
    const vaSourceTag = aSource.vaTag.filter(( aTag ) => !aTag.bVirtual)
      .sort(( aA, aB ) => aA.nStart - aB.nStart );
    const vaGroup = [];
    vaSourceTag.forEach(( aTag ) => {
      let aGroup = vaGroup[ vaGroup.length - 1 ];
      if( aGroup === undefined || aGroup.sKey !== aTag.sGroupKey ){
        aGroup = { sKey: aTag.sGroupKey, vaTag: [] };
        vaGroup.push( aGroup );
      }
      aGroup.vaTag.push( aTag );
    });
    vaGroup.forEach(( aGroup, nGroup ) => {
      const aLastTag = aGroup.vaTag[ aGroup.vaTag.length - 1 ];
      const nStart = aLastTag.nEnd;
      const nEnd = vaGroup[ nGroup + 1 ]?.vaTag[ 0 ].nStart ?? aSource.sText.length;
      aGroup.vaTag.forEach(( aTag ) => {
        aTag.nSnippetStart = nStart;
        aTag.nSnippetEnd = nEnd;
        const aNode = aTag.sNodeId === null ? null : maNode.get( aTag.sNodeId );
        if( aNode === null || aNode === undefined ){ return;}
        aNode.sText = aSource.sText.slice( nStart, nEnd ).trim();
        aNode.sSourcePath = aSource.sPath;
        aNode.nSnippetStart = nStart;
        aNode.nSnippetEnd = nEnd;
      });
    });
  });
};

// @implements s-558tp9@19ec323
const fsNodeLabel = ( aNode ) => {
  if( [ "impl", "proof" ].includes( aNode.sType ) ){ return aNode.sKey;}
  if( aNode.sType === "tu" ){ return "#" + aNode.sKey;}
  if( [ "m", "s", "g", "i" ].includes( aNode.sType ) ){
    return "#" + aNode.sKey.replace( /^#/, "" );
  }
  if( ![ "c", "t" ].includes( aNode.sType )
    || !/:L\d+-L\d+$/.test( aNode.sKey )
  ){
    return aNode.sKey;
  }
  const sFirstLine = aNode.sText.split( /\r?\n/ )
    .map(( sLine ) => sLine.trim())
    .find(( sLine ) => sLine !== "" );
  if( sFirstLine === undefined ){ return aNode.sKey;}
  return sFirstLine.length <= 88 ? sFirstLine : sFirstLine.slice( 0, 85 ) + "…";
};

// @implements s-af3db1@ed94b35
const fsSyntheticKey = ( sType, sPath, nStart, nEnd, bWholeFile = false ) => {
  const sRange = bWholeFile
    ? "whole-file"
    : `L${nStart}-L${nEnd}`;
  const sHash = crypto.createHash( "sha256" )
    .update( `${sPath}:${sRange}`, "utf8" )
    .digest( "hex" ).slice( 0, 8 );
  return sType === "impl" ? "#im-" + sHash : "#pf-" + sHash;
};

// @implements s-x5ol0d@e803f39
// @implements s-v76hlt@8f84f19
// @implements s-66q4xz@6b89eca
// @implements s-rhxy5e@4a64fdb
// @implements s-1xji25@cf98878
// @implements s-f6hd06@9bd776f
const faTreeData = ( aModel ) => {
  const maNode = new Map();
  const maEdge = new Map();
  const vaImplGroup = [];
  const maSource = faTreeSources( aModel );

  const fAddNode = ( sType, sKey, aExtra = {}) => {
    if( !asType.has( sType ) || typeof sKey !== "string" || sKey === "" ){
      return null;
    }
    const sId = fsNodeId( sType, sKey );
    if( !maNode.has( sId )){
      maNode.set( sId, {
        id: sId,
        sType,
        sKey,
        sPath: null,
        nLine: null,
        sText: "",
        vaUnit: [],
        vaLocation: [],
        ...aExtra
      });
    }
    return maNode.get( sId );
  };

  const fAddEdge = ( sFrom, sTo, sRelation, aLocation = null ) => {
    if( !maNode.has( sFrom ) || !maNode.has( sTo )){ return;}
    const sKey = JSON.stringify([ sFrom, sTo, sRelation ]);
    let aEdge = maEdge.get( sKey );
    if( aEdge === undefined ){
      aEdge = { sFrom, sTo, sRelation, vaLocation: [] };
      maEdge.set( sKey, aEdge );
    }
    if( aLocation !== null ){
      const sLocation = JSON.stringify( aLocation );
      if( !aEdge.vaLocation.some(( aOld ) => JSON.stringify( aOld ) === sLocation )){
        aEdge.vaLocation.push( aLocation );
      }
    }
  };

  const fAssociateTag = ( aSource, aRef, sNodeId ) => {
    if( !aSource || !Number.isInteger( aRef.nLine ) || !aRef.sText ){ return;}
    const sToken = aRef.sText.match(
      /@(?:spec|implements|tested-by|checks|proves|guards|follows|test-implements)\s+[^\s]+/
    )?.[ 0 ];
    if( !sToken ){ return;}
    const nLineStart = fnLineOffset( aSource.sText, aRef.nLine );
    const nTagStart = aSource.sText.indexOf( sToken, nLineStart );
    const aTag = aSource.vaTag.find(( aEntry ) => aEntry.nStart === nTagStart );
    if( aTag ){ aTag.sNodeId = sNodeId;}
  };

  ( aModel.vaMarker || [])
    .filter(( aMarker ) => (
      [ "m", "s", "i", "g" ].includes( aMarker.sType )
      && !aMarker.bMalformed
      && typeof aMarker.sId === "string"
    ))
    .forEach(( aMarker ) => {
      const aNode = fAddNode( aMarker.sType, aMarker.sId, {
        sPath: aMarker.sPath,
        nLine: aMarker.nLine,
        sText: aMarker.sTextIncluded || aMarker.sTextRaw || ""
      });
    });

  ( aModel.vaTestParsed || []).forEach(( aTest ) => {
    const aNode = fAddNode( "t", aTest.sPath, {
      sPath: aTest.sPath,
      sSourcePath: aTest.sPath,
      vaUnit: ( aTest.vaCall || [])
        .filter(( aCall ) => aCall.sKind === "test")
        .map(( aCall ) => ({
          nLine: aCall.nLine + 1,
          sName: aCall.sName || ""
        }))
        .sort(( aA, aB ) => aA.nLine - aB.nLine)
    });
    const aSource = maSource.get( aTest.sPath );
    ( aTest.vaCall || []).filter(( aCall ) => aCall.sKind === "test"
      && typeof aCall.sUnitId === "string")
      .forEach(( aCall ) => {
        const aUnit = fAddNode( "tu", aCall.sUnitId, {
          sPath: aTest.sPath,
          sSourcePath: aTest.sPath,
          nLine: aCall.nFirstLine,
          nEndLine: aCall.nLastLine,
          sText: aCall.sBody,
          nSnippetStart: aCall.nStart,
          nSnippetEnd: aCall.nEnd
        });
        fAddEdge( aNode.id, aUnit.id, "contains", {
          sPath: aTest.sPath,
          nStartLine: aCall.nFirstLine,
          nEndLine: aCall.nLastLine
        });
        ( aCall.vaStmt || []).forEach(( aStmt ) => fAddEdge(
          aUnit.id, fsNodeId( "s", aStmt.sId ), "proves", {
            sPath: aTest.sPath, nLine: aCall.nLine + 1
          }
        ));
        ( aCall.vaStmtGuard || []).forEach(( aStmt ) => fAddEdge(
          aUnit.id, fsNodeId( "s", aStmt.sId ), "guards", {
            sPath: aTest.sPath, nLine: aCall.nLine + 1
          }
        ));
        if( aSource ){
          aSource.vaTag.push({
            sToken: "#" + aCall.sUnitId,
            nStart: aCall.nStart,
            nEnd: aCall.nStart,
            nSnippetStart: aCall.nStart,
            nSnippetEnd: aCall.nEnd,
            sGroupKey: "virtual-unit:" + aCall.sUnitId,
            sNodeId: aUnit.id,
            bVirtual: true
          });
        }
      });
  });

  ( aModel.vaTestParsed || []).forEach(( aTest ) => {
    const maRegion = new Map();
    [
      ...( aTest.vaLink || []).map(( aLink ) => ({ aLink, sRelation: "proves" })),
      ...( aTest.vaGuard || []).map(( aLink ) => ({ aLink, sRelation: "guards" }))
    ]
      .filter(({ aLink }) => aLink.sReason === null
        && aLink.nSourceStartLine !== undefined )
      .forEach(({ aLink, sRelation }) => {
        const sRegion = `${sRelation}:${aLink.nSourceStartLine}-${aLink.nSourceEndLine}`;
        const vaLink = maRegion.get( sRegion ) || [];
        vaLink.push({ aLink, sRelation }); maRegion.set( sRegion, vaLink );
      });
    maRegion.forEach(( vaLink, sRegion ) => {
      const [ sRelation, sRange ] = sRegion.split( ":" );
      const [ nStart, nEnd ] = sRange.split( "-" ).map( Number );
      const nStartAt = fnLineOffset( aTest.sText, nStart );
      const nEndAt = fnLineOffset( aTest.sText, nEnd );
      const bHasTest = aTest.vaCall.some(( aCall ) => aCall.sKind === "test"
        && aCall.nStart < nEndAt && aCall.nEnd > nStartAt);
      if( !bHasTest ){ return;}
      const sType = sRelation === "proves" ? "proof" : "t";
      const sKey = sType === "proof"
        ? fsSyntheticKey( sType, aTest.sPath, nStart, nEnd - 1 )
        : `${aTest.sPath}:L${nStart}-L${nEnd - 1}`;
      const aNode = fAddNode( sType, sKey, {
        sPath: aTest.sPath, sSourcePath: aTest.sPath,
        nLine: nStart,
        nEndLine: nEnd - 1,
        sText: aTest.sText.split( "\n" ).slice( nStart - 1, nEnd - 1 ).join( "\n" )
      });
      const aSource = maSource.get( aTest.sPath );
      vaLink.forEach(({ aLink }) => fAssociateTag( aSource, aLink, aNode.id ));
      vaLink.forEach(({ aLink, sRelation }) => fAddEdge(
        aNode.id, fsNodeId( "s", aLink.sId ), sRelation, {
          sPath: aTest.sPath, nLine: aLink.nLine,
          nStartLine: nStart, nEndLine: nEnd - 1
        }
      ));
    });
  });

  ( aModel.vaCode || []).forEach(( aFile ) => fAddNode( "c", aFile.sPath, {
    sPath: aFile.sPath, sSourcePath: aFile.sPath
  }));

  ( aModel.aRootRefs?.vaList || [])
    .filter(( aList ) => aList.sReason === null && aList.aMarker?.sType === "s")
    .forEach(( aList ) => ( aList.vaRef || [])
      .filter(( aRef ) => (
        aRef.sReason === null
        && [ "m", "s" ].includes( aRef.aTarget?.sType )
      ))
      .forEach(( aRef ) => fAddEdge(
        fsNodeId( "s", aList.aMarker.sId ),
        fsNodeId( aRef.aTarget.sType, aRef.aTarget.sId ),
        "derived from",
        { sPath: aList.aMarker.sPath, nLine: aList.aMarker.nLine }
      )));

  ( aModel.aRootRefs?.vaInclusion || [])
    .filter(( aInclusion ) => (
      aInclusion.sReason === null
      && aInclusion.aMarker?.sType === "s"
      && [ "m", "s" ].includes( aInclusion.aTarget?.sType )
    ))
    .forEach(( aInclusion ) => fAddEdge(
      fsNodeId( "s", aInclusion.aMarker.sId ),
      fsNodeId( aInclusion.aTarget.sType, aInclusion.aTarget.sId ),
      "includes",
      { sPath: aInclusion.aMarker.sPath, nLine: aInclusion.aMarker.nLine }
    ));

  const fAddCodeRegion = ( aRef, sRelation, sTargetType, sTargetId ) => {
    const sPathCode = aRef.sPathCode || aRef.sPath;
    const sCodeId = fsNodeId( "c", sPathCode );
    const aNode = maNode.get( sCodeId );
    if( aNode !== undefined ){
      aNode.vaLocation.push({
        nLine: aRef.nLine,
        sId: aRef.sId,
        sRelation
      });
    }
    const aFile = aModel.vaCode.find(( aEntry ) => aEntry.sPath === sPathCode );
    if( aFile === undefined ){ return;}
    if( aRef.bFileWide || aRef.nSourceStartLine === undefined ){
      fAssociateTag( maSource.get( sPathCode ), aRef, sCodeId );
      fAddEdge( sCodeId, fsNodeId( sTargetType, sTargetId ), sRelation, {
        sPath: sPathCode, nLine: aRef.nLine
      });
      return;
    }
    const aRange = faSourceRegion( aFile, aRef );
    const nEndLine = aRange.nStartLine
      + Math.max( 0, aRange.sText.split( "\n" ).length - 1 );
    const sRegionKey = `${sPathCode}:L${aRange.nStartLine}-L${nEndLine}`;
    const aRegion = fAddNode( "c", sRegionKey, {
      sPath: sPathCode, sSourcePath: sPathCode,
      nLine: aRange.nStartLine, nEndLine, sText: aRange.sText
    });
    fAssociateTag( maSource.get( sPathCode ), aRef, aRegion.id );
    fAddEdge( aRegion.id, fsNodeId( sTargetType, sTargetId ), sRelation, {
      sPath: sPathCode,
      nLine: aRef.nLine,
      nStartLine: aRange.nStartLine,
      nEndLine
    });
  };

  ( aModel.aLines?.vaImplements || []).forEach(( aRef ) => {
    if( aRef.sReason !== null ){ return;}
    const sPathCode = aRef.sPathCode || aRef.sPath;
    const aFile = aModel.vaCode.find(( aEntry ) => aEntry.sPath === sPathCode );
    if( aFile === undefined ){ return;}
    const bWholeFile = aRef.bFileWide || aRef.nSourceStartLine === undefined;
    const aRange = faSourceRegion( aFile, aRef );
    const nEndLine = aRange.nStartLine
      + Math.max( 0, aRange.sText.split( "\n" ).length - 1 );
    const sKey = fsSyntheticKey(
      "impl", sPathCode, aRange.nStartLine, nEndLine, bWholeFile
    );
    const aNode = fAddNode( "impl", sKey, {
      sPath: sPathCode, sSourcePath: sPathCode,
      nLine: bWholeFile ? null : aRange.nStartLine,
      nEndLine: bWholeFile ? null : nEndLine,
      sText: aRange.sText
    });
    aNode.sContainingFile = sPathCode;
    vaImplGroup.push({ aNode, sPathCode, bWholeFile,
      nStart: aRange.nStartLine, nEnd: nEndLine });
    fAssociateTag( maSource.get( sPathCode ), aRef, aNode.id );
    fAddEdge( aNode.id, fsNodeId( "s", aRef.sId ), "implements", {
      sPath: sPathCode,
      nLine: aRef.nLine,
      nStartLine: bWholeFile ? null : aRange.nStartLine,
      nEndLine: bWholeFile ? null : nEndLine
    });
  });

  ( aModel.aLines?.vaTestedBy || []).forEach(( aRef ) => {
    const sTestPath = aRef.sTestPath || aRef.sTarget;
    const sTargetType = aRef.sTestUnitId === null ? "t" : "tu";
    const sTargetId = aRef.sTestUnitId === null
      ? sTestPath : aRef.sTestUnitId;
    fAddCodeRegion( aRef, "tested by", sTargetType, sTargetId );
    if( aRef.sReason !== null ){ return;}
    const sPathCode = aRef.sPathCode || aRef.sPath;
    vaImplGroup.filter(( aGroup ) => aGroup.sPathCode === sPathCode
      && (aGroup.bWholeFile || aRef.bFileWide
        || (aRef.nSourceStartLine <= aGroup.nEnd
          && aRef.nSourceEndLine - 1 >= aGroup.nStart)))
      .forEach(( aGroup ) => fAddEdge(
        aGroup.aNode.id, fsNodeId( sTargetType, sTargetId ), "tested by", {
          sPath: sPathCode, nLine: aRef.nLine,
          nStartLine: aRef.nSourceStartLine ?? null,
          nEndLine: aRef.nSourceEndLine === undefined
            ? null : aRef.nSourceEndLine - 1
        }
      ));
  });

  ( aModel.aLines?.vaChecks || []).forEach(( aRef ) => {
    fAddCodeRegion( aRef, "checks", "i", aRef.sId );
  });
  ( aModel.aLines?.vaFollows || []).forEach(( aRef ) => fAssociateTag(
    maSource.get( aRef.sPathCode || aRef.sPath ), aRef,
    fsNodeId( "c", aRef.sPathCode || aRef.sPath )
  ));
  ( aModel.aLines?.vaFollows || []).filter(( aRef ) => aRef.sReason === null )
    .forEach(( aRef ) => fAddEdge(
      fsNodeId( "c", aRef.sPathCode || aRef.sPath ),
      fsNodeId( "g", aRef.sId ),
      "follows",
      { sPath: aRef.sPathCode || aRef.sPath, nLine: aRef.nLine }
    ));

  fApplyTaggedSnippets( maSource, maNode );

  const vaNode = Array.from( maNode.values()).sort(( aA, aB ) => (
    [ "m", "s", "g", "i", "t", "tu", "proof", "impl", "c" ].indexOf( aA.sType )
      - [ "m", "s", "g", "i", "t", "tu", "proof", "impl", "c" ].indexOf( aB.sType )
      || aA.sKey.localeCompare( aB.sKey )
  ));
  vaNode.forEach(( aNode ) => { aNode.sLabel = fsNodeLabel( aNode ); });
  const vaEdge = Array.from( maEdge.values()).sort(( aA, aB ) => (
    aA.sFrom.localeCompare( aB.sFrom )
    || aA.sRelation.localeCompare( aB.sRelation )
    || aA.sTo.localeCompare( aB.sTo )
  ));
  const maFileKind = new Map();
  const fAddFileKind = ( sPath, sKind ) => {
    const asKind = maFileKind.get( sPath ) || new Set();
    asKind.add( sKind );
    maFileKind.set( sPath, asKind );
  };
  ( aModel.vaSpecParsed || []).forEach(( aSpec ) => {
    ( aSpec.vaMarker || []).forEach(( aMarker ) => {
      if( aMarker.sType === "m" ){ fAddFileKind( aSpec.sPath, "m" );}
      if( aMarker.sType === "g" ){ fAddFileKind( aSpec.sPath, "g" );}
      if( [ "s", "i" ].includes( aMarker.sType ) ){
        fAddFileKind( aSpec.sPath, "s" );
      }
    });
  });
  ( aModel.vaTestParsed || []).forEach(( aTest ) => fAddFileKind( aTest.sPath, "t" ));
  ( aModel.vaCode || []).forEach(( aFile ) => fAddFileKind( aFile.sPath, "c" ));
  return {
    vaNode, vaEdge,
    vaSource: Array.from( maSource.values()).map(( aSource ) => {
      const vaTag = aSource.vaTag.slice().sort(( aA, aB ) => aA.nStart - aB.nStart );
      let nGroupStart = 0;
      while( nGroupStart < vaTag.length ){
        let nGroupEnd = nGroupStart + 1;
        while( nGroupEnd < vaTag.length
          && vaTag[ nGroupEnd ].sGroupKey === vaTag[ nGroupStart ].sGroupKey
        ){
          nGroupEnd++;
        }
        const nSnippetStart = vaTag[ nGroupEnd - 1 ].nEnd;
        const nSnippetEnd = vaTag[ nGroupEnd ]?.nStart ?? aSource.sText.length;
        for( let n = nGroupStart; n < nGroupEnd; n++ ){
          vaTag[ n ].nSnippetStart = nSnippetStart;
          vaTag[ n ].nSnippetEnd = nSnippetEnd;
        }
        nGroupStart = nGroupEnd;
      }
      return {
        ...aSource,
        vaKind: Array.from( maFileKind.get( aSource.sPath ) || [] ),
        vaTag
      };
    })
  };
};

// @implements s-wtqhwy@12a20e2
const fsJsonForHtml = ( aData ) => JSON.stringify( aData )
  .replace( /</g, "\\u003c" )
  .replace( />/g, "\\u003e" )
  .replace( /&/g, "\\u0026" )
  .replace( /\u2028/g, "\\u2028" )
  .replace( /\u2029/g, "\\u2029" );

// @implements s-18beuw@d38fd97
// @implements s-fnp72m@24bf7f0
// @implements s-l54zgw@cc044b3
// @implements s-5nelav@f630bf9
// @implements s-krpml7@e342090
// @implements s-21fca6@b0a68e6
// @implements s-idz0d3@54e2048
// @implements s-0jh0fh@0536080
// @implements s-po5x3x@3737857
// @implements s-0scbtx@335f19f
// @implements s-p7cquo@02302ec
// @implements s-n2fi4h@daa455b
// @implements s-vg8mup@d04d2d8
// @implements s-fjsmy1@23f2f82
// @implements s-492yro@a2ad089
// @implements s-wtqhwy@12a20e2
// @implements s-fjnkuo@f4faa67
// @implements s-znpy76@6235307
// @implements s-bmmmrm@ba80c44
// @implements s-i9jl91@d8b6327
// @implements s-f6hd06@9bd776f
const fsTreePage = ( aData ) => {
  const sTemplate = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concord graph browser</title>
<style>
:root { color-scheme: light dark; --bg:#f3f6fa; --panel:#fff; --text:#16283c; --muted:#53677c; --line:#d9e1e9; --accent:#146c7a; --soft:#e4f1f3; font:16px/1.5 system-ui,-apple-system,sans-serif; }
@media (prefers-color-scheme: dark) { :root { --bg:#101922; --panel:#182532; --text:#e6edf4; --muted:#9eb0c0; --line:#344757; --accent:#77c6d2; --soft:#203a43; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); }
header { padding:1.4rem clamp(1rem,4vw,3rem); border-bottom:1px solid var(--line); background:var(--panel); }
h1 { margin:0; font-size:1.5rem; }
.lede { color:var(--muted); margin:.3rem 0 1rem; }
.layout { display:grid; grid-template-columns:minmax(18rem, 34%) 1fr; gap:1rem; padding:1rem clamp(.7rem,2vw,1.5rem); min-height:calc(100vh - 130px); }
nav,.detail { background:var(--panel); border:1px solid var(--line); border-radius:.7rem; }
nav { max-height:calc(100vh - 150px); overflow:auto; }
#file-tabs { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); position:sticky; top:0; z-index:1; padding:.45rem; gap:.2rem; background:var(--panel); border-bottom:1px solid var(--line); }
#file-tabs button { border:0; border-radius:.4rem; padding:.5rem .2rem; color:var(--muted); background:transparent; font:inherit; font-size:.82rem; cursor:pointer; }
#file-tabs button[aria-selected="true"] { color:var(--text); background:var(--soft); font-weight:700; }
#file-tree { list-style:none; margin:0; padding:.5rem; display:grid; gap:.3rem; }
.file-entry { min-width:0; }
.file-button,.tag-button { width:100%; text-align:left; border:0; border-radius:.4rem; padding:.5rem .55rem; color:var(--text); background:transparent; font:inherit; overflow-wrap:anywhere; cursor:pointer; }
.file-button:hover,.tag-button:hover,.file-button[aria-current="true"],.tag-button[aria-current="page"] { background:var(--soft); }
.file-button { font-weight:650; }
.file-caret { display:inline-block; width:1.1em; color:var(--accent); }
.file-tags { list-style:none; margin:0 0 0 .65rem; padding:.2rem 0 .4rem .5rem; border-left:1px solid var(--line); }
.tag-button { color:var(--accent); font:700 .88rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; text-decoration:none; }
.tag-button[aria-current="true"] { box-shadow:inset 3px 0 var(--accent); }
button:focus-visible,a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
.detail { padding:clamp(1rem,3vw,2rem); min-width:0; }
.detail h2 { margin:.1rem 0; overflow-wrap:anywhere; }
.meta,.empty { color:var(--muted); }
pre { white-space:pre-wrap; overflow-wrap:anywhere; font:.92rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; padding:1rem; border:1px solid var(--line); border-radius:.5rem; background:var(--bg); }
#breadcrumbs { margin:0 0 1rem; color:var(--muted); font-size:.9rem; }
#breadcrumbs ol { display:flex; flex-wrap:wrap; align-items:center; gap:.35rem; list-style:none; margin:0; padding:0; }
#breadcrumbs li+li::before { content:"›"; margin-right:.35rem; color:var(--muted); }
#breadcrumbs button { border:0; padding:0; color:var(--accent); background:transparent; font:inherit; cursor:pointer; }
#breadcrumbs [aria-current="page"] { color:var(--text); font-weight:700; }
#source-title a { color:var(--accent); text-decoration:underline; }
#source-location { margin:-.65rem 0 1rem; color:var(--muted); font-size:.9rem; }
#source-location a { color:var(--accent); }
#source-view { min-width:0; overflow:auto; }
#source-file { min-height:12rem; }
#source-file a { color:inherit; text-decoration:none; }
#source-file a:focus-visible { outline:3px solid var(--accent); }
.source-tag .tag { color:var(--accent); font-weight:700; }
.node-relations { margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--line); }
.node-relations h3 { margin:0 0 .5rem; font-size:1rem; }
.node-relations ul { list-style:none; margin:0; padding:0; display:grid; gap:.35rem; }
.node-relations .relationship-targets { margin:.25rem 0 .35rem .8rem; padding-left:.75rem; border-left:1px solid var(--line); }
.node-relations a { color:var(--accent); }
.node-relations [aria-current="page"] { font-weight:700; }
.source-tag-selected { background:var(--soft); outline:2px solid var(--accent); }
.source-tag-current { color:var(--text); font-weight:700; text-decoration:none; }
.context-path { display:grid; gap:0; margin:0 0 1.25rem; }
.context-card { border:1px solid var(--line); border-radius:.55rem; background:var(--bg); overflow:hidden; }
.context-heading { display:block; padding:.5rem .7rem; color:var(--accent); font-size:.82rem; }
.context-heading a,.context-locations a { color:var(--accent); }
.context-locations { display:flex; gap:.8rem; padding:0 .7rem .65rem; font-size:.8rem; }
.context-text { margin:0; padding:.2rem .7rem .7rem; white-space:pre-wrap; overflow-wrap:anywhere; }
.context-collapsed { width:100%; min-height:2.5rem; padding:.45rem .7rem; border:1px solid var(--line); border-radius:.45rem; background:var(--bg); color:var(--accent); text-align:left; font:inherit; cursor:pointer; }
.context-arrow { height:1.7rem; color:var(--accent); text-align:center; line-height:1.7rem; font-weight:700; }
@media(max-width:760px) { .layout { grid-template-columns:1fr; } nav { max-height:42vh; } }
</style>
</head>
<body>
<header>
  <h1>Concord graph browser</h1>
  <p class="lede">Browse Concord files, expand their tags, and follow each tag to its source.</p>
</header>
<div class="layout">
  <nav id="left-pane" aria-label="Concord files">
    <div id="file-tabs" role="tablist" aria-label="Artifact file type">
      <button type="button" role="tab" id="tab-m" data-kind="m" aria-controls="file-tree" aria-selected="true">Motives</button>
      <button type="button" role="tab" id="tab-s" data-kind="s" aria-controls="file-tree" aria-selected="false">Specs</button>
      <button type="button" role="tab" id="tab-g" data-kind="g" aria-controls="file-tree" aria-selected="false">Guidance</button>
      <button type="button" role="tab" id="tab-t" data-kind="t" aria-controls="file-tree" aria-selected="false">Tests</button>
      <button type="button" role="tab" id="tab-c" data-kind="c" aria-controls="file-tree" aria-selected="false">Code</button>
    </div>
    <ul id="file-tree" role="tabpanel" aria-labelledby="tab-m"></ul>
  </nav>
  <main class="detail" id="source-view" aria-live="polite">
    <div id="breadcrumbs" role="navigation" aria-label="Breadcrumb" hidden><ol></ol></div>
    <div id="context-path" class="context-path" role="region" aria-label="Motive and specification context" hidden></div>
    <h2 id="source-title">Choose a file</h2>
    <div id="source-location" hidden></div>
    <p id="source-empty" class="empty">Select a file from the tree on the left to inspect its source and tags.</p>
    <pre id="source-file" hidden></pre>
    <section id="node-relations" class="node-relations" aria-label="Tag relationships" hidden>
      <h3>Relationships</h3>
      <ul id="node-relations-list"></ul>
    </section>
  </main>
</div>
<script type="application/json" id="graph-data">__GRAPH_DATA__</script>
<script>
"use strict";
const aGraph = JSON.parse( document.getElementById( "graph-data" ).textContent );
const maNode = new Map( aGraph.vaNode.map(( aNode ) => [ aNode.id, aNode ]));
const maSource = new Map(( aGraph.vaSource || []).map(( aSource ) => [ aSource.sPath, aSource ]));
const aTypeName = { m: "Motive", s: "Specification", g: "Guidance",
  i: "Interactive check", tu: "Test unit", t: "Test file", c: "Implementation file",
  impl: "Implementation", proof: "Proof" };
const fsNodeTagLabel = ( aNode ) => [ "m", "s", "g", "i" ].includes( aNode.sType )
  || aNode.sType === "tu"
    ? "#" + aNode.sKey.replace( /^#/, "" ) : aNode.sKey;
const aTabName = { m: "Motives", s: "Specs", g: "Guidance", t: "Tests", c: "Code" };
const eLeftPane = document.getElementById( "left-pane" );
const eFileTabs = document.getElementById( "file-tabs" );
const eFileTree = document.getElementById( "file-tree" );
const eSourceView = document.getElementById( "source-view" );
const eSourceTitle = document.getElementById( "source-title" );
const eSourceLocation = document.getElementById( "source-location" );
const eSourceEmpty = document.getElementById( "source-empty" );
const eSourceFile = document.getElementById( "source-file" );
const eNodeRelations = document.getElementById( "node-relations" );
const eNodeRelationsList = document.getElementById( "node-relations-list" );
let sSelected = null;
let vaBreadcrumb = [];
let sActiveTab = "m";
let sCurrentPath = null;
let sSelectedTagKey = null;
const asExpandedFile = new Set();

const faNodeSourceTag = ( aNode ) => {
  const aSource = aNode?.sPath ? maSource.get( aNode.sPath ) : null;
  const aTag = aSource?.vaTag.find(( aEntry ) => aEntry.sNodeId === aNode.id );
  if( !aSource || !aTag ){ return null;}
  const nStartLine = aSource.sText.slice( 0, aTag.nSnippetStart ).split( "\\n" ).length;
  let nEndLine = aSource.sText.slice( 0, aTag.nSnippetEnd ).split( "\\n" ).length;
  if( aTag.nSnippetEnd > 0
    && aSource.sText[ aTag.nSnippetEnd - 1 ] === "\\n" ){ nEndLine--;}
  return { aSource, aTag, nStartLine, nEndLine: Math.max( nStartLine, nEndLine ) };
};

const fe = ( sTag, sText, sClass = "" ) => {
  const e = document.createElement( sTag );
  if( sText !== null ){ e.textContent = sText;}
  if( sClass ){ e.className = sClass;}
  return e;
};

const fsTagKey = ( sPath, aTag ) => sPath + "#" + aTag.nStart;

const fRenderBreadcrumb = () => {
  const eBreadcrumb = document.getElementById( "breadcrumbs" );
  const eItems = eBreadcrumb.querySelector( "ol" );
  eItems.replaceChildren();
  const nLastMotive = vaBreadcrumb.reduce(( nLast, sId, nIndex ) => (
    maNode.get( sId )?.sType === "m" ? nIndex : nLast
  ), -1 );
  let vaEntry = [];
  if( nLastMotive >= 0 ){
    const vaAfterMotive = vaBreadcrumb.slice( nLastMotive )
      .map(( sId, nOffset ) => ({ sId, nIndex: nLastMotive + nOffset }));
    vaEntry = vaAfterMotive.length <= 4
      ? vaAfterMotive
      : [ vaAfterMotive[ 0 ], null, ...vaAfterMotive.slice( -2 ) ];
  }
  else{
    vaEntry = vaBreadcrumb.length <= 4
      ? vaBreadcrumb.map(( sId, nIndex ) => ({ sId, nIndex }))
      : [ null, ...vaBreadcrumb.slice( -3 ).map(( sId, nOffset ) => ({
        sId, nIndex: vaBreadcrumb.length - 3 + nOffset
      })) ];
  }
  vaEntry.forEach(( aEntry ) => {
    const eItem = fe( "li", null );
    if( aEntry === null ){
      const eEllipsis = fe( "span", "…" );
      eEllipsis.setAttribute( "aria-label", "Earlier navigation steps omitted" );
      eItem.appendChild( eEllipsis );
    }
    else{
      const aNode = maNode.get( aEntry.sId );
      if( aEntry.nIndex === vaBreadcrumb.length - 1 ){
        const eCurrent = fe( "span", fsNodeTagLabel( aNode ));
        eCurrent.setAttribute( "aria-current", "page" );
        eItem.appendChild( eCurrent );
      }
      else{
        const eButton = fe( "button", fsNodeTagLabel( aNode ));
        eButton.type = "button";
        eButton.addEventListener( "click", () => fSelectNode(
          aEntry.sId,
          {
            bPushHistory: true,
            vaBreadcrumb: vaBreadcrumb.slice( 0, aEntry.nIndex + 1 )
          }
        ));
        eItem.appendChild( eButton );
      }
    }
    eItems.appendChild( eItem );
  });
  eBreadcrumb.hidden = vaEntry.length === 0;
};

// @implements s-u5vc2t@12a57fb
// @implements s-zfoabw@9492c91
const fRenderContextPath = ( aSelected ) => {
  const ePath = document.getElementById( "context-path" );
  ePath.replaceChildren();
  ePath.hidden = true;
  if( ![ "s", "c", "t", "tu", "impl", "proof" ].includes( aSelected.sType ) ){ return;}
  let vaPath = vaBreadcrumb.filter(( sId ) => maNode.has( sId ));
  if( vaPath[ vaPath.length - 1 ] !== aSelected.id ){
    vaPath = vaPath.concat( aSelected.id );
  }
  let nMotive = vaPath.reduce(( nLast, sId, nIndex ) => (
    maNode.get( sId )?.sType === "m" ? nIndex : nLast
  ), -1 );
  if( nMotive < 0 ){
    const nSelectedSpec = vaPath.reduce(( nLast, sId, nIndex ) => (
      maNode.get( sId )?.sType === "s" ? nIndex : nLast
    ), -1 );
    const sAnchorSpec = aSelected.sType === "s"
      ? aSelected.id
      : nSelectedSpec >= 0 ? vaPath[ nSelectedSpec ] : null;
    const asSeen = new Set( sAnchorSpec === null ? [] : [ sAnchorSpec ] );
    let sCurrent = sAnchorSpec;
    const vaAncestor = [];
    while( sCurrent !== null && maNode.get( sCurrent )?.sType === "s" ){
      const aParent = aGraph.vaEdge.find(( aEdge ) => (
        aEdge.sFrom === sCurrent
        && aEdge.sRelation === "derived from"
        && [ "m", "s" ].includes( maNode.get( aEdge.sTo )?.sType )
        && !asSeen.has( aEdge.sTo )
      ));
      if( aParent === undefined ){ break;}
      sCurrent = aParent.sTo;
      asSeen.add( sCurrent );
      vaAncestor.unshift( sCurrent );
    }
    if( sAnchorSpec !== null ){
      vaPath = vaAncestor.concat( vaPath.slice( vaPath.indexOf( sAnchorSpec )));
    }
    nMotive = vaPath.reduce(( nLast, sId, nIndex ) => (
      maNode.get( sId )?.sType === "m" ? nIndex : nLast
    ), -1 );
  }
  const nContextStart = nMotive >= 0 ? nMotive : vaPath.reduce(( nLast, sId, nIndex ) => (
    maNode.get( sId )?.sType === "s" ? nIndex : nLast
  ), -1 );
  if( nContextStart < 0 ){ return;}
  vaPath = vaPath.slice( nContextStart, -1 );
  if( vaPath.length === 0 ){ return;}
  ePath.hidden = false;
  vaPath.forEach(( sId, nIndex ) => {
    const aNode = maNode.get( sId );
    if( [ "m", "s" ].includes( aNode.sType ) ){
      const eCard = fe( "section", null, "context-card" );
      const eHeading = fe( "div", null, "context-heading" );
      const eHeadingLink = fe( "a", fsNodeTagLabel( aNode ));
      eHeadingLink.href = "#node=" + encodeURIComponent( aNode.id );
      eHeadingLink.addEventListener( "click", ( e ) => {
        e.preventDefault();
        fSelectNode( aNode.id, { bPushHistory: true,
          vaBreadcrumb: vaBreadcrumb.slice( 0, vaBreadcrumb.indexOf( sId ) + 1 ) });
      });
      eHeading.appendChild( fe( "strong", aTypeName[ aNode.sType ] + " · " ));
      eHeading.appendChild( eHeadingLink );
      eCard.appendChild( eHeading );
      eCard.appendChild( fe( "p", aNode.sText, "context-text" ));
      const aLocation = faNodeSourceTag( aNode );
      if( aLocation ){
        const eLocations = fe( "div", null, "context-locations" );
        const eFile = fe( "a", aLocation.aSource.sPath );
        eFile.href = "#file=" + encodeURIComponent( aLocation.aSource.sPath );
        eFile.addEventListener( "click", ( e ) => {
          e.preventDefault();
          fSelectFile( aLocation.aSource.sPath, {
            bPushHistory: true,
            sTab: fsKindForTag( aLocation.aSource, aLocation.aTag ),
            vaBreadcrumb: vaBreadcrumb.slice( 0, vaBreadcrumb.indexOf( sId ) + 1 )
          });
        });
        const sLineRange = aLocation.nStartLine === aLocation.nEndLine
          ? "L" + aLocation.nStartLine
          : "L" + aLocation.nStartLine + "-L" + aLocation.nEndLine;
        const eLines = fe( "a", sLineRange );
        eLines.href = "#node=" + encodeURIComponent( aNode.id );
        eLines.addEventListener( "click", ( e ) => {
          e.preventDefault();
          fSelectNode( aNode.id, { bPushHistory: true,
            vaBreadcrumb: vaBreadcrumb.slice( 0, vaBreadcrumb.indexOf( sId ) + 1 ) });
        });
        eLocations.append( eFile, eLines );
        eCard.appendChild( eLocations );
      }
      ePath.appendChild( eCard );
    }
    else{
      const eButton = fe( "button", aTypeName[ aNode.sType ] + " · "
        + fsNodeTagLabel( aNode ), "context-collapsed" );
      eButton.type = "button";
      eButton.dataset.contextNodeId = aNode.id;
      eButton.addEventListener( "click", () => fSelectNode( aNode.id, {
        bPushHistory: true,
        vaBreadcrumb: vaBreadcrumb.slice( 0, vaBreadcrumb.indexOf( sId ) + 1 )
      }));
      ePath.appendChild( eButton );
    }
    ePath.appendChild( fe( "div", "▼", "context-arrow" ));
  });
};

const fsKindForTag = ( aSource, aTag ) => {
  const sType = aTag.sNodeId?.split( ":" )[ 0 ];
  if( sType === "m" ){ return "m";}
  if( sType === "g" ){ return "g";}
  if( sType === "s" || sType === "i" ){ return "s";}
  if( sType === "proof" ){ return "t";}
  if( sType === "tu" ){ return "t";}
  if( sType === "impl" ){ return "c";}
  if( sType === "t" ){ return "t";}
  if( sType === "c" ){ return "c";}
  return aSource.vaKind?.[ 0 ] || "c";
};

const fsTreeTagLabel = ( sToken ) => {
  const aMarkerId = /^\{#([a-z]-[a-z0-9]+)/.exec( sToken );
  return aMarkerId ? "#" + aMarkerId[ 1 ] : sToken;
};

const fsTreeTagDisplay = ( aTag ) => {
  const aNode = aTag.sNodeId ? maNode.get( aTag.sNodeId ) : null;
  return aNode && [ "impl", "proof", "tu" ].includes( aNode.sType )
    ? ( aNode.sType === "tu" ? "#" + aNode.sKey : aNode.sKey )
    : fsTreeTagLabel( aTag.sToken );
};

const fsTagPreview = ( aSource, aTag ) => fsClipPreview(
  aSource.sText.slice(
    aTag.nSnippetStart ?? aTag.nEnd,
    aTag.nSnippetEnd ?? aSource.sText.length
  ).trim()
);

const fRenderFileTree = () => {
  const nScrollTop = eLeftPane.scrollTop;
  const bFocusInside = eLeftPane.contains( document.activeElement );
  const eOldFocus = document.activeElement;
  const sFocusFile = eOldFocus?.dataset.filePath;
  const sFocusTag = eOldFocus?.dataset.tagKey;
  const sFocusTab = eOldFocus?.dataset.kind;
  eFileTabs.querySelectorAll( "[role=tab]" ).forEach(( eTab ) => {
    eTab.setAttribute( "aria-selected", String( eTab.dataset.kind === sActiveTab ));
  });
  eFileTree.setAttribute( "aria-labelledby", "tab-" + sActiveTab );
  eFileTree.replaceChildren();
  const vaFile = aGraph.vaSource
    .filter(( aSource ) => aSource.vaKind.includes( sActiveTab ))
    .sort(( aA, aB ) => aA.sPath.localeCompare( aB.sPath ));
  vaFile.forEach(( aSource ) => {
    const eItem = fe( "li", null );
    eItem.className = "file-entry";
    const bExpanded = asExpandedFile.has( aSource.sPath );
    const eFile = fe( "button", null, "file-button" );
    eFile.type = "button";
    eFile.dataset.filePath = aSource.sPath;
    eFile.setAttribute( "aria-expanded", String( bExpanded ));
    if( sCurrentPath === aSource.sPath && sSelectedTagKey === null ){
      eFile.setAttribute( "aria-current", "true" );
    }
    eFile.appendChild( fe( "span", bExpanded ? "▾" : "▸", "file-caret" ));
    eFile.appendChild( fe( "span", aSource.sPath ));
    eFile.addEventListener( "click", () => {
      if( asExpandedFile.has( aSource.sPath )){
        asExpandedFile.delete( aSource.sPath );
      }
      else{
        asExpandedFile.add( aSource.sPath );
      }
      fSelectFile( aSource.sPath, { bPushHistory: true });
    });
    eItem.appendChild( eFile );
    if( bExpanded ){
      const eTags = fe( "ul", null );
      eTags.className = "file-tags";
      const asShownSynthetic = new Set();
      aSource.vaTag.forEach(( aTag ) => {
        const aTagNode = aTag.sNodeId ? maNode.get( aTag.sNodeId ) : null;
        if( aTagNode && [ "impl", "proof" ].includes( aTagNode.sType )){
          if( asShownSynthetic.has( aTagNode.id )){ return;}
          asShownSynthetic.add( aTagNode.id );
        }
        const eTagItem = fe( "li", null );
        const sKey = fsTagKey( aSource.sPath, aTag );
        const bCurrent = sSelectedTagKey === sKey
          || ( aTagNode && aTagNode.id === sSelected );
        const eTag = fe( bCurrent ? "span" : "button",
          fsTreeTagDisplay( aTag ), "tag-button" );
        if( bCurrent ){ eTag.tabIndex = -1;}
        else{ eTag.type = "button";}
        eTag.dataset.tagKey = sKey;
        eTag.title = fsTagPreview( aSource, aTag ) || aTag.sToken;
        eTag.setAttribute( "aria-label", aTag.sToken + " in " + aSource.sPath );
        if( bCurrent ){ eTag.setAttribute( "aria-current", "page" );}
        else{
          eTag.addEventListener( "click", () => fSelectTag( aSource, aTag, {
            bPushHistory: true,
            bFromTree: true
          }));
        }
        eTagItem.appendChild( eTag );
        eTags.appendChild( eTagItem );
      });
      eItem.appendChild( eTags );
    }
    eFileTree.appendChild( eItem );
  });
  if( vaFile.length === 0 ){
    eFileTree.appendChild( fe( "li", "No files in this category.", "empty" ));
  }
  if( bFocusInside ){
    const eFocus = sFocusTag
      ? Array.from( eFileTree.querySelectorAll( "[data-tag-key]" ) )
        .find(( eNode ) => eNode.dataset.tagKey === sFocusTag )
      : sFocusFile
        ? Array.from( eFileTree.querySelectorAll( "[data-file-path]" ) )
          .find(( eNode ) => eNode.dataset.filePath === sFocusFile )
        : sFocusTab
          ? eFileTabs.querySelector( '[data-kind="' + sFocusTab + '"]' )
          : null;
    eFocus?.focus({ preventScroll: true });
  }
  eLeftPane.scrollTop = nScrollTop;
};

const fSetHistory = ( aState, aOptions ) => {
  if( aOptions.bFromHistory ){ return;}
  const aCurrent = window.history.state;
  if( aOptions.bPushHistory && aCurrent?.sPath === aState.sPath
    && aCurrent?.sTagKey === aState.sTagKey
  ){ return;}
  const sHash = aState.sTagKey
    ? "#tag=" + encodeURIComponent( aState.sTagKey )
    : "#file=" + encodeURIComponent( aState.sPath );
  if( aOptions.bPushHistory ){
    window.history.pushState( aState, "", sHash );
  }
  else{
    window.history.replaceState( aState, "", sHash );
  }
};

// @implements s-h4734p@ff80843
// @implements s-9o22fp@7cf17b6
// @implements s-f6hd06@9bd776f
const fSelectFile = ( sPath, aOptions = {}) => {
  const aSource = maSource.get( sPath );
  if( aSource === undefined ){ return;}
  const aNode = aOptions.sNodeId ? maNode.get( aOptions.sNodeId ) : null;
  if( aOptions.sTab ){
    sActiveTab = aOptions.sTab;
  }
  else if( aNode ){
    sActiveTab = fsKindForTag( aSource, { sNodeId: aNode.id });
    asExpandedFile.add( sPath );
  }
  sCurrentPath = sPath;
  sSelectedTagKey = null;
  sSelected = aNode?.id || null;
  vaBreadcrumb = aOptions.vaBreadcrumb || ( aNode
    ? vaBreadcrumb.concat( aNode.id )
    : [] );
  if( aNode ){
    fRenderBreadcrumb();
    fRenderContextPath( aNode );
  }
  else{
    document.getElementById( "breadcrumbs" ).hidden = true;
    const eContext = document.getElementById( "context-path" );
    eContext.replaceChildren();
    eContext.hidden = true;
  }
  fSetHistory({
    sPath, sTagKey: null, sNodeId: sSelected, sTab: sActiveTab, vaBreadcrumb
  }, aOptions);
  fRenderFileTree();
  fShowSource( sPath );
};

const fSelectTag = ( aSource, aTag, aOptions = {}) => {
  const sPath = aSource.sPath;
  const sTagKey = fsTagKey( sPath, aTag );
  const sNodeId = aTag.sNodeId || null;
  sCurrentPath = sPath;
  sSelectedTagKey = sTagKey;
  sSelected = sNodeId;
  asExpandedFile.add( sPath );
  sActiveTab = fsKindForTag( aSource, aTag );
  if( sNodeId ){
    vaBreadcrumb = aOptions.vaBreadcrumb
      || vaBreadcrumb.concat( sNodeId );
    const aNode = maNode.get( sNodeId );
    if( aNode ){ fRenderContextPath( aNode );}
  }
  else{
    vaBreadcrumb = [];
    const eContext = document.getElementById( "context-path" );
    eContext.replaceChildren();
    eContext.hidden = true;
  }
  fRenderBreadcrumb();
  fSetHistory({ sPath, sTagKey, sNodeId, sTab: sActiveTab, vaBreadcrumb }, aOptions);
  fRenderFileTree();
  fShowTagSnippet( sPath, aTag );
};

const fsClipPreview = ( sText ) => {
  const vsLine = sText.split( "\\n" );
  let sPreview = vsLine.slice( 0, 12 ).join( "\\n" );
  let bTruncated = vsLine.length > 12;
  if( sPreview.length > 400 ){
    sPreview = sPreview.slice( 0, 400 );
    bTruncated = true;
  }
  return sPreview === "" ? "" : bTruncated ? sPreview + "…" : sPreview;
};

function fSelectNode( sId, aOptions = {}){
  const aNode = maNode.get( sId );
  if( aNode === undefined ){ return;}
  const aSource = Array.from( maSource.values()).find(( aFile ) => (
    aFile.vaTag.some(( aTag ) => aTag.sNodeId === sId )
  ));
  const aTag = aSource?.vaTag.find(( aEntry ) => aEntry.sNodeId === sId );
  if( aSource && aTag ){
    fSelectTag( aSource, aTag, aOptions );
    return;
  }
  const sPath = aNode.sSourcePath || aNode.sPath;
  if( typeof sPath === "string" && maSource.has( sPath ) ){
    const vaBreadcrumbNext = aOptions.vaBreadcrumb || (
      vaBreadcrumb[ vaBreadcrumb.length - 1 ] === sId
        ? vaBreadcrumb
        : vaBreadcrumb.concat( sId )
    );
    fSelectFile( sPath, {
      ...aOptions,
      sNodeId: sId,
      vaBreadcrumb: vaBreadcrumbNext
    });
  }
}

window.addEventListener( "popstate", ( e ) => {
  if( e.state?.sPath && maSource.has( e.state.sPath )){
    sActiveTab = e.state.sTab || maSource.get( e.state.sPath ).vaKind[ 0 ] || "c";
    if( e.state.sTagKey ){
      const aSource = maSource.get( e.state.sPath );
      const aTag = aSource.vaTag.find(( aEntry ) => (
        fsTagKey( aSource.sPath, aEntry ) === e.state.sTagKey
      ));
      if( aTag ){
        fSelectTag( aSource, aTag, {
          bFromHistory: true,
          vaBreadcrumb: e.state.vaBreadcrumb
        });
      }
    }
    else{
      fSelectFile( e.state.sPath, {
        bFromHistory: true,
        sNodeId: e.state.sNodeId || null,
        sTab: e.state.sTab,
        vaBreadcrumb: e.state.vaBreadcrumb || []
      });
    }
  }
});

// @implements s-xqmdu3@a942669
// @implements s-f6hd06@9bd776f
function fShowSource(
  sPath, sFocusTagKey = null, bScrollToTag = false, bFocusTag = false
){
  const aSource = maSource.get( sPath );
  if( aSource === undefined ){ return;}
  eSourceTitle.textContent = sPath;
  eSourceLocation.hidden = true;
  eSourceLocation.replaceChildren();
  eSourceEmpty.hidden = true;
  eNodeRelations.hidden = true;
  eNodeRelationsList.replaceChildren();
  eSourceFile.hidden = false;
  eSourceFile.replaceChildren();
  let nAt = 0;
  aSource.vaTag.forEach(( aTag, nIndex ) => {
    if( aTag.nStart < nAt || aTag.nEnd > aSource.sText.length ){ return;}
    eSourceFile.appendChild( document.createTextNode( aSource.sText.slice( nAt, aTag.nStart )));
    if( aTag.bVirtual ){
      nAt = aTag.nEnd;
      return;
    }
    const sTagKey = fsTagKey( sPath, aTag );
    const bCurrent = sTagKey === sSelectedTagKey;
    const eLink = fe( bCurrent ? "span" : "a", null,
      "source-tag" + ( bCurrent ? " source-tag-current" : "" ));
    if( !bCurrent ){ eLink.href = "#source-snippet-" + nIndex;}
    eLink.dataset.tagKey = sTagKey;
    eLink.title = fsTagPreview( aSource, aTag ) || aTag.sToken;
    if( eLink.dataset.tagKey === sSelectedTagKey ){
      eLink.classList.add( "source-tag-selected" );
    }
    eLink.setAttribute( "aria-label", bCurrent
      ? "Current tag " + aTag.sToken
      : "View " + aTag.sToken + " snippet" );
    if( bCurrent ){ eLink.setAttribute( "aria-current", "page" );}
    fAppendTaggedText( eLink, aTag.sToken );
    if( !bCurrent ){
      eLink.addEventListener( "click", ( e ) => {
        e.preventDefault();
        fSelectTag( aSource, aTag, {
          bPushHistory: true,
          bFromSource: true
        });
      });
    }
    eSourceFile.appendChild( eLink );
    const eAnchor = fe( "span", null );
    eAnchor.id = "source-snippet-" + nIndex;
    eAnchor.dataset.tagKey = fsTagKey( sPath, aTag );
    eAnchor.tabIndex = -1;
    eSourceFile.appendChild( eAnchor );
    nAt = aTag.nEnd;
  });
  eSourceFile.appendChild( document.createTextNode( aSource.sText.slice( nAt )));
  if( bScrollToTag && sFocusTagKey !== null ){
    const eAnchor = Array.from( eSourceFile.querySelectorAll( "[data-tag-key]" ) )
      .find(( eEntry ) => eEntry.dataset.tagKey === sFocusTagKey );
    if( bFocusTag ){ eAnchor?.focus({ preventScroll: true });}
    eAnchor?.scrollIntoView?.({ block: "nearest" });
  }
}

function fAppendTaggedText( eParent, sText ){
  const rTag = /(?:im|pf|m|s|g|i|p|t|c)-[a-z0-9]+/g;
  let nAt = 0;
  let aMatch;
  while(( aMatch = rTag.exec( sText )) !== null ){
    eParent.appendChild( document.createTextNode( sText.slice( nAt, aMatch.index )));
    eParent.appendChild( fe( "span", aMatch[ 0 ], "tag" ));
    nAt = aMatch.index + aMatch[ 0 ].length;
  }
  eParent.appendChild( document.createTextNode( sText.slice( nAt )));
}

function fShowTagSnippet( sPath, aTag ){
  const aSource = maSource.get( sPath );
  if( aSource === undefined ){ return;}
  const nStart = aTag.nSnippetStart ?? aTag.nEnd;
  const nEnd = aTag.nSnippetEnd ?? aSource.sText.length;
  const eFileLink = fe( "a", sPath );
  eFileLink.href = "#file=" + encodeURIComponent( sPath );
  eFileLink.setAttribute( "aria-label", "Open full source file " + sPath );
  eFileLink.addEventListener( "click", ( e ) => {
    e.preventDefault();
    fSelectFile( sPath, {
      bPushHistory: true,
      sNodeId: aTag.sNodeId || undefined,
      vaBreadcrumb: aTag.sNodeId ? vaBreadcrumb.slice() : []
    });
  });
  const nStartLine = aSource.sText.slice( 0, nStart ).split( "\\n" ).length;
  let nEndLine = aSource.sText.slice( 0, nEnd ).split( "\\n" ).length;
  if( nEnd > 0 && aSource.sText[ nEnd - 1 ] === "\\n" ){ nEndLine--;}
  nEndLine = Math.max( nStartLine, nEndLine );
  const sLineRange = nStartLine === nEndLine
    ? "L" + nStartLine : "L" + nStartLine + "-L" + nEndLine;
  const eLineLink = fe( "a", sLineRange );
  eLineLink.href = "#tag=" + encodeURIComponent( fsTagKey( sPath, aTag ));
  eLineLink.setAttribute( "aria-label", "Current source lines " + sLineRange );
  eLineLink.addEventListener( "click", ( e ) => {
    e.preventDefault();
    fSelectTag( aSource, aTag, { bPushHistory: true });
  });
  eSourceTitle.textContent = fsTreeTagDisplay( aTag );
  eSourceLocation.replaceChildren( eFileLink, document.createTextNode( " · " ), eLineLink );
  eSourceLocation.hidden = false;
  eSourceEmpty.hidden = true;
  eSourceFile.hidden = false;
  eSourceFile.replaceChildren(
    document.createTextNode( aSource.sText.slice( nStart, nEnd ).trim())
  );
  fRenderTagRelationships( aTag.sNodeId );
}

const asRelationLabel = {
  "derived from": [ "derived-from", "derived-by" ],
  includes: [ "includes", "included-by" ],
  proves: [ "proof-of", "proved-by" ],
  guards: [ "guards", "guarded-by" ],
  implements: [ "implemented-from", "implemented-by" ],
  "tested by": [ "tested-by", "tests" ],
  checks: [ "checks", "checked-by" ],
  follows: [ "follows", "followed-by" ]
};

function fRenderTagRelationships( sSelectedId ){
  eNodeRelations.hidden = true;
  eNodeRelationsList.replaceChildren();
  const aSelected = maNode.get( sSelectedId );
  if( aSelected === undefined ){ return;}
  const vaRelationship = aGraph.vaEdge.flatMap(( aEdge ) => {
    if( aEdge.sFrom === sSelectedId ){
      return [{ sNodeId: aEdge.sTo, sRelation: aEdge.sRelation, bIncoming: false }];
    }
    if( aEdge.sTo === sSelectedId ){
      return [{ sNodeId: aEdge.sFrom, sRelation: aEdge.sRelation, bIncoming: true }];
    }
    return [];
  });
  const maGroup = new Map();
  vaRelationship.forEach(( aLink ) => {
    const aNode = maNode.get( aLink.sNodeId );
    if( aNode === undefined ){ return;}
    const vaLabel = asRelationLabel[ aLink.sRelation ] || [
      aLink.sRelation, aLink.sRelation + "-by"
    ];
    const sLabel = vaLabel[ aLink.bIncoming ? 1 : 0 ];
    const vaNode = maGroup.get( sLabel ) || [];
    if( !vaNode.some(( aEntry ) => aEntry.id === aNode.id )){
      vaNode.push( aNode );
      maGroup.set( sLabel, vaNode );
    }
  });
  maGroup.forEach(( vaNode, sLabel ) => {
    const eItem = fe( "li", null );
    eItem.appendChild( fe( "strong", sLabel + ": " ));
    const eTargets = fe( "ul", null, "relationship-targets" );
    vaNode.forEach(( aNode ) => {
      const eTarget = fe( "li", null );
      if( aNode.id === sSelectedId ){
        const eCurrent = fe( "span", fsNodeTagLabel( aNode ));
        eCurrent.setAttribute( "aria-current", "page" );
        eTarget.appendChild( eCurrent );
      }
      else{
        const eLink = fe( "a", fsNodeTagLabel( aNode ));
        eLink.href = "#node=" + encodeURIComponent( aNode.id );
        eLink.addEventListener( "click", ( e ) => {
          e.preventDefault();
          fSelectNode( aNode.id, { bPushHistory: true });
        });
        eTarget.appendChild( eLink );
      }
      eTargets.appendChild( eTarget );
    });
    eItem.appendChild( eTargets );
    eNodeRelationsList.appendChild( eItem );
  });
  eNodeRelations.hidden = eNodeRelationsList.childElementCount === 0;
}

eFileTabs.addEventListener( "click", ( e ) => {
  const eTab = e.target.closest( "[role=tab]" );
  if( eTab === null ){ return;}
  sActiveTab = eTab.dataset.kind;
  fRenderFileTree();
});

eFileTabs.addEventListener( "keydown", ( e ) => {
  if( ![ "ArrowLeft", "ArrowRight" ].includes( e.key ) ){ return;}
  const vaTab = Array.from( eFileTabs.querySelectorAll( "[role=tab]" ));
  const nCurrent = vaTab.indexOf( e.target.closest( "[role=tab]" ));
  if( nCurrent < 0 ){ return;}
  e.preventDefault();
  const nDelta = e.key === "ArrowRight" ? 1 : -1;
  const eNext = vaTab[ ( nCurrent + nDelta + vaTab.length ) % vaTab.length ];
  eNext.focus({ preventScroll: true });
  eNext.click();
});

fRenderFileTree();
</script>
</body>
</html>
`;
  return sTemplate.replace(
    "__GRAPH_DATA__", () => fsJsonForHtml( aData )
  );
};

// @implements s-e4hinp@ceaad25
const fzTree = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  // @implements s-ru39z3@5f5c95c
  const aArgs = faArgs( vsArg );
  if( aArgs !== null && aArgs.bHelp ){
    fWrite( sUsage );
    return 0;
  }
  if( aArgs === null ){
    fWriteErr( sUsage );
    return 2;
  }
  const fModel = aDeps.faTreeModel || faContextModel;
  const aFs = aDeps.fs || fs;
  let aProject;
  try{
    aProject = fModel( sDirRoot );
  }
  catch( xError ){
    fWriteErr(
      "tree: unable to read the project Concord map: " + xError.message + "\n"
    );
    return 2;
  }
  if( aProject.sProblem !== null ){
    fWriteErr( "tree: " + aProject.sProblem + "\n" );
    return 2;
  }
  // @implements s-bsz0yt@5632c2a
  try{
    const sOutputPath = path.resolve( sDirRoot, aArgs.sOutput );
    const sHtml = fsTreePage( faTreeData( aProject.aModel ));
    aFs.mkdirSync( path.dirname( sOutputPath ), { recursive: true });
    aFs.writeFileSync( sOutputPath, sHtml, "utf8" );
    fWrite( aArgs.sOutput + "\n" );
    return 0;
  }
  catch( xError ){
    fWriteErr( "tree: unable to write HTML page: " + xError.message + "\n" );
    return 1;
  }
};

module.exports = { faArgs, faTreeData, fsTreePage, fzTree };
