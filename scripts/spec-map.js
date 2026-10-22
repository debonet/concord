"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const { ConfigReader, fnPrefixMatched } = require( "./concord-config.js" );

const reHeading = /^(#{1,6})\s/;
const reCallTest = new RegExp(
  "(?<![\\w$.])(describe|test|it)(?:\\.(?:only|skip|concurrent|failing))*"
  + "(\\.each)?(?=\\s*[(`])",
  "g"
);
const reOwnerText = /^\s*@spec/;
const reOwnerLine = /^\s*\/\/ @spec +(specs\/\S+\.md)\s*$/;
const reLinkText = /^\s*@proves/;
const reLinkLine = new RegExp(
  "^\\s*// @proves +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})"
  + "(?: +part=([a-z0-9-]+))?\\s*$"
);
const reLinkLoose = /@proves\s+([a-z]-[a-z0-9]*)@?(\S*)/;
const reFollowsText = /^\s*@follows/;
const reFollowsLine = new RegExp(
  "^\\s*// @follows +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\\s*$"
);
const reFollowsBlock = new RegExp(
  "^\\s*/\\* *@follows +([a-z]-[a-z0-9]{6})@([0-9a-f]{7}) *\\*/\\s*$"
);
const reFollowsLoose = /@follows\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/;
const avsExtForLanguage = {
  javascript: [ ".js", ".mjs", ".cjs" ],
  css: [ ".css" ],
  rust: []
};
const asLanguageTest = new Set([ "javascript" ]);
const reNever = /(?!)/;
const reFileCss = /\.css$/;
const reRunLine = /^\s*\/\/\s*@(?:spec|proves)/;
const reWrapperText = /^\s*@test-wrapper +([A-Za-z_$][\w$]*)\s*$/;
const asNameCallTest = new Set([ "describe", "test", "it" ]);
const reDocblock = /\/\*\*[\s\S]*?\*\//g;
const reJestDocblock = /@jest-environment/;
const asWordBeforeRegex = new Set([
  "return", "typeof", "case", "in", "of", "void", "delete", "instanceof",
  "new", "throw", "yield", "await", "else", "do"
]);
const reSpacePlus = /\s*\+\s*/y;
const reSpace = /\s*/y;
const reFileTest = /\.test\.js$/;
const reMarkerOpen = /\{#[a-z]-/g;
const reMarkerToken = new RegExp(
  "\\{#([a-z]-[^}\\s{]*)"
  + "(?: <((?:(?! >| parts=| via=| for=| probe\\})[^}{\\n])*))?"
  + "(?: >((?:(?! parts=| via=| for=| probe\\})[^}{\\n])*))?"
  + "(?: parts=((?:(?! via=| for=| probe\\})[^}{\\n])*))?"
  + "(?: via=((?:(?! via=| for=| probe\\})[^}{\\n])*))?"
  + "(?: for=((?:(?! via=| probe\\})[^}{\\n])*))?"
  + "(?: via=((?:(?! via=| probe\\})[^}{\\n])*))?"
  + "( probe(?=\\}))?(\\})?",
  "y"
);
const rePartLabel = /^[a-z0-9-]+$/;
const cPartMin = 2;
const reIdPartWell = /^([a-z])-(?:([a-z0-9]{6})|\?([a-z0-9]*))$/;
const reRefId = /^([a-z]-[a-z0-9]{6})(?:@([0-9a-f]{7}))?$/;
const reRefLabel = /^([a-z])-\?([a-z0-9]+)$/;
const sArch = "arch";
const reBodyAny = /[a-z]-([a-z0-9]{6})/g;
const sTypeLine = "spdmig";
const sTypeRoot = "sm";
const sTypeTargeted = "pi";
const asNameForType = {
  s: "statement",
  p: "pointer",
  d: "definition",
  m: "motive",
  i: "interactive check",
  g: "guidance"
};
const reTargetId = /^[a-z]-[a-z0-9]{6}$/;
const reTargetSlug = new RegExp(
  "^(specs/[\\w.@/-]+\\.md)#([\\p{L}\\p{N}]+(?:-[\\p{L}\\p{N}]+)*)$", "u"
);
const reTargetPath = new RegExp(
  "^(?!/)(?!(?:.*/)?\\.\\.(?:/|$))[\\w.@-]+(?:/[\\w.@-]+)*/?$"
);
const reTargetFunction = /^([\w.@/-]+\.(?:js|mjs|cjs))#([A-Za-z_$][\w$]*)$/;
const reFileCode = /\.(?:js|mjs|cjs)$/;
const reCharWord = /[\p{L}\p{N}_$]/u;
const reCharSpace = /\s/;
const reSlashEnd = /\/+$/;
const sDirSpecs = "specs";
const sPathPageTemplate = path.join( __dirname, "worklist-page.html" );
const asVerdictForFlag = {
  "--pass": "pass", "--fail": "fail", "--unable": "unable", "--reopen": "reopen"
};
const asFlagNote = new Set([ "--pass", "--fail", "--unable" ]);
const asVerdictReset = new Set([ "reset", "reopen", "unable" ]);
const asKeyAnswer = new Set([ "pass", "fail", "unable" ]);
const asEntityForChar = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
};
const asWhyForReason = {
  reworded: "Reworded since its pass on ",
  code: "The code it checks changed since its pass on "
};
const sTitleNoCode = "interactive checks with no code target";
const sTitleProblem = "interactive checks with an open problem";
const reSlugGap = /[^\p{L}\p{N}]+/gu;
const reSlugEdge = /^-+|-+$/g;
const reTermBold = /^\*\*(.*?)\*\*/;
const reTermEnd = /[.:]$/;
const reMeaningLead = /^[\s\p{P}]+/u;
const reEscape = /[.*+?^${}()|[\]\\]/g;
const sLabelDo = "**Do:**";
const sLabelLook = "**Look for:**";
const reRuling = /RULING \((?:CEO|architect)\)/g;
const reRulingWhole = /^RULING \((?:CEO|architect)\)$/;
const reRulingLead = /^[*\s]*/;
const sRulingArch = "RULING (architect)";
const sTitleRuling = "rulings outside motives";
const sViaPrompt = "prompt";
const reArticleLead = /^(?:the|an|a)\s+/i;
const reFenceOpen = /^\s*(`{3,}|~{3,})/;
const reFenceClose = /^\s*(`{3,}|~{3,})\s*$/;
const reTableRow = /^\s*\|/;
const reBlockBullet = /^\s*(?:[*+-]|\d+[.)])(?= )/;
const reQuoteLead = /^\s*>(?:\s*>)*/;
const reTitle = /^#\s/;
const reH2Exempt = /^##\s+(?:Purpose|Dependencies)\b/;
const reWordChar = /[\p{L}\p{N}]/u;
const reQuoted = /"([^"]*)"/g;
const reTickRun = /`+/g;
const sLineComplete = "Statement ids: complete";
const sIdChar = "abcdefghijklmnopqrstuvwxyz0123456789";
const cIdChar = 6;
const cWordOpening = 8;
const cTermMin = 3;

const fvsMatch = ( re, sText ) => (
  Array.from( sText.matchAll( re ), ( vsGroup ) => vsGroup[ 1 ] )
);

const fnLevelHeading = ( sLine ) => {
  const vsGroup = sLine.match( reHeading );
  return vsGroup === null ? Infinity : vsGroup[ 1 ].length;
};

const fsNormal = ( sText ) => sText.replace( /\s+/g, " " ).trim();

const fsHashForText = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsWords = ( sText ) => (
  sText.split( " " ).slice( 0, cWordOpening ).join( " " )
);

const fsFenceAfter = ( sLine, sFence ) => {
  if( sFence === null ){
    const vsGroup = sLine.match( reFenceOpen );
    return vsGroup === null ? null : vsGroup[ 1 ];
  }
  const vsGroup = sLine.match( reFenceClose );
  const bClose = (
    vsGroup !== null
    && vsGroup[ 1 ][ 0 ] === sFence[ 0 ]
    && vsGroup[ 1 ].length >= sFence.length
  );
  return bClose ? null : sFence;
};

const fsKindForLine = ( sLine, sFence ) => {
  if( sFence !== null || reFenceOpen.test( sLine )){ return "fence";}
  if( sLine.trim() === "" ){ return "blank";}
  if( reHeading.test( sLine )){ return "heading";}
  if( reTableRow.test( sLine )){ return "table";}
  return reBlockBullet.test( sLine ) ? "bullet" : "text";
};

const fbBlockEnds = ( sLine ) => (
  sLine.trim() === ""
  || reHeading.test( sLine )
  || reTableRow.test( sLine )
  || reBlockBullet.test( sLine )
);

const fbLineInSpan = ( vsOpen, vsLine, nLine ) => {
  const nEnd = vsLine.findIndex(( sLine, n ) => (
    n > nLine && fbBlockEnds( sLine )
  ));
  const sBefore = vsOpen.join( "\n" ) + "\n";
  const sText = sBefore + vsLine.slice(
    nLine, nEnd < 0 ? vsLine.length : nEnd
  ).join( "\n" );
  return fbInSpan( fvtSpanForText( sText ), sBefore.length );
};

const fvsOpenAfter = ( vsOpen, sKind, sLine ) => {
  if( sKind === "bullet" ){ return [ sLine ];}
  if( sKind !== "text" ){ return null;}
  return vsOpen === null ? [ sLine ] : vsOpen.concat( sLine );
};

const fvsKindForLines = ( vsLine ) => {
  let sFence = null;
  let vsOpen = null;
  return vsLine.map(( sLine, nLine ) => {
    const bSpan = (
      sFence === null
      && vsOpen !== null
      && reFenceOpen.test( sLine )
      && fbLineInSpan( vsOpen, vsLine, nLine )
    );
    const sKind = bSpan ? "text" : fsKindForLine( sLine, sFence );
    if( !bSpan ){ sFence = fsFenceAfter( sLine, sFence );}
    vsOpen = fvsOpenAfter( vsOpen, sKind, sLine );
    return sKind;
  });
};

const fvaBlockForKind = ( vsKind ) => {
  const vaBlock = [];
  let aOpen = null;
  vsKind.forEach(( sKind, nLine ) => {
    if( sKind === "text" && aOpen !== null ){ aOpen.vnLine.push( nLine );}
    else if( sKind === "fence" || sKind === "blank" ){ aOpen = null;}
    else{
      const aBlock = {
        sKind: sKind === "text" ? "paragraph" : sKind,
        vnLine: [ nLine ]
      };
      vaBlock.push( aBlock );
      aOpen = sKind === "bullet" || sKind === "text" ? aBlock : null;
  }});
  return vaBlock;
};

const fnColForLine = ( sLine, bBullet ) => {
  const vsQuote = sLine.match( reQuoteLead );
  const vsBullet = bBullet ? sLine.match( reBlockBullet ) : null;
  return Math.max(
    vsQuote === null ? 0 : vsQuote[ 0 ].length,
    vsBullet === null ? 0 : vsBullet[ 0 ].length
  );
};

const faTextForBlock = ( aBlock, vsLine ) => {
  const vaSeg = [];
  let sText = "";
  aBlock.vnLine.forEach(( nLine, n ) => {
    const nCol = fnColForLine(
      vsLine[ nLine ], n === 0 && aBlock.sKind === "bullet"
    );
    if( n > 0 ){ sText += "\n";}
    vaSeg.push({ nLine, nCol, nStart: sText.length });
    sText += vsLine[ nLine ].slice( nCol );
  });
  return { ...aBlock, sText, vaSeg };
};

const fvtSpanForText = ( sText ) => {
  const vtRun = Array.from(
    sText.matchAll( reTickRun ), ( vs ) => [ vs.index, vs[ 0 ].length ]
  );
  const vtSpan = [];
  for( let n = 0; n < vtRun.length; n++ ){
    const nClose = vtRun.findIndex(( tRun, nRun ) => (
      nRun > n && tRun[ 1 ] === vtRun[ n ][ 1 ]
    ));
    if( nClose >= 0 ){
      vtSpan.push([ vtRun[ n ][ 0 ], vtRun[ nClose ][ 0 ], vtRun[ n ][ 1 ]]);
      n = nClose;
  }}
  return vtSpan;
};

const fbInSpan = ( vtSpan, nPos ) => vtSpan.some(( tSpan ) => (
  nPos >= tSpan[ 0 ] && nPos < tSpan[ 1 ] + tSpan[ 2 ]
));

const fvsSpanContent = ( sText ) => fvtSpanForText( sText ).map(( tSpan ) => (
  sText.slice( tSpan[ 0 ] + tSpan[ 2 ], tSpan[ 1 ]).trim()
));

const fvnMarkerForText = ( sText ) => {
  const vtSpan = fvtSpanForText( sText );
  return Array.from( sText.matchAll( reMarkerOpen ), ( vs ) => vs.index )
    .filter(( n ) => !fbInSpan( vtSpan, n ));
};

const fsGroup = ( vsGroup, n ) => (
  vsGroup[ n ] === undefined ? null : vsGroup[ n ]
);

const faTokenAt = ( sText, nPos ) => {
  reMarkerToken.lastIndex = nPos;
  const vsGroup = reMarkerToken.exec( sText );
  const vsWell = vsGroup[ 1 ].match( reIdPartWell );
  return {
    sToken: vsGroup[ 0 ],
    sIdPart: vsGroup[ 1 ],
    sType: vsGroup[ 1 ][ 0 ],
    sList: fsGroup( vsGroup, 2 ),
    sTargets: fsGroup( vsGroup, 3 ),
    sParts: fsGroup( vsGroup, 4 ),
    sFor: fsGroup( vsGroup, 6 ),
    sVia: fsGroup( vsGroup, 5 ) === null
      ? fsGroup( vsGroup, 7 )
      : fsGroup( vsGroup, 5 ),
    bViaEarly: vsGroup[ 5 ] !== undefined,
    bProbe: vsGroup[ 8 ] !== undefined,
    bClosed: vsGroup[ 9 ] !== undefined,
    bWell: vsWell !== null && sTypeLine.includes( vsGroup[ 1 ][ 0 ]),
    sBody: vsWell === null ? null : fsGroup( vsWell, 2 ),
    sLabel: vsWell === null ? null : fsGroup( vsWell, 3 )
  };
};

const fsTypeLine = ( sType ) => (
  ( asNameForType[ sType ] || "unknown" ) + " (" + sType + ")"
);

const fsOnType = ( sWhat, sType ) => (
  sWhat + " on a line of type " + fsTypeLine( sType )
);

const ftFunctionForTarget = ( sTarget ) => {
  const vsGroup = sTarget.match( reTargetFunction );
  return vsGroup === null || !reTargetPath.test( vsGroup[ 1 ])
    ? null
    : [ vsGroup[ 1 ], vsGroup[ 2 ]];
};

const fsKindForTarget = ( sTarget ) => {
  if( reTargetId.test( sTarget )){ return "id";}
  if( reTargetSlug.test( sTarget )){ return "slug";}
  if( ftFunctionForTarget( sTarget ) !== null ){ return "function";}
  return reTargetPath.test( sTarget ) ? "path" : null;
};

const fsPathClean = ( sPath ) => (
  fsPosix( path.normalize( sPath )).replace( reSlashEnd, "" )
);

const fbCodeTarget = ( sTarget ) => {
  const sKind = fsKindForTarget( sTarget );
  if( sKind === "function" ){ return true;}
  if( sKind !== "path" ){ return false;}
  const sPath = fsPathClean( sTarget );
  return sPath !== sDirSpecs && !sPath.startsWith( sDirSpecs + "/" );
};

const fvsTargetForMarker = ( aMarker ) => (
  aMarker.sTargets === null ? [] : aMarker.sTargets.split( "," )
);

const fsReasonForTargetForm = ( sTarget ) => {
  if( sTarget === "" ){ return "empty target";}
  return fsKindForTarget( sTarget ) === null
    ? "target " + sTarget + " in no known form"
    : null;
};

const fvsReasonForTargets = ( aToken ) => {
  if( !sTypeTargeted.includes( aToken.sType )){
    return aToken.sTargets === null
      ? []
      : [ fsOnType( "target list", aToken.sType )];
  }
  if( aToken.sTargets === null ){
    return [ "no target list on a line of type " + fsTypeLine( aToken.sType )];
  }
  return aToken.sTargets.split( "," )
    .map( fsReasonForTargetForm )
    .filter( Boolean );
};

const fsReasonForAudienceLabels = ( vsLabel ) => {
  if( vsLabel.includes( "" )){ return "audience list holds an empty label";}
  if( !vsLabel.every(( sLabel ) => rePartLabel.test( sLabel ))){
    return "audience list holds a label in another form";
  }
  return new Set( vsLabel ).size < vsLabel.length
    ? "audience list names a label twice"
    : null;
};

const fvsReasonForAudience = ( aToken ) => {
  if( aToken.sType !== "g" ){
    return aToken.sFor === null
      ? []
      : [ fsOnType( "audience list", aToken.sType )];
  }
  if( aToken.sFor === null ){ return [ "guidance with no audience list" ];}
  const sReason = fsReasonForAudienceLabels( aToken.sFor.split( "," ));
  return sReason === null ? [] : [ sReason ];
};

const fsReasonForVia = ( aToken ) => {
  if( aToken.sVia === null ){ return null;}
  if( aToken.sType !== "g" ){ return fsOnType( "via= flag", aToken.sType );}
  if( aToken.sVia !== sViaPrompt ){
    return "via= value " + aToken.sVia + " is not " + sViaPrompt;
  }
  return aToken.bViaEarly && aToken.sFor !== null
    ? "via= before the audience list"
    : null;
};

const fbViaPrompt = ( aToken ) => (
  aToken.sVia !== null && fsReasonForVia( aToken ) === null
);

const fvsReasonForAttr = ( aToken, sReasonParts ) => [
  aToken.sType !== "s" && aToken.sParts !== null
    ? fsOnType( "part list", aToken.sType )
    : sReasonParts,
  aToken.sType !== "s" && aToken.bProbe
    ? fsOnType( "probe flag", aToken.sType )
    : null,
  fsReasonForVia( aToken )
].filter( Boolean ).concat(
  fvsReasonForTargets( aToken ),
  fvsReasonForAudience( aToken )
);

const fsReasonMalformed = ( aToken, aBlock, sText ) => {
  if( !aToken.bWell && !sTypeLine.includes( aToken.sType )){
    return "malformed: no line type " + aToken.sType;
  }
  const bMalformed = (
    !aToken.bWell
    || !aToken.bClosed
    || aBlock.sKind === "heading"
    || sText === ""
  );
  return bMalformed ? "malformed" : null;
};

const fsReasonForParts = ( vsPart ) => {
  if( !vsPart.every(( sPart ) => rePartLabel.test( sPart ))){
    return "part list holds a label in another form";
  }
  if( vsPart.length < cPartMin ){
    return "part list holds fewer than two labels";
  }
  return new Set( vsPart ).size < vsPart.length
    ? "part list names a label twice"
    : null;
};

const faPartsForToken = ( sParts ) => {
  if( sParts === null ){ return { vsPart: null, sReasonParts: null };}
  const vsPart = sParts.split( "," );
  const sReasonParts = fsReasonForParts( vsPart );
  return { vsPart: sReasonParts === null ? vsPart : null, sReasonParts };
};

const faSegAt = ( vaSeg, nPos ) => (
  vaSeg.filter(( aSeg ) => aSeg.nStart <= nPos ).pop()
);

const faMarkerAt = ( aCtx, aBlock, vnMarker, nMarker ) => {
  const nPos = vnMarker[ nMarker ];
  const aToken = faTokenAt( aBlock.sText, nPos );
  const nEnd = nMarker + 1 < vnMarker.length
    ? vnMarker[ nMarker + 1 ]
    : aBlock.sText.length;
  const sText = fsNormal(
    aBlock.sText.slice( nPos + aToken.sToken.length, nEnd )
  );
  const bPlaceholder = aToken.bWell && aToken.sLabel !== null;
  const aSeg = faSegAt( aBlock.vaSeg, nPos );
  const aParts = aToken.sType === "s"
    ? faPartsForToken( aToken.sParts )
    : { vsPart: null, sReasonParts: null };
  const sReasonMalformed = fsReasonMalformed( aToken, aBlock, sText );
  return {
    ...aToken,
    ...aParts,
    sPath: aCtx.sPath,
    nLine: aSeg.nLine + 1,
    nOffset: aCtx.vnLineStart[ aSeg.nLine ] + aSeg.nCol + nPos - aSeg.nStart,
    nBlock: aBlock.nBlock,
    nPosBlock: nPos,
    nEndBlock: nEnd,
    sId: aToken.bWell && !bPlaceholder ? aToken.sIdPart : null,
    bPlaceholder: bPlaceholder && aToken.bClosed,
    bMalformed: sReasonMalformed !== null,
    sReasonMalformed,
    vsReasonAttr: fvsReasonForAttr( aToken, aParts.sReasonParts ),
    bViaPrompt: fbViaPrompt( aToken ),
    sText,
    sHash: fsHashForText( sText )
  };
};

const fvaMarkerForBlock = ( aCtx, aBlock ) => {
  const vnMarker = fvnMarkerForText( aBlock.sText );
  return vnMarker.map(( nPos, nMarker ) => (
    faMarkerAt( aCtx, aBlock, vnMarker, nMarker )
  ));
};

const fsLeadForBlock = ( aBlock ) => {
  const vnMarker = fvnMarkerForText( aBlock.sText );
  return fsNormal(
    vnMarker.length === 0 ? aBlock.sText : aBlock.sText.slice( 0, vnMarker[ 0 ])
  );
};

const fvxH2ForLine = ( vsLine, vsKind ) => {
  let sH2 = null;
  return vsLine.map(( sLine, n ) => {
    const nLevel = vsKind[ n ] === "heading" ? fnLevelHeading( sLine ) : 0;
    if( nLevel === 2 ){ sH2 = sLine;}
    else if( nLevel === 1 && sH2 !== null ){ sH2 = "";}
    return sH2;
  });
};

const fbCompleteForLines = ( vsLine ) => {
  const nTitle = vsLine.findIndex(( sLine ) => reTitle.test( sLine ));
  if( nTitle < 0 ){ return false;}
  const sNext = vsLine.slice( nTitle + 1 )
    .find(( sLine ) => sLine.trim() !== "" );
  return sNext !== undefined && sNext.trimEnd() === sLineComplete;
};

const fbShaped = ( aCtx, aBlock, sLead ) => {
  const nFirst = aBlock.vnLine[ 0 ];
  const sH2 = aCtx.vxH2[ nFirst ];
  return (
    ( aBlock.sKind === "paragraph" || aBlock.sKind === "bullet" )
    && sH2 !== null
    && !reH2Exempt.test( sH2 )
    && reWordChar.test( sLead )
    && !sLead.endsWith( ":" )
  );
};

const fvaUnmarkedForBlocks = ( aCtx, vaBlock ) => (
  vaBlock
    .map(( aBlock ) => ({ aBlock, sLead: fsLeadForBlock( aBlock ) }))
    .filter(( aEntry ) => fbShaped( aCtx, aEntry.aBlock, aEntry.sLead ))
    .map(( aEntry ) => ({
      sPath: aCtx.sPath,
      nLine: aEntry.aBlock.vnLine[ 0 ] + 1,
      sWords: fsWords( aEntry.sLead )
    }))
);

const fvaFenceUnclosed = ( sPath, vsLine, vsKind ) => {
  let sFence = null;
  let nOpen = -1;
  vsKind.forEach(( sKind, nLine ) => {
    if( sKind !== "fence" ){ return;}
    if( sFence === null ){ nOpen = nLine;}
    sFence = fsFenceAfter( vsLine[ nLine ], sFence );
  });
  return sFence === null
    ? []
    : [{ sPath, nLine: nOpen + 1, sText: vsLine[ nOpen ].trimEnd() }];
};

const fsSlugForHeading = ( sLine ) => (
  sLine.replace( reHeading, "" ).toLowerCase()
    .replace( reSlugGap, "-" )
    .replace( reSlugEdge, "" )
);

const faParseSpec = ( aSpec ) => {
  const vsLine = aSpec.sText.split( "\n" );
  const vsKind = fvsKindForLines( vsLine );
  const aCtx = {
    sPath: aSpec.sPath,
    vnLineStart: fvnLineStart( vsLine ),
    vxH2: fvxH2ForLine( vsLine, vsKind )
  };
  const vaBlock = fvaBlockForKind( vsKind )
    .map(( aBlock, nBlock ) => ({
      ...faTextForBlock( aBlock, vsLine ), nBlock
    }));
  return {
    sPath: aSpec.sPath,
    sText: aSpec.sText,
    vsLine,
    vsKind,
    vaBlock,
    asSlug: new Set( vsLine
      .filter(( sLine, n ) => vsKind[ n ] === "heading" )
      .map( fsSlugForHeading )),
    bComplete: fbCompleteForLines( vsLine ),
    vaFenceUnclosed: fvaFenceUnclosed( aSpec.sPath, vsLine, vsKind ),
    vaMarker: vaBlock.flatMap(( aBlock ) => fvaMarkerForBlock( aCtx, aBlock )),
    vaUnmarked: fvaUnmarkedForBlocks( aCtx, vaBlock )
  };
};

const fnAfterGroup = ( sText, nOpen ) => {
  let cDepth = 0;
  let chQuote = null;
  for( let n = nOpen; n < sText.length; n++ ){
    const ch = sText[ n ];
    if( chQuote !== null ){
      if( ch === "\\" ){ n++;}
      else if( ch === chQuote ){ chQuote = null;}
    }
    else if( ch === "\"" || ch === "'" || ch === "`" ){ chQuote = ch;}
    else if( ch === "(" || ch === "[" || ch === "{" ){ cDepth++;}
    else if( ch === ")" || ch === "]" || ch === "}" ){
      cDepth--;
      if( cDepth === 0 ){ return n + 1;}
  }}
  return sText.length;
};

