import React from 'react';
import logo from './logo.svg';
import './App.css';
// @ts-ignore
// import { JsCoq } from './jscoq/dist/frontend/index';


import { JsCoq, CoqManager } from 'jscoq';
    // import { JsCoq } from './node_modules/jscoq/jscoq.js';

    // var jscoq_ids : string[] = [];
    // var jscoq_opts = {
    //     prelude:       true,
    //     implicit_libs: true,
    //     editor:        { mode: { 'company-coq': true }, keyMap: 'default' },
    //     init_pkgs:     ['init'],
    //     all_pkgs:      ['coq']
    // };

    // const hidden_textarea = document.createElement('textarea');
    // hidden_textarea.id = 'area';

    // JsCoq.start(jscoq_ids, jscoq_opts);
    // JsCoq.load().then(() => {
    //   console.log("JsCoq loaded");
    // });
    // JsCoq.start(['code']).then(() => {
    //   console.log("JsCoq started");
    // });
    // console.log(coq);

// const coq = new CoqManager([]);
// const coq = new CoqWorker(null,null,"js",true);

// console.log(coq);

function App() {

  // const coq = JsCoq.start();
  // const coq = new CoqManager([],
  //   {
  //     base_path: "../../",
  //   }
  //   );

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
