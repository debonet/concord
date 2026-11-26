// @implements s-3fzgrr@cc19c25
// @implements s-rh750h@cc70238
// @implements s-p54hx2@dfa5570
// @implements s-k9xdwy@ccaee82
// @tested-by test/language-readings.test.js
// @implements s-nachij@b9de24b
// @implements s-uhmyhr@5d69172
// @implements s-tn4ty4@2ce57be
// @implements s-1j5z4y@58afac8
// @implements s-2jld9b@f37640f
// @implements s-zney60@13f1359
// @implements s-qb233y@6930374
// @implements s-zsxa7g@af4b09e
"use strict";

const reHtmlTagName = /[A-Za-z][\w:.-]*/y;
const reHtmlTagStart = /[A-Za-z]/;
const reHtmlDeclaration = /^<(?:!|\?|\/[A-Za-z])/;
const reHtmlDoctype = /^<!doctype/i;
const asHtmlTagRaw = new Set([ "script", "style" ]);
const sHtmlCommentOpen = "<!--";
const sHtmlCommentClose = "-->";
const freBodyStamped = ( sKind ) => new RegExp(
  "^@" + sKind + " +([a-z]-[a-z0-9]{6})@([0-9a-f]{7})$"
);
const areBodyForKind = {
  implements: freBodyStamped( "implements" ),
  "tested-by": /^@tested-by +(\S+)$/,
  checks: freBodyStamped( "checks" ),
  follows: freBodyStamped( "follows" )
};
const areLooseForKind = {
  implements: /@implements\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/,
  "tested-by": /@tested-by\s+(\S+)/,
  checks: /@checks\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/,
  follows: /@follows\s+([a-z]-[a-z0-9]*)@?([0-9a-f]*)/
};
const vsKindCodeReference = [ "implements", "tested-by", "checks" ];
const fsBlankedForRanges = ( sText, vtRange ) => {
  const vsChar = sText.split( "" );
  vtRange.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){
      if( vsChar[ n ] !== "\n" && vsChar[ n ] !== "\r" ){ vsChar[ n ] = " ";}
    }
  });
  return vsChar.join( "" );
};