const fnAfterTemplate = ( sText, nOpen ) => {
  for( let n = nOpen + 1; n < sText.length; n++ ){
    if( sText[ n ] === "\\" ){ n++;}
    else if( sText[ n ] === "`" ){ return n + 1;}
  }
  return sText.length;
};

const fnAfterTable = ( sText, nOpen ) => (
  sText[ nOpen ] === "`"
    ? fnAfterTemplate( sText, nOpen )
    : fnAfterGroup( sText, nOpen )
);

const fnAfterSticky = ( re, sText, n ) => {
  re.lastIndex = n;
  return re.test( sText ) ? re.lastIndex : -1;
};

const ftLiteralAt = ( sText, nOpen ) => {
  const chQuote = sText[ nOpen ];
  if( chQuote !== "\"" && chQuote !== "'" && chQuote !== "`" ){ return null;}
  let sBody = "";
  for( let n = nOpen + 1; n < sText.length; n++ ){
    if( sText[ n ] === "\\" ){ sBody += sText[ ++n ] || "";}
    else if( sText[ n ] === chQuote ){ return [ sBody, n + 1 ];}
    else{ sBody += sText[ n ];}
  }
  return null;
};

const fsNameAt = ( sText, nOpen ) => {
  let tLiteral = ftLiteralAt( sText, nOpen );
  if( tLiteral === null ){ return null;}
  let sName = tLiteral[ 0 ];
  for(;;){
    const nNext = fnAfterSticky( reSpacePlus, sText, tLiteral[ 1 ] );
    tLiteral = nNext < 0 ? null : ftLiteralAt( sText, nNext );
    if( tLiteral === null ){ return sName;}
    sName += tLiteral[ 0 ];
  }
};

class SourceMasker {
  constructor( sText ){
    this.vch = sText.split( "" );
    this.vnComment = [];
    this.vnCommentBlock = [];
    this.vcBrace = [];
    this.sState = "fnCode";
    this.chQuote = null;
    this.nQuote = -1;
    this.bClass = false;
  }

  fBlank( n ){
    if( n < this.vch.length && this.vch[ n ] !== "\n" ){ this.vch[ n ] = " ";}
  }

  fnComment( n, chNext ){
    ( chNext === "/" ? this.vnComment : this.vnCommentBlock ).push( n );
    this.sState = chNext === "/" ? "fnLine" : "fnBlock";
    this.fBlank( n );
    this.fBlank( n + 1 );
    return n + 1;
  }

  fBrace( ch ){
    const nTop = this.vcBrace.length - 1;
    if( nTop < 0 ){ return;}
    if( ch === "{" ){ this.vcBrace[ nTop ]++;}
    else if( this.vcBrace[ nTop ] > 0 ){ this.vcBrace[ nTop ]--;}
    else{
      this.vcBrace.pop();
      this.sState = "fnTemplate";
  }}

  fbRegexAt( n ){
    let nPrev = n - 1;
    while( nPrev >= 0 && /\s/.test( this.vch[ nPrev ])){ nPrev--;}
    if( nPrev < 0 ){ return true;}
    if( !/[\w$]/.test( this.vch[ nPrev ])){
      return !/[)\]}"'`]/.test( this.vch[ nPrev ]);
    }
    let nWord = nPrev;
    while( nWord >= 0 && /[\w$]/.test( this.vch[ nWord ])){ nWord--;}
    return asWordBeforeRegex.has(
      this.vch.slice( nWord + 1, nPrev + 1 ).join( "" )
    );
  }

  fnRegex( n ){
    const ch = this.vch[ n ];
    if( ch === "\n" || ( ch === "/" && !this.bClass )){
      this.sState = "fnCode";
      return n;
    }
    if( ch === "[" ){ this.bClass = true;}
    else if( ch === "]" ){ this.bClass = false;}
    return this.fnEscape( n );
  }

  fnCode( n ){
    const ch = this.vch[ n ];
    const chNext = this.vch[ n + 1 ];
    if( ch === "/" && ( chNext === "/" || chNext === "*" )){
      return this.fnComment( n, chNext );
    }
    if( ch === "/" && this.fbRegexAt( n )){
      this.sState = "fnRegex";
      this.bClass = false;
    }
    else if( ch === "\"" || ch === "'" ){
      this.sState = "fnQuote";
      this.chQuote = ch;
      this.nQuote = n;
    }
    else if( ch === "`" ){ this.sState = "fnTemplate";}
    else if( ch === "{" || ch === "}" ){ this.fBrace( ch );}
    return n;
  }

  fnLine( n ){
    if( this.vch[ n ] === "\n" ){ this.sState = "fnCode";}
    else{ this.fBlank( n );}
    return n;
  }

  fnBlock( n ){
    const bClose = this.vch[ n ] === "*" && this.vch[ n + 1 ] === "/";
    this.fBlank( n );
    if( !bClose ){ return n;}
    this.fBlank( n + 1 );
    this.sState = "fnCode";
    return n + 1;
  }

  fnEscape( n ){
    const bEscape = this.vch[ n ] === "\\";
    this.fBlank( n );
    if( !bEscape ){ return n;}
    this.fBlank( n + 1 );
    return n + 1;
  }

  fnQuote( n ){
    const ch = this.vch[ n ];
    if( ch === "\n" ){ this.fBlank( this.nQuote );}
    if( ch === "\n" || ch === this.chQuote ){
      this.sState = "fnCode";
      return n;
    }
    return this.fnEscape( n );
  }

  fnTemplate( n ){
    const ch = this.vch[ n ];
    if( ch === "`" ){
      this.sState = "fnCode";
      return n;
    }
    if( ch === "$" && this.vch[ n + 1 ] === "{" ){
      this.fBlank( n );
      this.vcBrace.push( 0 );
      this.sState = "fnCode";
      return n + 1;
    }
    return this.fnEscape( n );
  }

  ft(){
    for( let n = 0; n < this.vch.length; n++ ){
      n = this[ this.sState ]( n );
    }
    return [
      this.vch.join( "" ), new Set( this.vnComment ), this.vnCommentBlock
    ];
  }
}

const ftMaskForSource = ( sText ) => new SourceMasker( sText ).ft();

const asStateComment = new Set([ "fnLine", "fnBlock" ]);

const fsClassForStep = ( sStateBefore, sStateAfter ) => {
  if( asStateComment.has( sStateBefore )){ return "m";}
  if( sStateBefore !== "fnCode" ){ return "l";}
  return asStateComment.has( sStateAfter ) ? "m" : "c";
};

class SourceClassifier extends SourceMasker {
  fvsClass(){
    const vsClass = [];
    for( let n = 0; n < this.vch.length; n++ ){
      const sState = this.sState;
      const nNext = this[ sState ]( n );
      const sClass = fsClassForStep( sState, this.sState );
      for( let nStep = n; nStep <= nNext; nStep++ ){ vsClass[ nStep ] = sClass;}
      n = nNext;
    }
    return vsClass;
  }
}

class CssClassifier {
  constructor( sText ){
    this.sText = sText;
    this.vsClass = [];
    this.sState = "c";
    this.chQuote = null;
  }

  fnComment( n ){
    this.vsClass[ n ] = "m";
    if( this.sText.startsWith( "*/", n )){
      this.vsClass[ n + 1 ] = "m";
      this.sState = "c";
      return n + 1;
    }
    return n;
  }

  fnLiteral( n ){
    const ch = this.sText[ n ];
    this.vsClass[ n ] = "l";
    if( ch === "\\" ){
      this.vsClass[ n + 1 ] = "l";
      return n + 1;
    }
    if( ch === this.chQuote ){ this.sState = "c";}
    return n;
  }

  fnCode( n ){
    const ch = this.sText[ n ];
    if( this.sText.startsWith( "/*", n )){
      this.sState = "m";
      return this.fnComment( n );
    }
    this.vsClass[ n ] = "c";
    if( ch === "\"" || ch === "'" ){
      this.sState = "l";
      this.chQuote = ch;
    }
    return n;
  }

  fvsClass(){
    const afnForState = { c: "fnCode", m: "fnComment", l: "fnLiteral" };
    for( let n = 0; n < this.sText.length; n++ ){
      n = this[ afnForState[ this.sState ]]( n );
    }
    return this.vsClass;
  }
}

const fsCodeNormal = ( sText, vsClass ) => {
  let sOut = "";
  let bGap = false;
  for( let n = 0; n < sText.length; n++ ){
    const ch = sText[ n ];
    if( vsClass[ n ] === "m" ){ continue;}
    if( vsClass[ n ] === "c" && reCharSpace.test( ch )){
      bGap = true;
      continue;
    }
    if( bGap && reCharWord.test( sOut.slice( -1 )) && reCharWord.test( ch )){
      sOut += " ";
    }
    bGap = false;
    sOut += ch;
  }
  return sOut;
};

const fvsClassForPath = ( sPath, sText ) => (
  reFileCss.test( sPath )
    ? new CssClassifier( sText ).fvsClass()
    : new SourceClassifier( sText ).fvsClass()
);

const fsNormalForFile = ( sPath, sText ) => (
  reFileCss.test( sPath ) || reFileCode.test( sPath )
    ? fsCodeNormal( sText, fvsClassForPath( sPath, sText ))
    : fsNormal( sText )
);

const sReIdent = "[A-Za-z_$][\\w$]*";
const reAsync = /async\b\s*/y;
const reFunctionHead = new RegExp( "function\\b\\s*\\*?\\s*(?:" + sReIdent
  + ")?\\s*(?=\\()", "y" );
const reArrowIdent = new RegExp( sReIdent + "\\s*=>\\s*", "y" );
const reArrow = /\s*=>\s*/y;
const reBlankLine = /\n[ \t]*\n/y;
const asCharBeforeMember = new Set([ "", "{", "}", ";", "," ]);
const asCharBeforeProperty = new Set([ "{", "," ]);

const fchBefore = ( sMasked, n ) => {
  const sBefore = sMasked.slice( 0, n ).trimEnd();
  return sBefore.slice( -1 );
};

const fnAfterExpression = ( sMasked, nStart ) => {
  let cDepth = 0;
  for( let n = nStart; n < sMasked.length; n++ ){
    const ch = sMasked[ n ];
    if( ch === "\"" || ch === "'" || ch === "`" ){
      n = sMasked.indexOf( ch, n + 1 );
      if( n < 0 ){ return sMasked.length;}
    }
    else if( "([{".includes( ch )){ cDepth++;}
    else if( ")]}".includes( ch )){
      if( cDepth === 0 ){ return n;}
      cDepth--;
    }
    else if( cDepth === 0 && ( ch === ";" || ch === "," )){ return n;}
    else if( cDepth === 0 && fnAfterSticky( reBlankLine, sMasked, n ) >= 0 ){
      return n;
  }}
  return sMasked.length;
};

const ftBlockAfter = ( sMasked, nParen ) => {
  const nBrace = fnAfterSticky(
    reSpace, sMasked, fnAfterGroup( sMasked, nParen )
  );
  return sMasked[ nBrace ] === "{"
    ? [ nBrace, fnAfterGroup( sMasked, nBrace )]
    : null;
};

const ftArrowBody = ( sMasked, nBody ) => (
  sMasked[ nBody ] === "{"
    ? [ nBody, fnAfterGroup( sMasked, nBody )]
    : [ nBody, fnAfterExpression( sMasked, nBody )]
);

const ftBodyForInit = ( sMasked, nInit ) => {
  const nAsync = fnAfterSticky( reAsync, sMasked, nInit );
  const n = nAsync < 0 ? nInit : nAsync;
  const nHead = fnAfterSticky( reFunctionHead, sMasked, n );
  if( nHead >= 0 ){ return ftBlockAfter( sMasked, nHead );}
  if( sMasked[ n ] === "(" ){
    const nArrow = fnAfterSticky( reArrow, sMasked, fnAfterGroup( sMasked, n ));
    return nArrow < 0 ? null : ftArrowBody( sMasked, nArrow );
  }
  const nArrow = fnAfterSticky( reArrowIdent, sMasked, n );
  return nArrow < 0 ? null : ftArrowBody( sMasked, nArrow );
};

const fvaDefinitionForRe = ( sMasked, re, ftBody ) => Array.from(
  sMasked.matchAll( re ),
  ( vsGroup ) => {
    const tBody = ftBody( vsGroup );
    return tBody === null
      ? null
      : { nStart: vsGroup.index, nBodyStart: tBody[ 0 ], nEnd: tBody[ 1 ]};
  }
).filter( Boolean );

const fvreDefinitionForName = ( sName ) => {
  const sReName = sName.replace( /\$/g, "\\$" );
  return [
    new RegExp( "(?<![\\w$.])(?:async\\s+)?function\\s*\\*?\\s*" + sReName
      + "\\s*(?=\\()", "g" ),
    new RegExp( "(?<![\\w$.])(?:const|let|var)\\s+" + sReName
      + "\\s*=(?![=>])\\s*", "g" ),
    new RegExp( "(?<![\\w$.])(?:(?:static|async|get|set)\\s+|\\*\\s*)*"
      + sReName + "\\s*(?=\\()", "g" ),
    new RegExp( "(?<![\\w$.])" + sReName + "\\s*:\\s*", "g" )
  ];
};

