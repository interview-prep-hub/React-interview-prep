# Round 8 - Frontend System Design: Prompts - Answers

**Questions:** [../questions/01-prompts.md](../questions/01-prompts.md)

How to read this file: first the reusable framework, then ten full worked answers (marked "full worked answer") for the most common prompts, then a five-line outline for each remaining prompt. The answers are model answers: say them in your own words, and change the choices if your requirements differ. A choice is good when you can name what it costs.

## The framework: how to answer any frontend system design prompt

A system design round is a conversation, not an exam. The interviewer wants to see that you can turn a vague request into a plan, make choices, and explain what each choice costs. No full code is expected. Boxes, arrows, short data shapes and clear words are enough.

### The RADIO steps

RADIO is a popular checklist. Each letter is one step:

1. **R, Requirements.** Ask questions, then write down what you will build and what you will skip.
2. **A, Architecture.** Draw the big boxes: the parts in the browser, the parts on the server, and how they talk. Show the component tree.
3. **D, Data model.** List the entities (post, message, product), their fields, and the shape of the client store. Say which data is server state and which is UI state.
4. **I, Interface.** Define the API (endpoints or events, request and response shapes, pagination, errors) and the props of the key components.
5. **O, Optimizations.** Performance, accessibility, error handling, security, observability, and how it scales.

The nine topics most interviewers listen for map onto RADIO like this:

| Topic | RADIO step |
|---|---|
| Requirements and scope | R |
| Architecture and components | A |
| Rendering strategy, state management | A (and D for the store shape) |
| Data model and API | D and I |
| Performance, accessibility, error handling | O |
| Trade-offs | every step |

### A 45-minute time plan

One prep guide reports this split for a 45-minute round: Requirements 5 minutes, Architecture 5, Data model 10, Interface 10, Optimizations 15. Treat it as a starting point, not a rule.

| Minutes | Do this |
|---|---|
| 0 to 5 | Ask questions. Write functional and non-functional requirements. Agree on scope. |
| 5 to 10 | Draw the boxes and the component tree. Name where each part runs. |
| 10 to 20 | Data model and client store. Server state versus UI state. |
| 20 to 30 | API shapes, component props, events. Pagination and error format. |
| 30 to 45 | Pick one or two deep dives (the interviewer often chooses). Then performance, accessibility, errors, security, scale. Finish with what you would do with more time. |

Adjust to the prompt. For a small component (autocomplete, carousel), spend less on the API and more on state, accessibility and edge cases. For a platform topic (design system, micro-frontends), spend more on architecture, rollout and people.

### Step 1: requirements and scope

Ask, do not assume. Useful questions:
- Who uses it, on which devices, and how many users? Is it public (needs SEO) or behind a login?
- Which features are in scope? Name three you will skip.
- Does it need real-time updates, offline use, several languages, or accessibility beyond the basics?
- What are the speed goals? (Core Web Vitals at the 75th percentile: LCP of 2.5 s or less, INP of 200 ms or less, CLS of 0.1 or less.)

Say your assumptions out loud: "I will assume 1 million daily users, mostly mobile, English only at first."

### Step 2: architecture and components

- Draw the data path: user action, component, state, API call, server, response, render.
- Split the UI into components with one job each. Show who owns which state.
- Say where code runs: browser, server (rendering), edge (CDN), worker (service worker or web worker).

### Step 3: state management

Sort state into kinds, and give each kind a home:
- **Server state** (data that lives on the server): a cache library or your own cache, with stale rules.
- **UI state** (open or closed, selected tab): local component state.
- **URL state** (filters, page, sort): the URL, so links, refresh and the back button work.
- **Form state** (drafts, validation): a form library or local state.
- **Global client state** (theme, session): context or a small store, only when really shared.

### Step 4: data model and API

- Normalise: store each entity once by id, and keep lists as arrays of ids. A change to one entity then shows everywhere.
- Prefer cursor pagination ("give me items after this cursor") over offset pagination when data changes often. Offsets shift when new items arrive.
- Make writes safe to retry: send an idempotency key (a unique id for the request) so a retry cannot create a duplicate.
- Define the error shape: a code, a message, and a retry hint.

### Step 5: rendering strategy

| Strategy | Use when |
|---|---|
| Client-side rendering (CSR) | Behind a login, highly interactive, no SEO need |
| Server-side rendering (SSR), including streaming SSR | Public, needs SEO or a fast first paint, personalised |
| Static generation (SSG) or incremental regeneration (ISR) | Content changes rarely, can be cached at the CDN |
| Server Components | Large read-only parts that should not ship their code to the browser |

Mixed answers are fine and common: a server-rendered shell, client-rendered interactive islands.

### Step 6: performance

- Ship less: code splitting by route and by heavy feature, tree shaking, a bundle size budget.
- Load smarter: lazy-load images and below-the-fold parts, preload the hero image, responsive images, a CDN.
- Render less: virtualize long lists, memoize where profiling shows a problem, debounce input.
- Avoid layout shift: reserve space with width, height or aspect-ratio.
- Measure: lab tools in development, real-user monitoring (field data) in production.

### Step 7: accessibility

Use semantic HTML first. Then: keyboard support for every action, visible focus, focus management for overlays, labels and names for controls, live regions for async updates, enough contrast (4.5 to 1 for normal text), and respect for reduced motion.

### Step 8: error handling and resilience

Design four states for every async piece: loading, empty, error, success. Add retry with backoff for reads, safe retries for writes, error boundaries so one broken part does not blank the page, and a clear offline message.

### Step 9: trade-offs and closing

For each big choice, say: "Option A gives X and costs Y. Option B gives Z and costs W. Given our requirement, I pick A." Close with what you would add with more time: tests, monitoring and alerting, source maps for error tracking, feature flags, translations, security review.

**Why it matters / follow-up:** interviewers score the process more than the final picture. Common follow-ups: "What if traffic grows 100 times?", "What if the API is slow?", "What would you cut if you had half the time?".
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), [How React interviews work](../../../00-start-here/03-how-react-interviews-work.md).

## UI components

### R8-SD-001 (Medium) Design an autocomplete (full worked answer)
**Answer:**

**Requirements.** Functional: the user types, sees up to about 8 suggestions, picks one with mouse or keyboard, and the matching part of each suggestion is highlighted. Non-functional: it feels instant, handles slow networks, works with a keyboard and screen reader, and never shows results for an old query. Out of scope: personalised ranking (the server does that).

**Component tree.**

```text
<Autocomplete>             owns: query, results, status, activeIndex, isOpen
  <SearchInput />          role="combobox"
  <SuggestionList />       role="listbox"
    <SuggestionItem /> xN  role="option", highlighted match
  <StatusMessage />        live region: "5 results", "No results"
```

**Data flow.** Typing updates `query`. A debounced copy of the query (wait until the user pauses for about 200 to 300 ms) triggers the lookup. The lookup first checks a cache (a `Map` keyed by the normalised query: trimmed, lower case). On a miss it calls the API with an `AbortController` and cancels the previous request. The response fills `results`, and the list renders.

**API shape.**

```text
GET /api/suggest?q=rea&limit=8
```

```json
{ "query": "rea", "items": [ { "id": "t1", "label": "react", "type": "topic" } ] }
```

The server echoes `query` so the client can ignore a response that does not match the current input.

**Key decisions and trade-offs.**
- Debounce versus throttle: debounce waits for a pause and sends fewer requests, which suits typing. Throttle sends at a fixed rate and shows results while typing, at the cost of more requests.
- Cancel versus ignore stale responses: aborting saves bandwidth. Comparing the echoed query is a second safety net, because an abort can arrive too late.
- Client cache: repeated queries (typing, deleting, retyping) cost nothing. Reuse is also possible for prefixes: if the server returned all matches for "rea", then "reac" can be filtered locally. This is only valid when the result was not cut off at a limit.
- Minimum length (1 or 2 characters) avoids useless requests for very short input.
- For a big list that is already in memory, filter locally and use `useDeferredValue` so typing stays smooth. It does not reduce network calls, so use debounce for the network.

