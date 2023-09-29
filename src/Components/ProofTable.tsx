import { useEffect, useState } from "react";
import Row from "./Row";
import { Goal, GoalMap, Hypothesis } from "./interfaces";
import { Button } from "@mui/material";
import { InputDialog } from "./InputDialog";

export interface TableProps {
    sid: number,
    name: string,
    goalmap: GoalMap,
    tick: boolean,
    rollback: (sid: number) => void
}

interface RowTree<Row> {
    expectedChildren: number,
    children: RowTree<Row>[],
    rows: Row[], // [number,JSX.Element]
    parent?: RowTree<Row>,
    goalCount: number,
}


export default function ProofTable(props: TableProps) {

    let initGoal = '(X /\\ Y) /\\ Z -> X /\\ (Y /\\ Z)';
    let initAssumptions: Hypothesis[] = [
        { name: 'X', type: 'Prop' },
        { name: 'Y', type: 'Prop' },
        { name: 'Z', type: 'Prop' },
    ];
    // GET request goal
    const url = new URL(window.location.href);
    const goalParam = url.searchParams.get("goal");
    if (goalParam) {
        initGoal = decodeURIComponent(goalParam);
    }
    if (initGoal.endsWith(".")) initGoal = initGoal.substring(0, initGoal.length - 1).trim();
    // GET request assumptions
    // split by ; and then :
    const assumptionsParam = url.searchParams.get("assumptions");
    if (assumptionsParam) {
        initAssumptions = assumptionsParam.split(";").map(a => {
            const [name, type] = a.split(":");
            return { name, type: decodeURIComponent(type) };
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

    const overwriteGoal = (newGoalString: string) => {
        let newGoal = newGoalString;
        // strip trailing .
        if (newGoal.endsWith(".")) newGoal = newGoal.substring(0, newGoal.length - 1).trim();
        if (newGoal === "") return;
        if (newGoal === goal) return;
        props.rollback(props.sid + 1);
        setRules(Object.fromEntries(
            Object.entries(rules).filter(([sid2, _]) => +sid2 < props.sid + 1)
        ));
        let newAssumptions: Hypothesis[] = [];
        // parse away all "forall ([name]:[type]),"
        // Coq support
        // forall (P Q: Prop), P \/ Q -> Q \/ P.
        // forall (P: Prop) (Q: Prop), P \/ Q -> Q \/ P.
        // forall (P: Prop), forall (Q: Prop), P \/ Q -> Q \/ P
        // We support the first and last one for assumption parsing
        while (newGoal.startsWith("forall")) {
            // get part until first comma
            const i = newGoal.indexOf(",");
            const part = newGoal.substring(0, i + 1).trim();
            if (part.indexOf(":") === -1) break;
            // only second order parameters
            if (part.indexOf("Prop") === -1 &&
                part.indexOf("Type") === -1) break;
            // remove part from goal
            newGoal = newGoal.substring(i + 1).trim();
            // get name and type
            const [name, type] = part
                .replace("forall", "")
                // replace last ,
                .replace(/,(?=[^,]*$)/, "")
                .trim()
                // replace first ( and last )
                .replace(/^\(/, "")
                .replace(/\)$/, "")
                .split(":").map(s => s.trim());
            // handle (P Q: Prop) case
            const names = name.split(" ").map(s => s.trim());
            newAssumptions = newAssumptions.concat(names.map(n => ({ name: n, type })));
        }
        setGoal(newGoal);
        setAssumptions(oldAssumptions =>
            oldAssumptions.filter(a =>
                !newAssumptions.some(a2 => a2.name === a.name)
            ).concat(newAssumptions)
        );
        // update url
        const url = new URL(window.location.href);
        url.searchParams.set("goal", newGoal);
        url.searchParams.set("assumptions",
            newAssumptions.map(a => a.name + ":" + a.type).join(";")
        );
        window.history.replaceState({}, "", url.toString());
    }

    const headSid = Math.max(...Array.from(props.goalmap.keys()));

    interface RawRow {
        sid: number,
        goal: Goal,
        rule: string | null,
    };
    type ElementRow = [number, JSX.Element];

    const rawRowToElementRow = (rawRow: RawRow): ElementRow => {
        return [rawRow.sid, <Row key={rawRow.sid}
            isHead={rawRow.sid === headSid}
            goal={
                rawRow.goal
            }
            prevGoal={
                props.goalmap.get(rawRow.sid - 1)?.[0]
            }
            isInitial={rawRow.sid === props.sid + 1}
            rule={rawRow.rule}
            rollback={() => {
                props.rollback(rawRow.sid + 1);
                setRules(Object.fromEntries(
                    Object.entries(rules).filter(([sid2, _]) => +sid2 < rawRow.sid)
                ));
            }}
            applyRule={(rule: string) => {
                console.log("Applying rule", rule, "to", rawRow.sid);
                if (rule === "") return;
                if (!rule.endsWith(".")) rule += ".";
                rule = rule.replace(/\s+/g, " ");
                rule = rule.replace("..", ".");
                rule = rule.replace(" .", ".");
                setRules({ ...rules, [rawRow.sid]: rule });
                worker.add(rawRow.sid, rawRow.sid + 1, rule);
                worker.exec(rawRow.sid + 1);
                worker.goals(rawRow.sid + 1);
            }}
            setGoal={overwriteGoal}
        />];
    };

    const rows: RawRow[] =
        Array.from(props.goalmap)
            .filter(([sid, _]) => sid >= props.sid)
            .sort(([sid1, _], [sid2, _2]) => sid1 - sid2)
            .map(([sid, goals]) =>
            ({
                sid: sid,
                goal: goals[0],
                rule: sid in rules && rules[sid] && props.goalmap.has(sid) ? rules[sid] : null
            }));

    const tree: RowTree<RawRow> = {
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
        const row = rows[i];
        const sid = row.sid;
        const goalCount = props.goalmap.get(sid)?.length || 0;
        console.log("Add SID", sid, "with", goalCount, "goals to tree.");

        if (goalCount > currentTree.goalCount) {
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
            currentTree.rows.push(row);
        } else if (goalCount < currentTree.goalCount) {
            console.log("End current subtree");
            // end current subtree
            currentTree.expectedChildren = 0;
            while (currentTree.parent && currentTree.parent.expectedChildren <= currentTree.parent.children.length) {
                currentTree = currentTree.parent;
            }
            // currentTree.rows.push(row);
            const oldTree = currentTree.parent;
            if (!oldTree) break;
            // console.log("Up level to", oldTree.rows[0][0]);
            currentTree = {
                parent: oldTree,
                expectedChildren: -1,
                goalCount,
                children: [],
                rows: [],
            };
            oldTree.children.push(currentTree);
            currentTree.rows.push(row);
        } else {
            // add to current subtree
            currentTree.rows.push(row);
            console.log("Add to current subtree");
        }
    }
    console.log("Tree:", tree);

    function mapTree<T, U>(tree: RowTree<T>, f: (t: T) => U): RowTree<U> {
        const new_rows = tree.rows.map((row) => f(row));
        const new_tree: RowTree<U> = {
            expectedChildren: tree.expectedChildren,
            goalCount: tree.goalCount,
            rows: new_rows,

            children: [],
            parent: undefined,
        };

        const new_children = tree.children
            .map((child) => mapTree(child, f))
            .map((child) => ({
                ...child,
                parent: new_tree,
            }));
        new_tree.children = new_children;
        return new_tree;
    }


    function renderTreeHTML(tree: RowTree<ElementRow>, toplevel = true) {
        return (<table className="prooftable">
            <thead>
                <tr>
                    <th>Assumptions</th>
                    <th>Goal</th>
                    <th>Rule</th>
                </tr>
            </thead>
            <tbody>
                {tree.rows.map(([sid, row]) => row)}
                <tr>
                    <td colSpan={3}>
                        {
                            tree.children.map(child =>
                                <div
                                    className="subprooftable"
                                >
                                    {renderTreeHTML(child, false)}
                                </div>
                            )
                        }
                        {
                            // render expected children - actual children many boxes
                            Array.from({ length: tree.expectedChildren - tree.children.length }).map((_, i) =>
                                <span key={i} className="proofblock"></span>
                            )
                        }
                    </td>
                </tr>
            </tbody>
        </table>);
    }

    // force update when entries in goalmap changes
    useEffect(() => {
        console.log("Tick", props.tick, props.goalmap);
    }, [props.tick]);

    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState<string>("");

    function getMarkdownProof(): string {
        function renderMarkdownTable(tree: RowTree<RawRow>, path = ""): string {
            return "Table " + path + "\n" +
                "| Assumptions | Goal | Rules |\n" +
                "| ----------- | ---- | ----- |\n" +
                tree.rows.map((row) => {
                    // TODO: code duplication with Row.tsx
                    const prevGoal = props.goalmap.get(row.sid - 1)?.[0];
                    const assumptions =
                        row.sid === props.sid + 1 ? [] :
                            row.goal.hypotheses
                                .filter(h => !prevGoal || !prevGoal.hypotheses.some(h2 => h2.name === h.name && h2.type === h.type))
                        ;

                    const rule = row.rule || "";
                    return "| " +
                        assumptions.map(h => h.name + ":" + h.type).join(", ") +
                        " | " +
                        row.goal.conclusion +
                        " | " +
                        rule +
                        " |\n";
                }).join("")
                + "\n" +
                tree.children.map((child, i) => renderMarkdownTable(child, path + "." + (i + 1))).join("");
        }
        return renderMarkdownTable(tree, "1");
    }

    function getLaTeXProof() {
        function toLatex(s: string) {
            // TODO: improve
            return "$" + s
                .replace(/->/g, "\\to ")
                .replace(/\/\\/g, "\\land ")
                .replace(/\\\//g, "\\lor ")
                .replace(/~/g, "\\lnot ")
                // .replace(/\\/g, "\\\\") 
                + "$";
        }
        // returns rules, closing tag, child nodes
        function visitTree(tree: RowTree<RawRow>, name = 'A', pos = 0, indent=0,spread = 6): string {
            return tree.rows.map((row) => {
                // TODO: code duplication with Row.tsx
                const prevGoal = props.goalmap.get(row.sid - 1)?.[0];
                const assumptions =
                    row.sid === props.sid + 1 ? [] :
                        row.goal.hypotheses
                            .filter(h => !prevGoal || !prevGoal.hypotheses.some(h2 => h2.name === h.name && h2.type === h.type))
                    ;
                const rule = row.rule || "";
                // trim away trailing .
                const ruleTrimmed = rule.endsWith(".") ? rule.substring(0, rule.length - 1) : rule;
                const ruleName = ruleTrimmed.split(" ")[0];
                const ruleArgs = ruleTrimmed.split(" ").slice(1).join(" ");
                return "\\proofrule{" +
                    assumptions.map(h => "\\assumption{" + h.name + "}{" + toLatex(h.type) + "}").join(" ") +
                    "}{" +
                    toLatex(row.goal.conclusion) +
                    "}{" +
                    ruleName +
                    "}{" +
                    ruleArgs +
                    "}" +
                    "\n";
            })
            .map((line, i) => " ".repeat(2*indent) + line)
            .join("") +
                "};\n" +
                tree.children.map((child, i) => {
                    const childname = name +
                        String.fromCharCode('A'.charCodeAt(0) + i);
                    const childpos = pos + (i - (tree.expectedChildren + 1) / 2) * spread;
                    return " ".repeat(2*(indent-1))+"\\childproofnode{" + childname + "}{" + name + "}{" + childpos + "}{\n" +
                        visitTree(child, childname, childpos, indent+1, spread);
                }).join("");
        }
        return "% assumes prep course header files are included\n" +
            "\\begin{tikzpicture}\n" +
            "  \\proofnode{A}{(0,0)}{\n" +
            visitTree(tree, 'A', 0, 2) +
            "\\end{tikzpicture}";
    }

    function getCoqProof() {
        let s = opening + "\n";
        s += "Proof.\n";

        const separators: { [i: number]: string } = {
            0: "-",
            1: "+",
            2: "*",
            3: "--",
            4: "++",
            5: "**",
        };

        function treeToCoq(tree: RowTree<RawRow>, indent = 0): string[] {
            const children = tree.children.map((child) =>
                treeToCoq(child, indent + 1)
            ).map((lines) => // replace "  " in first line with "- "
                lines.map((line, i) => i === 0 ? separators[indent] + " " + line.substring(2) : line)
            );

            return tree.rows.map((row) => (row.rule || ""))
                // concat all children
                .concat(children.flat())
                // indent
                .map((line) => "  " + line)
                ;
        }
        s += treeToCoq(tree).join("\n");
        s += "\nQed."
        return s;
    }

    return (
        <div className="proofcontainer">
            {renderTreeHTML(mapTree(tree, rawRowToElementRow))}
            <br />
            <Button
                onClick={() => {
                    setPopupContent(getCoqProof());
                    setShowPopup(true);
                }}
            >
                Show Coq Code
            </Button>
            <Button
                onClick={() => {
                    setPopupContent(getMarkdownProof());
                    setShowPopup(true);
                }}
            >
                Show Markdown Code
            </Button>
            <Button
                onClick={() => {
                    setPopupContent(getLaTeXProof());
                    setShowPopup(true);
                }}
            >
                Show LaTeX Code
            </Button>

            <InputDialog
                open={showPopup}
                setOpen={setShowPopup}
                title="Coq Proof"
                description={"The underlying Coq proof script."}
                defaultValue={popupContent}
                onConfirm={() => {
                    return null;
                }}
                readonly={true}
            />

        </div>
    )
}