const fvaDefinitionFor = ( sText, sName ) => {
  const sMasked = ftMaskForSource( sText )[ 0 ];
  const [ reDeclared, reVariable, reMember, reProperty ] = (
    fvreDefinitionForName( sName )
  );
  const fnEnd = ( vsGroup ) => vsGroup.index + vsGroup[ 0 ].length;
  const vaDefinition = [
    fvaDefinitionForRe( sMasked, reDeclared, ( vsGroup ) => (
      ftBlockAfter( sMasked, fnEnd( vsGroup ))
    )),
    fvaDefinitionForRe( sMasked, reVariable, ( vsGroup ) => (
      ftBodyForInit( sMasked, fnEnd( vsGroup ))
    )),
    fvaDefinitionForRe( sMasked, reMember, ( vsGroup ) => (
      asCharBeforeMember.has( fchBefore( sMasked, vsGroup.index ))
        ? ftBlockAfter( sMasked, fnEnd( vsGroup ))
        : null
    )),
    fvaDefinitionForRe( sMasked, reProperty, ( vsGroup ) => (
      asCharBeforeProperty.has( fchBefore( sMasked, vsGroup.index ))
        ? ftBodyForInit( sMasked, fnEnd( vsGroup ))
        : null
    ))
  ].flat();
  return vaDefinition.filter(( aDef ) => !vaDefinition.some(( aOuter ) => (
    aOuter !== aDef
    && aOuter.nStart <= aDef.nStart
    && aDef.nStart < aOuter.nBodyStart
  )));
};

const fsNormalForFunction = ( sText, aDef ) => fsCodeNormal(
  sText.slice( aDef.nStart, aDef.nEnd ),
  new SourceClassifier( sText ).fvsClass().slice( aDef.nStart, aDef.nEnd )
);

const fvnLineStart = ( vsLine ) => {
  const vnLineStart = [ 0 ];
  vsLine.forEach(( sLine ) => {
    vnLineStart.push(
      vnLineStart[ vnLineStart.length - 1 ] + sLine.length + 1
    );
  });
  return vnLineStart;
};

const fnLineAt = ( vnLineStart, nOffset ) => {
  let nLow = 0;
  let nHigh = vnLineStart.length - 1;
  while( nLow < nHigh ){
    const nMid = Math.ceil(( nLow + nHigh ) / 2 );
    if( vnLineStart[ nMid ] <= nOffset ){ nLow = nMid;}
    else{ nHigh = nMid - 1;}
  }
  return nLow;
};

const fnOpenForCall = ( sMasked, vsGroup ) => {
  const nAfterCall = vsGroup.index + vsGroup[ 0 ].length;
  const nArg = vsGroup[ 2 ] === undefined
    ? nAfterCall
    : fnAfterTable( sMasked, fnAfterSticky( reSpace, sMasked, nAfterCall ));
  return fnAfterSticky( reSpace, sMasked, nArg );
};

const faCallForMatch = ( aSource, vsGroup, bWrapper ) => {
  const nOpen = fnOpenForCall( aSource.sMasked, vsGroup );
  if( aSource.sMasked[ nOpen ] !== "(" ){ return null;}
  const sName = fsNameAt(
    aSource.sText, fnAfterSticky( reSpace, aSource.sMasked, nOpen + 1 )
  );
  if( bWrapper && sName === null ){ return null;}
  const nEnd = fnAfterGroup( aSource.sMasked, nOpen );
  return {
    sKind: vsGroup[ 1 ] === "describe" ? "describe" : "test",
    sName: sName === null ? "" : sName,
    sBody: aSource.sText.slice( vsGroup.index, nEnd ),
    nStart: vsGroup.index,
    nEnd,
    nLine: fnLineAt( aSource.vnLineStart, vsGroup.index )
  };
};

const fvaCallForRe = ( aSource, re, bWrapper ) => (
  Array.from(
    aSource.sMasked.matchAll( re ),
    ( vsGroup ) => faCallForMatch( aSource, vsGroup, bWrapper )
  ).filter( Boolean )
);

const fvaCallForSource = ( aSource ) => (
  fvaCallForRe( aSource, reCallTest, false )
    .concat( aSource.reCallWrapper === null
      ? []
      : fvaCallForRe( aSource, aSource.reCallWrapper, true )
    )
    .sort(( aA, aB ) => aA.nStart - aB.nStart )
);

const freCallForWrapper = ( vsWrapper ) => (
  vsWrapper.length === 0
    ? null
    : new RegExp(
      "(?<![\\w$.])("
      + vsWrapper.map(( s ) => s.replace( /\$/g, "\\$" )).join( "|" )
      + ")(?=\\s*\\()",
      "g"
    )
);

const faHeaderForSource = ( aSource ) => {
  const nLineCode = fnLineCode( aSource );
  return { nLineCode, nLineDoc: fnLineAfterDocblock( aSource, nLineCode ) };
};

const fbLineInHeader = ( aHeader, nLine ) => (
  nLine < aHeader.nLineCode && nLine >= aHeader.nLineDoc
);

const fvsWrapperForSource = ( aSource, aHeader ) => Array.from( new Set(
  Array.from( aSource.asnComment )
    .map(( nComment ) => ftCommentAt( aSource, nComment ))
    .filter(( tComment ) => fbLineInHeader( aHeader, tComment[ 0 ]))
    .map(( tComment ) => tComment[ 2 ].match( reWrapperText ))
    .filter( Boolean )
    .map(( vsGroup ) => vsGroup[ 1 ])
    .filter(( sName ) => !asNameCallTest.has( sName ))
));

const faSourceForText = ( sText ) => {
  const [ sMasked, asnComment ] = ftMaskForSource( sText );
  const vsLine = sText.split( "\n" );
  const aSource = {
    sText,
    sMasked,
    asnComment,
    vsLine,
    vsLineMasked: sMasked.split( "\n" ),
    vnLineStart: fvnLineStart( vsLine )
  };
  const aHeader = faHeaderForSource( aSource );
  return {
    ...aSource,
    aHeader,
    reCallWrapper: freCallForWrapper(
      fvsWrapperForSource( aSource, aHeader )
    )
  };
};

const fnLineCode = ( aSource ) => {
  const n = aSource.vsLineMasked.findIndex(( sLine ) => sLine.trim() !== "" );
  return n < 0 ? aSource.vsLine.length : n;
};

const fnLineAfterDocblock = ( aSource, nLineCode ) => {
  const sHeader = aSource.sText.slice( 0, aSource.vnLineStart[ nLineCode ]);
  const vsGroup = Array.from( sHeader.matchAll( reDocblock ))
    .filter(( vs ) => reJestDocblock.test( vs[ 0 ]));
  if( vsGroup.length === 0 ){ return 0;}
  const vsLast = vsGroup[ vsGroup.length - 1 ];
  return 1 + fnLineAt(
    aSource.vnLineStart, vsLast.index + vsLast[ 0 ].length
  );
};

const fbLineRunWhole = ( aSource, nLine ) => (
  reRunLine.test( aSource.vsLine[ nLine ] || "" )
  && aSource.vsLineMasked[ nLine ].trim() === ""
);

const faCallBelowRun = ( aSource, vaCall, nLine ) => {
  let nNext = nLine + 1;
  while( fbLineRunWhole( aSource, nNext )){ nNext++;}
  return vaCall.find(( aCall ) => (
    aCall.nLine === nNext
    && aSource.sMasked.slice( aSource.vnLineStart[ nNext ], aCall.nStart )
      .trim() === ""
  )) || null;
};

const ftCommentAt = ( aSource, nComment ) => {
  const nLine = fnLineAt( aSource.vnLineStart, nComment );
  const sLine = aSource.vsLine[ nLine ];
  const nCol = nComment - aSource.vnLineStart[ nLine ];
  return [ nLine, sLine, sLine.slice( nCol + 2 ) ];
};

const faOwnerForComment = ( aSource, vaCall, aHeader, nComment ) => {
  const [ nLine, sLine, sAfter ] = ftCommentAt( aSource, nComment );
  if( !reOwnerText.test( sAfter )){ return null;}
  const vsGroup = sLine.match( reOwnerLine );
  const bWhole = fbLineRunWhole( aSource, nLine );
  const aCall = !bWhole || nLine < aHeader.nLineCode
    ? null
    : faCallBelowRun( aSource, vaCall, nLine );
  const bFile = fbLineInHeader( aHeader, nLine );
  return {
    nLine: nLine + 1,
    sText: sLine.trim(),
    sPathOwner: vsGroup === null ? null : vsGroup[ 1 ],
    sPlace: bFile ? "file" : aCall === null ? "misplaced" : "block",
    aCall
  };
};

const faLinkForComment = ( aSource, vaCall, nComment ) => {
  const [ nLine, sLine, sAfter ] = ftCommentAt( aSource, nComment );
  if( !reLinkText.test( sAfter )){ return null;}
  const vsWell = sLine.match( reLinkLine );
  const vsLoose = sAfter.match( reLinkLoose );
  return {
    nLine: nLine + 1,
    sText: sLine.trim(),
    sId: vsLoose === null ? null : vsLoose[ 1 ],
    sHash: vsLoose === null ? "" : vsLoose[ 2 ],
    sPart: vsWell === null || vsWell[ 3 ] === undefined ? null : vsWell[ 3 ],
    bWell: vsWell !== null,
    aCall: fbLineRunWhole( aSource, nLine )
      ? faCallBelowRun( aSource, vaCall, nLine )
      : null
  };
};

const faParseTest = ( aFile ) => {
  const aSource = faSourceForText( aFile.sText );
  const vaCall = fvaCallForSource( aSource );
  const aHeader = aSource.aHeader;
  const vnComment = Array.from( aSource.asnComment );
  return {
    sPath: fsPosix( aFile.sPath ),
    vaCall,
    vaOwner: vnComment
      .map(( nComment ) => (
        faOwnerForComment( aSource, vaCall, aHeader, nComment )
      ))
      .filter( Boolean ),
    vaLink: vnComment
      .map(( nComment ) => faLinkForComment( aSource, vaCall, nComment ))
      .filter( Boolean )
  };
};

const fsPosix = ( sPath ) => sPath.split( path.sep ).join( "/" );

const fasPathOwner = ( vaOwner ) => new Set(
  vaOwner
    .filter(( aOwner ) => aOwner.sPathOwner !== null )
    .map(( aOwner ) => aOwner.sPathOwner )
);

const fbEncloses = ( aOuter, aInner ) => (
  aOuter.nStart <= aInner.nStart && aOuter.nEnd >= aInner.nEnd
);

const fasOwnerForCall = ( aTest, aCall ) => {
  const vaBlock = aTest.vaOwner.filter(( aOwner ) => (
    aOwner.sPlace === "block" && fbEncloses( aOwner.aCall, aCall )
  ));
  if( vaBlock.length === 0 ){
    return fasPathOwner( aTest.vaOwner.filter(( aOwner ) => (
      aOwner.sPlace === "file"
    )));
  }
  const nStartNearest = Math.max(
    ...vaBlock.map(( aOwner ) => aOwner.aCall.nStart )
  );
  return fasPathOwner( vaBlock.filter(( aOwner ) => (
    aOwner.aCall.nStart === nStartNearest
  )));
};

const faLineForId = ( aIndex, sId ) => {
  const vaPlace = aIndex.avaMarkerForId.get( sId ) || [];
  const vaBody = aIndex.avaMarkerForBody.get( sId.slice( 2 )) || [];
  const sIdRetyped = vaPlace.length === 0 && vaBody.length === 1
    ? vaBody[ 0 ].sId
    : null;
  return {
    aLine: vaPlace.length === 1 ? vaPlace[ 0 ] : null,
    cPlace: vaPlace.length,
    sIdRetyped,
    aNamed: vaBody.length === 0 ? null : vaBody[ 0 ]
  };
};

const fsReasonRetyped = ( sIdRetyped ) => (
  "retyped: now " + sIdRetyped + ", a line of type "
  + fsTypeLine( sIdRetyped[ 0 ])
);

const fsReasonForFound = ( aFound, sNone, sTwice ) => {
  if( aFound.cPlace > 1 ){ return sTwice;}
  if( aFound.sIdRetyped !== null ){
    return fsReasonRetyped( aFound.sIdRetyped );
  }
  return aFound.aLine === null ? sNone : null;
};

const fsReasonForLink = ( aLink, aIndex ) => {
  if( !aLink.bWell ){ return "malformed";}
  if( aLink.aCall === null ){ return "misplaced";}
  const aFound = faLineForId( aIndex, aLink.sId );
  const sReason = fsReasonForFound(
    aFound, "no such statement", "duplicate id"
  );
  if( sReason !== null ){ return sReason;}
  if( aFound.aLine.sType !== "s" ){
    return "names a line of type " + fsTypeLine( aFound.aLine.sType )
      + ", which no test proves";
  }
  return fsReasonForPart( aLink, aFound.aLine );
};

const fsReasonForPart = ( aLink, aMarker ) => {
  if( aMarker.sReasonParts !== null ){
    return "the statement's part list is malformed";
  }
  if( aMarker.vsPart === null ){ return null;}
  if( aLink.sPart === null ){
    return "whole link to a statement with a part list";
  }
  return aMarker.vsPart.includes( aLink.sPart )
    ? null
    : "label " + aLink.sPart + " is not in the statement's part list";
};

const faLinkResolved = ( aLink, sPath, aIndex ) => {
  const sReason = fsReasonForLink( aLink, aIndex );
  const aStmtNamed = sReason === null
    ? aIndex.avaMarkerForId.get( aLink.sId )[ 0 ]
    : null;
  const bProposed = (
    aStmtNamed !== null && aLink.sPart !== null && aStmtNamed.vsPart === null
  );
  const aStmt = bProposed ? null : aStmtNamed;
  return {
    ...aLink,
    sPath,
    sReason,
    aStmtNamed,
    aStmt,
    bProposed,
    bStale: aStmt !== null && aStmt.sHash !== aLink.sHash
  };
};

const fvaStmtUnique = ( vaStmt ) => Array.from(
  new Map( vaStmt.map(( aStmt ) => [ aStmt.sId, aStmt ])).values()
);

const faCallProved = ( aCall, vaCallAll, vaLink ) => {
  const vaEnclosing = vaCallAll.filter(( aOuter ) => (
    fbEncloses( aOuter, aCall )
  ));
  const vaCover = vaLink.filter(( aLink ) => (
    aLink.aStmtNamed !== null && fbEncloses( aLink.aCall, aCall )
  ));
  const vaProof = vaCover.filter(( aLink ) => aLink.aStmt !== null );
  return {
    ...aCall,
    vaStmt: fvaStmtUnique(
      vaProof
        .filter(( aLink ) => aLink.sPart === null )
        .map(( aLink ) => aLink.aStmt )
    ),
    vaPart: vaProof
      .filter(( aLink ) => aLink.sPart !== null )
      .map(( aLink ) => ({ aStmt: aLink.aStmt, sPart: aLink.sPart })),
    vaStmtLinked: fvaStmtUnique(
      vaCover.map(( aLink ) => aLink.aStmtNamed )
    ),
    vsNameEnclosing: vaEnclosing.map(( aOuter ) => aOuter.sName )
  };
};

const fasOwnerDerived = ( aCall ) => new Set(
  aCall.vaStmtLinked.map(( aStmt ) => aStmt.sPath )
);

const faTestResolved = ( aTest, aIndex ) => {
  const vaLink = aTest.vaLink.map(( aLink ) => (
    faLinkResolved( aLink, aTest.sPath, aIndex )
  ));
  const vaCall = aTest.vaCall.map(( aCall ) => (
    faCallProved( aCall, aTest.vaCall, vaLink )
  ));
  const vaCallTest = vaCall.filter(( aCall ) => aCall.sKind === "test" );
  const bFull = vaCallTest.length > 0
    && vaCallTest.every(( aCall ) => aCall.vaStmtLinked.length > 0 );
  return {
    ...aTest,
    vaLink,
    bFull,
    vaCall: vaCall.map(( aCall ) => ({
      ...aCall,
      sPath: aTest.sPath,
      asOwner: bFull
        ? fasOwnerDerived( aCall )
        : fasOwnerForCall( aTest, aCall )
    }))
  };
};

const fsReasonForOwner = ( aOwner, asPathSpec ) => {
  if( aOwner.sPathOwner === null ){ return "malformed";}
  if( !asPathSpec.has( aOwner.sPathOwner )){ return "no such spec";}
  return aOwner.sPlace === "misplaced" ? "misplaced" : null;
};

const fvaUnresolvedForTest = ( aTest, asPathSpec ) => (
  aTest.vaOwner
    .map(( aOwner ) => ({
      sPath: aTest.sPath,
      nLine: aOwner.nLine,
      sText: aOwner.sText,
      sReason: fsReasonForOwner( aOwner, asPathSpec )
    }))
    .filter(( aEntry ) => aEntry.sReason !== null )
);

const fvaRemovableForTest = ( aTest ) => (
  !aTest.bFull
    ? []
    : aTest.vaOwner
      .filter(( aOwner ) => aOwner.sPlace !== "misplaced" )
      .map(( aOwner ) => ({
        sPath: aTest.sPath, nLine: aOwner.nLine, sText: aOwner.sText
      }))
);

const favxGrouped = ( vaEntry, fsKey, fxValue ) => {
  const avxForKey = new Map();
  vaEntry.forEach(( aEntry ) => {
    const vx = avxForKey.get( fsKey( aEntry )) || [];
    avxForKey.set( fsKey( aEntry ), vx.concat([ fxValue( aEntry )]));
  });
  return avxForKey;
};

const favaMarkerForBody = ( vaMarker ) => favxGrouped(
  vaMarker.filter(( aMarker ) => (
    aMarker.sId !== null && !aMarker.bMalformed
  )),
  ( aMarker ) => aMarker.sBody,
  ( aMarker ) => aMarker
);

const faIndexForMarkers = ( vaMarker ) => {
  const avaMarkerForBody = favaMarkerForBody( vaMarker );
  return {
    avaMarkerForBody,
    avaMarkerForId: new Map(
      Array.from( avaMarkerForBody.values()).flatMap(( vaPlace ) => (
        vaPlace.map(( aMarker ) => [ aMarker.sId, vaPlace ])
      ))
    )
  };
};

const faOwnership = ( vaTestParsed, asPathSpec ) => ({
  vsPathNoOwner: vaTestParsed
    .filter(( aTest ) => !aTest.bFull && !aTest.vaOwner.some(( aOwner ) => (
      aOwner.sPlace === "file"
    )))
    .map(( aTest ) => aTest.sPath ),
  vaUnresolved: vaTestParsed.flatMap(( aTest ) => (
    fvaUnresolvedForTest( aTest, asPathSpec )
  )),
  vaRemovable: vaTestParsed.flatMap( fvaRemovableForTest )
});

const aFilesNone = {
  fsKind: () => null,
  fsTextAt: () => null,
  fvsPathFile: () => []
};

const faModel = ({
  vaSpec, vaTest, vaCiter, vaRecord, fbExists, aFiles
}) => {
  const vaSpecParsed = vaSpec.map(( aSpec ) => faParseSpec({
    sPath: fsPosix( aSpec.sPath ), sText: aSpec.sText
  }));
  const vaMarker = vaSpecParsed.flatMap(( aSpec ) => aSpec.vaMarker );
  const aIndex = faIndexForMarkers( vaMarker );
  const vaTestParsed = vaTest.map(( aFile ) => faTestResolved(
    faParseTest( aFile ), aIndex
  ));
  const aModel = {
    vaSpecParsed,
    vaMarker,
    ...aIndex,
    vaTestParsed,
    vaCallTest: vaTestParsed.flatMap(( aTest ) => (
      aTest.vaCall.filter(( aCall ) => aCall.sKind === "test" )
    )),
    vaLink: vaTestParsed.flatMap(( aTest ) => aTest.vaLink )
  };
  return {
    ...aModel,
    aLines: faLines( aModel, {
      vaCiter: vaCiter || [],
      vaRecord: vaRecord || [],
      fbExists: fbExists || (() => false ),
      aFiles: aFiles || aFilesNone
    })
  };
};

const faBadForMarker = ( aMarker, sReason ) => ({
  sPath: aMarker.sPath,
  nLine: aMarker.nLine,
  sText: aMarker.sToken,
  sReason,
  sId: null
});