**Edge cases.** Out-of-order responses. Empty query (show recent searches or nothing). No results message. Network error (inline message, input keeps working). Characters that need URL encoding. IME input (Chinese, Japanese): wait for the composition to end before searching. The list closing on blur before a click registers (select on pointer down, or prevent the blur). Highlighting must split the string into parts and render them as elements, never inject HTML.

**Performance.** Debounce, abort, cache, cap results, and keep `SuggestionItem` cheap. Warm up the connection early (preconnect to the API host). If the list is local and huge, virtualize it.

**Accessibility.** Use the combobox pattern: the input has `role="combobox"`, `aria-expanded`, `aria-controls` (the listbox id), `aria-autocomplete="list"` and `aria-activedescendant` (the id of the highlighted option). Focus stays in the input. Arrow Down and Up move the highlight, Enter selects, Escape closes. Options have `role="option"`. A polite live region announces the count. Generate ids with `useId`.

**If asked to scale it.** The server uses a prefix index (a trie or a search engine), edge caching for popular prefixes with a short time to live, and rate limits. The client adds personalised and recent suggestions, request coalescing, and analytics on selected suggestions.

**Why it matters / follow-up:** this is the most common component prompt. Expect: "Show me the debounce hook", "How do you test the race condition?", "What if the query is empty?".
**Learn more:** [useEffect](../../../02-hooks/03-useeffect.md), [Custom hooks](../../../02-hooks/08-custom-hooks.md), [Accessibility](../../../04-advanced/09-accessibility.md), practice: [12-autocomplete-debounce](../../../practice-app/exercises/react/12-autocomplete-debounce/README.md), [33-accessible-combobox](../../../practice-app/exercises/react/33-accessible-combobox/README.md).

### R8-SD-002 (Medium) Design an infinite scroll list (outline)
**Answer:**
1. **Scope:** load the next page when the user nears the end; show loading, error and end states; keep the position when the user goes back from a detail page.
2. **Trigger:** put a sentinel element after the last item and watch it with an `IntersectionObserver`. A `rootMargin` of a few hundred pixels starts loading before the user reaches the end.
3. **Data:** cursor pagination, a flat list in a cache, de-duplicate by id. Keep the previous pages when the next page fails and show a retry button at the bottom.
4. **Trade-offs:** the DOM grows with every page, so use virtualization (render only the visible rows; fixed row height is simple, variable height needs measuring) or cap the pages and offer "back to top". Restore scroll by keeping the cache and the scroll offset.
5. **Accessibility and traps:** keyboard users cannot reach a footer that keeps moving, so offer a "Load more" button as a fallback and announce the new count politely. Reserve item height to avoid layout shift.

**Why it matters / follow-up:** "How do you virtualize variable-height rows?"
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), practice: [16-infinite-scroll](../../../practice-app/exercises/react/16-infinite-scroll/README.md), [24-virtualized-list](../../../practice-app/exercises/react/24-virtualized-list/README.md).

### R8-SD-003 (Medium) Design an image carousel (full worked answer)
**Answer:**

**Requirements.** Show one slide at a time (or a few), previous and next buttons, dots or thumbnails, swipe on touch, keyboard use, optional autoplay, loop at the ends. Non-functional: no layout shift, fast first image, accessible, works at any width.

**Component tree.**

```text
<Carousel images autoPlay interval>
  <Viewport>               overflow hidden, role="region" with aria-roledescription="carousel"
    <Track>                flex row, moved with transform: translateX
      <Slide /> xN         role="group" aria-roledescription="slide" aria-label="3 of 10"
        <img>              width, height, alt, loading
  <PrevButton /> <NextButton />
  <Dots />                 buttons with aria-label and aria-current
  <PlayPauseButton />      required when autoplay exists
```

**Data flow.** One piece of state: `index` (plus `paused`). `next` and `prev` use modulo for looping: `(index + 1) % count`. The track position is derived from `index`. Autoplay is an interval in an effect with cleanup, paused on hover, on keyboard focus, when the tab is hidden, and when the user prefers reduced motion.

**API shape.** The component takes `images: { id, src, srcSet, alt, width, height }[]` from the CMS. For huge galleries the server pages the list: `GET /api/galleries/42/images?cursor=...&limit=20`. Always send width and height so the browser can reserve space.

**Key decisions and trade-offs.**
- CSS scroll snap (`scroll-snap-type: x mandatory`) gives native swipe and momentum with little code, but you get less control over looping and autoplay. A JavaScript transform gives full control and costs more code and more touch edge cases. Say which you pick and why.
- Animate with `transform` (the browser can do it on the compositor, no layout). Do not animate `left` or `width`.
- Render all slides when there are about ten. Render only the current slide and its neighbours when there are hundreds.
- Controlled API (`index` and `onIndexChange` props) lets a parent sync thumbnails; offer it as an option, with internal state as the default.

**Edge cases.** Zero images (empty state), one image (hide the controls), a broken image (fallback), fast repeated clicks during an animation, resize while on slide 5, right-to-left languages (reverse direction), vertical scroll versus horizontal swipe (`touch-action: pan-y`).

**Performance.** The first visible image is often the Largest Contentful Paint element: do not lazy-load it, and give it high fetch priority (`fetchPriority="high"` in React). Lazy-load the others with `loading="lazy"`. Use `srcSet` and `sizes`, modern formats such as WebP or AVIF, and small thumbnails. Preload the next image when idle.

**Accessibility.** Follow the carousel pattern from the ARIA Authoring Practices: a labelled region, slides labelled "n of N", real `<button>` controls with names, and a visible pause button for autoplay. Stop autoplay on hover and on focus. Hide off-screen slides from assistive technology (the `inert` attribute works well). Give every image useful alt text. Respect `prefers-reduced-motion`.

**If asked to scale it.** Window the slides, page the API, virtualize the thumbnail strip, serve resized images from a CDN, and reuse the modal system for a full-screen lightbox.

**Why it matters / follow-up:** "What if the user swipes on a phone and scrolls the page?" and "How do you test it?".
**Learn more:** [Component patterns](../../../03-intermediate/01-component-patterns.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md), practice: [22-image-carousel](../../../practice-app/exercises/react/22-image-carousel/README.md).

### R8-SD-004 (Medium) Design a data table (full worked answer)
**Answer:**

**Requirements.** Columns, sorting, filtering, pagination (or virtual scrolling), row selection, sticky header, column visibility, optional resize and inline edit. First question: how many rows? A few hundred and a few hundred thousand lead to different designs.

**Component tree.**

```text
<DataTable columns data>
  <Toolbar>                search, filters, column picker, bulk actions
  <TableViewport>          scroll container, sticky header
    <HeaderRow> <HeaderCell sortable /> xN
    <Body> <Row /> xN      <Cell> picks a renderer by column type
  <Pagination /> or <LoadMoreSentinel />
  <StatusBar>              "12 selected of 4,310"
```

**Data flow and state.** One `tableState` object: `{ sort, filters, page or cursor, pageSize, columnVisibility, columnWidths }`. Put sort, filters and page in the URL, so a view can be shared and the back button works. Row data is server state in a cache keyed by `tableState`. Selection is a `Set` of row ids kept outside the row data.

**API shape.**

```text
GET /api/orders?sort=-createdAt&status=paid&cursor=abc&pageSize=50
```

```json
{ "rows": [ { "id": "o1", "total": 4200, "status": "paid" } ], "total": 4310, "nextCursor": "def" }
```

**Key decisions and trade-offs.**
- Client-side sort and filter is simplest and instant, and fine for up to a few thousand rows that are already loaded. Beyond that, do it on the server, because you cannot download everything.
- Offset pagination allows "jump to page 40" but is slow and inconsistent on big, changing data. Cursor pagination is stable but only moves forward and back.
- Pagination versus virtual scrolling: pagination is simple and accessible. Virtualization (render only visible rows) feels smooth for large sets but is harder for find-in-page, accessibility and variable row heights.
- A real `<table>` gives free semantics. A `div` grid is easier to virtualize but needs ARIA roles. A headless table library (logic without markup, for example TanStack Table) is a good middle path.

