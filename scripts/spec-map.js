// @implements s-5i9gec@d5e5ed3
// @implements s-4jegoj@05acd9f
// @implements s-zrgt7e@a066ef0
// @implements s-u1vl7x@393921b
// @implements s-l9g0ah@33e01a9
// @implements s-nktt4y@2747a61
// @implements s-p54hx2@dfa5570
// @implements s-akhzjv@81fd58b
// @tested-by test/spec-map.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const crypto = require( "crypto" );
const babelParser = require( "@babel/parser" );
const { ParseCache } = require( "./spec-map-cache.js" );
const { faOverlay } = require( "./concord-overlay.js" );
const {
  faReaders, asLanguageName, faProgramForPath, ftMaskRust, fnRustBlockEnd
} = require( "./languages" );

const fsFingerprintParser = ( aConfig ) => crypto.createHash( "sha256" )
  .update( process.version )
  .update( JSON.stringify( aConfig ))
  .update( fs.readFileSync( __filename ))
  .update( asLanguageName.map(( sLanguage ) => fs.readFileSync(
    require.resolve( "./languages/" + sLanguage )
  )).join( "\n" ))
  .update( fs.readFileSync( require.resolve( "./spec-map-cache.js" )))
  .update( fs.readFileSync( require.resolve( "./spec-map-observations.js" )))
  .update( fs.readFileSync( require.resolve( "@babel/parser" )))
  .digest( "hex" );
const {
  sFileConfig, ConfigReader, fnPrefixMatched
} = require( "./concord-config.js" );
const {
  faObservations, faSidObservation, faAssignObservations
} = require( "./spec-map-observations.js" );

const reHeading = /^(#{1,6})\s/;
// @implements s-5un01z@b74caaa
const reOwnerText = /^\s*@spec/;
const reOwnerLine = /^\s*\/\/ @spec +(\S+\.md)\s*$/;
// @implements s-eawgvu@a59ff64
// @implements s-5un01z@b74caaa
const reLinkText = /^\s*@proves/;
const reLinkLine = new RegExp(
  "^\\s*// @proves +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\\s*$"
);
const reLinkLoose = /@proves\s+([a-z]-[a-z0-9]*)@?(\S*)/;
const reLinkPart = /^(\s*\/\/ @(?:proves|guards) +)(\S+?)\s+part=(\S*)/;
const sReasonPartLink = (
  "part link: --split-parts splits it into derived statements"
);
const sReasonPartList = (
  "part list: --split-parts splits it into derived statements"
);
// @implements s-9eix2j@0585aaf
// @implements s-4o88k8@e467b6b
// @implements s-5un01z@b74caaa
const reGuardText = /^\s*@guards/;
const reGuardLine = new RegExp(
  "^\\s*// @guards +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\\s*$"
);
const reGuardLoose = /@guards\s+([a-z]-[a-z0-9]*)@?(\S*)/;
// @implements s-eawgvu@a59ff64
// @implements s-5un01z@b74caaa
const aFormLink = {
  reText: reLinkText, reLine: reLinkLine, reLoose: reLinkLoose, bGuard: false
};
// @implements s-4o88k8@e467b6b
// @implements s-5un01z@b74caaa
const aFormGuard = {
  reText: reGuardText, reLine: reGuardLine, reLoose: reGuardLoose, bGuard: true
};
// @implements s-5un01z@b74caaa
const reFollowsText = /^\s*@follows/;
const reFollowsLine = new RegExp(
  "^\\s*// @follows +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\\s*$"
);
const reFollowsBlock = new RegExp(
  "^\\s*/\\* *@follows +([a-z]-[a-z0-9]{6})@([0-9a-f]{7}) *\\*/\\s*$"
);
const reFollowsLoose = /@follows\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/;
// @implements s-5un01z@b74caaa
const reImplementsText = /^\s*@implements/;
const reImplementsLine = /^\s*\/\/ @implements +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\s*$/;
const reImplementsLoose = /@implements\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/;
// @implements s-5un01z@b74caaa
const reTestedByText = /^\s*@tested-by/;
const reTestedByLine = /^\s*\/\/ @tested-by +(\S+)\s*$/;
const reTestedByBlock = /^\s*\/\* *@tested-by +(\S+) *\*\/\s*$/;
const reTestedByLoose = /@tested-by\s+(\S+)/;
// @implements s-bqioq5@e78161a
// @implements s-5un01z@b74caaa
const reChecksText = /^\s*@checks/;
const reChecksLine = /^\s*\/\/ @checks +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\s*$/;
const reChecksBlock = /^\s*\/\* *@checks +([a-z]-[a-z0-9]{6})@([0-9a-f]{7}) *\*\/\s*$/;
const reChecksLoose = /@checks\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/;
const aFormImplements = {
  reText: reImplementsText,
  reLine: reImplementsLine,
  reLoose: reImplementsLoose,
  bGuard: false
};
const vtKindMisplacedInTest = [
  [ "tested-by", reTestedByText, reTestedByLoose ],
  [ "checks", reChecksText, reChecksLoose ]
];
const reNever = /(?!)/;
const reFileJsx = /\.(?:jsx|tsx)$/;
const reRunLine = /^\s*\/\/\s*@(?:spec|proves|guards|implements)/;
const reSpacePlus = /\s*\+\s*/y;
const reSpace = /\s*/y;
const reMarkerOpen = /\{#[a-z]-/g;
// @implements s-w2zn7d@ea7e5d0
// @implements s-eab7vh@300a074
// @implements s-l2muht@e9fb34f
// @implements s-s0x8ie@f630543
// @implements s-ptc52y@20ab416
const reMarkerToken = new RegExp(
  "\\{#([a-z]-[^}\\s{]*)"
  + "(?: <((?:(?! >| parts=| surface=| via=| for=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: >((?:(?! parts=| surface=| via=| for=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: parts=((?:(?! surface=| via=| for=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: surface=((?:(?! via=| for=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: via=((?:(?! via=| for=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: for=((?:(?! via=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "(?: via=((?:(?! via=| probe(?: |\\})| not-yet-implemented\\})[^}{\\n])*))?"
  + "( probe(?= not-yet-implemented\\}|\\}))?"
  + "( not-yet-implemented(?=\\}))?(\\})?",
  "y"
);
const rePartLabel = /^[a-z0-9-]+$/;
const cPartMin = 2;
const reInclusionOpen = /\{[a-z]-/g;
const reInclusionToken = /\{([a-z]-[^}\s{]*)(\})?/y;
const reInclusionId = /^[a-z]-(?:[a-z0-9]{6}|\?[a-z0-9]+)$/;
const reIdPartWell = /^([a-z])-(?:([a-z0-9]{6})|\?([a-z0-9]*))$/;
// @implements s-v20yz5@b63123d
const reRefId = /^([a-z]-[a-z0-9]{6})(?:@([0-9a-f]{7}))?$/;
// @implements s-wakfil@7deeb77
// @implements s-v20yz5@b63123d
const reRefLabel = /^([a-z])-\?([a-z0-9]+)$/;
const sArch = "arch";
const reBodyAny = /[a-z]-([a-z0-9]{6})/g;
// @implements s-fc5ccj@7849554
const sTypeLine = "spdmig";
const sTypeRoot = "sm";
const sTypeTargeted = "p";
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
  "^([\\w.@/-]+\\.md)#([\\p{L}\\p{N}]+(?:-[\\p{L}\\p{N}]+)*)$", "u"
);
const reTargetCollection = /^(?:[\w.@-]+\/)*\*\/specs?\/$/;
const reTargetPath = new RegExp(
  "^(?!/)(?!(?:.*/)?\\.\\.(?:/|$))[\\w.@-]+(?:/[\\w.@-]+)*/?$"
);
const reFileCode = /\.(?:js|mjs|cjs|jsx|ts|tsx)$/;
const reCharWord = /[\p{L}\p{N}_$]/u;
const reCharSpace = /\s/;
const reSlashEnd = /\/+$/;
const sDirSpecs = "specs";
const sPathPageTemplate = path.join( __dirname, "worklist-page.html" );
const asVerdictForFlag = {
  "--pass": "pass", "--fail": "fail", "--unable": "unable", "--reopen": "reopen"
};
const asFlagNote = new Set([ "--pass", "--fail", "--unable" ]);
// @implements s-yu6zet@bb44414
const asVerdictReset = new Set([ "reset", "reopen", "unable" ]);
const asKeyAnswer = new Set([ "pass", "fail", "unable" ]);
const asEntityForChar = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
};
// @implements s-g8h2jz@c4623dc
const asWhyForReason = {
  reworded: "Reworded since its pass on ",
  code: "The code it checks changed since its pass on "
};
const sTitleNoCode = "interactive checks with no implementation link";
const sTitleProblem = "interactive checks with an open problem";
const reSlugGap = /[^\p{L}\p{N}]+/gu;
const reSlugEdge = /^-+|-+$/g;
// @implements s-fgmj0s@836cdf0
const reTermBold = /^\*\*(.*?)\*\*/;
const reTermEnd = /[.:]$/;
const reMeaningLead = /^[\s\p{P}]+/u;
const reEscape = /[.*+?^${}()|[\]\\]/g;
const sLabelDo = "**Do:**";
const sLabelLook = "**Look for:**";
// @implements s-jmslkk@be3cc50
const reRuling = /RULING \((?:CEO|architect)\)/g;
const reRulingWhole = /^RULING \((?:CEO|architect)\)$/;
const reRulingLead = /^[*\s]*/;
const sRulingArch = "RULING (architect)";
const sTitleRuling = "rulings outside motives";
const sViaPrompt = "prompt";
const reArticleLead = /^(?:the|an|a)\s+/i;
// @implements s-w2msh4@29d36fe
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

// @implements s-3bftr3@3529be7
// @implements s-qln1ta@564522c
const fsNormal = ( sText ) => sText.replace( /\s+/g, " " ).trim();

// @implements s-rapf8f@dd2cbd3
// @implements s-g8r0ur@f2d68ec
// @implements s-qln1ta@564522c
const fsHashForText = ( sText ) => (
  crypto.createHash( "sha1" ).update( sText, "utf8" ).digest( "hex" )
    .slice( 0, 7 )
);

const fsHashForBytes = ( yBytes ) => (
  crypto.createHash( "sha1" ).update( yBytes ).digest( "hex" ).slice( 0, 7 )
);

const fsWords = ( sText ) => (
  sText.split( " " ).slice( 0, cWordOpening ).join( " " )
);

// @implements s-jg7ill@f9c0b61
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

// @implements s-b1flmr@52ccc3c
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

// @implements s-pwxuov@536babd
// @implements s-ytmdql@7d7407c
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

// @implements s-jg7ill@f9c0b61
// @implements s-pwxuov@536babd
// @implements s-ilmml1@de70889
// @implements s-ytmdql@7d7407c
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

// @implements s-ilmml1@de70889
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

// @implements s-ilmml1@de70889
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

// @implements s-ytmdql@7d7407c
// @implements s-mm67bx@fb5e980
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

// @implements s-8yzzoh@8f6ed41
// @implements s-gry2es@de73667
// @implements s-i63o6a@6dbc87e
const fvnMarkerForText = ( sText ) => {
  const vtSpan = fvtSpanForText( sText );
  return Array.from( sText.matchAll( reMarkerOpen ), ( vs ) => vs.index )
    .filter(( n ) => !fbInSpan( vtSpan, n ));
};

const fsGroup = ( vsGroup, n ) => (
  vsGroup[ n ] === undefined ? null : vsGroup[ n ]
);

// @implements s-eab7vh@300a074
// @implements s-7llevg@6c2799e
// @implements s-41v1mp@51d6eb2
// @implements s-fc5ccj@7849554
// @implements s-8yzzoh@8f6ed41
// @implements s-n10cb0@01b16a4
// @implements s-m176ue@c40015e
// @implements s-7h4j0s@512c0f5
// @implements s-y1fknl@991055d
// @implements s-w2zn7d@ea7e5d0
// @implements s-k4mfcb@f02be14
// @implements s-gry2es@de73667
// @implements s-ar1i87@b6009f5
// @implements s-6dpng1@58d403a
// @implements s-m3nvmc@4ea2a37
// @implements s-s0vyhy@802fc2f
// @implements s-y462l3@3b6cea9
// @implements s-n1ztut@75bf716
// @implements s-l2muht@e9fb34f
// @implements s-s0x8ie@f630543
// @implements s-ptc52y@20ab416
// @implements s-vwf1wr@af28dcd
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
    sSurface: fsGroup( vsGroup, 5 ),
    sFor: fsGroup( vsGroup, 7 ),
    sVia: fsGroup( vsGroup, 6 ) === null
      ? fsGroup( vsGroup, 8 )
      : fsGroup( vsGroup, 6 ),
    bViaEarly: vsGroup[ 6 ] !== undefined,
    bProbe: vsGroup[ 9 ] !== undefined,
    bNotImplemented: vsGroup[ 10 ] !== undefined,
    bClosed: vsGroup[ 11 ] !== undefined,
    bWell: vsWell !== null && sTypeLine.includes( vsGroup[ 1 ][ 0 ]),
    sBody: vsWell === null ? null : fsGroup( vsWell, 2 ),
    sLabel: vsWell === null ? null : fsGroup( vsWell, 3 )
  };
};

// @implements s-fc5ccj@7849554
const fsTypeLine = ( sType ) => (
  ( asNameForType[ sType ] || "unknown" ) + " (" + sType + ")"
);

const fsOnType = ( sWhat, sType ) => (
  sWhat + " on a line of type " + fsTypeLine( sType )
);

// @implements s-en1xk7@b19ecef
// @implements s-dhs2hx@db209fb
const fsKindForTarget = ( sTarget ) => {
  if( reTargetId.test( sTarget )){ return "id";}
  if( reTargetSlug.test( sTarget )){ return "slug";}
  if( reTargetCollection.test( sTarget )){ return "collection";}
  return reTargetPath.test( sTarget ) ? "path" : null;
};

const fsPathClean = ( sPath ) => (
  fsPosix( path.normalize( sPath )).replace( reSlashEnd, "" )
);

const fbCodeTarget = ( sTarget, sPathSpecs = sDirSpecs ) => {
  const sKind = fsKindForTarget( sTarget );
  if( sKind !== "path" ){ return false;}
  const sPath = fsPathClean( sTarget );
  return sPath !== sPathSpecs && !sPath.startsWith( sPathSpecs + "/" );
};

// @implements s-7h4j0s@512c0f5
const fvsTargetForMarker = ( aMarker ) => (
  aMarker.sTargets === null ? [] : aMarker.sTargets.split( "," )
);

// @implements s-en1xk7@b19ecef
// @implements s-dhs2hx@db209fb
// @implements s-7h4j0s@512c0f5
// @tested-by test/spec-map-source.test.js#tu-fb961fd9
const fsReasonForTargetForm = ( sTarget ) => {
  if( sTarget === "" ){ return "empty target";}
  return fsKindForTarget( sTarget ) === null
    ? "target " + sTarget + " in no known form"
    : null;
};

// @implements s-7h4j0s@512c0f5
// @implements s-w75973@e58d191
// @implements s-vjgnay@5c0f583
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

// @implements s-johg6m@f4b11b4
const fsReasonForAudienceLabels = ( vsLabel ) => {
  if( vsLabel.includes( "" )){ return "audience list holds an empty label";}
  if( !vsLabel.every(( sLabel ) => rePartLabel.test( sLabel ))){
    return "audience list holds a label in another form";
  }
  return new Set( vsLabel ).size < vsLabel.length
    ? "audience list names a label twice"
    : null;
};

// @implements s-johg6m@f4b11b4
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

// @implements s-5ljuu2@60dd002
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

// @implements s-k4mfcb@f02be14
const fbViaPrompt = ( aToken ) => (
  aToken.sVia !== null && fsReasonForVia( aToken ) === null
);

// @implements s-s0x8ie@f630543
// @implements s-ni7ark@e934261
// @implements s-xo5d9n@08c26fd
const fsReasonForSurface = ( aToken, cInclusion ) => {
  if( aToken.sSurface === null ){ return null;}
  if( aToken.sType !== "s" ){ return fsOnType( "surface flag", aToken.sType );}
  if( aToken.sSurface === "" ){ return "surface flag with an empty label";}
  if( aToken.sSurface.includes( "," )){
    return "surface flag with more than one label";
  }
  if( !rePartLabel.test( aToken.sSurface )){
    return "surface flag with a label in another form";
  }
  return cInclusion === 0
    ? "surface flag on a statement with no inclusion"
    : null;
};

// @implements s-7llevg@6c2799e
// @implements s-johg6m@f4b11b4
// @implements s-6dpng1@58d403a
// @implements s-ni7ark@e934261
// @implements s-xo5d9n@08c26fd
// @implements s-4qpk97@7e4bb82
const fvsReasonForAttr = ( aToken, cInclusion ) => [
  aToken.sParts === null ? null : sReasonPartList,
  fsReasonForSurface( aToken, cInclusion ),
  aToken.sType !== "s" && aToken.bProbe
    ? fsOnType( "probe flag", aToken.sType )
    : null,
  aToken.sType !== "s" && aToken.bNotImplemented
    ? fsOnType( "not-yet-implemented flag", aToken.sType )
    : null,
  aToken.bNotImplemented && /^s-\?/.test( aToken.sIdPart )
    ? "not-yet-implemented flag on a placeholder"
    : null,
  fsReasonForVia( aToken )
].filter( Boolean ).concat(
  fvsReasonForTargets( aToken ),
  fvsReasonForAudience( aToken )
);

// @implements s-7llevg@6c2799e
// @implements s-w75973@e58d191
// @implements s-gry2es@de73667
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

const fvsPartForMarker = ( aMarker ) => {
  if( aMarker.sParts === null || aMarker.sType !== "s" ){ return null;}
  const vsPart = aMarker.sParts.split( "," );
  return fsReasonForParts( vsPart ) === null ? vsPart : null;
};

const faSegAt = ( vaSeg, nPos ) => (
  vaSeg.filter(( aSeg ) => aSeg.nStart <= nPos ).pop()
);

const fnOffsetAt = ( aCtx, aBlock, nPos ) => {
  const aSeg = faSegAt( aBlock.vaSeg, nPos );
  return aCtx.vnLineStart[ aSeg.nLine ] + aSeg.nCol + nPos - aSeg.nStart;
};

// @implements s-bbaxpr@4e51c3f
// @implements s-ixasv4@f731c6a
// @implements s-lqyq1i@946e8b2
// @implements s-ickx1f@508799a
const faInclusionAt = ( aCtx, aBlock, nPos, nStart ) => {
  reInclusionToken.lastIndex = nPos;
  const vsGroup = reInclusionToken.exec( aBlock.sText );
  return {
    sWritten: vsGroup[ 0 ],
    aRef: vsGroup[ 2 ] !== undefined && reInclusionId.test( vsGroup[ 1 ])
      ? faRefParsed( vsGroup[ 1 ])
      : null,
    sPath: aCtx.sPath,
    nLine: faSegAt( aBlock.vaSeg, nPos ).nLine + 1,
    nOffset: fnOffsetAt( aCtx, aBlock, nPos ),
    nRel: nPos - nStart
  };
};

// @implements s-yallh6@309b54b
// @implements s-ixasv4@f731c6a
// @implements s-8ej89k@ad53a57
// @implements s-lqyq1i@946e8b2
const fvaInclusionForText = ( aCtx, aBlock, nStart, nEnd ) => {
  const vtSpan = fvtSpanForText( aBlock.sText );
  return Array.from(
    aBlock.sText.slice( 0, nEnd ).matchAll( reInclusionOpen ),
    ( vs ) => vs.index
  )
    .filter(( nPos ) => nPos >= nStart && !fbInSpan( vtSpan, nPos ))
    .map(( nPos ) => faInclusionAt( aCtx, aBlock, nPos, nStart ));
};

// @implements s-eab7vh@300a074
// @implements s-7llevg@6c2799e
// @implements s-41v1mp@51d6eb2
// @implements s-m176ue@c40015e
// @implements s-yyli5x@c1ccada
// @implements s-k4mfcb@f02be14
// @implements s-gry2es@de73667
// @implements s-ar1i87@b6009f5
// @implements s-ilmml1@de70889
// @implements s-6dpng1@58d403a
// @implements s-m3nvmc@4ea2a37
// @implements s-yallh6@309b54b
// @implements s-s0vyhy@802fc2f
// @implements s-y462l3@3b6cea9
// @implements s-ni7ark@e934261
// @implements s-xo5d9n@08c26fd
// @implements s-ixasv4@f731c6a
// @implements s-r1opde@e6a3bd1
// @implements s-8ej89k@ad53a57
// @implements s-vwf1wr@af28dcd
const faMarkerAt = ( aCtx, aBlock, vnMarker, nMarker ) => {
  const nPos = vnMarker[ nMarker ];
  const aToken = faTokenAt( aBlock.sText, nPos );
  const nEnd = nMarker + 1 < vnMarker.length
    ? vnMarker[ nMarker + 1 ]
    : aBlock.sText.length;
  const nStart = nPos + aToken.sToken.length;
  const sTextRaw = aBlock.sText.slice( nStart, nEnd );
  const sText = fsNormal( sTextRaw );
  const bPlaceholder = aToken.bWell && aToken.sLabel !== null;
  const aSeg = faSegAt( aBlock.vaSeg, nPos );
  const vaInclusion = aToken.sType === "s"
    ? fvaInclusionForText( aCtx, aBlock, nStart, nEnd )
    : [];
  const sReasonMalformed = fsReasonMalformed( aToken, aBlock, sText );
  return {
    ...aToken,
    sPath: aCtx.sPath,
    nLine: aSeg.nLine + 1,
    nOffset: fnOffsetAt( aCtx, aBlock, nPos ),
    nBlock: aBlock.nBlock,
    nPosBlock: nPos,
    nEndBlock: nEnd,
    sId: aToken.bWell && !bPlaceholder ? aToken.sIdPart : null,
    bPlaceholder: bPlaceholder && aToken.bClosed,
    bMalformed: sReasonMalformed !== null,
    sReasonMalformed,
    vsReasonAttr: fvsReasonForAttr( aToken, vaInclusion.length ),
    bViaPrompt: fbViaPrompt( aToken ),
    sTextRaw,
    vaInclusion,
    sText,
    sTextIncluded: sText,
    sHash: fsHashForText( sText )
  };
};

// @implements s-eab7vh@300a074
// @implements s-8yzzoh@8f6ed41
// @implements s-ilmml1@de70889
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

// @implements s-tv24sx@df2c2d6
const fbCompleteForLines = ( vsLine ) => {
  const nTitle = vsLine.findIndex(( sLine ) => reTitle.test( sLine ));
  if( nTitle < 0 ){ return false;}
  const sNext = vsLine.slice( nTitle + 1 )
    .find(( sLine ) => sLine.trim() !== "" );
  return sNext !== undefined && sNext.trimEnd() === sLineComplete;
};

// @implements s-b1flmr@52ccc3c
// @implements s-tv24sx@df2c2d6
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

// @implements s-tv24sx@df2c2d6
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

// @implements s-du4nns@bbb6351
// @implements s-vcpu9h@6d6ac07
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

// @implements s-en1xk7@b19ecef
const fsSlugForHeading = ( sLine ) => (
  sLine.replace( reHeading, "" ).toLowerCase()
    .replace( reSlugGap, "-" )
    .replace( reSlugEdge, "" )
);

// @implements s-tv24sx@df2c2d6
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

// @implements s-k9c32y@39fbb4e
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

// @implements s-k9c32y@39fbb4e
const fnAfterTable = ( sText, nOpen ) => (
  sText[ nOpen ] === "`"
    ? fnAfterTemplate( sText, nOpen )
    : fnAfterGroup( sText, nOpen )
);

const fnAfterSticky = ( re, sText, n ) => {
  re.lastIndex = n;
  return re.test( sText ) ? re.lastIndex : -1;
};

// @implements s-cwbb50@b1fa155
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

// @implements s-dpoj4a@064704f
// @implements s-ns2gme@9b9beb2
// @implements s-cwbb50@b1fa155
// @tested-by test/spec-map-source.test.js#tu-eb85af8d
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

// @implements s-m7xrlq@a850adb
// @implements s-4o88k8@e467b6b
// @implements s-rv4wbq@86ed5ff
const ftMaskForPath = ( sText, sPath ) => {
  const aLanguage = faLanguageForPath( sPath, sText );
  if( aLanguage === null ){ return [ sText, new Set() ];}
  const aSource = aLanguage.faSource( sText, sPath );
  return [ aSource.sMasked, aSource.asnComment ];
};

const fbSpaceJsx = ( sText, vsClass, n ) => (
  vsClass[ n ] === "j" && reCharSpace.test( sText[ n ])
);

