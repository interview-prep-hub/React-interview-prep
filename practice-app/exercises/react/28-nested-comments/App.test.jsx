import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// The sample comments (see README.md for the full table).
const ASHA = 'Recursion is the key to threaded comments.' // level 1, 5 votes
const BEN = 'Each reply is a smaller comment tree.' // reply to Asha, 2 votes
const CLEO = 'So a Comment renders more Comments.' // reply to Ben, 1 vote
const DEV = 'Do not forget the key prop.' // reply to Asha, 0 votes
const EVE = 'How do you delete a whole branch?' // level 1, 3 votes
const FINN = 'Filter it out of the parent list.' // reply to Eve, 1 vote
const ALL_SAMPLE_TEXTS = [ASHA, BEN, CLEO, DEV, EVE, FINN]

// --- helpers -------------------------------------------------------------

// The <article> that holds one comment (author, text, buttons, reply form).
const articleOf = (text) => screen.getByText(text).closest('article')

// The <li> of a comment. It holds the article AND the list of replies.
const itemOf = (text) => screen.getByText(text).closest('li')

// How many <li> elements surround a comment (1 for top level, 2 for a reply, ...).
function depthOf(text) {
  let depth = 0
  let item = itemOf(text)
  while (item) {
    depth += 1
    item = item.parentElement.closest('li')
  }
  return depth
}

const votesOf = (article) => within(article).getByTestId('votes')

const button = (article, name) => within(article).getByRole('button', { name })

const replyBox = (article) => within(article).getByRole('textbox', { name: 'Your reply' })

// True when `second` comes later in the page than `first`.
const isBefore = (first, second) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

async function reply(user, parentText, replyText) {
  const parent = articleOf(parentText)
  await user.click(button(parent, 'Reply'))
  await user.type(replyBox(parent), replyText)
  await user.click(button(parent, 'Post'))
}

async function addRoot(user, text) {
  await user.type(screen.getByRole('textbox', { name: 'New comment' }), text)
  await user.click(screen.getByRole('button', { name: 'Add comment' }))
}

// --- tests ---------------------------------------------------------------