const fvaMarkerBad = ( aModel ) => (
  aModel.vaMarker
    .filter(( aMarker ) => aMarker.bMalformed )
    .map(( aMarker ) => faBadForMarker( aMarker, aMarker.sReasonMalformed ))
    .concat( fvaLineWell( aModel ).flatMap(( aMarker ) => (
      aMarker.vsReasonAttr.map(( sReason ) => (
        faBadForMarker( aMarker, sReason )
      ))
    )))
    .concat( aModel.aLines.vaDefinition
      .concat( aModel.aLines.vaCheck )
      .filter(( aEntry ) => aEntry.sReason !== null )
      .map(( aEntry ) => faBadForMarker( aEntry.aMarker, aEntry.sReason )))
    .concat( Array.from( aModel.avaMarkerForBody.values())
      .filter(( vaPlace ) => vaPlace.length > 1 )
      .flat()
      .map(( aMarker ) => ({
        sPath: aMarker.sPath,
        nLine: aMarker.nLine,
        sText: aMarker.sId,
        sReason: "duplicate",
        sId: aMarker.sId
      })))
);

const fvaLineWell = ( aModel ) => aModel.vaMarker.filter(( aMarker ) => (
  !aMarker.bMalformed
));

const fvaLineOfType = ( aModel, sType ) => fvaLineWell( aModel ).filter((
  aMarker
) => aMarker.sType === sType );

const fvaStmtForModel = ( aModel ) => (
  aModel.vaMarker.filter(( aMarker ) => (
    aMarker.sId !== null
    && !aMarker.bMalformed
    && aMarker.sType === "s"
    && aModel.avaMarkerForId.get( aMarker.sId ).length === 1
  ))
);

const faTermForText = ( sText ) => {
  const vsGroup = sText.match( reTermBold );
  if( vsGroup === null ){
    return { sReason: "definition does not open with its term in bold" };
  }
  const sTerm = vsGroup[ 1 ].trim().replace( reTermEnd, "" ).trim();
  const sMeaning = sText.slice( vsGroup[ 0 ].length )
    .replace( reMeaningLead, "" );
  if( sTerm === "" ){ return { sReason: "definition with an empty term" };}
  if( sMeaning === "" ){
    return { sReason: "definition with an empty meaning" };
  }
  return { sReason: null, sTerm };
};

const fsBlanked = ( sText, nStart, nEnd ) => (
  sText.slice( 0, nStart ) + " ".repeat( nEnd - nStart ) + sText.slice( nEnd )
);

const fsTextForUse = ( aBlock, aMarkerOwn ) => {
  const sOwn = aMarkerOwn === null
    ? aBlock.sText
    : fsBlanked( aBlock.sText, aMarkerOwn.nPosBlock, aMarkerOwn.nEndBlock );
  return fsNormal( fvtSpanForText( sOwn ).reduce(( sAcc, tSpan ) => (
    fsBlanked( sAcc, tSpan[ 0 ], tSpan[ 1 ] + tSpan[ 2 ])
  ), sOwn ));
};

const freForTerm = ( sTerm ) => new RegExp(
  "(?<![\\p{L}\\p{N}])" + sTerm.replace( reEscape, "\\$&" )
  + "s?(?![\\p{L}\\p{N}])",
  "iu"
);

const fvaUseForTerm = ( aModel, aMarker, sTerm ) => {
  const reTerm = freForTerm( sTerm );
  return aModel.vaSpecParsed.flatMap(( aSpec ) => aSpec.vaBlock
    .filter(( aBlock ) => reTerm.test( fsTextForUse(
      aBlock,
      aSpec.sPath === aMarker.sPath && aBlock.nBlock === aMarker.nBlock
        ? aMarker
        : null
    )))
    .map(( aBlock ) => ({ sPath: aSpec.sPath, nLine: aBlock.vnLine[ 0 ] + 1 }))
  );
};

const fsReasonForDuplicateTerm = ( aEntry, vaSame ) => {
  const vaOther = vaSame.filter(( aOther ) => aOther !== aEntry );
  return vaOther.length === 0
    ? null
    : "term " + aEntry.sTerm + " also defined at "
      + vaOther.map(( aOther ) => fsPlace( aOther.aMarker )).join( ", " );
};

const fsKeyForTerm = ( sTerm ) => (
  sTerm.replace( reArticleLead, "" ).toLowerCase()
);

const fvaDefinitionForModel = ( aModel ) => {
  const vaEntry = fvaLineOfType( aModel, "d" ).map(( aMarker ) => ({
    aMarker, ...faTermForText( aMarker.sText )
  }));
  const avaSameForTerm = favxGrouped(
    vaEntry.filter(( aEntry ) => aEntry.sReason === null ),
    ( aEntry ) => fsKeyForTerm( aEntry.sTerm ),
    ( aEntry ) => aEntry
  );
  return vaEntry.map(( aEntry ) => {
    if( aEntry.sReason !== null ){
      return { ...aEntry, bForm: false, vaUse: [], bValid: false };
    }
    const sReason = fsReasonForDuplicateTerm(
      aEntry, avaSameForTerm.get( fsKeyForTerm( aEntry.sTerm ))
    );
    const vaUse = fvaUseForTerm( aModel, aEntry.aMarker, aEntry.sTerm );
    return {
      ...aEntry,
      sReason,
      bForm: true,
      vaUse,
      bValid: sReason === null && vaUse.length > 0
    };
  });
};

const fsReasonForFunction = ( aFiles, sTarget ) => {
  const [ sPath, sName ] = ftFunctionForTarget( sTarget );
  const sText = aFiles.fsTextAt( sPath );
  if( sText === null ){ return "no such file";}
  const cDefinition = fvaDefinitionFor( sText, sName ).length;
  if( cDefinition === 0 ){ return "no definition of " + sName;}
  return cDefinition === 1
    ? null
    : sName + " defined " + cDefinition + " times";
};

const fsTextForSlug = ( aModel, sTarget ) => {
  const vsGroup = sTarget.match( reTargetSlug );
  const aSpec = aModel.vaSpecParsed.find(( aSpecParsed ) => (
    aSpecParsed.sPath === vsGroup[ 1 ]
  ));
  const fbHeading = ( n ) => aSpec.vsKind[ n ] === "heading";
  const nHeading = aSpec.vsLine.findIndex(( sLine, n ) => (
    fbHeading( n ) && fsSlugForHeading( sLine ) === vsGroup[ 2 ]
  ));
  const nLevel = fnLevelHeading( aSpec.vsLine[ nHeading ]);
  const nEnd = aSpec.vsLine.findIndex(( sLine, n ) => (
    n > nHeading && fbHeading( n ) && fnLevelHeading( sLine ) <= nLevel
  ));
  return aSpec.vsLine.slice( nHeading, nEnd < 0 ? undefined : nEnd )
    .join( "\n" );
};

class TargetHasher {
  constructor( aModel, aEnv ){
    this.aModel = aModel;
    this.aEnv = aEnv;
    this.asHashForKey = new Map();
  }

  fsMemo( sKey, fsHash ){
    if( !this.asHashForKey.has( sKey )){
      this.asHashForKey.set( sKey, fsHash());
    }
    return this.asHashForKey.get( sKey );
  }

  fsHash( sTarget ){
    return this.fsMemo( "target " + sTarget, () => this.fsHashFresh( sTarget ));
  }

  fsHashFresh( sTarget ){
    const sKind = fsKindForTarget( sTarget );
    if(
      sKind === null
      || fsReasonForTargetFound( this.aModel, this.aEnv, sTarget ) !== null
    ){
      return null;
    }
    if( sKind === "id" ){
      return faLineForId( this.aModel, sTarget ).aLine.sHash;
    }
    if( sKind === "slug" ){
      return fsHashForText( fsNormal( fsTextForSlug( this.aModel, sTarget )));
    }
    if( sKind === "function" ){ return this.fsHashForFunction( sTarget );}
    return this.aEnv.aFiles.fsKind( sTarget ) === "file"
      ? this.fsHashForFile( fsPathClean( sTarget ))
      : this.fsHashForDir( fsPathClean( sTarget ));
  }

  fsHashForFunction( sTarget ){
    const [ sPath, sName ] = ftFunctionForTarget( sTarget );
    const sText = this.aEnv.aFiles.fsTextAt( sPath );
    return fsHashForText( fsNormalForFunction(
      sText, fvaDefinitionFor( sText, sName )[ 0 ]
    ));
  }

  fsHashForFile( sPath ){
    return this.fsMemo( "file " + sPath, () => fsHashForText(
      fsNormalForFile( sPath, this.aEnv.aFiles.fsTextAt( sPath ))
    ));
  }

  fsHashForDir( sDir ){
    return fsHashForText( this.aEnv.aFiles.fvsPathFile( sDir )
      .map(( sPath ) => (
        path.posix.relative( sDir, sPath ) + " " + this.fsHashForFile( sPath )
      ))
      .join( "\n" ));
  }
}

const fsReasonForTargetFound = ( aModel, aEnv, sTarget ) => {
  const sKind = fsKindForTarget( sTarget );
  if( sKind === "id" ){
    return fsReasonForFound(
      faLineForId( aModel, sTarget ),
      "no marker holds it",
      "held by more than one marker"
    );
  }
  if( sKind === "path" ){
    return aEnv.fbExists( sTarget ) ? null : "no such file or directory";
  }
  if( sKind === "function" ){
    return fsReasonForFunction( aEnv.aFiles, sTarget );
  }
  const vsGroup = sTarget.match( reTargetSlug );
  const aSpec = aModel.vaSpecParsed.find(( aSpecParsed ) => (
    aSpecParsed.sPath === vsGroup[ 1 ]
  ));
  if( aSpec === undefined ){ return "no such spec";}
  return aSpec.asSlug.has( vsGroup[ 2 ]) ? null : "no heading with that slug";
};

const faTargetResolved = ( aModel, aEnv, aMarker, sTarget ) => {
  const bForm = fsReasonForTargetForm( sTarget ) === null;
  const sIdRetyped = bForm && fsKindForTarget( sTarget ) === "id"
    ? faLineForId( aModel, sTarget ).sIdRetyped
    : null;
  return {
    aMarker,
    sPath: aMarker.sPath,
    nLine: aMarker.nLine,
    sTarget,
    bForm,
    sIdRetyped,
    sReason: bForm ? fsReasonForTargetFound( aModel, aEnv, sTarget ) : null
  };
};

const fvaTargetForModel = ( aModel, aEnv ) => fvaLineWell( aModel )
  .filter(( aMarker ) => (
    sTypeTargeted.includes( aMarker.sType ) && aMarker.sTargets !== null
  ))
  .flatMap(( aMarker ) => aMarker.sTargets.split( "," ).map(( sTarget ) => (
    faTargetResolved( aModel, aEnv, aMarker, sTarget )
  )));

const faCheckForText = ( sText ) => {
  const nDo = sText.indexOf( sLabelDo );
  const nLook = sText.indexOf( sLabelLook );
  if( nDo < 0 || nLook < 0 ){
    return { sReason: "interactive check lacks " + sLabelDo + " or "
      + sLabelLook };
  }
  if( nLook < nDo ){
    return { sReason: sLabelLook + " before " + sLabelDo };
  }
  const sDo = sText.slice( nDo + sLabelDo.length, nLook ).trim();
  const sLook = sText.slice( nLook + sLabelLook.length ).trim();
  return sDo === "" || sLook === ""
    ? { sReason: "interactive check with no text after a label" }
    : { sReason: null, sDo, sLook };
};

const fasHashForRecord = ( aRecord ) => (
  aRecord.asHashForTarget !== null
  && typeof aRecord.asHashForTarget === "object"
    ? aRecord.asHashForTarget
    : {}
);

const fbRecordCurrent = ( aRecord, aMarker, hasher ) => {
  const asHash = fasHashForRecord( aRecord );
  return aRecord.sHash === aMarker.sHash
    && fvsTargetForMarker( aMarker ).every(( sTarget ) => {
      const sHash = hasher.fsHash( sTarget );
      return sHash !== null
        && Object.hasOwn( asHash, sTarget )
        && asHash[ sTarget ] === sHash;
    });
};

const fsStatusForRecord = ( aRecord, aMarker, hasher ) => {
  if( aRecord === null ){ return "unchecked";}
  if( aRecord.sVerdict === "pass" ){
    return fbRecordCurrent( aRecord, aMarker, hasher ) ? "passed" : "stale";
  }
  return aRecord.sVerdict === "fail" ? "failed" : "unchecked";
};

const faCheckForMarker = ( aMarker, vaRecord, hasher ) => {
  const vaRecordNamed = aMarker.sId === null
    ? []
    : vaRecord.filter(( aRecord ) => aRecord.sId === aMarker.sId );
  const aRecordLast = vaRecordNamed.length === 0
    ? null
    : vaRecordNamed[ vaRecordNamed.length - 1 ];
  return {
    sDo: "",
    sLook: "",
    ...faCheckForText( aMarker.sText ),
    aMarker,
    sPath: aMarker.sPath,
    vaRecord: vaRecordNamed,
    aRecordLast,
    sStatus: fsStatusForRecord( aRecordLast, aMarker, hasher )
  };
};

const fsNoteForRecord = ( aRecord ) => (
  typeof aRecord.sNote === "string" ? aRecord.sNote : ""
);

const faProblemForCheck = ( aCheck ) => {
  const aRecord = aCheck.vaRecord
    .filter(( aRecordNamed ) => aRecordNamed.sVerdict !== "reset" )
    .pop();
  if( aRecord === undefined ){ return null;}
  const bOpen = aRecord.sVerdict === "fail" || (
    ( aRecord.sVerdict === "pass" || aRecord.sVerdict === "unable" )
    && fsNoteForRecord( aRecord ) !== ""
  );
  return bOpen ? { ...aCheck, aRecord } : null;
};

const fvaProblemForChecks = ( vaCheck ) => (
  vaCheck.map( faProblemForCheck ).filter( Boolean )
);

const fvaNoCodeForChecks = ( vaCheck ) => vaCheck.filter(( aCheck ) => (
  !fvsTargetForMarker( aCheck.aMarker ).some( fbCodeTarget )
));

const fvnCommentCss = ( sText ) => {
  const vnComment = [];
  let n = sText.indexOf( "/*" );
  while( n >= 0 ){
    vnComment.push( n );
    const nClose = sText.indexOf( "*/", n + 2 );
    n = nClose < 0 ? -1 : sText.indexOf( "/*", nClose + 2 );
  }
  return vnComment;
};

const ftCommentsForCiter = ( aFile ) => {
  if( reFileCss.test( aFile.sPath )){
    return [[], fvnCommentCss( aFile.sText )];
  }
  const tMask = ftMaskForSource( aFile.sText );
  return [ Array.from( tMask[ 1 ]), tMask[ 2 ]];
};

const faFollowsAt = ( aFile, vnLineStart, nComment, bBlock ) => {
  const nLine = fnLineAt( vnLineStart, nComment );
  const sLine = aFile.sText.slice(
    vnLineStart[ nLine ], vnLineStart[ nLine + 1 ] - 1
  );
  const sAfterRaw = sLine.slice( nComment - vnLineStart[ nLine ] + 2 );
  const nClose = bBlock ? sAfterRaw.indexOf( "*/" ) : -1;
  const sAfter = nClose < 0 ? sAfterRaw : sAfterRaw.slice( 0, nClose );
  if( !reFollowsText.test( sAfter )){ return null;}
  const vsWell = sLine.match( bBlock ? reFollowsBlock : reFollowsLine );
  const vsLoose = sAfter.match( reFollowsLoose );
  return {
    sPath: fsPosix( aFile.sPath ),
    nLine: nLine + 1,
    sText: sLine.trim(),
    bWell: vsWell !== null,
    sId: vsLoose === null ? "" : vsLoose[ 1 ],
    sHash: vsLoose === null ? "" : vsLoose[ 2 ]
  };
};

const fvaFollowsForFile = ( aFile ) => {
  const vnLineStart = fvnLineStart( aFile.sText.split( "\n" ));
  const [ vnLine, vnBlock ] = ftCommentsForCiter( aFile );
  return vnLine
    .map(( n ) => faFollowsAt( aFile, vnLineStart, n, false ))
    .concat( vnBlock.map(( n ) => faFollowsAt( aFile, vnLineStart, n, true )))
    .filter( Boolean )
    .sort(( aA, aB ) => aA.nLine - aB.nLine );
};

const faFollowsResolved = ( aModel, aFollows ) => {
  const aFound = aFollows.bWell
    ? faLineForId( aModel, aFollows.sId )
    : { aLine: null, cPlace: 0, sIdRetyped: null, aNamed: null };
  const sReasonFound = aFollows.bWell
    ? fsReasonForFound( aFound, "no such guidance", "duplicate id" )
    : "malformed";
  const sReason = sReasonFound === null && aFound.aLine.sType !== "g"
    ? "names a line of type " + fsTypeLine( aFound.aLine.sType )
    : sReasonFound;
  const aLine = sReason === null ? aFound.aLine : null;
  return {
    ...aFollows,
    sReason,
    aLine,
    sPathNamed: aFound.aNamed === null ? null : aFound.aNamed.sPath,
    bStale: aLine !== null && aLine.sHash !== aFollows.sHash
  };
};

const fasMarkerSatisfiedOwn = ( aModel, aLines ) => new Set(
  fvaLineWell( aModel )
    .filter(( aMarker ) => aMarker.vsReasonAttr.length === 0 )
    .filter(( aMarker ) => aMarker.sType === "p" || aMarker.sType === "g" )
    .filter(( aMarker ) => !aLines.vaTarget.some(( aTarget ) => (
      aTarget.aMarker === aMarker && aTarget.sReason !== null
    )))
    .concat(
      aLines.vaDefinition
        .filter(( aEntry ) => aEntry.bValid )
        .map(( aEntry ) => aEntry.aMarker ),
      aLines.vaCheck
        .filter(( aEntry ) => aEntry.sStatus === "passed" )
        .map(( aEntry ) => aEntry.aMarker )
    )
);

const faLines = ( aModel, aEnv ) => {
  const hasher = new TargetHasher( aModel, aEnv );
  const aLines = {
    hasher,
    vaDefinition: fvaDefinitionForModel( aModel ),
    vaTarget: fvaTargetForModel( aModel, aEnv ),
    vaCheck: fvaLineOfType( aModel, "i" ).map(( aMarker ) => (
      faCheckForMarker( aMarker, aEnv.vaRecord, hasher )
    )),
    vaFollows: aEnv.vaCiter
      .flatMap( fvaFollowsForFile )
      .map(( aFollows ) => faFollowsResolved( aModel, aFollows ))
  };
  return {
    ...aLines, asMarkerSatisfiedOwn: fasMarkerSatisfiedOwn( aModel, aLines )
  };
};

const fsLineForCall = ( aCall, sLabel ) => (
  aCall.sPath + ":" + ( aCall.nLine + 1 ) + "  " + sLabel + aCall.sName
);

const fvaUnprovingForSpec = ( aModel, aSpec ) => aModel.vaCallTest
  .filter(( aCall ) => aCall.asOwner.has( aSpec.sPath ))
  .filter(( aCall ) => !aCall.vaStmtLinked.some(( aStmt ) => (
    aStmt.sPath === aSpec.sPath
  )))
  .map(( aCall ) => fsLineForCall( aCall, "proves nothing: " ));

const fvsIncompleteForSpec = ( aModel, aSpec ) => (
  aSpec.vaUnmarked
    .map(( aEntry ) => (
      aEntry.sPath + ":" + aEntry.nLine + "  unmarked: " + aEntry.sWords
    ))
    .concat( fvaPlaceholderForMarker( aSpec.vaMarker ).map(( aMarker ) => (
      aMarker.sPath + ":" + aMarker.nLine + "  placeholder: "
      + fsWords( aMarker.sText )
    )))
    .concat( fvaUnprovingForSpec( aModel, aSpec ))
);

