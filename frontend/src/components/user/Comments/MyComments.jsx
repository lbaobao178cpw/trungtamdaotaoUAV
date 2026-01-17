import React, { useEffect, useState } from 'react';
import '../Comments/MyComments.css';
import { Link } from "react-router-dom";


const API_BASE = 'http://localhost:5000/api/comments';

function MyComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchMyComments = async () => {
      try {
        const res = await fetch(`${API_BASE}/my-comments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Không thể tải lịch sử bình luận');
        }

        const data = await res.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyComments();
  }, [token]);

  if (loading) {
    return <div className="loading-container">Đang tải bình luận...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }
  const handleDelete = async (commentId) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa bình luận này?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Xóa bình luận thất bại");
      }

      // Xóa comment khỏi UI (không cần reload)
      setComments(prev =>
        prev.filter(comment => comment.id !== commentId)
      );
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="comments-history-container">
      <h2 className="section-title">Lịch Sử Bình Luận</h2>

      {comments.length === 0 ? (
        <p>Bạn chưa có bình luận nào.</p>
      ) : (
        <ul className="comments-list">
          {comments.map(comment => (
            <li key={comment.id} className="comment-item">
              {/* Nội dung */}
              <div className="comment-text">
                {comment.content}
              </div>

              {/* Thời gian */}
              <div className="comment-date">
                {new Date(comment.created_at).toLocaleString("vi-VN")}
              </div>

              {/* Course + Delete */}
              <div className="comment-footer">
                <Link
                  to={`/khoa-hoc/${comment.course_id}`}
                  className="comment-course-link"
                >
                  [Khóa học] {comment.course_title}
                </Link>

                <span
                  className="comment-delete-text"
                  onClick={() => handleDelete(comment.id)}
                >
                  Xóa bình luận
                </span>
              </div>
            </li>
          ))}
        </ul>


      )}
    </div>
  );
}

export default MyComments;
