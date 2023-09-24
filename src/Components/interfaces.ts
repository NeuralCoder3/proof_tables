export type Term = any;

export interface CoqHypothesis {
  0: {
    0: {
      1: string // name
    }
  },
  2: Term // name
}

export interface CoqGoal {
  hyp: CoqHypothesis[];
  ty: Term;
}

export interface CoqGoalInfo {
  goals: CoqGoal[];
}

export interface Hypothesis {
    name: string;
    type: string;
}

export interface Goal {
    hypotheses: Hypothesis[];
    conclusion: string;
}

export interface Assumption {
    name: string;
    type: string;
}

export type GoalMap = Map<number, Goal[]>;