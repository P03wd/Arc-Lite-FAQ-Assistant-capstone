
import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [rating, setRating] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!question.trim() || loading) return

    setLoading(true)
    setError('')
    setAnswer(null)
    setRating(null)

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to get an answer.')
      }

      setAnswer({
        category: data.category,
        verdict: data.verdict,
        answer: data.answer,
        id: data.conversation_id,
      })
    } catch (err) {
      setError(err.message || 'Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRating(value) {
    if (!answer?.id || ratingLoading) return

    setRatingLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/chat/${answer.id}/rate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating: value }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to save feedback.')
      }

      setRating(value)
    } catch (err) {
      setError(err.message || 'Unable to save feedback.')
    } finally {
      setRatingLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>Arc Lite</span>
        </a>
        <span className="team-label">ARCHINTX · FAQ ASSISTANT</span>
        <a className="staff-link" href="/staff">Staff login ↗</a>
      </header>

      <section className="chat-layout">
        <div className="intro">
          <span className="eyebrow">YOUR ARCHINTX HELP DESK</span>
          <h1>Questions? Let's find the right answer.</h1>
          <p>
            Ask about courses, certificates, jobs, or your account.
            Arc Lite answers using its approved FAQ knowledge base.
          </p>
        </div>

        <section className="chat-card">
          <div className="card-heading">
            <div className="assistant-avatar">A</div>
            <div>
              <h2>Arc Lite Assistant</h2>
              <p><span className="status-dot" /> FAQ-based support</p>
            </div>
          </div>

          <div className="welcome-message">
            <span className="message-label">ARC LITE</span>
            <p>
              Hello! How can I help you today? Ask me a question about
              ArchintX courses, certificates, jobs, or your account.
            </p>
          </div>

          {answer && (
            <div className="answer-message" aria-live="polite">
              <div className="answer-meta">
                <span className="message-label">RESPONSE</span>
                <span className="category-badge">{answer.category}</span>
                <span className="verdict-badge">{answer.verdict}</span>
              </div>
              <p>{answer.answer}</p>

              <div className="feedback">
                <span>Was this helpful?</span>
                <button
                  type="button"
                  className={rating === 'up' ? 'rating selected' : 'rating'}
                  onClick={() => handleRating('up')}
                  disabled={ratingLoading || !answer.id}
                  aria-label="Thumbs up"
                  aria-pressed={rating === 'up'}
                  title="Helpful"
                >
                  👍
                </button>
                <button
                  type="button"
                  className={rating === 'down' ? 'rating selected' : 'rating'}
                  onClick={() => handleRating('down')}
                  disabled={ratingLoading || !answer.id}
                  aria-label="Thumbs down"
                  aria-pressed={rating === 'down'}
                  title="Not helpful"
                >
                  👎
                </button>
              </div>

              {rating && (
                <p className="feedback-note">
                  Thank you! Your feedback has been saved.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="feedback-note" role="alert">
              {error}
            </p>
          )}

          <form className="question-form" onSubmit={handleSubmit}>
            <label htmlFor="question">Your question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. How can I access my course certificate?"
              rows={3}
              maxLength={1000}
            />
            <div className="form-footer">
              <span>Ask a clear, specific question.</span>
              <button type="submit" disabled={!question.trim() || loading}>
                {loading ? 'Checking FAQs...' : 'Ask Arc Lite'}
                <span aria-hidden="true"> →</span>
              </button>
            </div>
          </form>

          <div className="privacy-note">
            <span aria-hidden="true">🔒</span>
            Answers will be based on approved FAQs, not guesses.
          </div>
        </section>

        <footer className="page-footer">
          <span>ArchintX · AI Engineering</span>
          <span>Knowledge-backed answers only</span>
        </footer>
      </section>
    </main>
  )
}

export default App
