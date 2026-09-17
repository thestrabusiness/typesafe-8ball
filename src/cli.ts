import { TypeSafeClient } from "@typesafe-ai/sdk";
import { consult, type Verdict } from "./eightball.js";

function usage(): never {
  console.error('Usage: npm run ask -- "Will it rain tomorrow?" [--debug]');
  process.exit(2);
}

const args = process.argv.slice(2);
const debug = args.includes("--debug");
const question = args.filter((a) => a !== "--debug").join(" ").trim();
if (!question) usage();

if (!process.env.TYPESAFE_API_KEY) {
  console.error("TYPESAFE_API_KEY is not set. Put it in .env (see .env.example).");
  process.exit(1);
}

function explain(v: Verdict): string {
  switch (v.kind) {
    case "not_a_question":
      return `gate: askable=${v.askable.toFixed(2)} (below threshold)`;
    case "hazy":
      return `gate: askable=${v.askable.toFixed(2)}  outlook: score=${v.score.toFixed(2)} confidence=${v.confidence.toFixed(2)} (too low to commit)`;
    case "answer":
      return `gate: askable=${v.askable.toFixed(2)}  outlook: score=${v.score.toFixed(2)} confidence=${v.confidence.toFixed(2)} level=${v.level}`;
  }
}

const client = new TypeSafeClient();
const { verdict, answers } = await consult(client, question);

console.log(`\n🎱  ${verdict.text}\n`);

if (debug) {
  console.log(explain(verdict));
  console.log("outlook probabilities by level:");
  for (const [level, p] of Object.entries(answers.outlook.probabilities)) {
    const bar = "#".repeat(Math.round(p * 30));
    console.log(`  ${level}  ${p.toFixed(3)}  ${bar}`);
  }
}
