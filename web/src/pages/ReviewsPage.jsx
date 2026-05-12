import { useEffect, useState } from 'react'
import { Star, TrendingUp, MessageSquare, ThumbsUp, Reply } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StarRating({ rating, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= rating ? '#f59e0b' : 'none'}
          stroke={i <= rating ? '#f59e0b' : 'var(--text-muted)'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [reviews, setReviews] = useState([])
  const [replyText, setReplyText] = useState({})
  const [showReply, setShowReply] = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`reviews_${biz.id}`)
        if (stored) setReviews(JSON.parse(stored))
      }
    }
    load()
  }, [user])

  const saveReviews = (updated) => {
    setReviews(updated)
    if (business) {
      localStorage.setItem(`reviews_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'reviews', updated)
    }
  }

  const handleReply = (reviewId) => {
    const text = replyText[reviewId]
    if (!text?.trim()) return
    saveReviews(reviews.map(r => r.id === reviewId ? { ...r, reply: text.trim(), reply_date: new Date().toISOString().slice(0, 10) } : r))
    setShowReply(null)
    setReplyText({ ...replyText, [reviewId]: '' })
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0
  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    stars: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === n).length / reviews.length * 100) : 0,
  }))

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reviews</h1>
        <p className="page-subtitle">Customer feedback and ratings for your business</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ marginBottom: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
            {avgRating.toFixed(1)}
          </div>
          <StarRating rating={Math.round(avgRating)} size={20} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Rating Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ratingDist.map(d => (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '13px', minWidth: '20px', textAlign: 'right', color: 'var(--text-secondary)' }}>{d.stars}</div>
                <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--bg-raised)' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${d.pct}%`, background: d.stars >= 4 ? 'var(--green)' : d.stars === 3 ? 'var(--amber)' : 'var(--rose)', transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '24px' }}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="card">
        <div className="card-title">
          <span>All Reviews</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>
            Reviews appear here when customers rate their experience after a booking
          </span>
        </div>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
            <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>No reviews yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto' }}>
              When customers complete a booking, they'll be invited to leave a review. Reviews will appear here for you to manage and respond to.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(r => (
              <div key={r.id} style={{ padding: '20px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{r.customer_name}</div>
                    <StarRating rating={r.rating} size={14} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(r.date)}</div>
                </div>
                {r.service_name && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-bright)', marginBottom: '8px' }}>{r.service_name}</div>
                )}
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{r.comment}</div>

                {r.reply ? (
                  <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-bright)', marginBottom: '4px' }}>Your Reply</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{r.reply}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    {showReply === r.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Write a reply..."
                          value={replyText[r.id] || ''}
                          onChange={e => setReplyText({ ...replyText, [r.id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleReply(r.id)}
                          style={{ flex: 1, fontSize: '13px' }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleReply(r.id)}>Reply</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowReply(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowReply(r.id)} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Reply size={12} /> Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
