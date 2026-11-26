// @implements s-5rpo9u@633cf2e
// @tested-by test/context.test.js
// @implements s-prordk@3a3312e
"use strict";

const { faContextModel } = require( "./spec-map.js" );

const sUsage = (
  "usage: concord context --for <architect|fixer> --intent <description> "
  + "--budget <tokens>\n"
);
const nTokenBytes = 4;
const asRole = new Set([ "architect", "fixer" ]);
const aTypeOrder = { m: 0, s: 1, t: 2, c: 3 };
const asStopWord = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am",
  "an", "and", "any", "are", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "but", "by", "can",
  "could", "did", "do", "does", "doing", "down", "during", "each",
  "few", "for", "from", "further", "had", "has", "have", "having",
  "he", "her", "here", "hers", "herself", "him", "himself", "his",
  "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "me", "more", "most", "my", "myself", "no", "nor", "not",
  "now", "of", "off", "on", "once", "only", "or", "other", "our",
  "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "theirs",
  "them", "themselves", "then", "there", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very",
  "was", "we", "were", "what", "when", "where", "which", "while",
  "who", "whom", "why", "will", "with", "you", "your", "yours",
  "yourself", "yourselves"
]);

const fvsIntentTerms = ( sText ) => Array.from(new Set(
  Array.from(
    sText.toLowerCase().matchAll( /[\p{L}\p{N}]+/gu ), ( va ) => va[ 0 ]
  ).filter(( sTerm ) => sTerm.length >= 3 && !asStopWord.has( sTerm ))
)).sort();

// @implements s-em1ktd@4384a7c
const fvaMotiveMatch = ( aModel, sIntent ) => {
  const vsIntentTerms = fvsIntentTerms( sIntent );
  if( vsIntentTerms.length === 0 ){
    return { vsIntentTerms, vaMatch: [] };
  }
  const nRequired = Math.min( 2, vsIntentTerms.length );
  // @implements s-fy8szt@a15e79e
  const vaMatch = aModel.vaMarker
    .filter(( aMarker ) => aMarker.sType === "m" && !aMarker.bMalformed )
    .map(( aMarker ) => {
      const asMotiveTerm = new Set( fvsIntentTerms( aMarker.sTextRaw ));
      const vsMatchedTerm = vsIntentTerms.filter(( sTerm ) => (
        asMotiveTerm.has( sTerm )
      ));
      return {
        aMarker,
        nMatch: vsMatchedTerm.length,
        nIntentTerms: vsIntentTerms.length,
        vsMatchedTerm
      };
    })
    .filter(( aMatch ) => aMatch.nMatch >= nRequired )
    .sort(( aA, aB ) => aB.nMatch - aA.nMatch
      || aA.aMarker.sId.localeCompare( aB.aMarker.sId ));
  // @implements s-em1ktd@4384a7c
  return { vsIntentTerms, vaMatch };
};

const fnEstimateTokens = ( sText ) => Math.ceil(
  Buffer.byteLength( sText, "utf8" ) / nTokenBytes
);

const fsIntentGuidance = () => (
  "Please generalize and elaborate it into 2–3 complete paragraphs describing "
  + "the underlying capability or domain, affected area, desired outcome, "
  + "and known constraints. Preserve the user's request, distinguish "
  + "inferences from stated requirements, and do not invent requirements; "
  + "then retry concord context with the fuller description."
);

