// @implements s-3fzgrr@cc19c25
// @implements s-rh750h@cc70238
// @implements s-k9xdwy@ccaee82
// @tested-by test/language-readings.test.js
// @implements s-jqqjjj@cfe7b54
// @implements s-rdpnaf@0033647
// @implements s-z6r8qu@bc64f8c
// @implements s-p069rs@d53d867
// @implements s-wut129@714b56a
// @implements s-n4r9dw@4bcc808
// @implements s-zrjuk3@760428d
// @implements s-k6leed@80135a4
"use strict";

const ftMaskRust = ( sText ) => {
  const vch = sText.split( "" );
  const vnComment = [];
  const vnCommentBlock = [];
  const vtComment = [];
  const vtLiteral = [];
  const fBlank = ( n ) => {
    if( n < vch.length && vch[ n ] !== "\n" && vch[ n ] !== "\r" ){
      vch[ n ] = " ";
    }
  };
  const fBlankRange = ( nStart, nEnd ) => {
    for( let n = nStart; n < nEnd; n++ ){ fBlank( n );}
  };
  let n = 0;
  while( n < vch.length ){
    const sTail = sText.slice( n );
    const vsRaw = sTail.match( /^(?:br|r)(#*)"/ );
    if( vsRaw !== null ){
      const sClose = "\"" + vsRaw[ 1 ];
      const nClose = sText.indexOf( sClose, n + vsRaw[ 0 ].length );
      const nEnd = nClose < 0 ? vch.length : nClose + sClose.length;
      vtLiteral.push([ n, nEnd ]);
      fBlankRange( n, nEnd );
      n = nEnd;
      continue;
    }
    const sByteOrString = sText.startsWith( "b\"", n ) ? "\""
      : sText[ n ] === "\"" ? "\"" : null;
    if( sByteOrString !== null ){
      const nQuote = n + ( sText[ n ] === "b" ? 1 : 0 );
      let nEnd = nQuote + 1;
      while( nEnd < vch.length ){
        if( sText[ nEnd ] === "\\" ){ nEnd += 2; continue;}
        if( sText[ nEnd++ ] === "\"" ){ break;}
      }
      vtLiteral.push([ n, nEnd ]);
      fBlankRange( n, nEnd );
      n = nEnd;
      continue;
    }
    if( sText.startsWith( "//", n )){
      const bDoc = sText.startsWith( "///", n )
        || sText.startsWith( "//!", n );
      if( !bDoc ){ vnComment.push( n );}
      const nEnd = sText.indexOf( "\n", n );
      const nStop = nEnd < 0 ? vch.length : nEnd;
      vtComment.push([ n, nStop ]);
      fBlankRange( n, nStop );
      n = nStop;
      continue;
    }
    if( sText.startsWith( "/*", n )){
      const bDoc = sText.startsWith( "/**", n )
        || sText.startsWith( "/*!", n );
      if( !bDoc ){ vnCommentBlock.push( n );}
      let cDepth = 1;
      let nEnd = n + 2;
      while( nEnd < vch.length && cDepth > 0 ){
        if( sText.startsWith( "/*", nEnd )){ cDepth++; nEnd += 2;}
        else if( sText.startsWith( "*/", nEnd )){ cDepth--; nEnd += 2;}
        else{ nEnd++;}
      }
      vtComment.push([ n, nEnd ]);
      fBlankRange( n, nEnd );
      n = nEnd;
      continue;
    }
    if( sText[ n ] === "'" ){
      const vsChar = sText.slice( n ).match( /^'(?:\\.|[^'\\\n])'/ );
      if( vsChar !== null ){
        vtLiteral.push([ n, n + vsChar[ 0 ].length ]);
        fBlankRange( n, n + vsChar[ 0 ].length );
        n += vsChar[ 0 ].length;
        continue;
      }
    }
    n++;
  }
  return [ vch.join( "" ), vnComment, vnCommentBlock, {
    vtComment, vtLiteral
  }];
};

const fvsClassRust = ( sText ) => {
  const aRanges = ftMaskRust( sText )[ 3 ];
  const vsClass = new Array( sText.length ).fill( "c" );
  aRanges.vtComment.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){ vsClass[ n ] = "m";}
  });
  aRanges.vtLiteral.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){ vsClass[ n ] = "l";}
  });
  return vsClass;
};

const fnRustBlockEnd = ( sMasked, nOpen ) => {
  let cDepth = 0;
  for( let n = nOpen; n < sMasked.length; n++ ){
    if( sMasked[ n ] === "{" ){ cDepth++;}
    else if( sMasked[ n ] === "}" && --cDepth === 0 ){ return n + 1;}
  }
  return sMasked.length;
};

