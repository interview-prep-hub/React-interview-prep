# Security and Internationalisation

> **Level:** Advanced   **Time:** about 60 minutes   **Read first:** [SSR and Server Components](05-ssr-and-server-components.md), APIs, HTTP and auth for the frontend (planned)

Interviewers like to end a coding round with "what would you add for production?". Two answers come up every time: how you keep the app safe, and how you make it work for people who speak other languages. This lesson covers both. Examples marked "(sketch)" use a library or framework API that is not installed in the practice app. For every other example, the output shown is real: it was run with React 19.3.1, Vitest 5 and Node 24.

## What you will learn
- Explain how React escapes text, and name the places where it does not (raw HTML, URLs, JSON in HTML, third-party scripts).
- Choose where to keep a token and explain localStorage versus HttpOnly cookies.
- Tell XSS, CSRF and CORS apart, and use cookie flags and headers (SameSite, CSP, frame-ancestors) that help.
- Treat every Server Action as a public endpoint: authenticate, authorise, validate, and keep secrets off the client.
- Format numbers, dates, plurals and relative times with `Intl`, and never build sentences by joining strings.
- Set up locale detection, lazy loading, `lang` and `dir`, RTL-safe CSS and tests for a translated app.

## 1. The security mindset in one page
**Part 1 of 2: security.** The browser does not belong to you. A user, or an attacker using the user's browser, can open DevTools, edit your JavaScript, change requests and replay them. Three rules follow:

- The **server** decides. The frontend only makes things pleasant (UX).
- Everything you send to the browser is **public**: code, env values, props, API responses.
- Three kinds of attacker matter on the frontend: other **users** whose text you display (XSS), other **websites** that trick the visitor's browser (CSRF, clickjacking), and **code you install** (supply chain).

Good security is layers (defence in depth): React escaping, plus a sanitiser, plus a CSP, plus HttpOnly cookies, plus server checks. One mistake should not be a disaster.

## 2. XSS and how React helps
**XSS (cross-site scripting)** means an attacker's text is treated as code by your page. That code runs with the user's power: it can call your API as them and read anything JavaScript can read. It comes in three flavours: *stored* (saved in your database, such as a comment), *reflected* (comes back from the URL), and *DOM-based* (your own JavaScript writes it into the page).

```jsx
function Comment({ text }) {
  return <p>{text}</p>
}
// <Comment text={'<img src=x onerror="alert(1)">'} />
```

**What happens, step by step:**
1. JSX `{text}` becomes a text node. React never asks the browser to parse it as markup.
2. Running it gave this HTML: `<p>&lt;img src=x onerror="alert(1)"&gt;</p>`. There were 0 `img` elements; the user just sees the characters.
3. The same holds for attribute values such as `<a title={text}>`: the value cannot break out of its quotes. During server rendering React escapes the string instead.

So plain `{}` output is safe by default. React is safe because it escapes **text**, not because it understands **meaning**: it cannot know that a string is a dangerous URL or HTML you chose to inject.

**Common mistake:**
```jsx
<div dangerouslySetInnerHTML={{ __html: comment }} />  // wrong: text becomes HTML
ref.current.innerHTML = comment                         // wrong: same hole, no scary name
<div>{comment}</div>                                    // right
```

## 3. Where React does not protect you
### 3.1 `dangerouslySetInnerHTML`
The prop writes a string straight into `innerHTML`. I ran `{ __html: '<img src=x onerror="alert(1)">' }`: the result had 1 `img` element carrying `onerror="alert(1)"`. jsdom does not run it, but a real browser would, when the image fails to load. If you must show user HTML (a rich-text editor, a CMS), sanitise it with **DOMPurify**, which removes scripts, event attributes and dangerous URLs:

```jsx
import { useMemo } from 'react'
import DOMPurify from 'dompurify' // npm install dompurify

export function RichText({ html }) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```
(sketch) Rules: sanitise as late as possible and never edit the string afterwards. Tighten it with `{ ALLOWED_TAGS: ['b', 'i', 'a', 'p'], ALLOWED_ATTR: ['href'] }`. Keep DOMPurify updated, because sanitisers have had bypass bugs, and back it with a CSP. It needs a DOM, so on a Node server pair it with jsdom. Safer designs avoid HTML: use a Markdown renderer that does not allow raw HTML, or store content as structured data.

### 3.2 URLs
React 19.3.1 does block `javascript:` URLs: `<a href="javascript:alert(1)">` rendered with `href="javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"`. Treat that as a safety net, not a plan. Other schemes (`data:`) and other attributes need your own check. Parse the URL, do not match strings:

```js
export function safeHref(input) {
  try {
    const url = new URL(input, 'https://example.com')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? input : '#'
  } catch {
    return '#'
  }
}
// <a href={safeHref(user.website)} target="_blank" rel="noopener noreferrer">
```
**What happens:** `new URL` does what the browser does: it lowercases the scheme and strips spaces, tabs and newlines. So `' JaVaScRiPt:alert(1)'` and `'java\tscript:alert(1)'` both come back as `#` (run and confirmed), while `'java\tscript:...'.startsWith('javascript:')` is `false`, which is why string matching fails. `https://a.com/x`, `/relative` and `mailto:a@b.co` pass. A user-controlled `src` on an image is a tracking risk; never let users control the `src` of a script or iframe.

