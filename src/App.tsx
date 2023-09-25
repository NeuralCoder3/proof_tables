import { useState } from 'react';
import './App.css';
import ProofTable from './Components/ProofTable';
import { CoqGoalInfo, Goal, GoalMap, Hypothesis } from './Components/interfaces';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Alert } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// @ts-ignore
if (!window.module_finished) {
  // @ts-ignore
  window.module_finished = new Promise(resolve => window.module_finished_resolve = resolve);
}

class Observer {
  when_ready: Promise<unknown>;
  private _ready!: (value: void) => void;
  goalmap: GoalMap;
  announce: () => void;
  constructor(map: GoalMap, announce: () => void) {
    this.goalmap = map;
    this.announce = announce;
    this.when_ready = new Promise<void>(resolve => this._ready = resolve);
  }
  coqReady() { this._ready(); }
  coqError() { 
    console.log("Error in coq");
  }
  coqExn() { 
    console.log("Exception in coq");
  }
  coqGoalInfo(sid: number, goals: CoqGoalInfo | undefined) {
    // @ts-ignore
    const fpp = window.fpp;
    console.log("State at sid", sid, goals);
    if (!goals || !goals.goals) {
      console.log("No more goals.");
      // this.goalmap.set(sid,null);
      return;
    }
    const goalArray: Goal[] = [];
    for (let i = 0; i < goals.goals.length; i++) {
      const goal = goals.goals[i];
      const conclusion = fpp.pp2Text(goal.ty);
      const hypotheses: Hypothesis[] = [];
      for (let j = 0; j < goal.hyp.length; j++) {
        const hyp = goal.hyp[j];
        const name = hyp[0][0][1];
        const type = fpp.pp2Text(hyp[2]);
        hypotheses.push({ name, type });
      }
      goalArray.push({ conclusion, hypotheses });
    }
    this.goalmap.set(sid, goalArray);
    console.log("Set ", sid, "to", goalArray);
    this.announce();

    // const goal0 = goals.goals[0];
    // console.log("Goal 0:", goal0);
    // const hyp = goal0.hyp;
    // for (var i = 0; i < hyp.length; i++) {
    //   const h = hyp[i];
    //   console.log("  Hyp", i, ":", h);
    //   const name = h[0][0][1];
    //   const ty = h[2];
    //   console.log("  Name:", name);
    //   console.log("  Type:", fpp.pp2Text(ty));
    // }
    // const concl = goal0.ty;
    // console.log("Conclusion:", fpp.pp2Text(concl));
  }
}

// this ignore is only necessary because npm run start doesn't recognize the es version
// @ts-ignore
await new Promise<void>(resolve => {
  function run() {
    // @ts-ignore
    if (window.module_finished_loading === true)
      resolve();
    else
      setTimeout(run, 100);
  }
  run();
});

// @ts-ignore
const worker = window.worker;
console.log("Let's go!")

const goalmap: GoalMap = new Map();
// const o = new Observer(goalmap, announcement);
const o = new Observer(goalmap, () => { });
worker.observers.push(o);

function App() {

  const [tick, setTick] = useState(false);
  const announcement = () => {
    // update the proof table
    // console.log("Announcing change", goalmap);
    setTick(!tick);
  };
  const rollback = (sid:number) => {
    if(! (sid in worker.sids))
      return;
    console.log("Rolling back to", sid);
    try{
    worker.cancel(sid);
    } catch(e) {
    }
    // remove all entries in goalmap with sid >= sid
    for (let k of goalmap.keys()) {
      if (k >= sid) {
        goalmap.delete(k);
      }
    }
    announcement();
  };
  o.announce = announcement;

  // let goal = 'X -> X -> X \\/ Y';
  let goal = '(X /\\ Y) /\\ Z -> X /\\ (Y /\\ Z)';
  let assumptions: Hypothesis[] = [
                { name: 'X', type: 'Prop' },
                { name: 'Y', type: 'Prop' },
                { name: 'Z', type: 'Prop' },
              ];
  // GET request goal
  const url = new URL(window.location.href);
  const goalParam = url.searchParams.get("goal");
  if(goalParam) {
    goal = goalParam;
  }
  // GET request assumptions
  // split by ; and then :
  const assumptionsParam = url.searchParams.get("assumptions");
  if(assumptionsParam) {
    assumptions = assumptionsParam.split(";").map(a => {
      const [name, type] = a.split(":");
      return {name, type};
    });
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <main>
        <div className="App">
          <header className="App-header">
            {/* {proofTable} */}
            <Alert severity="warning">
              This tool is not yet tested.
              {/* Multiple tables are not fully supported by the frontend yet. */}
              You can contribute <a href="https://github.com/NeuralCoder3/proof_tables/tree/master">here</a>.
            </Alert>
            <br />
            <ProofTable
              // @ts-ignore
              sid={window.sid}
              name='foo'
              assumptions={assumptions}
              goal={goal}
              goalmap={o.goalmap}
              tick={tick}
              rollback={rollback}
            />
          </header>
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
