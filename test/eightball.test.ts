import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HAZY_ANSWERS,
  NOT_A_QUESTION_ANSWERS,
  OUTLOOK_ANSWERS,
} from "../src/answers.js";
import {
  buildState,
  consult,
  decide,
  type EightBallAnswers,
  type EightBallClient,
} from "../src/eightball.js";
import { QUESTIONS } from "../src/questions.js";

/** Always picks the first option, so text assertions are deterministic. */
const first = <T,>(items: readonly T[]): T => items[0]!;

/** Builds a fake answer set from an askable probability and outlook probabilities. */
function answers(askable: number, outlook: number[]): EightBallAnswers {
  const legend = Object.fromEntries(
    QUESTIONS.outlook.criteria.map((c, i) => [String(i), c]),
  );
  const probabilities = Object.fromEntries(outlook.map((p, i) => [String(i), p]));
  const score = outlook.reduce((sum, p, i) => sum + p * i, 0);
  const confidence = Math.max(...outlook);
  return {
    askable: { type: "noul", noul: askable },
    outlook: { type: "score", score, confidence, legend, probabilities },
  } as unknown as EightBallAnswers;
}

test("refuses when askable is below threshold", () => {
  const v = decide(answers(0.2, [0, 0, 0, 0, 1]), undefined, first);
  assert.equal(v.kind, "not_a_question");
  assert.equal(v.text, NOT_A_QUESTION_ANSWERS[0]);
});

test("goes hazy when outlook confidence is low", () => {
  const v = decide(answers(0.9, [0.2, 0.2, 0.2, 0.2, 0.2]), undefined, first);
  assert.equal(v.kind, "hazy");
  assert.equal(v.text, HAZY_ANSWERS[0]);
});

test("rounds score to the nearest level and picks from that bucket", () => {
  const v = decide(answers(0.9, [0, 0, 0.1, 0.9, 0]), undefined, first);
  assert.equal(v.kind, "answer");
  if (v.kind !== "answer") return;
  assert.equal(v.level, 3);
  assert.equal(v.text, OUTLOOK_ANSWERS[3]![0]);
});

test("strong no lands on level 0", () => {
  const v = decide(answers(0.95, [0.95, 0.05, 0, 0, 0]), undefined, first);
  assert.equal(v.kind, "answer");
  if (v.kind !== "answer") return;
  assert.equal(v.level, 0);
});

test("policy thresholds are respected", () => {
  const strict = { askableThreshold: 0.99, outlookConfidenceThreshold: 0.99 };
  const v = decide(answers(0.9, [0, 0, 0, 0, 1]), strict, first);
  assert.equal(v.kind, "not_a_question");
});

test("every outlook level has at least one phrasing", () => {
  assert.equal(OUTLOOK_ANSWERS.length, QUESTIONS.outlook.criteria.length);
  for (const bucket of OUTLOOK_ANSWERS) assert.ok(bucket.length > 0);
});

test("buildState trims the question and formats the date", () => {
  const s = buildState("  Will it rain?  ", new Date("2026-09-16T12:00:00Z"));
  assert.deepEqual(s, { question: "Will it rain?", today: "2026-09-16" });
});

test("consult sends state and QUESTIONS to the client and applies policy", async () => {
  let seen: unknown;
  const fake: EightBallClient = {
    systemOne: (request) => {
      seen = request;
      return Promise.resolve({
        model: "fake",
        answers: answers(0.9, [0, 0, 0, 0, 1]),
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    },
  };
  const { verdict } = await consult(fake, "Will the sun rise?", {
    pick: first,
    today: new Date("2026-09-16T00:00:00Z"),
  });
  assert.deepEqual(seen, {
    state: { question: "Will the sun rise?", today: "2026-09-16" },
    questions: QUESTIONS,
  });
  assert.equal(verdict.kind, "answer");
  assert.equal(verdict.text, OUTLOOK_ANSWERS[4]![0]);
});
