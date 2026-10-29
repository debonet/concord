// @implements s-6qaxu0@d176234
// @implements s-3dd31f@d5db4b0
// @implements s-f728ge@f8c69ea
// @implements s-knvuxk@5a76433
// @implements s-ujk1xp@559fff0
// @implements s-g4fddq@4dae6be
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const path = require( "path" );
const {
  sFileSummary,
  SourceIndex,
  faRecordForResult,
  fsPathWindow,
  fsPathRecord,
  fxJsonRead,
  faSummaryForResults
} = require( "./spec-coverage-collect.js" );

class SpecCoverageReporter {
  constructor( aGlobalConfig, aOption ){
    this.sDirRun = aOption.sDirRun;
    this.sDirRoot = aOption.sDirRoot;
    this.sSuite = aOption.sSuite;
    this.index = new SourceIndex();
  }

  onTestResult( aTest, aResult ){
    const sPathWindow = fsPathWindow( this.sDirRun, aResult.testFilePath );
    const aRecord = faRecordForResult({
      sDirRoot: this.sDirRoot,
      sSuite: this.sSuite,
      sPathTest: aResult.testFilePath,
      aCoverage: aResult.coverage || {},
      aWindow: fxJsonRead( sPathWindow ),
      index: this.index
    });
    fs.writeFileSync(
      fsPathRecord( this.sDirRun, aResult.testFilePath ),
      JSON.stringify( aRecord )
    );
    fs.rmSync( sPathWindow, { force: true });
  }

  onRunComplete( setContext, aResults ){
    fs.writeFileSync(
      path.join( this.sDirRun, sFileSummary ),
      JSON.stringify( faSummaryForResults( aResults ))
    );
  }
}

module.exports = SpecCoverageReporter;
