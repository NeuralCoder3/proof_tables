import { useEffect, useState } from "react";
import Row from "./Row";
import { GoalMap, Hypothesis } from "./interfaces";
import { Button } from "@mui/material";
import { InputDialog } from "./InputDialog";

export interface TableProps {
    sid: number,
    name: string,
    goalmap: GoalMap,
    tick: boolean,
    rollback: (sid: number) => void
}

interface RowTree {
    expectedChildren: number,
    children: RowTree[],
    rows: [number,JSX.Element][],
    parent?: RowTree,
    goalCount: number,
}


export default function ProofTable(props: TableProps) {

  // let goal = 'X -> X -> X \\/ Y';
  let initGoal = '(X /\\ Y) /\\ Z -> X /\\ (Y /\\ Z)';
  let initAssumptions: Hypothesis[] = [
                { name: 'X', type: 'Prop' },
                { name: 'Y', type: 'Prop' },
                { name: 'Z', type: 'Prop' },
              ];
  // GET request goal
  const url = new URL(window.location.href);
  const goalParam = url.searchParams.get("goal");
  if(goalParam) {
    initGoal = goalParam;
  }
  // GET request assumptions
  // split by ; and then :
  const assumptionsParam = url.searchParams.get("assumptions");
  if(assumptionsParam) {
    initAssumptions = assumptionsParam.split(";").map(a => {
      const [name, type] = a.split(":");
      return {name, type};
    });
  }

    const [goal, setGoal] = useState<string>(initGoal);
    const [assumptions, setAssumptions] = useState<Hypothesis[]>(initAssumptions);

    const opening = `Lemma ${props.name} ` +
        assumptions.map(a => "(" + a.name + " : " + a.type + ")").join(" ") +
        `: ${goal}.`;

    const sid = props.sid;
    // @ts-ignore
    const worker = window.worker;

    useEffect(() => {
        let cancel = false;
        for (let i in worker.sids) {
            if (+i >= sid + 1) {
                cancel = true;
                break;
            }
        }
        if (cancel) {
            console.log("Cancelling", sid + 1, "in worker.");
            // worker.cancel(sid+1);
            // await window.sleepWait(workder.sids)
        }
        console.log("Opening:", opening);
        console.log("Adding", sid + 1, "to worker.")
        worker.add(sid, sid + 1, opening);
        worker.exec(sid + 1);
        worker.goals(sid + 1);
    }, [opening, sid, worker]);

    const [rules, setRules] = useState<{ [sid: number]: string }>({});

    const overwriteGoal = (goal: string) => {
        props.rollback(props.sid+1);
        setRules(Object.fromEntries(
            Object.entries(rules).filter(([sid2, _]) => +sid2 < props.sid+1)
        ));
        let newAssumptions : Hypothesis[] = [];
        // parse away all "forall ([name]:[type]),"
        let newGoal = goal;
        while(newGoal.startsWith("forall")){
            // get part until first comma
            const i = newGoal.indexOf(",");
            const part = newGoal.substring(0,i+1).trim();
            if (part.indexOf(":") === -1) break;
            // only second order parameters
            if (part.indexOf("Prop") === -1) break;
            // remove part from goal
            newGoal = newGoal.substring(i+1).trim();
            // get name and type
            const [name, type] = part
            .replace("forall","")
            // replace last ,
            .replace(/,(?=[^,]*$)/, "")
            .trim()
            // replace first ( and last )
            .replace(/^\(/, "")
            .replace(/\)$/, "")
            .split(":").map(s => s.trim());
            newAssumptions.push({name,type});
        }
        setGoal(newGoal);
        setAssumptions(oldAssumptions => 
            oldAssumptions.filter(a =>
                !newAssumptions.some(a2 => a2.name === a.name)
            ).concat(newAssumptions)
        );
        // update url
        const url = new URL(window.location.href);
        url.searchParams.set("goal", encodeURIComponent(newGoal));
        url.searchParams.set("assumptions", encodeURIComponent(
            newAssumptions.map(a => a.name+":"+a.type).join(";")
        ));
        window.history.replaceState({}, "", url.toString());
    }

    const headSid = Math.max(...Array.from(props.goalmap.keys()));
    const rows : [number,JSX.Element][] =
        Array.from(props.goalmap)
            .filter(([sid, goals]) => sid >= props.sid)
            .sort(([sid1, goals1], [sid2, goals2]) => sid1 - sid2)
            .map(([sid, goals]) =>
                [sid,<Row key={sid}
                    isHead={sid === headSid}
                    goal={
                        goals[0]
                        // {
                        //     ...goals[0],
                        //     hypotheses: goals[0].hypotheses.filter(h =>
                        //         !props.goalmap.has(sid-1) ||
                        //         !props.goalmap.get(sid-1)!.some(g =>
                        //             g.hypotheses.some(h2 => h2.name === h.name)
                        //         ))
                        // }
                    }
                    prevGoal={
                        props.goalmap.get(sid - 1)?.[0]
                    }
                    isInitial={sid === props.sid + 1}
                    rule={sid in rules && rules[sid] && props.goalmap.has(sid) ?
                        rules[sid] : null}
                    rollback={() => {
                        props.rollback(sid + 1);
                        // setRules({...rules, [sid]: ""});
                        // filter all sids larger than sid
                        setRules(Object.fromEntries(
                            Object.entries(rules).filter(([sid2, _]) => +sid2 < sid)
                        ));
                    }}
                    applyRule={(rule: string) => {
                        console.log("Applying rule", rule, "to", sid);
                        if (rule === "") return;
                        if (!rule.endsWith(".")) rule += ".";
                        rule = rule.replace(/\s+/g, " ");
                        rule = rule.replace("..", ".");
                        rule = rule.replace(" .", ".");
                        setRules({ ...rules, [sid]: rule });
                        worker.add(sid, sid + 1, rule);
                        worker.exec(sid + 1);
                        worker.goals(sid + 1);
                    }}
                    setGoal={overwriteGoal}
                />
                ]
            );

    // let groups = [];
    // let goalCount = 0;
    const tree: RowTree = {
        expectedChildren: 1,
        goalCount: 1,
        children: [],
        rows: [],
    };

    // delinearize goal count
    // if next has more goals => set expectedChildren to goal count of next
    // if next has less goals => end current tree (set expectedChildren to 0)
    //   go back up until expectedChildren is less than current children.length

    let currentTree = tree;

    // iterate over rows
    for (let i = 0; i < rows.length; i++) {
        const [sid, row] = rows[i];
        const goalCount = props.goalmap.get(sid)?.length || 0;
        console.log("Add SID", sid, "with", goalCount, "goals to tree.");

        if(goalCount>currentTree.goalCount){
            console.log("Create new subtree");
            // create new subtree
            currentTree.expectedChildren = goalCount;
            const oldTree = currentTree;
            currentTree = {
                parent: oldTree,
                expectedChildren: -1,
                goalCount,
                children: [],
                rows: [],
            };
            oldTree.children.push(currentTree);
            currentTree.rows.push([sid,row]);
        } else if(goalCount<currentTree.goalCount){
            console.log("End current subtree");
            // end current subtree
            currentTree.expectedChildren = 0;
            while(currentTree.parent && currentTree.parent.expectedChildren <= currentTree.parent.children.length){
                currentTree = currentTree.parent;
            }
            // currentTree.rows.push(row);
            const oldTree = currentTree.parent;
            if(!oldTree) break;
            // console.log("Up level to", oldTree.rows[0][0]);
            currentTree = {
                parent: oldTree,
                expectedChildren: -1,
                goalCount,
                children: [],
                rows: [],
            };
            oldTree.children.push(currentTree);
            currentTree.rows.push([sid,row]);
        } else {
            // add to current subtree
            currentTree.rows.push([sid,row]);
            console.log("Add to current subtree");
        }
    }
    console.log("Tree:", tree);

    function renderTree(tree:RowTree,toplevel=true) {
            return (<table className="prooftable">
                <thead>
                    <tr>
                        <th>Assumptions</th>
                        <th>Goal</th>
                        <th>Rule</th>
                    </tr>
                </thead>
                <tbody>
                    {tree.rows.map(([sid,row]) => row)}
                    <tr>
                        <td colSpan={3}>
                            {
                                tree.children.map(child => 
                                    <div 
                                    // style={{ width: 
                                    //     // Math.round(100/tree.children.length-1)+"%" }}
                                    //     Math.round(100/tree.expectedChildren-1)+"%" }}
                                        className="subprooftable"
                                        >
                                    {renderTree(child,false)}
                                    </div>
                                )
                            }
                            {
                                // render expected children - actual children many boxes
                                Array.from({length:tree.expectedChildren-tree.children.length}).map((_,i) =>
                                    <span key={i} className="proofblock"></span>
                                    // <div style={{ width: 
                                    //     Math.round(100/tree.children.length-1)+"%" }}
                                    //     className="subprooftable"
                                    //     >
                                    // </div>
                                )
                            }
                        </td>
                    </tr>
                </tbody>
            </table>);
    }


    // console.log("Rendering table with", rows.length, "rows.");
    // console.log("goalmap:", props.goalmap);

    // force update when entries in goalmap changes
    useEffect(() => {
        console.log("Tick", props.tick, props.goalmap);
    }, [props.tick]);

    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState<string>("");

    function getCoqProof() {
        let s = opening+"\n";
        s+="Proof.\n";
        s+=
            Array.from(props.goalmap.keys())
            .filter((sid) => sid in rules)
            .map(
                (sid) => "  "+rules[sid]
            ).join("\n");
        s+="\nQed."
        return s;
    }

    return (
        <div className="proofcontainer">
            {renderTree(tree)}
            {/* <br />
            <br />
            <br />
            <table className="prooftable">
                <thead>
                    <tr>
                        <th>Assumptions</th>
                        <th>Goal</th>
                        <th>Rule</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table> */}
                    {/* <tr>
                        <td colSpan={3}>
                            <table style={{ width: "50%" }}>
                                <tbody>
                                    <tr>
                                        <td>A</td>
                                        <td>A</td>
                                        <td>A</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr> */}
            <br />
            <Button
                onClick={() => {
                    setShowPopup(true);
                    setPopupContent(getCoqProof());
                }}
            >
                Show Coq Code
            </Button>

                    <InputDialog
                      open={showPopup}
                      setOpen={setShowPopup}
                      title="Coq Proof"
                      description={"The underlying Coq proof script."}
                      defaultValue={popupContent}
                      onConfirm={() => {
                        // setShowPopup(false);
                        return null;
                      }}
                      readonly={true}
                    />

        </div>
    )
}