const fvaPlaceholderForMarker = ( vaMarker ) => vaMarker.filter(( aMarker ) => (
  aMarker.bPlaceholder && !aMarker.bMalformed
));

const faRefParsed = ( sRef ) => {
  const vsId = sRef.match( reRefId );
  if( vsId !== null ){
    return {
      sRef,
      sId: vsId[ 1 ],
      sStamp: vsId[ 2 ] || null,
      sLabel: null,
      sType: vsId[ 1 ][ 0 ]
    };
  }
  const vsLabel = sRef.match( reRefLabel );
  return vsLabel === null
    ? null
    : {
      sRef, sId: null, sStamp: null, sLabel: vsLabel[ 2 ], sType: vsLabel[ 1 ]
    };
};

const fsKeyLabel = ( sPath, sType, sLabel ) => (
  sPath + "\n" + sType + "-" + sLabel
);

const favaMarkerForLabel = ( vaMarker ) => favxGrouped(
  vaMarker.filter(( aMarker ) => (
    aMarker.bPlaceholder && !aMarker.bMalformed && aMarker.sLabel !== ""
  )),
  ( aMarker ) => fsKeyLabel( aMarker.sPath, aMarker.sType, aMarker.sLabel ),
  ( aMarker ) => aMarker
);

const faTargetForLabel = ( aRef, aMarker, aCtx ) => {
  const vaTarget = aCtx.avaMarkerForLabel.get(
    fsKeyLabel( aMarker.sPath, aRef.sType, aRef.sLabel )
  ) || [];
  return {
    aTarget: vaTarget.length === 1 ? vaTarget[ 0 ] : null,
    sIdRetyped: null,
    sReason: vaTarget.length === 0
      ? "names a label marked nowhere"
      : vaTarget.length > 1 ? "names a label marked twice" : null
  };
};

const faTargetForRefId = ( aRef, aCtx ) => {
  const aFound = faLineForId( aCtx, aRef.sId );
  return {
    aTarget: aFound.aLine,
    sIdRetyped: aFound.sIdRetyped,
    sReason: fsReasonForFound(
      aFound, "names an id marked nowhere", "names an id marked twice"
    )
  };
};

const faTargetForRef = ( aRef, aMarker, aCtx ) => {
  const aFound = aRef.sId === null
    ? faTargetForLabel( aRef, aMarker, aCtx )
    : faTargetForRefId( aRef, aCtx );
  if( aFound.aTarget === null || sTypeRoot.includes( aFound.aTarget.sType )){
    return aFound;
  }
  return {
    aTarget: null,
    sIdRetyped: null,
    sReason: "names a line of type " + fsTypeLine( aFound.aTarget.sType )
  };
};

const fsReasonForForm = ( vsEntry ) => {
  if( vsEntry.filter(( sEntry ) => sEntry === sArch ).length > 1 ){
    return "arch written twice";
  }
  return vsEntry.every(( sEntry ) => (
    sEntry === sArch || faRefParsed( sEntry ) !== null
  ))
    ? null
    : "not a root list";
};

const fsReasonForRefs = ( vaRef, aMarker ) => {
  const aRefBad = vaRef.find(( aRef ) => aRef.sReason !== null );
  if( aRefBad !== undefined ){ return aRefBad.sReason;}
  if( vaRef.some(( aRef ) => aRef.aTarget === aMarker )){
    return "names its own statement";
  }
  const cTarget = new Set( vaRef.map(( aRef ) => aRef.aTarget )).size;
  return cTarget < vaRef.length ? "names the same statement twice" : null;
};

const fsReasonRetypedForRefs = ( vaRef ) => {
  const aRef = vaRef.find(( aRefT ) => aRefT.sIdRetyped !== null );
  return aRef === undefined
    ? null
    : "names " + aRef.sId + ", " + fsReasonRetyped( aRef.sIdRetyped );
};

const faListForMarker = ( aMarker, aCtx ) => {
  const vsEntry = aMarker.sList.split( "," );
  const nArch = vsEntry.indexOf( sArch );
  const aList = {
    aMarker,
    bArch: nArch >= 0,
    nArch,
    vaRef: [],
    sReason: null,
    sReasonBase: null
  };
  if( aMarker.sType === "p" ){
    const sReason = "root list on a line of type " + fsTypeLine( "p" );
    return { ...aList, bArch: false, sReason, sReasonBase: sReason };
  }
  const sReasonForm = fsReasonForForm( vsEntry );
  if( sReasonForm !== null ){
    return { ...aList, sReason: sReasonForm, sReasonBase: sReasonForm };
  }
  const vsRef = vsEntry.filter(( sEntry ) => sEntry !== sArch );
  const vaRef = vsRef.map( faRefParsed ).map(( aRef ) => ({
    ...aRef, ...faTargetForRef( aRef, aMarker, aCtx )
  }));
  const sReasonBase = fsReasonForRefs(
    vaRef.filter(( aRef ) => aRef.sIdRetyped === null ), aMarker
  );
  return {
    ...aList,
    vaRef,
    sReasonBase,
    sReason: sReasonBase || fsReasonRetypedForRefs( vaRef )
  };
};

const fbReachesSelf = ( avaNext, aStart ) => {
  const asSeen = new Set();
  const vaTodo = ( avaNext.get( aStart ) || [] ).slice();
  while( vaTodo.length > 0 ){
    const aMarker = vaTodo.pop();
    if( aMarker === aStart ){ return true;}
    if( !asSeen.has( aMarker )){
      asSeen.add( aMarker );
      vaTodo.push( ...( avaNext.get( aMarker ) || [] ));
  }}
  return false;
};

const fvaListCycleMarked = ( vaList ) => {
  const avaNext = new Map(
    vaList
      .filter(( aList ) => aList.sReason === null )
      .map(( aList ) => [
        aList.aMarker, aList.vaRef.map(( aRef ) => aRef.aTarget )
      ])
  );
  return vaList.map(( aList ) => (
    aList.sReason === null && fbReachesSelf( avaNext, aList.aMarker )
      ? {
        ...aList,
        sReason: "leads back to itself through its roots",
        sReasonBase: "leads back to itself through its roots"
      }
      : aList
  ));
};

const fvaListForModel = ( aModel ) => {
  const aCtx = {
    avaMarkerForId: aModel.avaMarkerForId,
    avaMarkerForBody: aModel.avaMarkerForBody,
    avaMarkerForLabel: favaMarkerForLabel( aModel.vaMarker )
  };
  return fvaListCycleMarked(
    aModel.vaMarker
      .filter(( aMarker ) => aMarker.sList !== null && !aMarker.bMalformed )
      .map(( aMarker ) => faListForMarker( aMarker, aCtx ))
  );
};

const fvaLabelTwice = ( vaMarker ) => (
  Array.from( favaMarkerForLabel( vaMarker ).values())
    .filter(( vaPlace ) => vaPlace.length > 1 )
    .flat()
    .map(( aMarker ) => ({
      sPath: aMarker.sPath,
      nLine: aMarker.nLine,
      sText: aMarker.sToken,
      sReason: "label carried by two placeholders"
    }))
);

const fvaRootBad = ( vaList, vaMarker ) => (
  vaList
    .filter(( aList ) => aList.sReason !== null )
    .map(( aList ) => ({
      sPath: aList.aMarker.sPath,
      nLine: aList.aMarker.nLine,
      sText: aList.aMarker.sToken,
      sReason: aList.sReason
    }))
    .concat( fvaLabelTwice( vaMarker ))
    .sort(( aA, aB ) => (
      aA.sPath.localeCompare( aB.sPath ) || aA.nLine - aB.nLine
    ))
);

const fabSatisfiedForMarker = ( avaConclusionForRoot, asIdProved, asOwn ) => {
  const abSatisfied = new Map();
  const fbSatisfied = ( aMarker ) => {
    if( !abSatisfied.has( aMarker )){
      const vaConclusion = avaConclusionForRoot.get( aMarker );
      abSatisfied.set( aMarker, (
        ( aMarker.sType === "s" && asIdProved.has( aMarker.sId ))
        || asOwn.has( aMarker )
        || ( vaConclusion !== undefined && vaConclusion.every( fbSatisfied ))
      ));
    }
    return abSatisfied.get( aMarker );
  };
  return fbSatisfied;
};

const fvaRefEntry = ( vaListValid ) => vaListValid.flatMap(( aList ) => (
  aList.vaRef.map(( aRef ) => ({
    sPath: aList.aMarker.sPath, aMarker: aList.aMarker, aRef
  }))
));

const faRootForMarker = ( aMarker, avaConclusionForRoot, fbSatisfied ) => {
  const vaConclusion = avaConclusionForRoot.get( aMarker ).map((
    aConclusion
  ) => ({ aMarker: aConclusion, bSatisfied: fbSatisfied( aConclusion ) }));
  const cSatisfied = vaConclusion.filter(( aC ) => aC.bSatisfied ).length;
  return {
    sPath: aMarker.sPath,
    aMarker,
    vaConclusion,
    cSatisfied,
    bCovered: cSatisfied === vaConclusion.length
  };
};

const faRoots = ( aModel, asIdProved ) => {
  const vaList = fvaListForModel( aModel );
  const vaListValid = vaList.filter(( aList ) => aList.sReason === null );
  const vaRefEntry = fvaRefEntry( vaListValid );
  const avaConclusionForRoot = favxGrouped(
    vaRefEntry,
    ( aEntry ) => aEntry.aRef.aTarget,
    ( aEntry ) => aEntry.aMarker
  );
  const fbSatisfied = fabSatisfiedForMarker(
    avaConclusionForRoot,
    asIdProved,
    aModel.aLines === undefined
      ? new Set()
      : aModel.aLines.asMarkerSatisfiedOwn
  );
  return {
    alistForMarker: new Map(
      vaList
        .filter(( aList ) => aList.sReasonBase === null )
        .map(( aList ) => [ aList.aMarker, aList ])
    ),
    asMarkerRoot: new Set( avaConclusionForRoot.keys()),
    vaRootBad: fvaRootBad( vaList, aModel.vaMarker ),
    vaRoot: aModel.vaMarker
      .filter(( aMarker ) => avaConclusionForRoot.has( aMarker ))
      .map(( aMarker ) => (
        faRootForMarker( aMarker, avaConclusionForRoot, fbSatisfied )
      )),
    vaArch: vaListValid
      .filter(( aList ) => aList.bArch )
      .map(( aList ) => ({
        sPath: aList.aMarker.sPath,
        aMarker: aList.aMarker,
        vsRef: aList.vaRef.map(( aRef ) => aRef.sId || aRef.sRef )
      })),
    vaRederive: vaRefEntry.filter(( aEntry ) => (
      aEntry.aRef.sStamp !== null
      && aEntry.aRef.sStamp !== aEntry.aRef.aTarget.sHash
    )),
    vaUnstamped: vaRefEntry.filter(( aEntry ) => aEntry.aRef.sStamp === null )
  };
};

const fsKeyPart = ( sId, sPart ) => sId + "\n" + sPart;

const faCallForPart = ( aModel ) => {
  const aCallForPart = new Map();
  aModel.vaCallTest.forEach(( aCall ) => aCall.vaPart.forEach(( aPart ) => {
    const sKey = fsKeyPart( aPart.aStmt.sId, aPart.sPart );
    if( !aCallForPart.has( sKey )){ aCallForPart.set( sKey, aCall );}
  }));
  return aCallForPart;
};

const fbPartsProved = ( aStmt, aCallForPart ) => (
  aStmt.vsPart !== null
  && aStmt.vsPart.every(( sPart ) => (
    aCallForPart.has( fsKeyPart( aStmt.sId, sPart ))
  ))
);

const fasIdProved = ( aModel ) => {
  const aCallForPart = faCallForPart( aModel );
  return new Set(
    aModel.vaCallTest
      .flatMap(( aCall ) => aCall.vaStmt.map(( aStmt ) => aStmt.sId ))
      .concat( fvaStmtForModel( aModel )
        .filter(( aStmt ) => fbPartsProved( aStmt, aCallForPart ))
        .map(( aStmt ) => aStmt.sId ))
  );
};

const fsProofForStmt = ( aStmt, aCallForPart ) => {
  if( aStmt.vsPart === null ){ return "";}
  const fbProved = ( sPart ) => aCallForPart.has(
    fsKeyPart( aStmt.sId, sPart )
  );
  const vsProved = aStmt.vsPart.filter( fbProved ).map(( sPart ) => {
    const aCall = aCallForPart.get( fsKeyPart( aStmt.sId, sPart ));
    return sPart + " " + aCall.sPath + ":" + ( aCall.nLine + 1 );
  });
  const vsMissing = aStmt.vsPart.filter(( sPart ) => !fbProved( sPart ));
  return ( vsProved.length === 0 ? "" : "  proved: " + vsProved.join( ", " ))
    + "  missing: " + vsMissing.join( "," );
};

const fvaProposedForModel = ( aModel, vaStmt ) => vaStmt
  .map(( aStmt ) => ({
    sPath: aStmt.sPath,
    aStmt,
    vaLink: aModel.vaLink
      .filter(( aLink ) => aLink.bProposed && aLink.aStmtNamed === aStmt )
      .sort(( aA, aB ) => aA.sPart.localeCompare( aB.sPart ))
  }))
  .filter(( aEntry ) => aEntry.vaLink.length > 0 );

const fvaRulingForText = ( sText, nEnd ) => {
  const vtSpan = fvtSpanForText( sText );
  const nLead = sText.match( reRulingLead )[ 0 ].length;
  const tSpanLead = vtSpan.find(( tSpan ) => tSpan[ 0 ] === nLead );
  const sLabelLead = tSpanLead === undefined || tSpanLead[ 1 ] >= nEnd
    ? ""
    : sText.slice( tSpanLead[ 0 ] + tSpanLead[ 2 ], tSpanLead[ 1 ]).trim();
  const vaLead = reRulingWhole.test( sLabelLead )
    ? [{ n: nLead, sLabel: sLabelLead }]
    : [];
  return vaLead.concat( Array.from( sText.matchAll( reRuling ), ( vs ) => ({
    n: vs.index, sLabel: vs[ 0 ]
  })).filter(( aRuling ) => (
    aRuling.n < nEnd && !fbInSpan( vtSpan, aRuling.n )
  ))).map(( aRuling ) => ({ ...aRuling, bOpening: aRuling.n === nLead }));
};

const fsRulingForMarker = ( aMarker ) => {
  const vaRuling = fvaRulingForText( aMarker.sText, Infinity );
  if( aMarker.sType !== "m" && vaRuling.length === 0 ){ return null;}
  if( aMarker.sType !== "m" ){
    return vaRuling[ 0 ].bOpening ? "opening" : "mid-line";
  }
  const bArch = ( aMarker.sList || "" ).split( "," ).includes( sArch );
  return !bArch && vaRuling.some(( aRuling ) => (
    aRuling.sLabel === sRulingArch
  )) ? "root list lacks arch" : null;
};

const fvaRulingForMarkers = ( aModel ) => fvaLineWell( aModel )
  .map(( aMarker ) => ({ aMarker, sRuling: fsRulingForMarker( aMarker ) }))
  .filter(( aEntry ) => aEntry.sRuling !== null )
  .map(( aEntry ) => ({
    sPath: aEntry.aMarker.sPath,
    nLine: aEntry.aMarker.nLine,
    sWhat: fsIdShown( aEntry.aMarker ) + "  " + aEntry.sRuling
  }));

const fvaRulingForBlocks = ( aModel ) => aModel.vaSpecParsed.flatMap((
  aSpec
) => aSpec.vaBlock
  .filter(( aBlock ) => {
    const vnMarker = fvnMarkerForText( aBlock.sText );
    const nEnd = vnMarker.length === 0 ? Infinity : vnMarker[ 0 ];
    return fvaRulingForText( aBlock.sText, nEnd ).length > 0;
  })
  .map(( aBlock ) => ({
    sPath: aSpec.sPath, nLine: aBlock.vnLine[ 0 ] + 1, sWhat: "unmarked"
  })));

const fvaRulingForModel = ( aModel ) => fvaRulingForMarkers( aModel )
  .concat( fvaRulingForBlocks( aModel ))
  .sort(( aA, aB ) => (
    aA.sPath.localeCompare( aB.sPath ) || aA.nLine - aB.nLine
  ));

const faTypeLists = ( aModel, aRoots ) => {
  const aLines = aModel.aLines;
  return {
    vaDangling: aLines.vaTarget.filter(( aTarget ) => (
      aTarget.bForm && aTarget.sReason !== null
    )),
    vaUnused: aLines.vaDefinition
      .filter(( aEntry ) => aEntry.bForm && aEntry.vaUse.length === 0 )
      .map(( aEntry ) => ({ ...aEntry, sPath: aEntry.aMarker.sPath })),
    vaUnderived: fvaLineOfType( aModel, "m" ).filter(( aMarker ) => (
      !aRoots.asMarkerRoot.has( aMarker )
    )),
    vaRuling: fvaRulingForModel( aModel ),
    vaFollowsBad: aLines.vaFollows
      .filter(( aFollows ) => aFollows.sReason !== null || aFollows.bStale )
      .sort(( aA, aB ) => (
        aA.sPath.localeCompare( aB.sPath ) || aA.nLine - aB.nLine
      )),
    vaUncited: fvaLineOfType( aModel, "g" ).filter(( aMarker ) => (
      !aMarker.bViaPrompt && !aLines.vaFollows.some(( aFollows ) => (
        aMarker.sId !== null && aFollows.sId === aMarker.sId
      ))
    )),
    vaNoCode: fvaNoCodeForChecks( aLines.vaCheck ),
    vaProblem: fvaProblemForChecks( aLines.vaCheck )
  };
};

const fvsIncompleteForTypes = ( aTypes, sPathSpec ) => (
  aTypes.vaUnused
    .filter(( aEntry ) => aEntry.sPath === sPathSpec )
    .map(( aEntry ) => (
      fsPlace( aEntry.aMarker ) + "  unused definition: " + aEntry.sTerm
    ))
    .concat( aTypes.vaUnderived
      .filter(( aMarker ) => aMarker.sPath === sPathSpec )
      .map(( aMarker ) => (
        fsPlace( aMarker ) + "  underived motive: " + fsWords( aMarker.sText )
      )))
);

const faStatements = ( aModel ) => {
  const asIdProved = fasIdProved( aModel );
  const aCallForPart = faCallForPart( aModel );
  const aRoots = faRoots( aModel, asIdProved );
  const vaStmt = fvaStmtForModel( aModel );
  const aTypes = faTypeLists( aModel, aRoots );
  return {
    ...aTypes,
    vaStmt,
    vaRootBad: aRoots.vaRootBad,
    vaRoot: aRoots.vaRoot,
    vaArch: aRoots.vaArch,
    vaRederive: aRoots.vaRederive,
    vaUnstamped: aRoots.vaUnstamped,
    vaMarkerBad: fvaMarkerBad( aModel ),
    vaUnproved: vaStmt
      .filter(( aStmt ) => (
        !asIdProved.has( aStmt.sId ) && !aRoots.asMarkerRoot.has( aStmt )
      ))
      .map(( aStmt ) => ({
        ...aStmt, sProof: fsProofForStmt( aStmt, aCallForPart )
      })),
    vaProposed: fvaProposedForModel( aModel, vaStmt ),
    vaLinkBad: aModel.vaLink.filter(( aLink ) => aLink.sReason !== null ),
    vaStale: aModel.vaLink.filter(( aLink ) => aLink.bStale ),
    vaStaleSibling: [],
    vaIncomplete: aModel.vaSpecParsed
      .filter(( aSpec ) => aSpec.bComplete )
      .flatMap(( aSpec ) => (
        fvsIncompleteForSpec( aModel, aSpec )
          .concat( fvsIncompleteForTypes( aTypes, aSpec.sPath ))
          .map(( sLine ) => ({ sPathSpec: aSpec.sPath, sLine }))
      )),
    vaPlaceholder: fvaPlaceholderForMarker( aModel.vaMarker ),
    vaFenceUnclosed: aModel.vaSpecParsed.flatMap(( aSpec ) => (
      aSpec.vaFenceUnclosed
    ))
  };
};