**Edge cases.** Loading skeleton that keeps the layout, empty state, error with retry, race between two filter changes, reset to page 1 when a filter changes, selection across pages (store ids, and define "select all" as "all on this page" or "all matching" clearly), locale-aware sorting (`Intl.Collator`), numbers aligned right, long text truncated with a tooltip, time zones in dates.

**Performance.** Virtualize large sets. Key rows by id. Use `React.memo` on rows with stable props. Debounce filter text. Keep heavy sorting on the server or in a worker. For client-side filtering of big arrays, use a transition so typing stays responsive. Use `position: sticky` for the header.

**Accessibility.** Header cells are `<th scope="col">`. Sortable headers contain a button and set `aria-sort` to `ascending`, `descending` or `none`. A caption or `aria-label` names the table. Row checkboxes have labels. If cells are interactive (editing, arrow-key navigation), switch to the grid pattern with `role="grid"` and a roving tabindex. When virtualizing, `aria-rowcount` and `aria-rowindex` tell assistive technology the real size. Announce result counts in a polite live region.

**If asked to scale it.** Server pagination with indexes, column-level lazy data, export through a background job with a download link, saved views, live row updates by id over a WebSocket, and aggregation on the server.

**Why it matters / follow-up:** "How would you add inline editing with validation?" and "How do you keep a 100k-row table fast?".
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), [State management](../../../03-intermediate/06-state-management.md), practice: [23-data-table](../../../practice-app/exercises/react/23-data-table/README.md), [24-virtualized-list](../../../practice-app/exercises/react/24-virtualized-list/README.md).

### R8-SD-005 (Medium) Design a modal (overlay) system (outline)
**Answer:**
1. **Scope:** open dialogs from anywhere (confirm, forms, drawers), stack them, close with Escape, backdrop or button, and return focus to where the user was.
2. **Architecture:** a `ModalProvider` holds a stack in state. A hook `useModal()` exposes `open(content)` and `close()`. The modals render into a portal at the end of `document.body` so no parent with `overflow: hidden` or a z-index stacking context can clip them.
3. **Choice:** the native `<dialog>` element with `showModal()` gives the top layer, Escape handling and an inert background for free. A custom `div` with `role="dialog"` and `aria-modal="true"` gives full style control but you must write focus handling yourself.
4. **Behaviour:** move focus into the dialog on open, trap Tab inside, restore focus to the trigger on close, lock body scroll, label the dialog with `aria-labelledby`, and close modals on route change. Only the top modal reacts to Escape.
5. **Traps:** the trigger unmounts before close (store a fallback focus target), nested modals, scroll lock on mobile browsers, and animations that ignore reduced motion.

**Why it matters / follow-up:** "Why a portal?" and "How do you return a value from a confirm dialog?" (a promise-based `confirm()` helper).
**Learn more:** [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md), [Accessibility](../../../04-advanced/09-accessibility.md), practice: [14-modal-portal](../../../practice-app/exercises/react/14-modal-portal/README.md).

### R8-SD-006 (Hard) Design a rich text editor (outline)
**Answer:**
1. **Scope:** bold, italic, headings, lists, links, images, undo and redo, keyboard shortcuts, paste, and maybe markdown shortcuts. Collaboration is a stretch goal.
2. **Do not hand-roll `contenteditable`:** browsers differ, input methods (IME) and selection are painful. Use an editor framework (for example ProseMirror, Lexical or Slate), or at least a model-first design: a document model (a tree of nodes with marks such as bold) is the source of truth, the DOM is only a view of it, and every change is a command that produces a new model.
3. **Data:** store the JSON model, not HTML. Render HTML from it for read-only pages, and validate the model against a schema when you load it.
4. **Trade-offs:** the editor owns its own state, so do not make every keystroke a React `setState` on a controlled value (the caret jumps and it is slow). React wraps the toolbar and plugins. A plugin system keeps features separate.
5. **Traps:** sanitize pasted HTML and any HTML you output (XSS), keep selection and undo stack correct, make the toolbar accessible (`role="toolbar"`, `aria-pressed`), and render long documents in blocks.

**Why it matters / follow-up:** "How would you add collaboration?" (see the collaborative document answer).
**Learn more:** [Security and i18n](../../../04-advanced/10-security-and-i18n.md), Advanced patterns (planned).

## Product features

### R8-SD-007 (Medium) Design a news feed (full worked answer)
**Answer:**

**Requirements.** An endless list of posts (text, images, video, links), a composer to create posts, like and comment actions, a "new posts" notice, and a ranked order chosen by the server. Non-functional: fast first paint, smooth scrolling on phones, accessible. The feed is behind a login, so SEO matters only for public post pages.

**Component tree.**

```text
<FeedPage>
  <Composer />                  creates a post, inserted optimistically
  <NewPostsBanner />            "12 new posts", click to merge
  <FeedList role="feed">        windowed list
    <PostCard post /> xN        memoized by post id
      <PostHeader /> <PostBody media /> <ReactionBar /> <CommentPreview />
    <LoadMoreSentinel />        IntersectionObserver
  <FeedSkeleton /> <ErrorRetry />
```

**Data model and flow.** Store entities by id: `posts`, `users`. The feed is an ordered array of post ids plus a `nextCursor`. A like changes one post entity, and every place that shows the post updates. Server state lives in a cache (an infinite query). UI state (composer text, expanded text) stays local.

**API shape.**

```text
GET  /api/feed?cursor=abc&limit=10
POST /api/posts
PUT  /api/posts/:id/like        (idempotent)
DELETE /api/posts/:id/like
```

```json
{ "items": [ { "id": "p9", "author": { "id": "u1", "name": "Sam", "avatar": "..." }, "text": "Hello", "media": [ { "type": "image", "url": "...", "w": 800, "h": 600 } ], "createdAt": "2026-11-10T09:00:00Z", "likeCount": 12, "viewerHasLiked": false, "commentCount": 3 } ], "nextCursor": "def" }
```

**Key decisions and trade-offs.**
- Cursor pagination, not offset. New posts at the top shift offsets and cause duplicates or gaps.
- Optimistic like: flip `viewerHasLiked` and the count at once, send the request, roll back and show a small error if it fails. Using `PUT` and `DELETE` makes a repeated click harmless.
- New posts arriving: do not insert them above the reader. Buffer them and show the banner. The user chooses when to merge, so the content does not jump.
- Rendering: the first page can be server rendered or streamed for a fast first paint, then hydrated. A client-only shell with skeletons is simpler. Say the trade-off: server rendering costs server work, and the feed is personalised so it is not cacheable at the CDN.
- Load trigger: a sentinel with a `rootMargin` loads the next page before the user reaches the end.

**Edge cases.** Duplicate posts across pages (de-dupe by id), deleted post, back navigation (keep the cache and scroll offset), double click on like, post created offline (queue it), page error (inline retry at the bottom), empty feed (onboarding), very long text (clamp with "see more"), media without known size (reserve space from `w` and `h`).

**Performance.** Virtualize or cap the loaded pages. Lazy-load images and videos. Autoplay video only when visible and muted. Use responsive images from a CDN. Memoize `PostCard` so a like re-renders one card. Code-split the composer and the comment editor. Prefetch the next page. Send impression events in batches with `navigator.sendBeacon`.

**Accessibility.** Use the feed pattern: `role="feed"` containing `article` elements, with `aria-busy` while loading and `aria-setsize` and `aria-posinset` when the total is known. The like button is a toggle button with `aria-pressed`. Offer a "Load more" button for keyboard users. Announce new-post counts politely. Provide alt text for images and captions for video.

