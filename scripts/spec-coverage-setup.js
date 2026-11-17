// @implements s-qpkoc3@605c600
// @implements s-bi8reu@bf16aef
// @implements s-dokd3g@edd7c92
// @tested-by test/spec-coverage-jest.test.js
// @tested-by test/spec-coverage.test.js
"use strict";

const fs = require( "fs" );
const {
  sEnvRun,
  sKeyTest,
  favzSnapshot,
  favzRaised,
  fvnLineFrameForStack,
  fsPathWindow
} = require( "./spec-coverage-window.js" );

const fxStateCircus = () => {
  const xSymbol = Object.getOwnPropertySymbols( globalThis ).find(( x ) => (
    x.description === "JEST_STATE_SYMBOL"
  ));
  return xSymbol === undefined ? null : globalThis[ xSymbol ];
};

class TestWindows {
  sDirRun;
  avzBefore = {};
  vaTest = [];
  sPathTest = null;

  fOpen(){
    this.sPathTest = expect.getState().testPath;
    this.avzBefore = favzSnapshot( globalThis.__coverage__ );
  }

  fClose(){
    const aState = fxStateCircus();
    const aTest = aState === null ? null : aState.currentlyRunningTest;
    this.vaTest.push({
      sName: expect.getState().currentTestName || "",
      nKey: globalThis[ Symbol.for( sKeyTest )] ?? null,
      vnLineFrame: aTest === null || !aTest.asyncError
        ? []
        : fvnLineFrameForStack( aTest.asyncError.stack, this.sPathTest ),
      avzRaised: favzRaised(
        this.avzBefore, favzSnapshot( globalThis.__coverage__ )
      )
    });
  }

  fWrite(){
    const sPathTest = this.sPathTest || expect.getState().testPath;
    fs.writeFileSync(
      fsPathWindow( this.sDirRun, sPathTest ),
      JSON.stringify({ vaTest: this.vaTest })
    );
  }
}

if( process.env[ sEnvRun ]){
  const windows = new TestWindows();
  windows.sDirRun = process.env[ sEnvRun ];
  beforeEach(() => windows.fOpen());
  afterEach(() => windows.fClose());
  afterAll(() => windows.fWrite());
}

module.exports = { TestWindows };