const fvaCodeReferenceForRust = ( aFile, f ) => {
  const [ sMasked, vnLineComment ] = ftMaskRust( aFile.sText );
  const vsLine = aFile.sText.split( "\n" );
  const vnLineStart = f.fvnLineStart( vsLine );
  const nLineCodeFound = sMasked.split( "\n" )
    .findIndex(( sLine ) => sLine.trim() !== "");
  const nLineCode = nLineCodeFound < 0 ? Infinity : nLineCodeFound;
  const vaDirective = [
    [ "implements", /^\s*@implements/, /@implements\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/,
      /^\s*\/\/ @implements +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\s*$/ ],
    [ "tested-by", /^\s*@tested-by/, /@tested-by\s+(\S+)/,
      /^\s*\/\/ @tested-by +(\S+)\s*$/ ],
    [ "checks", /^\s*@checks/, /@checks\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/,
      /^\s*\/\/ @checks +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})\s*$/ ]
  ];
  return vnLineComment.flatMap(( nComment ) => {
    const nLine = f.fnLineAt( vnLineStart, nComment );
    const sLine = vsLine[ nLine ];
    const sAfter = sLine.slice( nComment - vnLineStart[ nLine ] + 2 );
    return vaDirective.flatMap(([ sKind, reText, reLoose, reWell ]) => {
      if( !reText.test( sAfter )){ return [];}
      const vsLoose = sAfter.match( reLoose );
      return [{
        sPath: f.fsPosix( aFile.sPath ), nLine: nLine + 1, sKind,
        sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
        sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
        bWell: reWell.test( sLine ), sText: sLine.trim()
      }];
    });
  }).concat( f.fvaMisplacedForFile( aFile, nLineCode ));
};

const fvaCallForRust = ( aSource, fnLineAt ) => {
  const fCall = ( sKind, sName, nStart, nAt ) => {
    const nEnd = fnRustBlockEnd(
      aSource.sMasked, aSource.sMasked.indexOf( "{", nAt )
    );
    return {
      sKind, sName, sBody: aSource.sText.slice( nStart, nEnd ), nStart, nEnd,
      nLine: fnLineAt( aSource.vnLineStart, nAt )
    };
  };
  const vaCall = [];
  const reModule = /\bmod\s+([A-Za-z_]\w*)\s*\{/g;
  for( const vsModule of aSource.sMasked.matchAll( reModule )){
    const nOpen = vsModule.index + vsModule[ 0 ].lastIndexOf( "{" );
    vaCall.push( fCall( "describe", vsModule[ 1 ], vsModule.index, nOpen ));
  }
  const reTestAttr = /#\[\s*(?:[A-Za-z_]\w*\s*::\s*)*test\s*\]/g;
  for( const vsAttr of aSource.sMasked.matchAll( reTestAttr )){
    const nAfterAttr = vsAttr.index + vsAttr[ 0 ].length;
    const vsFn = aSource.sMasked.slice( nAfterAttr )
      .match( /^\s*(?:(?:async|unsafe)\s+)*fn\s+([A-Za-z_]\w*)\s*\(/ );
    if( vsFn === null ){ continue;}
    const nFn = nAfterAttr + vsFn[ 0 ].search( /\S/ );
    const nName = nAfterAttr + vsFn[ 0 ].indexOf( vsFn[ 1 ]);
    vaCall.push( fCall( "test", vsFn[ 1 ], nFn, nName ));
  }
  return vaCall.sort(( aA, aB ) => aA.nStart - aB.nStart );
};

const fCreate = ( f ) => ({
  sName: "rust",
  vsExtension: [ ".rs" ],
  vsTestSuffix: [ "rs" ],
  fbHasTestFiles: () => true,
  faHeader: ( aSource ) => {
    const nFound = aSource.vsLineMasked.findIndex(( sLine ) => sLine.trim() !== "");
    return {
      nLineCode: nFound < 0 ? aSource.vsLine.length : nFound,
      nLineDoc: 0
    };
  },
  faSource: ( sText ) => {
    const [ sMasked, vnLine, vnBlock ] = ftMaskRust( sText );
    return { sMasked, asnComment: new Set( vnLine.concat( vnBlock )) };
  },
  fvaTestUnit: ( aSource ) => fvaCallForRust( aSource, f.fnLineAt ),
  fsNormal: ( sPath, sText ) => f.fsCodeNormal( sText, fvsClassRust( sText )),
  fvsClass: ( sPath, sText ) => fvsClassRust( sText ),
  fvaCodeReference: ( aFile ) => fvaCodeReferenceForRust( aFile, f ),
  fvaFollows: ( aFile ) => f.fvaFollowsForCommentReader( aFile ),
  ftComments: ( aFile ) => {
    const [ , vnLine, vnBlock ] = ftMaskRust( aFile.sText );
    return [ vnLine, vnBlock ];
  },
  freCallWrapper: () => null,
  fbDirectiveGapLine: ( sLine ) => /^\s*(?:#\[|\/\/\/|\/\/!)/.test( sLine )
});
fCreate.sLanguageName = "rust";
fCreate.ftMaskRust = ftMaskRust;
fCreate.fvsClassRust = fvsClassRust;
fCreate.fnRustBlockEnd = fnRustBlockEnd;
fCreate.fvaCallForRust = fvaCallForRust;
fCreate.fvaCodeReferenceForRust = fvaCodeReferenceForRust;
module.exports = fCreate;