**If asked to scale it.** The server pushes only a small "new posts available" signal, not full posts. The client batches updates, and static assets come from a CDN. Experiment flags decide ranking UI variants. The ranking and fan-out are backend problems, and you say so.

**Why it matters / follow-up:** "How do you restore scroll after opening a post?" and "How do you test the optimistic rollback?".
**Learn more:** [Data fetching](../../../03-intermediate/02-data-fetching.md), [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md), practice: [16-infinite-scroll](../../../practice-app/exercises/react/16-infinite-scroll/README.md).

### R8-SD-008 (Hard) Design a chat app (full worked answer)
**Answer:**

**Requirements.** Conversation list with unread counts, message thread, send text and images, delivery status (sending, sent, delivered, read), typing indicator, presence (online), history loading, real time, and recovery after a lost connection. Out of scope: voice and video calls, end-to-end encryption (mention it as a follow-up).

**Component tree.**

```text
<ChatApp>
  <ConversationList>            virtualized
    <ConversationItem unread lastMessage /> xN
  <ChatWindow conversationId>
    <ChatHeader presence />
    <MessageList role="log">    anchored to the bottom, loads older at the top
      <DateDivider /> <MessageBubble status /> xN
      <TypingIndicator />
    <Composer> <TextArea /> <AttachButton /> <SendButton /> </Composer>
```

**Transport.** A WebSocket (a long-lived two-way connection) fits chat: the server pushes messages, and the client sends messages, typing events and acknowledgements on the same channel. Server-Sent Events (SSE) is one-way server to client over plain HTTP, simpler and reconnects by itself, but sends would need separate HTTP requests. Polling works as a last fallback but wastes requests and adds delay. A small connection manager owns one socket, sends heartbeats, reconnects with exponential backoff plus random jitter, and after reconnecting asks the server for everything after the last seen message id or sequence number.

**Data model.** `conversations` by id, `messages` by id, `messageIdsByConversation` (ordered), `unreadByConversation`, `presenceByUser`. Keep a limited number of messages per conversation in memory.

**API shape.**

```text
GET /api/conversations
GET /api/conversations/:id/messages?before=<messageId>&limit=30
```

```json
{ "type": "message.send", "clientId": "c-7f3", "conversationId": "k1", "text": "Hi" }
```

```json
{ "type": "message.new", "message": { "id": "m881", "clientId": "c-7f3", "seq": 412, "text": "Hi", "createdAt": "2026-11-10T09:00:01Z" } }
```

**Sending flow.** Create a `clientId` (for example `crypto.randomUUID()`), append the message at once with status "sending", send it, and match the server echo by `clientId` to replace it with the real id and `seq`. If the send fails, mark it "failed" with a retry button. The server `seq` per conversation is the authority for order. Because the client matches the echo by `clientId` and the server ignores a repeated `clientId`, a retry or a reconnect cannot create a duplicate.

**Key decisions and trade-offs.**
- Optimistic send makes chat feel instant, at the cost of failed and reordered states you must show.
- Scroll behaviour: if the user is at the bottom, a new message keeps them there. If they scrolled up, do not move them; show a "new messages" pill. When older messages are prepended, adjust the scroll position by the height that was added (measure in `useLayoutEffect`). Browser scroll anchoring helps in some browsers, so do not depend on it.
- Typing events: send at most one every few seconds while typing, and expire the indicator on the receiving side after a few seconds without an update.
- Several tabs: one socket per tab is simple but wasteful. A shared worker or a leader tab with `BroadcastChannel` shares one connection.

**Edge cases.** Duplicate or out-of-order events after reconnect (de-dupe by id, sort by `seq`), edits and deletes, huge groups (typing from many people: show "several people are typing"), attachments with progress and cancel, send on Enter with Shift+Enter for a new line (do not send while an input method is composing), link previews, and untrusted text (React escapes text; sanitize any rich formatting).

**Performance.** Virtualize long histories (variable row height). Memoize bubbles. Batch bursts of incoming events into one state update per frame. Reserve image size from known dimensions. Load the conversation list first, and the thread on demand.

**Accessibility.** A message list with `role="log"` is a polite live region, so new messages are read without stealing focus. Do not announce your own messages again. Label the composer, keep keyboard focus predictable when switching conversations, give unread badges a text alternative ("3 unread messages"), and respect reduced motion.

**If asked to scale it.** Paginate and virtualize the conversation list, subscribe to presence only for visible people, queue unsent messages in IndexedDB so they survive a reload, and use a service worker with push notifications when the tab is closed.

**Why it matters / follow-up:** "What happens on reconnect?" and "How do you guarantee order?" are the usual probes.
**Learn more:** APIs, HTTP and auth (planned), Browser and web platform (planned), [Frontend system design](../../../04-advanced/11-frontend-system-design.md).

### R8-SD-009 (Medium) Design an e-commerce listing, cart and checkout (full worked answer)
**Answer:**

**Requirements.** A listing page with search, filters and sorting; a product page with variants (size, colour) and reviews; a cart; a multi-step checkout. Non-functional: listing and product pages must be indexable and fast, prices must be correct, checkout must be reliable and accessible, and money must never be charged twice.

**Rendering strategy.** Listing and product pages: server rendering, static generation or incremental regeneration, so crawlers see content and the first paint is fast. Cache them at the CDN, and fetch price and stock separately if they change faster than the page. Cart and checkout: behind a session, no SEO need, interactive. The server stays the source of truth for prices and totals.

**Component tree.**

```text
<App>
  <Header> <SearchBar /> <CartIcon count /> </Header>
  <ListingPage>
    <FilterPanel facets />        drawer on mobile
    <SortSelect />
    <ProductGrid> <ProductCard /> xN </ProductGrid>
    <Pagination />
  <ProductPage> <Gallery /> <PriceBlock /> <VariantPicker /> <AddToCart /> <Reviews />
  <CartDrawer> <CartLine qty /> <OrderSummary /> </CartDrawer>
  <Checkout> steps: Address, Shipping, Payment, Review </Checkout>
```

**State.** Filters, sort and page live in the URL (shareable, back button works, crawlable). The cart is server state. A logged-in user has a server cart. A guest has a cart tied to a cookie, merged into the account at login. The client cache mirrors it, and quantity changes are optimistic with rollback. Checkout step data is form state, validated with a schema. Never store card data: use the payment provider's hosted fields or redirect, so card numbers never pass through your code.

**API shape.**

```text
GET    /api/products?category=shoes&brand=a,b&sort=price_asc&page=2
POST   /api/cart/items          { productId, variantId, qty }
PATCH  /api/cart/items/:lineId  { qty }
POST   /api/orders              header: Idempotency-Key: <uuid>
```

```json
{ "items": [ { "id": "s1", "name": "Runner", "price": { "amount": 8900, "currency": "USD" } } ], "facets": { "brand": [ { "value": "a", "count": 14 } ] }, "total": 212 }
```

Money is an integer in minor units (cents) with a currency code, never a floating-point number.

**Key decisions and trade-offs.**
- Pagination versus infinite scroll for the listing: pagination is crawlable, shareable and keeps the footer reachable. Infinite scroll or a "Load more" button can increase browsing but makes back navigation and accessibility harder.
- When a filter changes, keep the old results visible while the new ones load (a transition or previous-data placeholder) to avoid flicker.
- Double charge: the client sends one `Idempotency-Key` per checkout attempt and disables the button. The server returns the same result for a repeated key.
- Re-validate stock and price at checkout. If something changed, tell the user clearly.

**Edge cases.** Out of stock after adding, price changed, no variant selected, quantity limits, coupon errors, session expiry mid-checkout, payment failure or a redirect for extra authentication, the back button after payment, currency and number formats, taxes.

**Performance.** Prioritise the first product images (they are likely the Largest Contentful Paint element) and lazy-load the rest. Use a skeleton grid with reserved space. Code-split checkout. Prefetch a product page when the user hovers or the card nears the viewport. Defer third-party scripts such as analytics and chat widgets, because they hurt interaction speed.