### 3.3 JSON inside server-rendered HTML
If you hand-write SSR and inline data as `<script>window.__DATA__ = ${JSON.stringify(data)}</script>`, a value containing `</script>` ends the script early and the rest runs as HTML. Escape `<`:

```js
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c')
// safeJson({ bio: '</script><script>alert(1)</script>' })
// {"bio":"</script><script>alert(1)</script>"}   (JSON.parse gives the original back)
```
Frameworks do this for you. If you roll your own server renderer, you must.

### 3.4 Third-party scripts
Any script you include (analytics, chat widgets, tag managers) runs with full power on your page. Add as few as you can, load them from a host you trust, and pin static files with Subresource Integrity so a tampered file is refused:
```html
<script src="https://cdn.example.com/lib.min.js" integrity="sha384-(hash of the file)" crossorigin="anonymous"></script>
```

## 4. CSP, Trusted Types and clickjacking
A **Content Security Policy (CSP)** is a response header that tells the browser which sources of script, style, images and frames are allowed. If XSS slips through, an inline `<script>` or a script from an unknown host is refused.

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```
1. `script-src 'self' 'nonce-...'`: only your own files and tags carrying this request's random nonce may run. The server must create a new nonce per response (frameworks can do this in server code; check your framework's CSP guide).
2. `object-src 'none'` and `base-uri 'self'` close two old bypasses.
3. `frame-ancestors 'none'` stops other sites from putting your page in an iframe. That is the defence against **clickjacking**, where an attacker overlays an invisible iframe of your site and tricks the user into clicking. Use `'self'` if you embed yourself. The older header is `X-Frame-Options: DENY`.
4. `frame-ancestors` only works as a real HTTP header, not in a `<meta>` tag. Roll a CSP out in report-only mode first.

**Trusted Types** (two lines): a browser feature, switched on by `require-trusted-types-for 'script'`, that rejects plain strings in dangerous sinks such as `innerHTML`; only objects made by an approved policy are accepted. React 19.3 stops converting such values to strings so they can reach the sink intact (reported in the release notes; I did not run it, as jsdom has no Trusted Types).

## 5. Cookies, CSRF and CORS
A cookie is a small value the browser stores and sends back **automatically** with every request to that site. The flags matter:

```text
Set-Cookie: __Host-session=9f8a1c; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600
```
- `HttpOnly`: JavaScript cannot read it, so XSS cannot copy it.
- `Secure`: sent only over HTTPS.
- `SameSite=Lax | Strict | None`: whether it is sent on requests started by *other* sites. Chrome treats a missing value as `Lax`, but set it explicitly. `None` needs `Secure`.
- The `__Host-` prefix forces `Secure`, `Path=/` and no `Domain`, which blocks sibling subdomains from overwriting it.

**Same-site is not same-origin.** An origin is scheme + host + port. A *site* is scheme + registrable domain. `app.example.com` and `api.example.com` are the same site but different origins. SameSite uses *site*; CORS uses *origin*.

**CSRF (cross-site request forgery).** You are logged in to `bank.com`. You open `evil.com`, which has a hidden form that POSTs to `bank.com/transfer`. Your browser attaches your cookie, so the bank thinks you did it. The attacker cannot read the response, but the damage is done. Defences:
1. `SameSite=Lax` (or `Strict`) cookies: the cookie is not sent on cross-site POSTs.
2. A CSRF token that the server checks on every state-changing request (a random value the attacker's page cannot read).
3. Check the `Origin` header on the server. Next.js does this for Server Actions by comparing `Origin` with `Host`; behind a proxy you list hosts in `serverActions.allowedOrigins`.
4. Never change data on a GET request.

**XSS versus CSRF:** XSS runs the attacker's code *on your site*, so it defeats every CSRF defence. CSRF runs no code on your site; it only makes the victim's browser send a request.

**CORS (cross-origin resource sharing)** is the browser's rule that JavaScript on `app.example.com` may only *read* a response from `api.other.com` if that server opts in with `Access-Control-Allow-Origin`. It is **not** a security feature against attackers: `curl` ignores it, and for a simple cross-site form POST the request is still sent. CORS protects users' data from being read by other sites; it does not protect your server.
- A **simple request** (GET, HEAD or POST with a form-style content type and no custom headers) is sent directly. The browser then checks the response headers.
- A **preflight** happens first when you use `PUT`/`DELETE`/`PATCH`, `Content-Type: application/json` or headers such as `Authorization`. The browser sends `OPTIONS` and only continues if the answer allows it:

```text
OPTIONS /items            Origin: https://app.example.com
                          Access-Control-Request-Method: POST
                          Access-Control-Request-Headers: content-type
204 No Content            Access-Control-Allow-Origin: https://app.example.com
                          Access-Control-Allow-Methods: POST
                          Access-Control-Allow-Headers: content-type
                          Access-Control-Max-Age: 600
