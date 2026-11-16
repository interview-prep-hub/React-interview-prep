# Round 8 - Frontend System Design: Prompts

**How to use this file:** pick one prompt, set a timer for 45 minutes (30 if you are short on time), and design it out loud on paper or in a drawing tool. Start by asking questions, state your assumptions, then draw boxes and name trade-offs. Answer the three probes at the end as if the interviewer asked them. Only then open the answers file and score yourself with the rubric in the round README. Do the platform topics last, they are mostly asked at senior level.
**Answers:** [answers/01-prompts.md](../answers/01-prompts.md)  (do not open until you have tried)
**Learn first:** [Frontend system design](../../../04-advanced/11-frontend-system-design.md), [Performance optimization](../../../04-advanced/02-performance-optimization.md), [Accessibility](../../../04-advanced/09-accessibility.md), [State management](../../../03-intermediate/06-state-management.md), [Data fetching](../../../03-intermediate/02-data-fetching.md), APIs, HTTP and auth (planned)

## UI components

**R8-SD-001 (Medium)** Design an autocomplete (typeahead) search box.
Scope: a text input that shows suggestions from a server while the user types, with mouse and keyboard selection.
- What happens when responses arrive out of order, or the user types faster than the network?
- How do you make it work with a keyboard and a screen reader?
- How do you cut the number of requests, and what do you cache?

**R8-SD-002 (Medium)** Design an infinite scroll list.
Scope: a long list that loads the next page when the user nears the bottom.
- How do you stop the DOM from growing without limit?
- How do you restore the scroll position when the user opens an item and comes back?
- How does a keyboard user reach the footer?

**R8-SD-003 (Medium)** Design an image carousel (gallery).
Scope: slide through images with buttons, dots and swipe, with optional autoplay.
- Which images do you load first, and how do you avoid layout shift?
- How should autoplay behave so the carousel stays accessible?
- Would you use CSS scroll snap or a JavaScript transform, and why?

**R8-SD-004 (Medium)** Design a data table.
Scope: a table with sorting, filtering, pagination, row selection and a sticky header.
- When do you sort and filter in the browser, and when on the server?
- How do you handle 100,000 rows?
- How do you keep row selection correct across pages and filters?

**R8-SD-005 (Medium)** Design a modal (overlay) system.
Scope: open dialogs from anywhere in the app, stack them, and close them properly.
- How do you handle focus, the Escape key and page scrolling?
- Why use a portal or the native dialog element?
- What changes when two modals are open at the same time?

**R8-SD-006 (Hard)** Design a rich text editor.
Scope: an editor with bold, lists, links, images, undo and redo, and paste.
- Why is a raw contenteditable element hard to keep correct?
- Do you store HTML or a document model, and why?
- How do you stop script injection through pasted content?

## Product features

**R8-SD-007 (Medium)** Design a news feed (Facebook or Twitter style).
Scope: a feed with infinite scroll, posting, likes, comments preview and "new posts" notices.
- Cursor or offset pagination, and why?
- How do you build an optimistic like and roll it back on failure?
- What do you do when new posts arrive while the user is reading?

**R8-SD-008 (Hard)** Design a chat app (Messenger or Slack style).
Scope: conversation list, message thread, real-time send and receive, delivery status, typing indicator.
- WebSocket, Server-Sent Events or polling, and what are the trade-offs?
- How do you handle messages sent while offline or while the connection is re-forming?
- How do you keep the scroll position when older messages load at the top?

**R8-SD-009 (Medium)** Design an e-commerce product listing, cart and checkout.
Scope: a listing page with filters, a product page, a cart and a checkout flow.
- Which pages are server rendered, and why?
- Where does the cart live, and who is the source of truth for prices?
- How do you prevent a double charge when the user double clicks "Pay"?

**R8-SD-010 (Medium)** Design a video player UI and a video home page (Netflix or YouTube style).
Scope: play, seek, volume, captions, quality choice, and a browse page made of rows.
- What is adaptive bitrate streaming, and what does the frontend do for it?
- How do you keep the seek bar smooth without re-rendering all the time?
- How do browser autoplay rules affect your design?