**Accessibility.** Filters are checkbox groups inside `fieldset` with `legend`. The result count is announced in a polite live region. A drawer traps focus and returns it on close. After "Add to cart", announce it (live region) and move focus sensibly. Form errors are linked with `aria-describedby`. The step indicator uses `aria-current="step"`.

**If asked to scale it.** Cache aggressively at the edge, use a search service for facets, add a backend-for-frontend layer that merges several services into one response, fail soft (a broken recommendations row simply disappears), and prepare static fallbacks for sale peaks.

**Why it matters / follow-up:** "What if the price on the cart page differs from the listing?" and "How do you A/B test the checkout?".
**Learn more:** [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md), [Forms with libraries](../../../03-intermediate/04-forms-with-libraries.md), practice: [19-shopping-cart-reducer](../../../practice-app/exercises/react/19-shopping-cart-reducer/README.md), [20-multi-step-form](../../../practice-app/exercises/react/20-multi-step-form/README.md).

### R8-SD-010 (Medium) Design a video player UI and home page (outline)
**Answer:**
1. **Scope:** play and pause, seek bar, volume, fullscreen, captions, quality choice, keyboard shortcuts, resume position; plus a browse page made of horizontal rows.
2. **Architecture:** wrap the native `<video>` element with your own controls. The element is the source of truth for time, buffering and volume. React mirrors it through events. Do not re-render the whole player on every `timeupdate`: update the seek bar through a ref or a CSS variable, or throttle it.
3. **Streaming:** adaptive bitrate streaming cuts the video into short segments at several qualities, and the player picks a quality from the measured bandwidth. HLS and MPEG-DASH are the common formats, played through Media Source Extensions with a library such as hls.js (Safari plays HLS natively).
4. **Decisions:** lazy-load the player code, show a poster image for fast first paint, use `preload="metadata"`, autoplay only muted and when visible (browser autoplay rules block unmuted autoplay), captions through `<track>`. On the home page, lazy-load rows and use horizontal scrolling lists with image placeholders.
5. **Accessibility and metrics:** labelled buttons, the seek bar as `role="slider"` with `aria-valuenow` and `aria-valuetext`, keyboard shortcuts that do not clash with the page, captions always available. Track time to first frame and rebuffering.

**Why it matters / follow-up:** "How do you resume where the user stopped?" (save progress every few seconds and on pause).
**Learn more:** Browser and web platform (planned), [useRef](../../../02-hooks/04-useref.md).

### R8-SD-011 (Hard) Design a collaborative document editor (full worked answer)
**Answer:**

**Requirements.** Many users edit the same document at once. Everyone sees changes quickly, sees other cursors and selections (presence), can keep typing offline, has per-user undo, can comment, and respects view, comment and edit permissions. Typing must never wait for the network.

**Component tree.**

```text
<DocPage>
  <Toolbar role="toolbar" />
  <Editor>                      editor framework view
    <Blocks /> <RemoteCursors />
  <PresenceBar avatars />
  <CommentsSidebar />
  <ConnectionStatus />          "Saved", "Offline, will sync"
Sync layer (no UI): local document model + change log + WebSocket client + IndexedDB persistence
```

**The core problem.** Two people change the same place at the same time. Both edits must survive and everyone must end with the same text (eventual consistency). Two main approaches:
- **Operational Transformation (OT):** a central server orders the operations, and each operation is transformed against concurrent ones. Proven in large products, but hard to implement correctly.
- **CRDT (conflict-free replicated data type):** a data structure designed so that applying the same set of changes in any order gives the same result. It works well offline and peer to peer, and the server can be a simple relay plus storage. The cost is extra metadata that grows over time and needs compaction. Libraries such as Yjs and Automerge exist.

In an interview, explain both, then say: "I would use a CRDT library and an existing editor framework with a collaboration binding, instead of writing my own."

**Data flow.** Local edit: apply to the local model at once, render, and send the change over the socket. Remote change: receive, merge into the model, and update only the changed nodes in the view. Persist the model locally (IndexedDB) so a reload or a flaky network loses nothing.

**API and protocol.**

```text
GET /api/docs/:id                    snapshot + version
WS  /ws/docs/:id                     sync and presence
```

```json
{ "type": "update", "docId": "d1", "update": "<binary change, base64>" }
```

```json
{ "type": "awareness", "user": { "id": "u2", "name": "Ana", "color": "#2a6" }, "cursor": { "anchor": "...", "head": "..." } }
```

Load a snapshot, then apply the updates since its version. The server stores updates and compacts them into new snapshots from time to time.

**Key decisions and trade-offs.**
- Presence (cursors, selections, who is online) is temporary data. Do not save it in the document history. Throttle its updates, and expire it when a user disconnects.
- Store cursor positions as positions relative to the document structure, not as plain character offsets, so they stay correct when other people insert text before them.
- Undo and redo apply to the current user's own changes only.
- Save continuously. Show a status ("Saved") instead of a Save button.
- The document model is a tree of blocks with marks, not raw HTML.

**Edge cases.** Hours offline then a large merge on reconnect, reconnect storms (backoff), permission revoked during a session (the server rejects, the UI turns read-only), two users deleting the same text, huge paste, a 100,000-word document (render only visible blocks), input method composition while remote changes arrive, schema upgrades of old documents, pasted HTML (sanitize), comment anchors that must move with the text.

**Performance.** Apply remote changes as small transactions, not full re-renders. Batch network messages. Throttle presence to a few updates per second. Load comments and heavy toolbar parts lazily. Use a web worker for expensive merges if profiling shows a need.

**Accessibility.** The editing surface needs a role and a name (`role="textbox"`, `aria-multiline`, `aria-label`). The toolbar uses a roving tabindex. Show collaborator names, not only colours. Announce "Ana joined" politely, never every cursor move. Document the keyboard shortcuts.

**If asked to scale it.** Route each document to one server room (shard by document id). Compact the update log into snapshots. Cap the number of active editors and give large audiences a read-only live view. Show only the first N presence avatars.

**Why it matters / follow-up:** "How do you handle conflicting formatting?" and "What happens if the socket drops for an hour?".
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), Browser and web platform (planned), Advanced patterns (planned).

### R8-SD-012 (Medium) Design a real-time dashboard or trading UI (outline)
**Answer:**
1. **Scope:** many widgets (KPI numbers, charts, tables), global filters such as the time range, live updates for some widgets, per-user layout, permissions.
2. **Architecture:** `DashboardShell`, then `FilterBar` (filters live in the URL), then `WidgetGrid`, then `Widget`. Each widget fetches its own data with the shared filters and has its own loading state, error boundary and Suspense boundary, so one failure does not break the page.
3. **Data and real time:** the server aggregates, and the client never receives millions of raw rows. Use SSE or WebSocket for the few widgets that need live data and polling for the rest. Apply updates in batches (at most once per frame or once per second) to avoid a render storm, keep a bounded window of points, and pause updates when the tab is hidden.
4. **Charts:** SVG is fine for a few thousand points and is easy to make accessible. Canvas is faster for many points but needs your own accessibility layer. Downsample large series, and lazy-load the chart library.
5. **Traps:** a stale-data indicator ("updated 5 s ago"), chart text alternatives or a "view as table" switch, not using colour alone, and only rendering widgets that are on screen.

**Why it matters / follow-up:** "A number flickers 50 times a second, what do you do?" (batch and format-throttle it).
**Learn more:** [Performance optimization](../../../04-advanced/02-performance-optimization.md), [Error boundaries, portals and friends](../../../03-intermediate/05-error-boundaries-portals-and-friends.md).

### R8-SD-013 (Medium) Design a notification system with history and live updates (full worked answer)
**Answer:**

**Requirements.** A bell icon with an unread badge, a panel with history (paginated), mark as read and mark all as read, live new notifications, optional toasts, preferences, and consistent state across tabs. Stretch: push notifications when the tab is closed.

**Component tree.**