```
With cookies (`fetch(url, { credentials: 'include' })`) the server must also send `Access-Control-Allow-Credentials: true` and a specific origin, never `*`. **The fix for a CORS error is a server header**, not frontend code. In development use a proxy so the browser sees one origin: `server: { proxy: { '/api': 'http://localhost:3000' } }` in `vite.config.js`. `mode: 'no-cors'` does not fix it; it only hides the response. See browser and web platform (planned).

## 6. Tokens, auth flows and route guards
Where do you keep proof that the user logged in?
- **localStorage / sessionStorage:** any script on the page can read it. One XSS bug, or one bad third-party script, and the token is copied and used from anywhere. No CSRF problem, because it is not sent automatically.
- **HttpOnly cookie:** JavaScript cannot read it, so it cannot be stolen. XSS can still *use* it (send requests as the user while the page is open), and you need CSRF defences (`SameSite`).
- **In memory (a JS variable):** safest from theft, lost on refresh. A common pattern is a short-lived access token in memory plus a refresh token in an HttpOnly cookie.

The usual recommendation: keep the session in an `HttpOnly; Secure; SameSite` cookie. Neither choice replaces fixing XSS.

Auth flows at a high level:
- **Session:** the server stores the login and gives the browser a random ID in a cookie. Easy to revoke.
- **JWT:** a signed token the server can verify without a database lookup. Hard to revoke before it expires, so keep it short-lived. A JWT is *signed*, not *encrypted*: anyone can read its contents.
- **OAuth 2 / OpenID Connect (OIDC):** "log in with a provider". OAuth 2 is about *access*; OIDC adds an ID token that says *who* the user is. Single-page apps use the **authorization code flow with PKCE**: (1) the app makes a random `code_verifier` and sends its hash, the `code_challenge`; (2) it redirects to the provider, with a `state` value; (3) the user logs in there; (4) the provider redirects back with a `code`; (5) the app checks `state` and swaps the `code` plus the original `code_verifier` for tokens. A stolen `code` is useless without the verifier. Use a maintained library or provider SDK; never hand-roll this.
- A **backend-for-frontend (BFF)**, a small server that does the OAuth dance and keeps tokens, so the browser only holds a session cookie, is a widely recommended setup.

**Route guards are UX, not security.** A protected route (see [React Router](../03-intermediate/03-react-router.md)) only hides a screen. The JavaScript is in the browser, the user can edit it, and the API does not care which screen called it. Every API endpoint must check the session and the permission itself.

## 7. Secrets, env variables and open redirects
Anything in the bundle is public. In a Vite app only names starting with `VITE_` reach client code, and their values are written into the JavaScript at build time (a test build with `VITE_GREETING=hi` and `SECRET_TOKEN=nope` contained `hi` and no trace of `nope`). In Next.js, `NEXT_PUBLIC_` variables are inlined at `next build` and frozen; unprefixed ones stay on the server. So `VITE_STRIPE_SECRET_KEY` is a leaked key. Public config (an API base URL, a publishable key) is fine; secrets live on a server that your frontend calls. More in tooling (planned).

An **open redirect** is a login page that sends the user wherever `?next=` says. An attacker mails `https://yourapp.com/login?next=https://evil.com` and the link looks trusted. Allow only same-origin targets:

```js
export function safeNext(next, fallback = '/') {
  if (typeof next !== 'string') return fallback
  try {
    const url = new URL(next, window.location.origin)
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback
  } catch {
    return fallback
  }
}
```
`'/dashboard?tab=1#x'` and `'orders'` are kept (`orders` becomes `/orders`); `'https://evil.com'`, `'//evil.com'`, a backslash trick (`'/\evil.com'`, which URL parsing treats as `//evil.com`) and `'javascript:alert(1)'` all give `/`. Checking `startsWith('/')` alone would let `//evil.com` through.

## 8. Dependencies and supply chain
A typical React app pulls in hundreds of packages, and each one runs with your page's power (or your build machine's). Habits that cut the risk:
- Commit the **lockfile** and use `npm ci` in CI (it installs exactly what the lockfile says). Pin important versions with `--save-exact`.
- Run `npm audit` for known problems and `npm audit signatures` to check registry signatures and publish **provenance** (proof of which build published a package). Let Dependabot or Renovate open update PRs, and read what changes.
- Install scripts (`postinstall`) run arbitrary code on your machine. Use `ignore-scripts=true` in `.npmrc` where you can; some package managers, such as pnpm 10, do not run dependency scripts unless you allow them.
- Watch for typosquats (`reactt`), tiny packages you do not need, and new maintainers. Review a package before adding it.
- Patch quickly. Section 9 shows why.

## 9. Server Components and Server Actions
See [SSR and Server Components](05-ssr-and-server-components.md) for the basics. The security rule is short: **a Server Action is a public HTTP endpoint**. A `'use server'` function is called by a POST request, and anyone can send that POST with `curl`, whether or not your UI shows a button. Every exported function in a `'use server'` file counts. So each one needs the same care as an API route:

```ts
'use server'
import { z } from 'zod'
import { getSession } from '@/lib/session' // your own code
import { db } from '@/lib/db'              // your own code

const Input = z.object({ id: z.string().min(1) })

export async function deletePost(formData: FormData) {
  const session = await getSession()                       // 1. authenticate
  if (!session) throw new Error('Unauthorized')
  const { id } = Input.parse({ id: formData.get('id') })   // 2. validate
  const post = await db.post.findUnique({ where: { id } })
  if (!post || post.authorId !== session.userId) {         // 3. authorise
    throw new Error('Forbidden')
  }
  await db.post.delete({ where: { id } })
}
```
(sketch) The three steps: *who are you*, *is this input shaped right*, *are you allowed to touch this record*. Hiding the delete button from non-owners is UX; the check in the action is the security.

