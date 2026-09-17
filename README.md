# typesafe-8ball

A Magic 8-Ball whose answers come from [TypeSafe](https://typesafe.ai) System One
judgments instead of a random number. It is a toy, but it shows how to structure a
small app around typed AI decisions: the model returns probabilities, code owns the
policy.

## Run it

```sh
npm install
cp .env.example .env     # then paste your key from console.typesafe.ai/settings/keys
npm run ask -- "Will it rain tomorrow?"
npm run ask -- "Will it rain tomorrow?" --debug   # shows the probabilities behind the answer
npm run serve            # web UI at http://localhost:8080
npm test
```

## How it is structured

```
src/questions.ts   the contract with the model: state shape + two questions
src/answers.ts     pure data: the 20 classic phrasings, bucketed by meaning
src/eightball.ts   policy: turn model answers into a verdict (no network in decide())
src/cli.ts         thin shell: parse args, call consult(), print
src/server.ts      thin shell: serve the page, POST /api/ask calls consult()
public/index.html  the ball: CSS sphere, shake, reveal, and a "how it decided" panel
test/              unit tests with a fake client, no API key needed
```

The web UI calls the same `consult()` as the CLI. The API key stays on the server;
the browser only ever talks to `/api/ask`.

One request carries two independent questions over the same state:

| Question | Type | What it answers |
| --- | --- | --- |
| `askable` | Noul | Is this a yes/no question at all? Returns P(yes). |
| `outlook` | Score | Five levels from "impossible" to "all but certain". Returns a score, per-level probabilities, and confidence. |

Code then applies the policy in `decide()`:

1. If `askable` is below the threshold, the ball asks for a yes/no question. The `outlook` answer is ignored on that branch.
2. If `outlook` confidence is below the threshold, the ball gives a classic non-answer ("Reply hazy, try again").
3. Otherwise the score is rounded to a level and a phrasing is picked from that level's bucket.

The thresholds live in `DEFAULT_POLICY` and are starting points, not tuned values.

## Things worth noticing

- **Score levels describe situations, not degrees.** The model judges each level on its own and never sees level numbers, so "somewhat likely" would be meaningless. Each level names concrete examples it can match the question against.
- **Speculative questions are cheap.** Both questions run in parallel in one request. When the gate fails, the outlook answer was still computed; code just does not use it.
- **Confidence is a second axis.** The score says which way the ball leans. Confidence says whether to commit. A flat distribution across levels is the model saying "I don't know," and the ball has a phrasing for exactly that.
- **The policy is testable without the model.** `decide()` is a pure function over the answer shape, and `consult()` takes a client interface so tests can inject canned answers.
