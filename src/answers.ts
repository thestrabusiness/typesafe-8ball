/**
 * The 20 classic Magic 8-Ball answers, grouped by what they mean.
 *
 * The classic set is 10 yes, 5 non-committal, 5 no. There is no "even odds"
 * phrasing, so the coin-flip level (2) speaks the non-committal answers.
 * Low model confidence also routes to that bucket, via HAZY_ANSWERS, but by
 * a different code path so the debug output can tell the two apart.
 */
export const HAZY_ANSWERS: readonly string[] = [
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
];

/** Index matches the outlook Score level (0 = strong no, 4 = strong yes). */
export const OUTLOOK_ANSWERS: readonly (readonly string[])[] = [
  // level 0: almost certainly no
  ["My reply is no.", "My sources say no.", "Very doubtful."],
  // level 1: leaning no
  ["Don't count on it.", "Outlook not so good."],
  // level 2: no lean either way
  HAZY_ANSWERS,
  // level 3: leaning yes
  ["Signs point to yes.", "Most likely.", "Outlook good.", "As I see it, yes."],
  // level 4: almost certainly yes
  [
    "Yes.",
    "Yes, definitely.",
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "You may rely on it.",
  ],
];

/** What the ball says when the question is not a yes/no question. */
export const NOT_A_QUESTION_ANSWERS: readonly string[] = [
  "Ask me a yes-or-no question.",
  "The ball only answers yes or no.",
  "Rephrase that as a yes-or-no question and shake again.",
];