More rules for Server Components:
- **Do not leak through props.** Props passed from a Server Component to a Client Component are serialised and sent to the browser. `<ProfileForm user={user} />` ships the whole database row, `passwordHash` included. Pass only the fields the UI needs: `<ProfileForm name={user.name} email={user.email} />`. Add `import 'server-only'` to modules that read secrets, so the build fails if a Client Component imports them.
- **A proxy or middleware check is not enough.** A Server Function is a POST to the route where it is used. If your proxy matcher skips that path, it skips the check, and moving the function to another route can silently drop coverage. Authenticate inside each function and each data-access function.
- Keep secrets in server-only env variables; never put them in `NEXT_PUBLIC_` ones.

**Security advisories, December 2025 to January 2026.** React disclosed **CVE-2025-55182**, nicknamed "React2Shell" (Next.js tracked it as CVE-2025-66478): an unauthenticated remote code execution bug, severity 10.0 of 10, in how the Server Components packages (`react-server-dom-webpack`, `-parcel`, `-turbopack`, versions 19.0, 19.1.0, 19.1.1, 19.2.0) decoded payloads sent to Server Function endpoints. Apps were exposed if they supported Server Components, even with no Server Functions of their own. Fixes shipped in 19.0.1, 19.1.2 and 19.2.1. Follow-up advisories covered denial of service (CVE-2025-55184, CVE-2025-67779, CVE-2026-23864) and source-code exposure (CVE-2025-55183); the advisory lists 19.0.4, 19.1.5 and 19.2.4 as the minimum safe versions. Lessons:
1. **Patch fast.** The flaw was in the framework's decoder, which runs *before* your validation, so no input checks in your code could stop it. Track advisories, keep the lockfile current, and rebuild.
2. **Server Functions are public endpoints.** Authenticate, authorise and validate anyway, so a future flaw has less to reach.
3. **Assume breach is possible:** keep secrets few, scoped and rotatable. The Next.js advisory told teams that were unpatched on 4 December 2025 to rotate secrets.

## 10. Internationalisation: the Intl APIs
**Part 2 of 2: i18n.** **i18n** (internationalisation) means building the app so it *can* support many languages and regions. **l10n** (localisation) is providing the actual translations and formats for one locale. A **locale** is a language tag such as `en-US`, `de-DE`, `ar-EG`, `pl`. Browsers have a built-in toolbox, `Intl`, so you rarely need a library to format:

```js
const d = new Date('2026-11-10T12:00:00Z')
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5) // 1.234,50 € (no-break space)
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5) // $1,234.50
new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(1234567.5) // ₹12,34,567.50
new Intl.NumberFormat('en', { notation: 'compact' }).format(1234567) // 1.2M
new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(d) // Nov 10, 2026, 5:30 PM
new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeZone: 'UTC' }).format(d) // Dienstag, 10. November 2026
new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day') // yesterday
new Intl.RelativeTimeFormat('es').format(-3, 'day') // hace 3 días
new Intl.ListFormat('en', { type: 'conjunction' }).format(['a', 'b', 'c']) // a, b, and c
```
**What happens, step by step:**
1. You pass a locale and options to a *formatter*; `.format(value)` returns a string. Locale decides the symbols, separators and order: Germany puts the euro sign last with `.` for thousands and `,` for decimals, and India groups digits as 12,34,567.
2. `currency` needs an ISO code. The *currency* is a business fact (what you charge in), the *locale* is a display choice. Do not derive one from the other. Yen has no minor unit, so `JPY` prints no decimals.
3. `DateTimeFormat` with `timeZone` converts the same instant (12:00 UTC) to 5:30 PM in Kolkata. Some ICU versions put a special narrow space before PM.
4. `numeric: 'auto'` gives the word "yesterday"; without it you get "1 day ago".

Two more tools. **`Intl.PluralRules`** says which plural category a number belongs to (`zero`, `one`, `two`, `few`, `many`, `other`): English uses `one` and `other`; Polish `one`, `few`, `many`, `other`; Arabic all six; Japanese only `other`. **`Intl.Collator`** sorts by language rules: `['z','ä','a']` sorts to `a, ä, z` in German but `a, z, ä` in Swedish (plain `.sort()` gives `a, z, ä`). `new Intl.Collator('en', { numeric: true })` puts `item2` before `item10`. `value.toLocaleString(locale, options)` is the same thing as the matching formatter. Creating a formatter costs more than calling `.format`, so make it once per locale (module level or `useMemo`).

```jsx
import { useMemo } from 'react'

export function Money({ amount, currency, locale }) {
  const fmt = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency }), [locale, currency])
  return <span>{fmt.format(amount)}</span>
}
```

**Common mistake:** `'$' + price.toFixed(2)` or `date.getMonth() + '/' + date.getDate()` hard-codes one country's format. Use `Intl` with the user's locale.

## 11. Messages, plurals and libraries
Never concatenate translated pieces. Word order, gender and plural forms differ per language, so a translator needs the **whole sentence** with placeholders:

```jsx
// wrong: the order and plural are baked into the code
<p>{t('hello')} {name}, {t('youHave')} {count} {t('items')}</p>
// right: one message, translators control the order
<p>{t('greeting', { name, count })}</p>   // "Hello {{name}}, you have {{count}} items"
```
Plurals are not "add an s". This tiny translator uses `Intl.PluralRules`; the outputs below were run:

```js
const messages = {
  en: { cart: { one: '{count} item in your cart', other: '{count} items in your cart' } },
  pl: {
    cart: {
      one: '{count} produkt w koszyku',
      few: '{count} produkty w koszyku',
      many: '{count} produktów w koszyku',
      other: '{count} produktu w koszyku',
    },
  },
}

export function t(locale, key, count) {
  const forms = messages[locale][key]
  const rule = new Intl.PluralRules(locale).select(count)
  const text = forms[rule] ?? forms.other
  return text.replace('{count}', new Intl.NumberFormat(locale).format(count))
}
// t('en', 'cart', 1) -> "1 item in your cart"       t('en', 'cart', 1234) -> "1,234 items in your cart"
// t('pl', 'cart', 2) -> "2 produkty w koszyku"      t('pl', 'cart', 5)    -> "5 produktów w koszyku"
// t('pl', 'cart', 22) -> "22 produkty w koszyku"    t('pl', 'cart', 1.5)  -> "1,5 produktu w koszyku"
```
**What happens:** `select(count)` returns the category for that locale (Polish: 1 is `one`, 2 is `few`, 5 and 12 are `many`, 22 is `few` again, 1.5 is `other`). The message for that category is chosen, then the number itself is formatted for the locale (`1,234` in English, `1,5` in Polish). An `if (n === 1)` check would get Polish wrong.

In real projects use a library; they all sit on top of `Intl`:
- **react-i18next** (i18next): most popular. JSON key files, `useTranslation`, plugins for detection and lazy loading. Plurals use key suffixes `cart_one`, `cart_other`.
- **react-intl** (FormatJS): messages in ICU syntax, `<FormattedMessage>`, `useIntl()`, a CLI to extract strings.
- **Lingui**: ICU messages with compile-time extraction and a small runtime. **next-intl** is a common choice for the Next.js App Router.

```jsx
// react-i18next (sketch): src/i18n.js, imported once in main.jsx
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  resources: { en: { translation: { cart_one: '{{count}} item', cart_other: '{{count}} items' } } },
})

export function Cart({ count }) {
  const { t } = useTranslation()
  return <p>{t('cart', { count })}</p>
}
```
```jsx
// react-intl (sketch): ICU message, wrap the app in <IntlProvider locale="en" messages={...}>
<FormattedMessage id="cart" defaultMessage="{count, plural, one {# item} other {# items}}" values={{ count }} />
```
For bold or links inside a sentence, use the library's tag placeholders (`<Trans>`, `values={{ b: (chunks) => <b>{chunks}</b> }}`) so the translator can move them. Pick a library by team habit and by needs: ICU plurals, string extraction, lazy loading, typed keys, Server Component support.

## 12. Locale detection, lazy loading, `lang` and RTL
**Choosing the locale**, strongest signal first: the URL (`/pl/cart`, best for sharing and search engines), then the user's saved choice (account setting, cookie or localStorage), then the browser or `Accept-Language` header, then a default. **Lazy-load** one language file at a time so users do not download all of them:

```js
// locale.js
const loaders = {
  en: () => import('./locales/en.json'),
  pl: () => import('./locales/pl.json'),
  ar: () => import('./locales/ar.json'),
}
export const SUPPORTED = Object.keys(loaders)

export function pickLocale(saved, requested = navigator.languages) {
  if (SUPPORTED.includes(saved)) return saved
  for (const tag of requested) {
    const base = new Intl.Locale(tag).language // 'pl-PL' -> 'pl'
    if (SUPPORTED.includes(base)) return base
  }
  return 'en'
}

export async function loadMessages(locale) {
  return (await loaders[locale]()).default
}
```
Run with `['fr-CA', 'pl-PL', 'en']` it returns `pl`; with `['de']` it falls back to `en`. Each `import()` becomes its own chunk. Show a loading state (or Suspense) until the messages arrive, and persist the choice when the user changes it.

**`lang` and `dir` on `<html>`.** `lang` tells screen readers how to pronounce text, drives hyphenation, spell-check and font choice, and stops browsers offering to translate your already-translated page. `dir="rtl"` flips the page for right-to-left scripts (Arabic, Hebrew, Persian, Urdu). Set them on the server-rendered `<html>` (in Next.js: `<html lang={lang} dir={dir}>`) so the first paint is right. In a client-only app:

```jsx
import { useEffect } from 'react'

const RTL = new Set(['ar', 'he', 'fa', 'ur'])

export function useDocumentLocale(locale) {
  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    root.dir = RTL.has(locale.split('-')[0]) ? 'rtl' : 'ltr'
  }, [locale])
}
```
(run: `ar-EG` gave `lang="ar-EG"` and `dir="rtl"`, then `en-GB` gave `ltr`). Mark a foreign quote with `<span lang="fr">`. For user text of unknown direction use `<bdi>` or `dir="auto"`.

**RTL-safe CSS.** Flexbox and grid already follow `dir`. Replace physical properties (`left`, `right`) with **logical** ones that mean start and end:

```css
.card {
  margin-inline-start: 1rem;      /* was margin-left */
  padding-inline: 1rem 2rem;      /* start, end */
  border-inline-start: 4px solid;
  text-align: start;              /* was left */
}
.badge { position: absolute; inset-inline-end: 0; } /* was right: 0 */
[dir='rtl'] .icon-arrow { transform: scaleX(-1); }  /* mirror direction icons only */
```

## 13. Time zones and testing i18n
Store and send time as UTC (ISO 8601 with a `Z`), and format it in the user's zone at the edge. Two traps. First, `new Date('2026-11-10')` (date only) is parsed as **midnight UTC**, so `toLocaleDateString('en-US', { timeZone: 'America/New_York' })` shows `11/9/2026`, the day before (run and confirmed). Keep date-only values as plain strings, or format them with `timeZone: 'UTC'`. Second, server rendering in one zone and hydrating in another gives a hydration mismatch; pass an explicit `timeZone`, or format after mount. See [SSR](05-ssr-and-server-components.md).

Testing ([testing React](08-testing-react.md)): test the **logic** that varies. Check plural boundaries, check a right-to-left locale and one with different number formats, and always pass an explicit `timeZone` so tests give the same result on every machine.

```js
import { t } from './t' // the function from section 11
test('Polish plural forms', () => {
  expect(t('pl', 'cart', 1)).toBe('1 produkt w koszyku')
  expect(t('pl', 'cart', 2)).toBe('2 produkty w koszyku')
  expect(t('pl', 'cart', 5)).toBe('5 produktów w koszyku')
})
```
Also: fail the build on missing keys, try a *pseudo-locale* (accented, padded text) to find hard-coded strings and layouts that break on long words, and read [accessibility](09-accessibility.md) for `lang`.

## How interviewers test this
- Whether you know **why** React is safe (it escapes text) and **where** it is not (raw HTML, URLs, JSON in HTML), not just "React prevents XSS".
- Token storage with trade-offs, not a slogan. Strong answers say "XSS can still use an HttpOnly cookie" and "CSRF needs SameSite or tokens".
- Clear separation of XSS, CSRF and CORS, plus "route guards are UX; the server enforces".
- For Next.js: Server Actions as public endpoints, props as a leak path, and that you patch quickly.
- For i18n: `Intl` for formatting, whole-sentence messages with plural rules, `lang`/`dir`, logical CSS, lazy loading.
- Red flags: "CORS protects my API", secrets in `VITE_`/`NEXT_PUBLIC_`, `'$' + price`, string-concatenated sentences, `if (count === 1)` plurals.

## Interview questions and model answers
### Q1. How does React prevent XSS? (Easy)
React escapes everything you put in JSX with `{}`. Text becomes a text node and attribute values are set as values, so `<img onerror=...>` inside a string shows up as characters, never as an element. This protects against the most common stored and reflected XSS. It does not cover `dangerouslySetInnerHTML`, writing to `innerHTML` through a ref, dangerous URLs (`href`, `src`), JSON placed inside server-rendered HTML, or third-party scripts. For those you sanitise, validate, and add a CSP as a second layer.

### Q2. What are the risks of `dangerouslySetInnerHTML` and how do you use it safely? (Easy)
It inserts a string as raw HTML, so any `<img onerror>` or `<script>`-like payload in that string runs with the user's permissions. If you must use it, sanitise the final string with DOMPurify (ideally with an allow-list of tags), never change it after sanitising, keep the library updated, and add a CSP. Better is to avoid it: render structured data as components, or use a Markdown renderer that blocks raw HTML.

### Q3. Where should you store a JWT or session token? (Medium)
Prefer an `HttpOnly; Secure; SameSite` cookie set by the server: JavaScript cannot read it, so an XSS bug cannot copy the token. The costs are that XSS can still make requests while the page is open, and you must handle CSRF. localStorage is simple but any script on the page can read and exfiltrate the token, so it is the riskier choice. A middle path is a short-lived access token in memory plus a refresh token in an HttpOnly cookie, or a backend-for-frontend that keeps tokens on the server. No storage choice makes XSS acceptable.

### Q4. What is the difference between XSS and CSRF? (Medium)
XSS means the attacker's script runs *on your site*, so it can read the page and call your API as the user. CSRF means a *different* site makes the victim's browser send a request that carries the victim's cookies; no attacker code runs on your site and the attacker cannot read the response. Defend XSS with escaping, sanitising and CSP. Defend CSRF with `SameSite` cookies, CSRF tokens, `Origin` checks and no state change on GET. XSS can bypass CSRF defences, which is why XSS is the bigger problem.

### Q5. What is CORS? Is it a security feature? (Medium)
CORS is the browser rule that decides whether JavaScript from one origin may read a response from another origin. The server opts in with headers such as `Access-Control-Allow-Origin`. Some requests (JSON bodies, `Authorization` header, `PUT`/`DELETE`) trigger a preflight `OPTIONS` request first. It protects users from other sites reading their data; it does not protect your server, because `curl`, scripts and simple form posts ignore or bypass it. A CORS error is fixed with a server header (or a dev proxy), never in React.

