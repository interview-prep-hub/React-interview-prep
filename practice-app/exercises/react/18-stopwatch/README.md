# 18 - Stopwatch with laps

**Level:** Medium | **Time:** 30 minutes | **Topics:** `useRef`, `setInterval`, effect cleanup, time formatting

## The task

Build a stopwatch. It shows minutes, seconds and hundredths of a second (centiseconds), and has buttons to start, stop, take lap times and reset.

The important part is how you measure time. A timer callback is not a reliable clock: it can run late, and browsers slow it down in background tabs. So the display must always be worked out from timestamps (`Date.now()`), never by counting ticks.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. The component is the default export of `App.jsx` and takes no props.
2. **Display.** Show the time inside an element with `data-testid="display"`. The text is exactly `mm:ss.cc`:
   - `mm` is the minutes, at least two digits. It keeps growing past 99 (so `100:05.40` is correct, do not wrap or cap it).
   - `ss` is the seconds, always two digits, from `00` to `59`.
   - `cc` is the centiseconds, always two digits, from `00` to `99`. **Cut the extra digits off, do not round.** For example 1.239 seconds is `00:01.23`, and 83.45 seconds is `01:23.45`.
   - Before the first start it shows `00:00.00`, and it does not run by itself.
3. **Start and Stop.** One button toggles between the two. While the watch is stopped its accessible name is **Start**. While it is running its name is **Stop** (there is never a button named Start and a button named Stop at the same time).
   - **Start** makes the display count up from the current value. The first time that is `00:00.00`. After a Stop it continues from the time the watch had when it was stopped, so time is accumulated across several starts and stops.
   - **Stop** freezes the display at the time of the click and keeps it there. Time that passes while the watch is stopped is not counted. The click must read the clock itself: even if the last tick was late (see requirement 6), the display shows the exact time of the click, and the next Start continues from that exact time.
4. **Lap.** A button named **Lap**.
   - It is disabled whenever the watch is not running (before the first start, and after a Stop or Reset).
   - Clicking it adds one row to the end of the lap list. The row shows the total time on the watch at that moment (not the time since the previous lap). The watch keeps running and the display is not affected.
   - Laps are shown in an ordered list: an `<ol>` with one `<li>` per lap, oldest first, and no other list elements on the page. The text of a row is `Lap`, the lap number (starting at 1), and the time, separated by a space, for example `Lap 1 00:01.23` then `Lap 2 00:03.50`. The tests collapse repeated spaces, so one or two spaces both work.
   - Laps stay when you Stop and Start again. The numbering continues (Lap 3 comes after Lap 2).
   - Pressing Lap twice in the same instant gives two rows, even though both show the same time.
5. **Reset.** A button named **Reset**. It is always enabled. In one click it stops the watch if it is running, sets the display to `00:00.00`, removes all laps, and makes the main button say **Start** again. The next Lap after a reset is Lap 1.
6. **Timestamps, not ticks.** Work out the elapsed time from `Date.now()` (the current time in milliseconds), not from `performance.now()`: the tests only move `Date.now()`. Do not add 10 to a counter on every tick. The tests move `Date.now()` forward without firing any timer, then let one tick run (or click Stop), to simulate a throttled background tab. The display must jump to the true elapsed time.
7. **Update rate.** Refresh the display with `setInterval`, every 10 ms or faster. The tests move the clock in 10 ms steps and expect the display to follow each step. A slower interval (for example 100 ms) fails.
8. **Cleanup.** Clear the interval whenever the watch stops, on Reset, and when the component unmounts. While the watch is stopped there must be no timer left running, and that includes before the first Start. (The tests count the pending timers.)
9. **No React warnings.** The console must stay free of React errors and warnings during all of the above. A typical cause is a list without a unique `key`. (The tests check every call to `console.error`.)

## Acceptance criteria (what the tests check)