```text
<NotificationProvider>          owns the connection and the store
  <NotificationBell unreadCount />
  <NotificationPanel>           popover
    <Tabs: All | Unread />
    <NotificationList>          paginated, virtualized when long
      <NotificationItem read /> xN
    <MarkAllReadButton />
  <ToastRegion />               live region
```

**Data model.** A notification is `{ id, type, actor, target: { type, id, url }, data, createdAt, readAt, groupKey }`. The unread count comes from the server as its own number, because the loaded list is only one page and cannot give the true count.

**API shape.**

```text
GET  /api/notifications?cursor=&limit=20&unread=true
GET  /api/notifications/unread-count
POST /api/notifications/:id/read
POST /api/notifications/read-all
GET  /api/notifications/stream        (text/event-stream)
```

```json
{ "type": "notification.new", "data": { "id": "n42", "type": "comment", "createdAt": "2026-11-10T09:00:00Z", "readAt": null } }
```

**Key decisions and trade-offs.**
- Live transport: SSE fits well because updates flow one way, it reconnects by itself, and it can resume with `Last-Event-ID`. A WebSocket is better if one already exists for other features. Polling every 30 to 60 seconds (slower when the tab is hidden) is the simple fallback.
- On a new event: increase the count, prepend to the list if the panel is open (otherwise mark the list stale so it refetches on open), and show a toast only if the user's settings allow it.
- Mark as read is optimistic with rollback. "Mark all as read" sets the count to zero at once and reconciles with the server.
- Group similar items ("5 people liked your post") by `groupKey`, on the server or the client.
- Several tabs: use `BroadcastChannel` to share read state, or let only one tab hold the connection.

**Edge cases.** Duplicates after reconnect (de-dupe by id), bursts (batch and cap the toasts), deleted targets, counts above 99 shown as "99+", relative times such as "5 min ago" (use `Intl.RelativeTimeFormat` and refresh them), offline, and the browser permission prompt for push, which must be requested after a user action, never on page load.

**Performance.** Open one connection per app, not per component. Load the panel code on first open. Virtualize long history. Batch store updates.

**Accessibility.** The bell button's name includes the count ("Notifications, 3 unread"). The panel manages focus and closes on Escape. New items are announced in a polite live region, but not every one during a burst. Toasts stay long enough to read and pause on hover and focus. Do not show unread state by colour alone.

**If asked to scale it.** Add web push through a service worker (needs opt-in), per-channel preferences, digests instead of many separate items, and server-side rate limits and fan-out.

**Why it matters / follow-up:** "How do you not lose a notification during a reconnect?" (resume from the last event id, and refetch the count).
**Learn more:** APIs, HTTP and auth (planned), Browser and web platform (planned), practice: [31-toast-system](../../../practice-app/exercises/react/31-toast-system/README.md).

### R8-SD-014 (Medium) Design a streaming AI chat UI (full worked answer)
**Answer:**

**Requirements.** The user sends a prompt and the answer appears token by token. Stop and regenerate buttons, copy, edit the last prompt, a conversation list with history, formatted output (markdown and code blocks), error and rate-limit handling. Non-functional: the first token appears fast, the page stays smooth while text streams, and secrets stay safe.

**Architecture.** Browser, then your own backend, then the model provider. The provider API key lives only on your server. The browser never sees it, and an exposed key can be stolen and abused. Your backend also checks the user session, validates and limits input size, rate-limits per user, and logs usage.

```text
Browser <-> your /api/chat (auth, limits) <-> model provider (key on server)
```

**Component tree.**

```text
<ChatPage>
  <ConversationSidebar />
  <MessageThread>               scroll container
    <UserMessage />
    <AssistantMessage status="streaming | done | error | stopped">
      <MarkdownView text />     finished blocks are memoized
      <MessageActions>          Copy | Regenerate | Edit
  <JumpToLatestButton />
  <PromptInput>                 auto-growing textarea, Send or Stop button
```

**Transport.** The response is streamed over HTTP. Server-Sent Events use the `text/event-stream` format, but the browser `EventSource` can only make GET requests and cannot set custom headers or a body. Most chat UIs therefore send a POST with `fetch` and read the response body as a stream. A WebSocket is possible, but it is more than a one-way stream needs.

**API shape.**

```text
POST /api/chat        body: { conversationId, message }
```

```text
data: {"type":"delta","text":"Hel"}

data: {"type":"delta","text":"lo"}

data: {"type":"done","messageId":"m9"}
```

**Reading the stream.**

```js
const controller = new AbortController();
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversationId, message }),
  signal: controller.signal,
});
if (!res.ok || !res.body) throw new Error('Request failed');

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split('\n\n');
  buffer = events.pop(); // keep the unfinished event for the next chunk
  for (const event of events) {
    const line = event.split('\n').find((l) => l.startsWith('data: '));
    if (!line) continue;
    const payload = JSON.parse(line.slice(6));
    if (payload.type === 'delta') pushText(payload.text);
  }
}
```

**What happens, step by step:** the buffer collects bytes until a blank line ends an event, `{ stream: true }` keeps a multi-byte character that was split across two chunks intact, and `pushText` stores the text without rendering yet. `controller.abort()` makes `read()` reject with an `AbortError`: catch it, keep the partial text, and mark the message "stopped".

**State and throttled rendering.** Keep messages in a reducer: `{ id, role, content, status }`. A `useChatStream` hook starts the request, collects incoming text in a ref, and flushes it into state at most once per animation frame (or every 50 ms or so). This avoids a React render for every token. Cancel the request in the effect cleanup when the component unmounts.

**Key decisions and trade-offs.**
- Regenerate removes the last assistant message and resends the same history. A richer design keeps several versions of an answer and lets the user switch.
- Partial markdown looks broken while streaming (an unclosed code fence, half of a bold marker). Split the text into blocks, memoize finished blocks, and re-render only the last one. Load the code highlighter lazily and run it when a block completes.
- Scroll anchoring: follow the stream only while the user is near the bottom. If they scroll up, stop following and show "Jump to latest".
- Model output is untrusted input. Render markdown with raw HTML disabled, sanitize it, and be careful with links and images (an image URL can leak data to another server).

**Edge cases.** Network drop in the middle (keep the partial text, offer Retry or Continue; true resume needs server support), 429 rate limit (show the retry time), a second send while streaming (disable Send, show Stop), very long answers, user navigates away (abort), blocked content messages, empty prompt.

**Performance.** Throttled state updates, memoized finished messages, lazy code highlighting, windowing of long threads, and keeping time to first token low (the server starts streaming as soon as the provider sends the first token, and no proxy in between buffers the response).

**Accessibility.** Do not make the streaming text a live region: a screen reader would try to read every token. Set `aria-busy` while streaming and announce "Response started" and "Response complete" in a polite live region. Keep focus in the input. Label the Stop and Copy buttons. Enter sends and Shift+Enter adds a line. Stop animations for users who prefer reduced motion.

**If asked to scale it.** Save history on the server and page it. Store the partial output on the server with a stream id so a refresh can reattach. Add per-user cost limits and queueing, and track time to first token, tokens per second and error rate.

**Why it matters / follow-up:** "Where is the key?" is almost always asked. Also: "How do you test streaming?" (a fake stream, fake timers).
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), [Security and i18n](../../../04-advanced/10-security-and-i18n.md), [useReducer](../../../02-hooks/06-usereducer.md), [Concurrent React and Suspense](../../../04-advanced/03-concurrent-react-and-suspense.md).

