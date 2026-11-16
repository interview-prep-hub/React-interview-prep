# Set Up Your Playground

> **Level:** Beginner   **Time:** about 20 minutes   **Read first:** [How to use this repo](./01-how-to-use-this-repo.md)

This page gets your computer ready. At the end you can run the practice exercises and their tests, create a new React app, and fix the errors beginners hit most often. Some steps have a trap. The traps are marked.

The commands and outputs here were run in November 2026 on Windows 11 (Node 24, npm 11, Vite 8, Vitest 5, React 19.3). Your numbers may differ a little. That is fine. Commands that change your system settings (installing software, changing the PowerShell policy) were not run. We checked them against the tools' own package lists and help instead.

## What you will learn
- Install Node.js, and check that `node` and `npm` work.
- Set up VS Code with the few extensions that really help, and add React Developer Tools to your browser.
- Run the practice app: the playground, the tests for one exercise, and the tests against the reference solution.
- Read a Vitest and Testing Library test in 10 lines, so tests never feel like magic.
- Create your own React app with Vite (JavaScript and TypeScript), and explain every generated file and npm script.
- Use an online sandbox, and fix the common Windows and setup errors.

Jump to: [Node.js](#1-install-nodejs), [VS Code](#2-install-vs-code-and-the-useful-extensions), [DevTools](#3-install-react-developer-tools), [practice app](#4-run-the-practice-app), [tests](#5-how-the-tests-are-written-in-10-lines), [Vite](#6-create-your-first-app-with-vite), [sandboxes](#7-online-sandboxes-for-quick-experiments), [Windows](#8-windows-notes), [troubleshooting](#9-troubleshooting).

## The big picture

| Tool | What it is for | Needed? |
| --- | --- | --- |
| Node.js (with npm) | Runs the tools around your app: dev server, test runner, build | Yes |
| A terminal | A window where you type commands | Yes |
| VS Code | The editor most React developers use | Recommended |
| A browser with React Developer Tools | Lets you look inside a running React app | Recommended |
| An online sandbox | Try an idea without installing anything | Optional |

Words you will see all the time:

- **Terminal**: a window for typing commands. On Windows use PowerShell or Git Bash. In VS Code open one with Terminal > New Terminal.
- **Node.js**: runs JavaScript outside the browser. Your React code runs in the browser, but the tools that serve, test and build it run on Node.
- **npm**: the package manager that comes with Node. It installs code other people published, and runs your project's commands.
- **Package**: a folder of code published to the npm registry (a public online store). `react` is a package.
- **Dependency**: a package your project needs. They are listed in `package.json`.
- **Script**: a named command inside `package.json`. You run it with `npm run <name>`.
- **Dev server**: a small web server on your own computer. It shows your app and refreshes it when you save.

## 1. Install Node.js

React is just JavaScript files. The tools that make working with it pleasant (dev server, test runner, build) are Node programs. So Node comes first.

### Which version?

Choose **LTS** (Long Term Support): a version line that gets fixes for years. On 2026-11-10:

| Node line | Status | Use it? |
| --- | --- | --- |
| 26 | LTS since 2026-10-28 | Yes, the best choice |
| 24 | LTS in maintenance | Yes, version 24.15 or newer |
| 22 | Older LTS in maintenance | Only version 22.22.2 or newer |
| 20 | End of life since 2026-04-30 | No |

Why those numbers? Vite 8 needs Node 20.19 or 22.12 and newer. Vitest 5 needs 22.12 and newer. jsdom 31 (the fake browser the tests use) needs 22.22.2, 24.15 or 26 and newer. The strictest tool decides.

### Install it

Pick one way:

1. **Installer.** Go to `nodejs.org`, press the LTS button, run the file, keep "Add to PATH" ticked.
2. **winget** (built into Windows 11). In PowerShell:

```text
winget install OpenJS.NodeJS.LTS
```

3. **A version manager**, if projects need different Node versions: fnm (`winget install Schniz.fnm`) or nvm-windows (`winget install CoreyButler.NVMforWindows`). On macOS and Linux use your package manager, the installer, nvm or fnm.

**Then close every terminal and VS Code window and open new ones.** An open terminal keeps the old list of programs it can find (the PATH), so it cannot see the new Node.

### Check it

```bash
node -v
npm -v
```

```text
v24.16.0
11.17.0
```

**What happens, step by step:**
1. `node -v` asks Node for its version. `v24.16.0` means major version 24.
2. `npm -v` asks npm for its version. npm ships inside the Node installer, so you never install it separately.
3. If both print a number, you are done. Compare the first number with the table above.

**Common mistake:** `The term 'node' is not recognized as the name of a cmdlet`. The terminal was opened before the install, or Node is not on the PATH. Open a new terminal. If it still fails, run the installer again with "Add to PATH" ticked.

### Two commands you will see everywhere

- `npx <package>` downloads a package, runs it once, and moves on.
- `npm create vite@latest` is a shortcut for "run the package named `create-vite`". It asks a few questions and writes a starter project. Section 6 uses it.

## 2. Install VS Code and the useful extensions

Download VS Code from `code.visualstudio.com`, or run `winget install Microsoft.VisualStudioCode`.

**Open the right folder.** Use File > Open Folder and choose the folder that contains `package.json` (for the practice app, `practice-app`). Or in a terminal:

```bash
cd practice-app
code .
```

The dot means "the current folder". If you open a parent folder instead, the extensions cannot find your config files and everything looks wrong (see section 9).

### Extensions

Open the Extensions panel, search the name and press Install. From a terminal you can run `code --install-extension <id>`.

| Extension | Id | What it does | Needed? |
| --- | --- | --- | --- |
| Prettier | `esbenp.prettier-vscode` | Fixes spacing and quotes when you save | Recommended |
| ESLint | `dbaeumer.vscode-eslint` | Underlines likely bugs while you type, in projects that use ESLint | Recommended |
| Oxc | `oxc.oxc-vscode` | The same for Oxlint, the linter the Vite template uses by default | Recommended |
| ES7+ React/Redux/React-Native snippets | `dsznajder.es7-react-js-snippets` | Typing a short word such as `rfce` and pressing Tab writes a component skeleton | Optional |
| Error Lens | `usernamehw.errorlens` | Shows the error text at the end of the line, not only on hover | Optional |
| Vitest | `vitest.explorer` | Run and debug tests with a click | Optional |

A **linter** reads your code without running it and warns about likely mistakes, such as a hook called inside an `if`. Your project uses either ESLint or Oxlint (section 6.2 shows how to choose), so you need one extension or the other. If you are not sure, install both. An extension does nothing when the project has no matching config.

Some snippets add `import React from 'react'` at the top. Modern React does not need it. Delete it.

### One setting worth turning on

Press Ctrl+Shift+P, run "Open User Settings (JSON)", and add:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

Now every save formats the file. You stop thinking about spacing, and your diffs stay small.

Useful shortcuts (Cmd instead of Ctrl on a Mac): Ctrl+P opens a file by name, Ctrl+Shift+P opens the command palette, Ctrl+Shift+V previews the Markdown file you are editing (Ctrl+K then V opens the preview beside it), F12 jumps to a definition.

## 3. Install React Developer Tools

React Developer Tools is a free extension for Chrome, Edge and Firefox, made by the React team. Search "React Developer Tools" in your browser's extension store and add it.

Run any React app and open the browser DevTools (F12). Two new tabs appear:

- **Components**: the tree of your components. Click one to see its props, state and hooks. You can edit a value and watch the screen change. A setting here can highlight every component that re-renders, the fastest way to see why a screen feels slow.
- **Profiler**: press record, use the app, press stop. It shows which components rendered, how long each took and why.

Version 8 (September 2026) turned the Suspense tab on by default and removed the old Timeline tab. If a tutorial says "use the Timeline tab", use the browser's Performance panel instead. It has React tracks.

Safari cannot install the extension. Run the standalone app with `npx react-devtools`, add `<script src="http://localhost:8097"></script>` to your app's `index.html` while developing, and remove it before you deploy.

You will use these tabs a lot in [Performance optimization](../04-advanced/02-performance-optimization.md).

## 4. Run the practice app

The practice app is a small Vite and React project in `practice-app`. It has 33 React exercises and 24 JavaScript exercises, each with a README and automatic tests. You write the code. The tests tell you if it works. The [practice app README](../practice-app/README.md) lists the commands too.

Every command in this section runs **inside the `practice-app` folder**.

### 4.1 Install the dependencies (once)

```bash
cd practice-app
npm install
```

```text
added 99 packages, and audited 100 packages in 1m

21 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

The time depends on your internet. The first install is the slowest.

**What happens, step by step:**
1. npm reads `package.json` (what the project needs) and `package-lock.json` (the exact versions that were tested together).
2. It downloads those packages from the npm registry into a new folder, `node_modules`.
3. It prints a summary. You never edit `node_modules` and never commit it. It can be recreated at any time.

What got installed: `react` and `react-dom` (the library and the code that puts it in the page), `vite` and its React plugin (dev server and build), `vitest` and `jsdom` (the test runner and a fake browser page inside Node), the three Testing Library packages (render, click and check), and `cross-env` (sets an environment variable the same way on every system).

**Common mistake:** running npm in the wrong folder.

```text
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

This means "no `package.json` in this folder". The book's root folder has none. Run `cd practice-app` first.

### 4.2 The scripts

The `scripts` part of `practice-app/package.json` is a menu:

| You type | It runs | Use it to |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the playground in your browser |
| `npm test -- <path>` | `vitest run <path>` | Run tests once, for the path you give |
| `npm run test:watch -- <path>` | `vitest <path>` | Re-run tests every time you save |
| `npm run test:solutions -- <path>` | `cross-env TARGET=solutions vitest run <path>` | Run the same tests against the reference solution |
| `npm run build` | `vite build` | Build the playground into `dist/` (rarely needed) |

Only `test`, `start`, `stop` and `restart` can be typed without `run`. Every other script needs `npm run`.

### 4.3 Start the playground

```bash
npm run dev
```

```text
  VITE v8.3.7  ready in 1426 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open the `Local` address in your browser. Press Ctrl+C in the terminal to stop the server.

**What happens, step by step:**
1. `npm run dev` finds the `dev` script in `package.json`. It is just `vite`.
2. Vite starts a web server on your computer. A **port** is a numbered door, and each server needs its own. 5173 is Vite's default.
3. Vite serves your files as the browser asks, turning JSX into plain JavaScript on the way.
4. When you save a file, React swaps only the changed component. No full reload.
5. `Network: use --host to expose` means only your own computer can open the page. `--host` lets a phone on the same Wi-Fi open it. Use it only on a network you trust.

#### How the sidebar works

The page is a small React app in `src/main.jsx`.

- The sidebar lists all 33 React exercises, named after the folders under `exercises/react/`.
- Click a name and the main area shows that exercise's `App.jsx`. At first it is the unfinished starter, on purpose.
- The **Show** drop-down switches between **my starter code** (the file in `exercises/`) and **reference solution** (the file in `solutions/`). Use the solution to see how the finished screen behaves, not to copy.
- The address bar changes to something like `?ex=05-tabs&mode=solution`, so a refresh keeps your place.
- JavaScript exercises (`exercises/js/`) have no screen, so they are not listed. You check them with tests only.

### 4.4 Run the tests for one exercise

```bash
npm test -- exercises/react/01-counter
```

```text
 RUN  v5.1.0 D:/path/to/React-interview-prep/practice-app

 ❯ exercises/react/01-counter/App.test.jsx (5 tests | 5 failed)
   ❯ 01 Counter with step and reset (5)
     × starts with count 0 and step 1
     × increments by the step
     × uses a custom step for both buttons
     × reset restores count and step
     × treats an empty step as 1 and does not crash

 FAIL  exercises/react/01-counter/App.test.jsx > 01 Counter with step and reset > starts with count 0 and step 1
TestingLibraryElementError: Unable to find a label with the text of: /step/i
  (the HTML of the page is printed here)
 ❯ exercises/react/01-counter/App.test.jsx:9:19

 Test Files  1 failed (1)
      Tests  5 failed (5)
```

**Five red tests is the correct result for an exercise you have not started.** Starters fail on purpose. Your job is to turn them green.

**What happens, step by step:**
1. `--` means "stop reading options, pass the rest to the script". Without it npm may keep your options for itself.
2. Vitest gets `exercises/react/01-counter` and runs every test file whose path contains that text.
3. Each test renders the starter `App.jsx` in the fake browser and asks questions, such as "is there an input labelled Step?".
4. The starter has no such input, so the test fails and prints the page HTML it saw.
5. Read a failure from the top: test name, error message, printed page, then the failing line of the test (`App.test.jsx:9:19`).

**Common mistake:** forgetting the `--` when you add an option.

```bash
npm test --reporter=dot exercises/js/01-debounce
```

npm prints `Unknown cli config "--reporter"` and ignores the option. Fix:

```bash
npm test -- --reporter=dot exercises/js/01-debounce
```

### 4.5 Run the same tests against the reference solution

```bash
npm run test:solutions -- exercises/react/01-counter
```

```text
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

The path still says `exercises/...`. The test file is the same. Only the code it imports changes.

**What happens, step by step:**
1. The script sets a variable `TARGET=solutions` (with `cross-env`, so it works in PowerShell, Command Prompt and Bash) and starts Vitest.
2. `vite.config.js` has a small plugin. When `TARGET` is `solutions`, and a test in `exercises/` imports a file such as `./App.jsx`, the plugin uses the file with the same path under `solutions/`, if it exists. Test files are never swapped.
3. So one test file checks both your code and the solution. If the solution passes and yours fails, the difference is in your code, not in the test.

### 4.6 Narrow a run down

The path is a filter on file names (a substring match).

```bash
npm test -- exercises/react/01-counter
npm test -- counter
npm test -- exercises/react/1
npm test -- exercises/react/01-counter -t "empty step"
npm run test:watch -- exercises/react/01-counter
```

- `counter` matches every test path containing "counter": `01-counter` and `09-character-counter`.
- `exercises/react/1` matches `10` to `19`. A short filter can match more than you expect. Use the full folder name for one exercise.
- `-t "empty step"` runs only tests whose name contains those words. Vitest matches the whole chain (the `describe` title, then ` > `, then the test title), so `-t "reset"` would run all five tests of exercise 01. Use words from the test title.
- `test:watch` re-runs the tests every time you save. It is the best mode while you code. Stop it with Ctrl+C.
- `npm test` with no path runs everything, including `scratch/`. Every starter fails, so that is rarely what you want.

### 4.7 Open an exercise README

Each exercise folder has a `README.md` with the task, requirements, hints and interview follow-ups. The playground does not show it. In VS Code click it in the Explorer and press Ctrl+Shift+V. From a terminal run `code exercises/react/01-counter/README.md`. On GitHub the README shows under the file list.

Read [the README of exercise 01](../practice-app/exercises/react/01-counter/README.md) now. It shows the format of all the others. The shape of one exercise:

```text
exercises/react/01-counter/
  README.md        the task, requirements and hints
  App.jsx          the starter file: YOU edit this one
  App.test.jsx     the tests: do not edit
solutions/react/01-counter/
  App.jsx          the reference solution: look after you tried
```

JavaScript exercises use `exercises/js/NN-name/index.js` (yours), `index.test.js` (the test) and `solutions/js/NN-name/index.js`.

## 5. How the tests are written in 10 lines

You do not have to write tests to use the practice app, but you will read them often. Here is a tiny component and the ten lines that test it. We ran this exact pair in the practice app and the test passed.

```jsx
// Counter.jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p data-testid="count">{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}
```

```jsx
// Counter.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Counter from './Counter.jsx'

it('adds one when Increment is clicked', async () => {
  const user = userEvent.setup()
  render(<Counter />)
  await user.click(screen.getByRole('button', { name: /increment/i }))
  expect(screen.getByTestId('count')).toHaveTextContent('1')
})
```

**What happens, step by step:**
1. The imports bring the tools. `render` draws a component into the fake browser. `screen` finds things on that page. `userEvent` clicks and types like a person.
2. `it('...', async () => { ... })` defines one test. The text is the name in the results. `it`, `describe` and `expect` need no import because the practice app sets `globals: true` in `vite.config.js`.
3. `userEvent.setup()` creates a simulated user. `render(<Counter />)` shows the component. This is the **arrange** step.
4. `screen.getByRole('button', { name: /increment/i })` finds a button by what it is (its role) and what it is called (its accessible name). `await user.click(...)` is the **act** step. It needs `await` because a click takes a moment to finish.
5. `expect(...).toHaveTextContent('1')` is the **assert** step. If the count shows something else, the test fails with a clear message. This matcher comes from `@testing-library/jest-dom`.

Why look things up by role and label, not by CSS class? Because that is how a user, and a screen reader, finds them. `getByTestId` is the last resort, used here for a plain `<p>` that has no role.

[Testing React](../04-advanced/08-testing-react.md) covers mocks, fake timers and network mocking in depth.

## 6. Create your first app with Vite

### 6.1 Why Vite

Create React App (CRA) was the standard tool for years. The React team deprecated it for new apps on 2025-02-14 because it had no active maintainers. Old tutorials still say `npx create-react-app`. Skip them.

Today react.dev says: for a real product that needs routing, data loading and server rendering, start with a framework such as Next.js or React Router. For learning, for client-only apps, and when you want to see every piece, use **Vite**, a dev server and build tool (Vite 8 is built on a fast Rust bundler named Rolldown). The practice app uses it too.

### 6.2 Create the project

Pick a folder outside the book repo (for example `D:/projects`), then run one of these:

```bash
npm create vite@latest my-app -- --template react
npm create vite@latest my-app-ts -- --template react-ts
```

```text
create-vite v9.3.4

◇  Scaffolding project in C:\Users\you\projects\my-app...
└  Done. Now run:

  cd my-app
  npm install
  npm run dev
```

The first makes a JavaScript project, the second a TypeScript one. Without `--template` the tool asks questions instead (project name, framework, variant, linter). The wording changes between versions, so the flags are the stable way.

**What happens, step by step:**
1. npm downloads the newest `create-vite` package and runs it.
2. Everything after the lone `--` goes to `create-vite`, not to npm. Forget the `--` and the template flag may be lost.
3. It writes a folder `my-app` with the starter files. It does not install anything yet.
4. You run the three printed commands. `npm run dev` prints a `Local` address like in section 4.3. Open it to see the Vite and React page with a counter button.

`react-compiler` and `react-compiler-ts` add the React Compiler (automatic memoization), but their README warns that it slows the dev server and the build. Start with plain `react` or `react-ts`. Old tutorials mention a `react-swc` template. It no longer exists.

The React templates use the **Oxlint** linter by default. Add `--eslint` to the command to get ESLint instead (you then get an `eslint.config.js`).

### 6.3 Tour of the generated files

The JavaScript project right after `npm create`:

```text
my-app/
  index.html          the one HTML page
  package.json        the project's identity card: scripts and dependencies
  vite.config.js      Vite's settings
  .oxlintrc.json      linter settings
  .gitignore          files Git must not save
  README.md           the template's own notes
  public/             files copied as they are (favicon.svg, icons.svg)
  src/
    main.jsx          the start of your app
    App.jsx           your first component (you edit this)
    App.css           styles for App
    index.css         global styles
    assets/           pictures that your code imports
```

After `npm install` two more things appear: `node_modules/` and `package-lock.json`.

**`index.html`** is the only page of a single page app. It holds an empty `<div id="root"></div>` and the line `<script type="module" src="/src/main.jsx"></script>`. Vite starts here and follows that line into your code.

**`src/main.jsx`** starts React:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**What happens, step by step:**
1. The browser loads `index.html` and finds the empty `root` div.
2. `document.getElementById('root')` grabs that div. `createRoot(...)` tells React "you own everything inside it".
3. `.render(<App />)` draws your root component there. From now on React keeps the screen in sync with your state.
4. `import './index.css'` is how CSS gets into the page. Vite handles it.
5. `<StrictMode>` adds extra checks, in development only.

**Surprise to expect.** With StrictMode, React renders every component twice and runs effects as setup, cleanup, setup on mount, to expose code that is not pure. We logged a small component that has one effect:

```text
With StrictMode:     render, render, effect setup, effect cleanup, effect setup
Without StrictMode:  render, effect setup
```

So a `console.log` in a component prints twice in development. That is a feature, not a bug, and the production build does not do it. [How React renders](../04-advanced/01-how-react-renders.md) explains why.

The other files:

- **`src/App.jsx`**: a logo page with a counter. You replace it in section 6.5.
- **`App.css`, `index.css`**: plain CSS. Delete or rewrite freely.
- **`public/`**: files copied unchanged to the site root, for things with a fixed URL (`/favicon.svg`).
- **`src/assets/`**: pictures you `import` in code. The production build adds a fingerprint to their names (for example `react-CHdo91hT.svg`), so browsers fetch the new file when it changes.
- **`vite.config.js`**: `plugins: [react()]`. That one plugin teaches Vite JSX and refresh without reload.
- **`.oxlintrc.json`**: turns on the rule that catches broken [Rules of Hooks](../02-hooks/01-hooks-overview-and-rules.md), and one that warns when a file mixes components with other exports.
- **`.gitignore`**: what Git skips: `node_modules`, `dist` (the build output), logs and `*.local` files.
- **`README.md`**: the template's own text. Replace it with notes about your project.

[What is React](../01-basics/02-what-is-react.md) walks through the same files in more depth.

### 6.4 The package.json and the npm scripts

```json
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.3.1",
    "react-dom": "^19.3.1"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "oxlint": "^1.90.0",
    "vite": "^8.3.6"
  }
}
```

- `private: true` stops you publishing the project to npm by accident.
- `"type": "module"` means `.js` files use `import` and `export`, not the old `require`.
- `dependencies` are what the running app needs. `devDependencies` are tools for building, linting and testing. The `^` in `^19.3.1` means "19.3.1 or any newer 19.x".
- `package-lock.json` freezes the exact installed versions. Commit it.

| Script | Runs | What it does |
| --- | --- | --- |
| `npm run dev` | `vite` | Starts the dev server at `http://localhost:5173` |
| `npm run build` | `vite build` | Makes the optimized production files in `dist/` |
| `npm run preview` | `vite preview` | Serves `dist/` at `http://localhost:4173`, so you can test what you would deploy |
| `npm run lint` | `oxlint` | Checks the code. No output means no problems |

The build output of this template:

```text
vite v8.3.7 building client environment for production...
✓ 20 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/react-CHdo91hT.svg    4.12 kB │ gzip:  2.06 kB
dist/assets/vite-BF8QNONU.svg     8.70 kB │ gzip:  1.60 kB
dist/assets/hero-CLDdwZDr.png    13.05 kB
dist/assets/index-DykytF2W.css    4.10 kB │ gzip:  1.47 kB
dist/assets/index-DSXtc1GT.js   222.44 kB │ gzip: 69.28 kB

✓ built in 392ms
```

**What happens, step by step:**
1. `vite build` follows `index.html` into your code, bundles every file the app uses into a few files, shrinks them (minifies), and writes them to `dist/`.
2. The big `index-....js` holds React itself plus your code. `gzip` is its size on the wire. The letters in the names change when the content changes, so users never get a stale cached file.
3. `dist/` is plain static files that any static host can serve. `npm run preview` opens them locally. **Test `build` and `preview` before you ship**, because development and production differ (the StrictMode checks run only in development).

### 6.5 Your first edit

Replace the whole of `src/App.jsx` with this:

```jsx
import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main>
      <h1>Hello, React</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </main>
  )
}
```

Run `npm run dev`. The button says "Clicked 0 times", then "Clicked 2 times" after two clicks (we checked this component with Testing Library).

**What happens, step by step:**
1. Save the file. Vite tells the browser, and React swaps only the `App` component. No full reload.
2. Click the button a few times, then change `Hello, React` to your name and save. The text changes and the count stays. This quick loop is called Fast Refresh. It works best when a file exports only components.
3. If you break the code (delete a closing tag, say), the browser shows an error overlay with the file and line. Fix the file and it goes away.

### 6.6 The TypeScript variant

`react-ts` creates the same files with `.tsx` endings, plus three config files:

```text
tsconfig.json         lists the two configs below
tsconfig.app.json     TypeScript settings for src/ (runs in the browser)
tsconfig.node.json    TypeScript settings for vite.config.ts (runs in Node)
```

Other differences:

- `main.tsx` has `document.getElementById('root')!`. The `!` tells TypeScript "I promise this is not null".
- `devDependencies` gain `typescript` and `@types/node`. (The JavaScript template already lists `@types/react` and `@types/react-dom`. Those packages teach TypeScript, and your editor, what React's functions look like.)
- The `build` script becomes `tsc -b && vite build`: **first** check the types, **then** bundle. If the types are wrong, the build stops.

Vite itself does no type checking. It only removes the types. The checking comes from `tsc`, from `npm run build` and from your editor. So a type error does not stop `npm run dev`, but it does stop `npm run build`. Learn plain React first. [TypeScript with React](../03-intermediate/08-typescript-with-react.md) comes later.

### 6.7 Optional: add tests to your own app

The practice app has this set up already. To get the same in your new app, run in the `my-app` folder:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm pkg set scripts.test="vitest run"
```

Replace `vite.config.js` with:

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  },
})
```

Create `src/setupTests.js` with one line:

```js
import '@testing-library/jest-dom/vitest'
```

Put `Counter.jsx` and `Counter.test.jsx` from section 5 in `src/` and run `npm test`. We did exactly this in a fresh Vite 8 project and the test passed.

Why each piece: `-D` saves the packages as `devDependencies`. `environment: 'jsdom'` gives each test a fake page (plain Node has no `document`). `globals: true` provides `it`, `describe` and `expect` without imports. The setup file runs before every test file, and its import adds matchers such as `toHaveTextContent`.

## 7. Online sandboxes for quick experiments

A sandbox is a code editor with a live preview in a browser tab. You install nothing. Use one to try a small idea or to show a bug to someone.

- **StackBlitz** (`stackblitz.com`) runs Node inside your browser tab. Typing `vite.new/react` opens the official Vite React template there.
- **CodeSandbox** (`codesandbox.io`). Typing `react.new` opens a fresh React sandbox.
- **CodePen** (`codepen.io`) suits a single HTML, CSS and JS experiment.
- **react.dev**: every example in the official docs is editable in place.

Use a sandbox for one hook or one idea, or to share a minimal example. Use your own machine for anything you keep, such as the exercises and tests.

**Interview tip:** machine coding rounds often run in an online editor such as CodeSandbox, StackBlitz, CodePen or CoderPad, or on your own laptop with screen sharing. Ask which one. Then do one practice session in that exact tool: find the console, the preview, how to add a package and how to share the link, so none of it costs you time in the real round. See [How React interviews work](./03-how-react-interviews-work.md) and the [machine coding round](../05-interview-rounds/round-4-machine-coding/README.md).

Limits: sandboxes need internet and are slower than your machine, and their free plans change, so check the site. Never paste a real API key into a public sandbox.

## 8. Windows notes

### 8.1 PowerShell, Command Prompt, Git Bash, WSL

Every command in this book works in **PowerShell 7** and in **Git Bash**. Differences you will hit:

| You want | Bash and PowerShell 7 | Windows PowerShell 5.1 (the old blue one) |
| --- | --- | --- |
| Run the second command only if the first works | `cmd1 && cmd2` | Not allowed: `The token '&&' is not a valid statement separator in this version.` Use two lines |
| Set a variable for one command | Bash: `TARGET=solutions vitest run`. PowerShell: first set `$env:TARGET = 'solutions'` | Same as PowerShell 7. `TARGET=solutions node -v` fails with `The term 'TARGET=solutions' is not recognized` |
| Delete `node_modules` | Bash: `rm -rf node_modules`. PowerShell: `Remove-Item -Recurse -Force node_modules` | Same as PowerShell |

Check your PowerShell with `$PSVersionTable.PSVersion`. A major version of 5 is the old one. Install the new one with `winget install Microsoft.PowerShell`. The variable problem is why the practice app uses `cross-env`. Do the same in your own scripts.

Write paths with forward slashes (`exercises/react/01-counter`). They work in every shell and config file. Backslashes cause trouble in Bash and in JSON.

With **WSL** (Linux inside Windows), keep projects in the Linux file system (your Linux home folder), not under `/mnt/c`. File access across the two systems is slow.

### 8.2 The `npm.ps1 cannot be loaded` error

On a fresh PC, typing `npm` in Windows PowerShell can print this:

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

**Why:** PowerShell has an **execution policy**, a safety switch that decides which script files may run. Often the default blocks every `.ps1` file. Node installs `npm` as both `npm.cmd` and `npm.ps1`, and PowerShell prefers the blocked `.ps1`. The problem is the switch, not Node and not your project.

**Fixes, safest first:**

1. **Change nothing.** Call `npm.cmd run dev` instead of `npm run dev`, or use Command Prompt or Git Bash. We checked that `npm.cmd -v` works while plain `npm -v` is blocked.
2. **Allow it for this window only.** It ends when you close the window:

```text
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

3. **Allow it for your own user.** No administrator needed. Answer `Y` when asked:

```text
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
Get-ExecutionPolicy -List
```

`RemoteSigned` means: scripts created on your PC run, and scripts downloaded from the internet must be signed. `npm.ps1` was written by the Node installer on your PC, so it runs. The second line lists the policy of every scope so you can check the result.

**Do not** paste `Set-ExecutionPolicy Unrestricted` or `Bypass` from a random post, and do not change the `LocalMachine` scope as administrator. Those lower the protection for every script and every user on the PC, and npm does not need that.

### 8.3 Line endings

Windows ends a line with two invisible characters (CRLF). macOS and Linux use one (LF). Git for Windows often converts for you (`git config --get core.autocrlf` prints `true` on many PCs), and you may see `warning: ... LF will be replaced by CRLF the next time Git touches it`. That warning is harmless.

It becomes a real problem when a shell script with CRLF runs on Linux (Docker, a CI server), or when Prettier, which defaults to LF, complains about every line. To prevent it:

- The VS Code status bar (bottom right) shows `CRLF` or `LF`. Click it to switch the current file.
- Add `"files.eol": "\n"` to your VS Code settings, so new files use LF.
- In your own projects, add a `.gitattributes` file with this line:

```text
* text=auto eol=lf
```

### 8.4 Long paths and other Windows habits

- **Long paths.** Windows has an old 260-character limit for a full file path, and `node_modules` nests deeply. Keep projects near the top of a drive (`D:/projects/my-app`). If you still see "path too long", run `git config --global core.longpaths true`. As a last step, an administrator can set the registry value `LongPathsEnabled` to `1` under `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem` (it was already `1` on the Windows 11 PC we tested), then restart your programs. That is a system setting, so only do it if you understand it.
- **Keep projects out of folders that OneDrive syncs** (Desktop and Documents often are). `node_modules` holds tens of thousands of small files, and syncing them slows everything and can lock files.
- **Match the exact case of file names.** Windows does not care, Linux servers do. `import App from './app.jsx'` can work on your PC and fail in the build on a server.

## 9. Troubleshooting

Find your message in the first column. Most of these are real messages we produced on purpose.

| What you see | Why | Fix |
| --- | --- | --- |
| `The term 'node' is not recognized as the name of a cmdlet` | Terminal opened before the install, or Node is not on the PATH | Open a new terminal. Still failing: run the installer again with "Add to PATH" ticked |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | PowerShell's execution policy blocks `.ps1` files | Section 8.2: use `npm.cmd`, or allow `RemoteSigned` for your user |
| `Could not read package.json: Error: ENOENT` | Wrong folder | `cd` into the folder that contains `package.json` |
| `Port 5173 is in use, trying another one...` | Another dev server (maybe an old terminal) has the port. Vite moves to 5174 | Read the `Local:` line for the real address. To free the port, press Ctrl+C in the old terminal, or run `netstat -ano`, find `:5173`, then `taskkill /PID <number> /F`. Or pick a port: `npm run dev -- --port 3000` |
| `Failed to resolve import "xyz" from "src/main.jsx". Does the file exist?` (in a build: `Could not resolve './Helo.jsx'` or `failed to resolve import "canvas-confetti"`) | A typo in the path, wrong upper or lower case, or a package that is not installed | Fix the path. For a package: `npm install <name>`. After cloning a project, run `npm install` |
| `Unexpected JSX expression` and `JSX syntax is disabled`, pointing at a `.js` file | Files with JSX must end in `.jsx` or `.tsx` | Rename the file and its import |
| `ReferenceError: document is not defined` in a test | The test ran in plain Node, which has no page | Set `environment: 'jsdom'` in the `test` part of `vite.config.js` |
| `MISSING DEPENDENCY Cannot find dependency 'jsdom'`, then `Cannot find package 'jsdom'` | The config asks for jsdom but it is not installed | `npm install -D jsdom` (in the practice app, run `npm install`) |
| `ReferenceError: it is not defined` (or `describe`, `expect`) | Vitest provides these names only when `globals` is on | Set `globals: true`, or `import { describe, it, expect } from 'vitest'` |
| `Unable to find an accessible element with the role "button"` in a starter exercise | Not a setup problem. The test says the feature is not built yet | Read the exercise README and build it. Red starters are normal |
| `Failed to start forks worker` with `Timeout waiting for worker to respond` | The PC was too busy to start the test workers. We saw it only while many programs ran at once | Run the command again. Close heavy programs, and run one exercise at a time |
| Red squiggles everywhere, or `Cannot find module 'react'` | Wrong folder opened, or `npm install` has not run | Open the folder with `package.json`, run `npm install`, then Ctrl+Shift+P and "Developer: Reload Window" |
| Squiggles that look wrong or never go away | A stale language server | Ctrl+Shift+P, then "ESLint: Restart ESLint Server". For TypeScript: "TypeScript: Select TypeScript Version", then "Use Workspace Version" |
| Strange errors after a pull, a Node upgrade or a failed install | A half-broken `node_modules` | `npm ci` deletes `node_modules` and installs exactly what `package-lock.json` says |

Hover over a squiggle to read it. A lint message ends with a rule name such as `react-hooks/rules-of-hooks`, and a TypeScript message starts with `TS` and a number. Both are easy to search.

## Is everything working? A checklist

- [ ] `node -v` prints a version allowed by the table in section 1, and `npm -v` prints a version.
- [ ] VS Code opens the `practice-app` folder, and Prettier plus a linter extension are installed.
- [ ] The React Developer Tools tabs appear on the playground page.
- [ ] `npm install` finished in `practice-app`, and `npm run dev` shows a sidebar with 33 exercises.
- [ ] `npm test -- exercises/react/01-counter` shows 5 failed. (Red is correct.)
- [ ] `npm run test:solutions -- exercises/react/01-counter` shows 5 passed.
- [ ] `npm create vite@latest my-app -- --template react` made a project that runs with `npm run dev`.

## Quick self-check

Answer out loud before you open each answer, as you would in an interview.

1. **(Easy)** How would you start a new React app today, and why not Create React App?

<details>
<summary>Show answer</summary>

For a real product that needs routing, data loading and server rendering, react.dev recommends a framework such as Next.js or React Router. For a client-only app, a learning project, or when you want to choose each piece, use Vite: `npm create vite@latest my-app -- --template react`. Create React App was deprecated for new apps on 2025-02-14 because it had no active maintainers. It still runs, but new projects should not use it.

</details>

2. **(Easy)** What is the difference between `dependencies` and `devDependencies`, and what does the `^` in a version mean?

<details>
<summary>Show answer</summary>

`dependencies` are packages the running app needs, such as `react` and `react-dom`. `devDependencies` are tools used only to build, lint and test, such as `vite` and `vitest`. The `^` in `^19.3.1` allows any newer version with the same major number (19.x.x). `package-lock.json` pins the exact installed version, so every machine gets the same code.

</details>

3. **(Easy)** What do `npm run dev`, `npm run build` and `npm run preview` do, and why run the last two before shipping?

<details>
<summary>Show answer</summary>

`dev` starts the dev server, which serves your source files and refreshes the browser when you save. `build` bundles and minifies the app into static files in `dist/`. `preview` serves `dist/` locally so you can try the real production output. Development and production differ (StrictMode checks and extra warnings run only in development, and the bundle is different), so a bug can appear only in the build. Find it on your machine, not in front of users.

</details>

4. **(Medium)** Why does a `console.log` in my component print twice in development?

<details>
<summary>Show answer</summary>

The Vite template wraps the app in `<StrictMode>` in `main.jsx`. In development, StrictMode renders each component twice and, on mount, runs effect setup, cleanup and setup again. This reveals code that is not pure and effects that forget to clean up. Production builds do not do this. The fix is to make the component pure and add cleanup, not to remove StrictMode. For a component with one effect the order is: render, render, effect setup, effect cleanup, effect setup.

</details>

5. **(Medium)** Is it safe to keep an API key in `VITE_API_KEY` in a `.env` file?

<details>
<summary>Show answer</summary>

No. Vite exposes only variables that start with `VITE_` to browser code, and it copies their values into the built JavaScript. Anyone can open the file and read them, so they are public. A secret must live on a server. Your frontend calls your server, and the server calls the other service with the key.

</details>

6. **(Medium)** In a few sentences, how is Vite's dev server different from the old Create React App and webpack setup?

<details>
<summary>Show answer</summary>

The old setup bundled the whole app before it could show anything, so start-up and updates got slower as the app grew. Vite's dev server does not bundle in development. The browser asks for modules, and Vite transforms each file when it is requested, so start-up stays fast and a save replaces only the changed module. For production Vite does bundle (Vite 8 uses a Rust bundler called Rolldown) and writes optimized files to `dist/`.

</details>

7. **(Medium)** Task: create a Vite React app, replace `App.jsx` with the counter from section 6.5, break an import on purpose, and read the error. Then build and find the size of the biggest JavaScript file.

<details>
<summary>Show answer</summary>

Run `npm create vite@latest my-app -- --template react`, then `cd my-app`, `npm install`, `npm run dev`. Change the import in `main.jsx` to `./Apx.jsx`. The terminal and the browser overlay show `Failed to resolve import "./Apx.jsx" from "src/main.jsx". Does the file exist?`. It names the file with the problem and the import that failed. Fix the spelling and the overlay disappears. Then `npm run build`: for the untouched template the biggest file is `index-....js`, about 222 kB (about 69 kB gzipped). Yours will be a little different.

</details>

## Recap
- Install the newest Node LTS (26, or 24.15 and newer). Check with `node -v` and `npm -v`, and open a new terminal after installing.
- VS Code with Prettier and a linter extension (ESLint or Oxc) is enough. Open the folder that contains `package.json`.
- React Developer Tools adds the Components and Profiler tabs to your browser DevTools.
- Practice app: `npm install` once, `npm run dev` for the playground, `npm test -- <path>` for your code, `npm run test:solutions -- <path>` for the reference solution. The `--` passes the path to Vitest.
- Red tests on a fresh starter are correct. Read a failure from the test name down to the printed page.
- `npm create vite@latest my-app -- --template react` (or `react-ts`) makes a new app. `dev` serves, `build` makes `dist/`, `preview` serves `dist/`, `lint` checks the code. Create React App is deprecated.
- On Windows: use PowerShell 7 or Git Bash. Fix the `npm.ps1` error with `npm.cmd` or `RemoteSigned` for your user, never `Unrestricted`. Keep projects in short, non-synced paths and match file name case exactly.
- A sandbox (`vite.new/react`, `react.new`) is the fastest way to test one idea. Practise in the tool your interviewer will use.

## Where to go next
- Read [How React interviews work](./03-how-react-interviews-work.md) to see the rounds you are preparing for.
- Brush up the language with [JavaScript for React](../01-basics/01-javascript-for-react.md), then continue with [What is React](../01-basics/02-what-is-react.md).
- Do your first exercise: [01 Counter](../practice-app/exercises/react/01-counter/README.md). The [practice app README](../practice-app/README.md) lists all commands.
- Later, read Tooling: Vite, ESLint and the build (planned) and [Testing React](../04-advanced/08-testing-react.md).
- When you are ready for a timed exercise, see the [machine coding round](../05-interview-rounds/round-4-machine-coding/README.md).