class HtmlScanner {
  constructor( sText ){
    this.sText = sText; this.sLower = sText.toLowerCase();
    this.vtComment = []; this.vtDoctype = [];
  }
  fnAfter( sClose, n ){
    const nClose = this.sText.indexOf( sClose, n );
    return nClose < 0 ? this.sText.length : nClose + sClose.length;
  }
  fnComment( n ){
    const nEnd = this.fnAfter( sHtmlCommentClose, n + sHtmlCommentOpen.length );
    this.vtComment.push([ n, nEnd ]); return nEnd;
  }
  fnDeclaration( n ){
    const nEnd = this.fnAfter( ">", n );
    if( reHtmlDoctype.test( this.sText.slice( n, n + 9 ))){
      this.vtDoctype.push([ n, nEnd ]);
    }
    return nEnd;
  }
  fnAfterRaw( sName, n ){
    const nClose = this.sLower.indexOf( "</" + sName, n );
    return nClose < 0 ? this.sText.length : nClose;
  }
  fnTag( n ){
    reHtmlTagName.lastIndex = n + 1;
    const sName = reHtmlTagName.exec( this.sText )[ 0 ].toLowerCase();
    let nAt = reHtmlTagName.lastIndex;
    while( nAt < this.sText.length && this.sText[ nAt ] !== ">" ){
      const ch = this.sText[ nAt ];
      nAt = ch === "\"" || ch === "'" ? this.fnAfter( ch, nAt + 1 ) : nAt + 1;
    }
    const nEnd = Math.min( nAt + 1, this.sText.length );
    return asHtmlTagRaw.has( sName ) ? this.fnAfterRaw( sName, nEnd ) : nEnd;
  }
  fnAt( n ){
    if( this.sText.startsWith( sHtmlCommentOpen, n )){ return this.fnComment( n );}
    if( reHtmlDeclaration.test( this.sText.slice( n, n + 3 ))){
      return this.fnDeclaration( n );
    }
    return reHtmlTagStart.test( this.sText[ n + 1 ] || "" )
      ? this.fnTag( n ) : n + 1;
  }
  fScan(){
    let n = this.sText.indexOf( "<" );
    while( n >= 0 ){ n = this.sText.indexOf( "<", this.fnAt( n ));}
    return this;
  }
}
const faHtmlForText = ( sText ) => new HtmlScanner( sText ).fScan();
const fnLineHeaderHtml = ( sText, aHtml ) => {
  const sMasked = fsBlankedForRanges(
    sText, aHtml.vtComment.concat( aHtml.vtDoctype )
  );
  const nLine = sMasked.split( "\n" ).findIndex(( sLine ) => sLine.trim() !== "");
  return nLine < 0 ? Infinity : nLine;
};
const fbHtmlClosed = ( sText, nStart, nEnd ) => (
  nEnd - sHtmlCommentClose.length >= nStart + sHtmlCommentOpen.length
  && sText.startsWith( sHtmlCommentClose, nEnd - sHtmlCommentClose.length )
);
const faCommentForHtml = ( sText, aPlace, tComment, f ) => {
  const [ nStart, nEnd ] = tComment;
  const nLine = f.fnLineAt( aPlace.vnLineStart, nStart );
  const sLine = aPlace.vsLine[ nLine ];
  const nCol = nStart - aPlace.vnLineStart[ nLine ];
  const bClosed = fbHtmlClosed( sText, nStart, nEnd );
  const bOneLine = bClosed && f.fnLineAt( aPlace.vnLineStart, nEnd - 1 ) === nLine;
  return {
    nLine,
    bHeader: nLine < aPlace.nLineHeader,
    bAlone: bOneLine && (sLine.slice( 0, nCol )
      + sLine.slice( nCol + nEnd - nStart )).trim() === "",
    sBody: sText.slice(nStart + sHtmlCommentOpen.length,
      bClosed ? nEnd - sHtmlCommentClose.length : nEnd).trim(),
    sText: sLine.trim()
  };
};
const fvaCommentForHtml = ( sText, f ) => {
  const aHtml = faHtmlForText( sText );
  const vsLine = sText.split( "\n" );
  const aPlace = {
    vsLine, vnLineStart: f.fvnLineStart( vsLine ),
    nLineHeader: fnLineHeaderHtml( sText, aHtml )
  };
  return aHtml.vtComment.map(( tComment ) => faCommentForHtml(
    sText, aPlace, tComment, f
  ));
};
const faDirectiveForHtml = ( sPath, aComment, sKind, fsPosix ) => {
  if( !aComment.sBody.startsWith( "@" + sKind )){ return null;}
  const vsLoose = aComment.sBody.match( areLooseForKind[ sKind ]);
  return {
    sPath: fsPosix( sPath ), nLine: aComment.nLine + 1, sKind,
    sTarget: vsLoose === null ? "" : vsLoose[ 1 ],
    sStamp: vsLoose === null ? "" : vsLoose[ 2 ] || "",
    bWell: aComment.bAlone && areBodyForKind[ sKind ].test( aComment.sBody ),
    sText: aComment.sText
  };
};

const fCreate = ( f ) => ({
  sName: "html",
  vsExtension: [ ".html", ".htm" ],
  vsTestSuffix: [],
  fbHasTestFiles: () => false,
  faHeader: ( aSource ) => ({
    nLineCode: fnLineHeaderHtml( aSource.sText, faHtmlForText( aSource.sText )),
    nLineDoc: 0
  }),
  faSource: () => ({ sMasked: "", asnComment: new Set() }),
  fvaTestUnit: () => [],
  fsNormal: ( sPath, sText ) => f.fsNormal(
    faHtmlForText( sText ).vtComment.reduceRight(
      ( s, [ nStart, nEnd ]) => s.slice( 0, nStart ) + s.slice( nEnd ), sText
    )
  ),
  fvsClass: ( sPath, sText ) => {
    const vsClass = new Array( sText.length ).fill( "c" );
    faHtmlForText( sText ).vtComment.forEach(([ nStart, nEnd ]) => {
      for( let n = nStart; n < nEnd; n++ ){ vsClass[ n ] = "m";}
    });
    return vsClass;
  },
  fvaCodeReference: ( aFile ) => fvaCommentForHtml( aFile.sText, f )
    .flatMap(( aComment ) => vsKindCodeReference.map(( sKind ) => (
      faDirectiveForHtml( aFile.sPath, aComment, sKind, f.fsPosix )
    ))).filter( Boolean ),
  fvaFollows: ( aFile ) => fvaCommentForHtml( aFile.sText, f )
    .map(( aComment ) => faDirectiveForHtml(
      aFile.sPath, aComment, "follows", f.fsPosix
    )).filter( Boolean ).map(( aRef ) => ({
      sPath: aRef.sPath, nLine: aRef.nLine, sText: aRef.sText,
      bWell: aRef.bWell, sId: aRef.sTarget, sHash: aRef.sStamp
    })),
  ftComments: () => [ [], [] ],
  freCallWrapper: () => null,
  fbDirectiveGapLine: () => false
});
fCreate.sLanguageName = "html";
fCreate.faHtmlForText = faHtmlForText;
module.exports = fCreate;
