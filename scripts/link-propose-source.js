// @tested-by test/link-propose.test.js
"use strict";

const babelParser = require( "@babel/parser" );
const { ftMaskForPath, ftMaskRust } = require( "./spec-map.js" );

const reFileScript = /\.(?:js|mjs|cjs|jsx|ts|tsx)$/;
const reFileTypeScript = /\.(?:ts|tsx)$/;
const reFileTsx = /\.tsx$/;
const reFileCss = /\.css$/;
const reFileHtml = /\.html?$/;
const reFileRust = /\.rs$/;
const reCommentCss = /\/\*[\s\S]*?(?:\*\/|$)/g;
const reCommentHtml = /<!--[\s\S]*?(?:-->|$)/g;
const asKeySkipped = new Set([
  "loc", "start", "end", "extra", "range", "comments", "leadingComments",
  "trailingComments", "innerComments", "tokens"
]);
const asTypeLoadSource = new Set([
  "ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"
]);
const asTypeNamed = new Set([
  "FunctionDeclaration", "FunctionExpression", "ClassDeclaration",
  "ClassExpression", "TSInterfaceDeclaration", "TSTypeAliasDeclaration",
  "TSEnumDeclaration"
]);
const asTypeMember = new Set([
  "ClassMethod", "ClassPrivateMethod", "ClassProperty",
  "ClassPrivateProperty", "ClassAccessorProperty", "TSDeclareMethod"
]);

const fbScript = ( sPath ) => reFileScript.test( sPath );

const fvvsPluginForPath = ( sPath ) => {
  if( reFileTsx.test( sPath )){ return [[ "typescript", "jsx" ]];}
  if( reFileTypeScript.test( sPath )){ return [[ "typescript" ]];}
  return [[ "jsx" ], []];
};

const faFileParsed = ( sText, sPath ) => {
  for( const vsPlugin of fvvsPluginForPath( sPath )){
    try{
      return babelParser.parse( sText, {
        sourceType: "unambiguous",
        errorRecovery: true,
        allowReturnOutsideFunction: true,
        plugins: vsPlugin
      });
    }
    catch( xErr ){ continue;}
  }
  return null;
};

const fsBlankedRanges = ( sText, vtRange ) => {
  const vch = sText.split( "" );
  vtRange.forEach(([ nStart, nEnd ]) => {
    for( let n = nStart; n < nEnd; n++ ){
      if( vch[ n ] !== "\n" && vch[ n ] !== "\r" ){ vch[ n ] = " ";}
    }
  });
  return vch.join( "" );
};

const fsBlankedMatches = ( sText, re ) => fsBlankedRanges(
  sText,
  Array.from( sText.matchAll( re ), ( vs ) => [
    vs.index, vs.index + vs[ 0 ].length
  ])
);

const fbLiteral = ( x ) => (
  x !== null && typeof x === "object" && x.type === "StringLiteral"
);

// @implements s-kb99wj@9e816c1
const fxSpecifierForCall = ( x ) => {
  const bRequire = x.callee.type === "Identifier"
    && x.callee.name === "require";
  const bImport = x.callee.type === "Import";
  return ( bRequire || bImport )
    && x.arguments.length === 1
    && fbLiteral( x.arguments[ 0 ])
    ? x.arguments[ 0 ]
    : null;
};

const fxSpecifierForNode = ( x ) => {
  if( asTypeLoadSource.has( x.type )){
    return fbLiteral( x.source ) ? x.source : null;
  }
  if( x.type === "CallExpression" ){ return fxSpecifierForCall( x );}
  if( x.type === "ImportExpression" ){
    return fbLiteral( x.source ) && !x.options ? x.source : null;
  }
  return null;
};

// @implements s-50fqg8@d697296
const fvsNameForPattern = ( x ) => {
  if( x === null || typeof x !== "object" ){ return [];}
  if( x.type === "Identifier" ){ return [ x.name ];}
  if( x.type === "ObjectPattern" ){
    return x.properties.flatMap(( xProp ) => fvsNameForPattern(
      xProp.type === "RestElement" ? xProp.argument : xProp.value
    ));
  }
  if( x.type === "ArrayPattern" ){
    return x.elements.flatMap( fvsNameForPattern );
  }
  if( x.type === "AssignmentPattern" ){ return fvsNameForPattern( x.left );}
  return x.type === "RestElement" ? fvsNameForPattern( x.argument ) : [];
};

const fvsDefinedForNode = ( x ) => {
  if( x.type === "VariableDeclarator" ){ return fvsNameForPattern( x.id );}
  if( asTypeNamed.has( x.type )){
    return x.id && x.id.type === "Identifier" ? [ x.id.name ] : [];
  }
  if( asTypeMember.has( x.type )){
    return !x.computed && x.key && x.key.type === "Identifier"
      ? [ x.key.name ]
      : [];
  }
  return [];
};

class FactCollector {
  constructor(){
    this.vsSpecifier = [];
    this.vsLiteral = [];
    this.asDefine = new Set();
    this.asxSpecifier = new Set();
  }

