// @implements s-3fzgrr@cc19c25
// @implements s-rh750h@cc70238
// @implements s-p54hx2@dfa5570
// @implements s-k9xdwy@eb62f8a
// @tested-by test/language-readings.test.js
"use strict";
const fCreateJavaScript = require( "./javascript" );

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

const fvnCommentCss = ( sText ) => {
  const vsClass = new CssClassifier( sText ).fvsClass();
  return Array.from( sText, ( ch, n ) => n ).filter(( n ) => (
    vsClass[ n ] === "m" && sText.startsWith( "/*", n )
    && ( n === 0 || vsClass[ n - 1 ] !== "m" || sText.slice( n - 2, n ) === "*/" )
  ));
};

const fCreate = ( f ) => {
  const aJavaScript = fCreateJavaScript( f );
  return {
    sName: "css",
    vsExtension: [ ".css" ],
    vsTestSuffix: [],
    fbHasTestFiles: () => false,
    faHeader: () => ({ nLineCode: Infinity, nLineDoc: 0 }),
    faSource: ( sText ) => ({ sMasked: sText, asnComment: new Set() }),
    fvaTestUnit: () => [],
    fsNormal: ( sPath, sText ) => f.fsCodeNormal(
      sText, new CssClassifier( sText ).fvsClass()
    ),
    fvsClass: ( sPath, sText ) => new CssClassifier( sText ).fvsClass(),
    fvaCodeReference: ( aFile ) => aJavaScript.fvaCodeReference( aFile ),
    fvaFollows: ( aFile ) => aJavaScript.fvaFollows( aFile ),
    ftComments: ( aFile ) => [ [], fvnCommentCss( aFile.sText ) ],
    freCallWrapper: () => null,
    fbDirectiveGapLine: () => false
  };
};
fCreate.sLanguageName = "css";
fCreate.CssClassifier = CssClassifier;
fCreate.fvnCommentCss = fvnCommentCss;
module.exports = fCreate;
