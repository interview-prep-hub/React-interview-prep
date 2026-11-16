# 10 - Traffic light

**Level:** Easy | **Time:** 25 minutes | **Topics:** `useEffect` with timers, cleanup, state machine

## The task

Build a traffic light that changes by itself. It starts on red, stays red for 3 seconds, turns green for 2 seconds, turns yellow for 1 second, and then goes back to red. It repeats this forever, until the component is removed from the screen.

The hard part is not the screen. It is the timers: start them at the right moment, never start two at once, and always stop them when they are no longer needed.

Work in [`App.jsx`](./App.jsx). Do not edit the test file.

## Requirements

1. `App` is the default export and needs no props.
2. Show the active light as text inside an element with `data-testid="active-light"`. The text is exactly one of `red`, `green` or `yellow` (lowercase, nothing else inside that element).
3. Render exactly three lamps. Each lamp is its own element with an `aria-label`: `red lamp`, `green lamp` and `yellow lamp` (exact text, and no other element may be labelled `... lamp`).
4. The lamp that matches the active light has `data-on="true"`. The other two lamps must not have `data-on="true"` (the usual choice is `data-on="false"`). At any moment exactly one lamp is on, and it always agrees with the text from requirement 2.
5. The light starts at **red**.
6. The timing, measured from the moment a light turns on (the first red is measured from the moment the component mounts):
   - red stays on for **3000 ms**, then green turns on
   - green stays on for **2000 ms**, then yellow turns on
   - yellow stays on for **1000 ms**, then red turns on again
   - then it repeats, forever

   A light must not change early. At 2999 ms it is still red, at 3000 ms it is green.

   Re-rendering must not restart the clock. If `App` is rendered again from outside (for example its parent re-renders) in the middle of a light, that light still ends at its original time.
7. Make the cycle data driven: keep the durations and the order of the lights in one config object, and make the component read from it. The tests cannot see this rule, but an interviewer will look for it. Changing a duration should mean editing one number, not the logic.
8. Clean up. When the component unmounts, no timer may be left running. The tests check that `vi.getTimerCount()` is `0` after unmount, at any point of the cycle.
9. It must also behave correctly inside `<StrictMode>`. In development React mounts, unmounts and mounts your component again to expose missing cleanups. The timing must not become faster, and no timer may leak.

## Acceptance criteria (what the tests check)

- On first render the text is `red` and only the red lamp is on.
- There are exactly three lamps, labelled `red lamp`, `green lamp` and `yellow lamp`.
- At 2999 ms the light is still red, at 3000 ms it is green.
- Green lasts 2000 ms and then yellow starts. Yellow lasts 1000 ms and then red starts.
- A re-render in the middle of red (at 1500 ms) or in the middle of green does not move the moment the light changes.
- The cycle repeats correctly over three full rounds (18 seconds of fake time), and it is still running after 50 rounds (5 minutes of fake time). "Forever" means forever, not "a fixed number of timers scheduled up front".
- The same timing holds inside `<StrictMode>`.
- While the component is mounted, at least one timer is pending (`vi.getTimerCount()` is greater than `0`).
- After unmount, `vi.getTimerCount()` is `0`. This is checked right after mount, inside `<StrictMode>`, and when unmounted during red, green or yellow. Letting time pass after unmount changes nothing.
- A component mounted a second time starts again at red with a full 3000 ms.

How the tests move time: they use Vitest fake timers, so the tests are fast and never wait for real seconds. They jump the clock forward one light change at a time, so React has a chance to run your effect again between two timers. You do not need to do anything special for this.

## How to run

```bash
npm test -- exercises/react/10-traffic-light
```

To see your component in the browser, run `npm run dev` and pick `10-traffic-light` in the sidebar. The playground wraps the app in `StrictMode`, which mounts your component, unmounts it and mounts it again. A missing cleanup leaves a stray timer behind. Depending on how you write the state update you may or may not see the light skip a step, so do not rely on your eyes: the tests are the judge.

To check the reference solution against the same tests (try your own first!):

```bash
npm run test:solutions -- exercises/react/10-traffic-light
```

<details>
<summary>Hints (open only if you are stuck)</summary>

1. This is a tiny state machine: a fixed set of states (the three lights), and a rule for which state comes next. Write the rules as data. For each light, store how long it stays on and which light follows:

   ```js
   const LIGHTS = {
     red: { duration: 3000, next: 'green' },
     // ... green and yellow in the same shape
   }
   ```

2. The only state you need is the name of the active light, for example `useState('red')`. The lamps and the text are all derived from it.
3. Use one `useEffect` with `[active]` as its dependency array. Inside it, read the duration and the next light from your config, start a `setTimeout`, and in the callback call `setActive(next)`. Do not leave the dependency array out: the effect would then run after every render, and a re-render in the middle of a light would restart its timer.
4. Return a cleanup function from the effect that calls `clearTimeout(id)`. React runs the cleanup before it runs the effect again, and also when the component unmounts. That one function solves both "never two timers" and "no leaked timer".
5. Why a chain of `setTimeout` and not one `setInterval`? An interval fires at a fixed rhythm, but here every light has a different duration. (You could tick every second and count ticks, and the tests would accept it, but then the durations hide inside the counting logic instead of living in the config.)
6. To render the lamps, map over `Object.keys(LIGHTS)`. For the attribute, `data-on={name === active}` works: React writes a boolean on a `data-*` attribute as the string `"true"` or `"false"`.
7. If the light skips a step while you use `npm run dev`, or a test says a timer is still pending after unmount, you are probably missing the cleanup. That is exactly what StrictMode and the unmount tests are there to reveal.
8. A lamp is just a `div`. A plain `div` with an `aria-label` is ignored by many screen readers, so adding `role="img"` to it is a good habit (the tests work either way).

</details>

## Stretch goals

- Add a **Pause** / **Resume** button. Decide where the paused flag lives and what changes in the effect (see the third follow-up question).
- Show a countdown ("green for 2 s more") that updates every second. Think about how many timers that needs, and whether it can drift.
- Add a flashing "pedestrian" light as a fourth state by changing only the config object. If you also had to change the component logic, the cycle was not really data driven.
- Move the logic into a custom hook, `useTrafficLight(config)`, that returns the active light. The component then only renders.
- Extract a pure function `getNextLight(config, current)` and write a small unit test for it.

## Interview follow-ups to prepare for

- `setTimeout` chain versus `setInterval`: which one fits this problem, and why? When would an interval be the better tool, and what is the risk with intervals when the work inside takes a long time or the tab is in the background?
- What happens to your component in `StrictMode` during development? Why does React run effects twice there, what would break if you had no cleanup, and why does the cleanup make the double run harmless?
- How would you add a pause button? Where does the `paused` flag live, what goes into the dependency array, and what happens to the time that was already spent on the current light when the user presses resume (restart the light, or continue with the remaining time)?

## Learn the concepts first

- [useEffect](../../../../02-hooks/03-useeffect.md)
- [useState in depth](../../../../02-hooks/02-usestate-in-depth.md)
