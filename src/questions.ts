import { noul, score } from "@typesafe-ai/sdk";

/**
 * The state we send to the model. Named fields, per the TypeSafe state guidance,
 * so the question text and the date are distinguishable to the model.
 */
export type EightBallState = {
  /** The question the user asked the ball, verbatim. */
  question: string;
  /** Today's date, so "this week" or "before summer" can be judged. */
  today: string;
};

/**
 * Both questions are evaluated in parallel against the same state in one request.
 * Neither can see the other's answer, so the gate (askable) and the verdict
 * (outlook) are independent judgments that code combines afterwards.
 */
export const QUESTIONS = {
  /**
   * Noul: probability that this is a yes/no question a Magic 8-Ball can answer.
   * The true/false descriptions pin down the boundary, since "askable" is fuzzy.
   */
  askable: noul(
    "Is `question` a yes-or-no question about the future or the unknown, the kind a Magic 8-Ball answers?",
    {
      true: {
        meaning: "A question that can be answered yes or no",
        examples: [
          "Will I get the job?",
          "Should I text her back?",
          "Is it going to rain tomorrow?",
          "Does he like me?",
        ],
      },
      false: {
        meaning:
          "Not a yes/no question: an open question, a command, a statement, or nonsense",
        examples: [
          "What should I eat for dinner?",
          "Tell me a joke",
          "asdfgh",
          "I had a bad day",
        ],
      },
    },
  ),

  /**
   * Score: how the ball should lean. Each level describes a concrete situation
   * the model can match the question against. Levels are judged independently
   * and the model never sees their numbers, so degree words alone would not work.
   */
  outlook: score(
    "Based on `question` and general knowledge of how the world usually goes, how likely is it that the honest answer is yes?",
    [
      "The thing asked about is impossible or nearly so, such as winning the lottery this week, a pet learning to talk, or an event that already did not happen",
      "The thing asked about is uncommon or works against the person, such as a long-shot application, a plan that skipped preparation, or hoping a habit changes overnight",
      "The question has no lean either way, such as a coin flip, a close game, a matter of taste, or something with no information to go on",
      "The thing asked about is the ordinary outcome that usually happens, such as a routine day going fine, a reliable friend showing up, or an easy task getting done",
      "The thing asked about is all but certain, such as the sun rising, a scheduled event happening, or something the question itself says is already arranged",
    ] as const,
  ),
} as const;

/** Number of outlook levels, used to normalize and to bound rounding. */
export const OUTLOOK_TOP_LEVEL = QUESTIONS.outlook.criteria.length - 1;
