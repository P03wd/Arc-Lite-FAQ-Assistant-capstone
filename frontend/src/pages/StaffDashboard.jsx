
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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

const categories = ['courses', 'certificates', 'jobs', 'account']

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

  const [faqSearch, setFaqSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const token = localStorage.getItem('arc_token')

  function resetFaqForm() {
    setEditingFaqId(null)
    setFaqCategory('courses')
    setFaqQuestion('')
    setFaqKeywords('')
    setFaqAnswer('')
    setFaqMessage('')
  }

  function handleEditFaq(faq) {
    setEditingFaqId(faq.id)
    setFaqCategory(faq.category)
    setFaqQuestion(faq.question)
    setFaqKeywords(faq.trigger_keywords)
    setFaqAnswer(faq.canonical_answer)
    setFaqMessage('')
    document.getElementById('faq-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
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
      setFaqMessage(isEditing
        ? 'FAQ updated successfully!'
        : 'FAQ added successfully!')
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
    return (
      <main className="staff-loading">
        <p>Loading dashboard...</p>
      </main>
    )
  }

  const verdictData = stats
    ? Object.entries(stats.verdict_rate_by_category || {}).map(
        ([category, data]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          Answered: data.verdict_rates_percent?.Answered ?? 0,
          Refused: data.verdict_rates_percent?.Refused ?? 0,
          Unclear: data.verdict_rates_percent?.Unclear ?? 0,
        })
      )
    : []

  const responseTimeData = stats
    ? Object.entries(stats.average_response_time_ms_by_category || {}).map(
        ([category, responseTime]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          responseTime,
        })
      )
    : []

  const positiveFeedback = stats?.answered_but_rated_up || []
  const negativeFeedback = stats?.answered_but_rated_down || []
  const feedbackCount = positiveFeedback.length + negativeFeedback.length

  const filteredFaqs = faqs.filter((faq) => {
    const search = faqSearch.toLowerCase()
    const matchesSearch =
      faq.question.toLowerCase().includes(search) ||
      faq.trigger_keywords.toLowerCase().includes(search) ||
      faq.canonical_answer.toLowerCase().includes(search)

    const matchesCategory =
      categoryFilter === 'all' || faq.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  return (
    <div className="staff-dashboard">
      <aside className="staff-sidebar">
        <a className="staff-brand" href="/">
          <span className="staff-brand-mark">A</span>
          <span>
            <strong>Arc Lite</strong>
            <small>ARCHINTX ADMIN</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="staff-nav">
          <a className="active" href="#overview">▦ <span>Overview</span></a>
          <a href="#analytics">▤ <span>Analytics</span></a>
          <a href="#feedback">♡ <span>Feedback</span></a>
          <a href="#faq-form">＋ <span>Add FAQ</span></a>
          <a href="#knowledge-base">▣ <span>Knowledge Base</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="online-dot" />
            Assistant system
            <strong>Online</strong>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="staff-main">
        <header className="staff-topbar">
          <div>
            <span className="topbar-caption">ARCHINTX / ADMINISTRATION</span>
            <p>Staff Control Center</p>
          </div>
          <button className="topbar-logout" onClick={handleLogout}>
            Log out ↗
          </button>
        </header>

        <div className="staff-content">
          <section className="staff-page-heading" id="overview">
            <div>
              <span className="section-eyebrow">OVERVIEW</span>
              <h1>Dashboard</h1>
              <p>Monitor FAQ activity and review assistant performance.</p>
            </div>
            <span className="system-status">
              <span className="online-dot" /> System operational
            </span>
          </section>

          {error && <div className="staff-error" role="alert">{error}</div>}

          {stats && (
            <>
              <section className="summary-grid">
                <article className="summary-card">
                  <span className="summary-icon blue">▤</span>
                  <p>Total conversations</p>
                  <h2>{stats.total_conversations}</h2>
                  <small>Recorded interactions</small>
                </article>

                <article className="summary-card">
                  <span className="summary-icon purple">▣</span>
                  <p>FAQ knowledge base</p>
                  <h2>{faqs.length}</h2>
                  <small>Approved FAQ entries</small>
                </article>

                <article className="summary-card">
                  <span className="summary-icon green">👍</span>
                  <p>Positive feedback</p>
                  <h2>{positiveFeedback.length}</h2>
                  <small>Answers rated up</small>
                </article>

                <article className="summary-card">
                  <span className="summary-icon orange">👎</span>
                  <p>Negative feedback</p>
                  <h2>{negativeFeedback.length}</h2>
                  <small>Answers rated down</small>
                </article>
              </section>

              <section className="staff-section" id="analytics">
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">PERFORMANCE</span>
                    <h2>Analytics overview</h2>
                    <p>Understand how Arc Lite handles user questions.</p>
                  </div>
                </div>

                <div className="analytics-grid">
                  <article className="staff-panel">
                    <div className="panel-heading">
                      <h3>Verdict rates by category</h3>
                      <p>Percentage of responses by verdict.</p>
                    </div>
                    <div className="staff-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={verdictData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Answered" stackId="a" fill="#16a36a" />
                          <Bar dataKey="Refused" stackId="a" fill="#e05252" />
                          <Bar dataKey="Unclear" stackId="a" fill="#e8aa36" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="staff-panel">
                    <div className="panel-heading">
                      <h3>Average response time</h3>
                      <p>Average chatbot response time in milliseconds.</p>
                    </div>
                    <div className="staff-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={responseTimeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis unit=" ms" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="responseTime"
                            name="Response time"
                            fill="#5275e8"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                </div>

                <article className="staff-panel verdict-breakdown">
                  <div className="panel-heading">
                    <h3>Category performance details</h3>
                    <p>Answered, refused and unclear response percentages.</p>
                  </div>
                  <div className="verdict-table-wrap">
                    <table className="verdict-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Answered</th>
                          <th>Refused</th>
                          <th>Unclear</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.verdict_rate_by_category || {}).map(
                          ([category, details]) => (
                            <tr key={category}>
                              <td>{category}</td>
                              <td>{details.verdict_rates_percent?.Answered ?? 0}%</td>
                              <td>{details.verdict_rates_percent?.Refused ?? 0}%</td>
                              <td>{details.verdict_rates_percent?.Unclear ?? 0}%</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>

              <section className="staff-section" id="feedback">
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">USER EXPERIENCE</span>
                    <h2>Conversation feedback</h2>
                    <p>Review answers based on user ratings.</p>
                  </div>
                  <span className="feedback-total">{feedbackCount} ratings</span>
                </div>

                <div className="feedback-grid">
                  <article className="staff-panel">
                    <div className="feedback-panel-heading positive-heading">
                      <span>👍</span>
                      <div>
                        <h3>Positive feedback</h3>
                        <p>{positiveFeedback.length} answers rated up</p>
                      </div>
                    </div>

                    <div className="feedback-list">
                      {positiveFeedback.length === 0 ? (
                        <p className="empty-state">No positive feedback recorded.</p>
                      ) : (
                        positiveFeedback.map((item) => (
                          <div className="feedback-item" key={item.conversation_id}>
                            <strong>{item.question}</strong>
                            <p>{item.answer}</p>
                            <div className="feedback-meta">
                              <span>{item.category}</span>
                              <span>{item.response_time_ms} ms</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>

                  <article className="staff-panel">
                    <div className="feedback-panel-heading negative-heading">
                      <span>👎</span>
                      <div>
                        <h3>Negative feedback</h3>
                        <p>{negativeFeedback.length} answers rated down</p>
                      </div>
                    </div>

                    <div className="feedback-list">
                      {negativeFeedback.length === 0 ? (
                        <p className="empty-state">No negative feedback recorded.</p>
                      ) : (
                        negativeFeedback.map((item) => (
                          <div className="feedback-item" key={item.conversation_id}>
                            <strong>{item.question}</strong>
                            <p>{item.answer}</p>
                            <div className="feedback-meta">
                              <span>{item.category}</span>
                              <span>{item.response_time_ms} ms</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}

          <section className="staff-section" id="faq-form">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">KNOWLEDGE MANAGEMENT</span>
                <h2>{editingFaqId ? 'Edit FAQ entry' : 'Add a new FAQ'}</h2>
                <p>Maintain the approved answers used by Arc Lite.</p>
              </div>
            </div>

            <article className="staff-panel faq-form-panel">
              <form className="staff-faq-form" onSubmit={handleSaveFaq}>
                <div className="form-field">
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
                </div>

                <div className="form-field">
                  <label htmlFor="faq-question">FAQ question</label>
                  <input
                    id="faq-question"
                    value={faqQuestion}
                    onChange={(event) => setFaqQuestion(event.target.value)}
                    placeholder="Enter the FAQ question"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="faq-keywords">Trigger keywords</label>
                  <textarea
                    id="faq-keywords"
                    value={faqKeywords}
                    onChange={(event) => setFaqKeywords(event.target.value)}
                    placeholder="Example: course access, enrollment, register"
                    rows={3}
                    required
                  />
                  <small>Separate related search terms with commas.</small>
                </div>

                <div className="form-field">
                  <label htmlFor="faq-answer">Canonical answer</label>
                  <textarea
                    id="faq-answer"
                    value={faqAnswer}
                    onChange={(event) => setFaqAnswer(event.target.value)}
                    placeholder="Enter the approved FAQ answer"
                    rows={5}
                    required
                  />
                </div>

                <div className="faq-form-actions">
                  {editingFaqId && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetFaqForm}
                    >
                      Cancel editing
                    </button>
                  )}
                  <button type="submit" className="primary-button" disabled={faqSaving}>
                    {faqSaving
                      ? 'Saving...'
                      : editingFaqId
                        ? 'Update FAQ'
                        : 'Add FAQ'}
                  </button>
                </div>

                {faqMessage && (
                  <p className="form-status" role="status">{faqMessage}</p>
                )}
              </form>
            </article>
          </section>

          <section className="staff-section" id="knowledge-base">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">APPROVED CONTENT</span>
                <h2>FAQ knowledge base</h2>
                <p>Search, review and update approved FAQ entries.</p>
              </div>
              <span className="feedback-total">{faqs.length} entries</span>
            </div>

            <article className="staff-panel knowledge-panel">
              <div className="faq-toolbar">
                <input
                  type="search"
                  value={faqSearch}
                  onChange={(event) => setFaqSearch(event.target.value)}
                  placeholder="Search questions or keywords..."
                  aria-label="Search FAQs"
                />

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter FAQs by category"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="faq-list">
                {filteredFaqs.length === 0 ? (
                  <p className="empty-state">No matching FAQs found.</p>
                ) : (
                  filteredFaqs.map((faq) => (
                    <article className="faq-item" key={faq.id}>
                      <div className="faq-item-content">
                        <div className="faq-item-topline">
                          <span className={`faq-category category-${faq.category}`}>
                            {faq.category}
                          </span>
                        </div>
                        <h3>{faq.question}</h3>
                        <p>{faq.canonical_answer}</p>
                        <small><strong>Keywords:</strong> {faq.trigger_keywords}</small>
                      </div>
                      <button
                        type="button"
                        className="edit-faq-button"
                        onClick={() => handleEditFaq(faq)}
                      >
                        Edit FAQ
                      </button>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>

          <footer className="staff-footer">
            <span>Arc Lite · ArchintX FAQ Assistant</span>
            <span>Staff Control Center</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default StaffDashboard
