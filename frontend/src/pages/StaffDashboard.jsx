
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import 
{
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function StaffDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingFaqId, setEditingFaqId] = useState(null)
  const [faqCategory, setFaqCategory] = useState('courses')
   const [faqQuestion, setFaqQuestion] = useState('')
   const [faqKeywords, setFaqKeywords] = useState('')
   const [faqAnswer, setFaqAnswer] = useState('')
   const [faqMessage, setFaqMessage] = useState('')
   const [faqSaving, setFaqSaving] = useState(false) 

  const token = localStorage.getItem('arc_token')
  
  function resetFaqForm() {
    setEditingFaqId(null)
    setFaqCategory('courses')
    setFaqQuestion('')
    setFaqKeywords('')
    setFaqAnswer('')
  }

  function handleEditFaq(faq) {
    setEditingFaqId(faq.id)
    setFaqCategory(faq.category)
    setFaqQuestion(faq.question)
    setFaqKeywords(faq.trigger_keywords)
    setFaqAnswer(faq.canonical_answer)
    setFaqMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSaveFaq(event) {
    event.preventDefault()

    setFaqSaving(true)
    setFaqMessage('')

    try {
      const faqData = {
        category: faqCategory,
        question: faqQuestion.trim(),
        trigger_keywords: faqKeywords.trim(),
        canonical_answer: faqAnswer.trim(),
      }

      const isEditing = editingFaqId !== null

      const response = await fetch(
        isEditing
          ? `${API_URL}/admin/faq/${editingFaqId}`
          : `${API_URL}/admin/faq`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(faqData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to save FAQ.')
      }

      if (isEditing) {
        setFaqs((current) =>
          current.map((faq) => faq.id === editingFaqId ? data : faq)
        )
        setFaqMessage('FAQ updated successfully!')
      } else {
        setFaqs((current) => [...current, data])
        setFaqMessage('FAQ added successfully!')
      }

      resetFaqForm()
    } catch (err) {
      setFaqMessage(err.message || 'Something went wrong.')
    } finally {
      setFaqSaving(false)
    }
  }


  useEffect(() => {
    if (!token) {
      navigate('/staff')
      return
    }

    async function loadDashboard() {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const [statsResponse, faqResponse] = await Promise.all([
          fetch(`${API_URL}/admin/stats`, { headers }),
          fetch(`${API_URL}/admin/faq`, { headers }),
        ])

        if (statsResponse.status === 401 || faqResponse.status === 401) {
          localStorage.removeItem('arc_token')
          navigate('/staff')
          return
        }

        if (!statsResponse.ok || !faqResponse.ok) {
          throw new Error('Unable to load dashboard data.')
        }

        const statsData = await statsResponse.json()
        const faqData = await faqResponse.json()

        setStats(statsData)
        setFaqs(faqData)
      } catch (err) {
        setError(err.message || 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token, navigate])

  function handleLogout() {
    localStorage.removeItem('arc_token')
    navigate('/staff')
  }

  if (loading) {
    return <main className="app-shell"><p>Loading dashboard...</p></main>
  }

const verdictChartData = stats
  ? Object.entries(stats.verdict_rate_by_category || {}).map(
      ([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        Answered: data.verdict_rates_percent?.Answered ?? 0,
        Refused: data.verdict_rates_percent?.Refused ?? 0,
        Unclear: data.verdict_rates_percent?.Unclear ?? 0,
      })
    )
  : []

const responseTimeChartData = stats
  ? Object.entries(stats.average_response_time_ms_by_category || {}).map(
      ([category, responseTime]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        responseTime,
      })
    )
  : []

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>Arc Lite</span>
        </a>
        <span className="team-label">ARCHINTX · ADMIN DASHBOARD</span>
        <button type="button" className="staff-link" onClick={handleLogout}>
          Logout ↗
        </button>
      </header>

      <section className="chat-layout dashboard-layout">
        <div className="intro">
          <span className="eyebrow">STAFF CONTROL CENTER</span>
          <h1>Dashboard overview</h1>
          <p>Monitor FAQ activity and review assistant performance.</p>
        </div>

        {error && <p className="feedback-note" role="alert">{error}</p>}

        {stats && (
          <>
          
<section className="chat-card">
  <h2>{editingFaqId ? 'Edit FAQ' : 'Add New FAQ'}</h2>
  <p>Create or update an approved FAQ entry.</p>

  <form className="question-form" onSubmit={handleSaveFaq}>
    <label htmlFor="faq-category">Category</label>
    <select
      id="faq-category"
      value={faqCategory}
      onChange={(event) => setFaqCategory(event.target.value)}
      required
    >
      <option value="courses">Courses</option>
      <option value="certificates">Certificates</option>
      <option value="jobs">Jobs</option>
      <option value="account">Account</option>
    </select>

    <label htmlFor="faq-question">FAQ Question</label>
    <input
      id="faq-question"
      type="text"
      value={faqQuestion}
      onChange={(event) => setFaqQuestion(event.target.value)}
      placeholder="Enter the FAQ question"
      required
    />

    <label htmlFor="faq-keywords">Trigger Keywords</label>
    <textarea
      id="faq-keywords"
      value={faqKeywords}
      onChange={(event) => setFaqKeywords(event.target.value)}
      placeholder="Example: course access, enrollment, register"
      rows={2}
      required
    />

    <label htmlFor="faq-answer">Canonical Answer</label>
    <textarea
      id="faq-answer"
      value={faqAnswer}
      onChange={(event) => setFaqAnswer(event.target.value)}
      placeholder="Enter the approved FAQ answer"
      rows={4}
      required
    />

    <div className="form-footer">
      <span>{editingFaqId ? 'Editing FAQ' : 'New FAQ entry'}</span>
      <button type="submit" disabled={faqSaving}>
        {faqSaving ? 'Saving...' : editingFaqId ? 'Update FAQ' : 'Add FAQ'}
      </button>
    </div>

    {editingFaqId && (
      <button type="button" onClick={resetFaqForm}>
        Cancel editing
      </button>
    )}

    {faqMessage && (
      <p className="feedback-note" role="status">{faqMessage}</p>
    )}
  </form>
</section>

            <section className="chat-card">
              <h2>Conversation overview</h2>
              <h1>{stats.total_conversations}</h1>
              <p>Total conversations recorded</p>
            </section>

            <section className="chat-card">
              <h2>Verdict rates by category</h2>
              {Object.entries(stats.verdict_rate_by_category).map(
                ([category, details]) => (
                  <div key={category}>
                    <h3>{category}</h3>
                    <p>
                      Answered: {details.verdict_rates_percent.Answered}%
                    </p>
                    <p>
                      Refused: {details.verdict_rates_percent.Refused}%
                    </p>
                    <p>
                      Unclear: {details.verdict_rates_percent.Unclear}%
                    </p>
                  </div>
                )
              )}
            </section>

            <section className="chat-card">
              <h2>Average response time</h2>
              {Object.entries(stats.average_response_time_ms_by_category).map(
                ([category, time]) => (
                  <p key={category}>
                    {category}: {time} ms
                  </p>
                )
              )}
            </section>

<section className="chat-card">
  <h2>Verdict Rates by Category</h2>
  <p>Percentage of responses by verdict.</p>

  <div style={{ width: '100%', height: 320 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={verdictChartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip />
        <Legend />
        <Bar dataKey="Answered" stackId="a" fill="#16a34a" />
        <Bar dataKey="Refused" stackId="a" fill="#dc2626" />
        <Bar dataKey="Unclear" stackId="a" fill="#eab308" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</section>

            <section className="chat-card">
              <h2>Answered but rated down 👎</h2>
              {stats.answered_but_rated_down.length === 0 ? (
                <p>No negative feedback recorded.</p>
              ) : (
                stats.answered_but_rated_down.map((item) => (
                  <div key={item.conversation_id}>
                    <p><strong>Question:</strong> {item.question}</p>
                    <p><strong>Category:</strong> {item.category}</p>
                    <p><strong>Answer:</strong> {item.answer}</p>
                    <p><strong>Response time:</strong> {item.response_time_ms} ms</p>
                  </div>
                ))
              )}
            </section>
            <section className="chat-card">
              <h2>Answered but rated up 👍</h2>
              {stats.answered_but_rated_up.length === 0 ? (
                <p>No positive feedback recorded.</p>
              ) : (
                stats.answered_but_rated_up.map((item) => (
                  <div key={item.conversation_id}>
                    <p><strong>Question:</strong> {item.question}</p>
                    <p><strong>Category:</strong> {item.category}</p>
                    <p><strong>Answer:</strong> {item.answer}</p>
                    <p><strong>Response time:</strong> {item.response_time_ms} ms</p>
                  </div>
                ))
              )}
            </section>
            <section className="chat-card">
  <h2>Average Response Time</h2>
  <p>Average chatbot response time by category, in milliseconds.</p>

  <div style={{ width: '100%', height: 320 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={responseTimeChartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis unit=" ms" />
        <Tooltip />
        <Bar dataKey="responseTime" name="Response Time" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</section>

          </>
        )}

        <section className="chat-card">
          <h2>FAQ knowledge base</h2>
          <p>{faqs.length} FAQ entries available</p>

          {faqs.map((faq) => (
            <div key={faq.id}>
              <h3>{faq.question}</h3>
              <p><strong>Category:</strong> {faq.category}</p>
              <p>{faq.canonical_answer}</p>
              
<p><strong>Keywords:</strong> {faq.trigger_keywords}</p>

<button
  type="button"
  onClick={() => handleEditFaq(faq)}
>
  Edit FAQ
</button>

<hr />

            </div>
          ))}
        </section>
      </section>
    </main>
  )
}

export default StaffDashboard
