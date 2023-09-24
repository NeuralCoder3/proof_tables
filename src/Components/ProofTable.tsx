import { useEffect, useState } from "react";
import Row from "./Row";
import { Assumption, GoalMap } from "./interfaces";

export interface TableProps {
    sid: number,
    name: string,
    assumptions: Assumption[],
    goal: string,
    goalmap: GoalMap,
    tick: boolean,
    rollback: (sid: number) => void
}

export default function ProofTable(props: TableProps) {

    const opening = `Lemma ${props.name} `+
        props.assumptions.map(a => "("+a.name + " : " + a.type+")").join(" ") +
        `: ${props.goal}.`; 

    const sid = props.sid;
    // @ts-ignore
    const worker = window.worker;

    useEffect(() => {
        let cancel = false;
        for(let i in worker.sids) {
            if(+i>=sid+1) {
                cancel = true;
                break;
            }
        }
        if(cancel) {
            console.log("Cancelling", sid+1, "in worker.");
            // worker.cancel(sid+1);
            // await window.sleepWait(workder.sids)
        }
        console.log("Opening:", opening);
        console.log("Adding", sid+1, "to worker.")
        worker.add(sid, sid+1, opening);
        worker.exec(sid+1);
        worker.goals(sid+1);
    }, [opening]);

    const [rules, setRules] = useState<{[sid: number]: string}>({});

    const rows = 
        Array.from(props.goalmap)
        .filter(([sid, goals]) => sid >= props.sid)
        .sort(([sid1, goals1], [sid2, goals2]) => sid1-sid2)
        .map(([sid, goals]) =>
            <Row key={sid} 
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
                    props.goalmap.get(sid-1)?.[0]
                }
                hideAssumptions={sid === props.sid+1}
                rule={sid in rules && rules[sid] && props.goalmap.has(sid) ?
                    rules[sid] : null}
                rollback={() => {
                    props.rollback(sid+1);
                    // setRules({...rules, [sid]: ""});
                    // filter all sids larger than sid
                    setRules(Object.fromEntries(
                        Object.entries(rules).filter(([sid2, _]) => +sid2 < sid)
                    ));
                }}
                applyRule={(rule: string) => {
                    console.log("Applying rule", rule, "to", sid);
                    if (rule === "") return;
                    if(!rule.endsWith(".")) rule += ".";
                    rule = rule.replace(/\s+/g, " ");
                    rule = rule.replace("..", ".");
                    rule = rule.replace(" .", ".");
                    setRules({...rules, [sid]: rule});
                    worker.add(sid, sid+1, rule);
                    worker.exec(sid+1);
                    worker.goals(sid+1);
                }}
            />
        );

    // console.log("Rendering table with", rows.length, "rows.");
    // console.log("goalmap:", props.goalmap);

    // force update when entries in goalmap changes
    useEffect(() => {
        console.log("Tick", props.tick, props.goalmap);
    }, [props.tick]);

    return (
        <div>
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
            </table>
        </div>
    )
}