### R8-SD-015 (Medium) Design a Kanban board (outline)
**Answer:**
1. **Scope:** columns of cards, drag between and within columns, add and edit cards, saved order, maybe live updates from other users.
2. **Data:** normalised: `columns` by id with `cardIds` arrays, `cards` by id. A move removes an id from one array and inserts it into another. On the server, store a rank per card (a fractional number or a sortable string between its neighbours) so a move updates one record, not every card in the column; rebalance the ranks now and then.
3. **Drag and drop:** the native HTML5 drag API is weak on touch and accessibility. Use pointer events or a library built for it (for example dnd-kit). Move the dragged card with `transform`, not layout properties. Update the UI at once, then `PATCH /api/cards/:id { columnId, afterId }`, and roll back on failure.
4. **Accessibility:** offer a keyboard way to move a card (select with Space, arrows to move, announce the new position in a live region) and a "Move to..." menu for screen readers and touch.
5. **Traps:** two users moving the same card (last write wins, or the server rejects a stale version and the client refetches), long columns (virtualize), and re-rendering every card on every pointer move (memoize cards).

**Why it matters / follow-up:** "How do you persist order cheaply?" (rank between neighbours).
**Learn more:** [useReducer](../../../02-hooks/06-usereducer.md), [State management](../../../03-intermediate/06-state-management.md), practice: [25-kanban-board](../../../practice-app/exercises/react/25-kanban-board/README.md).

### R8-SD-016 (Medium) Design comments with real-time updates and optimistic UI (outline)
**Answer:**
1. **Scope:** threaded replies, post, edit, delete, like, other people's comments appear live, sort by newest or top.
2. **Model:** a flat normalised list with `parentId` is easier to update than a nested tree. Build the tree for rendering, limit visible depth (then show "Continue this thread"), and load replies on demand.
3. **Optimistic flow:** create a temporary client id, insert the comment at once with status "sending", replace it with the server version on success, and show "failed, retry" on error. React's `useOptimistic` fits this: the setter must be called inside an Action or transition, and the optimistic value goes away when the Action ends, so the real data must be in state by then. A query-cache mutation with rollback is the other common way.
4. **Real time:** SSE or a WebSocket sends `comment.created`. De-dupe by id so your own echo does not appear twice. Do not shift the layout under the reader: show a "3 new comments" button for new top-level items.
5. **Traps and accessibility:** deleted parents keep a "[deleted]" placeholder to keep the thread shape; sanitize text; nested lists, `aria-expanded` on collapse buttons, a polite live region for new items; keep the draft when the user navigates away.

**Why it matters / follow-up:** "What if the server rejects the comment?"
**Learn more:** [React 19 and newer](../../../04-advanced/04-react-19-and-newer.md), practice: [28-nested-comments](../../../practice-app/exercises/react/28-nested-comments/README.md).

### R8-SD-017 (Medium) Design a search results page with facets (outline)
**Answer:**
1. **Scope:** a query box, a results list, facets (filters) with counts, sorting, pagination, a shareable URL, and a filter drawer on mobile.
2. **State:** the URL is the source of truth: `?q=shoe&brand=a&brand=b&price=10-50&page=2`. Components read from it and write to it. Use `replace` while typing and `push` for a committed change, so the back button stays useful.
3. **Data:** the API returns the results and the facet counts for the current filters, so counts update after each choice. Debounce text input, cancel or ignore stale requests, and keep the previous results visible (dimmed) while loading to avoid flicker.
4. **Rendering:** server-render the first results if the page is public and needs SEO. Show a skeleton while loading, and an empty state with tips or a "did you mean" suggestion when there is nothing.
5. **Accessibility and traps:** facets are checkbox groups in `fieldset` with `legend`, the result count is announced politely, the drawer traps focus, "Clear all" is easy to find, long facet lists need an inner search or "show more", and zero-result queries should be logged for analytics.

**Why it matters / follow-up:** "How do you stop the page from jumping when counts change?"
**Learn more:** [React Router](../../../03-intermediate/03-react-router.md), [Data fetching](../../../03-intermediate/02-data-fetching.md).

## Platform topics

### R8-SD-018 (Hard) Design a design system used by several products (full worked answer)
**Answer:**

**Requirements.** Shared, accessible components and design tokens used by several teams and products. Needs: theming (brands, dark mode), documentation, versioned releases, a way to migrate users when things change, good performance (small bundles), and a way to measure adoption. Ask first: how many teams, which frameworks, how much freedom may a team have, and who owns the system.

**Layers.**

```text
tokens        raw values (red-600, space-4) and semantic names (color-text-danger)
primitives    Box, Stack, Text, Icon (low-level building blocks)
components    Button, Input, Select, Dialog, Tabs, Table (accessible, themable)
patterns      FormField, PageHeader, EmptyState (compositions of components)
docs site     usage, props, examples, accessibility notes, do and do not
tooling       lint rules, codemods, visual regression tests, token sync with design files
```

**Tokens and theming.** Components use semantic tokens only (`color-text-danger`), and a theme maps each semantic token to a raw one. Changing the theme means swapping the mapping, not editing components. Ship tokens as CSS custom properties. They work in any framework, switch at runtime (dark mode, white-label brands), and avoid runtime styling cost. Set them on `:root` so portaled content such as dialogs inherits them.

**Component API principles.**
- Prefer composition (compound components such as `Tabs`, `Tabs.List`, `Tabs.Panel`) over one component with 40 props.
- Support controlled and uncontrolled use.
- Pass `ref` and extra props through to the root element (in React 19 `ref` is a normal prop).
- Give safe defaults and a small set of variants. Allow `className` as an escape hatch, but track its use.
- Build on a headless library (behaviour and accessibility without styles) or write the behaviour yourself, and decide which at the start: a headless base is faster and safer, and costs a dependency and less control.

**Packaging and releases.**
- A monorepo with packages for tokens, components and icons. Ship ES modules with an `exports` map, `sideEffects: false` and per-component entry points so bundlers can tree-shake. Ship type definitions. Declare React as a peer dependency so apps do not get a second copy.
- Semantic versioning: breaking changes need a major version. A tool such as Changesets writes the changelog and bumps versions.
- Deprecation policy: warn in development for one major version, provide a codemod (an automatic code rewrite) to migrate, then remove.
- Release candidates or canary builds let teams try changes early.

**Quality.** Unit tests for behaviour with Testing Library, automated accessibility checks (axe) plus keyboard tests, visual regression screenshots per component and theme, and type tests. Every component has a story page that doubles as a test fixture.

**Governance.** One core team with contributions from product teams (a federated model), an RFC process for new components, support hours, and adoption metrics: the share of UI built from system components, the number of one-off copies, and open issues.

**Edge cases.** Right-to-left layouts, density options, focus styles on every theme, server rendering (`useId` for ids), two versions of the system on one page (share it as a singleton, or namespace CSS), custom fonts loading without layout shift.

**Performance.** Tree-shaking, no barrel-file bundle bloat, icons as individual modules or a sprite, zero-runtime styling, heavy components (date picker, editor) as separate entry points, and a bundle size budget enforced in CI.

**Accessibility.** Build it in: correct roles and labels, keyboard support, focus management for overlays, tokens that meet contrast (4.5 to 1 for normal text, 3 to 1 for large text), and respect for reduced motion. Teams then get accessibility by default.

**If asked to scale it.** More teams means stricter release automation, a token pipeline from design files, multiple brands and themes, and a decision about other frameworks: framework-agnostic tokens plus thin wrappers per framework, or Web Components. Name the cost: wrappers double the testing work.

**Why it matters / follow-up:** "How do you roll out a breaking change to 30 teams?" (deprecate, codemod, canary, deadline).
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), [Component patterns](../../../03-intermediate/01-component-patterns.md), [Styling](../../../03-intermediate/07-styling.md), [Accessibility](../../../04-advanced/09-accessibility.md).

