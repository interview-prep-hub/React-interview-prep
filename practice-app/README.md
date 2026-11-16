# Practice app

A small Vite + React 19 project with hands-on exercises and automatic tests. You write the code, the tests tell you if it works.

- **33 React exercises** (UI and hooks): `exercises/react/`
- **24 JavaScript exercises** (the utility and polyfill questions that come up in React interviews): `exercises/js/`
- **Reference solutions** (look only after you tried): `solutions/`

The interview-round chapters explain how to use these under time pressure:
[Round 4: machine coding](../05-interview-rounds/round-4-machine-coding/README.md) and
[Round 5: JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md).

## One-time setup

You need Node.js 20 or newer (Node 22 or 24 is fine).

```bash
cd practice-app
npm install
```

## Everyday commands

| What you want | Command |
| --- | --- |
| Run the tests for ONE exercise (your code) | `npm test -- exercises/react/01-counter` |
| Keep tests running while you type | `npm run test:watch -- exercises/react/01-counter` |
| Run all tests for your code | `npm test` |
| Check the reference solution for one exercise | `npm run test:solutions -- exercises/react/01-counter` |
| See your component in the browser | `npm run dev` then open the printed address |

At the start every exercise **fails on purpose**. Your job is to make it go green.

## How the playground works

`npm run dev` opens a page with a sidebar that lists every React exercise. Pick one to see your `App.jsx` live. The drop-down above the list lets you switch to the reference solution to compare behaviour.

## Folder layout

```text
practice-app/
  exercises/
    react/NN-name/   README.md  App.jsx (you edit this)  App.test.jsx (do not edit)
    js/NN-name/      README.md  index.js (you edit this)  index.test.js (do not edit)
  solutions/         same paths as exercises/, only the files you would write
  src/main.jsx       the playground
  vite.config.js     test setup; swaps exercises for solutions in test:solutions
```

## A good way to practice

1. Read the exercise `README.md`. Set a timer for the suggested time.
2. Write the code in the starter file. Run the tests often.
3. When the tests pass (or the time is up) compare with `solutions/`.
4. Answer the "Interview follow-ups" out loud, as if the interviewer asked them.
5. Come back in a week and redo the exercise without looking.

## Tip: using your own scratch files

Put experiments in a `scratch/` folder inside this project. It is ignored by git. Any `scratch/**/*.test.jsx` file is picked up by `npm test`.