  fNode( x ){
    const xSpecifier = fxSpecifierForNode( x );
    if( xSpecifier !== null ){
      this.vsSpecifier.push( xSpecifier.value );
      this.asxSpecifier.add( xSpecifier );
    }
    if( x.type === "StringLiteral" && !this.asxSpecifier.has( x )){
      this.vsLiteral.push( x.value );
    }
    if( x.type === "TemplateLiteral" && x.expressions.length === 0 ){
      this.vsLiteral.push( x.quasis[ 0 ].value.cooked || "" );
    }
    fvsDefinedForNode( x ).forEach(( sName ) => this.asDefine.add( sName ));
  }

  fChildren( x, vxStack ){
    Object.keys( x )
      .filter(( sKey ) => !asKeySkipped.has( sKey ))
      .forEach(( sKey ) => {
        const xChild = x[ sKey ];
        if( xChild !== null && typeof xChild === "object" ){
          vxStack.push( xChild );
        }
      });
  }

  fVisit( xRoot ){
    const vxStack = [ xRoot ];
    while( vxStack.length > 0 ){
      const x = vxStack.pop();
      if( Array.isArray( x )){
        for( let n = x.length - 1; n >= 0; n-- ){
          if( x[ n ] !== null && typeof x[ n ] === "object" ){
            vxStack.push( x[ n ]);
          }
        }
        continue;
      }
      if( typeof x.type === "string" ){ this.fNode( x );}
      this.fChildren( x, vxStack );
    }
    return this;
  }
}

const faFactsNone = ( sCode ) => ({
  vsSpecifier: [], vsLiteral: [], asDefine: new Set(), sCode
});

// @implements s-x28dlo@eaa2cb6
const faFactsForScript = ( sPath, sText ) => {
  const aFile = faFileParsed( sText, sPath );
  if( aFile === null ){
    return faFactsNone( ftMaskForPath( sText, sPath )[ 0 ]);
  }
  const collector = new FactCollector().fVisit( aFile.program );
  return {
    vsSpecifier: collector.vsSpecifier,
    vsLiteral: collector.vsLiteral,
    asDefine: collector.asDefine,
    sCode: fsBlankedRanges( sText, ( aFile.comments || []).map(( x ) => [
      x.start, x.end
    ]))
  };
};

const fsCodeForText = ( sPath, sText ) => {
  if( reFileCss.test( sPath )){ return fsBlankedMatches( sText, reCommentCss );}
  if( reFileHtml.test( sPath )){
    return fsBlankedMatches( sText, reCommentHtml );
  }
  if( reFileRust.test( sPath )){
    return fsBlankedRanges( sText, ftMaskRust( sText )[ 3 ].vtComment );
  }
  return sText;
};

// @implements s-ebmvdj@1e3219b
const faFactsForFile = ( sPath, sText ) => (
  fbScript( sPath )
    ? faFactsForScript( sPath, sText )
    : faFactsNone( fsCodeForText( sPath, sText ))
);

// @implements s-x28dlo@eaa2cb6
class TermIndex {
  constructor( vsTerm ){
    this.vaNode = [{ aChild: new Map(), nFail: 0, vsOut: [] }];
    Array.from( new Set( vsTerm )).forEach(( sTerm ) => this.fAdd( sTerm ));
    this.fLink();
  }

  fAdd( sTerm ){
    let nNode = 0;
    for( const ch of sTerm ){
      const aNode = this.vaNode[ nNode ];
      if( !aNode.aChild.has( ch )){
        aNode.aChild.set( ch, this.vaNode.length );
        this.vaNode.push({ aChild: new Map(), nFail: 0, vsOut: [] });
      }
      nNode = aNode.aChild.get( ch );
    }
    this.vaNode[ nNode ].vsOut.push( sTerm );
  }

  fnNext( nNode, ch ){
    let n = nNode;
    while( n !== 0 && !this.vaNode[ n ].aChild.has( ch )){
      n = this.vaNode[ n ].nFail;
    }
    return this.vaNode[ n ].aChild.get( ch ) || 0;
  }

  fLink(){
    const vnQueue = Array.from( this.vaNode[ 0 ].aChild.values());
    for( let nQueue = 0; nQueue < vnQueue.length; nQueue++ ){
      const aNode = this.vaNode[ vnQueue[ nQueue ]];
      aNode.aChild.forEach(( nChild, ch ) => {
        const aChild = this.vaNode[ nChild ];
        aChild.nFail = this.fnNext( aNode.nFail, ch );
        aChild.vsOut = aChild.vsOut.concat(
          this.vaNode[ aChild.nFail ].vsOut
        );
        vnQueue.push( nChild );
      });
    }
  }

  fasTermIn( sText ){
    const asTerm = new Set();
    let nNode = 0;
    for( const ch of sText ){
      nNode = this.fnNext( nNode, ch );
      this.vaNode[ nNode ].vsOut.forEach(( sTerm ) => asTerm.add( sTerm ));
    }
    return asTerm;
  }
}

module.exports = { fbScript, faFactsForFile, TermIndex };