### R8-SD-019 (Hard) Design a micro-frontend architecture (outline)
**Answer:**
1. **What and when:** micro-frontends split one large app into parts that separate teams build and deploy independently. The reason must be organisational (many teams blocked by one release train), not fashion. For one or two teams, a well-structured monorepo is simpler, and you should say so.
2. **Integration options:** build-time packages (simple, but all parts release together), run-time loading with module federation (a bundler feature that loads another build's modules at run time and can share libraries), iframes (strong isolation, poor routing, sizing and accessibility), Web Components, or composition on the server or the edge.
3. **Shape:** a shell app owns routing, authentication, layout and the design system. Each team's part is loaded per route. Share React as a single instance (two copies break hooks and context). Keep shared state minimal: the URL, the session from the shell, and a small event contract.
4. **Costs:** duplicated dependencies and extra requests, inconsistent look without a shared design system, version skew between parts, harder end-to-end testing (add contract tests), CSS leaks (namespacing, CSS Modules or Shadow DOM), and per-part error monitoring.
5. **Resilience:** wrap each remote in an error boundary with a fallback, set a load timeout, version the contract between parts, and keep a rollback per part.

**Why it matters / follow-up:** "When would you not do this?" and "How do you keep the user experience consistent?".
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), Tooling: Vite, ESLint, build (planned).

### R8-SD-020 (Medium) Design a monorepo and frontend platform (outline)
**Answer:**
1. **Scope:** `apps/web`, `apps/admin`, and shared `packages/ui`, `packages/utils`, `packages/config` in one repository, with CI, releases and preview deployments.
2. **Tooling:** package-manager workspaces link local packages. A task runner such as Turborepo or Nx understands the dependency graph, runs only what changed, and caches results (locally and remotely), so CI stays fast.
3. **CI:** run lint, type-check, test and build only for affected packages, in parallel, with a shared remote cache. Share ESLint, TypeScript and test configs as packages.
4. **Boundaries and releases:** enforce who may import what with lint rules, and set code owners per folder. Shared libraries use independent versions (Changesets) or one fixed version, and apps deploy on their own. Feature flags separate deploying code from releasing a feature, and preview deployments per pull request let people review the real result.
5. **Traps:** over-sharing code that should stay local, circular dependencies, slow installs, one team blocking CI for all, and a missing owner for the platform itself.

**Why it matters / follow-up:** "How do you stop CI from taking an hour?" (affected-only runs plus caching).
**Learn more:** Tooling: Vite, ESLint, build (planned), [Frontend system design](../../../04-advanced/11-frontend-system-design.md).

### R8-SD-021 (Medium) Design an A/B testing system on the frontend (outline)
**Answer:**
1. **Scope:** show variant A or B, log who saw what, and let analysts decide. The assignment must be stable (the same user always gets the same variant) and must not flicker.
2. **Assignment:** compute a bucket from a hash of the user id plus the experiment key, for example `hash(userId + key) % 100`, and map ranges to variants. For anonymous users, use a stable id in a cookie. Assign on the server or at the edge so the first HTML already contains the right variant. A client-side swap after load causes a flash of the original content.
3. **Client:** fetch the flag configuration early (or embed it in the page), expose it through a provider and a hook such as `useExperiment("checkout-cta")`, and use the control variant if the flag service is down. Log an exposure event once, when the user actually sees the variant, with the experiment key and variant.
4. **What breaks results:** flicker, a traffic split that differs from the plan (a sample ratio mismatch usually signals a bug), CDN caching that serves one variant to everyone (vary the cache by the assignment), overlapping experiments that interact, stopping early on a lucky streak, and bots in the data.
5. **Safety and cleanup:** guardrail metrics (errors, latency, Core Web Vitals), a kill switch, a gradual ramp (1 percent, 10 percent, 50 percent), and removing the losing code and the flag when the experiment ends.

**Why it matters / follow-up:** "How do you avoid the flash of the wrong variant?" (decide before the first render).
**Learn more:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), [SSR and Server Components](../../../04-advanced/05-ssr-and-server-components.md).

### R8-SD-022 (Medium) Design internationalization (i18n) for a large app (outline)
**Answer:**
1. **Scope:** many languages, local formats for numbers, dates and currency, plural rules, right-to-left (RTL) layouts, a runtime language switch, and search-engine friendly locale URLs.
2. **Messages:** keep text in catalogs per locale (JSON), looked up by key through a library (for example react-i18next, FormatJS or Lingui). Use a message format that supports plurals and choices, such as ICU (`{count, plural, one {# item} other {# items}}`). Never build sentences by joining strings, because word order differs between languages.
3. **Formatting:** use the built-in `Intl` objects: `NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `PluralRules`, `Collator` (sorting) and `ListFormat`. Store dates in UTC and format them in the user's time zone.
4. **Loading:** split catalogs by locale (and by feature) and load them on demand. Pick the locale from the URL (`/fr/...`), then the user setting, then the `Accept-Language` header, then a default. Set `lang` and `dir` on `<html>`, and add `hreflang` links for search engines. Server rendering needs the locale on the server.
5. **Layout:** use CSS logical properties (`margin-inline-start`) so RTL works, flip directional icons, allow text to grow (some languages are much longer), avoid text inside images, and test with pseudo-localization (fake long accented strings).

**Why it matters / follow-up:** "How do you handle a missing translation?" (fall back to the default language and report it).
**Learn more:** [Security and i18n](../../../04-advanced/10-security-and-i18n.md), HTML, CSS and browser basics (planned).

### R8-SD-023 (Hard) Design offline support for a web app (outline)
**Answer:**
1. **Scope:** decide what must work offline: reading cached content only, or also creating and editing data that syncs later. Show clear connectivity and sync status.
2. **App shell and caching:** a service worker (a background script that can intercept network requests) plus the Cache API stores the app shell and static files. Use cache-first for versioned static assets, network-first with a cache fallback for pages and API reads, and stale-while-revalidate for content where a slightly old answer is fine. A library such as Workbox helps with precaching.
3. **Data and writes:** keep structured data in IndexedDB (not localStorage: it is small, synchronous and string-only). The UI reads from the local store. Writes go into a persistent outbox queue and are sent when the network returns, each with an idempotency key so a retry cannot create a duplicate. The Background Sync API can help but has limited browser support, so treat it as an extra.
4. **Conflicts:** last-write-wins is simple but can lose data. A better way is to send the version the edit is based on, and let the server answer with a conflict (409) so the client merges or asks the user. For text, a CRDT is the robust option.
5. **Traps:** `navigator.onLine` only says a network interface exists, not that the internet works, so detect failures from real requests. A new deploy can leave users on an old cached shell, so add an "update available" flow. Watch storage quotas, handle token expiry while offline, and test with the browser's offline mode.

**Why it matters / follow-up:** "How do you avoid showing stale data as if it were fresh?" (show a "last updated" time).
**Learn more:** Browser and web platform (planned), APIs, HTTP and auth (planned).

### R8-SD-024 (Hard) Design a migration strategy for a large frontend (outline)
**Answer:**
1. **Goal:** move to a new stack (Create React App, which is deprecated, to Vite or Next.js; JavaScript to TypeScript; classes to hooks) while features keep shipping. Start with the why and a measurable outcome (build time, bundle size, error rate), not the tool.
2. **Do not rewrite everything at once:** a big-bang rewrite usually stalls and ships nothing for months. Use the strangler pattern: let old and new run side by side and move one route or module at a time, with the old pages served until each is replaced.
3. **Safety net first:** add tests for the critical flows, end-to-end smoke tests, error monitoring and performance dashboards before moving code, so you can see a regression.
4. **Tactics:** bundler swaps change config, environment variable prefixes (`REACT_APP_` becomes `VITE_`), `index.html` location and the test runner. For TypeScript, allow JavaScript files first, convert leaf modules first, turn on strict checks folder by folder, and cap the number of `any`. Use codemods for mechanical changes. Roll out behind feature flags or percentage rollouts, compare metrics, and keep a rollback.
5. **Finish line:** publish progress (percent migrated), set an end date, block new code in the old style with lint rules, keep URLs and SEO equal, train the team, and update the stakeholders regularly. Two stacks forever is the real failure.

**Why it matters / follow-up:** "How do you measure that the migration helped?" (compare the goal metrics before and after).
**Learn more:** Tooling: Vite, ESLint, build (planned), [Next.js essentials](../../../04-advanced/06-nextjs-essentials.md), [TypeScript with React](../../../03-intermediate/08-typescript-with-react.md).