- The initial screen shows `00:00.00`, a **Start** button, an enabled **Reset**, a disabled **Lap**, and no laps. Two seconds later nothing has changed.
- After Start the button reads **Stop**, and after every 10 ms the display moves up by one centisecond (`00:00.01`, `00:00.02`, and so on).
- Formatting: `00:00.99`, `00:01.00`, `00:09.97`, `00:10.02`, `01:00.00`, `01:05.07`, and `100:05.40`.
- Stop after 1.239 seconds shows `00:01.23`, leaves no timer running, and the display stays put when more time passes.
- Stop clicked right after the clock jumped 5 s (no tick ran in between) shows the real time, and the next Start continues from it.
- Start, 1 s, Stop, a 5 s pause, Start, 0.5 s shows `00:01.50` (and a further stop and start accumulates again).
- With a late tick (the clock jumps 5 s, then one tick runs), the display shows the real time.
- Lap is disabled when stopped and enabled when running. Laps appear as `Lap 1 00:01.23`, `Lap 2 00:03.50`, in an `<ol>`, in order. Laps survive Stop and Start. Two laps in the same instant are two rows.
- Reset (running or stopped) zeroes the display, clears the laps, leaves no timer running, and the next run starts from zero with the next lap numbered 1.
- Unmounting while running leaves no timer behind and causes no errors.
- It behaves the same inside `<StrictMode>` (which runs effects and state updater functions twice in development), including when you take a lap.
- React logs no errors or warnings (for example about list keys) during any of these steps.

## How to run

```bash
npm test -- exercises/react/18-stopwatch
```

To see your component in the browser, run `npm run dev` and pick `18-stopwatch` in the sidebar.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/18-stopwatch
```

The tests use `vi.useFakeTimers()`. That replaces `setInterval`, `clearInterval` and `Date` with fake versions, so time only moves when the test moves it. Use `setInterval` and `Date.now()` as described above, and the tests stay fast and never depend on real waiting.

<details>
<summary>Hints (open only if you are stuck)</summary>

1. Start with the formatting. Write a small function that takes milliseconds and returns `mm:ss.cc`. Work in centiseconds first: `Math.floor(ms / 10)`. Then minutes = centiseconds divided by 6000 (rounded down), seconds = centiseconds divided by 100 (rounded down) modulo 60, and the last two digits = centiseconds modulo 100. `String(n).padStart(2, '0')` adds the leading zero.
2. State: the milliseconds to display, whether the watch is running, and the list of laps. The display state is only a copy of "what the clock said at the last tick".
3. A ref (`useRef`) holds a value that survives re-renders and does not trigger one when it changes. That is perfect for "the moment the current run started". It is read and written in event handlers and in the timer callback, never while rendering.
4. To continue after a pause without losing the old time, set the start timestamp to "now minus the time already on the watch", as if the watch had been started that long ago. Then every tick is simply `Date.now()` minus that timestamp.
5. Use an effect that depends on `running`. If the watch is not running, do nothing. Otherwise start the interval, and return a cleanup function that clears it. React runs the cleanup when `running` changes and when the component unmounts, which covers Stop, Reset and unmount in one place.
6. When the user clicks Stop, take one last reading of the clock and put it into state, so the display shows the exact time of the click and not the value of the last tick.
7. Lap rows: store plain numbers (milliseconds) in a state array and format them while rendering. Use a functional update (`setLaps(prev => [...prev, time])`). Build a new array, never change the old one (no `push`), and read the clock before calling `setLaps`, because React may run an updater function twice.
8. Lap rows need a `key`. Think about which value is unique: two laps can have the same time. The array index is fine here, because laps are only added at the end or cleared all at once.
8. If a test says a timer is still pending, check that every code path that sets `running` to `false` also leads to the cleanup running.

</details>

## Stretch goals

- Show the split time (the time since the previous lap) next to each total, and mark the fastest and slowest split.
- Add keyboard shortcuts: Space to start or stop, `L` for a lap, `R` for reset. Make sure typing in other fields would not trigger them.
- Extract the logic into a custom hook, `useStopwatch()`, that returns `{ elapsed, running, laps, toggle, lap, reset }`, and keep the component a thin view.
- Keep the watch running across a page refresh by saving the start timestamp and the accumulated time in `localStorage`.
- Try `requestAnimationFrame` instead of `setInterval` and compare the behaviour. (The provided tests are written for `setInterval`, so write your own checks.)

## Interview follow-ups to prepare for

- Why not just add 10 ms every tick? Think about what can delay a timer callback (a busy main thread, a hidden tab, a sleeping laptop) and what happens to the error over ten minutes.
- Would `requestAnimationFrame` be better than `setInterval` here? Think about how often each one runs, what each does when the tab is hidden, and what you have to do to cancel each one.
- What happens to your stopwatch when the tab is in the background? What does the user see when they come back, and how could you refresh the display immediately at that moment (hint: the `visibilitychange` event)?

## Learn the concepts first

- [useEffect](../../../../02-hooks/03-useeffect.md)
- [useRef](../../../../02-hooks/04-useref.md)
