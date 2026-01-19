import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CourseDetailPage.css'; // Đảm bảo import CSS mới
import noVideoImage from "../assets/noVideoImage.png";


import {
  Video, FileText, ChevronDown, ChevronUp,
  PenTool, PlayCircle, MessageSquare, CheckCircle, RefreshCw,
  Circle, CheckCircle2, Star
} from 'lucide-react';

const API_BASE = "http://localhost:5000/api/courses";
const COMMENTS_API = "http://localhost:5000/api/comments";
const MEDIA_BASE = "http://localhost:5000";

function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const topRef = useRef(null);

  // === DATA STATE ===
  const [course, setCourse] = useState(null);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // === UI STATE ===
  const [activeTab, setActiveTab] = useState('intro');
  const [expandedChapters, setExpandedChapters] = useState({});

  // === PLAYER STATE ===
  const [activeLesson, setActiveLesson] = useState(null);

  // === QUIZ STATE ===
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // === COMMENT STATE ===
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentRating, setCommentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('user_token'));

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    try {
      const res = await fetch(`${COMMENTS_API}/${commentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Xóa bình luận thất bại");
        return;
      }

      // Cập nhật UI ngay
      setComments(prev => prev.filter(c => c.id !== commentId));

    } catch (err) {
      console.error("Lỗi xóa comment:", err);
      alert("Lỗi server");
    }
  };


  // === GHI NHẬN LƯỢT XEM MỖI 10S NẾU Ở LẠI TRANG ===
  useEffect(() => {
    if (!id) return;

    const recordView = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/${id}/record-view`, {
          method: 'POST',
          headers
        });

        if (res.ok) {
          console.log('✅ Đã ghi nhận lượt xem');
        }
      } catch (err) {
        console.error('❌ Lỗi ghi nhận lượt xem:', err);
      }
    };

    // Gọi ngay khi click vào khóa học
    recordView();

    // Cứ mỗi 10 phút ghi nhận 1 lần nếu user ở lại
    const interval = setInterval(recordView, 600000);

    return () => clearInterval(interval); // cleanup khi rời trang
  }, [id, token]);


  // === UTILITY: Decode JWT để lấy user info ===
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

  // === SET CURRENT USER KHI TOKEN THAY ĐỔI ===
  useEffect(() => {
    if (token) {
      const user = decodeToken(token);
      setCurrentUser(user);
    }
  }, [token]);

  // === FETCH COMMENTS ===
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await fetch(`${COMMENTS_API}/course/${id}?limit=6`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Lỗi tải comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  // === POST COMMENT ===
  const handlePostComment = async () => {
    if (!commentContent.trim()) {
      alert('Vui lòng nhập nội dung bình luận');
      return;
    }
    if (!token) {
      alert('Vui lòng đăng nhập để bình luận');
      navigate('/dang-nhap');
      return;
    }

    try {
      const res = await fetch(COMMENTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: parseInt(id),
          content: commentContent.trim(),
          rating: commentRating || null
        })
      });

      if (res.ok) {
        setCommentContent('');
        setCommentRating(0);
        fetchComments();
        alert('Bình luận thành công!');
      } else {
        const error = await res.json();
        alert(error.error || 'Lỗi khi bình luận');
      }
    } catch (err) {
      console.error("Lỗi post comment:", err);
      alert('Lỗi server');
    }
  };

  // --- MÔ PHỎNG LẠI PHẦN LOGIC ĐỂ CODE CHẠY ĐƯỢC ---
  useEffect(() => {
    // Kiểm tra đăng nhập trước
    if (!token) {
      alert('Vui lòng đăng nhập để xem chi tiết khóa học');
      navigate('/dang-nhap');
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Chuẩn bị headers với token nếu có
        const headers = token ? {
          'Authorization': `Bearer ${token}`
        } : {};

        // Gọi API chi tiết khóa học (giờ yêu cầu đăng nhập)
        const resCourse = await fetch(`${API_BASE}/${id}`, { headers });

        if (!resCourse.ok) {
          if (resCourse.status === 401) {
            alert('Vui lòng đăng nhập để xem chi tiết khóa học');
            navigate('/dang-nhap');
            return;
          }
          throw new Error("Lỗi tải khóa học");
        }

        const data = await resCourse.json();

        let processedChapters = [];
        if (data.chapters && data.chapters.length > 0) {
          processedChapters = data.chapters.map(chap => ({
            ...chap,
            lessons: (chap.lessons || []).map(l => formatLessonData(l))
          }));
        } else if (data.lessons && data.lessons.length > 0) {
          processedChapters = [{
            id: 'main',
            title: 'Nội dung khóa học',
            lessons: data.lessons.map(l => formatLessonData(l))
          }];
        } else {
          processedChapters = [{ id: 'empty', title: 'Chưa có nội dung', lessons: [] }];
        }

        const formattedCourse = {
          ...data,
          chapters: processedChapters,
          instructor: data.instructor || 'Admin',
          updateDate: data.updateDate ? new Date(data.updateDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
        };

        setCourse(formattedCourse);

        if (processedChapters.length > 0) {
          setExpandedChapters({ [processedChapters[0].id]: true });
          if (processedChapters[0].lessons.length > 0) {
            setActiveLesson(processedChapters[0].lessons[0]);
          }
        }

        // Fetch related courses by level (limit 6)
        const resRelated = await fetch(`${API_BASE}/related/level/${id}?limit=6`);
        if (resRelated.ok) {
          const relatedData = await resRelated.json();
          setRelatedCourses(relatedData.courses || []);
        }

        // Fetch comments
        fetchComments();

      } catch (err) {
        console.error("Lỗi fetch detail:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAllData();
  }, [id, token, navigate]);

  const formatLessonData = (l) => {
    let parsedQuestions = [];
    const rawQuizData = l.quiz_data || l.content_data;
    if (Array.isArray(rawQuizData)) {
      parsedQuestions = rawQuizData;
    } else if (typeof rawQuizData === 'string') {
      try { parsedQuestions = JSON.parse(rawQuizData); } catch (e) { parsedQuestions = []; }
    }
    return {
      ...l,
      src: l.video_url || '',
      type: l.type || 'video',
      duration: l.duration || '00:00',
      questions: parsedQuestions
    };
  };

  const getFullMediaPath = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const handleLessonSelect = (lesson) => {
    setActiveLesson(lesson);
    setQuizStarted(false);
    setQuizSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setScore(0);
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const getLessonIcon = (type) => {
    // Trả về icon màu vàng hoặc trắng
    const color = activeLesson?.id ? "#0050b8" : "#aaa";
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'quiz': return <PenTool size={16} />;
      case 'document': return <FileText size={16} />;
      default: return <FileText size={16} />;
    }
  };

  // Quiz Logic Handlers
  const handleStartQuiz = () => { setQuizStarted(true); setQuizSubmitted(false); setUserAnswers({}); setScore(0); };
  const handleSelectAnswer = (qIdx, optionIdx) => { if (quizSubmitted) return; setUserAnswers(prev => ({ ...prev, [qIdx]: optionIdx })); };
  const handleSubmitQuiz = () => {
    if (!activeLesson?.questions) return;
    let correctCount = 0;
    activeLesson.questions.forEach((q, idx) => {
      if (userAnswers[idx] === parseInt(q.correctIndex)) correctCount++;
    });
    setScore(correctCount);
    setQuizSubmitted(true);
  };
  const handleRetryQuiz = () => { setQuizSubmitted(false); setUserAnswers({}); setCurrentQuestionIdx(0); setScore(0); setQuizStarted(false); };

  if (loading) return <div className="lms-page"><div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Đang tải dữ liệu...</div></div>;
  if (!course) return <div className="lms-page"><div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Không tìm thấy khóa học</div></div>;

  return (
    <div className="lms-page" ref={topRef}>

      {/* PLAYER SECTION */}
      <div className="lms-player-section">
        <div className="player-header">
          <div className="header-left">
            <button className="btn-back-list" onClick={() => navigate('/khoa-hoc')}>
              ← Danh sách khóa học
            </button>
            <h1 className="course-header-title">{course.title}</h1>
          </div>
        </div>

        <div className="player-body">
          {/* SIDEBAR (DANH SÁCH BÀI HỌC) */}
          <div className="player-sidebar">
            {course.chapters.map(chapter => (
              <div key={chapter.id} className="chapter-group">
                <div className="chapter-header" onClick={() => setExpandedChapters(p => ({ ...p, [chapter.id]: !p[chapter.id] }))}>
                  <span style={{ color: '#fff' }}>{chapter.title}</span>
                  {expandedChapters[chapter.id] ? <ChevronUp size={16} color="#aaa" /> : <ChevronDown size={16} color="#aaa" />}
                </div>
                {expandedChapters[chapter.id] && (
                  <div className="lesson-list">
                    {chapter.lessons.length === 0 ? <div style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>Chưa có bài học</div> :
                      chapter.lessons.map(lesson => (
                        <div
                          key={lesson.id}
                          className={`lesson-item ${activeLesson?.id === lesson.id ? 'active' : ''}`}
                          onClick={() => handleLessonSelect(lesson)}
                        >
                          <div className="lesson-icon">{getLessonIcon(lesson.type)}</div>
                          <div className="lesson-info">
                            <div className="lesson-title">{lesson.title}</div>
                            <div className="lesson-duration">{lesson.duration} phút</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* MAIN SCREEN (KHUNG HIỂN THỊ) */}
          <div className="player-screen">
            {/* 1. VIDEO PLAYER */}
            {activeLesson?.type === 'video' && (
              <div className="video-wrapper">
                <video key={activeLesson.id} controls autoPlay className="main-video-player">
                  <source src={getFullMediaPath(activeLesson.src)} type="video/mp4" />
                  Trình duyệt không hỗ trợ.
                </video>
              </div>
            )}

            {/* 2. DOCUMENT VIEWER */}
            {activeLesson?.type === 'document' && (
              <div className="doc-wrapper">
                {activeLesson.src?.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={getFullMediaPath(activeLesson.src)} className="pdf-viewer" title="Document Viewer"></iframe>
                ) : (
                  <img src={getFullMediaPath(activeLesson.src)} alt={activeLesson.title} />
                )}
              </div>
            )}

            {/* 3. QUIZ PLAYER */}
            {activeLesson?.type === 'quiz' && (
              <div className="quiz-wrapper">
                {!quizStarted && !quizSubmitted && (
                  <div className="quiz-card">
                    <h2 style={{ color: '#0050b8' }}>{activeLesson.title}</h2>
                    <p style={{ color: '#000', marginBottom: 20 }}>
                      Bài kiểm tra trắc nghiệm gồm {activeLesson.questions?.length || 0} câu hỏi.
                    </p>
                    <button className="btn-start-learning" onClick={handleStartQuiz}>
                      Bắt đầu làm bài
                    </button>
                  </div>
                )}

                {quizStarted && !quizSubmitted && activeLesson.questions && (
                  <div className="quiz-playing-card">
                    <div className="qp-header">
                      <h3>Câu hỏi {currentQuestionIdx + 1} / {activeLesson.questions.length}</h3>
                    </div>
                    <div className="qp-body">
                      <h4 className="qp-question-text">
                        {activeLesson.questions[currentQuestionIdx]?.text}
                      </h4>
                      <div className="qp-options-list">
                        {activeLesson.questions[currentQuestionIdx]?.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`qp-option-item ${userAnswers[currentQuestionIdx] === oIdx ? 'selected' : ''}`}
                            onClick={() => handleSelectAnswer(currentQuestionIdx, oIdx)}
                          >
                            {userAnswers[currentQuestionIdx] === oIdx ? (
                              <CheckCircle2 size={20} className="radio-icon" color="#0050b8" />
                            ) : (
                              <Circle size={20} className="radio-icon" />
                            )}
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="qp-footer">
                      <button className="btn-nav-quiz" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(p => p - 1)}>Quay lại</button>
                      {currentQuestionIdx < activeLesson.questions.length - 1 ? (
                        <button className="btn-nav-quiz next" onClick={() => setCurrentQuestionIdx(p => p + 1)}>Câu tiếp theo</button>
                      ) : (
                        <button className="btn-submit-quiz" onClick={handleSubmitQuiz}>Nộp bài</button>
                      )}
                    </div>
                  </div>
                )}

                {quizSubmitted && (
                  <div className="quiz-card">
                    <CheckCircle size={50} color="#0050b8" style={{ marginBottom: 15 }} />
                    <h2 style={{ color: '#0050b8' }}>Hoàn thành bài thi!</h2>
                    <p style={{ fontSize: '1.2rem', margin: '15px 0', color: '#fff' }}>
                      Bạn trả lời đúng <strong style={{ color: '#0050b8' }}>{score}</strong> / {activeLesson.questions?.length} câu.
                    </p>
                    <button className="btn-start-learning" onClick={handleRetryQuiz}>
                      <RefreshCw size={16} style={{ marginRight: 5, verticalAlign: 'middle' }} /> Làm lại
                    </button>
                  </div>
                )}
              </div>
            )}

            {!activeLesson && (
              <div style={{ color: '#fff', padding: 20, textAlign: 'center' }}>
                <img src={noVideoImage} alt="No Video" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INFO SECTION - DARK MODE */}
      <div className="lms-info-section">
        <div className="intro-header-tabs">
          <div className="container">
            <button className={`intro-tab ${activeTab === 'intro' ? 'active' : ''}`} onClick={() => setActiveTab('intro')}>Giới thiệu</button>
            <button className={`intro-tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Bình luận</button>
          </div>
        </div>

        <div className="container intro-body-grid">
          <div className="intro-left-col">
            <div className="course-main-card">
              {activeTab === 'intro' ? (
                <>
                  <div className="intro-inner-section">
                    <h3 className="intro-heading">Tổng quan</h3>
                    <div className="intro-desc" dangerouslySetInnerHTML={{ __html: course.description }}></div>
                  </div>
                  <div className="intro-inner-section no-border">
                    <h3 className="intro-heading">Nội dung chi tiết</h3>
                    <div className="intro-curriculum">
                      {course.chapters.map((chapter, idx) => (
                        <div key={chapter.id} className="intro-chapter-group">
                          <h4 className="intro-chapter-title">Chương {idx + 1}: {chapter.title}</h4>
                          <div className="intro-lesson-list">
                            {chapter.lessons.map(lesson => (
                              <div key={lesson.id} className={`intro-lesson-row ${activeLesson?.id === lesson.id ? 'playing' : ''}`} onClick={() => handleLessonSelect(lesson)}>
                                <div className="il-icon">
                                  {lesson.type === 'video' ? <PlayCircle size={20} color="#0050b8" /> : lesson.type === 'quiz' ? <PenTool size={20} color="#0050b8" /> : <FileText size={20} color="#0050b8" />}
                                </div>
                                <div className="il-title">{lesson.title}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="comments-section">
                  {/* Form thêm bình luận */}
                  {token ? (
                    <div className="comment-form" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #333' }}>
                      <h4 style={{ color: '#000', marginBottom: '15px' }}>Nhận xét của bạn</h4>

                      {/* Chọn số sao */}
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#000', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Đánh giá:</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setCommentRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Star
                                size={24}
                                fill={star <= (hoverRating || commentRating) ? '#FFC107' : '#ddd'}
                                color={star <= (hoverRating || commentRating) ? '#FFC107' : '#ddd'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nội dung bình luận */}
                      <textarea
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="Chia sẻ ý kiến của bạn..."
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '10px',
                          backgroundColor: '#ffffff',
                          color: '#000',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          fontFamily: 'inherit',
                          marginBottom: '10px',
                          resize: 'vertical'
                        }}
                      />
                      <button
                        onClick={handlePostComment}
                        style={{
                          backgroundColor: '#0050b8',
                          color: '#ffffff',
                          padding: '10px 20px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.95rem'
                        }}
                      >
                        Gửi bình luận
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', color: '#aaa', marginBottom: '20px' }}>
                      <p>Vui lòng <span onClick={() => navigate('/dang-nhap')} style={{ color: '#FFCA05', cursor: 'pointer', fontWeight: 'bold' }}>đăng nhập</span> để bình luận</p>
                    </div>
                  )}

                  {/* Danh sách bình luận */}
                  {loadingComments ? (
                    <div style={{ textAlign: 'center', color: '#000', padding: '20px' }}>Đang tải bình luận...</div>
                  ) : comments.length > 0 ? (
                    <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {comments.map(comment => (
                        <div
                          key={comment.id}
                          className="comment-item"
                          style={{
                            padding: '15px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #dcdcdc',
                            position: 'relative'
                          }}
                        >
                          {/* ACTION: Xóa */}
                          <div className="comment-actions">
                            <span
                              className="comment-delete"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Xóa
                            </span>
                          </div>

                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#FFCA05',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#000',
                                fontWeight: 'bold'
                              }}
                            >
                              {comment.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#000', fontWeight: 'bold' }}>{comment.full_name}</div>
                              <div style={{ color: '#000', fontSize: '0.85rem' }}>
                                {new Date(comment.created_at).toLocaleDateString('vi-VN')}
                              </div>
                              {comment.rating && (
                                <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      size={14}
                                      fill={star <= comment.rating ? '#FFC107' : '#ddd'}
                                      color={star <= comment.rating ? '#FFC107' : '#ddd'}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Nội dung */}
                          <div style={{ color: '#221e1e', lineHeight: '1.5', marginLeft: '50px' }}>
                            {comment.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#aaa', padding: '30px' }}>
                      <MessageSquare size={48} color="#666" style={{ marginBottom: '15px' }} />
                      <p>Chưa có bình luận nào. Hãy là người bình luận đầu tiên!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Right */}
          <div className="intro-right-col">
            <div className="sidebar-card related-card">
              <h4>Khóa Học Liên Quan</h4>
              {relatedCourses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {relatedCourses.map(rc => (
                    <div
                      key={rc.id}
                      className="related-item"
                      onClick={() => { navigate(`/khoa-hoc/${rc.id}`); window.scrollTo(0, 0); }}
                      style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #fff', transition: 'all 0.3s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.backgroundColor = '#fff' }}
                    >
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <img
                          src={getFullMediaPath(rc.image)}
                          alt={rc.title}
                          style={{ width: '60px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                          onError={(e) => e.target.src = 'https://placehold.co/60x40/333/fff?text=Course'}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#3d3d3d', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px' }}>{rc.title}</div>
                          <div style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 'bold' }}>Cấp độ: {rc.level}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Không có khóa học cùng cấp độ.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default CourseDetailPage;