describe('28 Nested comments', () => {
  describe('rendering the tree', () => {
    it('shows the heading and every sample comment, however deep', () => {
      render(<App />)
      expect(screen.getByRole('heading', { name: 'Comments', level: 2 })).toBeInTheDocument()
      for (const text of ALL_SAMPLE_TEXTS) {
        expect(screen.getByText(text)).toBeInTheDocument()
      }
    })

    it('shows the author and the vote count of each comment', () => {
      render(<App />)
      const expected = [
        [ASHA, 'Asha', '5'],
        [BEN, 'Ben', '2'],
        [CLEO, 'Cleo', '1'],
        [DEV, 'Dev', '0'],
        [EVE, 'Eve', '3'],
        [FINN, 'Finn', '1'],
      ]
      for (const [text, author, votes] of expected) {
        const article = articleOf(text)
        expect(within(article).getByText(author)).toBeInTheDocument()
        expect(votesOf(article)).toHaveTextContent(new RegExp(`^${votes}$`))
      }
    })

    it('nests every reply inside the list item of its parent', () => {
      render(<App />)
      expect(depthOf(ASHA)).toBe(1)
      expect(depthOf(BEN)).toBe(2)
      expect(depthOf(CLEO)).toBe(3)
      expect(depthOf(DEV)).toBe(2)
      expect(depthOf(EVE)).toBe(1)
      expect(depthOf(FINN)).toBe(2)

      expect(itemOf(ASHA)).toContainElement(screen.getByText(CLEO))
      expect(itemOf(BEN)).toContainElement(screen.getByText(CLEO))
      expect(itemOf(EVE)).toContainElement(screen.getByText(FINN))
      expect(itemOf(EVE)).not.toContainElement(screen.getByText(BEN))
      expect(itemOf(DEV)).not.toContainElement(screen.getByText(BEN))
    })

    it('builds the markup the README describes: ul > li > article + nested ul', () => {
      render(<App />)
      const topList = itemOf(ASHA).parentElement
      expect(topList.tagName).toBe('UL')
      expect(topList).toBe(itemOf(EVE).parentElement)
      expect(topList.parentElement.closest('li')).toBeNull()

      // Inside a comment's <li>: first the <article>, then the <ul> with its replies.
      const parts = Array.from(itemOf(ASHA).children)
      expect(parts.map((part) => part.tagName)).toEqual(['ARTICLE', 'UL'])
      const repliesList = parts[1]
      expect(repliesList).toContainElement(screen.getByText(BEN))
      expect(repliesList).toContainElement(screen.getByText(DEV))
      expect(repliesList.children).toHaveLength(2) // one <li> per direct reply
      expect(itemOf(BEN).parentElement).toBe(repliesList)

      // A comment without replies has no (empty) list after its article.
      expect(Array.from(itemOf(DEV).children).map((child) => child.tagName)).toEqual(['ARTICLE'])
    })

    it('keeps the replies out of the <article> of their parent', () => {
      render(<App />)
      expect(articleOf(ASHA)).not.toContainElement(screen.getByText(BEN))
      expect(articleOf(BEN)).not.toContainElement(screen.getByText(CLEO))
      expect(screen.getAllByRole('article')).toHaveLength(6)
    })
  })

  describe('upvote', () => {
    it('adds one vote per click, and only to that comment', async () => {
      const user = userEvent.setup()
      render(<App />)
      const ben = articleOf(BEN)

      await user.click(button(ben, 'Upvote'))
      expect(votesOf(ben)).toHaveTextContent(/^3$/)
      await user.click(button(ben, 'Upvote'))
      expect(votesOf(ben)).toHaveTextContent(/^4$/)

      expect(votesOf(articleOf(ASHA))).toHaveTextContent(/^5$/)
      expect(votesOf(articleOf(CLEO))).toHaveTextContent(/^1$/)
      expect(votesOf(articleOf(DEV))).toHaveTextContent(/^0$/)
      expect(votesOf(articleOf(EVE))).toHaveTextContent(/^3$/)
    })

    it('can upvote a comment at the deepest level', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(CLEO), 'Upvote'))
      expect(votesOf(articleOf(CLEO))).toHaveTextContent(/^2$/)
      expect(votesOf(articleOf(BEN))).toHaveTextContent(/^2$/)
      expect(votesOf(articleOf(ASHA))).toHaveTextContent(/^5$/)
    })
  })

  describe('delete', () => {
    it('deletes a comment that has no replies', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(DEV), 'Delete'))
      expect(screen.queryByText(DEV)).not.toBeInTheDocument()
      for (const text of [ASHA, BEN, CLEO, EVE, FINN]) {
        expect(screen.getByText(text)).toBeInTheDocument()
      }
    })

    it('deletes a top-level comment together with its whole subtree', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(ASHA), 'Delete'))
      for (const text of [ASHA, BEN, CLEO, DEV]) {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      }
      expect(screen.getByText(EVE)).toBeInTheDocument()
      expect(screen.getByText(FINN)).toBeInTheDocument()
    })

    it('deletes a nested comment together with its replies, and keeps its siblings', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(BEN), 'Delete'))
      expect(screen.queryByText(BEN)).not.toBeInTheDocument()
      expect(screen.queryByText(CLEO)).not.toBeInTheDocument()
      expect(screen.getByText(ASHA)).toBeInTheDocument()
      expect(screen.getByText(DEV)).toBeInTheDocument()
    })

    it('shows an empty message when every comment is gone, and hides it again after adding one', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument()

      await user.click(button(articleOf(ASHA), 'Delete'))
      expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument()
      await user.click(button(articleOf(EVE), 'Delete'))
      expect(screen.getByText('No comments yet.').tagName).toBe('P')
      expect(screen.queryByRole('article')).not.toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument() // no empty <ul> either

      // The top-level form is still there, so the user can start again.
      await addRoot(user, 'Starting over')
      expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument()
      expect(screen.getByText('Starting over')).toBeInTheDocument()
    })
  })

  describe('reply', () => {
    it('opens an inline form with a textarea, a disabled Post button and a Cancel button', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dev = articleOf(DEV)
      expect(within(dev).queryByRole('textbox', { name: 'Your reply' })).not.toBeInTheDocument()

      await user.click(button(dev, 'Reply'))

      expect(replyBox(dev)).toHaveValue('')
      expect(button(dev, 'Post')).toBeDisabled()
      expect(button(dev, 'Cancel')).toBeEnabled()
      // Only the comment we clicked got a form.
      expect(screen.getAllByRole('textbox', { name: 'Your reply' })).toHaveLength(1)
    })

    it('posts a reply under the comment, written by "You" with 0 votes, and closes the form', async () => {
      const user = userEvent.setup()
      render(<App />)
      const text = 'Thanks, that fixed my bug.'
      await reply(user, DEV, text)

      const posted = articleOf(text)
      expect(within(posted).getByText('You')).toBeInTheDocument()
      expect(votesOf(posted)).toHaveTextContent(/^0$/)
      expect(depthOf(text)).toBe(3) // Dev is at level 2, so the reply is at level 3
      expect(itemOf(DEV)).toContainElement(screen.getByText(text))
      expect(itemOf(ASHA)).toContainElement(screen.getByText(text))
      expect(itemOf(EVE)).not.toContainElement(screen.getByText(text))
      expect(screen.queryByRole('textbox', { name: 'Your reply' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('article')).toHaveLength(7)
    })

    it('adds a new reply after the existing replies of the same parent', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, ASHA, 'The newest reply')

      const posted = articleOf('The newest reply')
      expect(depthOf('The newest reply')).toBe(2)
      expect(isBefore(articleOf(BEN), posted)).toBe(true)
      expect(isBefore(articleOf(DEV), posted)).toBe(true)
      expect(isBefore(posted, articleOf(EVE))).toBe(true)
    })

    it('can reply to a reply, again and again', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, DEV, 'Level three')
      await reply(user, 'Level three', 'Level four')
      expect(depthOf('Level three')).toBe(3)
      expect(depthOf('Level four')).toBe(4)
      expect(itemOf('Level three')).toContainElement(screen.getByText('Level four'))
    })

    it('keeps Post disabled while the text is empty or only spaces', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dev = articleOf(DEV)
      await user.click(button(dev, 'Reply'))

      await user.type(replyBox(dev), '   ')
      expect(button(dev, 'Post')).toBeDisabled()
      await user.type(replyBox(dev), 'x')
      expect(button(dev, 'Post')).toBeEnabled()

      await user.clear(replyBox(dev))
      expect(button(dev, 'Post')).toBeDisabled()
    })

    it('trims the text of the reply', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, DEV, '  padded text  ')
      expect(screen.getByText('padded text').textContent).toBe('padded text')
    })

    it('Cancel closes the form and throws the draft away', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dev = articleOf(DEV)

      await user.click(button(dev, 'Reply'))
      await user.type(replyBox(dev), 'half written')
      await user.click(button(dev, 'Cancel'))

      expect(screen.queryByRole('textbox', { name: 'Your reply' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('article')).toHaveLength(6) // nothing was posted

      await user.click(button(dev, 'Reply'))
      expect(replyBox(dev)).toHaveValue('')
    })

    it('starts with an empty form every time it is opened after posting', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, DEV, 'First answer')
      await user.click(button(articleOf(DEV), 'Reply'))
      expect(replyBox(articleOf(DEV))).toHaveValue('')
    })

    it('lets every comment have its own form, with its own draft', async () => {
      const user = userEvent.setup()
      render(<App />)
      const dev = articleOf(DEV)
      const eve = articleOf(EVE)

      await user.click(button(dev, 'Reply'))
      await user.type(replyBox(dev), 'draft for Dev')
      await user.click(button(eve, 'Reply'))

      expect(replyBox(dev)).toHaveValue('draft for Dev')
      expect(replyBox(eve)).toHaveValue('')

      await user.type(replyBox(eve), 'Answer for Eve')
      await user.click(button(eve, 'Post'))

      expect(itemOf(EVE)).toContainElement(screen.getByText('Answer for Eve'))
      // Dev's form is still open and still holds its draft.
      expect(replyBox(dev)).toHaveValue('draft for Dev')
    })
  })

  describe('ids of new comments', () => {
    it('gives every new comment its own identity, so votes and deletes hit the right one', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, DEV, 'Reply one')
      await reply(user, DEV, 'Reply two')
      await addRoot(user, 'Root A')
      await addRoot(user, 'Root B')

      await user.click(button(articleOf('Reply one'), 'Upvote'))
      await user.click(button(articleOf('Root A'), 'Upvote'))
      expect(votesOf(articleOf('Reply one'))).toHaveTextContent(/^1$/)
      expect(votesOf(articleOf('Reply two'))).toHaveTextContent(/^0$/)
      expect(votesOf(articleOf('Root A'))).toHaveTextContent(/^1$/)
      expect(votesOf(articleOf('Root B'))).toHaveTextContent(/^0$/)
      expect(votesOf(articleOf(DEV))).toHaveTextContent(/^0$/)

      await user.click(button(articleOf('Reply one'), 'Delete'))
      expect(screen.queryByText('Reply one')).not.toBeInTheDocument()
      expect(screen.getByText('Reply two')).toBeInTheDocument()
    })

    it('never reuses an id that is still in the tree, even after a delete', async () => {
      const user = userEvent.setup()
      render(<App />)
      // Deleting Ben also removes Cleo, so the tree is smaller than before.
      await user.click(button(articleOf(BEN), 'Delete'))
      await reply(user, DEV, 'Fresh reply')

      await user.click(button(articleOf('Fresh reply'), 'Upvote'))

      expect(votesOf(articleOf('Fresh reply'))).toHaveTextContent(/^1$/)
      expect(votesOf(articleOf(ASHA))).toHaveTextContent(/^5$/)
      expect(votesOf(articleOf(DEV))).toHaveTextContent(/^0$/)
      expect(votesOf(articleOf(EVE))).toHaveTextContent(/^3$/)
      expect(votesOf(articleOf(FINN))).toHaveTextContent(/^1$/)
    })
  })

  describe('collapse and expand', () => {
    it('hides all replies and shows "Show N replies", then brings them back', async () => {
      const user = userEvent.setup()
      render(<App />)
      const asha = articleOf(ASHA)
      expect(button(asha, 'Collapse')).toHaveAttribute('aria-expanded', 'true')

      await user.click(button(asha, 'Collapse'))

      for (const text of [BEN, CLEO, DEV]) {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      }
      expect(screen.getByText(ASHA)).toBeInTheDocument()
      expect(screen.getByText(EVE)).toBeInTheDocument() // other threads are not affected
      expect(screen.getByText(FINN)).toBeInTheDocument()
      expect(within(asha).queryByRole('button', { name: 'Collapse' })).not.toBeInTheDocument()
      expect(button(asha, 'Show 3 replies')).toHaveAttribute('aria-expanded', 'false')

      await user.click(button(asha, 'Show 3 replies'))

      for (const text of [BEN, CLEO, DEV]) {
        expect(screen.getByText(text)).toBeInTheDocument()
      }
      expect(button(asha, 'Collapse')).toHaveAttribute('aria-expanded', 'true')
    })

    it('says "Show 1 reply" (singular) when exactly one reply is hidden', async () => {
      const user = userEvent.setup()
      render(<App />)
      const eve = articleOf(EVE)
      await user.click(button(eve, 'Collapse'))
      expect(button(eve, 'Show 1 reply')).toBeInTheDocument()
      expect(screen.queryByText(FINN)).not.toBeInTheDocument()
    })

    it('has no collapse button on a comment without replies', () => {
      render(<App />)
      for (const text of [CLEO, DEV, FINN]) {
        expect(
          within(articleOf(text)).queryByRole('button', { name: /collapse|show/i }),
        ).not.toBeInTheDocument()
      }
    })

    it('counts the replies at every level, including nested ones', async () => {
      const user = userEvent.setup()
      render(<App />)
      await reply(user, CLEO, 'Deep reply') // Asha now has 4 comments below her

      const asha = articleOf(ASHA)
      await user.click(button(asha, 'Collapse'))
      expect(button(asha, 'Show 4 replies')).toBeInTheDocument()
      await user.click(button(asha, 'Show 4 replies'))

      const ben = articleOf(BEN)
      await user.click(button(ben, 'Collapse'))
      expect(button(ben, 'Show 2 replies')).toBeInTheDocument() // Cleo and Deep reply
    })

    it('collapses only the comment you clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(BEN), 'Collapse'))

      expect(screen.queryByText(CLEO)).not.toBeInTheDocument()
      expect(screen.getByText(BEN)).toBeInTheDocument()
      expect(screen.getByText(DEV)).toBeInTheDocument() // Ben's sibling stays visible
      expect(button(articleOf(ASHA), 'Collapse')).toBeInTheDocument()
      expect(button(articleOf(BEN), 'Show 1 reply')).toBeInTheDocument()
    })

    it('expands a collapsed comment when a reply is posted to it', async () => {
      const user = userEvent.setup()
      render(<App />)
      const asha = articleOf(ASHA)
      await user.click(button(asha, 'Collapse'))
      expect(screen.queryByText(BEN)).not.toBeInTheDocument()

      await reply(user, ASHA, 'Auto open')

      expect(screen.getByText('Auto open')).toBeInTheDocument()
      expect(screen.getByText(BEN)).toBeInTheDocument()
      expect(button(asha, 'Collapse')).toBeInTheDocument()

      await user.click(button(asha, 'Collapse'))
      expect(button(asha, 'Show 4 replies')).toBeInTheDocument()
    })

    it('keeps Upvote, Reply and Delete working on a collapsed comment', async () => {
      const user = userEvent.setup()
      render(<App />)
      const asha = articleOf(ASHA)
      await user.click(button(asha, 'Collapse'))

      await user.click(button(asha, 'Upvote'))
      expect(votesOf(asha)).toHaveTextContent(/^6$/)
      expect(button(asha, 'Show 3 replies')).toBeInTheDocument() // still collapsed

      await user.click(button(asha, 'Reply'))
      expect(replyBox(asha)).toBeInTheDocument()
      await user.click(button(asha, 'Cancel'))
      expect(button(asha, 'Show 3 replies')).toBeInTheDocument()

      await user.click(button(asha, 'Delete'))
      for (const text of [ASHA, BEN, CLEO, DEV]) {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      }
      expect(screen.getByText(EVE)).toBeInTheDocument()
    })

    it('keeps a comment collapsed when a comment above it is deleted (use stable keys)', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(EVE), 'Collapse'))
      expect(screen.queryByText(FINN)).not.toBeInTheDocument()

      await user.click(button(articleOf(ASHA), 'Delete'))

      expect(screen.queryByText(ASHA)).not.toBeInTheDocument()
      expect(button(articleOf(EVE), 'Show 1 reply')).toBeInTheDocument()
      expect(screen.queryByText(FINN)).not.toBeInTheDocument()
    })
  })

  describe('keys', () => {
    it('keeps an open reply form on the right comment when a comment above it is deleted', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(EVE), 'Reply'))
      await user.type(replyBox(articleOf(EVE)), 'draft for Eve')

      await user.click(button(articleOf(ASHA), 'Delete'))

      expect(replyBox(articleOf(EVE))).toHaveValue('draft for Eve')
      expect(screen.getAllByRole('textbox', { name: 'Your reply' })).toHaveLength(1)
    })

    it('does the same for replies: a sibling above is deleted and the draft stays with its comment', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(button(articleOf(DEV), 'Reply'))
      await user.type(replyBox(articleOf(DEV)), 'draft for Dev')

      await user.click(button(articleOf(BEN), 'Delete')) // Ben is the sibling above Dev

      expect(screen.queryByText(BEN)).not.toBeInTheDocument()
      expect(replyBox(articleOf(DEV))).toHaveValue('draft for Dev')
    })
  })

  describe('top-level form', () => {
    it('puts the form above the list of comments', () => {
      render(<App />)
      const box = screen.getByRole('textbox', { name: 'New comment' })
      const add = screen.getByRole('button', { name: 'Add comment' })
      expect(isBefore(box, articleOf(ASHA))).toBe(true)
      expect(isBefore(add, articleOf(ASHA))).toBe(true)
    })

    it('keeps "Add comment" disabled until there is real text', async () => {
      const user = userEvent.setup()
      render(<App />)
      const add = screen.getByRole('button', { name: 'Add comment' })
      expect(add).toBeDisabled()

      await user.type(screen.getByRole('textbox', { name: 'New comment' }), '   ')
      expect(add).toBeDisabled()
      await user.type(screen.getByRole('textbox', { name: 'New comment' }), 'a')
      expect(add).toBeEnabled()

      await user.clear(screen.getByRole('textbox', { name: 'New comment' }))
      expect(add).toBeDisabled()
    })

    it('adds a new top-level comment at the end, written by "You", and clears the form', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addRoot(user, 'My own opinion')

      const mine = articleOf('My own opinion')
      expect(within(mine).getByText('You')).toBeInTheDocument()
      expect(votesOf(mine)).toHaveTextContent(/^0$/)
      expect(depthOf('My own opinion')).toBe(1)
      expect(isBefore(articleOf(FINN), mine)).toBe(true)
      expect(itemOf(EVE)).not.toContainElement(screen.getByText('My own opinion'))

      expect(screen.getByRole('textbox', { name: 'New comment' })).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Add comment' })).toBeDisabled()
    })

    it('keeps the order in which top-level comments were added', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addRoot(user, 'First of mine')
      await addRoot(user, 'Second of mine')
      expect(isBefore(articleOf('First of mine'), articleOf('Second of mine'))).toBe(true)
    })

    it('trims the text of the new comment', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addRoot(user, '  spaced out  ')
      expect(screen.getByText('spaced out').textContent).toBe('spaced out')
    })
  })

  describe('batched updates', () => {
    // React batches the state updates of several events that run together. Each change must
    // start from the LATEST tree (setComments(current => ...)), not from the tree of the render.
    it('does not lose a change when several changes happen in the same batch', async () => {
      const user = userEvent.setup()
      render(<App />)
      for (const [parent, draft] of [
        [DEV, 'reply to Dev'],
        [EVE, 'reply to Eve'],
      ]) {
        await user.click(button(articleOf(parent), 'Reply'))
        await user.type(replyBox(articleOf(parent)), draft)
      }
      await user.type(screen.getByRole('textbox', { name: 'New comment' }), 'root in batch')

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
        fireEvent.click(button(articleOf(BEN), 'Upvote'))
        fireEvent.click(button(articleOf(BEN), 'Upvote'))
        fireEvent.click(button(articleOf(CLEO), 'Delete'))
        fireEvent.click(button(articleOf(DEV), 'Post'))
        fireEvent.click(button(articleOf(EVE), 'Post'))
      })

      expect(votesOf(articleOf(BEN))).toHaveTextContent(/^4$/)
      expect(screen.queryByText(CLEO)).not.toBeInTheDocument()
      expect(itemOf(DEV)).toContainElement(screen.getByText('reply to Dev'))
      expect(itemOf(EVE)).toContainElement(screen.getByText('reply to Eve'))
      expect(depthOf('root in batch')).toBe(1)
    })
  })

  describe('StrictMode', () => {
    // StrictMode runs state updater functions twice in development.
    // Pure updaters give the same result both times. A mutating one does not.
    it('upvotes once, replies once and adds once per click', async () => {
      const user = userEvent.setup()
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )

      await user.click(button(articleOf(BEN), 'Upvote'))
      expect(votesOf(articleOf(BEN))).toHaveTextContent(/^3$/)

      await reply(user, DEV, 'Strict reply')
      expect(screen.getAllByText('Strict reply')).toHaveLength(1)
      await user.click(button(articleOf('Strict reply'), 'Upvote'))
      expect(votesOf(articleOf('Strict reply'))).toHaveTextContent(/^1$/)

      await addRoot(user, 'Strict root')
      expect(screen.getAllByText('Strict root')).toHaveLength(1)
      await user.click(button(articleOf('Strict root'), 'Upvote'))
      expect(votesOf(articleOf('Strict root'))).toHaveTextContent(/^1$/)

      expect(screen.getAllByRole('article')).toHaveLength(8)
    })
  })
})
