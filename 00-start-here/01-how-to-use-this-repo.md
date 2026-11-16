# How to Use This Repo

> **Level:** Beginner   **Time:** about 15 minutes   **Read first:** Repo home (planned)

This repo is a self-study course for React interviews. You get lessons to read, questions to answer, exercises to code, and tests that tell you if your code works. It starts at modern JavaScript and ends at system design and React internals.

You do not have to read it from top to bottom. The best way is to pick a study plan, follow a simple four-step loop, and keep a list of what you get wrong. This guide shows you how. Everything targets React 19.3 (the practice app uses 19.3.1) and was checked in November 2026.

**Jump to:** [Quick start](#quick-start-in-five-steps), [The map](#the-map-of-the-repo), [The learning loop](#the-four-step-learning-loop), [Spaced repetition](#spaced-repetition-day-1-3-7-and-21), [The 9 rounds](#how-to-practise-the-9-rounds), [Choose a plan](#choose-your-plan), [The plans](#the-four-study-plans), [Cheatsheets](#how-to-use-the-cheatsheets), [Weak areas](#track-your-weak-areas), [Checklist](#progress-checklist)

## Quick start in five steps

If you read nothing else, do this:

1. Set up the practice app once. The steps are in [Setup your playground](./02-setup-your-playground.md).
2. Pick one plan in [Choose your plan](#choose-your-plan). It takes one minute.
3. Open the first lesson of your plan. Keep your code editor open next to it.
4. Do the matching exercise in the practice app.
5. Answer the matching round questions out loud, then check your answers.

Here is the practice app in action. Run these commands from the folder that contains `practice-app`:

```bash
cd practice-app
npm install
npm test -- exercises/react/01-counter
npm run test:solutions -- exercises/react/01-counter
```

The last two commands print these summary lines (this is the real output from this repo):

```text
npm test -- exercises/react/01-counter
 Tests  5 failed (5)

npm run test:solutions -- exercises/react/01-counter
 Tests  5 passed (5)
```

**What happens, step by step:**
1. `cd practice-app` moves into the practice app folder.
2. `npm install` downloads the libraries. You do this once.
3. `npm test -- exercises/react/01-counter` runs the tests for exercise 01 only. The `--` passes the folder name to the test runner (Vitest) instead of to npm.
4. The 5 tests fail. This is on purpose. The starter file `App.jsx` is incomplete, and your job is to turn the tests green.
5. `npm run test:solutions -- ...` runs the same tests against the reference solution, so all 5 pass. Look at the solution only after you have tried. The other commands are in the [practice app README](../practice-app/README.md).

## The map of the repo

```text
React-interview-prep/
  README.md                landing page and roadmap
  00-start-here/           this guide, setup, how interviews work (3 files)
  01-basics/               JavaScript, JSX, props, state, forms, CSS (10 lessons)
  02-hooks/                one lesson per hook (9 lessons)
  03-intermediate/         patterns, data, router, state libraries, TypeScript, tooling (11 lessons)
  04-advanced/             rendering, performance, React 19, SSR, testing, system design (13 lessons)
  05-interview-rounds/     9 practice rounds (questions and answers in separate files)
  06-cheatsheets/          6 one-page revision sheets
  practice-app/            33 React exercises and 24 JavaScript exercises, with tests
```

That is 46 lessons, 6 cheatsheets, 9 rounds and 57 exercises. The levels build on each other:

| Folder | Level | What it is for |
|---|---|---|
| `00-start-here` | Beginner | How to study, set up your tools, learn how interviews work |
| `01-basics` | Beginner | Modern JavaScript, JSX, props, state, lists, forms, thinking in React, HTML and CSS, JavaScript depth |
| `02-hooks` | Beginner to intermediate | `useState`, `useEffect`, `useRef`, context, reducers, memoization, custom hooks, newer hooks |
| `03-intermediate` | Intermediate | Component patterns, data fetching, router, form libraries, error boundaries, state libraries, styling, TypeScript, tooling, HTTP and auth, legacy class code |
| `04-advanced` | Advanced | How rendering works, performance, concurrent React, React 19, SSR, Next.js, testing, accessibility, security, system design, internals |
| `05-interview-rounds` | All levels | Practice questions and tasks, one folder per interview round |
| `06-cheatsheets` | All levels | Revision pages for the last days |
| `practice-app` | All levels | Runnable exercises with automatic tests |

### How a lesson is built

Every lesson in folders 01 to 04 has the same shape, so you always know where you are:

1. **What you will learn:** the goals. Skim it first.
2. **Numbered sections:** the teaching, from simple to deep. Each has a small example and a "What happens, step by step" list.
3. **How interviewers test this:** what the interviewer is really checking.
4. **Interview questions and model answers:** the answers are visible here. This part is for studying.
5. **Common mistakes and gotchas:** bugs people hit, each with a one-line fix.
6. **Practice yourself:** tasks with the answers hidden inside "Show answer" blocks. Try first.
7. **Recap:** a short list for revision.
8. **Where to go next:** links to the next lesson, rounds and exercises.

Open the files in VS Code (Markdown preview: Ctrl+Shift+V) or on GitHub. Both show the collapsible blocks.

### Where the answers live

| What you are doing | Where the answer is | How to treat it |
|---|---|---|
| Lesson "Interview questions" | Right under each question | Visible: this is the study part |
| Lesson "Practice yourself" | Inside "Show answer" blocks | Hidden: try first |
| A round question file | A file with the same name in the round's `answers/` folder | Separate file: open it only after you tried |
| A practice-app exercise | `solutions/` folder, or `npm run test:solutions` | Separate folder: look after the tests pass or the timer ends |

Round files are mirrored. The question file `questions/02-hooks.md` has its answers in `answers/02-hooks.md`, and each question has an ID (it looks like `R2-HK-014`) that is the same in both files.

## The four-step learning loop

Reading feels like learning, but it fades fast. A real interview asks you to build, recall and speak. So each topic goes through four steps, and each step trains a different skill:

| Step | You do | Skill it builds | Time |
|---|---|---|---|
| 1. Read | One lesson, with your editor open | Understanding | 30 to 40 minutes |
| 2. Code | One exercise, with a timer | Doing | 15 to 60 minutes (the time is in each exercise README) |
| 3. Quiz | The matching round file, answers closed | Recall | 15 to 30 minutes |
| 4. Explain | Two or three items, out loud | Speaking | 10 minutes |

**Step 1, read.** Type every example yourself, do not paste it. When you reach a "What happens, step by step" list, cover it and predict the result first. Then read it. Stop after one lesson and tick it in the [checklist](#progress-checklist).

**Step 2, code.** Read the exercise README, start the timer, and write the code in the starter file. Run the tests often. If you are stuck for 10 minutes, open the Hints block in the README. When the tests pass (or the time ends), open the solution and compare. Write one line: what did the solution do better?

**Step 3, quiz.** Open the question file for the topic. Answer each question from memory, before you open the answer file. Then compare and score yourself. The scoring scale is in [the rounds section](#how-to-practise-the-9-rounds).

**Step 4, explain.** Pick the items you scored 0 or 1 and say the answer out loud, as if an interviewer asked. Out loud, not in your head: thinking silently hides gaps that speaking exposes. Record yourself on your phone if you can. Aim for 60 to 90 seconds per answer.

### A worked example

You have just read [useState in depth](../02-hooks/02-usestate-in-depth.md). You code the counter exercise. In the quiz you meet this question: "The button starts at 0. You click it once. What does the console show, and what does the button show?"

```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    console.log('after setCount:', count)
  }

  return <button onClick={handleClick}>Clicked {count} times</button>
}
```

The console shows `after setCount: 0`. The button shows `Clicked 1 times`. (Checked by rendering this component in a test in the practice app.)

**What happens, step by step:**
1. The first render runs with `count` equal to `0`. The button says "Clicked 0 times".
2. You click. React calls `handleClick` from that render. Inside this call, `count` is the number `0`.
3. `setCount(count + 1)` means `setCount(0 + 1)`. It asks React for a new render with `1`. It does not change the `count` variable in the call that is running.
4. `console.log` runs next and prints `0`.
5. The handler ends. React renders again, and this time `count` is `1`. The button says "Clicked 1 times".

Now step 4 of the loop: say it out loud. A strong spoken answer sounds like this: "State is a snapshot. In this render, `count` is 0, and the handler uses that 0. `setCount` does not change the variable. It schedules the next render. So the log prints 0, and the button shows 1 after React re-renders."

### The four-part answer

When you explain out loud, use four parts. It keeps you short and clear:

1. **Say what it is** in one sentence.
2. **Say why it exists.**
3. **Give a tiny example.**
4. **Name one gotcha or trade-off.**

Example, for "What is a key in a list?": "A key is a special prop that gives each list item a stable identity. React uses it to match old and new items between renders, so state stays with the right item. For example, `todos.map(t => <Todo key={t.id} todo={t} />)`. Do not use the array index if the list can reorder or delete items, because the state then sticks to the position and not to the item."

### Loop mistakes and fixes

- **Only reading.** Fix: no lesson counts as done until you have done its exercise and quiz.
- **Copying the solution.** Fix: type it yourself, close it, and redo the exercise from scratch two days later.
- **Skipping step 4.** Fix: interviews are spoken, so this step matters. Do at least two items out loud every day.
- **Long marathons.** Fix: one lesson per sitting, then a break. Short daily sessions beat one long weekend.

## Spaced repetition: day 1, 3, 7 and 21

You forget a lot of a new lesson within a few days. **Spaced repetition** means you review it just before you forget it, and every review makes the gap before the next one longer. It is the cheapest way to make facts stick.

Call the day you learn something **day 0**. Then review on these days:

| Day | Time | What you do |
|---|---|---|
| 1 | 10 minutes | Answer the lesson's interview questions from memory. No notes. |
| 3 | 15 minutes | Redo the small coding task (or the exercise) without looking at your old code. |
| 7 | 20 minutes | Do the matching round questions with a timer. |
| 21 | 25 to 30 minutes | Explain the topic out loud for 3 minutes, then redo one exercise from scratch. |

If a review goes badly (score 0 or 1), write it in your [weak-area log](#track-your-weak-areas) and restart the clock: that day becomes day 0 again.

### An example calendar

You finish the `useEffect` lesson and exercise 10 on Monday 16 November 2026. Your review calendar is:

| Day | Date | What you do |
|---|---|---|
| 0 | Mon 16 Nov | Read [useEffect](../02-hooks/03-useeffect.md), code [10 traffic light](../practice-app/exercises/react/10-traffic-light/README.md) |
| 1 | Tue 17 Nov | Answer the lesson's interview questions from memory (10 minutes) |
| 3 | Thu 19 Nov | Redo exercise 10 without looking (15 minutes) |
| 7 | Mon 23 Nov | Do [R3 effects](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) with a timer (20 minutes) |
| 21 | Mon 7 Dec | Explain `useEffect` out loud for 3 minutes, then redo exercise 10 |

**What happens, step by step:**
1. On day 0, you write all four review dates in your calendar. Do it the same day, while you remember.
2. Each morning, you open your calendar before you start anything new. Reviews come first.
3. You do each review without notes. You check afterwards.
4. A pass moves the item to its next date. A fail goes in the weak-area log and starts again from day 0.
5. If the daily queue grows longer than 20 minutes, you are learning too fast. Slow down, or review only your weakest topics.

The plans below do not list the reviews, because the dates depend on when you start. Add them yourself with the rule above.

## How to practise the 9 rounds

A **round** is one type of interview step. This repo has one folder per round type in [05-interview-rounds](../05-interview-rounds/README.md). A real company uses some of them, not all. Ask your recruiter for the format, and read [How React interviews work](./03-how-react-interviews-work.md) to see which rounds matter most for your target. Give those rounds extra time.

| Round | In plain words | Practice timer |
|---|---|---|
| [1. Screening quiz](../05-interview-rounds/round-1-screening-quiz/README.md) | Short questions, short answers | 45 to 60 seconds each |
| [2. Concepts and theory](../05-interview-rounds/round-2-concepts-and-theory/README.md) | "Explain how X works and why" | 2 to 3 minutes each |
| [3. Output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md) | "What does this print?" and "find the bug" | 3 to 5 minutes each |
| [4. Machine coding](../05-interview-rounds/round-4-machine-coding/README.md) | Build a small working screen from a spec | 15 to 60 minutes (set by the exercise) |
| [5. JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md) | Write a utility or a polyfill | 15 to 45 minutes (set by the exercise) |
| [6. Code review and refactoring](../05-interview-rounds/round-6-code-review-and-refactoring/README.md) | Read someone's code, list the problems, fix them | 15 to 20 minutes per snippet |
| [7. Performance and testing](../05-interview-rounds/round-7-performance-and-testing/README.md) | Find why a screen is slow, write tests | 15 to 25 minutes each |
| [8. Frontend system design](../05-interview-rounds/round-8-frontend-system-design/README.md) | Design a front-end feature by talking and drawing | 45 minutes |
| [9. Behavioral and project](../05-interview-rounds/round-9-behavioral-and-project/README.md) | Stories about your work, a deep dive on one project | 2 minutes per story |

A **polyfill** is your own version of a built-in function, for example your own `Promise.all`. **Machine coding** is the name many companies use for a live "build a small UI" round, usually 45 to 90 minutes.

### The scoring scale

Use the same scale every time, so your scores can be compared over weeks.

**Question rounds (1, 2, 3, 6, 7, 9): score each item 0, 1 or 2.**
- **2:** You gave the key points of the model answer, in your own words, inside the time, without reading.
- **1:** You had the idea, but missed a key point, or needed more time or a hint.
- **0:** You could not answer, or the answer was wrong.

**Coding rounds (4 and 5): give 1 point for each of these five checks (maximum 5).** Round 8 also uses five points, with its own checks (see Round 8 below).
- The tests pass inside the time.
- Edge cases work (empty input, errors, wrong input).
- The code is readable (clear names, small functions).
- You explained your decisions out loud while you worked.
- You named the extras: for UI, labels and keyboard use; for JavaScript functions, time and space cost.

**When to move on:** leave a file when at least 7 of every 10 questions score 2, or when a coding task or system design prompt scores 4 or 5 twice on different days.

A scoring example. The question is "What is the dependency array of `useEffect` for?" You say: "It tells React when to run the effect again." The model answer also says: with no array, the effect runs after every render; with `[]`, it runs after the first render (and in development StrictMode it runs setup, cleanup, setup); with values, it re-runs when one of them changes.

**What happens, step by step:**
1. You compare your answer with the model answer, point by point.
2. You had the main idea, but you missed the "no array" case and the StrictMode detail.
3. The score is 1.
4. You write the item in the weak-area log and plan a review for day 1.

### Round by round

**Round 1, screening quiz.**
- *Timer:* 45 to 60 seconds per question.
- *Out loud:* two sentences: what it is, and one reason or example.
- *Score:* 0, 1 or 2. Do the file once cold (to see where you stand), and again after studying.

**Round 2, concepts and theory.**
- *Timer:* 2 to 3 minutes per question.
- *Out loud:* use the four-part answer: what it is, why it exists, a tiny example, one gotcha.
- *Score:* 0, 1 or 2. Do the questions for a lesson in the same week as that lesson.

**Round 3, output and debugging.**
- *Timer:* 3 to 5 minutes per snippet.
- *Out loud:* before you run anything, write your predicted output and the reason on paper, then say it ("render one logs this, then the effect runs, then ..."). Run the snippet afterwards in a scratch file (the [practice app README](../practice-app/README.md) explains the `scratch/` folder).
- *Score:* 2 for the right output and the right reason; 1 for the right output with a weak reason; 0 for a wrong output. A lucky guess with no reason is a 1.

**Round 4, machine coding.**
- *Timer:* the time in the exercise README (15 to 60 minutes). Easy tasks first, then medium, then hard. The question files list the tiers, and the specs live in the practice app (see the [practice app README](../practice-app/README.md)).
- *Out loud:* ask clarifying questions first (to the empty room), say your plan for the state, then narrate while you type. Keep talking, even when stuck.
- *Score:* the five-point coding scale. Run the tests at the end. Read the take-home guide (planned) when a company sends a take-home task.

**Round 5, JavaScript coding.**
- *Timer:* the time in the exercise README (15 to 45 minutes).
- *Out loud:* say the edge cases before you code (empty input, repeated calls, errors), then say the time cost when you finish.
- *Score:* the five-point coding scale. The exercises live in the practice app, in the `exercises/js` folder.

**Round 6, code review and refactoring.**
- *Timer:* 15 to 20 minutes per snippet.
- *Out loud:* read the code once in silence. Then list the problems from most to least serious, say why each is a problem, and show the fix.
- *Score:* 2 if you found all the major problems in the answer file and fixed them; 1 for about half; 0 for fewer.

**Round 7, performance and testing.**
- *Timer:* 15 to 25 minutes.
- *Out loud:* for performance, say how you would measure first (profile, then change one thing), and only then the fix. For testing, say what the user does and sees, then write the test.
- *Score:* 0, 1 or 2.

**Round 8, frontend system design.**
- *Timer:* 45 minutes for one prompt, with paper or a drawing tool.
- *Out loud:* talk the whole time. Start with requirements and questions, then the main pieces, the data, the interface between pieces, and finally the improvements. Read the framework file in the round's `answers/` folder first, so you have a shape to follow.
- *Score:* one point each for requirements, architecture, data model, interface, and improvements and trade-offs (maximum 5). Record yourself and listen back.

**Round 9, behavioral and project.**
- *Timer:* 2 minutes per story, and 5 minutes for a project deep dive.
- *Out loud:* tell each story with four parts: the Situation, the Task, your Action, the Result (STAR). Say "I", not "we", for the parts you did. Include one number if you can.
- *Score:* 0, 1 or 2 per story. A 2 is clear, specific, inside the time, and shows your own part.

**Mock rounds.** When you finish a round file, run a full mock: all its questions, with a timer, no notes. [Interview rounds overview](../05-interview-rounds/README.md) explains how to run one.

## Choose your plan

Answer these five questions without notes. Say "yes" only if you can do it that way: the todo list in under 20 minutes, the `debounce` in under 10 minutes, and each explanation in under 2 minutes.

1. I can build a todo list (add, mark done, delete) with no tutorial.
2. I can explain why two `setCount(count + 1)` calls in one click add only 1, and what to write instead.
3. I can explain what the `useEffect` dependency array does, and what cleanup is for.
4. I can explain why list items need keys, and why index keys can break.
5. I can write a `debounce` function from memory.

Question 2 has a short answer. Both snippets start at `0`:

```jsx
setCount(count + 1)
setCount(count + 1)        // result: 1

setCount((c) => c + 1)
setCount((c) => c + 1)     // result: 2
```

**What happens, step by step:**
1. In one click, the handler sees one snapshot. `count` is `0` for the whole handler.
2. In the first pair, both calls mean "set it to 1". React uses the last one, so the result is 1.
3. In the second pair, React queues two small functions. The first turns `0` into `1`. The second gets that `1` and turns it into `2`.
4. Checked by running both versions in a test in the practice app: the first button showed `plain 1`, the second showed `updater 2`.

Count your "yes" answers, then use the table:

| Your situation | Plan | Hours per week (estimate) |
|---|---|---|
| Interview in 14 days or less, and 5 yes (or 4 yes with one gap you will fix on day 1) | [Plan 1: 2-week crash course](#plan-1-2-week-crash-course) | 15 to 20 (2 to 3 per day) |
| Interview in 3 to 5 weeks, and 4 or 5 yes | [Plan 2: 4-week plan](#plan-2-4-week-plan) | 10 to 12 |
| Interview in 6 to 10 weeks, or 2 to 3 yes | [Plan 3: 8-week plan](#plan-3-8-week-plan) | 10 to 12 |
| 11 weeks or more, no deadline, 0 to 1 yes, or you are new to React or rusty at JavaScript | [Plan 4: 12-week plan from scratch](#plan-4-12-week-plan-from-scratch) | 6 to 8 |

**Rules for in-between cases:**
- If your date falls between two plans, pick the shorter one and use the spare time for your weak areas. Do not stretch a short plan with new topics.
- If you have fewer than 7 days left, do this: day 1, [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) and [R1 hooks](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), then reread the lessons for your misses; day 2, one easy and one medium exercise under a timer, plus [R3 state](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md); day 3, Quickfire revision (planned) and the Interview-day checklist (planned).
- If your date and your yes-count point to different plans, the date wins on length and the yes-count wins on content. For example, with 10 days left and 2 yes, take the 2-week plan, and put your gaps at the top of your weak-area log.
- You can switch plans at any time. The [checklist](#progress-checklist) is the same for every plan, so no progress is lost.

## The four study plans

**How to read the plan tables.**
- **Read** lists lessons. **Code** lists practice-app exercises: "React 12" is the folder `exercises/react/12-autocomplete-debounce`, and "JS 03" is `exercises/js/03-memoize`. The number matches the [checklist](#progress-checklist). **Round practice** lists the question files to use that day or week.
- Round names are short: "R2 hooks" is the hooks questions of Round 2. Every name is a link to the file.
- Do the Code and Round items after the Read items of the same row.
- If a week runs over, drop the JavaScript exercises first. Never drop the Round column, and never double up next week to catch up. Repeat your weakest item instead.

**A 90-minute session** looks like this:
1. 10 minutes: your review queue (see [spaced repetition](#spaced-repetition-day-1-3-7-and-21)).
2. 35 minutes: read one lesson.
3. 30 minutes: one exercise with a timer.
4. 10 minutes: quiz yourself or explain out loud.
5. 5 minutes: update the weak-area log and tick the checklist.

### Plan 1: 2-week crash course

**For:** an interview in about two weeks, and you already know React basics (you can build a todo list without a tutorial). **Budget:** 2 to 3 hours a day, lighter on Day 7. **Short on time?** With only 1 hour a day, keep the Read and Round columns, and do the Code column on days 5, 11 and 14.

| Day | Read | Code | Round practice |
|---|---|---|---|
| 1 | [How interviews work](./03-how-react-interviews-work.md), [Hooks overview](../02-hooks/01-hooks-overview-and-rules.md), [useState](../02-hooks/02-usestate-in-depth.md) | React [01 counter](../practice-app/exercises/react/01-counter/README.md), [03 todo](../practice-app/exercises/react/03-todo-basic/README.md) | [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) as a diagnostic: score yourself before you study |
| 2 | [useEffect](../02-hooks/03-useeffect.md) | React [07 filter list](../practice-app/exercises/react/07-filterable-list/README.md), [10 traffic light](../practice-app/exercises/react/10-traffic-light/README.md) | [R3 effects](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| 3 | [useRef](../02-hooks/04-useref.md), [useContext](../02-hooks/05-usecontext.md) | React [18 stopwatch](../practice-app/exercises/react/18-stopwatch/README.md), [21 dropdown](../practice-app/exercises/react/21-dropdown-click-outside/README.md) | [R1 hooks](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) |
| 4 | [useReducer](../02-hooks/06-usereducer.md), [Memoization](../02-hooks/07-memoization.md) | React [19 cart](../practice-app/exercises/react/19-shopping-cart-reducer/README.md) | [R3 state](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| 5 | [Conditionals and lists](../01-basics/06-conditional-rendering-and-lists.md), [How React renders](../04-advanced/01-how-react-renders.md) | React [11 todo plus](../practice-app/exercises/react/11-todo-advanced/README.md) | [R3 rendering](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| 6 | [Custom hooks](../02-hooks/08-custom-hooks.md) | React [12 autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md); JS [01 debounce](../practice-app/exercises/js/01-debounce/README.md) | [R5 utilities](../05-interview-rounds/round-5-javascript-coding/README.md) |
| 7 | Review day: Hooks cheatsheet (planned) | Redo your weakest exercise from scratch | [R2 hooks](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), timed |
| 8 | [Data fetching](../03-intermediate/02-data-fetching.md), [State management](../03-intermediate/06-state-management.md) | React [15 fetch retry](../practice-app/exercises/react/15-fetch-list-retry/README.md) | [R2 state and data](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md) |
| 9 | [Performance](../04-advanced/02-performance-optimization.md), [Component patterns](../03-intermediate/01-component-patterns.md) | React [13 pagination](../practice-app/exercises/react/13-pagination/README.md) | [R2 rendering](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R7 performance](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md) |
| 10 | [React 19 and newer](../04-advanced/04-react-19-and-newer.md), [Error boundaries and portals](../03-intermediate/05-error-boundaries-portals-and-friends.md) | React [14 modal](../practice-app/exercises/react/14-modal-portal/README.md) | [R2 modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md) |
| 11 | No new reading: machine coding day | React [20 wizard form](../practice-app/exercises/react/20-multi-step-form/README.md), then [05 tabs](../practice-app/exercises/react/05-tabs/README.md), each under its README timer | [R4 medium](../05-interview-rounds/round-4-machine-coding/README.md) as a timed mock |
| 12 | [JS deep dive](../01-basics/10-javascript-deep-dive-for-interviews.md) | JS [02 throttle](../practice-app/exercises/js/02-throttle/README.md), [13 event emitter](../practice-app/exercises/js/13-event-emitter/README.md), [11 promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md) | [R5 async](../05-interview-rounds/round-5-javascript-coding/README.md) |
| 13 | [Testing React](../04-advanced/08-testing-react.md), Gotchas cheatsheet (planned) | React [04 signup form](../practice-app/exercises/react/04-signup-form-validation/README.md) | [R6 beginner](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md), [R7 testing](../05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md) |
| 14 | Quickfire revision (planned), Interview-day checklist (planned) | One timed exercise you have not done, such as React [16 infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md) or [17 tic-tac-toe](../practice-app/exercises/react/17-tic-tac-toe-history/README.md) | [R9 behavioral](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md), then redo [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) and compare with Day 1 |

**What this plan skips.** Add the lesson when your job post names it:
- TypeScript: [TypeScript with React](../03-intermediate/08-typescript-with-react.md).
- Routing: [React Router](../03-intermediate/03-react-router.md). Next.js or server rendering: [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md) and [Next.js essentials](../04-advanced/06-nextjs-essentials.md).
- Mid and senior roles: [Frontend system design](../04-advanced/11-frontend-system-design.md) and [R8 prompts](../05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md).
- If a basics lesson feels shaky, spend 20 minutes on the matching lesson in `01-basics` before you move on.

### Plan 2: 4-week plan

**For:** an interview in 3 to 5 weeks, and you know the React basics. **Budget:** 10 to 12 hours a week. Week 4 is a review and mock week.

| Week | Read | Code | Round practice |
|---|---|---|---|
| **1. Hooks and state** | [How interviews work](./03-how-react-interviews-work.md), [Hooks overview](../02-hooks/01-hooks-overview-and-rules.md), [useState](../02-hooks/02-usestate-in-depth.md), [useEffect](../02-hooks/03-useeffect.md), [useRef](../02-hooks/04-useref.md), [useContext](../02-hooks/05-usecontext.md), [useReducer](../02-hooks/06-usereducer.md) | React [01 counter](../practice-app/exercises/react/01-counter/README.md), [03 todo](../practice-app/exercises/react/03-todo-basic/README.md), [07 filter list](../practice-app/exercises/react/07-filterable-list/README.md), [10 traffic light](../practice-app/exercises/react/10-traffic-light/README.md), [18 stopwatch](../practice-app/exercises/react/18-stopwatch/README.md); JS [08 once](../practice-app/exercises/js/08-once/README.md) | [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) on day 1 as a diagnostic; [R1 hooks](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) and [R3 state](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) at the end of the week |
| **2. Rendering, patterns, data** | [Conditionals and lists](../01-basics/06-conditional-rendering-and-lists.md), [Memoization](../02-hooks/07-memoization.md), [Custom hooks](../02-hooks/08-custom-hooks.md), [How React renders](../04-advanced/01-how-react-renders.md), [Component patterns](../03-intermediate/01-component-patterns.md), [Data fetching](../03-intermediate/02-data-fetching.md) | React [11 todo plus](../practice-app/exercises/react/11-todo-advanced/README.md), [12 autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [15 fetch retry](../practice-app/exercises/react/15-fetch-list-retry/README.md), [19 cart](../practice-app/exercises/react/19-shopping-cart-reducer/README.md), [21 dropdown](../practice-app/exercises/react/21-dropdown-click-outside/README.md); JS [01 debounce](../practice-app/exercises/js/01-debounce/README.md), [02 throttle](../practice-app/exercises/js/02-throttle/README.md), [03 memoize](../practice-app/exercises/js/03-memoize/README.md) | [R2 hooks](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), [R3 effects](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [R3 rendering](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [R5 utilities](../05-interview-rounds/round-5-javascript-coding/README.md) |
| **3. Ecosystem and modern React** | [React Router](../03-intermediate/03-react-router.md), [State management](../03-intermediate/06-state-management.md), [Performance](../04-advanced/02-performance-optimization.md), [Concurrent React](../04-advanced/03-concurrent-react-and-suspense.md), [React 19 and newer](../04-advanced/04-react-19-and-newer.md), [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md) | React [13 pagination](../practice-app/exercises/react/13-pagination/README.md), [14 modal](../practice-app/exercises/react/14-modal-portal/README.md), [20 wizard form](../practice-app/exercises/react/20-multi-step-form/README.md), [23 data table](../practice-app/exercises/react/23-data-table/README.md); JS [11 promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md), [13 event emitter](../practice-app/exercises/js/13-event-emitter/README.md), [14 LRU cache](../practice-app/exercises/js/14-lru-cache/README.md) | [R2 rendering](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R2 state and data](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R2 modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R4 easy](../05-interview-rounds/round-4-machine-coding/README.md) and [R4 medium](../05-interview-rounds/round-4-machine-coding/README.md) as timed mocks, [R5 async](../05-interview-rounds/round-5-javascript-coding/README.md) |
| **4. Quality, design and mocks** | [Error boundaries and portals](../03-intermediate/05-error-boundaries-portals-and-friends.md), [Testing React](../04-advanced/08-testing-react.md), [Accessibility](../04-advanced/09-accessibility.md), [JS deep dive](../01-basics/10-javascript-deep-dive-for-interviews.md); mid and senior: [System design](../04-advanced/11-frontend-system-design.md); then Quickfire revision (planned), Gotchas cheatsheet (planned), Interview-day checklist (planned) | React [16 infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md), [17 tic-tac-toe](../practice-app/exercises/react/17-tic-tac-toe-history/README.md); JS [16 function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md) | [R3 bug hunt](../05-interview-rounds/round-3-output-and-debugging/questions/02-bug-hunt.md), [R6 beginner](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md), [R7 performance](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md), [R7 testing](../05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md), [R8 prompts](../05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md) (mid and senior), [R9 behavioral](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md), [R4 hard](../05-interview-rounds/round-4-machine-coding/README.md). Use the last two days for full mock interviews. |

**What this plan skips:** styling, TypeScript, tooling, HTTP and auth, legacy class code, security, internals and the browser platform. Add the ones your job post names. For a take-home assignment, read the take-home guide (planned).

### Plan 3: 8-week plan

**For:** an interview in 6 to 10 weeks, or you know some React but have gaps. **Budget:** 10 to 12 hours a week. Weeks 7 and 8 are the heaviest. This plan covers all lessons, 30 of the 33 React exercises and all 24 JavaScript exercises. The three left over (React 09, 26 and 32) are bonus work for after week 8.

| Week | Read | Code | Round practice |
|---|---|---|---|
| **1. Foundations** | [Setup](./02-setup-your-playground.md), [How interviews work](./03-how-react-interviews-work.md), [JS for React](../01-basics/01-javascript-for-react.md), [What is React](../01-basics/02-what-is-react.md), [JSX](../01-basics/03-jsx.md), [Components and props](../01-basics/04-components-and-props.md), [State and events](../01-basics/05-state-and-events.md) | Run the quick start commands; React [01 counter](../practice-app/exercises/react/01-counter/README.md), [02 accordion](../practice-app/exercises/react/02-accordion-single/README.md), [03 todo](../practice-app/exercises/react/03-todo-basic/README.md); JS [08 once](../practice-app/exercises/js/08-once/README.md), [07 compose](../practice-app/exercises/js/07-compose-pipe/README.md) | Read the [rounds overview](../05-interview-rounds/README.md). No quiz yet. |
| **2. Lists, forms, thinking in React** | [Conditionals and lists](../01-basics/06-conditional-rendering-and-lists.md), [Forms](../01-basics/07-forms.md), [Thinking in React](../01-basics/08-thinking-in-react.md), HTML, CSS and browser (planned), [JS deep dive](../01-basics/10-javascript-deep-dive-for-interviews.md), [Hooks overview](../02-hooks/01-hooks-overview-and-rules.md) | React [04 signup form](../practice-app/exercises/react/04-signup-form-validation/README.md), [07 filter list](../practice-app/exercises/react/07-filterable-list/README.md), [08 converter](../practice-app/exercises/react/08-temperature-converter/README.md); JS [04 curry](../practice-app/exercises/js/04-curry/README.md), [06 flatten](../practice-app/exercises/js/06-flatten-array/README.md), [20 strings](../practice-app/exercises/js/20-string-utils/README.md), [21 classnames](../practice-app/exercises/js/21-classnames/README.md) | [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) |
| **3. Hooks, part 1** | [useState](../02-hooks/02-usestate-in-depth.md), [useEffect](../02-hooks/03-useeffect.md), [useRef](../02-hooks/04-useref.md), [useContext](../02-hooks/05-usecontext.md), [useReducer](../02-hooks/06-usereducer.md) | React [05 tabs](../practice-app/exercises/react/05-tabs/README.md), [06 star rating](../practice-app/exercises/react/06-star-rating/README.md), [10 traffic light](../practice-app/exercises/react/10-traffic-light/README.md), [17 tic-tac-toe](../practice-app/exercises/react/17-tic-tac-toe-history/README.md); JS [01 debounce](../practice-app/exercises/js/01-debounce/README.md), [02 throttle](../practice-app/exercises/js/02-throttle/README.md), [18 array utils](../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md) | [R1 hooks](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), [R3 state](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| **4. Hooks, part 2, and patterns** | [Memoization](../02-hooks/07-memoization.md), [Custom hooks](../02-hooks/08-custom-hooks.md), [Other hooks](../02-hooks/09-other-hooks.md), [Component patterns](../03-intermediate/01-component-patterns.md), [Data fetching](../03-intermediate/02-data-fetching.md) | React [11 todo plus](../practice-app/exercises/react/11-todo-advanced/README.md), [18 stopwatch](../practice-app/exercises/react/18-stopwatch/README.md), [19 cart](../practice-app/exercises/react/19-shopping-cart-reducer/README.md), [21 dropdown](../practice-app/exercises/react/21-dropdown-click-outside/README.md); JS [03 memoize](../practice-app/exercises/js/03-memoize/README.md), [13 event emitter](../practice-app/exercises/js/13-event-emitter/README.md), [17 array polyfills](../practice-app/exercises/js/17-array-polyfills/README.md) | [R2 fundamentals](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), [R2 hooks](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), [R3 effects](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| **5. Routing, forms, state, styling** | [React Router](../03-intermediate/03-react-router.md), [Forms with libraries](../03-intermediate/04-forms-with-libraries.md), [Error boundaries and portals](../03-intermediate/05-error-boundaries-portals-and-friends.md), [State management](../03-intermediate/06-state-management.md), [Styling](../03-intermediate/07-styling.md) | React [12 autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [13 pagination](../practice-app/exercises/react/13-pagination/README.md), [15 fetch retry](../practice-app/exercises/react/15-fetch-list-retry/README.md), [20 wizard form](../practice-app/exercises/react/20-multi-step-form/README.md); JS [11 promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md), [12 retry](../practice-app/exercises/js/12-retry-with-timeout/README.md), [23 query string](../practice-app/exercises/js/23-query-string/README.md) | [R2 state and data](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R4 easy](../05-interview-rounds/round-4-machine-coding/README.md) as a timed mock, [R5 utilities](../05-interview-rounds/round-5-javascript-coding/README.md) |
| **6. Tooling, APIs, TypeScript, rendering** | [TypeScript](../03-intermediate/08-typescript-with-react.md), Tooling (planned), APIs and auth (planned), Legacy React (planned), [How React renders](../04-advanced/01-how-react-renders.md) | React [14 modal](../practice-app/exercises/react/14-modal-portal/README.md), [16 infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md), [22 carousel](../practice-app/exercises/react/22-image-carousel/README.md), [23 data table](../practice-app/exercises/react/23-data-table/README.md); JS [05 deep clone](../practice-app/exercises/js/05-deep-clone/README.md), [09 deep equal](../practice-app/exercises/js/09-deep-equal/README.md), [10 get and set](../practice-app/exercises/js/10-get-set-by-path/README.md) | [R1 advanced](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), [R4 medium](../05-interview-rounds/round-4-machine-coding/README.md) as a timed mock, [R5 async](../05-interview-rounds/round-5-javascript-coding/README.md), [R6 beginner](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md), [R9 behavioral](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md) |
| **7. Performance, React 19, SSR** | [Performance](../04-advanced/02-performance-optimization.md), [Concurrent React](../04-advanced/03-concurrent-react-and-suspense.md), [React 19 and newer](../04-advanced/04-react-19-and-newer.md), [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md), [Next.js](../04-advanced/06-nextjs-essentials.md), Advanced patterns (planned) | React [24 virtual list](../practice-app/exercises/react/24-virtualized-list/README.md), [25 kanban](../practice-app/exercises/react/25-kanban-board/README.md), [28 comments](../practice-app/exercises/react/28-nested-comments/README.md), [29 file tree](../practice-app/exercises/react/29-file-explorer-tree/README.md); JS [14 LRU cache](../practice-app/exercises/js/14-lru-cache/README.md), [15 promise pool](../practice-app/exercises/js/15-promise-pool/README.md), [16 function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md) | [R2 rendering](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R2 modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R3 rendering](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [R7 performance](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md), [R9 project](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md) |
| **8. Quality, design, mocks** | [Testing React](../04-advanced/08-testing-react.md), [Accessibility](../04-advanced/09-accessibility.md), [Security and i18n](../04-advanced/10-security-and-i18n.md), [System design](../04-advanced/11-frontend-system-design.md); optional for senior roles: Internals (planned), Browser and web platform (planned); then Quickfire revision (planned), Gotchas cheatsheet (planned), Interview-day checklist (planned) | React [27 query hook](../practice-app/exercises/react/27-mini-query-hook/README.md), [30 form builder](../practice-app/exercises/react/30-dynamic-form-builder/README.md), [31 toasts](../practice-app/exercises/react/31-toast-system/README.md), [33 combobox](../practice-app/exercises/react/33-accessible-combobox/README.md); JS [19 two sum](../practice-app/exercises/js/19-two-sum-and-friends/README.md), [22 store](../practice-app/exercises/js/22-observable-store/README.md), [24 DOM](../practice-app/exercises/js/24-dom-traversal/README.md) | [R2 testing and misc](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R3 bug hunt](../05-interview-rounds/round-3-output-and-debugging/questions/02-bug-hunt.md), [R4 hard](../05-interview-rounds/round-4-machine-coding/README.md) and the take-home guide (planned), [R5 objects and DOM](../05-interview-rounds/round-5-javascript-coding/README.md), [R6 advanced](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md), [R7 testing](../05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md), [R8 prompts](../05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md), [R9 questions to ask](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md). Pick the rounds your target company uses, and finish with two full mocks. |

**Bonus after week 8:** React [09 char counter](../practice-app/exercises/react/09-character-counter/README.md), [26 undo redo](../practice-app/exercises/react/26-undo-redo-hook/README.md) and [32 mini redux](../practice-app/exercises/react/32-mini-redux-store/README.md).

### Plan 4: 12-week plan from scratch

**For:** no deadline or a deadline 11 or more weeks away, and you are new to React or rusty at JavaScript. **Budget:** 6 to 8 hours a week. This plan covers every lesson, every exercise and every round file. Weeks 1 and 2 have no quiz, because you have not learned enough yet. Week 12 is the heaviest: it is light on new reading if you skip the two optional lessons, and heavy on rehearsal.

| Week | Read | Code | Round practice |
|---|---|---|---|
| **1. Get set up** | [Setup](./02-setup-your-playground.md), [How interviews work](./03-how-react-interviews-work.md), [JS for React](../01-basics/01-javascript-for-react.md) | Run the quick start commands; JS [08 once](../practice-app/exercises/js/08-once/README.md) | Skim the [rounds overview](../05-interview-rounds/README.md) |
| **2. What React is** | [What is React](../01-basics/02-what-is-react.md), [JSX](../01-basics/03-jsx.md), [Components and props](../01-basics/04-components-and-props.md) | Build the first Vite app from the What is React lesson; JS [04 curry](../practice-app/exercises/js/04-curry/README.md), [07 compose](../practice-app/exercises/js/07-compose-pipe/README.md) | None yet |
| **3. State, events, lists, forms** | [State and events](../01-basics/05-state-and-events.md), [Conditionals and lists](../01-basics/06-conditional-rendering-and-lists.md), [Forms](../01-basics/07-forms.md) | React [01 counter](../practice-app/exercises/react/01-counter/README.md), [02 accordion](../practice-app/exercises/react/02-accordion-single/README.md), [03 todo](../practice-app/exercises/react/03-todo-basic/README.md), [09 char counter](../practice-app/exercises/react/09-character-counter/README.md); JS [20 strings](../practice-app/exercises/js/20-string-utils/README.md), [21 classnames](../practice-app/exercises/js/21-classnames/README.md) | [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), first try (a low score is normal) |
| **4. Thinking in React, CSS, JS depth** | [Thinking in React](../01-basics/08-thinking-in-react.md), HTML, CSS and browser (planned), [JS deep dive](../01-basics/10-javascript-deep-dive-for-interviews.md) | React [04 signup form](../practice-app/exercises/react/04-signup-form-validation/README.md), [07 filter list](../practice-app/exercises/react/07-filterable-list/README.md), [08 converter](../practice-app/exercises/react/08-temperature-converter/README.md); JS [06 flatten](../practice-app/exercises/js/06-flatten-array/README.md), [18 array utils](../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md) | [R1 basics](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) again, [R3 state](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) |
| **5. Hooks start** | [Hooks overview](../02-hooks/01-hooks-overview-and-rules.md), [useState](../02-hooks/02-usestate-in-depth.md), [useEffect](../02-hooks/03-useeffect.md) | React [05 tabs](../practice-app/exercises/react/05-tabs/README.md), [06 star rating](../practice-app/exercises/react/06-star-rating/README.md), [10 traffic light](../practice-app/exercises/react/10-traffic-light/README.md); JS [01 debounce](../practice-app/exercises/js/01-debounce/README.md), [02 throttle](../practice-app/exercises/js/02-throttle/README.md) | [R1 hooks](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), [R4 easy](../05-interview-rounds/round-4-machine-coding/README.md) as a timed mock |
| **6. Refs, context, reducers, memo** | [useRef](../02-hooks/04-useref.md), [useContext](../02-hooks/05-usecontext.md), [useReducer](../02-hooks/06-usereducer.md), [Memoization](../02-hooks/07-memoization.md) | React [11 todo plus](../practice-app/exercises/react/11-todo-advanced/README.md), [18 stopwatch](../practice-app/exercises/react/18-stopwatch/README.md), [19 cart](../practice-app/exercises/react/19-shopping-cart-reducer/README.md), [21 dropdown](../practice-app/exercises/react/21-dropdown-click-outside/README.md); JS [03 memoize](../practice-app/exercises/js/03-memoize/README.md), [17 array polyfills](../practice-app/exercises/js/17-array-polyfills/README.md) | [R3 effects](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [R2 fundamentals](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md) |
| **7. Custom hooks and data** | [Custom hooks](../02-hooks/08-custom-hooks.md), [Other hooks](../02-hooks/09-other-hooks.md), [Component patterns](../03-intermediate/01-component-patterns.md), [Data fetching](../03-intermediate/02-data-fetching.md) | React [12 autocomplete](../practice-app/exercises/react/12-autocomplete-debounce/README.md), [13 pagination](../practice-app/exercises/react/13-pagination/README.md), [15 fetch retry](../practice-app/exercises/react/15-fetch-list-retry/README.md); JS [11 promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md), [13 event emitter](../practice-app/exercises/js/13-event-emitter/README.md) | [R2 hooks](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md), [R5 utilities](../05-interview-rounds/round-5-javascript-coding/README.md) |
| **8. Router, forms, boundaries, state** | [React Router](../03-intermediate/03-react-router.md), [Forms with libraries](../03-intermediate/04-forms-with-libraries.md), [Error boundaries and portals](../03-intermediate/05-error-boundaries-portals-and-friends.md), [State management](../03-intermediate/06-state-management.md) | React [14 modal](../practice-app/exercises/react/14-modal-portal/README.md), [16 infinite scroll](../practice-app/exercises/react/16-infinite-scroll/README.md), [17 tic-tac-toe](../practice-app/exercises/react/17-tic-tac-toe-history/README.md), [20 wizard form](../practice-app/exercises/react/20-multi-step-form/README.md); JS [12 retry](../practice-app/exercises/js/12-retry-with-timeout/README.md), [23 query string](../practice-app/exercises/js/23-query-string/README.md) | [R2 state and data](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R4 medium](../05-interview-rounds/round-4-machine-coding/README.md) as a timed mock, [R5 async](../05-interview-rounds/round-5-javascript-coding/README.md) |
| **9. Styling, TypeScript, tooling, APIs, legacy** | [Styling](../03-intermediate/07-styling.md), [TypeScript](../03-intermediate/08-typescript-with-react.md), Tooling (planned), APIs and auth (planned), Legacy React (planned) | React [22 carousel](../practice-app/exercises/react/22-image-carousel/README.md), [23 data table](../practice-app/exercises/react/23-data-table/README.md); JS [05 deep clone](../practice-app/exercises/js/05-deep-clone/README.md), [09 deep equal](../practice-app/exercises/js/09-deep-equal/README.md), [10 get and set](../practice-app/exercises/js/10-get-set-by-path/README.md) | [R1 advanced](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md), [R6 beginner](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md) |
| **10. Rendering, performance, concurrency, React 19** | [How React renders](../04-advanced/01-how-react-renders.md), [Performance](../04-advanced/02-performance-optimization.md), [Concurrent React](../04-advanced/03-concurrent-react-and-suspense.md), [React 19 and newer](../04-advanced/04-react-19-and-newer.md) | React [24 virtual list](../practice-app/exercises/react/24-virtualized-list/README.md), [25 kanban](../practice-app/exercises/react/25-kanban-board/README.md), [26 undo redo](../practice-app/exercises/react/26-undo-redo-hook/README.md); JS [14 LRU cache](../practice-app/exercises/js/14-lru-cache/README.md), [15 promise pool](../practice-app/exercises/js/15-promise-pool/README.md) | [R2 rendering](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R3 rendering](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md), [R7 performance](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md) |
| **11. SSR, Next.js, patterns, testing** | [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md), [Next.js](../04-advanced/06-nextjs-essentials.md), Advanced patterns (planned), [Testing React](../04-advanced/08-testing-react.md) | React [27 query hook](../practice-app/exercises/react/27-mini-query-hook/README.md), [28 comments](../practice-app/exercises/react/28-nested-comments/README.md), [29 file tree](../practice-app/exercises/react/29-file-explorer-tree/README.md), [32 mini redux](../practice-app/exercises/react/32-mini-redux-store/README.md); JS [16 function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md), [22 store](../practice-app/exercises/js/22-observable-store/README.md) | [R2 modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R3 bug hunt](../05-interview-rounds/round-3-output-and-debugging/questions/02-bug-hunt.md), [R6 advanced](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md), [R9 behavioral](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md), [R9 project](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md) |
| **12. Accessibility, security, design, final mocks** | [Accessibility](../04-advanced/09-accessibility.md), [Security and i18n](../04-advanced/10-security-and-i18n.md), [System design](../04-advanced/11-frontend-system-design.md); optional: Internals (planned), Browser and web platform (planned); then Quickfire revision (planned), Gotchas cheatsheet (planned), Interview-day checklist (planned) | React [30 form builder](../practice-app/exercises/react/30-dynamic-form-builder/README.md), [31 toasts](../practice-app/exercises/react/31-toast-system/README.md), [33 combobox](../practice-app/exercises/react/33-accessible-combobox/README.md); JS [19 two sum](../practice-app/exercises/js/19-two-sum-and-friends/README.md), [24 DOM](../practice-app/exercises/js/24-dom-traversal/README.md) | [R2 testing and misc](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md), [R7 testing](../05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md), [R4 hard](../05-interview-rounds/round-4-machine-coding/README.md) and the take-home guide (planned), [R5 objects and DOM](../05-interview-rounds/round-5-javascript-coding/README.md), [R8 prompts](../05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md), [R9 questions to ask](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md). Finish with two full mocks. |

## How to use the cheatsheets

The six cheatsheets are for revision, not for first-time learning. They skip the "why", so a line you do not understand is a sign to go back to the lesson.

| Sheet | What it gives you | When to use it |
|---|---|---|
| Hooks cheatsheet (planned) | Every hook on one page: signature, when to use it, one gotcha | After the hooks lessons; before the hooks quizzes (R1 and R2) |
| Patterns and syntax (planned) | JSX, props, events, lists, forms, context, reducers, memo, router and patterns on one page | While you code exercises, to jog your memory of syntax |
| Quickfire revision (planned) | 120 one-line answers | The last 2 to 3 days, 20 to 30 minutes a day |
| Glossary (planned) | An A-Z of React terms in simple words | Any time a word is new; read it once from A to Z a week before the interview |
| Gotchas and common mistakes (planned) | The 40 most common bugs and their fixes | Before code review (R6) and debugging (R3) rounds; keep it open while you debug |
| Interview-day checklist (planned) | Before, during and after the interview; a think-aloud script; a machine coding time plan | The day before, and again on the morning of the interview |

### Cover and recall

The best way to use a cheatsheet is **cover and recall**. Take the hooks cheatsheet. Cover the text on the right of a hook's name. Read only the name, for example `useRef`. Say out loud what it takes, when you use it and its main gotcha. Uncover the text and compare.

**What happens, step by step:**
1. Seeing the name makes you search your memory. That search is what builds memory. Just rereading the sheet does not.
2. Saying it out loud also practises the speaking skill.
3. When you compare, you find the exact word or fact you missed.
4. Each miss goes into the [weak-area log](#track-your-weak-areas). The sheet is now a test, not a page to read.

### The night before the interview

1. Read the Interview-day checklist (planned).
2. Do the Quickfire revision (planned) with cover and recall for 30 minutes.
3. Read your own weak-area log. Make a one-page sheet of the 10 facts you keep missing.
4. Redo one easy exercise (React 01 or 03) for confidence.
5. Do not start a new lesson. Sleep.

## Track your weak areas

Everyone has weak spots, and they are not the same for everyone. A **weak-area log** is a list of what you got wrong, with a plan to fix it. It tells you what to study next, so you stop spending time on what you already know.

Keep it in a file, for example `my-weak-areas.md`, or in a spreadsheet. Add a row for every quiz item you score 0 or 1, and every exercise you score 3 or lower out of 5.

```text
| Date       | Item                       | Score | Gap type  | Why I missed it                        | Fix                         | Next review |
|------------|----------------------------|-------|-----------|----------------------------------------|-----------------------------|-------------|
| 2026-11-17 | R2 hooks: dependency array | 1     | Knowledge | forgot the "no array" case             | reread the useEffect deps   | 2026-11-18  |
| 2026-11-18 | React 12 autocomplete      | 3/5   | Time      | 20 minutes on CSS, ran out of time     | redo with a 45 minute timer | 2026-11-21  |
| 2026-11-19 | R3 effects: cleanup order  | 0     | Recall    | knew cleanup exists, could not predict | cover and recall drill      | 2026-11-20  |
```

**What happens, step by step:**
1. After a quiz or exercise, you add one row per miss. For quiz items, copy the question ID from the file (the ID in bold, like `R2-HK-014`).
2. You pick the **gap type**. This is the key column, because each type has a different fix (see the next table).
3. You write one honest sentence about why. "Forgot the no-array case" helps you. "Bad at hooks" does not.
4. You write the fix and the next review date. Use the day 1, 3, 7, 21 rule.
5. When an item scores 2 on two reviews in a row, you cross it out. It is closed.

| Gap type | What it means | The fix |
|---|---|---|
| Knowledge | You did not know it | Reread that lesson section. Write a 3-line summary in your own words. |
| Recall | You knew it, but could not pull it out | Spaced repetition and cover and recall. |
| Explanation | You knew it, but said it badly (rambling, no example) | Say it out loud in 60 to 90 seconds with the four-part answer. Record it. |
| Time | You were right, but too slow | Timed drills. Practise the first 5 minutes of an exercise until it is automatic. |

**Weekly review (15 minutes, on the same day each week):**
1. Count the open rows by topic (for example hooks, rendering, state, JavaScript, system design).
2. Pick the three topics with the most rows.
3. Next week, add 30 minutes a day on those three: reread, redo an exercise, quiz.
4. At the end of the week, run a short mock on those topics. If the scores did not rise, change the fix, not the effort. For example, move from rereading to coding.

## Progress checklist

Copy this checklist into your own file (for example `my-progress.md`) so that updating the repo later does not cause a merge conflict. Tick a box by editing the text: change `[ ]` to `[x]`. Rendered previews usually show the boxes but do not let you click them. The list is the same for every plan, so you can switch plans and keep your progress.

### Lessons

**00 Start here**
- [ ] [How to Use This Repo](./01-how-to-use-this-repo.md) (this guide)
- [ ] [Setup your playground](./02-setup-your-playground.md)
- [ ] [How React interviews work](./03-how-react-interviews-work.md)

**01 Basics**
- [ ] [JavaScript for React](../01-basics/01-javascript-for-react.md)
- [ ] [What is React](../01-basics/02-what-is-react.md)
- [ ] [JSX](../01-basics/03-jsx.md)
- [ ] [Components and props](../01-basics/04-components-and-props.md)
- [ ] [State and events](../01-basics/05-state-and-events.md)
- [ ] [Conditional rendering and lists](../01-basics/06-conditional-rendering-and-lists.md)
- [ ] [Forms](../01-basics/07-forms.md)
- [ ] [Thinking in React](../01-basics/08-thinking-in-react.md)
- [ ] HTML, CSS and browser basics (planned)
- [ ] [JavaScript deep dive for interviews](../01-basics/10-javascript-deep-dive-for-interviews.md)

**02 Hooks**
- [ ] [Hooks overview and rules](../02-hooks/01-hooks-overview-and-rules.md)
- [ ] [useState in depth](../02-hooks/02-usestate-in-depth.md)
- [ ] [useEffect](../02-hooks/03-useeffect.md)
- [ ] [useRef](../02-hooks/04-useref.md)
- [ ] [useContext](../02-hooks/05-usecontext.md)
- [ ] [useReducer](../02-hooks/06-usereducer.md)
- [ ] [Memoization](../02-hooks/07-memoization.md)
- [ ] [Custom hooks](../02-hooks/08-custom-hooks.md)
- [ ] [Other hooks](../02-hooks/09-other-hooks.md)

**03 Intermediate**
- [ ] [Component patterns](../03-intermediate/01-component-patterns.md)
- [ ] [Data fetching](../03-intermediate/02-data-fetching.md)
- [ ] [React Router](../03-intermediate/03-react-router.md)
- [ ] [Forms with libraries](../03-intermediate/04-forms-with-libraries.md)
- [ ] [Error boundaries, portals and friends](../03-intermediate/05-error-boundaries-portals-and-friends.md)
- [ ] [State management](../03-intermediate/06-state-management.md)
- [ ] [Styling](../03-intermediate/07-styling.md)
- [ ] [TypeScript with React](../03-intermediate/08-typescript-with-react.md)
- [ ] Tooling: Vite, ESLint, build (planned)
- [ ] APIs, HTTP and auth for the frontend (planned)
- [ ] Legacy React: class components and Redux connect (planned)

**04 Advanced**
- [ ] [How React renders](../04-advanced/01-how-react-renders.md)
- [ ] [Performance optimization](../04-advanced/02-performance-optimization.md)
- [ ] [Concurrent React and Suspense](../04-advanced/03-concurrent-react-and-suspense.md)
- [ ] [React 19 and newer](../04-advanced/04-react-19-and-newer.md)
- [ ] [SSR and Server Components](../04-advanced/05-ssr-and-server-components.md)
- [ ] [Next.js essentials](../04-advanced/06-nextjs-essentials.md)
- [ ] Advanced patterns (planned)
- [ ] [Testing React](../04-advanced/08-testing-react.md)
- [ ] [Accessibility](../04-advanced/09-accessibility.md)
- [ ] [Security and i18n](../04-advanced/10-security-and-i18n.md)
- [ ] [Frontend system design](../04-advanced/11-frontend-system-design.md)
- [ ] React internals deep dive (planned)
- [ ] Browser and web platform (planned)

### Cheatsheets

- [ ] Hooks cheatsheet (planned)
- [ ] Patterns and syntax cheatsheet (planned)
- [ ] Quickfire revision (planned)
- [ ] Glossary (planned)
- [ ] Gotchas and common mistakes (planned)
- [ ] Interview-day checklist (planned)

### Interview rounds

Tick a file when you reach the gate in [the scoring scale](#the-scoring-scale) (7 of 10 at score 2). Tick the mock box when you have done a full timed run of the round.

- [ ] **Round 1: [Screening quiz](../05-interview-rounds/round-1-screening-quiz/README.md)**
  - [ ] [Screening quiz (90 questions)](../05-interview-rounds/round-1-screening-quiz/questions/01-screening-quiz.md) ([answers](../05-interview-rounds/round-1-screening-quiz/answers/01-screening-quiz.md))
  - [ ] Full timed mock
- [ ] **Round 2: [Concepts and theory](../05-interview-rounds/round-2-concepts-and-theory/README.md)**
  - [ ] [Fundamentals and hooks](../05-interview-rounds/round-2-concepts-and-theory/questions/01-fundamentals-and-hooks.md) ([answers](../05-interview-rounds/round-2-concepts-and-theory/answers/01-fundamentals-and-hooks.md))
  - [ ] [Rendering, state and modern React](../05-interview-rounds/round-2-concepts-and-theory/questions/02-rendering-state-and-modern-react.md) ([answers](../05-interview-rounds/round-2-concepts-and-theory/answers/02-rendering-state-and-modern-react.md))
  - [ ] Full timed mock
- [ ] **Round 3: [Output and debugging](../05-interview-rounds/round-3-output-and-debugging/README.md)**
  - [ ] [Output prediction](../05-interview-rounds/round-3-output-and-debugging/questions/01-output-prediction.md) ([answers](../05-interview-rounds/round-3-output-and-debugging/answers/01-output-prediction.md))
  - [ ] [Bug hunt](../05-interview-rounds/round-3-output-and-debugging/questions/02-bug-hunt.md) ([answers](../05-interview-rounds/round-3-output-and-debugging/answers/02-bug-hunt.md))
  - [ ] Full timed mock
- [ ] **Round 4: [Machine coding](../05-interview-rounds/round-4-machine-coding/README.md)**
  - [ ] Easy exercises 01 to 10
  - [ ] Medium exercises 11 to 23
  - [ ] Hard exercises 24 to 33
  - [ ] Full timed mock
- [ ] **Round 5: [JavaScript coding](../05-interview-rounds/round-5-javascript-coding/README.md)**
  - [ ] JavaScript exercises 01 to 24
  - [ ] Full timed mock
- [ ] **Round 6: [Code review and refactoring](../05-interview-rounds/round-6-code-review-and-refactoring/README.md)**
  - [ ] [Code review scenarios](../05-interview-rounds/round-6-code-review-and-refactoring/questions/01-code-review.md) ([answers](../05-interview-rounds/round-6-code-review-and-refactoring/answers/01-code-review.md))
  - [ ] Full timed mock
- [ ] **Round 7: [Performance and testing](../05-interview-rounds/round-7-performance-and-testing/README.md)**
  - [ ] [Performance scenarios](../05-interview-rounds/round-7-performance-and-testing/questions/01-performance-scenarios.md) ([answers](../05-interview-rounds/round-7-performance-and-testing/answers/01-performance-scenarios.md))
  - [ ] [Testing exercises](../05-interview-rounds/round-7-performance-and-testing/questions/02-testing-exercises.md) ([answers](../05-interview-rounds/round-7-performance-and-testing/answers/02-testing-exercises.md))
  - [ ] Full timed mock
- [ ] **Round 8: [Frontend system design](../05-interview-rounds/round-8-frontend-system-design/README.md)**
  - [ ] [Prompts (the answers file starts with the framework, read it before your first attempt)](../05-interview-rounds/round-8-frontend-system-design/questions/01-prompts.md) ([answers](../05-interview-rounds/round-8-frontend-system-design/answers/01-prompts.md))
  - [ ] Full timed mock (one prompt, 45 minutes)
- [ ] **Round 9: [Behavioral and project](../05-interview-rounds/round-9-behavioral-and-project/README.md)**
  - [ ] [Behavioral, project deep dive and questions to ask](../05-interview-rounds/round-9-behavioral-and-project/questions/01-behavioral-and-project.md) ([answers](../05-interview-rounds/round-9-behavioral-and-project/answers/01-behavioral-and-project.md))
  - [ ] Full timed mock

### Practice-app exercises

Tick an exercise when the tests pass **and** you can redo it from scratch inside its time. The times come from each exercise README.

<details>
<summary>33 React exercises (open to see the list)</summary>

**Easy**
- [ ] [01 Counter with step and reset](../practice-app/exercises/react/01-counter/README.md) (15 min)
- [ ] [02 FAQ accordion](../practice-app/exercises/react/02-accordion-single/README.md) (15 min)
- [ ] [03 Todo list, basic](../practice-app/exercises/react/03-todo-basic/README.md) (20 min)
- [ ] [04 Signup form with validation](../practice-app/exercises/react/04-signup-form-validation/README.md) (25 min)
- [ ] [05 Tabs](../practice-app/exercises/react/05-tabs/README.md) (30 min)
- [ ] [06 Star rating](../practice-app/exercises/react/06-star-rating/README.md) (20 min)
- [ ] [07 Filterable product list](../practice-app/exercises/react/07-filterable-list/README.md) (20 min)
- [ ] [08 Temperature converter](../practice-app/exercises/react/08-temperature-converter/README.md) (15 min)
- [ ] [09 Character counter](../practice-app/exercises/react/09-character-counter/README.md) (15 min)
- [ ] [10 Traffic light](../practice-app/exercises/react/10-traffic-light/README.md) (25 min)

**Medium**
- [ ] [11 Todo list with filters, editing and storage](../practice-app/exercises/react/11-todo-advanced/README.md) (45 min)
- [ ] [12 Autocomplete with debounce](../practice-app/exercises/react/12-autocomplete-debounce/README.md) (45 min)
- [ ] [13 Pagination](../practice-app/exercises/react/13-pagination/README.md) (30 min)
- [ ] [14 Modal with portal, focus trap and scroll lock](../practice-app/exercises/react/14-modal-portal/README.md) (40 min)
- [ ] [15 Fetch list with retry and race protection](../practice-app/exercises/react/15-fetch-list-retry/README.md) (40 min)
- [ ] [16 Infinite scroll feed](../practice-app/exercises/react/16-infinite-scroll/README.md) (40 min)
- [ ] [17 Tic-tac-toe with history](../practice-app/exercises/react/17-tic-tac-toe-history/README.md) (40 min)
- [ ] [18 Stopwatch with laps](../practice-app/exercises/react/18-stopwatch/README.md) (30 min)
- [ ] [19 Shopping cart with a reducer and context](../practice-app/exercises/react/19-shopping-cart-reducer/README.md) (45 min)
- [ ] [20 Multi-step form](../practice-app/exercises/react/20-multi-step-form/README.md) (45 min)
- [ ] [21 Dropdown with click outside](../practice-app/exercises/react/21-dropdown-click-outside/README.md) (30 min)
- [ ] [22 Image carousel](../practice-app/exercises/react/22-image-carousel/README.md) (30 min)
- [ ] [23 Data table](../practice-app/exercises/react/23-data-table/README.md) (45 min)

**Hard**
- [ ] [24 Virtualized list](../practice-app/exercises/react/24-virtualized-list/README.md) (60 min)
- [ ] [25 Kanban board](../practice-app/exercises/react/25-kanban-board/README.md) (60 min)
- [ ] [26 Undo/redo hook](../practice-app/exercises/react/26-undo-redo-hook/README.md) (45 min)
- [ ] [27 Mini query hook](../practice-app/exercises/react/27-mini-query-hook/README.md) (60 min)
- [ ] [28 Nested comments](../practice-app/exercises/react/28-nested-comments/README.md) (45 min)
- [ ] [29 File explorer tree](../practice-app/exercises/react/29-file-explorer-tree/README.md) (50 min)
- [ ] [30 Dynamic form builder](../practice-app/exercises/react/30-dynamic-form-builder/README.md) (60 min)
- [ ] [31 Toast system](../practice-app/exercises/react/31-toast-system/README.md) (50 min)
- [ ] [32 Mini Redux store](../practice-app/exercises/react/32-mini-redux-store/README.md) (50 min)
- [ ] [33 Accessible combobox](../practice-app/exercises/react/33-accessible-combobox/README.md) (60 min)

</details>

<details>
<summary>24 JavaScript exercises (open to see the list)</summary>

- [ ] [01 Debounce](../practice-app/exercises/js/01-debounce/README.md) (Easy, 20 min)
- [ ] [02 Throttle](../practice-app/exercises/js/02-throttle/README.md) (Easy, 20 min)
- [ ] [03 memoize](../practice-app/exercises/js/03-memoize/README.md) (Easy, 20 min)
- [ ] [04 curry and partial](../practice-app/exercises/js/04-curry/README.md) (Easy, 20 min)
- [ ] [05 Deep clone](../practice-app/exercises/js/05-deep-clone/README.md) (Medium, 30 min)
- [ ] [06 Flatten arrays and objects](../practice-app/exercises/js/06-flatten-array/README.md) (Easy, 25 min)
- [ ] [07 compose, pipe, pipeAsync and tap](../practice-app/exercises/js/07-compose-pipe/README.md) (Easy, 20 min)
- [ ] [08 once, before and after](../practice-app/exercises/js/08-once/README.md) (Easy, 15 min)
- [ ] [09 Deep equal](../practice-app/exercises/js/09-deep-equal/README.md) (Medium, 30 min)
- [ ] [10 Get and set by path](../practice-app/exercises/js/10-get-set-by-path/README.md) (Medium, 30 min)
- [ ] [11 Promise combinators](../practice-app/exercises/js/11-promise-combinators/README.md) (Medium, 40 min)
- [ ] [12 Retry with timeout](../practice-app/exercises/js/12-retry-with-timeout/README.md) (Medium, 40 min)
- [ ] [13 Event emitter](../practice-app/exercises/js/13-event-emitter/README.md) (Easy, 25 min)
- [ ] [14 LRU cache](../practice-app/exercises/js/14-lru-cache/README.md) (Medium, 30 min)
- [ ] [15 Promise pool](../practice-app/exercises/js/15-promise-pool/README.md) (Medium, 40 min)
- [ ] [16 Function polyfills](../practice-app/exercises/js/16-function-polyfills/README.md) (Medium, 40 min)
- [ ] [17 Array polyfills](../practice-app/exercises/js/17-array-polyfills/README.md) (Easy, 30 min)
- [ ] [18 Array utils: groupBy, chunk, sortBy](../practice-app/exercises/js/18-array-utils-groupby-chunk/README.md) (Easy, 30 min)
- [ ] [19 Two Sum and friends](../practice-app/exercises/js/19-two-sum-and-friends/README.md) (Medium, 45 min)
- [ ] [20 String utilities](../practice-app/exercises/js/20-string-utils/README.md) (Easy, 30 min)
- [ ] [21 classNames and cva](../practice-app/exercises/js/21-classnames/README.md) (Easy, 20 min)
- [ ] [22 Observable store](../practice-app/exercises/js/22-observable-store/README.md) (Medium, 35 min)
- [ ] [23 Query string parse and stringify](../practice-app/exercises/js/23-query-string/README.md) (Easy, 25 min)
- [ ] [24 DOM traversal](../practice-app/exercises/js/24-dom-traversal/README.md) (Medium, 40 min)

</details>

## Where to go next

- [Setup your playground](./02-setup-your-playground.md): install Node, set up VS Code and run the practice app. Do this first.
- [How React interviews work](./03-how-react-interviews-work.md): what each round tests, and which rounds matter most for your kind of company.
- [JavaScript for React](../01-basics/01-javascript-for-react.md): the first lesson of the 8-week and 12-week plans.
- [Hooks overview and rules](../02-hooks/01-hooks-overview-and-rules.md): the first lesson of the 2-week and 4-week plans.
- [Interview rounds overview](../05-interview-rounds/README.md): how to run a mock round and how scoring works across all nine rounds.
- [Practice app README](../practice-app/README.md): every command, the folder layout and tips for your own scratch files.
- Interview-day checklist (planned): keep it for the day before the interview.