### Q6. Is a protected route secure? (Easy)
No, it is a UX feature. It hides a page for people who are not logged in, but the code is in the browser and can be changed, and the API accepts calls from anywhere. The server must authenticate and authorise every request, and return `401` or `403`. The guard still matters for a good experience (redirect to login, avoid flashes of private screens).

### Q7. Can I keep a secret in a `VITE_` or `NEXT_PUBLIC_` variable? (Easy)
No. Those prefixes mean "put this in the browser bundle". The value is written into the JavaScript at build time and anyone can read it from DevTools. Only public config (an API base URL, a publishable key) belongs there. Secrets stay in server-only variables and are used by server code your frontend calls.

### Q8. How do you secure a Next.js app? (Hard)
Treat the server as the trust boundary. In every Server Action and Route Handler: authenticate, authorise against the specific record, and validate input with a schema, because actions are public POST endpoints. Do not rely on a proxy check alone. Pass only needed fields from Server to Client Components, use `server-only` for secret-reading modules, and keep secrets out of `NEXT_PUBLIC_`. Set cookie flags, a CSP with nonces and `frame-ancestors`. Check `Origin` for actions (configure `allowedOrigins` behind proxies). Audit and update dependencies, and patch framework advisories fast (the December 2025 React Server Components remote code execution flaw, CVE-2025-55182, is the reason).

### Q9. How do you implement i18n in a React app? (Medium)
Pick a library (react-i18next, react-intl or Lingui) and keep all text in message files per locale. Messages are whole sentences with placeholders and ICU or suffix-based plurals. Choose the locale from the URL, then saved preference, then browser language, then a default; lazy-load the messages for that locale. Use `Intl` for numbers, dates and lists. Set `lang` and `dir` on `<html>`, write CSS with logical properties so RTL works, and test plural rules, long text and a right-to-left locale.

### Q10. How do you format currency, dates, plurals and relative time? (Easy)
Use `Intl`: `new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })` for money, `Intl.DateTimeFormat` with `dateStyle`, `timeStyle` and an explicit `timeZone` for dates, `Intl.PluralRules` (or ICU plural messages) for plurals, and `Intl.RelativeTimeFormat` for "yesterday" or "in 2 hours". The currency comes from your business data, the format from the user's locale. Do not concatenate strings or add an `s`, and create formatters once, not on every render.

## Common mistakes and gotchas
- Using `dangerouslySetInnerHTML` or `innerHTML` with raw user text. Fix: render `{text}`, or sanitise with DOMPurify.
- Checking URLs with `startsWith('http')` or a regex. Fix: parse with `new URL` and allow-list the protocol.
- Saying "CORS protects my API". Fix: it only limits browser reads; enforce auth on the server.
- Putting a secret in `VITE_` or `NEXT_PUBLIC_`. Fix: keep it on the server.
- Treating a protected route or a hidden button as access control. Fix: check on every endpoint and action.
- Passing a whole database row from a Server Component to a Client Component. Fix: pass only the needed fields.
- Redirecting to `?next=` without a check. Fix: allow only same-origin paths (`safeNext`).
- Unpinned installs and ignored `npm audit`. Fix: lockfile, `npm ci`, update bots, quick patching.
- Joining translated words, or `count === 1` plural logic. Fix: whole messages with plural rules.
- Using `left`/`right` CSS and a hard-coded `<html lang="en">`. Fix: logical properties, and set `lang` and `dir` from the locale.
- Showing a date-only string through `new Date()` in a local zone. Fix: keep it as text or format with `timeZone: 'UTC'`.

## Practice yourself
Do these on your own BEFORE opening the answers. Order from easy to hard.
1. **(Easy)** A user submits the comment `<script>alert(1)</script>`. You render `<li>{comment}</li>`. What does the page show and what runs? What changes if you use `dangerouslySetInnerHTML`?

<details>
<summary>Show answer</summary>

The list item shows the characters `<script>alert(1)</script>` as text, and nothing runs, because `{}` creates a text node. With `dangerouslySetInnerHTML` the string is parsed as HTML. (A `<script>` inserted through `innerHTML` does not execute by itself, but `<img src=x onerror=...>` does, so the page is still vulnerable.)

</details>

2. **(Easy)** In a Vite app your `.env` has `VITE_API_URL=/api` and `DB_PASSWORD=hunter2`. After `vite build`, which values can a visitor find in the JavaScript? Which one is a mistake if it were renamed `VITE_DB_PASSWORD`?

<details>
<summary>Show answer</summary>

`/api` is in the bundle (public config is fine). `DB_PASSWORD` is not, because it has no `VITE_` prefix. `VITE_DB_PASSWORD` would be inlined and public, which leaks the database password. A frontend should never hold a database password at all.

</details>

3. **(Medium)** Coding task: Write `ordinal(n)` that returns `1st`, `2nd`, `3rd`, `4th`, `11th`, `21st` using `Intl.PluralRules` with `type: 'ordinal'` (English).

<details>
<summary>Show answer</summary>

```js
const suffixes = { one: 'st', two: 'nd', few: 'rd', other: 'th' }
const rules = new Intl.PluralRules('en', { type: 'ordinal' })

export function ordinal(n) {
  return n + suffixes[rules.select(n)]
}
// 1 1st, 2 2nd, 3 3rd, 4 4th, 11 11th, 12 12th, 13 13th, 21 21st, 22 22nd, 101 101st, 111 111th
```
`select` returns `one` for 1, 21 and 101, `two` for 2 and 22, `few` for 3, and `other` for 11 to 13 and the rest, so you do not write the "teens" exception by hand. The rules are for English; other locales need their own message forms.