const fsCodeNormal = ( sText, vsClass ) => {
  let sOut = "";
  let bGap = false;
  for( let n = 0; n < sText.length; n++ ){
    const ch = sText[ n ];
    if( vsClass[ n ] === "m" ){ continue;}
    if( fbSpaceJsx( sText, vsClass, n )){
      if( !fbSpaceJsx( sText, vsClass, n - 1 )){ sOut += " ";}
      bGap = false;
      continue;
    }
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

// @implements s-g8r0ur@f2d68ec
// @implements s-zcb6gq@fdaa5bb
// @implements s-3bftr3@3529be7
// @implements s-wp3dpp@040ef82
// @implements s-me9dys@227966a
// @implements s-1a9ecj@2117295
// @tested-by test/spec-map-source.test.js#tu-f842494d
// @tested-by test/spec-map-source.test.js#tu-e9a41563
// @tested-by test/spec-map-source.test.js#tu-f8606bd9
// @tested-by test/spec-map-source.test.js#tu-6ccc2603
const fsNormalForFile = ( sPath, sText ) => {
  const aLanguage = faLanguageForPath( sPath, sText );
  return aLanguage === null ? fsNormal( sText )
    : aLanguage.fsNormal( sPath, sText );
};

const fvsClassForFile = ( sPath, sText ) => {
  const aLanguage = faLanguageForPath( sPath, sText );
  return aLanguage === null ? new Array( sText.length ).fill( "c" )
    : aLanguage.fvsClass( sPath, sText );
};

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

// @implements s-k9c32y@39fbb4e
const fnOpenForCall = ( sMasked, vsGroup ) => {
  const nAfterCall = vsGroup.index + vsGroup[ 0 ].length;
  const nArg = vsGroup[ 2 ] === undefined
    ? nAfterCall
    : fnAfterTable( sMasked, fnAfterSticky( reSpace, sMasked, nAfterCall ));
  return fnAfterSticky( reSpace, sMasked, nArg );
};

// @implements s-62b8ec@2fda7eb
// @implements s-8xr9d5@2d59ba6
// @implements s-ns2gme@9b9beb2
// @implements s-0nmcwv@fcc34b4
// @implements s-cwbb50@b1fa155
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

// @implements s-62b8ec@2fda7eb
// @implements s-8xr9d5@2d59ba6
// @implements s-0nmcwv@fcc34b4
// @implements s-846yjd@fa50804
// @implements s-qkq11z@1273ca2
// @implements s-rkbz86@59f60c9
// @tested-by test/language-readings.test.js#tu-d1d2a493
const fvaCallForSource = ( aSource ) => {
  const aLanguage = faLanguageForPath( aSource.sPath, aSource.sText );
  return aLanguage === null ? [] : aLanguage.fvaTestUnit( aSource );
};

// @implements s-bnkk62@2b3da81
const fbLineInHeader = ( aHeader, nLine ) => (
  nLine < aHeader.nLineCode && nLine >= aHeader.nLineDoc
);

// @implements s-0nmcwv@fcc34b4
// @implements s-m7xrlq@a850adb
const faSourceForText = ( sText, sPath ) => {
  const [ sMasked, asnComment ] = ftMaskForPath( sText, sPath );
  const vsLine = sText.split( "\n" );
  const aSource = {
    sPath,
    sText,
    sMasked,
    asnComment,
    vsLine,
    vsLineMasked: sMasked.split( "\n" ),
    vnLineStart: fvnLineStart( vsLine )
  };
  const aLanguage = faLanguageForPath( sPath, sText );
  const aHeader = aLanguage === null
    ? { nLineCode: 0, nLineDoc: 0 }
    : aLanguage.faHeader( aSource );
  return {
    ...aSource,
    aHeader,
    reCallWrapper: aLanguage === null ? null
      : aLanguage.freCallWrapper( aSource, aHeader )
  };
};

// @implements s-8tx2ob@ba817e4
const fbLineRunWhole = ( aSource, nLine ) => {
  const sLine = aSource.vsLine[ nLine ] || "";
  const aLanguage = faLanguageForPath( aSource.sPath, aSource.sText );
  const nComment = Array.from( aSource.asnComment ).find(( nAt ) => (
    fnLineAt( aSource.vnLineStart, nAt ) === nLine
  ));
  const sDirective = nComment === undefined ? sLine
    : aLanguage !== null && typeof aLanguage.fsDirectiveLine === "function"
      ? aLanguage.fsDirectiveLine(
        sLine, nComment - aSource.vnLineStart[ nLine ]
      ) : sLine;
  return reRunLine.test( sDirective )
    && aSource.vsLineMasked[ nLine ].trim() === "";
};

// @implements s-bnkk62@2b3da81
// @implements s-8tx2ob@ba817e4
const faCallBelowRun = ( aSource, vaCall, nLine ) => {
  let nNext = nLine + 1;
  while( fbLineRunWhole( aSource, nNext )
    || ( faLanguageForPath( aSource.sPath, aSource.sText ) || { fbDirectiveGapLine: () => false })
      .fbDirectiveGapLine( aSource.vsLine[ nNext ] || "" )
  ){ nNext++;}
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
  const aLanguage = faLanguageForPath( aSource.sPath, aSource.sText );
  const sDirective = aLanguage !== null
    && typeof aLanguage.fsDirectiveLine === "function"
    ? aLanguage.fsDirectiveLine( sLine, nCol ) : sLine;
  return [ nLine, sLine, sDirective.slice( nCol + 2 ) ];
};

// @implements s-98jxk4@d886f7c
// @implements s-bnkk62@2b3da81
// @implements s-8tx2ob@ba817e4
// @implements s-op9bak@ecaff86
// @implements s-5un01z@b74caaa
const faOwnerForComment = ( aSource, vaCall, aHeader, nComment ) => {
  const [ nLine, sLine, sAfter ] = ftCommentAt( aSource, nComment );
  if( !reOwnerText.test( sAfter )){ return null;}
  const aLanguage = faLanguageForPath( aSource.sPath, aSource.sText );
  const sDirective = aLanguage !== null
    && typeof aLanguage.fsDirectiveLine === "function"
    ? aLanguage.fsDirectiveLine( sLine, nComment - aSource.vnLineStart[ nLine ])
    : sLine;
  const vsGroup = sDirective.match( reOwnerLine );
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

// @implements s-lf00bp@0ec752e
const fsPartForLine = ( sLine ) => {
  const vsGroup = sLine.match( reLinkPart );
  return vsGroup === null ? null : vsGroup[ 3 ];
};

// @implements s-eawgvu@a59ff64
// @implements s-lf00bp@0ec752e
// @implements s-trdu1m@34986f1
// @implements s-5un01z@b74caaa
const faLinkForComment = ( aSource, nComment, aForm ) => {
  const [ nLine, sLine, sAfter ] = ftCommentAt( aSource, nComment );
  if( !aForm.reText.test( sAfter )){ return null;}
  const aLanguage = faLanguageForPath( aSource.sPath, aSource.sText );
  const sDirective = aLanguage !== null
    && typeof aLanguage.fsDirectiveLine === "function"
    ? aLanguage.fsDirectiveLine( sLine, nComment - aSource.vnLineStart[ nLine ])
    : sLine;
  const vsWell = sDirective.match( aForm.reLine );
  const vsLoose = sAfter.match( aForm.reLoose );
  return {
    nLine: nLine + 1,
    sText: sLine.trim(),
    sId: vsLoose === null ? null : vsLoose[ 1 ],
    sHash: vsLoose === null ? "" : vsLoose[ 2 ],
    sPart: fsPartForLine( sDirective ),
    bWell: vsWell !== null,
    bGuard: aForm.bGuard
  };
};

const fvaLinkForForm = ( aSource, vnComment, aForm ) => vnComment
  .map(( nComment ) => faLinkForComment( aSource, nComment, aForm ))
  .filter( Boolean );

// @implements s-62b8ec@2fda7eb
// @implements s-tw3l62@a42577f
// @implements s-eawgvu@a59ff64
// @implements s-cs9i6p@1cf2293
// @implements s-4o88k8@e467b6b
// @implements s-3klfsj@d4d9f32
// @implements s-rkbz86@59f60c9
// @implements s-fiabr2@965e4cb
// @implements s-obz7rg@4fcc16d
// @implements s-9ho983@29e4110
// @implements s-k3nucf@c0c7bf2
// @implements s-sy7274@b9a1e14
const faParseTest = ( aFile ) => {
  const aSource = faSourceForText( aFile.sText, aFile.sPath );
  const vaCall = fvaCallForSource( aSource );
  const aHeader = aSource.aHeader;
  const vnComment = Array.from( aSource.asnComment );
  return {
    sPath: fsPosix( aFile.sPath ),
    sText: aFile.sText,
    vaCall,
    vaOwner: vnComment
      .map(( nComment ) => (
        faOwnerForComment( aSource, vaCall, aHeader, nComment )
      ))
      .filter( Boolean ),
    vaLink: fvaRegionScope(
      fvaLinkForForm( aSource, vnComment, aFormLink ), aFile.sText
    ),
    vaGuard: fvaRegionScope(
      fvaLinkForForm( aSource, vnComment, aFormGuard ), aFile.sText
    ),
    vaImplements: fvaRegionScope(
      fvaLinkForForm( aSource, vnComment, aFormImplements ),
      aFile.sText
    ),
    vaRefMisplaced: vnComment
      .flatMap(( nComment ) => fvaRefMisplacedForComment( aSource, nComment ))
  };
};

// @implements s-sy7274@b9a1e14
const fvaRefMisplacedForComment = ( aSource, nComment ) => {
  const [ nLine, sLine, sAfter ] = ftCommentAt( aSource, nComment );
  return vtKindMisplacedInTest
    .filter(([ , reText ]) => reText.test( sAfter ))
    .map(([ sKind, , reLoose ]) => {
      const vsLoose = sAfter.match( reLoose );
      return {
        sPath: fsPosix( aSource.sPath ),
        nLine: nLine + 1,
        sKind,
        sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
        sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
        bWell: false,
        sText: sLine.trim(),
        sReason: "misplaced",
        sId: null,
        bTest: true,
        sNameCall: null
      };
    });
};

// @implements s-nlzsly@c19be98
// @implements s-w4wun2@53dab89
// @implements s-fiabr2@965e4cb
// @implements s-ljxzt6@18e05e4
// @implements s-dssqhc@47c722c
const fsReasonForImplementsInTest = ( aImpl, aFound, vaCall ) => {
  if( !aImpl.bWell ){ return "malformed";}
  const sReason = fsReasonForFound(
    aFound, "no such statement", "duplicate id"
  );
  if( sReason !== null ){ return sReason;}
  if( aFound.aLine.sType !== "s" ){
    return "names a line of type " + fsTypeLine( aFound.aLine.sType );
  }
  if( aFound.aLine.sHash !== aImpl.sHash ){ return "stale hash";}
  const bProved = vaCall.some(( aCall ) => (
    aCall.sKind === "test"
    && aImpl.nRegionStart < aCall.nEnd
    && aImpl.nRegionEnd > aCall.nStart
    && fbCallCoveredBy( aCall, aFound.aLine )
  ));
  return bProved ? null : "no test it covers proves the statement";
};

// @implements s-nlzsly@c19be98
// @implements s-fiabr2@965e4cb
// @implements s-ljxzt6@18e05e4
// @implements s-dssqhc@47c722c
const faImplementsInTest = ( aImpl, sPath, aIndex, vaCall ) => {
  const aFound = aImpl.bWell ? faLineForId( aIndex, aImpl.sId ) : null;
  return {
    sPath,
    nLine: aImpl.nLine,
    nRegionStart: aImpl.nRegionStart,
    nRegionEnd: aImpl.nRegionEnd,
    nSourceStartLine: aImpl.nSourceStartLine,
    nSourceEndLine: aImpl.nSourceEndLine,
    sKind: "implements",
    sTarget: aImpl.sId === null ? "" : aImpl.sId,
    sStamp: aImpl.sHash,
    bWell: aImpl.bWell,
    sText: aImpl.sText,
    sReason: fsReasonForImplementsInTest( aImpl, aFound, vaCall ),
    sId: aFound === null || aFound.aLine === null ? null : aFound.aLine.sId,
    bTest: true,
    sNameCall: null
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

// @implements s-pslzjw@bb3ff6d
// @implements s-op9bak@ecaff86
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

// @implements s-mijuu3@eb255fe
// @implements s-j8ahje@91cc810
// @implements s-rmpj20@c3531c2
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

// @implements s-mijuu3@eb255fe
const fsReasonForFound = ( aFound, sNone, sTwice ) => {
  if( aFound.cPlace > 1 ){ return sTwice;}
  if( aFound.sIdRetyped !== null ){
    return fsReasonRetyped( aFound.sIdRetyped );
  }
  return aFound.aLine === null ? sNone : null;
};

// @implements s-vhci8f@cf04778
// @implements s-xt2qjj@ce601a5
// @implements s-kkql92@90bba2d
// @implements s-lf00bp@0ec752e
// @implements s-i6cch2@0fa308d
const fsReasonForLink = ( aLink, aIndex ) => {
  if( !aLink.bWell ){
    return aLink.sPart !== null && !aLink.bGuard
      ? sReasonPartLink
      : "malformed";
  }
  const aFound = faLineForId( aIndex, aLink.sId );
  const sReason = fsReasonForFound(
    aFound, "no such statement", "duplicate id"
  );
  if( sReason !== null ){ return sReason;}
  if( aFound.aLine.sType !== "s" ){
    return "names a line of type " + fsTypeLine( aFound.aLine.sType )
      + ", which no test proves";
  }
  return null;
};

// @implements s-jcgn2k@507b789
// @implements s-nw4u9n@3b57e9b
// @implements s-kkql92@90bba2d
// @implements s-83mryk@52401d8
// @implements s-i6cch2@0fa308d
// @implements s-yltboo@95a3db6
// @implements s-ctbylk@c20e0f1
const faLinkResolved = ( aLink, sPath, aIndex ) => {
  const sReason = fsReasonForLink( aLink, aIndex );
  const aStmt = sReason === null
    ? aIndex.avaMarkerForId.get( aLink.sId )[ 0 ]
    : null;
  return {
    ...aLink,
    sPath,
    sReason,
    aStmtNamed: aStmt,
    aStmt,
    bStale: aStmt !== null && aStmt.sHash !== aLink.sHash,
    bIdAbsent: aLink.bWell && !aIndex.avaMarkerForId.has( aLink.sId )
  };
};

const fvaStmtUnique = ( vaStmt ) => Array.from(
  new Map( vaStmt.map(( aStmt ) => [ aStmt.sId, aStmt ])).values()
);

// @implements s-hs7ffw@b031efa
const fsTestUnitId = ( sPath, aCall, nOccurrence ) => {
  const sRange = `L${aCall.nFirstLine}-L${aCall.nLastLine}:${nOccurrence}`;
  return "tu-" + crypto.createHash( "sha256" )
    .update( `${sPath}:${sRange}`, "utf8" ).digest( "hex" ).slice( 0, 8 );
};

// @implements s-tvuwev@04539c9
// @implements s-tw3l62@a42577f
// @implements s-zvzlp8@dcfec4e
// @implements s-uny6ly@83363ca
// @implements s-1yuomz@b828506
// @implements s-xsusri@1f880bb
const faCallProved = ( aCall, vaCallAll, vaLink ) => {
  const vaEnclosing = vaCallAll.filter(( aOuter ) => (
    fbEncloses( aOuter, aCall )
  ));
  const vaCover = vaLink.filter(( aLink ) => (
    aLink.aStmtNamed !== null
    && aLink.nRegionStart < aCall.nEnd
    && aLink.nRegionEnd > aCall.nStart
  ));
  return {
    ...aCall,
    vaStmt: fvaStmtUnique( vaCover.map(( aLink ) => aLink.aStmt )),
    vaStmtLinked: fvaStmtUnique(
      vaCover.map(( aLink ) => aLink.aStmtNamed )
    ),
    vsNameEnclosing: vaEnclosing.map(( aOuter ) => aOuter.sName )
  };
};

// @implements s-s7wgz7@8b913ab
// @implements s-8usccv@c0cc953
const fasOwnerDerived = ( aCall ) => new Set(
  aCall.vaStmtCounted.map(( aStmt ) => aStmt.sPath )
);

// @implements s-62b8ec@2fda7eb
// @implements s-8xr9d5@2d59ba6
// @implements s-jcgn2k@507b789
// @implements s-i6cch2@0fa308d
// @implements s-nlzsly@c19be98
// @implements s-ctbylk@c20e0f1
// @implements s-9wbr29@0f680c4
// @implements s-fiabr2@965e4cb
const faTestLinked = ( aTest, aIndex ) => {
  const fvaResolved = ( vaLink ) => vaLink.map(( aLink ) => (
    faLinkResolved( aLink, aTest.sPath, aIndex )
  ));
  const vaLink = fvaResolved( aTest.vaLink );
  const maOccurrence = new Map();
  const vaCall = aTest.vaCall.map(( aCall ) => {
    const nFirstLine = aCall.nLine + 1;
    const nLastLine = aTest.sText.slice(
      0, Math.max( aCall.nStart, aCall.nEnd - 1 )
    ).split( "\n" ).length;
    const sRange = `${nFirstLine}:${nLastLine}`;
    const nOccurrence = aCall.sKind === "test"
      ? ( maOccurrence.get( sRange ) || 0 ) + 1 : 0;
    if( aCall.sKind === "test" ){ maOccurrence.set( sRange, nOccurrence );}
    return {
      ...faCallProved( aCall, aTest.vaCall, vaLink ),
      nFirstLine, nLastLine,
      sUnitId: aCall.sKind === "test"
        ? fsTestUnitId( aTest.sPath, { nFirstLine, nLastLine }, nOccurrence )
        : null
    };
  });
  return {
    ...aTest,
    vaLink,
    vaGuard: fvaResolved( aTest.vaGuard ),
    vaCall,
    vaImplements: aTest.vaImplements.map(( aImpl ) => (
      faImplementsInTest( aImpl, aTest.sPath, aIndex, vaCall )
    ))
  };
};

// @implements s-0e75fk@780e493
// @implements s-svtfjm@7ad3935
const fasIdBacked = ( vaTestLinked ) => new Set(
  vaTestLinked.flatMap(( aTest ) => aTest.vaCall
    .filter(( aCall ) => aCall.sKind === "test" )
    .flatMap(( aCall ) => aCall.vaStmt ))
    .map(( aStmt ) => aStmt.sId )
);

// @implements s-0e75fk@780e493
// @implements s-p6dv3k@0fbbb2e
// @implements s-uny6ly@83363ca
// @implements s-8usccv@c0cc953
const faCallGuarded = ( aCall, vaGuard ) => {
  const vaStmtGuard = fvaStmtUnique( vaGuard
    .filter(( aGuard ) => aGuard.bBacked
      && aGuard.nRegionStart < aCall.nEnd
      && aGuard.nRegionEnd > aCall.nStart )
    .map(( aGuard ) => aGuard.aStmt ));
  return {
    ...aCall,
    vaStmtGuard,
    vaStmtCounted: fvaStmtUnique( aCall.vaStmtLinked.concat( vaStmtGuard ))
  };
};

// @implements s-62b8ec@2fda7eb
// @implements s-pslzjw@bb3ff6d
// @implements s-s7wgz7@8b913ab
// @implements s-n7deu7@e5afae0
// @implements s-0e75fk@780e493
// @implements s-p6dv3k@0fbbb2e
// @implements s-svtfjm@7ad3935
// @implements s-8usccv@c0cc953
// @implements s-9wbr29@0f680c4
const faTestOwned = ( aTest, asIdBacked ) => {
  const vaGuard = aTest.vaGuard.map(( aGuard ) => ({
    ...aGuard,
    bBacked: aGuard.sReason === null && asIdBacked.has( aGuard.aStmt.sId )
  }));
  const vaCall = aTest.vaCall.map(( aCall ) => (
    faCallGuarded( aCall, vaGuard )
  ));
  const vaCallTest = vaCall.filter(( aCall ) => aCall.sKind === "test" );
  const bFull = vaCallTest.length > 0
    && vaCallTest.every(( aCall ) => aCall.vaStmtCounted.length > 0 );
  return {
    ...aTest,
    vaGuard,
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

const fvaTestResolved = ( vaTest, aIndex, aParseCache ) => {
  const vaTestLinked = vaTest.map(( aFile ) => (
    faTestLinked(
      aParseCache === undefined
        ? faParseTest( aFile )
        : aParseCache.fxParse( "test", aFile, faParseTest ),
      aIndex
    )
  ));
  const asIdBacked = fasIdBacked( vaTestLinked );
  return vaTestLinked.map(( aTest ) => faTestOwned( aTest, asIdBacked ));
};

// @implements s-3klfsj@d4d9f32
// @implements s-yltboo@95a3db6
// @implements s-ctbylk@c20e0f1
// @implements s-9wbr29@0f680c4
// @implements s-aku8n2@4ffc4f1
const fvaLinkAny = ( aTest ) => aTest.vaLink.concat( aTest.vaGuard )
  .sort(( aA, aB ) => aA.nLine - aB.nLine );

// @implements s-98jxk4@d886f7c
// @implements s-j8ahje@91cc810
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

// @implements s-s7wgz7@8b913ab
// @implements s-n7deu7@e5afae0
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

// @implements s-n10cb0@01b16a4
const favaMarkerForBody = ( vaMarker ) => favxGrouped(
  vaMarker.filter(( aMarker ) => (
    aMarker.sId !== null && !aMarker.bMalformed
  )),
  ( aMarker ) => aMarker.sBody,
  ( aMarker ) => aMarker
);

// @implements s-n10cb0@01b16a4
// @implements s-mijuu3@eb255fe
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

// @implements s-98jxk4@d886f7c
// @implements s-3pkw1n@721f8a3
// @implements s-n7deu7@e5afae0
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
  fvsPathFile: () => [],
  fbPathInSpec: ( sPath ) => sPath === sDirSpecs
    || sPath.startsWith( sDirSpecs + "/" )
    || sPath === "intent" || sPath.startsWith( "intent/" ),
  fvaSpecCollection: () => ({ vsPath: [], sReason: "no collection reader" })
};

const aObsInputNone = {
  sPathObs: null, sTextObs: null, vaRules: [], vaCode: []
};

// @implements s-qln1ta@564522c
// @implements s-fc4ubx@3f16155
// @implements s-dglucu@bd4c60b
// @implements s-zhg7ac@f7ba2b1
const ffsTextIncluded = ( vaInclusion ) => {
  const avaInclusionForMarker = favxGrouped(
    vaInclusion.filter(( aIncl ) => aIncl.sReason === null ),
    ( aIncl ) => aIncl.aMarker,
    ( aIncl ) => aIncl
  );
  const asTextForMarker = new Map();
  const fsText = ( aMarker ) => {
    if( !asTextForMarker.has( aMarker )){
      const sRaw = ( avaInclusionForMarker.get( aMarker ) || [])
        .slice()
        .sort(( aA, aB ) => aB.nRel - aA.nRel )
        .reduce(( sAcc, aIncl ) => (
          sAcc.slice( 0, aIncl.nRel ) + fsText( aIncl.aTarget )
          + sAcc.slice( aIncl.nRel + aIncl.sWritten.length )
        ), aMarker.sTextRaw );
      asTextForMarker.set( aMarker, fsNormal( sRaw ));
    }
    return asTextForMarker.get( aMarker );
  };
  return fsText;
};

// @implements s-qln1ta@564522c
// @implements s-fc4ubx@3f16155
// @implements s-zhg7ac@f7ba2b1
const fvaSpecIncluded = ( vaSpecRaw, aParseCache ) => {
  const vaMarkerRaw = vaSpecRaw.flatMap(( aSpec ) => aSpec.vaMarker );
  const fsText = ffsTextIncluded( faRootRefs({
    vaMarker: vaMarkerRaw, ...faIndexForMarkers( vaMarkerRaw )
  }).vaInclusion );
  const faIncluded = ( aMarker ) => {
    if( aMarker.vaInclusion.length === 0 ){ return aMarker;}
    const sTextIncluded = fsText( aMarker );
    return {
      ...aMarker,
      sTextIncluded,
      sHash: aParseCache === undefined
        ? fsHashForText( sTextIncluded )
        : aParseCache.fsHash( sTextIncluded, fsHashForText )
    };
  };
  return vaSpecRaw.map(( aSpec ) => ({
    ...aSpec, vaMarker: aSpec.vaMarker.map( faIncluded )
  }));
};

// @tested-by test/spec-map-source.test.js#tu-6ccc2603
const faModel = ({
  vaSpec, vaTest, vaCiter, vaGuided, vaSideBad, vaRecord, fbExists, aFiles, aObsInput,
  aParseCache
}) => {
  const faParseSpecCached = ( aSpec ) => {
    const aInput = { sPath: fsPosix( aSpec.sPath ), sText: aSpec.sText };
    return aParseCache === undefined
      ? faParseSpec( aInput )
      : aParseCache.fxParse( "spec", aInput, faParseSpec );
  };
  const vaSpecParsed = fvaSpecIncluded(
    vaSpec.map( faParseSpecCached ), aParseCache
  );
  const vaMarker = vaSpecParsed.flatMap(( aSpec ) => aSpec.vaMarker );
  const aIndex = faIndexForMarkers( vaMarker );
  const vaTestParsed = fvaTestResolved( vaTest, aIndex, aParseCache );
  const vaCode = vaCiter || [];
  const aModel = {
    vaSpecParsed,
    vaMarker,
    ...aIndex,
    aRootRefs: faRootRefs({ vaMarker, ...aIndex }),
    vaTestParsed,
    vaCallTest: vaTestParsed.flatMap(( aTest ) => (
      aTest.vaCall.filter(( aCall ) => aCall.sKind === "test" )
    )),
    vaLink: vaTestParsed.flatMap(( aTest ) => aTest.vaLink ),
    vaGuard: vaTestParsed.flatMap(( aTest ) => aTest.vaGuard ),
    vaLinkAny: vaTestParsed.flatMap( fvaLinkAny ),
    vaCode,
    vaSideBad: vaSideBad || [],
    aParseCache,
    aUseTextForBlock: new WeakMap(),
    vaCodeRef: [],
    vaTestParsed,
    aObsInput: aObsInput || aObsInputNone
  };
  return {
    ...aModel,
    aLines: faLines( aModel, {
      vaGuided: vaGuided || vaCiter || [],
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

// @implements s-7llevg@6c2799e
// @implements s-n10cb0@01b16a4
// @implements s-johg6m@f4b11b4
// @implements s-mijuu3@eb255fe
// @implements s-4qpk97@7e4bb82
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

// @implements s-jvsu3w@dc81311
const fvaLineOfType = ( aModel, sType ) => fvaLineWell( aModel ).filter((
  aMarker
) => aMarker.sType === sType );

// @implements s-ar1i87@b6009f5
const fvaStmtForModel = ( aModel ) => (
  aModel.vaMarker.filter(( aMarker ) => (
    aMarker.sId !== null
    && !aMarker.bMalformed
    && aMarker.sType === "s"
    && aModel.avaMarkerForId.get( aMarker.sId ).length === 1
  ))
);

// @implements s-bmgkci@7568101
// @implements s-irjox3@ac44757
// @implements s-fgmj0s@836cdf0
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

// @implements s-ly5nn3@190736f
const fsTextForUse = ( aBlock, aMarkerOwn, aModel ) => {
  if( aMarkerOwn === null && aModel.aUseTextForBlock.has( aBlock )){
    return aModel.aUseTextForBlock.get( aBlock );
  }
  const sOwn = aMarkerOwn === null
    ? aBlock.sText
    : fsBlanked( aBlock.sText, aMarkerOwn.nPosBlock, aMarkerOwn.nEndBlock );
  const sTextUse = fsNormal( fvtSpanForText( sOwn ).reduce(( sAcc, tSpan ) => (
    fsBlanked( sAcc, tSpan[ 0 ], tSpan[ 1 ] + tSpan[ 2 ])
  ), sOwn ));
  if( aMarkerOwn === null ){
    aModel.aUseTextForBlock.set( aBlock, sTextUse );
  }
  return sTextUse;
};

// @implements s-ly5nn3@190736f
const freForTerm = ( sTerm ) => new RegExp(
  "(?<![\\p{L}\\p{N}])" + sTerm.replace( reEscape, "\\$&" )
  + "s?(?![\\p{L}\\p{N}])",
  "iu"
);

// @implements s-ly5nn3@190736f
const fvaUseForTerm = ( aModel, aMarker, sTerm ) => {
  const reTerm = freForTerm( sTerm );
  return aModel.vaSpecParsed.flatMap(( aSpec ) => aSpec.vaBlock
    .filter(( aBlock ) => reTerm.test( fsTextForUse(
      aBlock,
      aSpec.sPath === aMarker.sPath && aBlock.nBlock === aMarker.nBlock
        ? aMarker
        : null,
      aModel
    )))
    .map(( aBlock ) => ({ sPath: aSpec.sPath, nLine: aBlock.vnLine[ 0 ] + 1 }))
  );
};

// @implements s-atk0wi@ffaf3bb
const fsReasonForDuplicateTerm = ( aEntry, vaSame ) => {
  const vaOther = vaSame.filter(( aOther ) => aOther !== aEntry );
  return vaOther.length === 0
    ? null
    : "term " + aEntry.sTerm + " also defined at "
      + vaOther.map(( aOther ) => fsPlace( aOther.aMarker )).join( ", " );
};

// @implements s-atk0wi@ffaf3bb
const fsKeyForTerm = ( sTerm ) => (
  sTerm.replace( reArticleLead, "" ).toLowerCase()
);

// @implements s-c05xna@89aded1
// @implements s-atk0wi@ffaf3bb
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
    const bInSpec = this.aEnv.aFiles.fbPathInSpec === undefined
      ? !fbCodeTarget( sTarget )
      : this.aEnv.aFiles.fbPathInSpec( sTarget );
    if( sKind === "path" && !bInSpec ){
      return this.aEnv.aFiles.fsKind( sTarget ) === "file"
        ? this.fsHashForFile( fsPathClean( sTarget ))
        : this.aEnv.aFiles.fsKind( sTarget ) === "dir"
          ? this.fsHashForDir( fsPathClean( sTarget ))
          : null;
    }
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
    return this.aEnv.aFiles.fsKind( sTarget ) === "file"
      ? this.fsHashForFile( fsPathClean( sTarget ))
      : this.fsHashForDir( fsPathClean( sTarget ));
  }

  // @implements s-h9tc2m@919d17b
  // @tested-by test/side-files.test.js#tu-49c36791
  fsHashForFile( sPath ){
    return this.fsMemo( "file " + sPath, () => {
      const aSide = ( this.aModel.vaCode || [] ).find(( aFile ) => (
        aFile.bSide && aFile.sPath === sPath
      ));
      return aSide === undefined
        ? fsHashForText( fsNormalForFile(
          sPath, this.aEnv.aFiles.fsTextAt( sPath )
        ))
        : fsHashForBytes( this.aEnv.aFiles.fyBytesAt( sPath ));
    });
  }

  // @implements s-oy6kxo@4b8acb4
  // @implements s-tclcd8@3d6d619
  // @implements s-g8r0ur@f2d68ec
  // @implements s-zcb6gq@fdaa5bb
  // @implements s-3bftr3@3529be7
  // @implements s-wp3dpp@040ef82
  // @tested-by test/side-files.test.js#tu-5b0b1035
  fsHashForCheckTarget( sPath, sId ){
    return this.fsMemo( "check target " + sPath + " " + sId, () => {
      const aFile = ( this.aModel.vaCode || []).find(( aEntry ) => (
        aEntry.sPath === sPath
      ));
      if( aFile === undefined ){ return null;}
      const vaCheckRef = this.aModel.vaCodeRef
        .filter(( aRef ) => aRef.sKind === "checks" && aRef.sReason === null
          && aRef.sId === sId && ( aRef.sPathCode || aRef.sPath ) === sPath );
      // Preserve the raw-byte hash for legacy file-wide sidecar references.
      // A diff sidecar's body groups can hash just their mapped source lines.
      if( aFile.bSide && vaCheckRef.every(( aRef ) => aRef.bFileWide )){
        return this.fsHashForFile( sPath );
      }
      const vaRange = vaCheckRef
        .map(( aRef ) => [ aRef.nSourceStartLine, aRef.nSourceEndLine ])
        .sort(( aA, aB ) => aA[ 0 ] - aB[ 0 ]);
      if( vaRange.length === 0 ){ return null;}
      const vaMerged = [];
      vaRange.forEach(([ nStart, nEnd ]) => {
        const aLast = vaMerged[ vaMerged.length - 1 ];
        if( aLast !== undefined && nStart <= aLast[ 1 ] ){
          aLast[ 1 ] = Math.max( aLast[ 1 ], nEnd );
        }
        else { vaMerged.push([ nStart, nEnd ]);}
      });
      const sSource = aFile.bSide ? aFile.sTextTarget : aFile.sText;
      const vsLine = sSource.split( "\n" );
      const sNormalized = vaMerged.map(([ nStart, nEnd ]) => (
        fsNormalForFile( sPath, vsLine.slice( nStart - 1, nEnd - 1 ).join( "\n" ))
      )).join( "" );
      return fsHashForText( sNormalized );
    });
  }

  fsHashForDir( sDir ){
    return fsHashForText( this.aEnv.aFiles.fvsPathFile( sDir )
      .map(( sPath ) => (
        path.posix.relative( sDir, sPath ) + " " + this.fsHashForFile( sPath )
      ))
      .join( "\n" ));
  }
}

// @implements s-en1xk7@b19ecef
// @implements s-j8ahje@91cc810
// @implements s-t8un02@9839058
// @implements s-dhs2hx@db209fb
// @implements s-vjgnay@5c0f583
const fsReasonForTargetFound = ( aModel, aEnv, sTarget ) => {
  const sKind = fsKindForTarget( sTarget );
  if( sKind === "id" ){
    return fsReasonForFound(
      faLineForId( aModel, sTarget ),
      "no marker holds it",
      "held by more than one marker"
    );
  }
  if( sKind === "collection" ){
    return aEnv.aFiles.fvaSpecCollection( sTarget ).sReason;
  }
  if( sKind === "path" ){
    const sPath = fsPathClean( sTarget );
    const bInSpec = aEnv.aFiles.fbPathInSpec === undefined
      ? sPath === sDirSpecs || sPath.startsWith( sDirSpecs + "/" )
      : aEnv.aFiles.fbPathInSpec( sPath );
    if( !bInSpec ){
      return "pointer target is outside specs";
    }
    if( !sPath.endsWith( ".md" )){ return "target is not a spec file";}
    return aEnv.fbExists( sTarget ) ? null : "no such file or directory";
  }
  const vsGroup = sTarget.match( reTargetSlug );
  const bInSpec = aEnv.aFiles.fbPathInSpec === undefined
    ? vsGroup[ 1 ] === sDirSpecs
      || vsGroup[ 1 ].startsWith( sDirSpecs + "/" )
    : aEnv.aFiles.fbPathInSpec( vsGroup[ 1 ] );
  if( !bInSpec ){
    return "pointer target is outside specs";
  }
  const aSpec = aModel.vaSpecParsed.find(( aSpecParsed ) => (
    aSpecParsed.sPath === vsGroup[ 1 ]
  ));
  if( aSpec === undefined ){ return "no such spec";}
  return aSpec.asSlug.has( vsGroup[ 2 ]) ? null : "no heading with that slug";
};

// @implements s-en1xk7@b19ecef
// @implements s-7h4j0s@512c0f5
// @implements s-gueyj8@dcbe6bc
// @implements s-j8ahje@91cc810
// @implements s-t8un02@9839058
// @implements s-dhs2hx@db209fb
// @implements s-vjgnay@5c0f583
// @implements s-9zllrl@4304abd
const faTargetResolved = ( aModel, aEnv, aMarker, sTarget ) => {
  const bForm = fsReasonForTargetForm( sTarget ) === null;
  const sKind = fsKindForTarget( sTarget );
  const aCollection = bForm && sKind === "collection"
    ? aEnv.aFiles.fvaSpecCollection( sTarget )
    : { vsPath: [] };
  const sIdRetyped = bForm && fsKindForTarget( sTarget ) === "id"
    ? faLineForId( aModel, sTarget ).sIdRetyped
    : null;
  return {
    aMarker,
    sPath: aMarker.sPath,
    nLine: aMarker.nLine,
    sTarget,
    vsChildSpec: aCollection.vsPath,
    bForm,
    sIdRetyped,
    sReason: bForm ? fsReasonForTargetFound( aModel, aEnv, sTarget ) : null
  };
};

// @implements s-7h4j0s@512c0f5
const fvaTargetForModel = ( aModel, aEnv ) => fvaLineWell( aModel )
  .filter(( aMarker ) => (
    sTypeTargeted.includes( aMarker.sType ) && aMarker.sTargets !== null
  ))
  .flatMap(( aMarker ) => aMarker.sTargets.split( "," ).map(( sTarget ) => (
    faTargetResolved( aModel, aEnv, aMarker, sTarget )
  )));

// @implements s-0eydbi@db338e8
// @implements s-zac0m4@4b07675
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

// @implements s-oy6kxo@4b8acb4
// @implements s-tclcd8@3d6d619
// @implements s-wp3dpp@040ef82
const fbRecordCurrent = ( aRecord, aMarker, hasher ) => {
  const asHash = fasHashForRecord( aRecord );
  const vsTarget = hasher.aModel.vaCodeRef
    .filter(( aRef ) => aRef.sKind === "checks" && aRef.sReason === null
      && aRef.sId === aMarker.sId )
    .map(( aRef ) => aRef.sPathCode || aRef.sPath );
  const vsUniqueTarget = Array.from( new Set( vsTarget )).sort();
  return aRecord.sHash === aMarker.sHash
    && Object.keys( asHash ).sort().join( "\n" ) === vsUniqueTarget.join( "\n" )
    && vsUniqueTarget.every(( sTarget ) => {
      const sHash = hasher.fsHashForCheckTarget( sTarget, aMarker.sId );
      return sHash !== null
        && Object.hasOwn( asHash, sTarget )
        && asHash[ sTarget ] === sHash;
    });
};

// @implements s-oy6kxo@4b8acb4
// @implements s-32o5r7@1ced769
// @implements s-wp3dpp@040ef82
// @implements s-ikjpbw@fc0cb7c
const fsStatusForRecord = ( aRecord, aMarker, hasher ) => {
  if( aRecord === null ){ return "unchecked";}
  if( aRecord.sVerdict === "pass" ){
    return fbRecordCurrent( aRecord, aMarker, hasher ) ? "passed" : "stale";
  }
  return aRecord.sVerdict === "fail" ? "failed" : "unchecked";
};

// @implements s-vhci8f@cf04778
// @implements s-oy6kxo@4b8acb4
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

// @implements s-ddsepn@99dbc98
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

// @implements s-zac0m4@4b07675
// @implements s-ddsepn@99dbc98
const fvaProblemForChecks = ( vaCheck ) => (
  vaCheck.map( faProblemForCheck ).filter( Boolean )
);

// @implements s-vhci8f@cf04778
// @implements s-m544u1@462f4f1
// @implements s-m5inu7@1c00f9a
// @implements s-ocpfpw@c6adf07
// @implements s-ol2dmr@37d4979
// @implements s-vjgnay@5c0f583
const fvaNoCodeForChecks = ( vaCheck, vaChecks ) => vaCheck.filter(( aCheck ) => (
  !vaChecks.some(( aRef ) => aRef.sId === aCheck.aMarker.sId )
));

const faRegionIndent = ( aRef, vsLine ) => {
  const nLine = aRef.nRegionLine || aRef.nLine;
  const sLine = vsLine[ nLine - 1 ] || aRef.sText || "";
  let nCol = 0;
  for( const ch of sLine.match( /^\s*/ )?.[ 0 ] || "" ){
    nCol = ch === "\t" ? nCol + 8 - nCol % 8 : nCol + 1;
  }
  return nCol;
};

// @implements s-fbqdbv@9e37ea5
// @implements s-lm68rf@a7ce036
// @implements s-0hg5qn@087947b
// @implements s-7tlfzo@6deec61
// @implements s-jcgn2k@507b789
// @implements s-tw3l62@a42577f
// @implements s-3m6dwj@e7b4c8e
// @implements s-cs9i6p@1cf2293
// @implements s-01nsp8@5e482e6
// @implements s-k9xdwy@ccaee82
// @implements s-obz7rg@4fcc16d
// @implements s-9ho983@29e4110
// @implements s-lgrhug@02a57ce
const fvaRegionScope = (
  vaRef, sText, bFileWideHeader = false, vaHeaderRef = vaRef
) => {
  const vsLine = sText.split( "\n" );
  const nLineCount = vsLine.length - ( sText.endsWith( "\n" ) ? 1 : 0 );
  const vnLineStart = fvnLineStart( vsLine );
  // Only an uninterrupted directive group at the physical start of a file is
  // the file-wide header. A blank or ordinary comment closes it; subsequent
  // directives are source-region groups, even before the first code line.
  const asHeaderLine = new Set();
  for( let n = 0; n < vsLine.length; n++ ){
    const sTrim = vsLine[ n ].trim();
    if( n === 0 && sTrim.startsWith( "#!" ) ){ continue;}
    const vaAtLine = vaHeaderRef.filter(( aRef ) => (
      ( aRef.nRegionLine || aRef.nLine ) === n + 1
    ));
    if( vaAtLine.length > 0 && vaAtLine.every(( aRef ) => (
      aRef.sKind === "implements" || aRef.sKind === "tested-by"
        || aRef.sKind === "checks"
    ))){
      asHeaderLine.add( n + 1 );
      continue;
    }
    break;
  }
  const vaScoped = vaRef.map(( aRef ) => ({
    ...aRef,
    nScopeLine: aRef.nRegionLine || aRef.nLine,
    nIndent: faRegionIndent( aRef, vsLine )
  }));
  const vaGroup = [];
  vaScoped.sort(( aA, aB ) => aA.nScopeLine - aB.nScopeLine).forEach(( aRef ) => {
    let aGroup = vaGroup[ vaGroup.length - 1 ];
    const bGapBlank = aGroup !== undefined
      && vsLine.slice( aGroup.nLastLine, aRef.nScopeLine - 1 )
        .every(( sLine ) => sLine.trim() === "");
    if( aGroup === undefined || aGroup.nIndent !== aRef.nIndent
      || !bGapBlank
    ){
      aGroup = { nIndent: aRef.nIndent, nFirstLine: aRef.nScopeLine,
        nLastLine: aRef.nScopeLine, vaRef: [] };
      vaGroup.push( aGroup );
    }
    aGroup.nLastLine = aRef.nScopeLine;
    aGroup.vaRef.push( aRef );
  });
  const maGroup = new Map();
  vaGroup.forEach(( aGroup, n ) => {
    const nEndLine = vaGroup.slice( n + 1 )
      .find(( aNext ) => aNext.nIndent <= aGroup.nIndent )?.nFirstLine
      || nLineCount + 1;
    maGroup.set( aGroup, {
      nSourceStartLine: aGroup.nLastLine + 1,
      nSourceEndLine: nEndLine,
      nRegionStart: vnLineStart[ Math.min( aGroup.nLastLine, vsLine.length ) ],
      nRegionEnd: vnLineStart[ Math.min( nEndLine - 1, vsLine.length ) ]
        ?? sText.length,
      bFileWide: false
    });
  });
  return vaScoped.flatMap(( aRef ) => {
    const aGroup = vaGroup.find(( aEntry ) => aEntry.vaRef.includes( aRef ));
    if( bFileWideHeader && asHeaderLine.has( aRef.nScopeLine ) ){
      return [{ ...aRef, nSourceStartLine: 1,
        nSourceEndLine: nLineCount + 1, nRegionStart: 0,
        nRegionEnd: sText.length, bFileWide: true }];
    }
    return [{ ...aRef, ...( maGroup.get( aGroup ) || {}) }];
  });
};

// @implements s-nrp172@56b8541
// @implements s-m544u1@462f4f1
// @implements s-m5inu7@1c00f9a
// @implements s-rv4wbq@86ed5ff
// @implements s-3m6dwj@e7b4c8e
// @implements s-trdu1m@34986f1
// @implements s-01nsp8@5e482e6
// @implements s-k9xdwy@ccaee82
// @implements s-23wmhe@454713f
// @implements s-5un01z@b74caaa
// @implements s-bqioq5@e78161a
// @implements s-wt7bpq@73556cf
// @implements s-dkjdl0@511a833
// @implements s-gkhfa4@3deac5b
const fvaCodeReferenceForFile = ( aFile ) => {
  const vaRef = aFile.bSide
    ? fvaCodeReferenceForSide( aFile )
    : ( faLanguageForPath( aFile.sPath, aFile.sText ) || { fvaCodeReference: () => [] })
      .fvaCodeReference( aFile );
  const vaMapped = [ "implements", "tested-by", "checks" ].flatMap(( sKind ) => {
    const vaKind = vaRef.filter(( aRef ) => aRef.sKind === sKind );
    const vaScoped = fvaRegionScope(
      vaKind, aFile.sText, true, vaRef
    );
    return aFile.bSide
      ? vaScoped.map(( aRef ) => {
      const vnTargetLine = aFile.vnLineMap.slice(
        aRef.nSourceStartLine - 1, aRef.nSourceEndLine - 1
      ).filter(( nLine ) => nLine !== null );
      if( vnTargetLine.length === 0 ){
        const vnVirtualLine = aFile.vnLineMap.slice(
          aRef.nSourceStartLine - 1, aRef.nSourceEndLine - 1
        );
        const nNext = vnVirtualLine.find(( nLine ) => nLine !== null );
        const nPrevious = vnVirtualLine.slice().reverse()
          .find(( nLine ) => nLine !== null );
        const nAnchor = nNext ?? ( nPrevious === undefined ? 1 : nPrevious + 1 );
        return {
          ...aRef,
          bSourceTargetRange: true,
          nSourceStartLine: nAnchor,
          nSourceEndLine: nAnchor
        };
      }
      return {
        ...aRef,
        bSourceTargetRange: true,
        nSourceStartLine: Math.min( ...vnTargetLine ),
        nSourceEndLine: Math.max( ...vnTargetLine ) + 1
      };
      })
      : vaScoped;
  });
  return vaMapped.concat( vaRef.filter(( aRef ) => (
    ![ "implements", "tested-by", "checks" ].includes( aRef.sKind )
  )));
};

const vtKindCodeReference = [
// @implements s-bqioq5@e78161a
  [ "implements", reImplementsText, reImplementsLoose ],
  [ "tested-by", reTestedByText, reTestedByLoose ],
  [ "checks", reChecksText, reChecksLoose ]
];

const aSidecarDirective = {
  implements: {
    reLoose: reImplementsLoose,
    reWell: /^@implements +[a-z]-[a-z0-9]{6}@[0-9a-f]{7}$/
  },
  "tested-by": {
    reLoose: reTestedByLoose,
    reWell: /^@tested-by +\S+$/
  },
  checks: {
    reLoose: reChecksLoose,
    reWell: /^@checks +[a-z]-[a-z0-9]{6}@[0-9a-f]{7}$/
  },
  follows: {
    reLoose: reFollowsLoose,
    reWell: /^@follows +[a-z]-[a-z0-9]{6}@[0-9a-f]{7}$/
  }
};
const vsSidecarMisplaced = [ "spec", "proves", "guards", "test-wrapper" ];
// @implements s-nrp172@56b8541
// @implements s-yecw0i@c83eff2
// @implements s-22a0wo@13886ff
// @tested-by test/side-files.test.js#tu-7f7ff918
const fvaSidecarLine = ( aFile ) => ( aFile.vaOverlayDirective || [])
  .map(( aOverlay ) => ({
    sText: aOverlay.sText.trim(),
    sPath: aFile.sPathSidecar,
    sPathCode: fsPosix( aFile.sPath ),
    nLine: aOverlay.nSidecarLine,
    nRegionLine: aOverlay.nVirtualLine
  }))
  .map(( aLine ) => {
    const sKind = Object.keys( aSidecarDirective ).concat(
      vsSidecarMisplaced
    ).find(( sName ) => aLine.sText.startsWith( "@" + sName )) || null;
    const aDirective = aSidecarDirective[ sKind ];
    const vsLoose = aDirective === undefined
      ? null : aLine.sText.match( aDirective.reLoose );
    return {
      ...aLine,
      sKind: sKind || "none",
      sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
      sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
      bWell: aDirective !== undefined && aDirective.reWell.test( aLine.sText ),
      bMisplaced: vsSidecarMisplaced.includes( sKind )
    };
  });

// @implements s-nrp172@56b8541
// @implements s-22a0wo@13886ff
// @tested-by test/side-files.test.js#tu-7f7ff918
const fvaCodeReferenceForSide = ( aFile ) => fvaSidecarLine( aFile )
  .filter(( aLine ) => aLine.sKind !== "follows" )
// @implements s-wt7bpq@73556cf
// @tested-by test/side-files.test.js#tu-53ae4634
  .map(( aLine ) => ({
    ...aLine,
    bMisplaced: aLine.bMisplaced || aLine.sKind === "none"
  }));

const faRefMisplacedAt = ( aFile, vsLine, nLine, sAfter, nComment ) => {
  const nLineStart = fvnLineStart( vsLine )[ nLine ];
  const sBefore = vsLine[ nLine ].slice( 0, nComment - nLineStart );
  if( sBefore.trim() === "" ){ return [];}
  return vtKindCodeReference
    .filter(([ , reText ]) => reText.test( sAfter ))
    .map(([ sKind, , reLoose ]) => {
      const vsLoose = sAfter.match( reLoose );
      return {
        sPath: fsPosix( aFile.sPath ),
        nLine: nLine + 1,
        sKind,
        sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
        sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
        bWell: false,
        bMisplaced: true,
        sText: vsLine[ nLine ].trim()
      };
    });
};

const fvaMisplacedForFile = ( aFile, nLineHeaderEnd ) => {
  const vsLine = aFile.sText.split( "\n" );
  const vnLineStart = fvnLineStart( vsLine );
  const [ vnLine, vnBlock ] = ftCommentsForCiter( aFile );
  return Array.from( new Set( vnLine.concat( vnBlock )))
    .flatMap(( nComment ) => {
      const nLine = fnLineAt( vnLineStart, nComment );
      if( nLine < nLineHeaderEnd ){ return [];}
      const sAfter = vsLine[ nLine ]
        .slice( nComment - vnLineStart[ nLine ] + 2 );
      return faRefMisplacedAt( aFile, vsLine, nLine, sAfter, nComment );
    })
    .sort(( aA, aB ) => aA.nLine - aB.nLine );
};

// @implements s-bw4530@acfa706
// @implements s-m544u1@462f4f1
// @implements s-m5inu7@1c00f9a
// @implements s-50dzy6@3c05a41
// @implements s-bqioq5@e78161a
// @implements s-yyl1i0@0abeae1
// @implements s-j8ahje@91cc810
// @implements s-vjgnay@5c0f583
// @implements s-83mryk@52401d8
// @implements s-0n3sm5@d016ebd
// @implements s-w4wun2@53dab89
// @implements s-23wmhe@454713f
// @implements s-4hsltb@ebe272b
// @implements s-tghouh@f811aec
// @implements s-k3nucf@c0c7bf2
// @implements s-sy7274@b9a1e14
// @implements s-dkjdl0@511a833
// @implements s-gkhfa4@3deac5b
// @implements s-d4b5k9@e6a8c7a
// @implements s-hs7ffw@b031efa
const fvaCodeReferenceResolved = ( aModel ) => {
  const vaTestPath = new Set( aModel.vaTestParsed.map(( aTest ) => aTest.sPath ));
  const aResolvedForRef = new Map();
  const vaRef = aModel.vaCode.flatMap(( aFile ) => (
    aModel.aParseCache === undefined
      ? fvaCodeReferenceForFile( aFile )
      : aModel.aParseCache.fxParse(
        "code", aFile, ( aInput ) => fvaCodeReferenceForFile({
          ...aInput,
          bSide: aFile.bSide,
          sPathSidecar: aFile.sPathSidecar,
          vaOverlayDirective: aFile.vaOverlayDirective,
          vnLineMap: aFile.vnLineMap
        })
      )
  ));
  aModel.vaCodeRef = vaRef.filter(( aRef ) => aRef.sKind === "implements" )
    .map(( aRef ) => {
      const vsId = ( aRef.sTarget + "@" + aRef.sStamp ).match(
        /^([a-z]-[a-z0-9]{6})@([0-9a-f]{7})$/
      );
      const aFound = vsId === null ? null : faLineForId( aModel, vsId[ 1 ] );
      // @implements s-k3sml3@9ef30dd
      // @tested-by test/side-files.test.js#tu-8a924761
      const sReason = aRef.bMisplaced ? "misplaced"
        : !aRef.bWell || vsId === null
        ? "malformed"
        : aFound.cPlace !== 1 ? "statement id does not resolve uniquely"
          : aFound.aLine.sType !== "s" ? "names a line of type " + fsTypeLine( aFound.aLine.sType )
            : aFound.aLine.sHash !== vsId[ 2 ] ? "stale hash" : null;
      const aResolved = {
        ...aRef, sReason, sId: sReason === null ? vsId[ 1 ] : null
      };
      aResolvedForRef.set( aRef, aResolved );
      return aResolved;
    });
  return vaRef.map(( aRef ) => {
    if( aRef.sKind === "implements" ){
      return aResolvedForRef.get( aRef );
    }
    const vsId = aRef.sTarget.match( /^([a-z]-[a-z0-9]{6})$/ );
    const vsStamped = ( aRef.sTarget + "@" + aRef.sStamp ).match(
      /^([a-z]-[a-z0-9]{6})@([0-9a-f]{7})$/
    );
    let sReason = null;
    let aLine = null;
    let aTest = null;
    let sTestPath = null;
    let sTestUnitId = null;
    if( aRef.bMisplaced ){ sReason = "misplaced";}
    else if( !aRef.bWell ){ sReason = "malformed";}
    else if( aRef.sKind === "tested-by" ){
      const vsUnitTarget = /^(.+)#(tu-[0-9a-f]{8})$/.exec( aRef.sTarget );
      if( vsUnitTarget === null && aRef.sTarget.includes( "#" )){
        sReason = "malformed test-unit target";
      }
      const sPath = vsUnitTarget === null
        ? aRef.sTarget : vsUnitTarget[ 1 ];
      sTestPath = sPath;
      sTestUnitId = vsUnitTarget === null ? null : vsUnitTarget[ 2 ];
      aTest = aModel.vaTestParsed.find(( aEntry ) => aEntry.sPath === sPath );
      if( sReason === null && !vaTestPath.has( sPath )){
        sReason = "no such declared test file";
      }
      else if( sReason === null ){
        const sPathCode = aRef.sPathCode || aRef.sPath;
        const asImpl = new Set( aModel.vaCodeRef
          .filter(( aImpl ) => aImpl.sReason === null
            && ( aImpl.sPathCode || aImpl.sPath ) === sPathCode
            && aImpl.nSourceStartLine < aRef.nSourceEndLine
            && aImpl.nSourceEndLine > aRef.nSourceStartLine )
          .map(( aImpl ) => aImpl.sId ));
        let vaProof;
        if( vsUnitTarget === null ){
          vaProof = aTest.vaLink.filter(( aLink ) => aLink.sReason === null );
        }
        else {
          const vaCall = aTest.vaCall.filter(( aCall ) => (
            aCall.sKind === "test" && aCall.sUnitId === vsUnitTarget[ 2 ]
          ));
          if( vaCall.length !== 1 ){
            sReason = vaCall.length === 0
              ? "no test unit has that id" : "test unit id is ambiguous";
          }
          vaProof = vaCall.flatMap(( aCall ) => aTest.vaLink
            .filter(( aLink ) => aLink.sReason === null
              && aLink.nRegionStart < aCall.nEnd
              && aLink.nRegionEnd > aCall.nStart )
            .map(( aLink ) => aLink.aStmt ));
        }
        if( sReason === null && !vaProof.some(( aStmt ) => asImpl.has( aStmt.sId )) ){
          sReason = vsUnitTarget === null
            ? "test proves no statement implemented in this region"
            : "named test unit proves no statement implemented in this region";
        }
        else if( sReason === null && vsUnitTarget !== null
          && aRef.bFileWide
          && Array.from( asImpl ).some(( sId ) => !vaProof.some(( aStmt ) => (
            aStmt.sId === sId
          )))
        ){
          sReason = "named test unit does not prove every statement implemented by this file";
        }
        aRef.bLegacyTestFile = vsUnitTarget === null;
      }
    }
    else {
      const sId = vsStamped === null ? null : vsStamped[ 1 ];
      const aFound = sId === null ? null : faLineForId( aModel, sId );
      if( vsStamped === null ){ sReason = "malformed";}
      else if( aFound.cPlace !== 1 ){ sReason = "statement id does not resolve uniquely";}
      else {
        aLine = aFound.aLine;
        const sExpectedType = aRef.sKind === "implements" ? "s" : "i";
        if( aLine.sType !== sExpectedType ){
          sReason = "names a line of type " + fsTypeLine( aLine.sType );
        }
        else if( aLine.sHash !== vsStamped[ 2 ]){ sReason = "stale hash";}
      }
    }
    return { ...aRef, sReason, sId: aLine === null ? null : aLine.sId,
      sTestPath, sTestUnitId };
  }).concat( aModel.vaTestParsed.flatMap(( aTest ) => (
    aTest.vaImplements.concat( aTest.vaRefMisplaced )
  )));
};

const ftCommentsForCiter = ( aFile ) => {
  const aLanguage = faLanguageForPath( aFile.sPath, aFile.sText );
  return aLanguage === null ? [ [], [] ] : aLanguage.ftComments( aFile );
};

// @implements s-aw5cvb@d8a5949
// @implements s-5un01z@b74caaa
const faFollowsAt = ( aFile, vnLineStart, nComment, bBlock ) => {
  const nLine = fnLineAt( vnLineStart, nComment );
  const sLine = aFile.sText.slice(
    vnLineStart[ nLine ], vnLineStart[ nLine + 1 ] - 1
  );
  const aLanguage = faLanguageForPath( aFile.sPath, aFile.sText );
  const sDirective = aLanguage !== null
    && typeof aLanguage.fsDirectiveLine === "function"
    ? aLanguage.fsDirectiveLine( sLine, nComment - vnLineStart[ nLine ])
    : sLine;
  const sAfterRaw = sDirective.slice( nComment - vnLineStart[ nLine ] + 2 );
  const nClose = bBlock ? sAfterRaw.indexOf( "*/" ) : -1;
  const sAfter = nClose < 0 ? sAfterRaw : sAfterRaw.slice( 0, nClose );
  if( !reFollowsText.test( sAfter )){ return null;}
  const vsWell = sDirective.match( bBlock ? reFollowsBlock : reFollowsLine );
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

// @implements s-f8jiyg@08812ac
// @implements s-gk0bmt@68c8bf5
// @implements s-aw5cvb@d8a5949
// @implements s-z28ucn@585ecdf
const fvaFollowsForFile = ( aFile ) => aFile.bSide
  ? fvaSidecarLine( aFile )
    .filter(( aLine ) => aLine.sKind === "follows" )
    .map(( aLine ) => ({
      sPath: aLine.sPath,
      nLine: aLine.nLine,
      sText: aLine.sText,
      bWell: aLine.bWell,
      sId: aLine.sTarget,
      sHash: aLine.sStamp
    }))
  : ( faLanguageForPath( aFile.sPath, aFile.sText ) || { fvaFollows: () => [] })
    .fvaFollows( aFile );

// @implements s-aw5cvb@d8a5949
// @implements s-z28ucn@585ecdf
const fvaFollowsForScript = ( aFile ) => {
  const vnLineStart = fvnLineStart( aFile.sText.split( "\n" ));
  const [ vnLine, vnBlock ] = ftCommentsForCiter( aFile );
  return vnLine
    .map(( n ) => faFollowsAt( aFile, vnLineStart, n, false ))
    .concat( vnBlock.map(( n ) => faFollowsAt( aFile, vnLineStart, n, true )))
    .filter( Boolean )
    .sort(( aA, aB ) => aA.nLine - aB.nLine );
};

// @implements s-rh750h@cc70238
// @implements s-3fzgrr@cc19c25
// @implements s-k9xdwy@ccaee82
// @implements s-rv4wbq@86ed5ff
// @tested-by test/language-readings.test.js#tu-3c044b99
// @tested-by test/language-readings.test.js#tu-14a7fcb1
const maLanguage = faReaders({
  fsNormal,
  fsCodeNormal,
  fvnLineStart,
  fnLineAt,
  fsPosix,
  fvaMisplacedForFile,
  ftCommentAt,
  reImplementsText, reImplementsLine, reImplementsLoose,
  reTestedByText, reTestedByLine, reTestedByLoose,
  reChecksText, reChecksLine, reChecksLoose,
  fvaCallForRe,
  fvaFollowsForCommentReader: ( aFile ) => fvaFollowsForScript( aFile )
});

// @implements s-z28ucn@585ecdf
// @implements s-rh750h@cc70238
// @implements s-3fzgrr@cc19c25
// @implements s-k9xdwy@ccaee82
// @implements s-rv4wbq@86ed5ff
// @implements s-3mnehj@681e132
// @implements s-qkq11z@1273ca2
// @implements s-rkbz86@59f60c9
// @tested-by test/language-readings.test.js#tu-3c044b99
// @tested-by test/language-readings.test.js#tu-14a7fcb1
// @tested-by test/language-readings.test.js#tu-d1d2a493
// @tested-by test/language-readings.test.js#tu-eb04f7c1
// @tested-by test/language-readings.test.js#tu-46da7ebd
// @tested-by test/language-readings.test.js#tu-2653439f
const faLanguageForPath = ( sPath, sText = "" ) => Array.from( maLanguage.values() )
  .find(( aLanguage ) => (
    typeof aLanguage.fbCanReadPath === "function"
      ? aLanguage.fbCanReadPath( sPath, sText )
      : aLanguage.vsExtension.some(( sExt ) => sPath.endsWith( sExt ))
  )) || null;

// @implements s-3oxidy@1ccac2e
// @implements s-te9wza@59881f7
// @implements s-0abyvp@9e5dd00
// @implements s-2l6ys1@d966d32
// @implements s-k9xdwy@ccaee82
// @tested-by test/language-readings.test.js#tu-3c044b99
const fbTestPathForLanguage = ( aLanguage, sPath ) => (
  typeof aLanguage.fbIsTestPath === "function"
    ? aLanguage.fbIsTestPath( sPath )
    : new RegExp( "\\.test\\.(?:" + ( aLanguage.vsTestSuffix || []).join( "|" ) + ")$" )
      .test( sPath )
);

// @implements s-b05h80@16440fe
// @implements s-bmkxya@6780e68
// @implements s-j8ahje@91cc810
// @implements s-kkql92@90bba2d
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
    bStale: aLine !== null && aLine.sHash !== aFollows.sHash,
    bIdAbsent: aFollows.bWell && !aModel.avaMarkerForId.has( aFollows.sId )
  };
};

// @implements s-3k6zj0@6b700e3
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

// @implements s-z28ucn@585ecdf
// @implements s-i6rjuw@32c89fd
// @implements s-8g5yno@c3ea2a8
// @implements s-mn5and@058eb96
// @implements s-n1ztut@75bf716
// @implements s-2vgnq6@8323fcb
// @implements s-4hsltb@ebe272b
// @implements s-tghouh@f811aec
const faLines = ( aModel, aEnv ) => {
  const hasher = new TargetHasher( aModel, aEnv );
  aModel.vaCodeRef = fvaCodeReferenceResolved( aModel );
  const aLines = {
    hasher,
    vaDefinition: fvaDefinitionForModel( aModel ),
    vaTarget: fvaTargetForModel( aModel, aEnv ),
    vaCheck: fvaLineOfType( aModel, "i" ).map(( aMarker ) => (
      faCheckForMarker( aMarker, aEnv.vaRecord, hasher )
    )),
    vaFollows: aEnv.vaGuided
      .flatMap(( aFile ) => (
        aModel.aParseCache === undefined
          ? fvaFollowsForFile( aFile )
          : aModel.aParseCache.fxParse(
            "follows", aFile, ( aInput ) => fvaFollowsForFile({
              ...aInput,
              bSide: aFile.bSide,
              sPathSidecar: aFile.sPathSidecar,
              vaOverlayDirective: aFile.vaOverlayDirective,
              vnLineMap: aFile.vnLineMap
            })
          )
      ))
      .map(( aFollows ) => faFollowsResolved( aModel, aFollows )),
    vaCodeRef: []
  };
  aLines.vaCodeRef = aModel.vaCodeRef;
  aLines.vaImplements = aModel.vaCodeRef.filter(( aRef ) => (
    aRef.sKind === "implements" && aRef.sReason === null
  ));
  aLines.vaTestedBy = aModel.vaCodeRef.filter(( aRef ) => (
    aRef.sKind === "tested-by" && aRef.sReason === null
  ));
  aLines.vaChecks = aModel.vaCodeRef.filter(( aRef ) => (
    aRef.sKind === "checks" && aRef.sReason === null
  ));
  aLines.vaCodeRefBad = aModel.vaCodeRef.filter(( aRef ) => (
    aRef.sReason !== null
  ));
  const avaImplementsForId = new Map();
  aLines.vaImplements.forEach(( aRef ) => {
    const vaRef = avaImplementsForId.get( aRef.sId ) || [];
    vaRef.push( aRef );
    avaImplementsForId.set( aRef.sId, vaRef );
  });
  const asImplementedId = new Set( avaImplementsForId.keys());
  const asTestedByPath = new Set(
    aLines.vaTestedBy.map(( aRef ) => aRef.sPathCode || aRef.sPath )
  );
  const asCheckedId = new Set( aLines.vaChecks.map(( aRef ) => aRef.sId ));
  const asMarkerRoot = fasMarkerRoot( aModel.aRootRefs );
  aLines.vaNoImplementation = fvaLineOfType( aModel, "s" ).filter(( aStmt ) => (
    !asMarkerRoot.has( aStmt )
    && !asImplementedId.has( aStmt.sId )
  ));
  aLines.vaStatusConflict = fvaLineOfType( aModel, "s" )
    .filter(( aStmt ) => aStmt.bNotImplemented)
    .map(( aStmt ) => ({
      aMarker: aStmt,
      vaRef: avaImplementsForId.get( aStmt.sId ) || []
    }))
    .filter(( aEntry ) => aEntry.vaRef.length > 0);
  // @implements s-sg7zoy@216a1b0
  aLines.vaNoTestedBy = aModel.vaCode.filter(( aFile ) => (
    !asTestedByPath.has( fsPosix( aFile.sPath ))
  ));
  aLines.vaLegacyTestedBy = aLines.vaTestedBy.filter(( aRef ) => (
    aRef.bLegacyTestFile
  ));
  aLines.vaNoTestUnit = aLines.vaImplements.filter(( aImpl ) => {
    const sPathCode = aImpl.sPathCode || aImpl.sPath;
    return !aLines.vaTestedBy.some(( aRef ) => {
      if( aRef.bLegacyTestFile || aRef.sTestUnitId === null
        || ( aRef.sPathCode || aRef.sPath ) !== sPathCode
        || aRef.nSourceStartLine >= aImpl.nSourceEndLine
        || aRef.nSourceEndLine <= aImpl.nSourceStartLine
      ){ return false;}
      const aTest = aModel.vaTestParsed.find(( aEntry ) => (
        aEntry.sPath === aRef.sTestPath
      ));
      return aTest !== undefined && aTest.vaCall.some(( aCall ) => (
        aCall.sUnitId === aRef.sTestUnitId
        && aCall.vaStmt.some(( aStmt ) => aStmt.sId === aImpl.sId )
      ));
    });
  });
  aLines.vaNoChecks = fvaLineOfType( aModel, "i" ).filter(( aCheck ) => (
    !asCheckedId.has( aCheck.sId )
  ));
  return {
    ...aLines, asMarkerSatisfiedOwn: fasMarkerSatisfiedOwn( aModel, aLines )
  };
};

// @implements s-ns2gme@9b9beb2
const fsLineForCall = ( aCall, sLabel ) => (
  aCall.sPath + ":" + ( aCall.nLine + 1 ) + "  " + sLabel + aCall.sName
);

const faIncomplete = ( sPath, nLine, sWhat ) => ({
  sPath, nLine, sLine: sPath + ":" + nLine + "  " + sWhat
});

// @implements s-ns2gme@9b9beb2
// @implements s-8usccv@c0cc953
const fvaUnprovingForSpec = ( aModel, aSpec ) => aModel.vaCallTest
  .filter(( aCall ) => aCall.asOwner.has( aSpec.sPath ))
  .filter(( aCall ) => !aCall.vaStmtCounted.some(( aStmt ) => (
    aStmt.sPath === aSpec.sPath
  )))
  .map(( aCall ) => faIncomplete(
    aCall.sPath, aCall.nLine + 1, "proves nothing: " + aCall.sName
  ));

// @implements s-u2lhta@c6845db
const fvaIncompleteForSpec = ( aModel, aSpec ) => (
  aSpec.vaUnmarked
    .map(( aEntry ) => faIncomplete(
      aEntry.sPath, aEntry.nLine, "unmarked: " + aEntry.sWords
    ))
    .concat( fvaPlaceholderForMarker( aSpec.vaMarker ).map(( aMarker ) => (
      faIncomplete(
        aMarker.sPath, aMarker.nLine, "placeholder: " + fsWords( aMarker.sText )
    ))))
    .concat( fvaUnprovingForSpec( aModel, aSpec ))
);

// @implements s-ar1i87@b6009f5
const fvaPlaceholderForMarker = ( vaMarker ) => vaMarker.filter(( aMarker ) => (
  aMarker.bPlaceholder && !aMarker.bMalformed
));

// @implements s-wakfil@7deeb77
// @implements s-3vhy40@92707b8
// @implements s-y462l3@3b6cea9
// @implements s-v20yz5@b63123d
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

// @implements s-wakfil@7deeb77
// @implements s-y462l3@3b6cea9
// @implements s-gq9hu3@a2edb9f
const favaMarkerForLabel = ( vaMarker ) => favxGrouped(
  vaMarker.filter(( aMarker ) => (
    aMarker.bPlaceholder && !aMarker.bMalformed && aMarker.sLabel !== ""
  )),
  ( aMarker ) => fsKeyLabel( aMarker.sPath, aMarker.sType, aMarker.sLabel ),
  ( aMarker ) => aMarker
);

// @implements s-wakfil@7deeb77
// @implements s-3vhy40@92707b8
// @implements s-y462l3@3b6cea9
// @implements s-v20yz5@b63123d
// @implements s-gq9hu3@a2edb9f
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

// @implements s-v20yz5@b63123d
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

// @implements s-je03s2@6b1aa0b
// @implements s-kkql92@90bba2d
// @implements s-6or7az@00097e5
// @implements s-3vhy40@92707b8
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

// @implements s-6or7az@00097e5
// @implements s-l2muht@e9fb34f
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

// @implements s-6or7az@00097e5
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

// @implements s-kgnjaq@cedcec8
// @implements s-je03s2@6b1aa0b
// @implements s-cp0cte@9e6f9c2
// @implements s-l2muht@e9fb34f
// @implements s-lkfk0g@47ba420
const faListForMarker = ( aMarker, aCtx ) => {
  const vsEntry = aMarker.sList.split( "," );
  const nArch = vsEntry.indexOf( sArch );
  const aList = {
    aMarker,
    bArch: nArch >= 0,
    nArch,
    vaRef: [],
    sReason: null,
    sReasonBase: null,
    bIdAbsent: false
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
    sReason: sReasonBase || fsReasonRetypedForRefs( vaRef ),
    bIdAbsent: vaRef.some(( aRef ) => (
      aRef.sId !== null && !aCtx.avaMarkerForId.has( aRef.sId )
    ))
  };
};

const sReasonCycleList = "leads back to itself through its roots";
const sReasonCycleInclusion = "lies on a cycle of root references";
const sReasonInclusionForm = "not in the form {s-xxxxxx}";

const favaNextForRefs = ( vaList, vaInclusion ) => {
  const avaNext = new Map();
  const fAdd = ( aFrom, aTo ) => {
    let vaNext = avaNext.get( aFrom );
    if( vaNext === undefined ){
      vaNext = [];
      avaNext.set( aFrom, vaNext );
    }
    vaNext.push( aTo );
  };
  vaList
    .filter(( aList ) => aList.sReason === null )
    .forEach(( aList ) => aList.vaRef.forEach(( aRef ) => (
      fAdd( aList.aMarker, aRef.aTarget )
    )));
  vaInclusion
    .filter(( aIncl ) => aIncl.sReason === null )
    .forEach(( aIncl ) => fAdd( aIncl.aMarker, aIncl.aTarget ));
  return avaNext;
};

const faCycleIndexForGraph = ( avaNext ) => {
  const asNode = new Set( avaNext.keys());
  avaNext.forEach(( vaNext ) => vaNext.forEach(( aTo ) => asNode.add( aTo )));
  const asSeen = new Set();
  const vaFinish = [];
  asNode.forEach(( aStart ) => {
    if( asSeen.has( aStart )){ return;}
    asSeen.add( aStart );
    const vaStack = [{ aNode: aStart, nNext: 0 }];
    while( vaStack.length > 0 ){
      const aTop = vaStack[ vaStack.length - 1 ];
      const vaNext = avaNext.get( aTop.aNode ) || [];
      if( aTop.nNext < vaNext.length ){
        const aTo = vaNext[ aTop.nNext++ ];
        if( !asSeen.has( aTo )){
          asSeen.add( aTo );
          vaStack.push({ aNode: aTo, nNext: 0 });
        }
      }
      else{
        vaFinish.push( aTop.aNode );
        vaStack.pop();
      }
    }
  });

  const avaPrevious = new Map();
  asNode.forEach(( aNode ) => avaPrevious.set( aNode, [] ));
  avaNext.forEach(( vaNext, aFrom ) => vaNext.forEach(( aTo ) => {
    avaPrevious.get( aTo ).push( aFrom );
  }));
  const aComponentForNode = new Map();
  const vaComponentSize = [];
  for( let n = vaFinish.length - 1; n >= 0; n-- ){
    const aStart = vaFinish[ n ];
    if( aComponentForNode.has( aStart )){ continue;}
    const nComponent = vaComponentSize.length;
    let cNode = 0;
    const vaTodo = [ aStart ];
    aComponentForNode.set( aStart, nComponent );
    while( vaTodo.length > 0 ){
      const aNode = vaTodo.pop();
      cNode++;
      ( avaPrevious.get( aNode ) || []).forEach(( aPrevious ) => {
        if( !aComponentForNode.has( aPrevious )){
          aComponentForNode.set( aPrevious, nComponent );
          vaTodo.push( aPrevious );
        }
      });
    }
    vaComponentSize.push( cNode );
  }
  const asCycleNode = new Set();
  aComponentForNode.forEach(( nComponent, aNode ) => {
    if( vaComponentSize[ nComponent ] > 1
      || ( avaNext.get( aNode ) || []).includes( aNode )
    ){
      asCycleNode.add( aNode );
    }
  });
  return { aComponentForNode, asCycleNode };
};

// @implements s-6or7az@00097e5
// @implements s-bbaxpr@4e51c3f
const faRootRefsCycleMarked = ( vaList, vaInclusion ) => {
  const avaNext = favaNextForRefs( vaList, vaInclusion );
  const aCycles = faCycleIndexForGraph( avaNext );
  return {
    vaList: vaList.map(( aList ) => (
      aList.sReason === null && aCycles.asCycleNode.has( aList.aMarker )
        ? { ...aList, sReason: sReasonCycleList, sReasonBase: sReasonCycleList }
        : aList
    )),
    vaInclusion: vaInclusion.map(( aIncl ) => (
      aIncl.sReason === null
        && aCycles.asCycleNode.has( aIncl.aMarker )
        && aCycles.aComponentForNode.get( aIncl.aMarker )
          === aCycles.aComponentForNode.get( aIncl.aTarget )
        ? { ...aIncl, aTarget: null, sReason: sReasonCycleInclusion }
        : aIncl
    ))
  };
};

const fsReasonForInclusion = ( aFound, aMarker, asTargetList ) => {
  if( aFound.sReason !== null ){ return aFound.sReason;}
  if( aFound.aTarget === aMarker ){ return "names its own statement";}
  return asTargetList.has( aFound.aTarget )
    ? "names a line its root list also names"
    : null;
};

// @implements s-13qcjo@38e295c
// @implements s-bbaxpr@4e51c3f
// @implements s-ixasv4@f731c6a
// @implements s-lqyq1i@946e8b2
// @implements s-ickx1f@508799a
const faInclusionResolved = ( aIncl, aMarker, aCtx, asTargetList ) => {
  const aFound = aIncl.aRef === null
    ? { aTarget: null, sReason: sReasonInclusionForm }
    : faTargetForRef( aIncl.aRef, aMarker, aCtx );
  const sReason = fsReasonForInclusion( aFound, aMarker, asTargetList );
  return {
    ...aIncl,
    aMarker,
    aTarget: sReason === null ? aFound.aTarget : null,
    sReason,
    bIdAbsent: aIncl.aRef !== null && aIncl.aRef.sId !== null
      && !aCtx.avaMarkerForId.has( aIncl.aRef.sId )
  };
};

// @implements s-13qcjo@38e295c
// @implements s-fc4ubx@3f16155
const fvaInclusionForMarker = ( aMarker, aCtx, aList ) => {
  const asTargetList = new Set(( aList === undefined ? [] : aList.vaRef )
    .map(( aRef ) => aRef.aTarget )
    .filter( Boolean ));
  return aMarker.vaInclusion.map(( aIncl ) => (
    faInclusionResolved( aIncl, aMarker, aCtx, asTargetList )
  ));
};

// @implements s-cid631@c71dd26
// @implements s-gymqyq@6187733
// @implements s-lkfk0g@47ba420
// @implements s-ixasv4@f731c6a
const faRootRefs = ( aModel ) => {
  const aCtx = {
    avaMarkerForId: aModel.avaMarkerForId,
    avaMarkerForBody: aModel.avaMarkerForBody,
    avaMarkerForLabel: favaMarkerForLabel( aModel.vaMarker )
  };
  const vaMarkerWell = aModel.vaMarker.filter(( aMarker ) => (
    !aMarker.bMalformed
  ));
  const vaList = vaMarkerWell
    .filter(( aMarker ) => aMarker.sList !== null )
    .map(( aMarker ) => faListForMarker( aMarker, aCtx ));
  const alistForMarker = new Map( vaList.map(( aList ) => [
    aList.aMarker, aList
  ]));
  return faRootRefsCycleMarked( vaList, vaMarkerWell.flatMap(( aMarker ) => (
    fvaInclusionForMarker( aMarker, aCtx, alistForMarker.get( aMarker ))
  )));
};

// @implements s-cid631@c71dd26
// @implements s-gymqyq@6187733
// @implements s-13qcjo@38e295c
const favaConclusionForRefs = ( vaRefEntry, vaInclusion ) => {
  const avaConclusionForRoot = favxGrouped(
    vaRefEntry
      .map(( aEntry ) => ({
        aTarget: aEntry.aRef.aTarget, aMarker: aEntry.aMarker
      }))
      .concat( vaInclusion.filter(( aIncl ) => aIncl.sReason === null )),
    ( aEntry ) => aEntry.aTarget,
    ( aEntry ) => aEntry.aMarker
  );
  return new Map( Array.from( avaConclusionForRoot, ([ aRoot, vaC ]) => [
    aRoot, Array.from( new Set( vaC ))
  ]));
};

// @implements s-df84cf@66e21c8
// @implements s-2vyccd@d9ef2de
const fasMarkerRoot = ( aRootRefs ) => new Set( favaConclusionForRefs(
  fvaRefEntry( aRootRefs.vaList.filter(( aList ) => aList.sReason === null )),
  aRootRefs.vaInclusion
).keys());

// @implements s-gq9hu3@a2edb9f
const fvaLabelTwice = ( vaMarker ) => (
  Array.from( favaMarkerForLabel( vaMarker ).values())
    .filter(( vaPlace ) => vaPlace.length > 1 )
    .flat()
    .map(( aMarker ) => ({
      sPath: aMarker.sPath,
      nLine: aMarker.nLine,
      sText: aMarker.sToken,
      sReason: "label carried by two placeholders",
      bIdAbsent: false
    }))
);

// @implements s-je03s2@6b1aa0b
// @implements s-8haq5h@4d22c53
// @implements s-6or7az@00097e5
// @implements s-bbaxpr@4e51c3f
// @implements s-gq9hu3@a2edb9f
// @implements s-lkfk0g@47ba420
// @implements s-ickx1f@508799a
// @implements s-880seq@40723b9
const fvaRootBad = ( aRootRefs, vaMarker ) => (
  aRootRefs.vaList
    .filter(( aList ) => aList.sReason !== null )
    .map(( aList ) => ({
      sPath: aList.aMarker.sPath,
      nLine: aList.aMarker.nLine,
      sText: aList.aMarker.sToken,
      sReason: aList.sReason,
      bIdAbsent: aList.bIdAbsent
    }))
    .concat( aRootRefs.vaInclusion
      .filter(( aIncl ) => aIncl.sReason !== null )
      .map(( aIncl ) => ({
        sPath: aIncl.sPath,
        nLine: aIncl.nLine,
        sText: aIncl.sWritten,
        sReason: aIncl.sReason,
        bIdAbsent: aIncl.bIdAbsent
      })))
    .concat( fvaLabelTwice( vaMarker ))
    .sort(( aA, aB ) => (
      aA.sPath.localeCompare( aB.sPath ) || aA.nLine - aB.nLine
    ))
);

// @implements s-3k6zj0@6b700e3
// @implements s-6p2zp4@94323aa
// @implements s-gg0pvt@84345af
// @implements s-1yuomz@b828506
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

// @implements s-lkfk0g@47ba420
const fvaRefEntry = ( vaListValid ) => vaListValid.flatMap(( aList ) => (
  aList.vaRef.map(( aRef ) => ({
    sPath: aList.aMarker.sPath, aMarker: aList.aMarker, aRef
  }))
));

// @implements s-6p2zp4@94323aa
// @implements s-gg0pvt@84345af
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

// @implements s-jvsu3w@dc81311
// @implements s-cid631@c71dd26
// @implements s-3k6zj0@6b700e3
// @implements s-kgnjaq@cedcec8
// @implements s-kkql92@90bba2d
// @implements s-gymqyq@6187733
// @implements s-6p2zp4@94323aa
// @implements s-8haq5h@4d22c53
// @implements s-jie6z5@09cd30a
// @implements s-13qcjo@38e295c
// @implements s-5i1owy@cb86673
// @implements s-cp0cte@9e6f9c2
// @implements s-lqyq1i@946e8b2
const faRoots = ( aModel, asIdProved ) => {
  const aRootRefs = aModel.aRootRefs || faRootRefs( aModel );
  const vaList = aRootRefs.vaList;
  const vaListValid = vaList.filter(( aList ) => aList.sReason === null );
  const vaRefEntry = fvaRefEntry( vaListValid );
  const avaConclusionForRoot = favaConclusionForRefs(
    vaRefEntry, aRootRefs.vaInclusion
  );
  const fbSatisfied = fabSatisfiedForMarker(
    avaConclusionForRoot,
    asIdProved,
    aModel.aLines === undefined
      ? new Set()
      : aModel.aLines.asMarkerSatisfiedOwn
  );
  return {
    fbSatisfied,
    alistForMarker: new Map(
      vaList
        .filter(( aList ) => aList.sReasonBase === null )
        .map(( aList ) => [ aList.aMarker, aList ])
    ),
    vaInclusion: aRootRefs.vaInclusion,
    asMarkerRoot: new Set( avaConclusionForRoot.keys()),
    vaRootBad: fvaRootBad( aRootRefs, aModel.vaMarker ),
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

// @implements s-6p2zp4@94323aa
// @implements s-uny6ly@83363ca
// @implements s-1yuomz@b828506
const fasIdProved = ( aModel ) => new Set(
  aModel.vaCallTest
    .flatMap(( aCall ) => aCall.vaStmt.map(( aStmt ) => aStmt.sId ))
);

// @implements s-jmslkk@be3cc50
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

// @implements s-jmslkk@be3cc50
// @implements s-263wnp@68719c6
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

// @implements s-wc98ss@69659c7
// @implements s-263wnp@68719c6
const fvaRulingForMarkers = ( aModel ) => fvaLineWell( aModel )
  .map(( aMarker ) => ({ aMarker, sRuling: fsRulingForMarker( aMarker ) }))
  .filter(( aEntry ) => aEntry.sRuling !== null )
  .map(( aEntry ) => ({
    sPath: aEntry.aMarker.sPath,
    nLine: aEntry.aMarker.nLine,
    sWhat: fsIdShown( aEntry.aMarker ) + "  " + aEntry.sRuling
  }));

// @implements s-72fjkw@d78bae0
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

// @implements s-wc98ss@69659c7
const fvaRulingForModel = ( aModel ) => fvaRulingForMarkers( aModel )
  .concat( fvaRulingForBlocks( aModel ))
  .sort(( aA, aB ) => (
    aA.sPath.localeCompare( aB.sPath ) || aA.nLine - aB.nLine
  ));

// @implements s-erendz@999c6cc
// @implements s-gueyj8@dcbe6bc
// @implements s-f1np35@35d6720
// @implements s-wc98ss@69659c7
// @implements s-263wnp@68719c6
// @implements s-k4mfcb@f02be14
// @implements s-bmkxya@6780e68
// @implements s-i6rjuw@32c89fd
// @implements s-df84cf@66e21c8
// @implements s-2vyccd@d9ef2de
// @implements s-2vgnq6@8323fcb
// @implements s-gpqy5p@7ed12de
// @implements s-0n3sm5@d016ebd
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
    vaNoCode: fvaNoCodeForChecks( aLines.vaCheck, aLines.vaChecks ),
    vaNoImplementation: aLines.vaNoImplementation,
    vaStatusConflict: aLines.vaStatusConflict,
    vaNoTestedBy: aLines.vaNoTestedBy,
    vaNoTestUnit: aLines.vaNoTestUnit,
    vaLegacyTestedBy: aLines.vaLegacyTestedBy,
    vaCodeRefBad: aLines.vaCodeRefBad,
    vaSideBad: aModel.vaSideBad,
    vaImplements: aLines.vaImplements,
    vaProblem: fvaProblemForChecks( aLines.vaCheck )
  };
};

// @implements s-erendz@999c6cc
// @implements s-xuw25u@ed827df
// @implements s-gg0pvt@84345af
const fvaIncompleteForTypes = ( aTypes, sPathSpec ) => (
  aTypes.vaUnused
    .filter(( aEntry ) => aEntry.sPath === sPathSpec )
    .map(( aEntry ) => faIncomplete(
      aEntry.aMarker.sPath, aEntry.aMarker.nLine,
      "unused definition: " + aEntry.sTerm
    ))
    .concat( aTypes.vaUnderived
      .filter(( aMarker ) => aMarker.sPath === sPathSpec )
      .map(( aMarker ) => faIncomplete(
        aMarker.sPath, aMarker.nLine,
        "underived motive: " + fsWords( aMarker.sText )
      )))
);

// @implements s-nb9o4b@6b81b96
// @implements s-xuw25u@ed827df
// @implements s-8g5yno@c3ea2a8
// @implements s-2vyccd@d9ef2de
// @implements s-5i1owy@cb86673
// @implements s-gg0pvt@84345af
// @implements s-cp0cte@9e6f9c2
// @implements s-gpqy5p@7ed12de
// @implements s-1yuomz@b828506
// @implements s-fsp1a2@02fcf0a
// @implements s-ctbylk@c20e0f1
const faStatements = ( aModel ) => {
  const asIdProved = fasIdProved( aModel );
  const aRoots = faRoots( aModel, asIdProved );
  const vaStmt = fvaStmtForModel( aModel );
  const aTypes = faTypeLists( aModel, aRoots );
  return {
    ...aTypes,
    fbSatisfied: aRoots.fbSatisfied,
    vaStmt,
    vaRootBad: aRoots.vaRootBad,
    vaRoot: aRoots.vaRoot,
    vaArch: aRoots.vaArch,
    vaRederive: aRoots.vaRederive,
    vaUnstamped: aRoots.vaUnstamped,
    vaMarkerBad: fvaMarkerBad( aModel ),
    vaUnproved: vaStmt.filter(( aStmt ) => (
      !asIdProved.has( aStmt.sId ) && !aRoots.asMarkerRoot.has( aStmt )
    )),
    vaLinkBad: aModel.vaLinkAny.filter(( aLink ) => aLink.sReason !== null ),
    vaStale: aModel.vaLinkAny.filter(( aLink ) => aLink.bStale ),
    // @implements s-0yoabr@659a105
    vaUnbacked: aModel.vaGuard.filter(( aGuard ) => (
      aGuard.sReason === null && !aGuard.bBacked
    )),
    vaStaleSibling: [],
    vaIncomplete: aModel.vaSpecParsed
      .filter(( aSpec ) => aSpec.bComplete )
      .flatMap(( aSpec ) => (
        fvaIncompleteForSpec( aModel, aSpec )
          .concat( fvaIncompleteForTypes( aTypes, aSpec.sPath ))
          .map(( aEntry ) => ({ ...aEntry, sPathSpec: aSpec.sPath }))
      )),
    vaPlaceholder: fvaPlaceholderForMarker( aModel.vaMarker ),
    vaFenceUnclosed: aModel.vaSpecParsed.flatMap(( aSpec ) => (
      aSpec.vaFenceUnclosed
    ))
  };
};

// @implements s-f1np35@35d6720
// @implements s-wc98ss@69659c7
// @implements s-263wnp@68719c6
// @implements s-bmkxya@6780e68
// @implements s-mbcxy1@de2395f
// @implements s-nudxy0@3495135
// @implements s-2vgnq6@8323fcb
// @implements s-hgk19s@2c0c557
// @implements s-fsp1a2@02fcf0a
const faStatementsScoped = ( aStmtList, aScope, aModel ) => {
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
    vaLinkBad: aStmtList.vaLinkBad.filter(( aEntry ) => (
      aScope.asPathTest.has( aEntry.sPath )
    )),
    vaStale: aStmtList.vaStale.filter(( aEntry ) => fbSpec( aEntry.aStmt )),
    // @implements s-0yoabr@659a105
    vaUnbacked: aStmtList.vaUnbacked.filter(( aEntry ) => (
      fbSpec( aEntry.aStmt )
    )),
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
    vaNoImplementation: aStmtList.vaNoImplementation.filter( fbSpec ),
    vaStatusConflict: aStmtList.vaStatusConflict.filter( fbSpecMarker ),
    vaNoTestedBy: aStmtList.vaNoTestedBy.filter(( aFile ) => (
      aModel.aLines.vaImplements.some(( aRef ) => (
        ( aRef.sPathCode || aRef.sPath ) === fsPosix( aFile.sPath )
        && aScope.asIdStmt.has( aRef.sId )
      ))
    )),
    vaNoTestUnit: aStmtList.vaNoTestUnit.filter(( aImpl ) => (
      aScope.asIdStmt.has( aImpl.sId )
    )),
    vaLegacyTestedBy: aStmtList.vaLegacyTestedBy.filter(( aRef ) => (
      aModel.aLines.vaImplements.some(( aImpl ) => (
        aImpl.sId !== null && aScope.asIdStmt.has( aImpl.sId )
        && ( aImpl.sPathCode || aImpl.sPath ) === ( aRef.sPathCode || aRef.sPath )
        && aImpl.nSourceStartLine < aRef.nSourceEndLine
        && aImpl.nSourceEndLine > aRef.nSourceStartLine
      ))
    )),
    vaSideBad: [],
    vaCodeRefBad: aStmtList.vaCodeRefBad.filter(( aRef ) => (
      aRef.sId === null || aScope.asIdStmt.has( aRef.sId )
    )),
    vaProblem: aStmtList.vaProblem.filter( fbSpec )
  };
};

// @implements s-tvuwev@04539c9
// @implements s-zvzlp8@dcfec4e
// @implements s-8usccv@c0cc953
const fbCallUnlinked = ( aCall ) => (
  aCall.vaStmt.length === 0 && aCall.vaStmtGuard.length === 0
);

// @implements s-tvuwev@04539c9
// @implements s-ggaonb@b8526d7
// @implements s-8usccv@c0cc953
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

// @implements s-aku8n2@4ffc4f1
const fasPathLinking = ( vaLink, asIdStmt ) => new Set(
  vaLink
    .filter(( aLink ) => asIdStmt.has( aLink.sId ))
    .map(( aLink ) => aLink.sPath )
);

// @implements s-3pkw1n@721f8a3
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

const faAnalysis = ( aModel ) => ({
  aOwnership: faOwnership(
    aModel.vaTestParsed,
    new Set( aModel.vaSpecParsed.map(( aSpec ) => aSpec.sPath ))
  ),
  aStmtList: faStatements( aModel )
});

// @implements s-bxs0rr@4c0a68e
const faMap = ( aInput ) => {
  const aModel = faModel( aInput );
  return faMapForModel( aModel, faAnalysis( aModel ), aInput.sPathSpec );
};

const fbCheckPassed = ( aModel, aMarker ) => aModel.aLines.vaCheck.some((
  aCheck
) => aCheck.aMarker === aMarker && aCheck.sStatus === "passed" );

const faKitForModel = ( aModel, fbSatisfied ) => ({
  fvsKindForLines,
  fvaBlockForKind,
  fvtSpanForText,
  fbInSpan,
  fvnLineStart,
  fnLineAt,
  fsWords,
  fsTypeLine,
  fvsClassForFile,
  faMarkerForId: ( sId ) => {
    const vaMarker = aModel.avaMarkerForId.get( sId ) || [];
    return vaMarker.length === 1 ? vaMarker[ 0 ] : null;
  },
  fbBodyInSpec: ( sBody ) => aModel.avaMarkerForBody.has( sBody ),
  fbSatisfied: ( aMarker ) => (
    aMarker.sType === "i"
      ? fbCheckPassed( aModel, aMarker )
      : fbSatisfied( aMarker )
  )
});

const faObservationsForModel = ( aModel, fbSatisfied ) => faObservations(
  {
    ...aModel.aObsInput,
    vaSpec: aModel.vaSpecParsed,
    aParseCache: aModel.aParseCache
  },
  faKitForModel( aModel, fbSatisfied )
);

const aObsListsNone = {
  bObs: false, vaObsBad: [], vaCitationDangling: [], vaObsLike: []
};

const faObsLists = ( aModel, aAnalysis, sPathSpec ) => (
  sPathSpec === undefined
    ? {
      bObs: true,
      ...faObservationsForModel( aModel, aAnalysis.aStmtList.fbSatisfied )
    }
    : aObsListsNone
);

// @implements s-tdw4gj@8d6d23d
// @implements s-8xfzz3@6999bd7
// @implements s-du4nns@bbb6351
// @implements s-u2lhta@c6845db
// @implements s-b8vvpd@9e72e40
// @implements s-5vv5ht@dd2760b
// @implements s-tvuwev@04539c9
// @implements s-vcpu9h@6d6ac07
// @implements s-ggaonb@b8526d7
// @implements s-n8uc4k@a405885
// @implements s-hgk19s@2c0c557
const faMapForModel = ( aModel, aAnalysis, sPathSpec ) => {
  const vaTestParsed = aModel.vaTestParsed;
  const asIdStmt = sPathSpec === undefined
    ? null
    : fasIdStmtForSpec( aModel, sPathSpec );
  const asPathOwnScope = sPathSpec === undefined
    ? null
    : new Set([
      ...fasPathNaming( vaTestParsed, sPathSpec ),
      ...fasPathLinking( aModel.vaLinkAny, asIdStmt )
    ]);
  const aStmtList = faStatementsScoped(
    aAnalysis.aStmtList,
    sPathSpec === undefined
      ? null
      : { sPathSpec, asIdStmt, asPathTest: asPathOwnScope },
    aModel
  );
  return {
    ...faOwnershipScoped( aAnalysis.aOwnership, asPathOwnScope ),
    ...aStmtList,
    bScoped: sPathSpec !== undefined,
    bComplete: fbCompleteSpec( aModel, sPathSpec ),
    ...faUnlinkedForCalls(
      aModel.vaCallTest.filter(( aCall ) => fbInScope( asPathOwnScope, aCall ))
    ),
    ...faObsLists( aModel, aAnalysis, sPathSpec )
  };
};

const fsSection = ( sTitle, vsLine, c ) => (
  [ sTitle + " (" + ( c === undefined ? vsLine.length : c ) + "):" ]
    .concat( vsLine.map(( sLine ) => "  " + sLine ))
    .join( "\n" )
);

const fsPlace = ( aEntry ) => aEntry.sPath + ":" + aEntry.nLine;
const fsRegion = ( aEntry ) => (
  aEntry.nSourceStartLine === undefined ? ""
    : "  lines " + aEntry.nSourceStartLine + "-"
      + Math.max( aEntry.nSourceStartLine, aEntry.nSourceEndLine - 1 )
);

// @implements s-tvuwev@04539c9
// @implements s-ggaonb@b8526d7
const fvsSectionUnlinked = ( aMap ) => [
  fsSection(
    "test files with unlinked tests",
    aMap.vaUnlinkedFile.map(( aEntry ) => aEntry.sPath + "  " + aEntry.c )
  ),
  "Unlinked tests: " + aMap.cUnlinked + " of " + aMap.cTestRead
];

const fsGuardWord = ( aEntry ) => aEntry.bGuard ? " guard" : "";

// @implements s-7llevg@6c2799e
// @implements s-n10cb0@01b16a4
// @implements s-ctbylk@c20e0f1
const fsLineForBad = ( aEntry ) => (
  fsPlace( aEntry ) + fsRegion( aEntry ) + "  "
  + aEntry.sText + " " + fsGuardWord( aEntry )
  + " (" + aEntry.sReason + ")"
);

// @implements s-0yoabr@659a105
// @implements s-fsp1a2@02fcf0a
const fsLineForUnbacked = ( aGuard ) => (
  fsPlace( aGuard ) + fsRegion( aGuard ) + "  " + aGuard.sId
  + "  " + aGuard.aStmt.sPath
);

// @implements s-8g5yno@c3ea2a8
// @implements s-emmdvh@25164e5
const fsLineForUnproved = ( aStmt ) => (
  aStmt.sId + ( aStmt.bNotImplemented ? "  not-yet-implemented" : "" )
  + "  " + fsPlace( aStmt )
);

const fsLineForIncomplete = ( aEntry ) => aEntry.sLine;

const fsLineForFence = ( aEntry ) => fsPlace( aEntry ) + "  " + aEntry.sText;

// @implements s-3pkw1n@721f8a3
const fvsSectionOwner = ( aMap ) => [
  fsSection( "test files with no owner line", aMap.vsPathNoOwner ),
  fsSection(
    "owner lines that do not resolve", aMap.vaUnresolved.map( fsLineForBad )
  )
];

// @implements s-ctbylk@c20e0f1
const fsLineStaleWith = ( aLink, sSpec ) => (
  fsPlace( aLink ) + "  "
  + fsRegion( aLink ) + "  "
  + fsIdForLink( aLink ) + sSpec + "  recorded " + aLink.sHash
  + "  current " + aLink.aStmt.sHash
);

const fsLineStale = ( aLink ) => fsLineStaleWith( aLink, "" );

// @implements s-5vv5ht@dd2760b
const fsLineStaleSibling = ( aLink ) => (
  fsLineStaleWith( aLink, "  " + aLink.aStmt.sPath )
);

// @implements s-5vv5ht@dd2760b
// @implements s-nudxy0@3495135
// @implements s-ctbylk@c20e0f1
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

// @implements s-xuw25u@ed827df
// @implements s-n7deu7@e5afae0
// @implements s-emmdvh@25164e5
const fvsSectionStmt = ( aMap ) => [
  fsSection(
    "malformed markers and duplicate ids", aMap.vaMarkerBad.map( fsLineForBad )
  ),
  fsSection(
    // @implements s-gpqy5p@7ed12de
    "statements no test proves", aMap.vaUnproved.map( fsLineForUnproved )
  ),
  fsSection(
    "link lines that do not resolve", aMap.vaLinkBad.map( fsLineForBad )
  ),
  fsSection( "stale links", aMap.vaStale.map( fsLineStale )),
  fsSection(
    "completeness failures", aMap.vaIncomplete.map( fsLineForIncomplete )
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
  fsSection( "unclosed fences", aMap.vaFenceUnclosed.map( fsLineForFence )),
  fsSection(
    // @implements s-0yoabr@659a105
    "unbacked guard lines", aMap.vaUnbacked.map( fsLineForUnbacked )
  )
];

const fsIdForLink = ( aLink ) => aLink.sId + fsGuardWord( aLink );

const fsIdShown = ( aMarker ) => aMarker.sId || "placeholder";

// @implements s-efoflb@3670587
const fsSurfaceShown = ( aMarker ) => (
  aMarker.sSurface !== null && rePartLabel.test( aMarker.sSurface )
    ? "  surface=" + aMarker.sSurface
    : ""
);

// @implements s-fm2sqk@135c61a
// @implements s-qmf2lg@5795cc1
// @implements s-efoflb@3670587
const fvsLineForRoot = ( aRoot ) => (
  [ fsPlace( aRoot.aMarker ) + "  " + fsIdShown( aRoot.aMarker ) ]
    .concat( aRoot.vaConclusion.map(( aC ) => (
      "  " + fsPlace( aC.aMarker ) + "  " + fsIdShown( aC.aMarker )
      + fsSurfaceShown( aC.aMarker ) + "  "
      + ( aC.bSatisfied ? "satisfied" : "unsatisfied" )
    )))
    .concat([ "  " + (
      aRoot.bCovered
        ? "covered"
        : aRoot.cSatisfied + " of " + aRoot.vaConclusion.length + " satisfied"
    )])
);

// @implements s-fm2sqk@135c61a
const fvsLineForArch = ( vaArch ) => fvsLineGrouped( vaArch, ( aArch ) => [
  "  " + aArch.aMarker.nLine + "  " + fsIdShown( aArch.aMarker ) + "  "
  + fsWords( aArch.aMarker.sText )
  + ( aArch.vsRef.length === 0 ? "" : "  beside " + aArch.vsRef.join( ", " ))
]);

// @implements s-kgnjaq@cedcec8
// @implements s-fm2sqk@135c61a
// @implements s-8wn2ou@c5e7984
const fsSectionArch = ( vaArch ) => fsSection(
  "statements rooted in arch", fvsLineForArch( vaArch ), vaArch.length
);

const fsLineForRefEntry = ( aEntry ) => (
  fsPlace( aEntry.aMarker ) + "  " + fsIdShown( aEntry.aMarker ) + "  root "
  + ( aEntry.aRef.sId || aEntry.aRef.sRef )
);

// @implements s-fm2sqk@135c61a
const fsLineForRederive = ( aEntry ) => (
  fsLineForRefEntry( aEntry ) + "  recorded " + aEntry.aRef.sStamp
  + "  current " + aEntry.aRef.aTarget.sHash
);

// @implements s-cid631@c71dd26
// @implements s-je03s2@6b1aa0b
// @implements s-jie6z5@09cd30a
// @implements s-fm2sqk@135c61a
// @implements s-sfuntg@4b5ec33
// @implements s-qmf2lg@5795cc1
// @implements s-ickx1f@508799a
const fvsSectionRoot = ( aMap ) => [
  fsSection( "malformed root lists", aMap.vaRootBad.map( fsLineForBad )),
  fsSection(
    "roots", aMap.vaRoot.flatMap( fvsLineForRoot ), aMap.vaRoot.length
  ),
  fsSectionArch( aMap.vaArch ),
  fsSection(
    "re-derive: stale root references", aMap.vaRederive.map( fsLineForRederive )
  ),
  fsSection(
    "unstamped root references", aMap.vaUnstamped.map( fsLineForRefEntry )
  )
];

// @implements s-bmkxya@6780e68
const fsLineForFollows = ( aFollows ) => (
  fsPlace( aFollows ) + "  " + aFollows.sId + "  " + (
    aFollows.sReason === null
      ? "stale  recorded " + aFollows.sHash + "  current "
        + aFollows.aLine.sHash
      : "(" + aFollows.sReason + ")"
  )
);

// @implements s-8g5yno@c3ea2a8
// @implements s-emmdvh@25164e5
const fsLineForMarker = ( aMarker ) => (
  fsPlace( aMarker ) + "  " + fsIdShown( aMarker )
  + ( aMarker.bNotImplemented ? "  not-yet-implemented" : "" )
);

// @implements s-gueyj8@dcbe6bc
const fsLineForDangling = ( aTarget ) => (
  fsLineForMarker( aTarget.aMarker ) + " " + aTarget.sTarget + "  ("
  + aTarget.sReason + ")"
);

// @implements s-ocpfpw@c6adf07
const fsLineForNoCode = ( aCheck ) => fsLineForMarker( aCheck.aMarker );
// @implements s-tghouh@f811aec
// @implements s-bqioq5@e78161a
// @implements s-w4wun2@53dab89
// @implements s-k3sml3@9ef30dd
const fsLineForCodeRef = ( aRef ) => (
  fsPlace( aRef ) + fsRegion( aRef ) + "  "
  + aRef.sText + " (" + aRef.sReason + ")"
);
// @implements s-8qhv2d@478dcee
const fsLineForSide = ( aSide ) => aSide.sPath + "  (" + aSide.sState + ")";

// @implements s-m5k9wy@4aaa864
// @implements s-tghouh@f811aec
// @implements s-erendz@999c6cc
// @implements s-gueyj8@dcbe6bc
// @implements s-f1np35@35d6720
// @implements s-wc98ss@69659c7
// @implements s-263wnp@68719c6
// @implements s-bmkxya@6780e68
// @implements s-8xfzz3@6999bd7
// @implements s-mbcxy1@de2395f
// @implements s-i6rjuw@32c89fd
// @implements s-cov7pg@e6a079b
// @implements s-mn5and@058eb96
// @implements s-emmdvh@25164e5
// @implements s-2vgnq6@8323fcb
// @implements s-gonvvk@70d8432
const fvsSectionLines = ( aMap ) => [
  fsSection( "dangling targets", aMap.vaDangling.map( fsLineForDangling )),
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
  fsSection( sTitleNoCode, aMap.vaNoCode.map( fsLineForNoCode )),
  // @implements s-gpqy5p@7ed12de
  fsSection( "statements with no implementation link", aMap.vaNoImplementation.map( fsLineForMarker )),
  fsSection( "not-yet-implemented status conflicts", aMap.vaStatusConflict.map(( aEntry ) => (
    fsLineForMarker( aEntry.aMarker ) + "  implemented by "
    + Array.from( new Set( aEntry.vaRef.map(( aRef ) => (
      aRef.sPathCode || aRef.sPath
    )))).join( ", " )
  ))),
  fsSection( "implementation files with no test link", aMap.vaNoTestedBy.map(( aFile ) => aFile.sPath )),
  fsSection(
    "implementation regions without a specific test-unit link",
    aMap.vaNoTestUnit.map(( aRef ) => fsPlace( aRef ) + fsRegion( aRef )
      + "  @implements " + aRef.sId )
  ),
  // @implements s-s5f1o3@53edadf
  fsSection(
    "legacy file-only tested-by links",
    aMap.vaLegacyTestedBy.map(( aRef ) => fsPlace( aRef ) + fsRegion( aRef )
      + "  @tested-by " + aRef.sTestPath )
  ),
  fsSection( "malformed, unresolved or stale code references", aMap.vaCodeRefBad.map( fsLineForCodeRef )),
  // @implements s-v7ww36@641e899
  fsSection( "side files that are not read", aMap.vaSideBad.map( fsLineForSide )),
  fsSectionProblem( aMap.vaProblem )
];

// @implements s-s8an6z@bb4aac8
const fsLineForProblem = ( aProblem ) => {
  const sNote = fsNoteForRecord( aProblem.aRecord );
  return fsLineForMarker( aProblem.aMarker ) + "  "
    + aProblem.aRecord.sVerdict + "  " + aProblem.aRecord.sDate
    + ( sNote === "" ? "" : "  " + sNote );
};

// @implements s-s8an6z@bb4aac8
const fsSectionProblem = ( vaProblem ) => fsSection(
  sTitleProblem, vaProblem.map( fsLineForProblem )
);

const fsLineOf = ( aEntry ) => aEntry.sLine;

const fvsSectionObs = ( aMap ) => (
  aMap.bObs
    ? [
      fsSection(
        "malformed observation entries", aMap.vaObsBad.map( fsLineOf )
      ),
      fsSection(
        "dangling observation citations",
        aMap.vaCitationDangling.map( fsLineOf )
      ),
      fsSection( "observations", aMap.vsLineObs, aMap.vaObs.length ),
      aMap.sLineObsCount,
      fsSection(
        "observation-like text in rules files", aMap.vaObsLike.map( fsLineOf )
      )
    ]
    : []
);

// @implements s-ocpfpw@c6adf07
// @implements s-s8an6z@bb4aac8
// @implements s-7llevg@6c2799e
// @implements s-n10cb0@01b16a4
// @implements s-tdw4gj@8d6d23d
// @implements s-du4nns@bbb6351
// @implements s-u2lhta@c6845db
// @implements s-b8vvpd@9e72e40
// @implements s-e287lm@a1b403a
// @implements s-sfuntg@4b5ec33
// @implements s-4hsltb@ebe272b
const fsReport = ( aMap ) => fvsSectionOwner( aMap ).concat(
  fvsSectionStmt( aMap ),
  fvsSectionStaleSibling( aMap ),
  fvsSectionRoot( aMap ),
  fvsSectionLines( aMap ),
  fvsSectionObs( aMap ),
  fvsSectionUnlinked( aMap ),
  [
    ( aMap.vaStmt.length - aMap.vaUnproved.length ) + " of "
    + aMap.vaStmt.length + " statements proved by a test"
  ]
).join( "\n" ) + "\n";

const faMarkerOf = ( aEntry ) => aEntry.aMarker;

const aListUnresolved = {
  nList: 4, sKey: "vaUnresolved", fsLine: fsLineForBad
};
// @implements s-w75973@e58d191
const aListMarkerBad = { nList: 6, sKey: "vaMarkerBad", fsLine: fsLineForBad };
const aListUnproved = {
  nList: 7, sKey: "vaUnproved", fsLine: fsLineForUnproved, bComplete: true
};
const aListLinkBad = { nList: 8, sKey: "vaLinkBad", fsLine: fsLineForBad };
const aListStale = { nList: 9, sKey: "vaStale", fsLine: fsLineStale };
// @implements s-xuw25u@ed827df
const aListIncomplete = {
  nList: 10, sKey: "vaIncomplete", fsLine: fsLineForIncomplete, bComplete: true
};
const aListRootBad = { nList: 13, sKey: "vaRootBad", fsLine: fsLineForBad };
const aListRederive = {
  nList: 16, sKey: "vaRederive", fsLine: fsLineForRederive, faPlace: faMarkerOf
};
// @implements s-cov7pg@e6a079b
const aListFence = {
  nList: 18, sKey: "vaFenceUnclosed", fsLine: fsLineForFence
};
const aListDangling = {
  nList: 22, sKey: "vaDangling", fsLine: fsLineForDangling, faPlace: faMarkerOf
};
const aListFollowsBad = {
  nList: 26, sKey: "vaFollowsBad", fsLine: fsLineForFollows
};
const aListNoCode = {
  nList: 28, sKey: "vaNoCode", fsLine: fsLineForNoCode, faPlace: faMarkerOf
};
// @implements s-i6rjuw@32c89fd
const aListNoImplementation = {
  nList: 31, sKey: "vaNoImplementation", fsLine: fsLineForMarker,
  bComplete: true, faPlace: faMarkerOf
};
// @implements s-2vgnq6@8323fcb
const aListStatusConflict = {
  nList: 36, sKey: "vaStatusConflict", fsLine: ( aEntry ) => (
    fsLineForMarker( aEntry.aMarker ) + "  implemented by "
    + Array.from( new Set( aEntry.vaRef.map(( aRef ) => (
      aRef.sPathCode || aRef.sPath
    )))).join( ", " )
  ),
  faPlace: ( aEntry ) => aEntry.aMarker
};
// @implements s-i6rjuw@32c89fd
const aListNoTestedBy = {
  nList: 32, sKey: "vaNoTestedBy", fsLine: ( aFile ) => aFile.sPath,
  bComplete: true, faPlace: ( aFile ) => ({ sPath: aFile.sPath, nLine: 1 })
};
// @implements s-bqioq5@e78161a
// @implements s-i6rjuw@32c89fd
// @implements s-tghouh@f811aec
// @implements s-sy7274@b9a1e14
const aListCodeRefBad = {
  nList: 33, sKey: "vaCodeRefBad", fsLine: fsLineForCodeRef,
  faPlace: ( aRef ) => aRef
};
// @implements s-8qhv2d@478dcee
const aListSideBad = {
  nList: 38, sKey: "vaSideBad", fsLine: fsLineForSide,
  faPlace: ( aSide ) => ({ sPath: aSide.sPath, nLine: 1 })
};

const aListObsBad = { nList: 34, sKey: "vaObsBad", fsLine: fsLineOf };
const aListCitationDangling = {
  nList: 35, sKey: "vaCitationDangling", fsLine: fsLineOf
};

// @implements s-ins4p7@19e76c1
// @implements s-dila0o@c18103b
// @implements s-mbcxy1@de2395f
// @implements s-y86kt5@2649010
// @implements s-ug5kvq@0033049
// @implements s-2vgnq6@8323fcb
const vaListFence = [
  aListUnresolved, aListMarkerBad, aListUnproved, aListLinkBad, aListStale,
  aListIncomplete, aListRootBad, aListFence, aListDangling, aListFollowsBad,
  aListNoCode, aListNoImplementation, aListNoTestedBy, aListCodeRefBad,
  aListStatusConflict, aListSideBad
];

const fbAlways = () => true;

const fbIdAbsent = ( aEntry ) => aEntry.bIdAbsent;

// @implements s-dila0o@c18103b
// @implements s-t8un02@9839058
// @implements s-nlm91d@4f76fd6
// @implements s-nw4u9n@3b57e9b
// @implements s-y86kt5@2649010
// @implements s-ug5kvq@0033049
// @implements s-880seq@40723b9
// @implements s-tghouh@f811aec
const vtListRefusing = [
  [ aListLinkBad, fbIdAbsent ],
  [ aListStale, fbAlways ],
  [ aListRootBad, fbIdAbsent ],
  [ aListRederive, fbAlways ],
  [ aListFollowsBad, ( aEntry ) => aEntry.bStale || aEntry.bIdAbsent ]
  , [ aListNoCode, fbAlways ], [ aListCodeRefBad, fbAlways ],
  [ aListDangling, fbAlways ],
  [ aListObsBad, fbAlways ], [ aListCitationDangling, fbAlways ],
  [ aListStatusConflict, fbAlways ],
  // @implements s-r95w4f@6a28bae
  [ aListSideBad, fbAlways ]
];

// @implements s-xuw25u@ed827df
const fbListCounts = ( aMap, aList ) => !aList.bComplete || aMap.bComplete;

// @implements s-dila0o@c18103b
// @implements s-mbcxy1@de2395f
// @implements s-b8vvpd@9e72e40
// @implements s-ug5kvq@0033049
// @implements s-n8uc4k@a405885
// @implements s-fsp1a2@02fcf0a
const fbClean = ( aMap ) => vaListFence.every(( aList ) => (
  !fbListCounts( aMap, aList ) || aMap[ aList.sKey ].length === 0
));

// @implements s-rkd937@6d33bc3
// @implements s-ins4p7@19e76c1
// @implements s-nlm91d@4f76fd6
// @implements s-y86kt5@2649010
// @implements s-ug5kvq@0033049
// @implements s-8g5yno@c3ea2a8
// @implements s-mn5and@058eb96
// @implements s-jie6z5@09cd30a
// @implements s-n1ztut@75bf716
// @tested-by test/gate.test.js#tu-83b67f71
// @tested-by test/gate.test.js#tu-602e201e
// @tested-by test/gate.test.js#tu-353c28f1
// @tested-by test/gate.test.js#tu-f5d1bd88
// @tested-by test/gate.test.js#tu-06e13c55
const fvaGateForList = ( aMap, aList, fbRefuses ) => aMap[ aList.sKey ]
  .filter(( aEntry ) => !(
    ( aList === aListUnproved || aList === aListNoImplementation )
    && aEntry.bNotImplemented
  ))
  .filter( fbRefuses )
  .map(( aEntry ) => ({
    nList: aList.nList,
    aPlace: aList.faPlace === undefined ? aEntry : aList.faPlace( aEntry ),
    sLine: "(" + aList.nList + ") " + aList.fsLine( aEntry )
  }));

// @implements s-rkd937@6d33bc3
const fzCompareGate = ( aA, aB ) => (
  aA.nList - aB.nList
  || Number(( aA.aPlace || {}).sPath > ( aB.aPlace || {}).sPath )
  - Number(( aA.aPlace || {}).sPath < ( aB.aPlace || {}).sPath )
  || (( aA.aPlace || {}).nLine || 0 ) - (( aB.aPlace || {}).nLine || 0 )
);

// @implements s-rkd937@6d33bc3
// @implements s-dila0o@c18103b
// @implements s-ol2dmr@37d4979
// @implements s-nlm91d@4f76fd6
// @implements s-y86kt5@2649010
// @implements s-kkql92@90bba2d
// @implements s-ug5kvq@0033049
const fvsLineGate = ( aMapTree, vaMapComplete ) => Array.from( new Map(
  vtListRefusing
    .flatMap(( tList ) => fvaGateForList( aMapTree, tList[ 0 ], tList[ 1 ]))
    .concat( vaMapComplete.flatMap(( aMap ) => vaListFence.flatMap((
      aList
    ) => fvaGateForList( aMap, aList, fbAlways ))))
    .map(( aGate ) => [ aGate.sLine, aGate ])
).values())
  .sort( fzCompareGate )
  .map(( aGate ) => aGate.sLine );

// @implements s-6gfnun@a16b6c1
// @implements s-qr72mj@d922238
// @implements s-e6bz23@1c07937
const fsSid = ( aModel, aStmt ) => {
  const vaLink = aModel.vaLink.filter(( aLink ) => aLink.sId === aStmt.sId );
  const vsLink = vaLink.length === 0
    ? [ "no link names " + aStmt.sId ]
    : vaLink.map(( aLink ) => (
      fsPlace( aLink ) + fsRegion( aLink ) + "  "
      + aLink.sHash + "  " + fsStateForLink( aLink )
    ));
  const vsGuard = aModel.vaGuard
    .filter(( aGuard ) => aGuard.sId === aStmt.sId )
    .map(( aGuard ) => (
      fsPlace( aGuard ) + fsRegion( aGuard ) + "  "
      + aGuard.sHash + "  " + fsStateForLink( aGuard ) + "  guard"
    ));
  const vsImplements = aModel.aLines.vaCodeRef
    .filter(( aRef ) => (
      aRef.sKind === "implements" && aRef.sTarget === aStmt.sId
    ))
    .map( fsLineSidImplements );
  return [
    fsPlace( aStmt ) + "  " + aStmt.sId + "  "
    + ( aStmt.bProbe ? "probe " : "" )
    + ( aStmt.bNotImplemented ? "not-yet-implemented " : "" )
    + fsWords( aStmt.sText )
  ].concat( vsLink, vsGuard, vsImplements ).join( "\n" ) + "\n";
};

const fsStateForCodeRef = ( aRef ) => {
  if( aRef.sReason === null ){ return "current";}
  return aRef.sReason === "stale hash" ? "stale" : aRef.sReason;
};

// @implements s-6gfnun@a16b6c1
// @implements s-e6bz23@1c07937
const fsLineSidImplements = ( aRef ) => (
  fsPlace( aRef ) + fsRegion( aRef ) + "  "
  + aRef.sStamp + "  " + fsStateForCodeRef( aRef )
  + ( aRef.bTest ? "  test" : "" )
);

const fsStateForLink = ( aLink ) => {
  if( aLink.sReason !== null ){ return aLink.sReason;}
  return aLink.bStale ? "stale" : "current";
};

// @implements s-b21zr4@c4562be
// @implements s-zybg31@316483b
const fsSuiteForPath = ( vaSuite, sPath ) => {
  const vsPart = sPath.split( "/" );
  const aSuite = vaSuite.find(( aSuiteT ) => aSuiteT.vsDir.some(( sDir ) => (
    fnPrefixMatched( vsPart, fsPosix( sDir )) >= 0
  )));
  return aSuite === undefined ? "" : aSuite.sName;
};

const fbRegionOverlapsCall = ( aRegion, aCall ) => (
  aRegion.nRegionStart < aCall.nEnd && aRegion.nRegionEnd > aCall.nStart
);

// @implements s-b21zr4@c4562be
// @implements s-zybg31@316483b
const fbLinkCoversTest = ( aModel, aLink ) => aModel.vaCallTest.some((
  aCall
) => aCall.sPath === aLink.sPath && fbRegionOverlapsCall( aLink, aCall ));

// @implements s-3oxidy@1ccac2e
// @implements s-b21zr4@c4562be
// @implements s-zybg31@316483b
// @implements s-1yuomz@b828506
const fsCrossSuite = ( aModel, vsArg, aConfig ) => fvaStmtForModel( aModel )
  .map(( aStmt ) => ({
    aStmt,
    vaLink: aModel.vaLink.filter(( aLink ) => (
      aLink.aStmt === aStmt && fbLinkCoversTest( aModel, aLink )
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

const fbCallCoveredBy = ( aCall, aStmt ) => aCall.vaStmt.includes( aStmt );

// @implements s-mp16u6@a924b32
// @implements s-ptc52y@20ab416
// @implements s-0ovkpr@5b8beb1
// @implements s-1yuomz@b828506
// @implements s-nksahd@2aa742c
const fsProbes = ( aModel ) => fvaStmtForModel( aModel )
  .filter(( aStmt ) => aStmt.bProbe )
  .map(( aStmt ) => [ fsPlace( aStmt ) + "  " + aStmt.sId ]
    .concat( aModel.vaCallTest
      .filter(( aCall ) => fbCallCoveredBy( aCall, aStmt ))
      .map(( aCall ) => "  " + fsLineForCall( aCall, "" )))
    .join( "\n" ) + "\n" )
  .join( "" );

// @implements s-wrdbhk@01b46ef
// @implements s-ihqgan@de8037f
const fvsTermForText = ( sText ) => Array.from( new Set(
  fvsSpanContent( sText ).concat( fvsMatch( reQuoted, sText ))
)).filter(( sTerm ) => sTerm.length >= cTermMin );

// @implements s-ns2gme@9b9beb2
// @implements s-wrdbhk@01b46ef
const faScoreForCall = ( aCall, vsTermStmt ) => {
  const sHay = aCall.vsNameEnclosing.concat( aCall.sBody ).join( "\n" );
  const vsTerm = vsTermStmt.filter(( sTerm ) => sHay.includes( sTerm ));
  return { aCall, vsTerm, zScore: vsTerm.length };
};

// @implements s-wrdbhk@01b46ef
const fzCompareScore = ( aA, aB ) => (
  aB.zScore - aA.zScore
  || aA.aCall.sPath.localeCompare( aB.aCall.sPath )
  || aA.aCall.nLine - aB.aCall.nLine
);

// @implements s-wrdbhk@01b46ef
// @implements s-ihqgan@de8037f
// @implements s-nc5n19@aee9454
const fsCandidates = ( aModel, aStmt ) => {
  const vsTermStmt = fvsTermForText( aStmt.sTextIncluded );
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

// @implements s-cid631@c71dd26
// @implements s-1f2z8r@e38b9ea
// @implements s-qmf2lg@5795cc1
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

// @implements s-1igmuk@d454589
const afvsSidForType = {
  p: ( aModel, aMarker ) => aModel.aLines.vaTarget
    .filter(( aTarget ) => aTarget.aMarker === aMarker )
    .flatMap(( aTarget ) => [
      aTarget.sTarget + "  " + (
        aTarget.bForm ? aTarget.sReason || "resolves" : "malformed"
      )
    ].concat( aTarget.vsChildSpec.map(( sPath ) => "  child spec: " + sPath ))),
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

// @implements s-1igmuk@d454589
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

// @implements s-eel840@1bbc17a
// @implements s-wrdbhk@01b46ef
const afsQueryForFlag = {
  "--hash": ( aModel, aStmt ) => aStmt.sHash + "\n",
  "--sid": fsSidAny,
  "--candidates": fsCandidates,
  "--root": fsRoot
};

// @implements s-kzyb2a@f30bbf3
const fsProblemForId = ( sId, cMarker ) => (
  cMarker === 0
    ? "spec-map: no spec marks " + sId + "\n"
    : "spec-map: " + sId + " is marked at " + cMarker + " places\n"
);

// @implements s-taoc14@2518951
// @implements s-2deigh@58b055c
class IdMinter {
  constructor( asBodyTaken ){
    this.asBodyTaken = asBodyTaken;
  }

  // @implements s-m69cme@f4c0170
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

// @implements s-i63o6a@6dbc87e
// @implements s-53ztk4@703b57d
const fsTextReplaced = ( sText, vaReplace ) => (
  vaReplace
    .slice()
    .sort(( aA, aB ) => aB.nOffset - aA.nOffset )
    .reduce(( sAcc, aReplace ) => (
      sAcc.slice( 0, aReplace.nOffset ) + aReplace.sText
      + sAcc.slice( aReplace.nOffset + aReplace.nLength )
    ), sText )
);

const faReplaceForEdit = ( aEdit ) => ({
  nOffset: aEdit.aMarker.nOffset,
  nLength: aEdit.aMarker.sToken.length,
  sText: aEdit.sToken
});

// @implements s-jhjrqa@2306326
// @implements s-53ztk4@703b57d
// @implements s-dglucu@bd4c60b
const fvaReplaceForInclusions = ( vaInclusion, sPath, asIdNewForMarker ) => (
  vaInclusion
    .filter(( aIncl ) => (
      aIncl.sPath === sPath
      && aIncl.sReason === null
      && aIncl.aRef.sLabel !== null
      && asIdNewForMarker.has( aIncl.aTarget )
    ))
    .map(( aIncl ) => ({
      nOffset: aIncl.nOffset,
      nLength: aIncl.sWritten.length,
      sText: "{" + asIdNewForMarker.get( aIncl.aTarget ) + "}"
    }))
);

// @implements s-jhjrqa@2306326
// @implements s-n7yhjf@0cf1206
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

// @implements s-41v1mp@51d6eb2
const fsTokenAssigned = ( aMarker, sId, sList, sTargets ) => (
  "{#" + sId
  + ( sList === null ? "" : " <" + sList )
  + ( sTargets === null ? "" : " >" + sTargets )
  + ( aMarker.sParts === null ? "" : " parts=" + aMarker.sParts )
  + ( aMarker.sSurface === null ? "" : " surface=" + aMarker.sSurface )
  + ( aMarker.bViaEarly ? fsViaToken( aMarker ) : "" )
  + ( aMarker.sFor === null ? "" : " for=" + aMarker.sFor )
  + ( aMarker.bViaEarly ? "" : fsViaToken( aMarker ))
  + ( aMarker.bProbe ? " probe" : "" )
  + ( aMarker.bNotImplemented ? " not-yet-implemented" : "" ) + "}"
);

const fsListWithArch = ( aList, vsRef ) => (
  aList.nArch < 0
    ? vsRef
    : vsRef.slice( 0, aList.nArch ).concat( sArch, vsRef.slice( aList.nArch ))
).join( "," );

// @implements s-41v1mp@51d6eb2
// @implements s-psysjj@03eca21
// @implements s-i63o6a@6dbc87e
// @implements s-taoc14@2518951
// @implements s-jhjrqa@2306326
// @implements s-n7yhjf@0cf1206
// @implements s-tzxhy9@09c0d8a
// @implements s-s0vyhy@802fc2f
// @implements s-wqdxix@ceec0e2
// @implements s-rmpj20@c3531c2
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

// @implements s-psysjj@03eca21
// @implements s-i63o6a@6dbc87e
// @implements s-s0vyhy@802fc2f
// @implements s-wqdxix@ceec0e2
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

// @implements s-2l6ys1@d966d32
const fbFileForLanguages = ( sPath, vsLanguage, sDirRoot ) => {
  const vaLanguage = vsLanguage.map(( sLanguage ) => maLanguage.get( sLanguage ))
    .filter( Boolean );
  if( vaLanguage.some(( aLanguage ) => aLanguage.vsExtension.some(( sExt ) => (
    sPath.endsWith( sExt )
  )))){ return true;}
  if( !vaLanguage.some(( aLanguage ) => (
    typeof aLanguage.fbCanReadPath === "function"
  ))){ return false;}
  let sFirstLine = "";
  let nFd;
  try{
    const vBuffer = Buffer.alloc( 4096 );
    nFd = fs.openSync( path.join( sDirRoot, sPath ), "r" );
    const cRead = fs.readSync( nFd, vBuffer, 0, vBuffer.length, 0 );
    sFirstLine = vBuffer.toString( "utf8", 0, cRead ).split( "\n", 1 )[ 0 ];
  } catch( xError ){
    return false;
  } finally {
    if( nFd !== undefined ){ fs.closeSync( nFd );}
  }
  return vaLanguage.some(( aLanguage ) => {
    if( typeof aLanguage.fbCanReadPath !== "function"
      || !aLanguage.fbCanReadPath( sPath, sFirstLine )
    ){ return false;}
    if( !aLanguage.fbRequiresExecutable ){ return true;}
    try{
      return ( fs.statSync( path.join( sDirRoot, sPath )).mode & 0o111 ) !== 0;
    } catch( xError ){
      return false;
    }
  });
};

class TreeReader {
  constructor( sDirRoot, aConfig, aParseCache ){
    this.sDirRoot = sDirRoot;
    this.aConfig = aConfig;
    this.aParseCache = aParseCache;
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
      .map(( sPath ) => this.faFile( sPath ));
  }

  faFile( sPath ){
    const sPathFull = path.join( this.sDirRoot, sPath );
    const stat = fs.statSync( sPathFull, { bigint: true });
    let bRead = false;
    let sText;
    return {
      sPath,
      nSize: stat.size.toString(),
      sMtimeNs: stat.mtimeNs.toString(),
      get sText(){
        if( !bRead ){
          sText = fs.readFileSync( sPathFull, "utf8" );
          bRead = true;
        }
        return sText;
      }
    };
  }

  // @implements s-n7ky2n@7cec1a6
  // @implements s-6rfqdf@00eba76
  // @implements s-yurmkw@ee703cc
  // @implements s-x1kbkj@fff57a4
  // @implements s-ky5glg@98fd470
  // @implements s-omlrtx@0e5e677
  fvaSpec(){
    const vsDirSpecs = this.fvsDirExpanded( this.aConfig.dirs_specs || [
      sDirSpecs
    ]);
    const vsDirIntents = this.fvsDirExpanded(
      this.aConfig.dirs_intents || []
    );
    const vsDirGuidance = this.fvsDirExpanded(
      this.aConfig.dirs_guidance || []
    );
    const vsPath = Array.from( new Set(
      vsDirSpecs.concat( vsDirIntents, vsDirGuidance )
      .flatMap(( sDir ) => (
      this.fvsPathUnder( sDir, ( sPath ) => sPath.endsWith( ".md" ))
    )).filter(( sPath ) => !this.fbUnderChildProject( sPath )).values()));
    return this.fvaFile( vsPath );
  }

  // @implements s-n7ky2n@7cec1a6
  // @implements s-6rfqdf@00eba76
  // @implements s-ky5glg@98fd470
  fbPathInSpec( sPath ){
    const sPathClean = fsPathClean( sPath );
    return !this.fbUnderChildProject( sPathClean )
      && this.fvsDirExpanded(
        ( this.aConfig.dirs_specs || [ sDirSpecs ]).concat(
          this.aConfig.dirs_intents || []
        ).concat(
          this.aConfig.dirs_guidance || []
        )
      )
      .some(( sDir ) => {
        const sDirClean = fsPathClean( sDir );
        return sPathClean === sDirClean
          || sPathClean.startsWith( sDirClean + "/" );
      });
  }

  // @implements s-n7ky2n@7cec1a6
  fbUnderChildProject( sPath ){
    const vsSegment = fsPathClean( sPath ).split( "/" );
    return vsSegment.slice( 1 ).some(( _, n ) => {
      const sDir = vsSegment.slice( 0, n + 1 ).join( "/" );
      const sPathConfig = path.join( this.sDirRoot, sDir, sFileConfig );
      return fs.existsSync( sPathConfig )
        && fs.statSync( sPathConfig ).isFile();
    });
  }

  // @implements s-n7ky2n@7cec1a6
  // @implements s-j8ahje@91cc810
  // @implements s-dhs2hx@db209fb
  // @implements s-9zllrl@4304abd
  // @implements s-x1kbkj@fff57a4
  fvaSpecCollection( sTarget ){
    const vsTarget = sTarget.split( "/" ).filter( Boolean );
    const sDirSpecsChild = vsTarget.at( -1 );
    const sPrefix = vsTarget.slice( 0, -2 ).join( "/" );
    const vsRoot = this.configReader.fvsDirChild(
      sPrefix.replace( /\/$/, "" ), this.aConfig.vsDirIgnored
    );
    const vsPath = [];
    for( const sRoot of vsRoot ){
      const configReaderChild = new ConfigReader(
        path.join( this.sDirRoot, sRoot )
      );
      const aChild = configReaderChild.faConfig();
      if( aChild.sProblem !== null ){
        return {
          vsPath: [],
          sReason: "matched directory is not a child project with a specs directory"
        };
      }
      const vsChildSpecRoots = aChild.aConfig.dirs_specs.flatMap((
        sPattern
      ) => configReaderChild.fvsDirExpanded(
        sPattern, aChild.aConfig.vsDirIgnored
      )).map( fsPosix );
      if( !vsChildSpecRoots.includes( sDirSpecsChild )){
        return {
          vsPath: [],
          sReason: "child project does not declare the collection spec directory"
        };
      }
      const sDirSpec = path.join( sRoot, sDirSpecsChild );
      const sDirSpecAbs = path.join( this.sDirRoot, sDirSpec );
      if( !fs.existsSync( sDirSpecAbs )
        || !fs.statSync( sDirSpecAbs ).isDirectory()
      ){
        return { vsPath: [], sReason: "matched child project has no specs directory" };
      }
      const vsFile = fs.readdirSync(
        sDirSpecAbs, { recursive: true }
      ).map(( sFile ) => path.join( sDirSpec, sFile ))
        .filter(( sPathFile ) => sPathFile.endsWith( ".md" ))
        .filter(( sPathFile ) => fs.statSync(
          path.join( this.sDirRoot, sPathFile )
        ).isFile());
      if( vsFile.length === 0 ){
        return { vsPath: [], sReason: "matched child project has no .md spec file" };
      }
      vsPath.push( ...vsFile.map( fsPosix ));
    }
    return { vsPath: vsPath.sort(), sReason: null };
  }

  fvsDirExpanded( vsPattern ){
    return vsPattern.flatMap(( sPattern ) => this.configReader.fvsDirExpanded(
      sPattern, this.aConfig.vsDirIgnored
    ));
  }

// @implements s-3oxidy@1ccac2e
  // @implements s-50dzy6@3c05a41
  // @implements s-te9wza@59881f7
  // @implements s-2l6ys1@d966d32
  // @implements s-k3nucf@c0c7bf2
  fvaTest(){
    const bTestLanguage = this.aConfig.vsLanguage.some(( sLanguage ) => (
      ( maLanguage.get( sLanguage ) || { fbHasTestFiles: () => false })
        .fbHasTestFiles()
    ));
    const vaTestLanguage = this.aConfig.vsLanguage.map(( sLanguage ) => (
      maLanguage.get( sLanguage )
    )).filter( Boolean );
    const vsDirSuite = this.fvsDirExpanded(
      this.aConfig.vaSuite.flatMap(( aSuite ) => aSuite.vsDir )
    );
    return this.fvaFile( Array.from( new Set(
      vsDirSuite.flatMap(( sDir ) => this.fvsPathUnder( sDir, ( sPath ) => (
        bTestLanguage && vaTestLanguage.some(( aLanguage ) => (
          fbTestPathForLanguage( aLanguage, sPath )
        ))
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

  fyBytesAt( sPath ){
    return this.fsKind( sPath ) === "file"
      ? fs.readFileSync( path.resolve( this.sDirRoot, sPath ))
      : null;
  }

  // @implements s-yecw0i@c83eff2
  // @implements s-m4fr78@238c65f
  // @implements s-pkmrq7@79d0e81
  // @implements s-hux5ev@ce910fd
  // @implements s-wt7bpq@73556cf
  faSidecars( vsPath, fbFileRead, vsTestPath ){
    const vaSide = [];
    const vaSideBad = [];
    vsPath.filter(( sPath ) => sPath.endsWith( ".concord" )).forEach((
      sPathSidecar
    ) => {
      const sPath = fsPosix( sPathSidecar );
      const sPathFile = sPath.slice( 0, -".concord".length );
      const sKind = this.fsKind( sPathFile );
      // @implements s-zpv3y7@dc2aae2
      const sState = sKind === null ? "absent"
        : sKind !== "file" ? "not a regular file"
        : sPathFile.endsWith( ".concord" ) ? "side file"
          : vsTestPath.has( sPathFile ) ? "test file"
            : fbFileRead( sPathFile ) ? "commentable" : "read";
      if( sState !== "read" ){
        // @implements s-v7ww36@641e899
        vaSideBad.push({ sPath, sState });
        return;
      }
      const aSide = this.faFile( sPath );
      const sTargetText = this.fsTextAt( sPathFile );
      // @implements s-i13kgq@b2a9854
      const aOverlay = faOverlay(
        sTargetText, sPathFile, sPath, aSide.sText
      );
      if( !aOverlay.bOk ){
        vaSideBad.push({ sPath, sState: aOverlay.sReason });
        return;
      }
      const stat = fs.statSync(
        path.join( this.sDirRoot, sPathSidecar ), { bigint: true }
      );
      vaSide.push({
        sPath: sPathFile,
        bSide: true,
        sPathSidecar: sPath,
        nSize: stat.size.toString(),
        sMtimeNs: stat.mtimeNs.toString(),
        sText: aOverlay.sText,
        sTextSidecar: aSide.sText,
        sTextTarget: sTargetText,
        vaOverlayDirective: aOverlay.vaDirective,
        vnLineMap: aOverlay.vnLineMap
      });
    });
    return { vaSide, vaSideBad };
  }

  fvsPathFile( sDirRel ){
    return this.fvsPathWalk( sDirRel ).map( fsPosix ).sort();
  }

  // @implements s-b0mknl@02d4cb5
  fWriteAt( sPath, sText ){
    const sPathFull = path.resolve( this.sDirRoot, sPath );
    fs.mkdirSync( path.dirname( sPathFull ), { recursive: true });
    fs.writeFileSync( sPathFull, sText );
  }

  // @implements s-nrp172@56b8541
  // @implements s-pkmrq7@79d0e81
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

  // @implements s-nrp172@56b8541
  // @implements s-z28ucn@585ecdf
  // @implements s-2l6ys1@d966d32
  // @implements s-m4fr78@238c65f
  // @implements s-pkmrq7@79d0e81
  faFilesRead(){
    const vsDirSuite = this.fvsDirExpanded(
      this.aConfig.vaSuite.flatMap(( aSuite ) => aSuite.vsDir )
    );
    const vsPathRead = Array.from( new Set(
      this.fvsDirExpanded( this.aConfig.vsDirRead )
        .flatMap(( sDir ) => this.fvsPathWalk( sDir ))
        .filter(( sPath ) => fbFileForLanguages(
          sPath, this.aConfig.vsLanguage, this.sDirRoot
        ))
    )).sort();
    const vsPathTree = Array.from( new Set(
      this.fvsDirExpanded( this.aConfig.vsDirRead )
        .flatMap(( sDir ) => this.fvsPathWalk( sDir ))
    )).sort();
    const { vaSide, vaSideBad } = this.faSidecars(
      vsPathTree, ( sPath ) => fbFileForLanguages(
        sPath, this.aConfig.vsLanguage, this.sDirRoot
      ),
      new Set( this.fvaTest().map(( aFile ) => fsPosix( aFile.sPath )))
    );
    const vaGuided = this.fvaFile( vsPathRead ).concat( vaSide );
    return {
      vaGuided,
      vaCiter: vaGuided.filter(( aFile ) => aFile.bSide || !vsDirSuite.some(( sDir ) => (
        aFile.sPath === sDir || aFile.sPath.startsWith( sDir + path.sep )
      ))),
      vaSideBad
    };
  }

  fvaFileCiting(){
    const vsDir = this.fvsDirExpanded( this.aConfig.vsDirRead.concat(
      this.aConfig.vaSuite.flatMap(( aSuite ) => aSuite.vsDir )
    ));
    return this.fvaFile( Array.from( new Set(
      vsDir
        .flatMap(( sDir ) => this.fvsPathWalk( sDir ))
        .filter(( sPath ) => fbFileForLanguages(
          sPath, this.aConfig.vsLanguage, this.sDirRoot
        ))
    )).sort()).map(( aFile ) => this.faFile( fsPosix( aFile.sPath )));
  }

  faObservationFile(){
    const sPath = this.aConfig.sPathObservations;
    // @implements s-89dowx@1de93c2
    // @tested-by test/observations.test.js#tu-6387259b
    if( sPath === undefined ){ return null;}
    // @implements s-jt2a2g@6926fb1
    // @tested-by test/observations.test.js#tu-dcefd22c
    const sText = this.fsTextAt( sPath );
    return sText === null ? null : { sPath, sText };
  }

  // @implements s-0w4rbg@75d948e
  // @tested-by test/observations.test.js#tu-eb929abd
  faObservationInput(){
    const aFile = this.faObservationFile();
    return {
      sPathObs: aFile === null ? null : aFile.sPath,
      sTextObs: aFile === null ? null : aFile.sText,
      vaRules: ( this.aConfig.vsPathRules || []).map(( sPath ) => ({
        sPath, sText: this.fsTextAt( sPath )
      })),
      vaCode: this.fvaFileCiting()
    };
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
  ...reader.faFilesRead(),
  vaRecord: reader.fvaRecord(),
  fbExists: ( sPath ) => reader.fbExists( sPath ),
  aFiles: reader,
  aObsInput: reader.faObservationInput(),
  aParseCache: reader.aParseCache
});

// @implements s-7bh252@2251185
// @tested-by test/context.test.js#tu-1bc190a8
const faContextModel = ( sDirRoot ) => {
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  if( aRead.sProblem !== null ){ return { sProblem: aRead.sProblem };}
  const aParseCache = new ParseCache(
    sDirRoot, fsFingerprintParser( aRead.aConfig )
  );
  const reader = new TreeReader( sDirRoot, aRead.aConfig, aParseCache );
  const aModel = faModelForReader( reader, true );
  const maTestText = new Map(
    reader.fvaTest().map(( aFile ) => [ fsPosix( aFile.sPath ), aFile.sText ])
  );
  aModel.vaTestParsed.forEach(( aTest ) => {
    aTest.sText = maTestText.get( fsPosix( aTest.sPath ));
  });
  aParseCache.fSave();
  return {
    sProblem: null,
    reader,
    aModel
  };
};

// @implements s-taoc14@2518951
// @implements s-2deigh@58b055c
const fasBodyTaken = ( vaSpec, aModel ) => new Set(
  vaSpec
    .flatMap(( aSpec ) => Array.from(
      aSpec.sText.matchAll( reBodyAny ), ( vs ) => vs[ 1 ]
    ))
    .concat( aModel.vaMarker
      .map(( aMarker ) => aMarker.sBody )
      .filter( Boolean ))
);

const fvsLineAssignObservations = ( reader, aModel, minter ) => {
  const aFile = reader.faObservationFile();
  if( aFile === null ){ return [];}
  const aAssign = faAssignObservations(
    aFile,
    () => minter.fsId( "o" ),
    faKitForModel( aModel, () => false )
  );
  if( aAssign.bChanged ){ reader.fWriteAt( aFile.sPath, aAssign.sText );}
  return aAssign.vsLine;
};

// @implements s-j8bplx@3ec574d
const vsKindRetypableCode = [ "implements", "checks" ];

// @implements s-m9jtjo@3366616
const fvaCodeReferenceRetyped = ( aModel, aFile ) => (
  fvaCodeReferenceForFile( aFile )
    .filter(( aRef ) => aRef.bWell
      && vsKindRetypableCode.includes( aRef.sKind ))
    .map(( aRef ) => ({
      ...aRef,
      sIdRetyped: faLineForId( aModel, aRef.sTarget ).sIdRetyped
    }))
    .filter(( aRef ) => aRef.sIdRetyped !== null )
);

// @implements s-m9jtjo@3366616
const fsCodeTextRetyped = ( sText, vaRef ) => sText.split( "\n" )
  .map(( sLine, n ) => vaRef
    .filter(( aRef ) => aRef.nLine === n + 1 )
    .reduce(( sAcc, aRef ) => sAcc.replace(
      new RegExp( "(@" + aRef.sKind + "\\s+)" + aRef.sTarget ),
      "$1" + aRef.sIdRetyped
    ), sLine ))
  .join( "\n" );

// @implements s-j8bplx@3ec574d
// @implements s-i63o6a@6dbc87e
// @implements s-m9jtjo@3366616
// @implements s-rmpj20@c3531c2
const fvsLineAssignCode = ( reader, aModel ) => {
  const aRead = reader.faFilesRead();
  return aRead.vaCiter
    .slice()
    .sort(( aA, aB ) => (
      ( aA.bSide ? aA.sPathSidecar : aA.sPath ).localeCompare(
        aB.bSide ? aB.sPathSidecar : aB.sPath
      )
    ))
    .flatMap(( aFile ) => {
      const vaRef = fvaCodeReferenceRetyped( aModel, aFile );
      if( vaRef.length === 0 ){ return [];}
      const sPath = aFile.bSide ? aFile.sPathSidecar : aFile.sPath;
      reader.fWriteText( sPath, fsCodeTextRetyped(
        aFile.bSide ? aFile.sTextSidecar : aFile.sText, vaRef
      ));
      return vaRef.map(( aRef ) => fsRewritten(
        aRef.sPath, aRef.nLine, aRef.sTarget, aRef.sIdRetyped
      ));
    });
};

// @implements s-a40yzg@5e808cd
// @implements s-h5caok@17c696d
// @implements s-yurmkw@ee703cc
// @implements s-rapf8f@dd2cbd3
// @implements s-psysjj@03eca21
// @implements s-j8bplx@3ec574d
// @implements s-ar1i87@b6009f5
// @implements s-i63o6a@6dbc87e
// @implements s-taoc14@2518951
// @implements s-jhjrqa@2306326
// @implements s-n7yhjf@0cf1206
// @implements s-tzxhy9@09c0d8a
// @implements s-2deigh@58b055c
// @implements s-pe5j7a@8fee8c2
// @implements s-wqdxix@ceec0e2
// @tested-by test/observations.test.js#tu-576b8559
// @tested-by test/observations.test.js#tu-85136f22
const fzAssign = ( reader, fWrite ) => {
  const vaSpec = reader.fvaSpec();
  const aRead = reader.faFilesRead();
  const aModel = faModel({
    vaSpec, vaTest: [], ...aRead,
    aFiles: reader,
    aParseCache: reader.aParseCache
  });
  const aRoots = faRoots( aModel, new Set());
  const aFileObs = reader.faObservationFile();
  const minter = new IdMinter( fasBodyTaken(
    aFileObs === null ? vaSpec : vaSpec.concat( aFileObs ), aModel
  ));
  const asIdNewForMarker = new Map(
    aModel.vaMarker
      .filter(( aMarker ) => aMarker.bPlaceholder && !aMarker.bMalformed )
      .map(( aMarker ) => [ aMarker, minter.fsId( aMarker.sType )])
  );
  const vsLine = vaSpec.flatMap(( aSpec ) => {
    const sPath = fsPosix( aSpec.sPath );
    const vaEdit = fvaEditForSpec(
      aModel,
      aModel.vaMarker.filter(( aMarker ) => aMarker.sPath === sPath ),
      aRoots,
      asIdNewForMarker
    );
    const vaReplace = vaEdit.map( faReplaceForEdit ).concat(
      fvaReplaceForInclusions( aRoots.vaInclusion, sPath, asIdNewForMarker )
    );
    if( vaReplace.length > 0 ){
      reader.fWriteText( aSpec.sPath, fsTextReplaced( aSpec.sText, vaReplace ));
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
  fWrite( vsLine.concat(
    fvsLineAssignCode( reader, aModel ),
    fvsLineAssignObservations( reader, aModel, minter )
  ).join( "" ));
  return 0;
};

const fsHashDerivedFor = ( aMarker, sLabel ) => fsHashForText( fsNormal(
  aMarker.sTextIncluded + " applied to the " + sLabel + "."
));

// @implements s-5fldjm@514a40a
// @implements s-iwko4c@581c6c6
const fbSplittable = ( aModel, aMarker ) => (
  aMarker.sType === "s"
  && !aMarker.bMalformed
  && aMarker.sId !== null
  && aModel.avaMarkerForId.get( aMarker.sId ).length === 1
  && fvsPartForMarker( aMarker ) !== null
);

// @implements s-5fldjm@514a40a
const faSplitForMarker = ( aMarker, minter ) => ({
  aMarker,
  vtLabel: fvsPartForMarker( aMarker ).map(( sLabel ) => [
    sLabel, minter.fsId( "s" )
  ])
});

const fsBulletForBlock = ( aBlock, sLine ) => {
  const vsBullet = aBlock.sKind === "bullet"
    ? sLine.match( reBlockBullet )
    : null;
  const sBullet = vsBullet === null ? "*" : vsBullet[ 0 ].trim();
  return "*-+".includes( sBullet ) ? sBullet : "*";
};

// @implements s-5fldjm@514a40a
const fvsLineForSplit = ( aSpec, aSplit ) => {
  const aBlock = aSpec.vaBlock[ aSplit.aMarker.nBlock ];
  const sFirst = aSpec.vsLine[ aBlock.vnLine[ 0 ]];
  const sLead = sFirst.match( /^\s*/ )[ 0 ]
    + fsBulletForBlock( aBlock, sFirst );
  return aSplit.vtLabel.map(([ sLabel, sId ]) => (
    sLead + " {#" + sId + " surface=" + sLabel
    + ( aSplit.aMarker.bProbe ? " probe" : "" ) + "} {"
    + aSplit.aMarker.sId + "} applied to the " + sLabel + "."
  ));
};

// @implements s-5fldjm@514a40a
const fvsLineSplit = ( aSpec, vaSplit ) => {
  const vnLineStart = fvnLineStart( aSpec.vsLine );
  const vvsLine = aSpec.vsLine.map(( sLine ) => [ sLine ]);
  vaSplit
    .slice()
    .sort(( aA, aB ) => aB.aMarker.nOffset - aA.aMarker.nOffset )
    .forEach(( aSplit ) => {
      const aMarker = aSplit.aMarker;
      const nLine = aMarker.nLine - 1;
      const nCol = aMarker.nOffset - vnLineStart[ nLine ];
      const vsHere = vvsLine[ nLine ];
      vsHere[ 0 ] = vsHere[ 0 ].slice( 0, nCol )
        + aMarker.sToken.replace( " parts=" + aMarker.sParts, "" )
        + vsHere[ 0 ].slice( nCol + aMarker.sToken.length );
      const aBlock = aSpec.vaBlock[ aMarker.nBlock ];
      vvsLine[ aBlock.vnLine[ aBlock.vnLine.length - 1 ]].splice(
        1, 0, ...fvsLineForSplit( aSpec, aSplit )
      );
    });
  return vvsLine.flat();
};

// @implements s-y5buk6@917c800
const fvsOutForSpecSplit = ( aSpec, vaSplit, vsLine ) => vaSplit.flatMap((
  aSplit
) => aSplit.vtLabel.map(([ sLabel, sId ]) => (
  aSpec.sPath + ":"
  + ( vsLine.findIndex(( sLine ) => sLine.includes( "{#" + sId + " " )) + 1 )
  + "  " + sId + "  " + aSplit.aMarker.sId + "  " + sLabel + "\n"
)));

// @implements s-4y7ukm@b763556
const fsByHand = ( sPath, nLine, sId ) => (
  sPath + ":" + nLine + "  " + sId + "  by hand\n"
);

// @implements s-y5buk6@917c800
const fsRewritten = ( sPath, nLine, sIdOld, sIdNew ) => (
  sPath + ":" + nLine + "  " + sIdOld + " -> " + sIdNew + "\n"
);

// @implements s-6ujq8d@696a8e1
// @implements s-rn2itq@10cc3ef
const fsHashSplit = ( aSplit, sLabel, sHashRecorded ) => (
  sHashRecorded === aSplit.aMarker.sHash
    ? fsHashDerivedFor( aSplit.aMarker, sLabel )
    : sHashRecorded
);

// @implements s-6ujq8d@696a8e1
// @implements s-rn2itq@10cc3ef
const fsIdForLabel = ( aSplit, sLabel ) => {
  const tLabel = aSplit.vtLabel.find(( t ) => t[ 0 ] === sLabel );
  return tLabel === undefined ? null : tLabel[ 1 ];
};

// @implements s-rn2itq@10cc3ef
const fbCallsShareRegion = ( vaCall, aRegionA, aRegionB ) => vaCall.some((
  aCall
) => (
  aCall.sKind === "test"
  && fbRegionOverlapsCall( aRegionA, aCall )
  && fbRegionOverlapsCall( aRegionB, aCall )
));

// @implements s-3rhim7@92937b7
class TestSplitter {
  constructor( aFile, asplitForId ){
    this.aTest = faParseTest( aFile );
    this.sPath = this.aTest.sPath;
    this.vvsLine = aFile.sText.split( "\n" ).map(( sLine ) => [ sLine ]);
    this.asplitForId = asplitForId;
    this.vsOut = [];
    this.vsByHand = [];
    this.bChanged = false;
  }

  // @implements s-4y7ukm@b763556
  // @implements s-6ujq8d@696a8e1
  fLink( aLink ){
    if( aLink.sPart === null ){ return;}
    const aSplit = this.asplitForId.get( aLink.sId );
    const sIdNew = aSplit === undefined
      ? null
      : fsIdForLabel( aSplit, aLink.sPart );
    if( sIdNew === null ){
      this.vsByHand.push( fsByHand( this.sPath, aLink.nLine, aLink.sId ));
      return;
    }
    const vsHere = this.vvsLine[ aLink.nLine - 1 ];
    vsHere[ 0 ] = vsHere[ 0 ].replace( reLinkPart, ( s, sPrefix ) => (
      sPrefix + sIdNew + "@" + fsHashSplit( aSplit, aLink.sPart, aLink.sHash )
    ));
    this.bChanged = true;
    this.vsOut.push( fsRewritten( this.sPath, aLink.nLine, aLink.sId, sIdNew ));
  }

  // @implements s-4y7ukm@b763556
  fGuard( aGuard ){
    if( this.asplitForId.has( aGuard.sId ) || aGuard.sPart !== null ){
      this.vsByHand.push( fsByHand( this.sPath, aGuard.nLine, aGuard.sId ));
    }
  }

  // @implements s-4y7ukm@b763556
  // @implements s-rn2itq@10cc3ef
  // @implements s-9bzl8i@64430ba
  fImplements( aImpl ){
    const aSplit = this.asplitForId.get( aImpl.sId );
    if( aSplit === undefined ){ return;}
    const vsLabel = aSplit.vtLabel.map(( t ) => t[ 0 ]).filter(( sLabel ) => (
      this.aTest.vaLink.some(( aLink ) => (
        aLink.sId === aImpl.sId && aLink.sPart === sLabel
        && fbCallsShareRegion( this.aTest.vaCall, aLink, aImpl )
      ))
    ));
    if( !aImpl.bWell || vsLabel.length === 0 ){
      this.vsByHand.push( fsByHand( this.sPath, aImpl.nLine, aImpl.sId ));
      return;
    }
    const sLine = this.vvsLine[ aImpl.nLine - 1 ][ 0 ];
    this.vvsLine[ aImpl.nLine - 1 ] = vsLabel.map(( sLabel ) => {
      const sIdNew = fsIdForLabel( aSplit, sLabel );
      this.vsOut.push(
        fsRewritten( this.sPath, aImpl.nLine, aImpl.sId, sIdNew )
      );
      return sLine.replace( /@implements +\S+/, "@implements " + sIdNew + "@"
        + fsHashSplit( aSplit, sLabel, aImpl.sHash ));
    });
    this.bChanged = true;
  }

  faSplit(){
    [
      [ this.aTest.vaImplements, ( a ) => this.fImplements( a ) ],
      [ this.aTest.vaLink, ( a ) => this.fLink( a ) ],
      [ this.aTest.vaGuard, ( a ) => this.fGuard( a ) ]
    ]
      .flatMap(([ vaRef, fRef ]) => vaRef.map(( aRef ) => [ aRef, fRef ]))
      .sort(( tA, tB ) => tA[ 0 ].nLine - tB[ 0 ].nLine )
      .forEach(([ aRef, fRef ]) => fRef( aRef ));
    return {
      sText: this.bChanged ? this.vvsLine.flat().join( "\n" ) : null,
      vsOut: this.vsOut,
      vsByHand: this.vsByHand
    };
  }
}

// @implements s-iwko4c@581c6c6
const fsErrForPartList = ( aMarker ) => (
  "spec-map: " + fsPlace( aMarker ) + "  " + aMarker.sToken
  + "  part list left as written: "
  + ( aMarker.bPlaceholder || aMarker.sId === null
    ? "on a placeholder"
    : "not two or more distinct labels of lowercase letters, digits or -" )
  + "\n"
);

// @implements s-yurmkw@ee703cc
// @implements s-2deigh@58b055c
// @implements s-4y7ukm@b763556
// @implements s-5fldjm@514a40a
// @implements s-4qpk97@7e4bb82
// @implements s-ol3soy@d2da0a6
// @implements s-9bzl8i@64430ba
// @implements s-iwko4c@581c6c6
// @implements s-y5buk6@917c800
// @implements s-gy5mqc@76d7988
const fzSplitParts = ( reader, fWrite, fWriteErr ) => {
  const vaSpec = reader.fvaSpec();
  const aInput = faInputForReader( reader, vaSpec );
  const vaTest = aInput.vaTest;
  const aModel = faModel( aInput );
  const aFileObs = reader.faObservationFile();
  const minter = new IdMinter( fasBodyTaken(
    aFileObs === null ? vaSpec : vaSpec.concat( aFileObs ), aModel
  ));
  const vaMarkerParts = aModel.vaMarker.filter(( aMarker ) => (
    aMarker.sParts !== null
  ));
  const vaSplit = vaMarkerParts
    .filter(( aMarker ) => fbSplittable( aModel, aMarker ))
    .map(( aMarker ) => faSplitForMarker( aMarker, minter ));
  const asplitForId = new Map( vaSplit.map(( aSplit ) => [
    aSplit.aMarker.sId, aSplit
  ]));
  const vsOutSpec = aModel.vaSpecParsed.flatMap(( aSpec ) => {
    const vaSplitHere = vaSplit.filter(( aSplit ) => (
      aSplit.aMarker.sPath === aSpec.sPath
    ));
    if( vaSplitHere.length === 0 ){ return [];}
    const vsLine = fvsLineSplit( aSpec, vaSplitHere );
    reader.fWriteText( aSpec.sPath, vsLine.join( "\n" ));
    return fvsOutForSpecSplit( aSpec, vaSplitHere, vsLine );
  });
  const vaTestSplit = vaTest.map(( aFile ) => ({
    sPath: aFile.sPath, ...new TestSplitter( aFile, asplitForId ).faSplit()
  }));
  vaTestSplit
    .filter(( aEntry ) => aEntry.sText !== null )
    .forEach(( aEntry ) => reader.fWriteText( aEntry.sPath, aEntry.sText ));
  const vsByHandCode = aModel.aLines.vaCodeRef
    .filter(( aRef ) => (
      aRef.sKind === "implements" && !aRef.bTest
      && asplitForId.has( aRef.sTarget )
    ))
    .map(( aRef ) => fsByHand( aRef.sPath, aRef.nLine, aRef.sTarget ));
  fWrite( vsOutSpec.concat(
    vaTestSplit.flatMap(( aEntry ) => aEntry.vsOut ),
    vsByHandCode,
    vaTestSplit.flatMap(( aEntry ) => aEntry.vsByHand )
  ).join( "" ));
  const vaMarkerLeft = vaMarkerParts.filter(( aMarker ) => (
    !vaSplit.some(( aSplit ) => aSplit.aMarker === aMarker )
  ));
  fWriteErr( vaMarkerLeft.map( fsErrForPartList ).join( "" ));
  return vaMarkerLeft.length === 0 ? 0 : 1;
};

const fsProblemForType = ( sId, sType ) => (
  "spec-map: " + sId + " is a line of type " + fsTypeLine( sType ) + "\n"
);

const reIdObservation = /^o-/;

// @implements s-p79bim@05302e1
// @tested-by test/observations.test.js#tu-cd11334f
// @tested-by test/observations.test.js#tu-7ebb5201
const fzSidObservation = ( reader, sId, fWrite, fWriteErr ) => {
  const aModel = faModelForReader( reader, true );
  const fbSatisfied = faRoots( aModel, fasIdProved( aModel )).fbSatisfied;
  const aSid = faSidObservation(
    faObservationsForModel( aModel, fbSatisfied ),
    sId,
    faKitForModel( aModel, fbSatisfied )
  );
  if( aSid.sErr !== null ){
    fWriteErr( aSid.sErr );
    return 1;
  }
  fWrite( aSid.sOut );
  return 0;
};

// @implements s-1jdhhf@941303a
// @implements s-kz8d46@36aef0d
// @implements s-1igmuk@d454589
// @implements s-6gfnun@a16b6c1
// @implements s-eel840@1bbc17a
// @implements s-kzyb2a@f30bbf3
// @implements s-1f2z8r@e38b9ea
const fzQuery = ( reader, vsArg, fWrite, fWriteErr ) => {
  if( vsArg[ 0 ] === "--sid" && reIdObservation.test( vsArg[ 1 ] || "" )){
    return fzSidObservation( reader, vsArg[ 1 ], fWrite, fWriteErr );
  }
  const aModel = vsArg[ 0 ] === "--hash"
    ? faModel({
      vaSpec: reader.fvaSpec(),
      vaTest: [],
      aParseCache: reader.aParseCache
    })
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

// @implements s-trjdbr@93aa3fd
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

// @implements s-31cdr2@9bb914f
// @implements s-s8an6z@bb4aac8
// @implements s-xsbw7s@7a18f8e
// @implements s-rypq7c@adb23df
// @implements s-khy3o7@2aa742c
// @implements s-6umdw1@f9827d2
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

// @implements s-v5vfac@ccc50fe
// @implements s-k4mfcb@f02be14
const fsViaShown = ( aMarker ) => (
  aMarker.bViaPrompt ? " via=" + sViaPrompt : ""
);

const fbForAudience = ( aMarker, sFor ) => (
  ( aMarker.sFor || "" ).split( "," ).includes( sFor )
);

// @implements s-m4hujx@1ae0005
// @implements s-trjdbr@93aa3fd
// @implements s-3g9qus@2aa742c
// @implements s-1xpgsb@4b63213
// @implements s-6umdw1@f9827d2
// @implements s-k4mfcb@f02be14
// @implements s-zi228u@46140ad
// @implements s-zx5mcq@5669484
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

// @implements s-zybg31@316483b
const afsListForFlag = {
  "--cross-suite": fsCrossSuite,
  // @implements s-0ovkpr@5b8beb1
  "--probes": fsProbes,
  "--interactive": fsInteractive,
  "--guidance": fsGuidance
};

// @implements s-31cdr2@9bb914f
// @implements s-rypq7c@adb23df
// @implements s-khy3o7@2aa742c
// @implements s-nksahd@2aa742c
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
  ...reader.faFilesRead(),
  vaRecord: reader.fvaRecord(),
  fbExists: ( sPath ) => reader.fbExists( sPath ),
  aFiles: reader,
  aParseCache: reader.aParseCache
});

// @implements s-j0u6oi@c752acc
const fsProblemForCheckId = ( aModel, sId ) => {
  const vaMarker = aModel.avaMarkerForId.get( sId ) || [];
  if( vaMarker.length !== 1 ){ return fsProblemForId( sId, vaMarker.length );}
  return vaMarker[ 0 ].sType === "i"
    ? null
    : fsProblemForType( sId, vaMarker[ 0 ].sType );
};

// @implements s-khw3hm@18fc4f5
const fasHashForTargets = ( aMarker, hasher ) => Object.fromEntries(
  Array.from( new Set( hasher.aModel.vaCodeRef
    .filter(( aRef ) => aRef.sKind === "checks" && aRef.sReason === null
      && aRef.sId === aMarker.sId )
    .map(( aRef ) => aRef.sPathCode || aRef.sPath )))
    .map(( sTarget ) => [
      sTarget, hasher.fsHashForCheckTarget( sTarget, aMarker.sId )
    ])
);

// @implements s-khw3hm@18fc4f5
// @implements s-ggobif@5312bb8
const faRecordFor = ( aMarker, hasher, sVerdict, sNote ) => ({
  sId: aMarker.sId,
  sHash: aMarker.sHash,
  sVerdict,
  sDate: fsDateToday(),
  sNote,
  asHashForTarget: fasHashForTargets( aMarker, hasher )
});

// @implements s-yurmkw@ee703cc
// @implements s-iz8176@bb80e0d
// @implements s-khw3hm@18fc4f5
// @implements s-ggobif@5312bb8
// @implements s-j0u6oi@c752acc
// @implements s-6umdw1@f9827d2
// @implements s-rzwovs@5b76e45
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

// @implements s-21250a@9a79a7a
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

// @implements s-hiu3ve@27db7b5
const faRecordForAnswer = ( aAnswer ) => ({
  sId: aAnswer.sId,
  sHash: aAnswer.sHash,
  sVerdict: aAnswer.sKey,
  sDate: fsDateToday(),
  sNote: aAnswer.sNote,
  asHashForTarget: aAnswer.asHashForTarget
});

// @implements s-yurmkw@ee703cc
// @implements s-1r46le@6aec157
// @implements s-hiu3ve@27db7b5
// @implements s-21250a@9a79a7a
// @implements s-rzwovs@5b76e45
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

// @implements s-d0p52k@8a9d95e
// @implements s-g8h2jz@c4623dc
const fsReasonForReset = ( aCheck ) => {
  if( aCheck.aRecordLast === null ){ return "new";}
  return aCheck.aRecordLast.sHash === aCheck.aMarker.sHash
    ? "code"
    : "reworded";
};

// @implements s-32o5r7@1ced769
// @implements s-d0p52k@8a9d95e
// @implements s-pclybh@b87b7b1
const fvaRecordReset = ( aModel ) => fvaCheckRecordable( aModel )
  .filter(( aCheck ) => (
    aCheck.sStatus === "stale" || aCheck.vaRecord.length === 0
  ))
  .map(( aCheck ) => ({
    ...faRecordFor( aCheck.aMarker, aModel.aLines.hasher, "reset", "" ),
    sReason: fsReasonForReset( aCheck )
  }));

// @implements s-yu6zet@bb44414
const fnRecordResetLast = ( vaRecord ) => vaRecord.findLastIndex((
  aRecord
) => asVerdictReset.has( aRecord.sVerdict ));

// @implements s-yu6zet@bb44414
const fsDateReset = ( aCheck ) => {
  const nReset = fnRecordResetLast( aCheck.vaRecord );
  return nReset < 0 ? "" : String( aCheck.vaRecord[ nReset ].sDate );
};

// @implements s-z7gbzu@ab3b738
const fbCheckInWork = ( aModel, aCheck, vsWork ) => aModel.aLines.vaCodeRef
  .filter(( aRef ) => aRef.sKind === "checks" && aRef.sReason === null
    && aRef.sId === aCheck.aMarker.sId )
  .some(( aRef ) => [ aRef.sPath, aRef.sPathCode ].some(( sPath ) => (
    sPath !== undefined && vsWork.includes( fsPathClean( sPath ))
  )));

// @implements s-97jgxt@53268fc
const fzCompareWorklist = ( aA, aB ) => (
  Number( aB.bWork ) - Number( aA.bWork )
  || aA.sDateReset.localeCompare( aB.sDateReset )
  || aA.sPath.localeCompare( aB.sPath )
  || aA.aMarker.nLine - aB.aMarker.nLine
);

// @implements s-32o5r7@1ced769
// @implements s-ikjpbw@fc0cb7c
// @implements s-z7gbzu@ab3b738
// @implements s-97jgxt@53268fc
// @implements s-i5r6dl@fd54b50
const fvaCheckWorklist = ( aModel, vsWork ) => fvaCheckRecordable( aModel )
  .filter(( aCheck ) => (
    aCheck.sStatus === "unchecked" || aCheck.sStatus === "stale"
  ))
  .map(( aCheck ) => ({
    ...aCheck,
    bWork: fbCheckInWork( aModel, aCheck, vsWork ),
    sDateReset: fsDateReset( aCheck )
  }))
  .sort( fzCompareWorklist );

// @implements s-4kpjgj@804210f
const fsHtmlEscaped = ( sText ) => String( sText ).replace(
  /[&<>"']/g, ( ch ) => asEntityForChar[ ch ]
);

// @implements s-3m5iin@4d4e26f
// @implements s-4kpjgj@804210f
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

// @implements s-g8h2jz@c4623dc
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

// @implements s-3m5iin@4d4e26f
const fsOptionHtml = ( sId, sKey, sHtml ) => (
  "<label class=\"opt\"><input type=\"radio\" name=\"" + sId + "\" value=\""
  + sKey + "\"><span>" + sHtml + "</span></label>"
);

// @implements s-3m5iin@4d4e26f
// @implements s-4kpjgj@804210f
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

// @tested-by test/spec-map-source.test.js#tu-a09d64a2
const fsJsonForScript = ( x ) => JSON.stringify( x ).replace(
  reCharScriptUnsafe,
  ( ch ) => "\\u" + ch.charCodeAt( 0 ).toString( 16 ).padStart( 4, "0" )
);


// @implements s-m4jorm@da16eb4
// @implements s-iz8176@bb80e0d
// @implements s-pclybh@b87b7b1
// @implements s-5406e5@0bad222
// @implements s-i5r6dl@fd54b50
// @implements s-3m5iin@4d4e26f
// @implements s-ezm2c1@86313be
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

// @implements s-yurmkw@ee703cc
// @implements s-m4jorm@da16eb4
// @implements s-iz8176@bb80e0d
// @implements s-ikjpbw@fc0cb7c
// @implements s-d0p52k@8a9d95e
// @implements s-b0mknl@02d4cb5
// @implements s-pclybh@b87b7b1
// @implements s-z7gbzu@ab3b738
// @implements s-6zslo8@0373285
// @implements s-rzwovs@5b76e45
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

// @implements s-kyro7r@3064fa5
const fzCompareMarkerPlace = ( aA, aB ) => (
  Number( aA.sPath > aB.sPath ) - Number( aA.sPath < aB.sPath )
  || aA.nLine - aB.nLine
  || aA.nOffset - aB.nOffset
);

// @implements s-kyro7r@3064fa5
// @implements s-95ao2f@9b59968
const fzHashes = ( reader, fWrite ) => {
  const aModel = faModel({
    vaSpec: reader.fvaSpec(),
    vaTest: [],
    aParseCache: reader.aParseCache
  });
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

// @implements s-8wn2ou@c5e7984
const fzArch = ( reader, fWrite ) => {
  const aModel = faModel({
    vaSpec: reader.fvaSpec(),
    vaTest: [],
    aParseCache: reader.aParseCache
  });
  fWrite( fsSectionArch( faRoots( aModel, new Set()).vaArch ) + "\n" );
  return 0;
};

// @implements s-eltyao@a23e292
const faInputForReader = ( reader, vaSpec ) => ({
  vaSpec,
  vaTest: reader.fvaTest(),
  ...reader.faFilesRead(),
  vaRecord: reader.fvaRecord(),
  fbExists: ( sPath ) => reader.fbExists( sPath ),
  aFiles: reader,
  aObsInput: reader.faObservationInput(),
  aParseCache: reader.aParseCache
});

// @implements s-l0wfl7@c6ad1b2
// @implements s-1fwxnq@6500111
// @implements s-bxs0rr@4c0a68e
// @implements s-6ls2oh@b278617
// @implements s-f1np35@35d6720
// @implements s-tdw4gj@8d6d23d
// @implements s-3pkw1n@721f8a3
// @implements s-8xfzz3@6999bd7
// @implements s-du4nns@bbb6351
// @implements s-mbcxy1@de2395f
// @implements s-u2lhta@c6845db
// @implements s-b8vvpd@9e72e40
// @implements s-xuw25u@ed827df
// @implements s-vcpu9h@6d6ac07
// @implements s-ug5kvq@0033049
// @implements s-cov7pg@e6a079b
// @implements s-n8uc4k@a405885
// @implements s-e287lm@a1b403a
// @implements s-nudxy0@3495135
// @implements s-2vgnq6@8323fcb
// @implements s-sfuntg@4b5ec33
// @implements s-hgk19s@2c0c557
// @tested-by test/observations.test.js#tu-85136f22
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
  const aMap = faMap({ ...faInputForReader( reader, vaSpec ), sPathSpec });
  fWrite( fsReport( aMap ));
  return sPathSpec === undefined || fbClean( aMap ) ? 0 : 1;
};

// @implements s-qvdtqg@16f3fb4
// @implements s-tlkzzq@39b39e7
// @implements s-eltyao@a23e292
// @implements s-rkd937@6d33bc3
// @implements s-u88ict@b5a6934
// @implements s-ins4p7@19e76c1
// @implements s-ol2dmr@37d4979
// @implements s-nlm91d@4f76fd6
// @implements s-nw4u9n@3b57e9b
// @tested-by test/project-coverage.test.js#tu-15d56e9e
// @tested-by test/gate.test.js#tu-f5d1bd88
// @tested-by test/gate.test.js#tu-06e13c55
// @tested-by test/gate.test.js#tu-11e8333e
// @tested-by test/gate.test.js#tu-99c1aa95
const fzGate = ( reader, fWrite ) => {
  const aModel = faModel( faInputForReader( reader, reader.fvaSpec()));
  const aAnalysis = faAnalysis( aModel );
  const vsLine = fvsLineGate(
    faMapForModel( aModel, aAnalysis, undefined ),
    aModel.vaSpecParsed
      .filter(( aSpec ) => aSpec.bComplete )
      .map(( aSpec ) => faMapForModel( aModel, aAnalysis, aSpec.sPath ))
  );
  fWrite( vsLine.concat([
    vsLine.length === 0
      ? "Gate: pass"
      : "Gate: refused, " + vsLine.length + " entries"
  ]).join( "\n" ) + "\n" );
  return vsLine.length === 0 ? 0 : 1;
};

const sUsage = (
  "usage: concord spec-map [--cache-checksum] [<spec path>] | --gate | --hash <id> | --sid <id> "
  + "| --candidates <id> | --root <id> | --cross-suite | --probes "
  + "| --interactive | --guidance [--for <label>] | --pass <id> [--note <text>] "
  + "| --fail <id> [--note <text>] | --unable <id> [--note <text>] "
  + "| --reopen <id> | --answers <file> | --worklist <path> [--work <file>] "
  + "| --hashes | --assign | --split-parts\n"
);

// @implements s-uffk6s@99fde62
// @implements s-aphyp7@1f4c6b6
// @implements s-6zo013@7dde6e2
// @implements s-kyro7r@3064fa5

// @implements s-ukzm8a@7dde6e2
// @implements s-gjk5r1@9d6e18f
// @implements s-ol3soy@d2da0a6
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
  if( sFlag === "--gate" ){ return vsArg.length === 1;}
  if( sFlag === "--worklist" ){
    return vsArg.length === 2
      || ( vsArg.length === 4 && vsArg[ 2 ] === "--work" );
  }
  return vsArg.length <= 1;
};

// @tested-by test/concord.test.js#tu-94944420
// @implements s-pa182t@8008053
// @implements s-uffk6s@99fde62
// @implements s-rkzefi@94d4b4a
// @implements s-yurmkw@ee703cc
// @implements s-gjk5r1@9d6e18f
// @tested-by test/observations.test.js#tu-85136f22
const fzMain = ( vsArg, sDirRoot, fWrite, fWriteErr ) => {
  // @implements s-tot8yl@9c5630f
  // @implements s-4kencv@f2a5fe1
  if( vsArg.includes( "--clear-cache" )){
    // @implements s-h8i6xs@8462414
    // @implements s-69o630@92fe218
    if( vsArg.length !== 1 ){
      ( fWriteErr || fWrite )( sUsage );
      return 2;
    }
    try{
      require( "./spec-map-cache.js" ).fClearCache( sDirRoot );
      fWrite( "spec-map: cache cleared\n" );
      return 0;
    }
    // @implements s-8ydtei@83a4ba4
    catch( xError ){
      ( fWriteErr || fWrite )(
        "spec-map: unable to clear cache: " + xError.message + "\n"
      );
      return 1;
    }
  }
  // @implements s-w83alg@dde527f
  const cCacheChecksum = vsArg.filter(( sArg ) => (
    sArg === "--cache-checksum"
  )).length;
  vsArg = vsArg.filter(( sArg ) => sArg !== "--cache-checksum" );
  // @tested-by test/concord-settings.test.js#tu-20b7f347
  const aRead = new ConfigReader( sDirRoot ).faConfig();
  if( aRead.sProblem !== null ){
    ( fWriteErr || fWrite )( "spec-map: " + aRead.sProblem + "\n" );
    return 2;
  }
  if( cCacheChecksum > 1 || !fbArgsValid( vsArg )){
    ( fWriteErr || fWrite )( sUsage );
    return 2;
  }
  const aParseCache = new ParseCache(
    sDirRoot, fsFingerprintParser( aRead.aConfig )
  );
  // @implements s-w83alg@dde527f
  // @implements s-pcodyd@5016f26
  aParseCache.bCheckContent = cCacheChecksum === 1;
  const reader = new TreeReader( sDirRoot, aRead.aConfig, aParseCache );
  try{
    if( vsArg[ 0 ] === "--assign" ){ return fzAssign( reader, fWrite );}
    if( vsArg[ 0 ] === "--split-parts" ){
      return fzSplitParts( reader, fWrite, fWriteErr || fWrite );
    }
    if( vsArg[ 0 ] === "--hashes" ){ return fzHashes( reader, fWrite );}
    // @tested-by test/gate.test.js#tu-6bfb42c3
    if( vsArg[ 0 ] === "--gate" ){ return fzGate( reader, fWrite );}
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
  }
  finally{
    aParseCache.fSave();
  }
};

module.exports = {
  faMap,
  fsReport,
  fzMain,
  faContextModel,
  faModel,
  faRoots,
  fasIdProved,
  fsNormal,
  fsHashForText,
  fsWords,
  fvnLineStart,
  fnLineAt,
  TreeReader,
  ftMaskRust,
  ftMaskForPath,
  fsNormalForFile,
  faProgramForPath,
  fnAfterGroup,
  fnAfterTemplate,
  fnRustBlockEnd,
  fsNameAt,
  fvsTargetForMarker,
  fsReasonForTargetForm,
  TargetHasher,
  fsJsonForScript,
  fvsTermForText,
  fvaCodeReferenceResolved,
  aFilesNone,
  aListNoTestedBy,
  aListCodeRefBad,
};
