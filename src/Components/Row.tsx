import TextField from "@mui/material/TextField";
import { Goal } from "./interfaces";
import { useState } from "react";
import { IconButton } from "@mui/material";
import UndoIcon from '@mui/icons-material/Undo';

export interface RowProps {
    prevGoal?: Goal 
    goal: Goal
    rule: string | null
    applyRule: (rule: string) => void
    rollback: () => void
}


export default function Row(props: RowProps) {
    const assumptions = props.goal.hypotheses
    .filter(h => !props.prevGoal || !props.prevGoal.hypotheses.some(h2 => h2.name === h.name))
    .map((h, i) =>
        <div key={i} className="assumption">
            <span className="name">{h.name}</span>
            <span className="colon">:</span>
            <span className="type">{h.type}</span>
        </div>
    );

    const [rule, setRule] = useState<string>("");

    const ruleChoice =
        <TextField
            label="Rule"
            variant="outlined"
            size="small"
            sx={{ input: { color: 'white' } }}
            value={rule}
            onChange={e => setRule(e.target.value)}
            onKeyDown={e => {
                if (e.key === "Enter") {
                    props.applyRule(rule);
                }
            }}
        />;

    return (
        <tr>
            <td>{assumptions}</td>
            <td>{props.goal.conclusion}</td>
            <td>
                {props.rule ?
                    (
                        <div>
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