</details>

4. **(Medium)** Coding task: Write `safeNext(next)` for a login page. Allow `'/dashboard?tab=1'`; reject `'https://evil.com'`, `'//evil.com'` and `'javascript:alert(1)'` (return `'/'`).

<details>
<summary>Show answer</summary>

```js
export function safeNext(next, fallback = '/') {
  if (typeof next !== 'string') return fallback
  try {
    const url = new URL(next, window.location.origin)
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback
  } catch {
    return fallback
  }
}
```
Resolving against the current origin lets the URL parser decide what the browser would do. `//evil.com`, `https://evil.com` and a backslash variant resolve to another origin, and `javascript:` has an opaque origin, so all return the fallback. A plain `startsWith('/')` check would pass `//evil.com`.

</details>

5. **(Medium)** Coding task: Build `<Money amount currency locale />` that shows `$1,234.50` for `(1234.5, 'USD', 'en-US')` and `1.234,50 €` for `(1234.5, 'EUR', 'de-DE')`. Create the formatter only when its inputs change.

<details>
<summary>Show answer</summary>

```jsx
import { useMemo } from 'react'

export default function Money({ amount, currency, locale }) {
  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency }),
    [locale, currency],
  )
  return <span>{fmt.format(amount)}</span>
}
```
Running this logic gave `$1,234.50` and `1.234,50 €`; in German the space before the euro sign is a no-break space, so a test should compare against `fmt.format(...)` or use that character. `useMemo` avoids building a formatter on every render.

</details>

6. **(Medium)** A page shows a "Delete" button only to admins and calls `deleteComment(id)`, a Server Action that runs `db.comment.delete({ where: { id } })`. Is it secure? What do you add?

<details>
<summary>Show answer</summary>

No. The action is a public POST endpoint; anyone can call it directly with any `id`. Hiding the button is UX. Add, inside the action: authenticate the session, check the user is an admin or the comment's owner, and validate that `id` has the right shape. Do not rely on a proxy check alone, and patch React and Next.js promptly.

</details>

7. **(Hard)** Code review. Name four security problems: `<div dangerouslySetInnerHTML={{ __html: user.bio }} />`, `<a href={user.website}>site</a>`, `localStorage.setItem('token', jwt)`, `const key = import.meta.env.VITE_STRIPE_SECRET_KEY`.

<details>
<summary>Show answer</summary>

1. Unsanitised HTML: sanitise with DOMPurify or render `{user.bio}` as text. 2. Unchecked URL: allow-list `http:`, `https:` and `mailto:` after parsing with `new URL` (and add `rel="noopener noreferrer"` with `target="_blank"`). 3. A token in localStorage can be stolen by any XSS; use an HttpOnly cookie set by the server. 4. A secret in a `VITE_` variable is public in the bundle; rotate the key and call Stripe from a server.

</details>

8. **(Hard)** Your API stores `due: '2026-11-10'`. A user in New York sees `11/9/2026`. Explain why and fix it.

<details>
<summary>Show answer</summary>

`new Date('2026-11-10')` treats a date-only string as midnight UTC. New York is behind UTC, so that instant is the evening of 9 November there, and formatting in the local zone shows `11/9/2026`. Fix: if the value is a calendar date with no time, do not convert it. Format it in UTC (`toLocaleDateString('en-US', { timeZone: 'UTC' })`), or split the string, or store a full timestamp when you mean an instant. Always pass an explicit `timeZone` in tests.

</details>

## Recap
- React escapes text in `{}`; it does not protect raw HTML, URLs, JSON in HTML or third-party scripts.
- Sanitise needed HTML with DOMPurify, parse URLs with `new URL`, and add a CSP (with `frame-ancestors`) as a second layer.
- HttpOnly + Secure + SameSite cookies beat localStorage for tokens, but nothing excuses XSS; CSRF needs SameSite or tokens.
- CORS is a browser read rule fixed by server headers; it is not protection for your API. Preflight happens for JSON, custom headers and non-simple methods.
- Route guards, hidden buttons and `VITE_`/`NEXT_PUBLIC_` values are all public or UX; the server checks everything.
- Server Actions are public endpoints: authenticate, authorise, validate, send only needed props, and patch fast (CVE-2025-55182).
- Use `Intl` for numbers, dates, lists, plurals and relative time; write whole messages, never concatenate.
- Set `lang` and `dir`, use logical CSS, lazy-load locale files, store dates in UTC and test with explicit time zones.

## Where to go next
- Next lesson: [Frontend system design](11-frontend-system-design.md), where security and i18n appear in your "what I would add" list.
- Related: [SSR and Server Components](05-ssr-and-server-components.md), [Next.js essentials](06-nextjs-essentials.md), APIs, HTTP and auth (planned), [Accessibility](09-accessibility.md), Browser and web platform (planned).
- Practice: [Round 6 - code review and refactoring](../05-interview-rounds/round-6-code-review-and-refactoring/README.md) and the gotchas cheatsheet (planned).