**R8-SD-011 (Hard)** Design a collaborative document editor (Google Docs style).
Scope: many users edit one document at the same time and see each other's cursors.
- How do you merge two edits made at the same moment?
- How does it behave offline, and what happens on reconnect?
- Which data must be saved, and which data is only presence?

**R8-SD-012 (Medium)** Design a real-time dashboard or trading UI.
Scope: a page of charts, tables and numbers that update live, with global filters.
- How do you stop fast updates from causing a render storm?
- How do you stop one failing widget from breaking the page?
- SVG or canvas for the charts, and when?

**R8-SD-013 (Medium)** Design a notification system with history and live updates.
Scope: a bell icon with an unread count, a history panel, live new notifications and toasts.
- SSE, WebSocket or polling for the live part?
- How do you show a correct unread count when the list is paginated?
- How do you keep several browser tabs in sync?

**R8-SD-014 (Medium)** Design a streaming AI chat UI.
Scope: a chat where the answer appears token by token, with stop, regenerate and conversation history.
- How do you read a streamed response in the browser?
- How do you avoid a re-render for every token, and keep the scroll sensible?
- Where does the API key live, and what else must stay on the server?

**R8-SD-015 (Medium)** Design a Kanban board (Trello style).
Scope: columns of draggable cards whose order is saved.
- How do you store order so that moving a card changes as little data as possible?
- How do you support drag and drop with a keyboard?
- What happens when two users move the same card?

**R8-SD-016 (Medium)** Design comments with real-time updates and optimistic UI.
Scope: threaded comments where your comment appears instantly and other people's comments arrive live.
- How do you model replies in state?
- What does the optimistic flow look like when the request fails?
- How do you avoid moving the page under the reader when new comments arrive?

**R8-SD-017 (Medium)** Design a search results page with facets.
Scope: a results list with filters that show counts, sorting and pagination.
- Where does the filter state live, and why?
- How do you handle stale responses and flicker when filters change?
- How do you design the filter panel for mobile and for accessibility?

## Platform topics

**R8-SD-018 (Hard)** Design a design system used by several products.
Scope: shared components, design tokens and documentation used by many teams.
- How do you version and release without breaking other teams?
- How do you support themes, dark mode and more than one brand?
- How do you measure adoption and quality?

**R8-SD-019 (Hard)** Design a micro-frontend architecture.
Scope: split a large app into parts that different teams build and deploy on their own.
- When would you refuse to do this?
- How do the parts share React, the design system and the session?
- How do the parts talk to each other, and what happens when one fails to load?

**R8-SD-020 (Medium)** Design a monorepo and frontend platform.
Scope: several apps and shared packages in one repository, with CI and releases.
- How do you keep CI fast as the repo grows?
- How do you enforce boundaries between packages?
- How do you release a shared package safely?

**R8-SD-021 (Medium)** Design an A/B testing system on the frontend.
Scope: show variants to users, log what they see, and let a team decide which one wins.
- How do you assign users to variants so that it is stable and does not flicker?
- What can make the results wrong?
- How do you clean up after the experiment ends?

**R8-SD-022 (Medium)** Design internationalization (i18n) for a large app.
Scope: many languages, local formats for dates and numbers, and right-to-left layouts.
- How do you handle plurals and word order without joining strings?
- How do you load translations without slowing the first page?
- What changes in CSS and layout for right-to-left languages?

**R8-SD-023 (Hard)** Design offline support for a web app.
Scope: the app opens and is useful with no network, and syncs when the network returns.
- Which caching strategy for which kind of request?
- How do you queue writes, and how do you avoid duplicates on retry?
- How do you resolve a conflict between an offline edit and a server change?

**R8-SD-024 (Hard)** Design a migration strategy for a large frontend.
Scope: move a big app from Create React App to Vite or Next.js, or from JavaScript to TypeScript, without stopping feature work.
- Why not a big-bang rewrite, and what do you do instead?
- How do you prove each step is safe, and how do you roll back?
- How do you stop the migration from stalling halfway?