const fsFence = ( sText ) => {
  const vnRun = Array.from( sText.matchAll( /`+/g ), ( vs ) => vs[ 0 ].length );
  return "`".repeat( Math.max( 3, ...vnRun.map(( n ) => n + 1 )));
};

const fsBody = ( aNode ) => {
  if( aNode.sType === "m" ){
    return aNode.aMarker.sTextRaw.trim();
  }
  if( aNode.sType === "s" ){
    return aNode.aMarker.sToken + aNode.aMarker.sTextIncluded;
  }
  return aNode.sContent;
};

const faArgs = ( vsArg ) => {
  if( vsArg.length === 1 && vsArg[ 0 ] === "--help" ){
    return { bHelp: true };
  }
  if( vsArg.length !== 6 ){ return null;}
  const avValue = new Map();
  for( let n = 0; n < vsArg.length; n += 2 ){
    const sFlag = vsArg[ n ];
    if( ![ "--for", "--intent", "--budget" ].includes( sFlag )
      || avValue.has( sFlag )
    ){
      return null;
    }
    avValue.set( sFlag, vsArg[ n + 1 ] );
  }
  const sRole = avValue.get( "--for" );
  const sIntent = avValue.get( "--intent" );
  const sBudget = avValue.get( "--budget" );
  const nBudget = Number( sBudget );
  if( !asRole.has( sRole ) || typeof sIntent !== "string"
    || sIntent.trim().length === 0
    || !/^\d+$/.test( sBudget || "" ) || !Number.isSafeInteger( nBudget )
    || nBudget < 1
  ){
    return null;
  }
  return { sRole, sIntent, nBudget };
};

const faNodeMarker = ( aMarker ) => ({
  sType: aMarker.sType,
  sKey: aMarker.sId,
  sPath: aMarker.sPath,
  nLine: aMarker.nLine,
  aMarker,
  nDistance: null,
  asVia: new Set(),
  vaLocation: []
});

const fsNodeKey = ( sType, sKey ) => sType + ":" + sKey;

// @implements s-7bh252@2251185
// @implements s-hux5ev@ce910fd
const fsRegionDetail = ( aFile, aRef ) => {
  const nStart = aRef.nSourceStartLine || 1;
  const nEnd = aRef.nSourceEndLine || nStart + 1;
  if( aFile.bSide ){
    const vsTarget = ( aFile.sTextTarget || "" ).split( "\n" );
    if( aRef.bSourceTargetRange ){
      return vsTarget.slice( nStart - 1, nEnd - 1 )
        .map(( sLine, n ) => `${nStart + n}: ${sLine}`)
        .join( "\n" );
    }
    return ( aFile.vnLineMap || [])
      .slice( nStart - 1, nEnd - 1 )
      .filter(( nLine ) => nLine !== null )
      .map(( nLine ) => `${nLine}: ${vsTarget[ nLine - 1] || ""}`)
      .join( "\n" );
  }
  return aFile.sText.split( "\n" )
    .slice( nStart - 1, nEnd - 1 )
    .map(( sLine, n ) => `${nStart + n}: ${sLine}`)
    .join( "\n" );
};

// @implements s-l7o3mk@ff8dad2
// @implements s-1ig26d@fec8eec
// @implements s-ixtkjn@9b9db2e
const faGraph = ( aModel, sIntent, sRole ) => {
  const maNode = new Map();
  const maDistance = new Map();
  const maVia = new Map();
  const maRootList = new Map(
    aModel.aRootRefs.vaList.map(( aList ) => [ aList.aMarker, aList ])
  );
  const avaConclusion = new Map();
  const faAddConclusion = ( aRoot, aConclusion ) => {
    if( aRoot === null || aConclusion === null
      || ![ "m", "s" ].includes( aRoot.sType )
      || ![ "m", "s" ].includes( aConclusion.sType )
    ){
      return;
    }
    const va = avaConclusion.get( aRoot ) || [];
    va.push( aConclusion );
    avaConclusion.set( aRoot, va );
  };
  aModel.aRootRefs.vaList
    .filter(( aList ) => aList.sReason === null )
    .forEach(( aList ) => aList.vaRef.forEach(( aRef ) => (
      faAddConclusion( aRef.aTarget, aList.aMarker )
    )));
  aModel.aRootRefs.vaInclusion
    .filter(( aIncl ) => aIncl.sReason === null )
    .forEach(( aIncl ) => faAddConclusion( aIncl.aTarget, aIncl.aMarker ));

  const { vsIntentTerms, vaMatch } = fvaMotiveMatch( aModel, sIntent );

  const fNodeForMarker = ( aMarker ) => {
    const sKey = fsNodeKey( aMarker.sType, aMarker.sId );
    if( !maNode.has( sKey )){ maNode.set( sKey, faNodeMarker( aMarker ));}
    const aNode = maNode.get( sKey );
    aNode.sGraphKey = sKey;
    return aNode;
  };
  const vaTodo = vaMatch.map(( aMatch ) => aMatch.aMarker );
  vaMatch.forEach(( aMatch ) => {
    const aNode = fNodeForMarker( aMatch.aMarker );
    aNode.nIntentMatch = aMatch.nMatch;
    aNode.nIntentTerms = aMatch.nIntentTerms;
    aNode.vsIntentMatch = aMatch.vsMatchedTerm;
    maDistance.set( aMatch.aMarker, 0 );
  });
  let nNext = 0;
  // @implements s-e2p7qo@e02b394
  // @implements s-lcw0l7@01524c4
  const fVisit = ( aFrom, aTo, nDistance ) => {
    const aNode = fNodeForMarker( aTo );
    const vaVia = maVia.get( aTo ) || new Set();
    vaVia.add( fsNodeKey( aFrom.sType, aFrom.sId ));
    maVia.set( aTo, vaVia );
    const nOld = maDistance.get( aTo );
    if( nOld === undefined || nDistance < nOld ){
      maDistance.set( aTo, nDistance );
      vaTodo.push( aTo );
    }
    aNode.nDistance = maDistance.get( aTo );
  };
  while( nNext < vaTodo.length ){
    const aMarker = vaTodo[ nNext++ ];
    const nDistance = maDistance.get( aMarker );
    ( avaConclusion.get( aMarker ) || []).forEach(( aConclusion ) => (
      fVisit( aMarker, aConclusion, nDistance + 1 )
    ));
    if( aMarker.sType === "s" ){
      const aList = maRootList.get( aMarker );
      if( aList !== undefined && aList.sReason === null ){
        aList.vaRef
          .filter(( aRef ) => aRef.aTarget !== null
            && aRef.aTarget.sType === "m"
          )
          .forEach(( aRef ) => fVisit(
            aMarker, aRef.aTarget, nDistance + 1
          ));
      }
    }
  }
  // @implements s-l7o3mk@ff8dad2
  maNode.forEach(( aNode, sKey ) => {
    aNode.nDistance = maDistance.get( aNode.aMarker );
    aNode.vsVia = Array.from( maVia.get( aNode.aMarker ) || []).sort();
    aNode.sKey = aNode.aMarker.sId;
    aNode.sGraphKey = sKey;
  });

  const asSpec = new Set(
    Array.from( maNode.values())
      .filter(( aNode ) => aNode.sType === "s")
      .map(( aNode ) => aNode.aMarker.sId)
  );
  if( sRole === "fixer" ){
    const maTestNode = new Map();
    const faTestUnitNode = ( aTest, aCall ) => {
      const sKey = `${aTest.sPath}#${aCall.sUnitId}`;
      let aNode = maTestNode.get( fsNodeKey( "t", sKey ));
      if( aNode === undefined ){
        aNode = {
          sType: "t", sKey, sPath: aTest.sPath,
          sUnitId: aCall.sUnitId, nDistance: Infinity,
          asVia: new Set(), vaLocation: [],
          sContent: `// ${aTest.sPath}:L${aCall.nFirstLine}-L${aCall.nLastLine}\n`
            + ( aCall.sBody === undefined ? "" : aCall.sBody )
        };
        maTestNode.set( fsNodeKey( "t", sKey ), aNode );
      }
      return aNode;
    };
    aModel.vaTestParsed.forEach(( aTest ) => aTest.vaCall
      .filter(( aCall ) => aCall.sKind === "test")
      .forEach(( aCall ) => {
        const vaRelevant = ( aCall.vaStmtCounted || [])
          .filter(( aStmt ) => asSpec.has( aStmt.sId ));
        if( vaRelevant.length === 0 ){ return;}
        const aNode = typeof aCall.sUnitId === "string"
          ? faTestUnitNode( aTest, aCall )
          : (() => {
            const sKey = fsNodeKey( "t", aTest.sPath );
            let aLegacy = maTestNode.get( sKey );
            if( aLegacy === undefined ){
              aLegacy = {
                sType: "t", sKey: aTest.sPath, sPath: aTest.sPath,
                nDistance: Infinity, asVia: new Set(), vaLocation: [],
                sContent: `// ${aTest.sPath}\n${aTest.sText || ""}`
              };
              maTestNode.set( sKey, aLegacy );
            }
            return aLegacy;
          })();
        vaRelevant.forEach(( aStmt ) => {
          const aSpecNode = maNode.get( fsNodeKey( "s", aStmt.sId ));
          aNode.nDistance = Math.min(
            aNode.nDistance, aSpecNode.nDistance + 1
          );
          aNode.asVia.add( aSpecNode.sGraphKey );
        });
        aNode.vaLocation.push({
          nLine: aCall.nFirstLine || aCall.nLine + 1,
          nStartLine: aCall.nFirstLine || aCall.nLine + 1,
          nEndLine: aCall.nLastLine || aCall.nLine + 1,
          sName: aCall.sName,
          vsStatement: vaRelevant.map(( aStmt ) => aStmt.sId).sort()
        });
      }));

    const maCodeNode = new Map();
    aModel.aLines.vaImplements.forEach(( aImpl ) => {
      if( !asSpec.has( aImpl.sId )){ return;}
      const sPath = aImpl.sPathCode || aImpl.sPath;
      const aFile = aModel.vaCode.find(( aEntry ) => aEntry.sPath === sPath );
      if( aFile === undefined ){ return;}
      const sKey = fsNodeKey( "c", sPath );
      let aNode = maCodeNode.get( sKey );
      if( aNode === undefined ){
        aNode = {
          sType: "c", sKey: sPath, sPath, nDistance: Infinity,
          asVia: new Set(), vaLocation: [], sContent: ""
        };
        maCodeNode.set( sKey, aNode );
      }
      const aSpecNode = maNode.get( fsNodeKey( "s", aImpl.sId ));
      aNode.nDistance = Math.min(
        aNode.nDistance, aSpecNode.nDistance + 1
      );
      aNode.asVia.add( aSpecNode.sGraphKey );
      aNode.vaLocation.push({
        nLine: aImpl.nLine,
        nStartLine: aImpl.nSourceStartLine,
        nEndLine: aImpl.nSourceEndLine - 1,
        sId: aImpl.sId
      });
      aNode.sContent += ( aNode.sContent === "" ? "" : "\n\n" )
        + `// ${sPath}:${aImpl.nSourceStartLine}-${aImpl.nSourceEndLine - 1}\n`
        + fsRegionDetail( aFile, aImpl );
    });

    const maCodePath = new Map(
      Array.from( maCodeNode.values()).map(( aNode ) => [ aNode.sPath, aNode ])
    );
    ( aModel.aLines.vaTestedBy || aModel.vaCodeRef )
      .filter(( aRef ) => aRef.sKind === "tested-by" && aRef.sReason === null)
      .forEach(( aRef ) => {
        const sPathCode = aRef.sPathCode || aRef.sPath;
        const vaImpl = aModel.aLines.vaImplements.filter(( aImpl ) => (
          ( aImpl.sPathCode || aImpl.sPath ) === sPathCode
          && ( aImpl.nSourceStartLine === undefined
            || aRef.nSourceStartLine === undefined
            || ( aImpl.nSourceStartLine < aRef.nSourceEndLine
              && aImpl.nSourceEndLine > aRef.nSourceStartLine ))
          && asSpec.has( aImpl.sId )
        ));
        if( vaImpl.length === 0 ){ return;}
        const aCode = maCodePath.get( sPathCode );
        const aTest = aModel.vaTestParsed.find(( aEntry ) => (
          aEntry.sPath === ( aRef.sTestPath || aRef.sTarget )
        ));
        if( aCode === undefined || aTest === undefined ){ return;}
        const asImplId = new Set( vaImpl.map(( aImpl ) => aImpl.sId ));
        if( aTest.vaLink !== undefined && !aTest.vaLink.some(( aLink ) => (
          aLink.sReason === null && asImplId.has( aLink.sId )
        ))){ return;}
        const aCall = aRef.sTestUnitId === undefined ? null
          : aTest.vaCall.find(( aEntry ) => (
            aEntry.sUnitId === aRef.sTestUnitId
          )) || null;
        const aNode = aCall === null
          ? (() => {
            const sKey = fsNodeKey( "t", aTest.sPath );
            let aLegacy = maTestNode.get( sKey );
            if( aLegacy === undefined ){
              aLegacy = {
                sType: "t", sKey: aTest.sPath, sPath: aTest.sPath,
                nDistance: aCode.nDistance + 1,
                asVia: new Set(), vaLocation: [],
                sContent: aTest.sText === undefined ? ""
                  : `// ${aTest.sPath}\n${aTest.sText}`
              };
              maTestNode.set( sKey, aLegacy );
            }
            return aLegacy;
          })()
          : faTestUnitNode( aTest, aCall );
        aNode.nDistance = Math.min( aNode.nDistance, aCode.nDistance + 1 );
        aNode.asVia.add( aCode.sKey );
        aNode.vaLocation.push({
          sPath: sPathCode, nLine: aRef.nLine,
          sRelation: "@tested-by", sUnitId: aRef.sTestUnitId
        });
      });
    ( aModel.aLines.vaChecks || [])
      .filter(( aRef ) => aRef.sReason === null)
      .forEach(( aRef ) => {
        const sPathCode = aRef.sPathCode || aRef.sPath;
        const vaImpl = aModel.aLines.vaImplements.filter(( aImpl ) => (
          ( aImpl.sPathCode || aImpl.sPath ) === sPathCode
          && ( aImpl.nSourceStartLine === undefined
            || aRef.nSourceStartLine === undefined
            || ( aImpl.nSourceStartLine < aRef.nSourceEndLine
              && aImpl.nSourceEndLine > aRef.nSourceStartLine ))
          && asSpec.has( aImpl.sId )
        ));
        if( vaImpl.length === 0 ){ return;}
        const aMarker = aModel.vaMarker.find(( aEntry ) => (
          aEntry.sType === "i" && aEntry.sId === aRef.sId
        ));
        if( aMarker === undefined ){ return;}
        const aNode = fNodeForMarker( aMarker );
        const aCode = maCodePath.get( sPathCode );
        if( aCode === undefined ){ return;}
        aNode.nDistance = Math.min( aNode.nDistance === null
          ? Infinity : aNode.nDistance,
          aCode.nDistance + 1 );
        aNode.vsVia = Array.from(new Set([
          ...( aNode.vsVia || [] ), aCode.sKey
        ])).sort();
        aNode.sContent = aMarker.sTextIncluded || aMarker.sTextRaw || "";
      });
    [ ...maTestNode.values(), ...maCodeNode.values() ].forEach(( aNode ) => {
      aNode.vsVia = Array.from( aNode.asVia ).sort();
      delete aNode.asVia;
      maNode.set( fsNodeKey( aNode.sType, aNode.sKey ), aNode );
    });
  }
  else{
    // @implements s-qi3gai@63b2ad5
    const maArtifact = new Map();
    const faAddPointer = ( sType, sPath, aFrom, aLocation,
      sSourcePath = sPath ) => {
      const sKey = fsNodeKey( sType, sPath );
      let aNode = maArtifact.get( sKey );
      if( aNode === undefined ){
        aNode = {
          sType, sKey: sPath, sPath: sSourcePath,
          nDistance: aFrom.nDistance + 1,
          asVia: new Set(), vaLocation: []
        };
        maArtifact.set( sKey, aNode );
      }
      aNode.nDistance = Math.min( aNode.nDistance, aFrom.nDistance + 1 );
      aNode.asVia.add( aFrom.sGraphKey || fsNodeKey( aFrom.sType, aFrom.sKey ));
      if( aLocation !== null ){ aNode.vaLocation.push( aLocation );}
    };
    aModel.vaTestParsed.forEach(( aTest ) => aTest.vaCall
      .filter(( aCall ) => aCall.sKind === "test")
      .forEach(( aCall ) => ( aCall.vaStmtCounted || [])
        .filter(( aStmt ) => asSpec.has( aStmt.sId ))
        .forEach(( aStmt ) => faAddPointer(
          "t", typeof aCall.sUnitId === "string"
            ? `${aTest.sPath}#${aCall.sUnitId}` : aTest.sPath,
          maNode.get( fsNodeKey( "s", aStmt.sId )),
          { nLine: aCall.nFirstLine || aCall.nLine + 1,
            nEndLine: aCall.nLastLine || aCall.nLine + 1,
            sName: aCall.sName }, aTest.sPath
        ))));
    aModel.aLines.vaImplements.forEach(( aImpl ) => {
      if( !asSpec.has( aImpl.sId )){ return;}
      const aFrom = maNode.get( fsNodeKey( "s", aImpl.sId ));
      faAddPointer( "c", aImpl.sPathCode || aImpl.sPath, aFrom, {
        nLine: aImpl.nLine, sId: aImpl.sId
      });
    });
    ( aModel.aLines.vaTestedBy || aModel.vaCodeRef )
      .filter(( aRef ) => aRef.sKind === "tested-by" && aRef.sReason === null)
      .forEach(( aRef ) => {
        const sPathCode = aRef.sPathCode || aRef.sPath;
        const aCode = maArtifact.get( fsNodeKey( "c", sPathCode ));
        const aTest = aModel.vaTestParsed.find(( aEntry ) => (
          aEntry.sPath === ( aRef.sTestPath || aRef.sTarget )
        ));
        if( aCode === undefined || aTest === undefined ){ return;}
        const aUnit = aRef.sTestUnitId === undefined ? null
          : aTest.vaCall.find(( aCall ) => (
            aCall.sUnitId === aRef.sTestUnitId
          ));
        if( aRef.sTestUnitId !== undefined && aUnit === undefined ){ return;}
        const sTarget = aUnit === null ? aTest.sPath
          : `${aTest.sPath}#${aUnit.sUnitId}`;
        faAddPointer( "t", sTarget, aCode, {
          sPath: sPathCode, nLine: aRef.nLine, sRelation: "@tested-by"
        }, aTest.sPath );
      });
    maArtifact.forEach(( aNode ) => {
      aNode.vsVia = Array.from( aNode.asVia ).sort();
      delete aNode.asVia;
      maNode.set( fsNodeKey( aNode.sType, aNode.sKey ), aNode );
    });
  }
  // @implements s-l7o3mk@ff8dad2
  maNode.forEach(( aNode ) => {
    aNode.vaLocation = Array.from(new Map(aNode.vaLocation.map(( aLocation ) => (
      [ JSON.stringify( aLocation ), aLocation ]
    ))).values());
  });
  return { sProblem: null, vsIntentTerms, vaNode: Array.from( maNode.values()) };
};

// @implements s-rq77hv@1f9748a
const fsSourceLabel = ( aNode ) => (
  aNode.sPath + ( aNode.nLine === undefined ? "" : ":" + aNode.nLine )
);

const fsLocation = ( aNode ) => {
  if( aNode.vaLocation.length === 0 ){ return "";}
  return aNode.vaLocation.map(( aLocation ) => {
    const sAt = ( aLocation.sPath || aNode.sPath ) + ":" + aLocation.nLine;
    const sRange = aLocation.nStartLine === undefined ? ""
      : ` lines ${aLocation.nStartLine}-${aLocation.nEndLine ?? aLocation.nStartLine}`;
    const sExtra = aLocation.sName === undefined ? ""
      : " " + JSON.stringify( aLocation.sName );
    const sIds = aLocation.vsStatement === undefined ? ""
      : " proves/guards " + aLocation.vsStatement.join( "," );
    const sId = aLocation.sId === undefined ? "" : " implements " + aLocation.sId;
    const sRelation = aLocation.sRelation === undefined ? "" : " " + aLocation.sRelation;
    return sAt + sRange + sExtra + sIds + sId + sRelation;
  }).join( "; " );
};

const fsVia = ( aNode ) => {
  const vsVia = aNode.vsVia.slice();
  if( aNode.vsIntentMatch !== undefined ){
    vsVia.unshift( "intent match: " + aNode.vsIntentMatch.join( ", " ));
  }
  return vsVia.length === 0 ? "seed" : vsVia.join( ", " );
};

// @implements s-fy8szt@a15e79e
const fsIntentMatch = ( aNode ) => aNode.vsIntentMatch === undefined
  ? ""
  : `Intent match: ${aNode.nIntentMatch}/${aNode.nIntentTerms} terms `
    + `(${( aNode.nIntentMatch / aNode.nIntentTerms ).toFixed( 2 )}); `
    + aNode.vsIntentMatch.join( ", ");

// @implements s-rq77hv@1f9748a
// @implements s-rj5i3n@d325e54
// @implements s-2mr2du@88ac91a
// @implements s-iucepc@5e8c3e9
const fsPointer = ( aNode ) => (
  `- [${aNode.sType}] ${aNode.sKey}`
  + ( aNode.sKey === aNode.sPath ? "" : ` — ${fsSourceLabel( aNode )}` )
  + ` — distance ${aNode.nDistance} — via ${fsVia( aNode)}`
  + ( fsIntentMatch( aNode ) === "" ? "" : " — " + fsIntentMatch( aNode ))
  + ( fsLocation( aNode ) === "" ? "" : " — " + fsLocation( aNode ))
);

// @implements s-7bh252@2251185
// @implements s-2mr2du@88ac91a
const fsDetail = ( aNode ) => {
  const sBody = fsBody( aNode );
  const sFence = fsFence( sBody );
  return `### [${aNode.sType}] ${aNode.sKey}\n`
    + `Source: ${fsSourceLabel( aNode )}\n`
    + `Distance: ${aNode.nDistance}; via: ${fsVia( aNode )}\n`
    + ( fsIntentMatch( aNode ) === "" ? "" : fsIntentMatch( aNode ) + "\n" )
    + ( fsLocation( aNode ) === "" ? "" : `Related locations: ${fsLocation( aNode )}\n` )
    + `\n${sFence}\n${sBody}\n${sFence}\n`;
};

// @implements s-iokfxu@5f70048
// @implements s-1fnspp@7c09551
// @implements s-2mr2du@88ac91a
const fsPackBody = ( aArgs, vaNode ) => {
  const vaDetail = vaNode.filter(( aNode ) => aNode.bDetail );
  const vaPointer = vaNode.filter(( aNode ) => !aNode.bDetail );
  const sFence = fsFence( aArgs.sIntent );
  const cMatch = vaNode.filter(( aNode ) => aNode.nIntentMatch !== undefined ).length;
  return "# Concord context pack\n\n"
    + `Role: ${aArgs.sRole}\nIntent:\n${sFence}\n${aArgs.sIntent}\n${sFence}\n`
    + `Lexical motive candidates: ${cMatch}\n`
    + ( cMatch === 0 ? "No recorded motives matched lexically.\n" : "" )
    + `Budget: ${aArgs.nBudget} estimated tokens\n\n`
    + "## Detailed nodes\n\n"
    + ( vaDetail.length === 0 ? "(none)\n\n"
      : vaDetail.map( fsDetail ).join( "\n" ) + "\n" )
    + "## Pointers\n\n"
    + ( vaPointer.length === 0 ? "(none)\n" : vaPointer.map( fsPointer ).join( "\n" ) + "\n" );
};

// @implements s-hxpbqi@bda9cc2
const faRender = ( aArgs, vaNode ) => {
  let nEstimate = 0;
  let sOut = "";
  for( let n = 0; n < 4; n++ ){
    const sBody = fsPackBody( aArgs, vaNode );
    sOut = sBody.replace(
      `Budget: ${aArgs.nBudget} estimated tokens\n`,
      `Budget: ${aArgs.nBudget} estimated tokens\nEstimated output: ${nEstimate} tokens\n`
    );
    const nNext = fnEstimateTokens( sOut );
    if( nNext === nEstimate ){ break;}
    nEstimate = nNext;
  }
  return { sOut, nEstimate: fnEstimateTokens( sOut ) };
};

// @implements s-iokfxu@5f70048
// @implements s-1fnspp@7c09551
const faSelectDetails = ( aArgs, vaNode ) => {
  vaNode.forEach(( aNode ) => { aNode.bDetail = false; });
  let aPack = faRender( aArgs, vaNode );
  if( aPack.nEstimate > aArgs.nBudget ){
    return {
      sProblem: `budget ${aArgs.nBudget} is too small for the intent and `
        + `pointer manifest; minimum is ${aPack.nEstimate} estimated tokens`
    };
  }
  for( const aNode of vaNode ){
    if( aArgs.sRole === "architect" && [ "t", "c" ].includes( aNode.sType )){
      continue;
    }
    aNode.bDetail = true;
    const aCandidate = faRender( aArgs, vaNode );
    if( aCandidate.nEstimate <= aArgs.nBudget ){
      aPack = aCandidate;
    }
    else{
      aNode.bDetail = false;
    }
  }
  return { sProblem: null, aPack: faRender( aArgs, vaNode ) };
};

// @implements s-y0zs35@09f15af
const fzContext = ( vsArg, sDirRoot, fWrite, fWriteErr, aDeps = {} ) => {
  const aArgs = faArgs( vsArg );
  if( aArgs !== null && aArgs.bHelp ){
    fWrite( sUsage );
    return 0;
  }
  if( aArgs === null ){
    fWriteErr( sUsage );
    return 2;
  }
  const nParagraphs = aArgs.sIntent.trim().split( /\n\s*\n/ )
    .filter(( sParagraph ) => sParagraph.trim() !== "" ).length;
  // @implements s-gmkk0o@cb2b2b5
  if( nParagraphs < 2 || fvsIntentTerms( aArgs.sIntent ).length < 20 ){
    fWriteErr(
      "context: the provided intent is too sparse. "
      + fsIntentGuidance() + "\n"
    );
    return 2;
  }
  // @implements s-y0zs35@09f15af
  try{
    const fModel = aDeps.faContextModel || faContextModel;
    const aProject = fModel( sDirRoot );
    if( aProject.sProblem !== null ){
      fWriteErr( "context: " + aProject.sProblem + "\n" );
      return 2;
    }
    const aGraph = faGraph( aProject.aModel, aArgs.sIntent, aArgs.sRole );
    // @implements s-64jr5f@c78e578
    if( !aGraph.vaNode.some(( aNode ) => aNode.nIntentMatch !== undefined )){
      fWriteErr(
        "context: no recorded motives matched this intent. Its wording may "
        + "differ from the project's recorded intent. "
        + fsIntentGuidance() + "\n"
      );
      return 2;
    }
    // @implements s-y0zs35@09f15af
    // @implements s-mx8w34@3474c2d
    const vaNode = aGraph.vaNode
      .sort(( aA, aB ) => aA.nDistance - aB.nDistance
        || aTypeOrder[ aA.sType ] - aTypeOrder[ aB.sType ]
      || ( aA.sType === "m" && aB.sType === "m"
        ? ( aB.nIntentMatch || 0 ) - ( aA.nIntentMatch || 0 ) : 0 )
      || aA.sKey.localeCompare( aB.sKey ));
    // @implements s-y0zs35@09f15af
    const aSelection = faSelectDetails( aArgs, vaNode );
    if( aSelection.sProblem !== null ){
      fWriteErr(
        "context: " + aSelection.sProblem + "\n"
      );
      return 1;
    }
    fWrite( aSelection.aPack.sOut );
    return 0;
  }
  catch( xError ){
    fWriteErr( "context: unable to build context pack: " + xError.message + "\n" );
    return 1;
  }
};

module.exports = {
  faGraph, faArgs, fnEstimateTokens, faSelectDetails, fzContext
};
