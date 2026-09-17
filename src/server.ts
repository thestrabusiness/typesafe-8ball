import { TypeSafeClient, TypeSafeError } from "@typesafe-ai/sdk";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { consult } from "./eightball.js";
import { QUESTIONS } from "./questions.js";

const PORT = Number(process.env.PORT ?? 8080);
const MAX_QUESTION_LENGTH = 300;
const PAGE = fileURLToPath(new URL("../public/index.html", import.meta.url));

if (!process.env.TYPESAFE_API_KEY) {
  console.error("TYPESAFE_API_KEY is not set. Put it in .env (see .env.example).");
  process.exit(1);
}

const client = new TypeSafeClient();

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data;
}

/** POST /api/ask  { question } -> verdict plus the numbers behind it. */
async function handleAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let question: unknown;
  try {
    ({ question } = JSON.parse(await readBody(req)) as { question?: unknown });
  } catch {
    return json(res, 400, { error: "Body must be JSON with a question field." });
  }
  if (typeof question !== "string" || question.trim() === "") {
    return json(res, 400, { error: "Ask a question first." });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return json(res, 400, { error: `Keep it under ${MAX_QUESTION_LENGTH} characters.` });
  }

  try {
    const { verdict, answers } = await consult(client, question);
    return json(res, 200, {
      verdict,
      askable: answers.askable.noul,
      outlook: {
        score: answers.outlook.score,
        confidence: answers.outlook.confidence,
        probabilities: answers.outlook.probabilities,
        levels: QUESTIONS.outlook.criteria,
      },
    });
  } catch (err) {
    const message = err instanceof TypeSafeError ? err.message : "The ball could not reach TypeSafe.";
    console.error(err);
    return json(res, 502, { error: message });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "POST" && url.pathname === "/api/ask") return handleAsk(req, res);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(await readFile(PAGE));
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`🎱  http://localhost:${PORT}`);
});
