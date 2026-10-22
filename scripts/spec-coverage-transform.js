"use strict";

const fs = require( "fs" );
const path = require( "path" );
const { fsSha1 } = require( "./spec-coverage-window.js" );
const {
  vsParserPlugin, fsPathRel, fbInRootScope, fxMapForSource, fsKeyMapFile
} = require( "./spec-coverage-collect.js" );

const sDirJestTransform = path.dirname( require.resolve( "@jest/transform" ));
const fxJestDependency = ( sName ) => require(
  require.resolve( sName, { paths: [ sDirJestTransform ]})
);
const { transformSync } = fxJestDependency( "@babel/core" );
const pluginIstanbul = fxJestDependency( "babel-plugin-istanbul" ).default;
const convertSourceMap = fxJestDependency( "convert-source-map" );

const sPrefixCounter = "cov_";
const sTextSelf = fs.readFileSync( __filename, "utf8" );

const faNodeRootForMember = ( aNode ) => (
  aNode.type === "MemberExpression"
    ? faNodeRootForMember( aNode.object )
    : aNode
);

const fbCounterCall = ( aNode ) => (
  aNode.type === "CallExpression"
  && aNode.arguments.length === 0
  && aNode.callee.type === "Identifier"
  && aNode.callee.name.startsWith( sPrefixCounter )
);

const fpluginCounterGuard = ({ types: t }) => {
  const fGuard = ( pathUpdate ) => {
    const aArg = pathUpdate.node.argument;
    if( aArg.type !== "MemberExpression" ){ return;}
    const aRoot = faNodeRootForMember( aArg.object );
    if( !fbCounterCall( aRoot )){ return;}
    aArg.object = t.conditionalExpression(
      t.binaryExpression(
        "===",
        t.unaryExpression( "typeof", t.identifier( aRoot.callee.name )),
        t.stringLiteral( "function" )
      ),
      aArg.object,
      t.arrayExpression([])
    );
  };
  return {
    visitor: {
      Program: {
        exit( pathProgram ){
          pathProgram.traverse({ UpdateExpression: fGuard });
  }}}};
};

const faInputForProcessed = ( xProcessed ) => {
  const aInput = typeof xProcessed === "string"
    ? { code: xProcessed, map: null }
    : xProcessed;
  if( aInput.map !== null && aInput.map !== undefined && aInput.map !== "" ){
    return aInput;
  }
  const xMap = convertSourceMap.fromSource( aInput.code );
  return { code: aInput.code, map: xMap ? xMap.toObject() : null };
};

const fvxPluginForRoot = ( sDirRoot, xMapInput ) => [
  [ pluginIstanbul, {
    compact: false,
    cwd: sDirRoot,
    exclude: [],
    extension: false,
    inputSourceMap: xMapInput,
    useInlineSourceMaps: false
  }],
  fpluginCounterGuard
];

const fxMapOwn = ( sSource, sPath, sDirRoot ) => (
  fbInRootScope( sDirRoot, fsPathRel( sDirRoot, sPath ))
    ? null
    : fxMapForSource( sSource, sPath )
);

const fsSourceInstrumented = ( sSource, sPath, aOptions ) => {
  try{
    return transformSync( sSource, {
      babelrc: false,
      configFile: false,
      filename: sPath,
      sourceType: "unambiguous",
      parserOpts: { plugins: vsParserPlugin },
      retainLines: true,
      plugins: fvxPluginForRoot(
        aOptions.config.rootDir,
        fxMapOwn( sSource, sPath, aOptions.config.rootDir )
      ),
      sourceMaps: false
    }).code;
  }
  catch( xErr ){ return null;}
};

const faInstrumented = ({ aInput, bMapAlways, sPath, aOptions }) => {
  const aResult = transformSync( aInput.code, {
    auxiliaryCommentBefore: " istanbul ignore next ",
    babelrc: false,
    caller: {
      name: "@jest/transform",
      supportsDynamicImport: aOptions.supportsDynamicImport,
      supportsExportNamespaceFrom: aOptions.supportsExportNamespaceFrom,
      supportsStaticESM: aOptions.supportsStaticESM,
      supportsTopLevelAwait: aOptions.supportsTopLevelAwait
    },
    configFile: false,
    filename: sPath,
    plugins: fvxPluginForRoot( aOptions.config.rootDir, aInput.map ),
    sourceMaps: bMapAlways || aInput.map !== null ? "both" : false
  });
  return aResult && typeof aResult.code === "string"
    ? { code: aResult.code, map: aResult.map || null }
    : aInput;
};

const fxExportForModule = ( xModule ) => (
  xModule && xModule.__esModule && xModule.default ? xModule.default : xModule
);

class GuardedTransformer {
  constructor( transformerInner, xConfigInner ){
    this.transformerInner = transformerInner;
    this.xConfigInner = xConfigInner;
    this.canInstrument = true;
  }

  faOptionsInner( aOptions ){
    return {
      ...aOptions, instrument: false, transformerConfig: this.xConfigInner
    };
  }

  fsKeyInner( sSource, sPath, aOptions ){
    const transformer = this.transformerInner;
    return transformer !== null && typeof transformer.getCacheKey === "function"
      ? transformer.getCacheKey(
        sSource, sPath, this.faOptionsInner( aOptions )
      )
      : "";
  }

  getCacheKey( sSource, sPath, aOptions ){
    return fsSha1([
      this.fsKeyInner( sSource, sPath, aOptions ),
      sSource,
      sPath,
      fsKeyMapFile( sSource, sPath ),
      aOptions.configString,
      aOptions.instrument ? "instrument" : "",
      sTextSelf
    ].join( "\0" ));
  }

  xProcessedInner( sSource, sPath, aOptions ){
    return this.transformerInner === null
      ? sSource
      : this.transformerInner.process(
        sSource, sPath, this.faOptionsInner( aOptions )
      );
  }

  process( sSource, sPath, aOptions ){
    const sInstrumented = aOptions.instrument
      ? fsSourceInstrumented( sSource, sPath, aOptions )
      : null;
    return sInstrumented === null
      ? this.faProcessedThenInstrumented( sSource, sPath, aOptions )
      : faInputForProcessed(
        this.xProcessedInner( sInstrumented, sPath, aOptions )
      );
  }

  faProcessedThenInstrumented( sSource, sPath, aOptions ){
    const aInput = faInputForProcessed(
      this.xProcessedInner( sSource, sPath, aOptions )
    );
    return aOptions.instrument
      ? faInstrumented({
        aInput, bMapAlways: this.transformerInner === null, sPath, aOptions
      })
      : aInput;
  }
}

const fptransformerInner = async ( sPathInner, xConfigInner ) => {
  if( sPathInner === null ){ return null;}
  const xExport = fxExportForModule( require( sPathInner ));
  return typeof xExport.createTransformer === "function"
    ? xExport.createTransformer( xConfigInner )
    : xExport;
};

module.exports = {
  fpluginCounterGuard,
  async createTransformer({ sPathInner, xConfigInner }){
    return new GuardedTransformer(
      await fptransformerInner( sPathInner, xConfigInner ), xConfigInner
    );
  }
};
