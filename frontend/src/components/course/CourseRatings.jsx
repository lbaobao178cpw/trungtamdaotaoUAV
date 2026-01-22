import React, { useState, useEffect } from 'react';
import { Star, Trash2, Send } from 'lucide-react';
import './CourseRatings.css';
import { notifySuccess, notifyError, notifyWarning } from '../../lib/notifications';

const API_BASE = "http://localhost:5000/api/courses";

export default function CourseRatings({ courseId, token }) {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Decode JWT để lấy user info
  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      console.error('Lỗi decode token:', e);
      return null;
    }
  };

  // Fetch ratings khi load component
  useEffect(() => {
    if (token) {
      const user = decodeToken(token);
      setCurrentUserId(user?.id || null);
    }
    fetchRatings();
  }, [courseId, token]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/${courseId}/ratings`, { headers });
      if (!res.ok) throw new Error("Không thể tải đánh giá");

      const data = await res.json();
      setStats(data.stats);
      setRatings(data.ratings || []);

      // Kiểm tra xem user đã đánh giá chưa
      const myRating = data.ratings.find(r => r.user_id === currentUserId);
      if (myRating) {
        setUserRating(myRating.rating);
        setUserComment(myRating.comment || '');
      }
    } catch (error) {
      // Không hiển thị error notification nếu chỉ là lỗi load
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!token) {
      notifyWarning('Vui lòng đăng nhập để đánh giá');
      return;
    }
    if (!userRating) {
      notifyWarning('Vui lòng chọn số sao');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/${courseId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: userRating,
          comment: userComment.trim()
        })
      });

      if (!res.ok) throw new Error("Lỗi gửi đánh giá");

      notifySuccess(userRating > 0 ? 'Đánh giá thành công!' : 'Cập nhật đánh giá thành công!');
      setUserComment('');
      await fetchRatings();
    } catch (error) {
      notifyError('Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRating = async (ratingId) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return;

    try {
      const res = await fetch(`${API_BASE}/${courseId}/ratings/${ratingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Không thể xóa đánh giá");

      notifySuccess('Đánh giá đã được xóa');
      setUserRating(0);
      setUserComment('');
      await fetchRatings();
    } catch (error) {
      notifyError('Không thể xóa đánh giá. Vui lòng thử lại.');
    }
  };

  const StarRating = ({ value, onChange, onHover, onHoverLeave }) => (
    <div className="star-rating-input">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={onHoverLeave}
          className={`star-btn ${i <= (hoverRating || value) ? 'active' : ''}`}
        >
          <Star size={28} fill={i <= (hoverRating || value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );

  const renderStars = (rating) => (
    <div className="stars-display">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={16}
          fill={i <= rating ? '#fbbf24' : '#e5e7eb'}
          color={i <= rating ? '#fbbf24' : '#e5e7eb'}
        />
      ))}
    </div>
  );

  if (loading) return <div className="ratings-loading">Đang tải đánh giá...</div>;

  return (
    <div className="course-ratings-section">
      <h2 className="ratings-title">Đánh giá khóa học</h2>

      {/* Rating Summary */}
      {stats && (
        <div className="ratings-summary">
          <div className="ratings-average">
            <div className="average-score">{stats.averageRating}</div>
            <div className="average-stars">{renderStars(Math.round(stats.averageRating))}</div>
            <div className="total-ratings">({stats.totalRatings} đánh giá)</div>
          </div>

          <div className="ratings-distribution">
            {[5, 4, 3, 2, 1].map(star => (
              <div key={star} className="distribution-bar">
                <span className="star-label">{star} ⭐</span>
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${stats.totalRatings > 0 ? (stats.distribution[star] / stats.totalRatings * 100) : 0}%`
                    }}
                  ></div>
                </div>
                <span className="bar-count">{stats.distribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Form */}
      {token ? (
        <form className="rating-form" onSubmit={handleSubmitRating}>
          <h3 className="form-title">{userRating ? 'Cập nhật đánh giá' : 'Thêm đánh giá của bạn'}</h3>

          <div className="form-group">
            <label className="form-label">Chọn số sao:</label>
            <StarRating
              value={userRating}
              onChange={setUserRating}
              onHover={setHoverRating}
              onHoverLeave={() => setHoverRating(0)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bình luận của bạn:</label>
            <textarea
              className="rating-textarea"
              placeholder="Chia sẻ trải nghiệm của bạn về khóa học này..."
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              rows="4"
            />
          </div>

          <button type="submit" className="btn-submit-rating" disabled={submitting}>
            <Send size={16} /> {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </form>
      ) : (
        <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', color: '#aaa', marginBottom: '20px' }}>
          <p>Vui lòng đăng nhập để đánh giá khóa học</p>
        </div>
      )}

      {/* Ratings List */}
      <div className="ratings-list">
        <h3 className="list-title">Các đánh giá khác</h3>
        {ratings.length === 0 ? (
          <p className="no-ratings">Chưa có đánh giá nào</p>
        ) : (
          ratings.map(rating => (
            <div key={rating.id} className="rating-card">
              <div className="rating-header">
                <div className="user-info">
                  <h4 className="user-name">{rating.full_name}</h4>
                  <div className="rating-meta">
                    {renderStars(rating.rating)}
                    <span className="rating-date">
                      {new Date(rating.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
                {currentUserId === rating.user_id && (
                  <button
                    className="btn-delete-rating"
                    onClick={() => handleDeleteRating(rating.id)}
                    title="Xóa đánh giá"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {rating.comment && <p className="rating-comment">{rating.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
