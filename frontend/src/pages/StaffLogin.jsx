
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function StaffLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Check your credentials.')
      }

      localStorage.setItem('arc_token', data.access_token)
      navigate('/staff/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>Arc Lite</span>
        </a>
        <span className="team-label">ARCHINTX · STAFF PORTAL</span>
        <a className="staff-link" href="/">Back to chat ↗</a>
      </header>

      <section className="chat-layout">
        <div className="intro">
          <span className="eyebrow">STAFF ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage FAQs and review assistant analytics.</p>
        </div>

        <section className="chat-card login-card">
          <div className="card-heading">
            <div className="assistant-avatar">A</div>
            <div>
              <h2>Staff Login</h2>
              <p>Authorized ArchintX staff only</p>
            </div>
          </div>

          <form className="question-form" onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your staff email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />

            {error && (
              <p className="feedback-note" role="alert">
                {error}
              </p>
            )}

            <div className="form-footer">
              <span>Secure staff access</span>
              <button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
                <span aria-hidden="true"> →</span>
              </button>
            </div>
          </form>

          <div className="privacy-note">
            <span aria-hidden="true">🔒</span>
            Your staff account is protected by backend authentication.
          </div>
        </section>
      </section>
    </main>
  )
}

export default StaffLogin
