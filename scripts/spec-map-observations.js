// @tested-by test/observations.test.js
"use strict";

const reHeadingEntry = /^##[ \t]+(.*)$/;
// @implements s-s94pmp@3059528
// @implements s-xz2yo9@2138773
// @implements s-tauo8d@4252f7c
const reMarker = /^\{#o-([a-z0-9]{6}|\?)(?: >([^}]*))?\}/;
const reMarkerLoose = /^\{#o-([a-z0-9]{6})(?![a-z0-9])/;
// @implements s-kb9hwp@50a3569
const reTarget = /^(([a-z])-[a-z0-9]{6})(?:@([0-9a-f]{7}))?$/;
// @implements s-uhmye6@3b951a1
const reCitation = /\[(o-[a-z0-9]{6})\]/g;
const reLike = new RegExp(
  "(?<!\\d)\\d{4}-\\d{2}-\\d{2}(?!\\d)"
  + "|\\b(?:flake|flaky|red once)\\b",
  "gi"
);
// @implements s-k7m8d0@3483032
const reRuling = /RULING \((?:CEO|architect)\)/;
const sCitationOpen = "[o-";
const sTypeObservation = "o";
const sTypeTarget = "si";
const sClassComment = "m";
const sReasonNoMarker = "heading does not open with an observation marker";

const fsPlace = ( aEntry ) => aEntry.sPath + ":" + aEntry.nLine;

const fzComparePlace = ( aA, aB ) => (
  Number( aA.sPath > aB.sPath ) - Number( aA.sPath < aB.sPath )
  || aA.nLine - aB.nLine
  || aA.nPos - aB.nPos
);

const fazCount = ( vs ) => vs.reduce(( az, s ) => (
  az.set( s, ( az.get( s ) || 0 ) + 1 )
), new Map());

// @implements s-kb9hwp@50a3569
// @implements s-iuf0wy@b03ea00
const faTargetParsed = ( sTarget, aKit ) => {
  const vsGroup = sTarget.match( reTarget );
  if( vsGroup === null ){
    return { sTarget, bForm: false, sId: null, sType: null, sStamp: null };
  }
  return {
    sTarget,
    bForm: true,
    sId: vsGroup[ 1 ],
    sType: vsGroup[ 2 ],
    sStamp: vsGroup[ 3 ] === undefined ? null : vsGroup[ 3 ],
    aMarker: aKit.faMarkerForId( vsGroup[ 1 ])
  };
};

const vtReasonForTarget = [
  [
    ( aTarget ) => !sTypeTarget.includes( aTarget.sType ),
    ( aTarget, aKit ) => (
      "target " + aTarget.sId + " names a line of type "
      + aKit.fsTypeLine( aTarget.sType )
    )
  ],
  [
    ( aTarget ) => aTarget.aMarker === null,
    ( aTarget ) => "target " + aTarget.sId + " does not resolve"
  ],
  [
    ( aTarget, n, vaTarget ) => vaTarget.findIndex(( aOther ) => (
      aOther.sId === aTarget.sId
    )) !== n,
    ( aTarget ) => "target " + aTarget.sId + " named twice"
  ]
];

// @implements s-iuf0wy@b03ea00
// @implements s-5kiaml@3612f06
const fsReasonForTargets = ( vaTarget, aKit ) => {
  if( vaTarget.some(( aTarget ) => !aTarget.bForm )){
    return "target list in another form";
  }
  const vsReason = vtReasonForTarget.flatMap(( tReason ) => {
    const aFound = vaTarget.find(( aTarget, n ) => (
      tReason[ 0 ]( aTarget, n, vaTarget )
    ));
    return aFound === undefined ? [] : [ tReason[ 1 ]( aFound, aKit )];
  });
  return vsReason.length === 0 ? null : vsReason[ 0 ];
};

const fsReasonForEntry = ( aEntry, aKit ) => (
  aEntry.sTitle === ""
    ? "empty title"
    : fsReasonForTargets( aEntry.vaTarget, aKit )
);

const faEntryUnmarked = ( aBase, sHeading ) => {
  const vsLoose = sHeading.match( reMarkerLoose );
  return {
    ...aBase,
    sId: vsLoose === null ? null : sTypeObservation + "-" + vsLoose[ 1 ],
    bPlaceholder: false,
    bTargets: false,
    sToken: null,
    sTitle: "",
    vaTarget: [],
    sReason: sReasonNoMarker
  };
};

// @implements s-414i8o@5e5da71
// @implements s-5kiaml@3612f06
// @implements s-s94pmp@3059528
const faEntryForHeading = ( aCtx, nLine, aKit ) => {
  const sLine = aCtx.vsLine[ nLine ];
  const sHeading = sLine.match( reHeadingEntry )[ 1 ];
  const aBase = {
    sPath: aCtx.sPath,
    nLine: nLine + 1,
    sHeading: sHeading.trim(),
    nOffset: aCtx.vnLineStart[ nLine ] + sLine.length - sHeading.length
  };
  const vsMarker = sHeading.match( reMarker );
  if( vsMarker === null ){ return faEntryUnmarked( aBase, sHeading );}
  const bPlaceholder = vsMarker[ 1 ] === "?";
  const aEntry = {
    ...aBase,
    sId: bPlaceholder ? null : sTypeObservation + "-" + vsMarker[ 1 ],
    bPlaceholder,
    bTargets: vsMarker[ 2 ] !== undefined,
    sToken: vsMarker[ 0 ],
    sTitle: sHeading.slice( vsMarker[ 0 ].length ).trim(),
    vaTarget: vsMarker[ 2 ] === undefined
      ? []
      : vsMarker[ 2 ].split( "," ).map(( sTarget ) => (
        faTargetParsed( sTarget, aKit )
      ))
  };
  return { ...aEntry, sReason: fsReasonForEntry( aEntry, aKit )};
};

// @implements s-biyilv@0ff9f28
const fsReasonForId = ( aEntry, azEntryForId, aKit ) => {
  if( azEntryForId.get( aEntry.sId ) > 1 ){
    return "id held by two or more entries";
  }
  return aKit.fbBodyInSpec( aEntry.sId.slice( 2 ))
    ? "id body held by a spec marker"
    : null;
};

const fvaEntryChecked = ( vaEntry, aKit ) => {
  const azEntryForId = fazCount( vaEntry
    .map(( aEntry ) => aEntry.sId )
    .filter(( sId ) => sId !== null ));
  return vaEntry.map(( aEntry ) => (
    aEntry.sReason !== null || aEntry.sId === null
      ? aEntry
      : { ...aEntry, sReason: fsReasonForId( aEntry, azEntryForId, aKit )}
  ));
};

// @implements s-414i8o@5e5da71
// @implements s-5kiaml@3612f06
// @implements s-7rzud7@967b5f8
const fvaEntryForFile = ( aFile, aKit ) => {
  if( aFile === null ){ return [];}
  const vsLine = aFile.sText.split( "\n" );
  const vsKind = aKit.fvsKindForLines( vsLine );
  const aCtx = {
    sPath: aFile.sPath, vsLine, vnLineStart: aKit.fvnLineStart( vsLine )
  };
  return fvaEntryChecked(
    vsLine
      .map(( sLine, nLine ) => nLine )
      .filter(( nLine ) => (
        vsKind[ nLine ] === "heading" && reHeadingEntry.test( vsLine[ nLine ])
      ))
      .map(( nLine ) => faEntryForHeading( aCtx, nLine, aKit )),
    aKit
  );
};

const faCitation = ( sPath, nLine, nPos, sId, bRules ) => ({
  sPath, nLine, nPos, sId, bRules, sLine: sPath + ":" + nLine + "  " + sId
});

// @implements s-uhmye6@3b951a1
const fvaCitationForBlock = ( aCtx, aBlock, aKit ) => {
  const sText = aBlock.vnLine.map(( nLine ) => aCtx.vsLine[ nLine ])
    .join( "\n" );
  const vtSpan = aKit.fvtSpanForText( sText );
  const vnLineStart = aKit.fvnLineStart( sText.split( "\n" ));
  return Array.from( sText.matchAll( reCitation ))
    .filter(( vsGroup ) => !aKit.fbInSpan( vtSpan, vsGroup.index ))
    .map(( vsGroup ) => {
      const nLineBlock = aKit.fnLineAt( vnLineStart, vsGroup.index );
      return faCitation(
        aCtx.sPath,
        aBlock.vnLine[ nLineBlock ] + 1,
        vsGroup.index - vnLineStart[ nLineBlock ],
        vsGroup[ 1 ],
        aCtx.bRules
      );
    });
};

// @implements s-h01tkj@3b9540e
const fvaCitationForMarkdown = ( aFile, bRules, aKit ) => {
  if( !aFile.sText.includes( sCitationOpen )){ return [];}
  const vsLine = aFile.sText.split( "\n" );
  const aCtx = { sPath: aFile.sPath, vsLine, bRules };
  return aKit.fvaBlockForKind( aKit.fvsKindForLines( vsLine ))
    .flatMap(( aBlock ) => fvaCitationForBlock( aCtx, aBlock, aKit ));
};

// @implements s-h01tkj@3b9540e
// @implements s-f8jiyg@08812ac
const fvaCitationForCode = ( aFile, aKit ) => {
  if( !aFile.sText.includes( sCitationOpen )){ return [];}
  const vsClass = aKit.fvsClassForFile( aFile.sPath, aFile.sText );
  const vnLineStart = aKit.fvnLineStart( aFile.sText.split( "\n" ));
  return Array.from( aFile.sText.matchAll( reCitation ))
    .filter(( vsGroup ) => (
      vsClass[ vsGroup.index ] === sClassComment
      && vsClass[ vsGroup.index + vsGroup[ 0 ].length - 1 ] === sClassComment
    ))
    .map(( vsGroup ) => {
      const nLine = aKit.fnLineAt( vnLineStart, vsGroup.index );
      return faCitation(
        aFile.sPath, nLine + 1, vsGroup.index - vnLineStart[ nLine ],
        vsGroup[ 1 ], false
      );
    });
};

const fvaFileExisting = ( vaFile ) => vaFile.filter(( aFile ) => (
  aFile.sText !== null
));

// @implements s-h01tkj@3b9540e
// @implements s-lko4ia@a30051b
const fvaCitation = ( aInput, aKit ) => aInput.vaSpec
  .flatMap(( aFile ) => fvaCitationForMarkdown( aFile, false, aKit ))
  .concat(
    fvaFileExisting( aInput.vaRules ).flatMap(( aFile ) => (
      fvaCitationForMarkdown( aFile, true, aKit )
    )),
    aInput.sTextObs === null
      ? []
      : fvaCitationForMarkdown({
        sPath: aInput.sPathObs, sText: aInput.sTextObs
      }, false, aKit ),
    aInput.vaCode.flatMap(( aFile ) => (
      aInput.aParseCache === undefined
        ? fvaCitationForCode( aFile, aKit )
        : aInput.aParseCache.fxParse(
          "observation-citations", aFile,
          ( aInputFile ) => fvaCitationForCode( aInputFile, aKit )
        )
    ))
  )
  .sort( fzComparePlace );

// @implements s-iuf0wy@b03ea00
const fbStale = ( aTarget ) => (
  aTarget.sStamp !== null && aTarget.sStamp !== aTarget.aMarker.sHash
);

// @implements s-yrpduj@c675b25
// @implements s-comu8t@df1f762
const fvsWhyForTarget = ( aTarget, bRulesCited, aKit ) => [
  aTarget.sStamp === null ? "unstamped" : null,
  fbStale( aTarget ) ? "stale" : null,
  aKit.fbSatisfied( aTarget.aMarker )
    ? null
    : aTarget.sType === "s" ? "unproved" : "not passed",
  aTarget.sType === "i" && bRulesCited
    ? "hand check cited from a rules file"
    : null
].filter( Boolean );

// @implements s-i72t7h@8816bf7
const fsStatusForHold = ( aEntry, vaHold ) => {
  if( aEntry.bPlaceholder ){ return "placeholder";}
  if( !aEntry.bTargets ){ return "open";}
  return vaHold.length === 0 ? "retirable" : "pending";
};

// @implements s-i72t7h@8816bf7
// @implements s-yrpduj@c675b25
const faStatusForEntry = ( aEntry, vaCitation, aKit ) => {
  const vaCited = vaCitation.filter(( aCitation ) => (
    aEntry.sId !== null && aCitation.sId === aEntry.sId
  ));
  const bRulesCited = vaCited.some(( aCitation ) => aCitation.bRules );
  const vaHold = aEntry.bPlaceholder
    ? []
    : aEntry.vaTarget
      .map(( aTarget ) => ({
        sId: aTarget.sId,
        vsWhy: fvsWhyForTarget( aTarget, bRulesCited, aKit )
      }))
      .filter(( aHold ) => aHold.vsWhy.length > 0 );
  return {
    sStatus: fsStatusForHold( aEntry, vaHold ), vaHold, cCited: vaCited.length
  };
};

// @implements s-cz0mnp@08a3a79
const fvsLineForObservation = ( aObs, aKit ) => [
  fsPlace( aObs ) + "  " + ( aObs.sId || "placeholder" ) + "  "
  + aKit.fsWords( aObs.sTitle ) + "  " + aObs.sStatus + "  cited "
  + aObs.cCited
].concat( aObs.vaHold.map(( aHold ) => (
  "  " + aHold.sId + "  " + aHold.vsWhy.join( ", " )
)));

// @implements s-q5c85w@e45f7a9
// @implements s-k7m8d0@3483032
const fvaLikeForLine = ( aFile, sLine, nLine ) => {
  if( reRuling.test( sLine )){ return [];}
  const vsMatch = Array.from( sLine.matchAll( reLike ), ( vs ) => vs[ 0 ]);
  return vsMatch.length === 0
    ? []
    : [{
      sPath: aFile.sPath,
      nLine: nLine + 1,
      sLine: aFile.sPath + ":" + ( nLine + 1 ) + "  " + vsMatch.join( ", " )
    }];
};

// @implements s-b6pwed@2075d0b
const fvaLikeForRules = ( vaRules, aKit ) => vaRules.flatMap(( aFile ) => {
  if( aFile.sText === null ){
    return [{
      sPath: aFile.sPath, nLine: 0, sLine: aFile.sPath + "  (missing)"
    }];
  }
  const vsLine = aFile.sText.split( "\n" );
  const vsKind = aKit.fvsKindForLines( vsLine );
  return vsLine.flatMap(( sLine, nLine ) => (
    vsKind[ nLine ] === "fence" ? [] : fvaLikeForLine( aFile, sLine, nLine )
  ));
});

// @implements s-99gqqj@edc33c6
const faEntryBad = ( aEntry, aKit ) => ({
  ...aEntry,
  sLine: fsPlace( aEntry ) + "  " + aKit.fsWords( aEntry.sHeading ) + "  ("
    + aEntry.sReason + ")"
});

// @implements s-89dowx@1de93c2
// @implements s-lko4ia@a30051b
// @implements s-99gqqj@edc33c6
// @implements s-m4ejnc@74e55a0
// @implements s-cz0mnp@08a3a79
// @implements s-1vfjup@ed50b2f
// @implements s-bf7qnq@a4202a9
// @implements s-8782no@e762d56
const faObservations = ( aInput, aKit ) => {
  const vaEntry = aInput.sTextObs === null
    ? []
    : fvaEntryForFile(
      { sPath: aInput.sPathObs, sText: aInput.sTextObs }, aKit
    );
  const vaCitation = fvaCitation( aInput, aKit );
  const azEntryForId = fazCount( vaEntry
    .map(( aEntry ) => aEntry.sId )
    .filter(( sId ) => sId !== null ));
  const vaObs = vaEntry
    .filter(( aEntry ) => aEntry.sReason === null )
    .map(( aEntry ) => ({
      ...aEntry, ...faStatusForEntry( aEntry, vaCitation, aKit )
    }));
  return {
    vaEntry,
    vaCitation,
    vaObsBad: vaEntry
      .filter(( aEntry ) => aEntry.sReason !== null )
      .map(( aEntry ) => faEntryBad( aEntry, aKit )),
    vaCitationDangling: vaCitation.filter(( aCitation ) => (
      azEntryForId.get( aCitation.sId ) !== 1
    )),
    vaObs,
    vsLineObs: vaObs.flatMap(( aObs ) => fvsLineForObservation( aObs, aKit )),
    sLineObsCount: "Observations: " + vaObs.length + ", "
      + vaObs.filter(( aObs ) => aObs.sStatus === "retirable" ).length
      + " retirable",
    vaObsLike: fvaLikeForRules( aInput.vaRules, aKit )
  };
};

const fsWordFor = ( b, sYes, sNo ) => b ? sYes : sNo;

// @implements s-iuf0wy@b03ea00
const fsLineForTargetQuery = ( aTarget, aKit ) => {
  const bResolves = aTarget.bForm && aTarget.aMarker !== null;
  return "target " + ( aTarget.sId || aTarget.sTarget ) + "  " + [
    fsWordFor( bResolves, "resolves", "does not resolve" ),
    fsWordFor( aTarget.sStamp !== null, "stamped", "unstamped" ),
    fsWordFor( bResolves && fbStale( aTarget ), "stale", "not stale" ),
    fsWordFor(
      bResolves && aKit.fbSatisfied( aTarget.aMarker ),
      "satisfied",
      "not satisfied"
    )
  ].join( "  " );
};

const fsStatusForQuery = ( aObservations, aEntry ) => {
  if( aEntry.sReason !== null ){ return "malformed (" + aEntry.sReason + ")";}
  return aObservations.vaObs.find(( aObs ) => (
    aObs.nLine === aEntry.nLine
  )).sStatus;
};

// @implements s-p79bim@05302e1
// @implements s-l4dvnu@b9d5559
const faSidObservation = ( aObservations, sId, aKit ) => {
  const vaEntry = aObservations.vaEntry.filter(( aEntry ) => (
    aEntry.sId === sId
  ));
  if( vaEntry.length !== 1 ){
    return {
      sOut: null,
      sErr: vaEntry.length === 0
        ? "spec-map: no observation entry holds " + sId + "\n"
        : "spec-map: " + sId + " is held by " + vaEntry.length
          + " observation entries\n"
    };
  }
  const aEntry = vaEntry[ 0 ];
  return {
    sOut: [
      fsPlace( aEntry ) + "  " + sId + "  "
        + ( aEntry.sTitle || aEntry.sHeading ),
      "status: " + fsStatusForQuery( aObservations, aEntry )
    ].concat(
      aEntry.vaTarget.map(( aTarget ) => fsLineForTargetQuery( aTarget, aKit )),
      aObservations.vaCitation
        .filter(( aCitation ) => aCitation.sId === sId )
        .map(( aCitation ) => "cited " + fsPlace( aCitation ))
    ).join( "\n" ) + "\n",
    sErr: null
  };
};

const fsTargetsAssigned = ( vaTarget ) => vaTarget.map(( aTarget ) => (
  aTarget.sStamp === null
    ? aTarget.sId + "@" + aTarget.aMarker.sHash
    : aTarget.sTarget
)).join( "," );

// @implements s-h5caok@17c696d
// @implements s-q0hqdv@b9d77ff
// @implements s-nt6vob@a2a69ea
const faEditForEntry = ( aEntry, fsIdNew, aKit ) => {
  const vaStamp = aEntry.vaTarget.filter(( aTarget ) => (
    aTarget.sStamp === null
  ));
  if( !aEntry.bPlaceholder && vaStamp.length === 0 ){ return null;}
  const sId = aEntry.bPlaceholder ? fsIdNew() : aEntry.sId;
  const sPlace = fsPlace( aEntry ) + "  " + sId + "  ";
  return {
    aEntry,
    sToken: "{#" + sId
      + ( aEntry.bTargets ? " >" + fsTargetsAssigned( aEntry.vaTarget ) : "" )
      + "}",
    vsLine: ( aEntry.bPlaceholder
      ? [ sPlace + aKit.fsWords( aEntry.sTitle ) + "\n" ]
      : []
    ).concat( vaStamp.map(( aTarget ) => (
      sPlace + aTarget.sId + "@" + aTarget.aMarker.sHash + "\n"
    )))
  };
};

// @implements s-q1vbs8@5ebd909
const fsTextEdited = ( sText, vaEdit ) => vaEdit
  .slice()
  .sort(( aA, aB ) => aB.aEntry.nOffset - aA.aEntry.nOffset )
  .reduce(( sAcc, aEdit ) => (
    sAcc.slice( 0, aEdit.aEntry.nOffset ) + aEdit.sToken
    + sAcc.slice( aEdit.aEntry.nOffset + aEdit.aEntry.sToken.length )
  ), sText );

// @implements s-h5caok@17c696d
// @implements s-nt6vob@a2a69ea
// @implements s-q1vbs8@5ebd909
// @implements s-q0hqdv@b9d77ff
const faAssignObservations = ( aFile, fsIdNew, aKit ) => {
  const vaEdit = fvaEntryForFile( aFile, aKit )
    .filter(( aEntry ) => aEntry.sReason === null )
    .map(( aEntry ) => faEditForEntry( aEntry, fsIdNew, aKit ))
    .filter( Boolean );
  return {
    bChanged: vaEdit.length > 0,
    sText: fsTextEdited( aFile.sText, vaEdit ),
    vsLine: vaEdit.flatMap(( aEdit ) => aEdit.vsLine )
  };
};

module.exports = {
  faObservations,
  faSidObservation,
  faAssignObservations
};
