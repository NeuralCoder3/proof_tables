import TextField from "@mui/material/TextField";
import { Goal } from "./interfaces";
import { useState } from "react";
import { IconButton, MenuItem, Select } from "@mui/material";
import UndoIcon from '@mui/icons-material/Undo';
import LoginIcon from '@mui/icons-material/Login';

export interface RowProps {
    isInitial: boolean
    prevGoal?: Goal
    goal: Goal
    rule: string | null
    applyRule: (rule: string) => void
    rollback: () => void
    setGoal: (goal:string) => void
    isHead: boolean
}

type ArgType = "Text" | "Assumption" | "Name" 

interface Rule {
    name: string,
    args: ArgType[]
    builder: (args: ArgType[]) => string
}

function mkRule(
    name: string,
    args: ArgType[],
    builder?: (args: ArgType[]) => string
) {
    return {
        name, args,
        builder: builder || ((args: ArgType[]) => name + " " + args.join(" "))
    }
}

function toSnake(name: string) {
    name = name.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (name.startsWith("_")) name = name.slice(1);
    return name;
}

function mkAliasRule(
    name: string,
    args: ArgType[],
    alias?: string,
) {
    alias = alias || toSnake(name);
    return {
        name, args,
        builder: (args: ArgType[]) => alias + " " + args.join(" ")
    }
}

// see https://github.com/NeuralCoder3/script_proofs/blob/main/coq/tactics.v
const rules : Rule[] = [
    mkRule("Custom", ["Text"], (args: ArgType[]) => args[0]),
    mkAliasRule("Assumption", ["Assumption"]),
    mkAliasRule("TruthIntro", []),
    mkAliasRule("FalsityElim", ["Assumption"]),
    mkAliasRule("AndElim", ["Assumption"]),
    mkAliasRule("AndIntro", []),
    mkAliasRule("OrElim", ["Assumption"]),
    mkAliasRule("OrIntro1", []),
    mkAliasRule("OrIntro2", []),
    mkAliasRule("ImplApply", ["Assumption"]),
    mkAliasRule("ImplSpecialize", ["Assumption", "Assumption"]),
    mkAliasRule("ImplIntro", []),
    mkAliasRule("NegElim", ["Assumption"]),
    mkAliasRule("NegIntro", []),
    mkAliasRule("Assert", ["Text"]),
    mkAliasRule("ExcludedMiddle", ["Text"]),
    mkAliasRule("ForallIntro", ["Name"]),
    mkAliasRule("ForallElim", ["Assumption", "Text"]),
    mkAliasRule("ExistsIntro", ["Text"]),
    mkAliasRule("ExistsElim", ["Assumption","Name"]),
    mkAliasRule("EqualsIntro", []),
    mkAliasRule("EqualsElim", ["Assumption"]),
    mkAliasRule("EqualsElimRev", ["Assumption"]),
    mkAliasRule("Defn", ["Text"]),
    mkAliasRule("Axiom", ["Text"]),
]

type ruleName = typeof rules[number]["name"];

export default function Row(props: RowProps) {
    const [rule, setRule] = useState<ruleName>("Custom");
    const [ruleArgs, setRuleArgs] = useState<{ [i: number]: string }>({});
    const [conclusionText, setConclusionText] = useState(props.goal.conclusion);
    if(!props.goal) return (
        <tr>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    );
    const assumptions = props.isInitial ? [] : props.goal.hypotheses
        .filter(h => !props.prevGoal || !props.prevGoal.hypotheses.some(h2 => h2.name === h.name && h2.type === h.type))
        .map((h, i) =>
            <div key={i} className="assumption">
                <span className="name">{h.name}</span>
                <span className="colon">:</span>
                {
                    h.typeHTML ?
                        <span className="type" dangerouslySetInnerHTML={{ __html: h.typeHTML }} />
                        :
                        <span className="type">{h.type}</span>
                }
            </div>
        );

    const orderedArgs : ArgType[] =
        Object.entries(ruleArgs).sort(([i1, _], [i2, __]) => +i1 - +i2).map(([_, arg]) => arg as ArgType);

    const selectedRule = rules.find(r => r.name === rule);

    const ruleChoice =
        (<div className="rule-choice">
            {/* a dropdown to choose a rule */}
            {/* when selected show assumption fields */}
            <Select
                id="rule-selector"
                value={rule}
                label="Rule"
                onChange={e => {
                    const rule = e.target.value;
                    setRule(rule as ruleName);
                    setRuleArgs({});
                }}
            >
                {
                    rules.map(r =>
                        <MenuItem key={r.name} value={r.name}>{r.name}</MenuItem>
                    )
                }
            </Select>
            {
                selectedRule?.args.map((arg, i) => {
                    if (arg === "Text" || arg === "Name") {
                        return(
                        <TextField
                            key={i}
                            label={arg}
                            variant="outlined"
                            size="small"
                            sx={{ input: { color: 'white' } }}
                            value={ruleArgs[i]}
                            onChange={e => {
                                setRuleArgs({ ...ruleArgs, [i]: 
                                    arg === "Name" ? 
                                    e.target.value.replace(/\s+/g, "") : // remove whitespace
                                    e.target.value 
                                });
                            }}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                props.applyRule(selectedRule?.builder(orderedArgs) || "");
                            }
                        }}
                        />);
                    } else if (arg === "Assumption") {
                        return (<Select
                            id="assumption-selector"
                            key = {i}
                            value={ruleArgs[i]}
                            onChange={e => {
                                const rule = e.target.value;
                                setRuleArgs({ ...ruleArgs, [i]: rule });
                            }}
                        >
                            {
                                props.goal.hypotheses.map(h =>
                                    <MenuItem key={h.name} value={h.name}>{h.name}</MenuItem>
                                )
                            }
                        </Select>);
                    } 
                })
            }
            <IconButton
                onClick={() => {
                    props.applyRule(selectedRule?.builder(orderedArgs) || "");
                }}
                size="small"
                sx={{ color: 'white' }}
            >
                <LoginIcon />
            </IconButton>
        </div>);

    let conclusion  = <span className="conclusion" dangerouslySetInnerHTML={{ __html: props.goal.conclusionHTML }} />;
    if(props.isInitial) {
        conclusion = (
                        <TextField
                            label={"Goal"}
                            variant="outlined"
                            size="small"
                            sx={{ input: { color: 'white' } }}
                            value={conclusionText}
                            onChange={e => {
                                setConclusionText(e.target.value);
                            }}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                props.setGoal(conclusionText);
                            }
                        }}
                        />
        );
    }


    return (
        <tr className={props.isHead ? "proofhead" : ""}>
            <td>{assumptions}</td>
            <td>{conclusion}</td>
            <td>
                {props.rule ?
                    (
                        <div className="selected">
                            <IconButton
                                onClick={props.rollback}
                                size="small"
                                sx={{ color: 'white' }}
                            >
                                <UndoIcon />
                            </IconButton>
                            <span className="rule">{props.rule}</span>
                        </div>
                    )
                    :
                    ruleChoice
                }
            </td>
        </tr>
    )
}