const faStatementsScoped = ( aStmtList, aScope ) => {
  if( aScope === null ){ return aStmtList;}
  const fbSpec = ( aEntry ) => aEntry.sPath === aScope.sPathSpec;
  const fbSpecMarker = ( aEntry ) => fbSpec( aEntry.aMarker );
  return {
    vaStmt: aStmtList.vaStmt.filter( fbSpec ),
    vaRootBad: aStmtList.vaRootBad.filter( fbSpec ),
    vaRoot: aStmtList.vaRoot.filter(( aRoot ) => (
      fbSpec( aRoot ) || aRoot.vaConclusion.some( fbSpecMarker )
    )),
    vaArch: aStmtList.vaArch.filter( fbSpec ),
    vaRederive: aStmtList.vaRederive.filter(( aEntry ) => (
      fbSpec( aEntry ) || fbSpec( aEntry.aRef.aTarget )
    )),
    vaUnstamped: aStmtList.vaUnstamped.filter( fbSpec ),
    vaMarkerBad: aStmtList.vaMarkerBad.filter(( aEntry ) => (
      fbSpec( aEntry ) || aScope.asIdStmt.has( aEntry.sId )
    )),
    vaUnproved: aStmtList.vaUnproved.filter( fbSpec ),
    vaProposed: aStmtList.vaProposed.filter( fbSpec ),
    vaLinkBad: aStmtList.vaLinkBad.filter(( aEntry ) => (
      aScope.asPathTest.has( aEntry.sPath )
    )),
    vaStale: aStmtList.vaStale.filter(( aEntry ) => fbSpec( aEntry.aStmt )),
    vaStaleSibling: aStmtList.vaStale.filter(( aEntry ) => (
      !fbSpec( aEntry.aStmt ) && aScope.asPathTest.has( aEntry.sPath )
    )),
    vaIncomplete: aStmtList.vaIncomplete.filter(( aEntry ) => (
      aEntry.sPathSpec === aScope.sPathSpec
    )),
    vaPlaceholder: aStmtList.vaPlaceholder.filter( fbSpec ),
    vaFenceUnclosed: aStmtList.vaFenceUnclosed.filter( fbSpec ),
    vaDangling: aStmtList.vaDangling.filter( fbSpec ),
    vaUnused: aStmtList.vaUnused.filter( fbSpec ),
    vaUnderived: aStmtList.vaUnderived.filter( fbSpec ),
    vaRuling: aStmtList.vaRuling.filter( fbSpec ),
    vaFollowsBad: aStmtList.vaFollowsBad.filter(( aFollows ) => (
      aFollows.sPathNamed === aScope.sPathSpec
    )),
    vaUncited: aStmtList.vaUncited.filter( fbSpec ),
    vaNoCode: aStmtList.vaNoCode.filter( fbSpec ),
    vaProblem: aStmtList.vaProblem.filter( fbSpec )
  };
};

const fbCallUnlinked = ( aCall ) => (
  aCall.vaStmt.length === 0 && aCall.vaPart.length === 0
);

const faUnlinkedForCalls = ( vaCallTest ) => {
  const vaCallUnlinked = vaCallTest.filter( fbCallUnlinked );
  return {
    cTestRead: vaCallTest.length,
    cUnlinked: vaCallUnlinked.length,
    vaUnlinkedFile: Array.from( favxGrouped(
      vaCallUnlinked, ( aCall ) => aCall.sPath, () => 1
    ))
      .map(( tEntry ) => ({ sPath: tEntry[ 0 ], c: tEntry[ 1 ].length }))
      .sort(( aA, aB ) => aB.c - aA.c || aA.sPath.localeCompare( aB.sPath ))
  };
};

const fbInScope = ( asPathScope, aEntry ) => (
  asPathScope === null || asPathScope.has( aEntry.sPath )
);

const fasPathNaming = ( vaTestParsed, sPathSpec ) => new Set(
  vaTestParsed
    .filter(( aTest ) => fasPathOwner( aTest.vaOwner ).has( sPathSpec ))
    .map(( aTest ) => aTest.sPath )
);

const fasPathLinking = ( vaLink, asIdStmt ) => new Set(
  vaLink
    .filter(( aLink ) => asIdStmt.has( aLink.sId ))
    .map(( aLink ) => aLink.sPath )
);

const faOwnershipScoped = ( aOwnership, asPathScope ) => ({
  vsPathNoOwner: aOwnership.vsPathNoOwner.filter(( sPath ) => (
    fbInScope( asPathScope, { sPath })
  )),
  vaUnresolved: aOwnership.vaUnresolved.filter(( aEntry ) => (
    fbInScope( asPathScope, aEntry )
  )),
  vaRemovable: aOwnership.vaRemovable.filter(( aEntry ) => (
    fbInScope( asPathScope, aEntry )
  ))
});

const fasIdStmtForSpec = ( aModel, sPathSpec ) => new Set(
  Array.from( aModel.avaMarkerForId.entries())
    .filter(( tEntry ) => tEntry[ 1 ].some(( aMarker ) => (
      aMarker.sPath === sPathSpec
    )))
    .map(( tEntry ) => tEntry[ 0 ])
);

const fbCompleteSpec = ( aModel, sPathSpec ) => aModel.vaSpecParsed.some((
  aSpec
) => aSpec.sPath === sPathSpec && aSpec.bComplete );

const faMap = ( aInput ) => {
  const sPathSpec = aInput.sPathSpec;
  const aModel = faModel( aInput );
  const vaTestParsed = aModel.vaTestParsed;
  const aOwnership = faOwnership(
    vaTestParsed,
    new Set( aModel.vaSpecParsed.map(( aSpec ) => aSpec.sPath ))
  );
  const asIdStmt = sPathSpec === undefined
    ? null
    : fasIdStmtForSpec( aModel, sPathSpec );
  const asPathOwnScope = sPathSpec === undefined
    ? null
    : new Set([
      ...fasPathNaming( vaTestParsed, sPathSpec ),
      ...fasPathLinking( aModel.vaLink, asIdStmt )
    ]);
  const aStmtList = faStatementsScoped(
    faStatements( aModel ),
    sPathSpec === undefined
      ? null
      : { sPathSpec, asIdStmt, asPathTest: asPathOwnScope }
  );
  return {
    ...faOwnershipScoped( aOwnership, asPathOwnScope ),
    ...aStmtList,
    bScoped: sPathSpec !== undefined,
    bComplete: fbCompleteSpec( aModel, sPathSpec ),
    ...faUnlinkedForCalls(
      aModel.vaCallTest.filter(( aCall ) => fbInScope( asPathOwnScope, aCall ))
    )
  };
};

const fsSection = ( sTitle, vsLine, c ) => (
  [ sTitle + " (" + ( c === undefined ? vsLine.length : c ) + "):" ]
    .concat( vsLine.map(( sLine ) => "  " + sLine ))
    .join( "\n" )
);

const fsPlace = ( aEntry ) => aEntry.sPath + ":" + aEntry.nLine;

const fvsSectionUnlinked = ( aMap ) => [
  fsSection(
    "test files with unlinked tests",
    aMap.vaUnlinkedFile.map(( aEntry ) => aEntry.sPath + "  " + aEntry.c )
  ),
  "Unlinked tests: " + aMap.cUnlinked + " of " + aMap.cTestRead
];

const fvsSectionOwner = ( aMap ) => [
  fsSection( "test files with no owner line", aMap.vsPathNoOwner ),
  fsSection(
    "owner lines that do not resolve",
    aMap.vaUnresolved.map(( aEntry ) => (
      fsPlace( aEntry ) + "  " + aEntry.sText + "  (" + aEntry.sReason + ")"
    ))
  )
];

const fsLineStaleWith = ( aLink, sSpec ) => (
  fsPlace( aLink ) + "  "
  + ( aLink.aCall === null ? "" : aLink.aCall.sName ) + "  "
  + fsIdForLink( aLink ) + sSpec + "  recorded " + aLink.sHash
  + "  current " + aLink.aStmt.sHash
);

const fsLineStale = ( aLink ) => fsLineStaleWith( aLink, "" );

const fsLineStaleSibling = ( aLink ) => (
  fsLineStaleWith( aLink, "  " + aLink.aStmt.sPath )
);

const fvsSectionStaleSibling = ( aMap ) => (
  aMap.bScoped
    ? [
      fsSection(
        "other specs' stale links in this spec's test files",
        aMap.vaStaleSibling.map( fsLineStaleSibling )
      )
    ]
    : []
);

const fvsSectionStmt = ( aMap ) => [
  fsSection(
    "malformed markers and duplicate ids",
    aMap.vaMarkerBad.map(( aEntry ) => (
      fsPlace( aEntry ) + "  " + aEntry.sText + "  (" + aEntry.sReason + ")"
    ))
  ),
  fsSection(
    "statements no test proves",
    aMap.vaUnproved.map(( aStmt ) => (
      aStmt.sId + "  " + fsPlace( aStmt ) + aStmt.sProof
    ))
  ),
  fsSection(
    "link lines that do not resolve",
    aMap.vaLinkBad.map(( aLink ) => (
      fsPlace( aLink ) + "  " + aLink.sText + "  (" + aLink.sReason + ")"
    ))
  ),
  fsSection( "stale links", aMap.vaStale.map( fsLineStale )),
  fsSection(
    "completeness failures",
    aMap.vaIncomplete.map(( aEntry ) => aEntry.sLine )
  ),
  fsSection(
    "removable owner lines",
    aMap.vaRemovable.map(( aEntry ) => fsPlace( aEntry ) + "  " + aEntry.sText )
  ),
  fsSection(
    "placeholders",
    aMap.vaPlaceholder.map(( aMarker ) => (
      fsPlace( aMarker ) + "  " + fsWords( aMarker.sText )
    ))
  ),
  fsSection(
    "unclosed fences",
    aMap.vaFenceUnclosed.map(( aEntry ) => (
      fsPlace( aEntry ) + "  " + aEntry.sText
    ))
  ),
  fsSection(
    "statements with proposed parts",
    aMap.vaProposed.flatMap( fvsLineForProposed ),
    aMap.vaProposed.length
  )
];

const fvsLineForProposed = ( aEntry ) => [
  fsPlace( aEntry.aStmt ) + "  " + aEntry.aStmt.sId
].concat( aEntry.vaLink.map(( aLink ) => (
  "  " + aLink.sPart + "  " + fsPlace( aLink ) + "  " + fsNameForLink( aLink )
)));

const fsNameForLink = ( aLink ) => (
  aLink.aCall === null ? "(no call)" : aLink.aCall.sName
);

const fsIdForLink = ( aLink ) => (
  aLink.sId + ( aLink.sPart === null ? "" : " part=" + aLink.sPart )
);

const fsIdShown = ( aMarker ) => aMarker.sId || "placeholder";

const fvsLineForRoot = ( aRoot ) => (
  [ fsPlace( aRoot.aMarker ) + "  " + fsIdShown( aRoot.aMarker ) ]
    .concat( aRoot.vaConclusion.map(( aC ) => (
      "  " + fsPlace( aC.aMarker ) + "  " + fsIdShown( aC.aMarker ) + "  "
      + ( aC.bSatisfied ? "satisfied" : "unsatisfied" )
    )))
    .concat([ "  " + (
      aRoot.bCovered
        ? "covered"
        : aRoot.cSatisfied + " of " + aRoot.vaConclusion.length + " satisfied"
    )])
);

const fvsLineForArch = ( vaArch ) => fvsLineGrouped( vaArch, ( aArch ) => [
  "  " + aArch.aMarker.nLine + "  " + fsIdShown( aArch.aMarker ) + "  "
  + fsWords( aArch.aMarker.sText )
  + ( aArch.vsRef.length === 0 ? "" : "  beside " + aArch.vsRef.join( ", " ))
]);

const fsSectionArch = ( vaArch ) => fsSection(
  "statements rooted in arch", fvsLineForArch( vaArch ), vaArch.length
);

const fsLineForRefEntry = ( aEntry ) => (
  fsPlace( aEntry.aMarker ) + "  " + fsIdShown( aEntry.aMarker ) + "  root "
  + ( aEntry.aRef.sId || aEntry.aRef.sRef )
);

const fvsSectionRoot = ( aMap ) => [
  fsSection(
    "malformed root lists",
    aMap.vaRootBad.map(( aEntry ) => (
      fsPlace( aEntry ) + "  " + aEntry.sText + "  (" + aEntry.sReason + ")"
    ))
  ),
  fsSection(
    "roots", aMap.vaRoot.flatMap( fvsLineForRoot ), aMap.vaRoot.length
  ),
  fsSectionArch( aMap.vaArch ),
  fsSection(
    "re-derive: stale root references",
    aMap.vaRederive.map(( aEntry ) => (
      fsLineForRefEntry( aEntry ) + "  recorded " + aEntry.aRef.sStamp
      + "  current " + aEntry.aRef.aTarget.sHash
    ))
  ),
  fsSection(
    "unstamped root references", aMap.vaUnstamped.map( fsLineForRefEntry )
  )
];

const fsLineForFollows = ( aFollows ) => (
  fsPlace( aFollows ) + "  " + aFollows.sId + "  " + (
    aFollows.sReason === null
      ? "stale  recorded " + aFollows.sHash + "  current "
        + aFollows.aLine.sHash
      : "(" + aFollows.sReason + ")"
  )
);

const fsLineForMarker = ( aMarker ) => (
  fsPlace( aMarker ) + "  " + fsIdShown( aMarker )
);

const fvsSectionLines = ( aMap ) => [
  fsSection( "dangling targets", aMap.vaDangling.map(( aTarget ) => (
    fsLineForMarker( aTarget.aMarker ) + " " + aTarget.sTarget + "  ("
    + aTarget.sReason + ")"
  ))),
  fsSection( "unused definitions", aMap.vaUnused.map(( aEntry ) => (
    fsLineForMarker( aEntry.aMarker ) + "  " + aEntry.sTerm
  ))),
  fsSection( "underived motives", aMap.vaUnderived.map(( aMarker ) => (
    fsLineForMarker( aMarker ) + "  " + fsWords( aMarker.sText )
  ))),
  fsSection(
    sTitleRuling,
    aMap.vaRuling.map(( aRuling ) => fsPlace( aRuling ) + "  " + aRuling.sWhat )
  ),
  fsSection(
    "guidance references that do not resolve or are stale",
    aMap.vaFollowsBad.map( fsLineForFollows )
  ),
  fsSection(
    "guidance no reference names", aMap.vaUncited.map( fsLineForMarker )
  ),
  fsSection(
    sTitleNoCode,
    aMap.vaNoCode.map(( aCheck ) => fsLineForMarker( aCheck.aMarker ))
  ),
  fsSectionProblem( aMap.vaProblem )
];

const fsLineForProblem = ( aProblem ) => {
  const sNote = fsNoteForRecord( aProblem.aRecord );
  return fsLineForMarker( aProblem.aMarker ) + "  "
    + aProblem.aRecord.sVerdict + "  " + aProblem.aRecord.sDate
    + ( sNote === "" ? "" : "  " + sNote );
};

const fsSectionProblem = ( vaProblem ) => fsSection(
  sTitleProblem, vaProblem.map( fsLineForProblem )
);

const fsReport = ( aMap ) => fvsSectionOwner( aMap ).concat(
  fvsSectionStmt( aMap ),
  fvsSectionStaleSibling( aMap ),
  fvsSectionRoot( aMap ),
  fvsSectionLines( aMap ),
  fvsSectionUnlinked( aMap ),
  [
    ( aMap.vaStmt.length - aMap.vaUnproved.length ) + " of "
    + aMap.vaStmt.length + " statements proved by a test"
  ]
).join( "\n" ) + "\n";

const fbClean = ( aMap ) => (
  aMap.vaUnresolved.length === 0
  && aMap.vaMarkerBad.length === 0
  && aMap.vaLinkBad.length === 0
  && aMap.vaStale.length === 0
  && aMap.vaRootBad.length === 0
  && aMap.vaFenceUnclosed.length === 0
  && aMap.vaDangling.length === 0
  && aMap.vaFollowsBad.length === 0
  && aMap.vaNoCode.length === 0
  && (
    !aMap.bComplete
    || ( aMap.vaUnproved.length === 0 && aMap.vaIncomplete.length === 0 )
  )
);

const fsSid = ( aModel, aStmt ) => {
  const vaLink = aModel.vaLink.filter(( aLink ) => aLink.sId === aStmt.sId );
  const vsLink = vaLink.length === 0
    ? [ "no link names " + aStmt.sId ]
    : vaLink.map(( aLink ) => (
      fsPlace( aLink ) + "  " + fsNameForLink( aLink ) + "  "
      + aLink.sHash + "  " + ( aLink.sPart || "whole" ) + "  "
      + fsStateForLink( aLink )
    ));
  const aCallForPart = faCallForPart( aModel );
  const vsPart = ( aStmt.vsPart || [] ).map(( sPart ) => (
    sPart + "  " + (
      aCallForPart.has( fsKeyPart( aStmt.sId, sPart )) ? "proved" : "missing"
    )
  ));
  return [
    fsPlace( aStmt ) + "  " + aStmt.sId + "  " + fsWords( aStmt.sText )
  ].concat( vsLink, vsPart ).join( "\n" ) + "\n";
};

const fsStateForLink = ( aLink ) => {
  if( aLink.sReason !== null ){ return aLink.sReason;}
  if( aLink.bProposed ){ return "proposed";}
  return aLink.bStale ? "stale" : "current";
};

const fsSuiteForPath = ( vaSuite, sPath ) => {
  const vsPart = sPath.split( "/" );
  const aSuite = vaSuite.find(( aSuiteT ) => aSuiteT.vsDir.some(( sDir ) => (
    fnPrefixMatched( vsPart, fsPosix( sDir )) >= 0
  )));
  return aSuite === undefined ? "" : aSuite.sName;
};

const fbLinkCoversTest = ( aModel, aLink ) => aModel.vaCallTest.some((
  aCall
) => aCall.sPath === aLink.sPath && fbEncloses( aLink.aCall, aCall ));

const fsCrossSuite = ( aModel, vsArg, aConfig ) => fvaStmtForModel( aModel )
  .filter(( aStmt ) => aStmt.vsPart === null && aStmt.sReasonParts === null )
  .map(( aStmt ) => ({
    aStmt,
    vaLink: aModel.vaLink.filter(( aLink ) => (
      aLink.aStmt === aStmt
      && aLink.sPart === null
      && fbLinkCoversTest( aModel, aLink )
    ))
  }))
  .filter(( aEntry ) => new Set(
    aEntry.vaLink.map(( aLink ) => (
      fsSuiteForPath( aConfig.vaSuite, aLink.sPath )
    ))
  ).size > 1 )
  .map(( aEntry ) => [
    fsPlace( aEntry.aStmt ) + "  " + aEntry.aStmt.sId
  ].concat( aEntry.vaLink.map(( aLink ) => "  " + fsPlace( aLink )))
    .join( "\n" ) + "\n" )
  .join( "" );

const fbCallCoveredBy = ( aCall, aStmt ) => (
  aCall.vaStmt.includes( aStmt )
  || aCall.vaPart.some(( aPart ) => aPart.aStmt === aStmt )
);

