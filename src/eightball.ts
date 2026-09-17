import type { SystemOneRequest, SystemOneResult } from "@typesafe-ai/sdk";
import {
  HAZY_ANSWERS,
  NOT_A_QUESTION_ANSWERS,
  OUTLOOK_ANSWERS,
} from "./answers.js";
import { OUTLOOK_TOP_LEVEL, QUESTIONS, type EightBallState } from "./questions.js";

/** The raw model answers, typed from QUESTIONS by the SDK. */
export type EightBallAnswers = SystemOneResult<typeof QUESTIONS>["answers"];

/**
 * Thresholds live in code, not in the model. The docs recommend starting
 * conservative and tuning on real data; these are starting points for a toy.
 */
export interface Policy {
  /** Minimum P(yes) on `askable` before the ball will answer at all. */
  askableThreshold: number;
  /** Minimum outlook confidence before the ball commits to a level. */
  outlookConfidenceThreshold: number;
}

export const DEFAULT_POLICY: Policy = {
  askableThreshold: 0.5,
  outlookConfidenceThreshold: 0.4,
};

/** What the ball decided, with enough detail to explain why. */
export type Verdict =
  | { kind: "not_a_question"; text: string; askable: number }
  | { kind: "hazy"; text: string; askable: number; score: number; confidence: number }
  | {
      kind: "answer";
      text: string;
      askable: number;
      score: number;
      confidence: number;
      level: number;
    };

/**
 * The slice of the SDK client we depend on. The real TypeSafeClient satisfies
 * this (its APIPromise extends Promise), and tests can hand in a plain fake.
 */
export interface EightBallClient {
  systemOne(
    request: SystemOneRequest<typeof QUESTIONS>,
  ): Promise<SystemOneResult<typeof QUESTIONS>>;
}

/** Picks a random element. Injectable so tests are deterministic. */
export type Picker = <T>(items: readonly T[]) => T;

export const randomPick: Picker = (items) => {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
};

/** Builds the state object sent to the model. */
export function buildState(question: string, today = new Date()): EightBallState {
  return { question: question.trim(), today: today.toISOString().slice(0, 10) };
}

/**
 * Pure policy: turn the model's answers into a verdict.
 * No network here, which is what makes it easy to test.
 */
export function decide(
  answers: EightBallAnswers,
  policy: Policy = DEFAULT_POLICY,
  pick: Picker = randomPick,
): Verdict {
  const askable = answers.askable.noul;
  if (askable < policy.askableThreshold) {
    return { kind: "not_a_question", text: pick(NOT_A_QUESTION_ANSWERS), askable };
  }

  const { score, confidence } = answers.outlook;
  if (confidence < policy.outlookConfidenceThreshold) {
    return { kind: "hazy", text: pick(HAZY_ANSWERS), askable, score, confidence };
  }

  const level = Math.min(OUTLOOK_TOP_LEVEL, Math.max(0, Math.round(score)));
  const bucket = OUTLOOK_ANSWERS[level];
  if (bucket === undefined) throw new Error(`No answers defined for outlook level ${level}`);
  return { kind: "answer", text: pick(bucket), askable, score, confidence, level };
}

/** Full round trip: ask the model, then apply the policy. */
export async function consult(
  client: EightBallClient,
  question: string,
  options: { policy?: Policy; pick?: Picker; today?: Date } = {},
): Promise<{ verdict: Verdict; answers: EightBallAnswers }> {
  const state = buildState(question, options.today);
  const result = await client.systemOne({ state, questions: QUESTIONS });
  const verdict = decide(result.answers, options.policy, options.pick);
  return { verdict, answers: result.answers };
}