const fsProbes = ( aModel ) => fvaStmtForModel( aModel )
  .filter(( aStmt ) => aStmt.bProbe )
  .map(( aStmt ) => [ fsPlace( aStmt ) + "  " + aStmt.sId ]
    .concat( aModel.vaCallTest
      .filter(( aCall ) => fbCallCoveredBy( aCall, aStmt ))
      .map(( aCall ) => "  " + fsLineForCall( aCall, "" )))
    .join( "\n" ) + "\n" )
  .join( "" );

const fvsTermForText = ( sText ) => Array.from( new Set(
  fvsSpanContent( sText ).concat( fvsMatch( reQuoted, sText ))
)).filter(( sTerm ) => sTerm.length >= cTermMin );

const faScoreForCall = ( aCall, vsTermStmt ) => {
  const sHay = aCall.vsNameEnclosing.concat( aCall.sBody ).join( "\n" );
  const vsTerm = vsTermStmt.filter(( sTerm ) => sHay.includes( sTerm ));
  return { aCall, vsTerm, zScore: vsTerm.length };
};

const fzCompareScore = ( aA, aB ) => (
  aB.zScore - aA.zScore
  || aA.aCall.sPath.localeCompare( aB.aCall.sPath )
  || aA.aCall.nLine - aB.aCall.nLine
);

const fsCandidates = ( aModel, aStmt ) => {
  const vsTermStmt = fvsTermForText( aStmt.sText );
  return aModel.vaCallTest
    .filter(( aCall ) => aCall.asOwner.has( aStmt.sPath ))
    .filter(( aCall ) => !aCall.vaStmtLinked.some(( aProved ) => (
      aProved.sId === aStmt.sId
    )))
    .map(( aCall ) => faScoreForCall( aCall, vsTermStmt ))
    .filter(( aScore ) => aScore.zScore > 0 )
    .sort( fzCompareScore )
    .map(( aScore ) => (
      fsLineForCall( aScore.aCall, "" ) + "  score " + aScore.zScore
      + "  terms: " + aScore.vsTerm.join( "," ) + "\n"
    ))
    .join( "" );
};

const fsRoot = ( aModel, aStmt ) => {
  const aRoot = faRoots( aModel, fasIdProved( aModel )).vaRoot
    .find(( aRootT ) => aRootT.aMarker === aStmt );
  return aRoot === undefined
    ? fsPlace( aStmt ) + "  " + aStmt.sId + "  has no conclusions\n"
    : fvsLineForRoot( aRoot ).join( "\n" ) + "\n";
};

const fsStateForFollows = ( aFollows ) => {
  if( aFollows.sReason !== null ){ return aFollows.sReason;}
  return aFollows.bStale ? "stale" : "current";
};

const fvaFollowsNaming = ( aModel, aMarker ) => (
  aModel.aLines.vaFollows.filter(( aFollows ) => (
    aMarker.sId !== null && aFollows.sId === aMarker.sId
  ))
);

const fsLineForRecord = ( aRecord ) => (
  aRecord.sDate + "  " + aRecord.sVerdict + "  " + aRecord.sHash
  + ( aRecord.sNote ? "  " + aRecord.sNote : "" )
);

const afvsSidForType = {
  p: ( aModel, aMarker ) => aModel.aLines.vaTarget
    .filter(( aTarget ) => aTarget.aMarker === aMarker )
    .map(( aTarget ) => aTarget.sTarget + "  " + (
      aTarget.bForm ? aTarget.sReason || "resolves" : "malformed"
    )),
  d: ( aModel, aMarker ) => aModel.aLines.vaDefinition
    .filter(( aEntry ) => aEntry.aMarker === aMarker )
    .flatMap(( aEntry ) => [ "term: " + ( aEntry.sTerm || "" )]
      .concat( aEntry.vaUse.map( fsPlace ))),
  m: ( aModel, aMarker ) => fsRoot( aModel, aMarker ).trimEnd().split( "\n" ),
  i: ( aModel, aMarker ) => aModel.aLines.vaCheck
    .filter(( aCheck ) => aCheck.aMarker === aMarker )
    .flatMap(( aCheck ) => [ "status: " + aCheck.sStatus ]
      .concat( aCheck.vaRecord.map( fsLineForRecord ))),
  g: ( aModel, aMarker ) => fvaFollowsNaming( aModel, aMarker ).map((
    aFollows
  ) => fsPlace( aFollows ) + "  " + fsStateForFollows( aFollows ))
};

const fsSidAny = ( aModel, aMarker ) => {
  if( aMarker.sType === "s" ){ return fsSid( aModel, aMarker );}
  return [
    fsPlace( aMarker ) + "  " + aMarker.sId + "  "
    + asNameForType[ aMarker.sType ]
  ]
    .concat(
      aMarker.sType === "i" ? afvsSidForType.p( aModel, aMarker ) : [],
      afvsSidForType[ aMarker.sType ]( aModel, aMarker )
    )
    .join( "\n" ) + "\n";
};

const afsQueryForFlag = {
  "--hash": ( aModel, aStmt ) => aStmt.sHash + "\n",
  "--sid": fsSidAny,
  "--candidates": fsCandidates,
  "--root": fsRoot
};

const fsProblemForId = ( sId, cMarker ) => (
  cMarker === 0
    ? "spec-map: no spec marks " + sId + "\n"
    : "spec-map: " + sId + " is marked at " + cMarker + " places\n"
);

class IdMinter {
  constructor( asBodyTaken ){
    this.asBodyTaken = asBodyTaken;
  }

  fsId( sType ){
    for(;;){
      const sBody = Array.from(
        { length: cIdChar },
        () => sIdChar[ crypto.randomInt( sIdChar.length )]
      ).join( "" );
      if( !this.asBodyTaken.has( sBody )){
        this.asBodyTaken.add( sBody );
        return sType + "-" + sBody;
  }}}
}

const fsTextEdited = ( sText, vaEdit ) => (
  vaEdit
    .slice()
    .sort(( aA, aB ) => aB.aMarker.nOffset - aA.aMarker.nOffset )
    .reduce(( sAcc, aEdit ) => (
      sAcc.slice( 0, aEdit.aMarker.nOffset ) + aEdit.sToken
      + sAcc.slice( aEdit.aMarker.nOffset + aEdit.aMarker.sToken.length )
    ), sText )
);

const fsRefStamped = ( aRef, asIdNewForMarker ) => {
  if( aRef.sIdRetyped !== null ){ return null;}
  if( aRef.sLabel !== null ){
    return asIdNewForMarker.get( aRef.aTarget ) + "@" + aRef.aTarget.sHash;
  }
  return aRef.sStamp === null ? aRef.sId + "@" + aRef.aTarget.sHash : null;
};

const fsRefRetyped = ( aRef ) => (
  aRef.sIdRetyped === null
    ? null
    : aRef.sIdRetyped + ( aRef.sStamp === null ? "" : "@" + aRef.sStamp )
);

const fsTargetsAssigned = ( aMarker, vaTargetRetyped ) => (
  aMarker.sTargets === null
    ? null
    : aMarker.sTargets.split( "," ).map(( sTarget ) => {
      const aTarget = vaTargetRetyped.find(( aT ) => aT.sTarget === sTarget );
      return aTarget === undefined ? sTarget : aTarget.sIdRetyped;
    }).join( "," )
);

const fsViaToken = ( aMarker ) => (
  aMarker.sVia === null ? "" : " via=" + aMarker.sVia
);

const fsTokenAssigned = ( aMarker, sId, sList, sTargets ) => (
  "{#" + sId
  + ( sList === null ? "" : " <" + sList )
  + ( sTargets === null ? "" : " >" + sTargets )
  + ( aMarker.sParts === null ? "" : " parts=" + aMarker.sParts )
  + ( aMarker.bViaEarly ? fsViaToken( aMarker ) : "" )
  + ( aMarker.sFor === null ? "" : " for=" + aMarker.sFor )
  + ( aMarker.bViaEarly ? "" : fsViaToken( aMarker ))
  + ( aMarker.bProbe ? " probe" : "" ) + "}"
);

const fsListWithArch = ( aList, vsRef ) => (
  aList.nArch < 0
    ? vsRef
    : vsRef.slice( 0, aList.nArch ).concat( sArch, vsRef.slice( aList.nArch ))
).join( "," );

const faEditForMarker = (
  aMarker, aList, asIdNewForMarker, vaTargetRetyped
) => {
  const sIdNew = asIdNewForMarker.get( aMarker );
  const sId = sIdNew || aMarker.sIdPart;
  const vaRef = aList === undefined ? [] : aList.vaRef;
  const vsStamp = vaRef.map(( aRef ) => fsRefStamped( aRef, asIdNewForMarker ));
  const vsRetyped = vaRef.map( fsRefRetyped );
  const sList = vaRef.length === 0
    ? aMarker.sList
    : fsListWithArch( aList, vaRef.map(( aRef, n ) => (
      vsStamp[ n ] || vsRetyped[ n ] || aRef.sRef
    )));
  const fsPlaced = ( s ) => fsPlace( aMarker ) + "  " + s + "\n";
  return {
    aMarker,
    sIdNew,
    vsStamp: vsStamp.filter( Boolean ).map(( sStamp ) => (
      fsPlaced( sId + "  <" + sStamp )
    )),
    vsRetype: vaRef
      .filter(( aRef ) => aRef.sIdRetyped !== null )
      .concat( vaTargetRetyped.map(( aTarget ) => ({
        sId: aTarget.sTarget, sIdRetyped: aTarget.sIdRetyped
      })))
      .map(( aRef ) => fsPlaced( aRef.sId + " -> " + aRef.sIdRetyped )),
    sToken: fsTokenAssigned(
      aMarker, sId, sList, fsTargetsAssigned( aMarker, vaTargetRetyped )
    )
  };
};

const fvaEditForSpec = ( aModel, vaMarker, aRoots, asIdNewForMarker ) => (
  vaMarker
    .map(( aMarker ) => faEditForMarker(
      aMarker,
      aRoots.alistForMarker.get( aMarker ),
      asIdNewForMarker,
      aModel.aLines.vaTarget.filter(( aTarget ) => (
        aTarget.aMarker === aMarker && aTarget.sIdRetyped !== null
      ))
    ))
    .filter(( aEdit ) => (
      aEdit.sIdNew !== undefined
      || aEdit.vsStamp.length > 0
      || aEdit.vsRetype.length > 0
    ))
);

const fbPathIgnored = ( sPath, vsDirIgnored ) => sPath.split( path.sep )
  .some(( sPart ) => vsDirIgnored.includes( sPart ));

const freFileForLanguages = ( vsLanguage ) => {
  const vsExt = vsLanguage.flatMap(( sLanguage ) => (
    avsExtForLanguage[ sLanguage ]
  ));
  if( vsExt.length === 0 ){ return reNever;}
  return new RegExp(
    "(?:" + vsExt.map(( sExt ) => sExt.replace( reEscape, "\\$&" ))
      .join( "|" ) + ")$"
  );
};

class TreeReader {
  constructor( sDirRoot, aConfig ){
    this.sDirRoot = sDirRoot;
    this.aConfig = aConfig;
    this.configReader = new ConfigReader( sDirRoot );
  }

  fvsPathUnder( sDirRel, fbKeep ){
    const sDir = path.join( this.sDirRoot, sDirRel );
    if( !fs.existsSync( sDir )){ return [];}
    return fs.readdirSync( sDir, { recursive: true })
      .map(( sPathRel ) => path.join( sDirRel, sPathRel ))
      .filter(( sPath ) => !fbPathIgnored(
        sPath, this.aConfig.vsDirIgnored
      ))
      .filter( fbKeep )
      .sort();
  }

  fvaFile( vsPath ){
    return vsPath
      .filter(( sPath ) => (
        fs.statSync( path.join( this.sDirRoot, sPath )).isFile()
      ))
      .map(( sPath ) => ({
        sPath,
        sText: fs.readFileSync( path.join( this.sDirRoot, sPath ), "utf8" )
    }));
  }

  fvaSpec(){
    return this.fvaFile(
      this.fvsPathUnder( "specs", ( sPath ) => sPath.endsWith( ".md" ))
    );
  }

  fvsDirExpanded( vsPattern ){
    return vsPattern.flatMap(( sPattern ) => this.configReader.fvsDirExpanded(
      sPattern, this.aConfig.vsDirIgnored
    ));
  }

  fvaTest(){
    const bJavascript = this.aConfig.vsLanguage.some(( sLanguage ) => (
      asLanguageTest.has( sLanguage )
    ));
    const vsDirSuite = this.fvsDirExpanded(
      this.aConfig.vaSuite.flatMap(( aSuite ) => aSuite.vsDir )
    );
    return this.fvaFile( Array.from( new Set(
      vsDirSuite.flatMap(( sDir ) => this.fvsPathUnder( sDir, ( sPath ) => (
        bJavascript && reFileTest.test( sPath )
      )))
    )));
  }

  fWriteText( sPath, sText ){
    fs.writeFileSync( path.join( this.sDirRoot, sPath ), sText );
  }

  fbExists( sPath ){
    return fs.existsSync( path.join( this.sDirRoot, sPath ));
  }

  fsKind( sPath ){
    const sPathFull = path.resolve( this.sDirRoot, sPath );
    if( !fs.existsSync( sPathFull )){ return null;}
    const stat = fs.statSync( sPathFull );
    if( stat.isFile()){ return "file";}
    return stat.isDirectory() ? "dir" : null;
  }

  fsTextAt( sPath ){
    return this.fsKind( sPath ) === "file"
      ? fs.readFileSync( path.resolve( this.sDirRoot, sPath ), "utf8" )
      : null;
  }

  fvsPathFile( sDirRel ){
    return this.fvsPathWalk( sDirRel ).map( fsPosix ).sort();
  }

  fWriteAt( sPath, sText ){
    const sPathFull = path.resolve( this.sDirRoot, sPath );
    fs.mkdirSync( path.dirname( sPathFull ), { recursive: true });
    fs.writeFileSync( sPathFull, sText );
  }

  fvsPathWalk( sDirRel ){
    const sDir = path.join( this.sDirRoot, sDirRel );
    if( !fs.existsSync( sDir )){ return [];}
    return fs.readdirSync( sDir, { withFileTypes: true })
      .filter(( aEntry ) => !this.aConfig.vsDirIgnored.includes( aEntry.name ))
      .flatMap(( aEntry ) => {
        const sPath = path.join( sDirRel, aEntry.name );
        if( aEntry.isDirectory()){ return this.fvsPathWalk( sPath );}
        return aEntry.isFile() ? [ sPath ] : [];
      });
  }

  fvaCiter(){
    const reFileCiter = freFileForLanguages( this.aConfig.vsLanguage );
    const vsDirRead = this.fvsDirExpanded( this.aConfig.vsDirRead );
    return this.fvaFile( Array.from( new Set(
      vsDirRead
        .flatMap(( sDir ) => this.fvsPathWalk( sDir ))
        .filter(( sPath ) => reFileCiter.test( sPath ))
    )).sort()).filter(( aFile ) => aFile.sText.includes( "@follows" ));
  }

  fvaRecord(){
    const sPath = path.join( this.sDirRoot, this.aConfig.sPathRecord );
    if( !fs.existsSync( sPath )){ return [];}
    return fs.readFileSync( sPath, "utf8" ).split( "\n" )
      .map( faRecordForLine )
      .filter( Boolean );
  }

  fAppendRecord( aRecord ){
    const sPath = path.join( this.sDirRoot, this.aConfig.sPathRecord );
    fs.mkdirSync( path.dirname( sPath ), { recursive: true });
    fs.appendFileSync( sPath, JSON.stringify( aRecord ) + "\n" );
  }
}

const faRecordForLine = ( sLine ) => {
  try{
    const aRecord = JSON.parse( sLine );
    return aRecord !== null && typeof aRecord.sId === "string"
      ? aRecord
      : null;
  }
  catch( e ){
    return null;
  }
};

const faModelForReader = ( reader, bTest ) => faModel({
  vaSpec: reader.fvaSpec(),
  vaTest: bTest ? reader.fvaTest() : [],
  vaCiter: reader.fvaCiter(),
  vaRecord: reader.fvaRecord(),
  fbExists: ( sPath ) => reader.fbExists( sPath ),
  aFiles: reader
});

const fasBodyTaken = ( vaSpec, aModel ) => new Set(
  vaSpec
    .flatMap(( aSpec ) => Array.from(
      aSpec.sText.matchAll( reBodyAny ), ( vs ) => vs[ 1 ]
    ))
    .concat( aModel.vaMarker
      .map(( aMarker ) => aMarker.sBody )
      .filter( Boolean ))
);

const fzAssign = ( reader, fWrite ) => {
  const vaSpec = reader.fvaSpec();
  const aModel = faModel({ vaSpec, vaTest: [] });
  const aRoots = faRoots( aModel, new Set());
  const minter = new IdMinter( fasBodyTaken( vaSpec, aModel ));
  const asIdNewForMarker = new Map(
    aModel.vaMarker
      .filter(( aMarker ) => aMarker.bPlaceholder && !aMarker.bMalformed )
      .map(( aMarker ) => [ aMarker, minter.fsId( aMarker.sType )])
  );
  const vsLine = vaSpec.flatMap(( aSpec ) => {
    const vaEdit = fvaEditForSpec(
      aModel,
      aModel.vaMarker.filter(( aMarker ) => (
        aMarker.sPath === fsPosix( aSpec.sPath )
      )),
      aRoots,
      asIdNewForMarker
    );
    if( vaEdit.length > 0 ){
      reader.fWriteText( aSpec.sPath, fsTextEdited( aSpec.sText, vaEdit ));
    }
    return vaEdit
      .filter(( aEdit ) => aEdit.sIdNew !== undefined )
      .map(( aEdit ) => (
        fsPlace( aEdit.aMarker ) + "  " + aEdit.sIdNew + "  "
        + fsWords( aEdit.aMarker.sText ) + "\n"
      ))
      .concat( vaEdit.flatMap(( aEdit ) => aEdit.vsStamp ))
      .concat( vaEdit.flatMap(( aEdit ) => aEdit.vsRetype ));
  });
  fWrite( vsLine.join( "" ));
  return 0;
};

const fsProblemForType = ( sId, sType ) => (
  "spec-map: " + sId + " is a line of type " + fsTypeLine( sType ) + "\n"
);

const fzQuery = ( reader, vsArg, fWrite, fWriteErr ) => {
  const aModel = vsArg[ 0 ] === "--hash"
    ? faModel({ vaSpec: reader.fvaSpec(), vaTest: [] })
    : faModelForReader( reader, true );
  const vaMarker = aModel.avaMarkerForId.get( vsArg[ 1 ]) || [];
  if( vaMarker.length !== 1 ){
    fWriteErr( fsProblemForId( vsArg[ 1 ], vaMarker.length ));
    return 1;
  }
  if( vsArg[ 0 ] === "--candidates" && vaMarker[ 0 ].sType !== "s" ){
    fWriteErr( fsProblemForType( vsArg[ 1 ], vaMarker[ 0 ].sType ));
    return 1;
  }
  fWrite( afsQueryForFlag[ vsArg[ 0 ]]( aModel, vaMarker[ 0 ]));
  return 0;
};

const fvsLineGrouped = ( vaEntry, fvsLine ) => vaEntry.flatMap((
  aEntry, n
) => (
  n === 0 || vaEntry[ n - 1 ].sPath !== aEntry.sPath ? [ aEntry.sPath ] : []
).concat( fvsLine( aEntry )));

const fvsLineForCheck = ( aCheck ) => [
  "  " + aCheck.aMarker.nLine + "  " + fsIdShown( aCheck.aMarker ) + "  "
  + aCheck.sStatus + "  "
  + ( aCheck.aRecordLast === null ? "-" : aCheck.aRecordLast.sDate )
  + "  Do: " + aCheck.sDo + "  Look for: " + aCheck.sLook
];

const fsInteractive = ( aModel ) => {
  const vaCheck = aModel.aLines.vaCheck.map(( aCheck ) => ({
    ...aCheck, sPath: aCheck.aMarker.sPath
  }));
  return fvsLineGrouped( vaCheck, fvsLineForCheck )
    .concat([
      "Interactive checks: "
      + vaCheck.filter(( aCheck ) => aCheck.sStatus === "passed" ).length
      + " passed of " + vaCheck.length,
      fsSectionProblem( fvaProblemForChecks( vaCheck ))
    ])
    .join( "\n" ) + "\n";
};

const fsViaShown = ( aMarker ) => (
  aMarker.bViaPrompt ? " via=" + sViaPrompt : ""
);

const fbForAudience = ( aMarker, sFor ) => (
  ( aMarker.sFor || "" ).split( "," ).includes( sFor )
);

const fsGuidance = ( aModel, vsArg ) => fvsLineGrouped(
  fvaLineOfType( aModel, "g" ).filter(( aMarker ) => (
    vsArg.length < 3 || fbForAudience( aMarker, vsArg[ 2 ])
  )),
  ( aMarker ) => [
    "  " + aMarker.nLine + "  " + fsIdShown( aMarker ) + "  "
    + ( aMarker.sFor || "" ) + fsViaShown( aMarker ) + "  "
    + ( vsArg.length < 3 ? fsWords( aMarker.sText ) : aMarker.sText )
  ].concat( vsArg.length >= 3 ? [] : fvaFollowsNaming( aModel, aMarker ).map((
    aFollows
  ) => (
    "    " + fsPlace( aFollows ) + "  " + fsStateForFollows( aFollows )
  )))
).map(( sLine ) => sLine + "\n" ).join( "" );

const afsListForFlag = {
  "--cross-suite": fsCrossSuite,
  "--probes": fsProbes,
  "--interactive": fsInteractive,
  "--guidance": fsGuidance
};

const fzList = ( reader, vsArg, fWrite ) => {
  fWrite( afsListForFlag[ vsArg[ 0 ]](
    faModelForReader( reader, true ), vsArg, reader.aConfig
  ));
  return 0;
};

const fsDateToday = () => new Date().toISOString().slice( 0, 10 );

const faModelForRecord = ( reader ) => faModel({
  vaSpec: reader.fvaSpec(),
  vaTest: [],
  vaRecord: reader.fvaRecord(),
  fbExists: ( sPath ) => reader.fbExists( sPath ),
  aFiles: reader
});

const fsProblemForCheckId = ( aModel, sId ) => {
  const vaMarker = aModel.avaMarkerForId.get( sId ) || [];
  if( vaMarker.length !== 1 ){ return fsProblemForId( sId, vaMarker.length );}
  return vaMarker[ 0 ].sType === "i"
    ? null
    : fsProblemForType( sId, vaMarker[ 0 ].sType );
};

const fasHashForTargets = ( aMarker, hasher ) => Object.fromEntries(
  fvsTargetForMarker( aMarker ).map(( sTarget ) => [
    sTarget, hasher.fsHash( sTarget )
  ])
);

const faRecordFor = ( aMarker, hasher, sVerdict, sNote ) => ({
  sId: aMarker.sId,
  sHash: aMarker.sHash,
  sVerdict,
  sDate: fsDateToday(),
  sNote,
  asHashForTarget: fasHashForTargets( aMarker, hasher )
});

const fzRecord = ( reader, vsArg, fWriteErr ) => {
  const aModel = faModelForRecord( reader );
  const sProblem = fsProblemForCheckId( aModel, vsArg[ 1 ]);
  if( sProblem !== null ){
    fWriteErr( sProblem );
    return 1;
  }
  reader.fAppendRecord( faRecordFor(
    aModel.avaMarkerForId.get( vsArg[ 1 ])[ 0 ],
    aModel.aLines.hasher,
    asVerdictForFlag[ vsArg[ 0 ]],
    vsArg.length === 4 ? vsArg[ 3 ] : ""
  ));
  return 0;
};

const fbAnswerWell = ( aAnswer ) => (
  aAnswer !== null
  && typeof aAnswer === "object"
  && typeof aAnswer.sId === "string"
  && typeof aAnswer.sHash === "string"
  && aAnswer.asHashForTarget !== null
  && typeof aAnswer.asHashForTarget === "object"
  && !Array.isArray( aAnswer.asHashForTarget )
  && asKeyAnswer.has( aAnswer.sKey )
  && typeof aAnswer.sNote === "string"
);

const fvaAnswerForText = ( sText ) => {
  try{
    const vaAnswer = JSON.parse( sText );
    return Array.isArray( vaAnswer ) && vaAnswer.every( fbAnswerWell )
      ? vaAnswer
      : null;
  }
  catch( e ){
    return null;
  }
};

const fsProblemForAnswers = ( sPathArg, sText, aModel ) => {
  if( sText === null ){ return "spec-map: no file at " + sPathArg + "\n";}
  const vaAnswer = fvaAnswerForText( sText );
  if( vaAnswer === null ){
    return "spec-map: " + sPathArg + " is not a JSON array of answers\n";
  }
  return vaAnswer
    .map(( aAnswer ) => fsProblemForCheckId( aModel, aAnswer.sId ))
    .filter( Boolean )
    .join( "" ) || null;
};

const faRecordForAnswer = ( aAnswer ) => ({
  sId: aAnswer.sId,
  sHash: aAnswer.sHash,
  sVerdict: aAnswer.sKey,
  sDate: fsDateToday(),
  sNote: aAnswer.sNote,
  asHashForTarget: aAnswer.asHashForTarget
});

const fzAnswers = ( reader, sPathArg, fWrite, fWriteErr ) => {
  const sText = reader.fsTextAt( sPathArg );
  const aModel = faModelForRecord( reader );
  const sProblem = fsProblemForAnswers( sPathArg, sText, aModel );
  if( sProblem !== null ){
    fWriteErr( sProblem );
    return 1;
  }
  const vaAnswer = fvaAnswerForText( sText );
  vaAnswer.forEach(( aAnswer ) => (
    reader.fAppendRecord( faRecordForAnswer( aAnswer ))
  ));
  fWrite( vaAnswer
    .filter(( aAnswer ) => !fbRecordCurrent(
      aAnswer,
      aModel.avaMarkerForId.get( aAnswer.sId )[ 0 ],
      aModel.aLines.hasher
    ))
    .map(( aAnswer ) => (
      aAnswer.sId + "  answered at a text or code that has since changed, "
      + "so it stays stale\n"
    ))
    .join( "" ));
  return 0;
};

const fvaCheckRecordable = ( aModel ) => aModel.aLines.vaCheck.filter((
  aCheck
) => (
  aCheck.aMarker.sId !== null
  && aModel.avaMarkerForId.get( aCheck.aMarker.sId ).length === 1
));

const fsReasonForReset = ( aCheck ) => {
  if( aCheck.aRecordLast === null ){ return "new";}
  return aCheck.aRecordLast.sHash === aCheck.aMarker.sHash
    ? "code"
    : "reworded";
};

const fvaRecordReset = ( aModel ) => fvaCheckRecordable( aModel )
  .filter(( aCheck ) => (
    aCheck.sStatus === "stale" || aCheck.vaRecord.length === 0
  ))
  .map(( aCheck ) => ({
    ...faRecordFor( aCheck.aMarker, aModel.aLines.hasher, "reset", "" ),
    sReason: fsReasonForReset( aCheck )
  }));

const fnRecordResetLast = ( vaRecord ) => vaRecord.findLastIndex((
  aRecord
) => asVerdictReset.has( aRecord.sVerdict ));

const fsDateReset = ( aCheck ) => {
  const nReset = fnRecordResetLast( aCheck.vaRecord );
  return nReset < 0 ? "" : String( aCheck.vaRecord[ nReset ].sDate );
};

const fbTargetMeetsWork = ( sTarget, sWork ) => {
  const tFunction = ftFunctionForTarget( sTarget );
  if( tFunction !== null ){ return fsPathClean( tFunction[ 0 ]) === sWork;}
  const sPath = fsPathClean( sTarget );
  return (
    sPath === sWork
    || sPath.startsWith( sWork + "/" )
    || sWork.startsWith( sPath + "/" )
  );
};

const fbCheckInWork = ( aCheck, vsWork ) => (
  fvsTargetForMarker( aCheck.aMarker )
    .filter( fbCodeTarget )
    .some(( sTarget ) => vsWork.some(( sWork ) => (
      fbTargetMeetsWork( sTarget, sWork )
    )))
);

const fzCompareWorklist = ( aA, aB ) => (
  Number( aB.bWork ) - Number( aA.bWork )
  || aA.sDateReset.localeCompare( aB.sDateReset )
  || aA.sPath.localeCompare( aB.sPath )
  || aA.aMarker.nLine - aB.aMarker.nLine
);

const fvaCheckWorklist = ( aModel, vsWork ) => fvaCheckRecordable( aModel )
  .filter(( aCheck ) => (
    aCheck.sStatus === "unchecked" || aCheck.sStatus === "stale"
  ))
  .map(( aCheck ) => ({
    ...aCheck,
    bWork: fbCheckInWork( aCheck, vsWork ),
    sDateReset: fsDateReset( aCheck )
  }))
  .sort( fzCompareWorklist );

const fsHtmlEscaped = ( sText ) => String( sText ).replace(
  /[&<>"']/g, ( ch ) => asEntityForChar[ ch ]
);

const fsPlainForSpec = ( sText ) => {
  const vtSpan = fvtSpanForText( sText );
  const asnDelimiter = new Set( vtSpan.flatMap(( tSpan ) => [
    tSpan[ 0 ], tSpan[ 1 ]
  ]));
  let sPlain = "";
  for( let n = 0; n < sText.length; n++ ){
    if( asnDelimiter.has( n )){
      n += vtSpan.find(( tSpan ) => (
        tSpan[ 0 ] === n || tSpan[ 1 ] === n
      ))[ 2 ] - 1;
    }
    else{ sPlain += sText[ n ];}
  }
  return sPlain.split( "**" ).join( "" );
};

const fsWhyForCheck = ( aCheck ) => {
  const nReset = fnRecordResetLast( aCheck.vaRecord );
  const aReset = nReset < 0 ? null : aCheck.vaRecord[ nReset ];
  if( aReset === null || aReset.sVerdict !== "reset" ){ return "";}
  const aPass = aCheck.vaRecord.slice( 0, nReset )
    .filter(( aRecord ) => aRecord.sVerdict === "pass" )
    .pop();
  const sWhy = asWhyForReason[ aReset.sReason ];
  return aPass === undefined || sWhy === undefined
    ? ""
    : sWhy + aPass.sDate + ".";
};

const fsOptionHtml = ( sId, sKey, sHtml ) => (
  "<label class=\"opt\"><input type=\"radio\" name=\"" + sId + "\" value=\""
  + sKey + "\"><span>" + sHtml + "</span></label>"
);

const fsCardHtml = ( aCheck, n, c ) => {
  const sId = aCheck.aMarker.sId;
  const sWhy = fsWhyForCheck( aCheck );
  const sLook = fsHtmlEscaped( fsPlainForSpec( aCheck.sLook ));
  return [
    "<section class=\"q\" data-id=\"" + sId + "\">",
    "<div class=\"num\">CHECK " + ( n + 1 ) + " OF " + c + " · "
      + fsHtmlEscaped( fsPlace( aCheck.aMarker )) + " · " + sId + "</div>",
    sWhy === "" ? "" : "<p class=\"why\">" + fsHtmlEscaped( sWhy ) + "</p>",
    "<p><b>Do:</b> <span class=\"do\">"
      + fsHtmlEscaped( fsPlainForSpec( aCheck.sDo )) + "</span></p>",
    "<p><b>Look for:</b> <span class=\"look\">" + sLook + "</span></p>",
    "<div class=\"opts\">",
    fsOptionHtml( sId, "pass", "Pass — " + sLook ),
    fsOptionHtml( sId, "fail", "Fail" ),
    fsOptionHtml( sId, "unable", "Couldn&#39;t check" ),
    "</div>",
    "<textarea placeholder=\"Note (optional)\"></textarea>",
    "<div class=\"status\"></div>",
    "</section>"
  ].filter( Boolean ).join( "\n" );
};

const reCharScriptUnsafe = new RegExp(
  "[<" + String.fromCharCode( 0x2028, 0x2029 ) + "]", "g"
);

const fsJsonForScript = ( x ) => JSON.stringify( x ).replace(
  reCharScriptUnsafe,
  ( ch ) => "\\u" + ch.charCodeAt( 0 ).toString( 16 ).padStart( 4, "0" )
);


const fsPageForChecks = ( sTemplate, sName, vaCheck, hasher ) => {
  const sCards = vaCheck.length === 0
    ? "<p class=\"empty\">Nothing to check.</p>"
    : vaCheck.map(( aCheck, n ) => (
      fsCardHtml( aCheck, n, vaCheck.length )
    )).join( "\n" );
  const sData = fsJsonForScript( vaCheck.map(( aCheck ) => ({
    sId: aCheck.aMarker.sId,
    sHash: aCheck.aMarker.sHash,
    asHashForTarget: fasHashForTargets( aCheck.aMarker, hasher )
  })));
  return sTemplate.split( "__NAME__" ).join( fsHtmlEscaped( sName ))
    .split( "__CARDS__" ).join( sCards )
    .split( "__DATA__" ).join( sData );
};

const fvsWorkForText = ( sText ) => sText.split( "\n" )
  .map(( sLine ) => sLine.trim())
  .filter( Boolean )
  .map( fsPathClean );

const fzWorklist = ( reader, vsArg, fWrite, fWriteErr ) => {
  const sPathWork = vsArg.length === 4 ? vsArg[ 3 ] : null;
  const sTextWork = sPathWork === null ? "" : reader.fsTextAt( sPathWork );
  if( sTextWork === null ){
    fWriteErr( "spec-map: no file at " + sPathWork + "\n" );
    return 1;
  }
  fvaRecordReset( faModelForRecord( reader )).forEach(( aRecord ) => (
    reader.fAppendRecord( aRecord )
  ));
  const aModel = faModelForRecord( reader );
  const vaCheck = fvaCheckWorklist( aModel, fvsWorkForText( sTextWork ));
  reader.fWriteAt( vsArg[ 1 ], fsPageForChecks(
    fs.readFileSync( sPathPageTemplate, "utf8" ),
    reader.aConfig.sName,
    vaCheck,
    aModel.aLines.hasher
  ));
  fWrite(
    "Worklist: " + vaCheck.length + " checks written to " + vsArg[ 1 ] + "\n"
  );
  return 0;
};

const fzCompareMarkerPlace = ( aA, aB ) => (
  Number( aA.sPath > aB.sPath ) - Number( aA.sPath < aB.sPath )
  || aA.nLine - aB.nLine
  || aA.nOffset - aB.nOffset
);

const fzHashes = ( reader, fWrite ) => {
  const aModel = faModel({ vaSpec: reader.fvaSpec(), vaTest: [] });
  fWrite( aModel.vaMarker
    .filter(( aMarker ) => (
      aMarker.sId !== null
      && ( aModel.avaMarkerForId.get( aMarker.sId ) || []).length === 1
    ))
    .sort( fzCompareMarkerPlace )
    .map(( aMarker ) => (
      aMarker.sId + " " + aMarker.sHash + " " + aMarker.sPath + "\n"
    ))
    .join( "" ));
  return 0;
};

const fzArch = ( reader, fWrite ) => {
  const aModel = faModel({ vaSpec: reader.fvaSpec(), vaTest: [] });
  fWrite( fsSectionArch( faRoots( aModel, new Set()).vaArch ) + "\n" );
  return 0;
};

const fzReport = ( reader, sArg, fWrite ) => {
  const sDirRoot = reader.sDirRoot;
  const sPathSpec = sArg === undefined
    ? undefined
    : fsPosix( path.relative( sDirRoot, path.resolve( sDirRoot, sArg )));
  const vaSpec = reader.fvaSpec();
  if( sPathSpec !== undefined
    && !vaSpec.some(( aSpec ) => fsPosix( aSpec.sPath ) === sPathSpec )
  ){
    fWrite( "spec-map: no spec at " + sArg + "\n" );
    return 2;
  }
  const aMap = faMap({
    vaSpec,
    vaTest: reader.fvaTest(),
    vaCiter: reader.fvaCiter(),
    vaRecord: reader.fvaRecord(),
    fbExists: ( sPath ) => reader.fbExists( sPath ),
    aFiles: reader,
    sPathSpec
  });
  fWrite( fsReport( aMap ));
  return sPathSpec === undefined || fbClean( aMap ) ? 0 : 1;
};

const sUsage = (
  "usage: spec-map [<spec path>] | --hash <id> | --sid <id> "
  + "| --candidates <id> | --root <id> | --cross-suite | --probes "
  + "| --interactive | --guidance [--for <label>] | --pass <id> [--note <text>] "
  + "| --fail <id> [--note <text>] | --unable <id> [--note <text>] "
  + "| --reopen <id> | --answers <file> | --worklist <path> [--work <file>] "
  + "| --hashes | --assign\n"
);

const fbArgsValid = ( vsArg ) => {
  const sFlag = vsArg[ 0 ] || "";
  if( Object.hasOwn( afsQueryForFlag, sFlag )){ return vsArg.length <= 2;}
  if( Object.hasOwn( asVerdictForFlag, sFlag )){
    return vsArg.length === 2 || (
      vsArg.length === 4 && vsArg[ 2 ] === "--note" && asFlagNote.has( sFlag )
    );
  }
  if( sFlag === "--guidance" ){
    return vsArg.length === 1 || (
      vsArg.length === 3 && vsArg[ 1 ] === "--for" && vsArg[ 2 ] !== ""
    );
  }
  if( sFlag === "--answers" ){ return vsArg.length === 2;}
  if( sFlag === "--worklist" ){
    return vsArg.length === 2
      || ( vsArg.length === 4 && vsArg[ 2 ] === "--work" );
  }
  return vsArg.length <= 1;
};

const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr ) => {
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  if( aRead.sProblem !== null ){
    ( fWriteErr || fWrite )( "spec-map: " + aRead.sProblem + "\n" );
    return 2;
  }
  if( !fbArgsValid( vsArg )){
    ( fWriteErr || fWrite )( sUsage );
    return 2;
  }
  const reader = new TreeReader( sDirRoot, aRead.aConfig );
  if( vsArg[ 0 ] === "--assign" ){ return fzAssign( reader, fWrite );}
  if( vsArg[ 0 ] === "--hashes" ){ return fzHashes( reader, fWrite );}
  if( Object.hasOwn( asVerdictForFlag, vsArg[ 0 ])){
    return fzRecord( reader, vsArg, fWriteErr || fWrite );
  }
  if( vsArg[ 0 ] === "--answers" ){
    return fzAnswers( reader, vsArg[ 1 ], fWrite, fWriteErr || fWrite );
  }
  if( vsArg[ 0 ] === "--worklist" ){
    return fzWorklist( reader, vsArg, fWrite, fWriteErr || fWrite );
  }
  if( Object.hasOwn( afsListForFlag, vsArg[ 0 ] || "" )){
    return fzList( reader, vsArg, fWrite );
  }
  if( vsArg[ 0 ] === "--root" && vsArg[ 1 ] === sArch ){
    return fzArch( reader, fWrite );
  }
  if( Object.hasOwn( afsQueryForFlag, vsArg[ 0 ] || "" )){
    return fzQuery( reader, vsArg, fWrite, fWriteErr || fWrite );
  }
  return fzReport( reader, vsArg[ 0 ], fWrite );
};

module.exports = {
  faMap,
  fsReport,
  fzMain,
  faModel,
  faRoots,
  fasIdProved,
  fsNormal,
  fsHashForText,
  fsWords,
  fvnLineStart,
  fnLineAt,
  TreeReader
};
