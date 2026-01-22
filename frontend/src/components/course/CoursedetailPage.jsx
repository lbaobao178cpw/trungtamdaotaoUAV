import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CourseDetailPage.css'; // Đảm bảo import CSS mới
import noVideoImage from "../assets/noVideoImage.png";
import { notifySuccess, notifyError, notifyWarning } from '../../lib/notifications';

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
  const [accessDenied, setAccessDenied] = useState(null); // State cho lỗi quyền truy cập

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

  const handleUpdateComment = async (commentId) => {
    if (!editingContent.trim()) {
      notifyWarning('Nội dung bình luận không được để trống');
      return;
    }

    try {
      const res = await fetch(`${COMMENTS_API}/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editingContent.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        notifyError(data.error || "Cập nhật bình luận thất bại");
        return;
      }

      // Cập nhật UI ngay
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, content: editingContent.trim() }
          : c
      ));

      setEditingCommentId(null);
      setEditingContent('');
      notifySuccess('Bình luận đã được cập nhật');

    } catch (err) {
      notifyError("Không thể cập nhật bình luận. Vui lòng thử lại.");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
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
        notifyError(data.error || "Xóa bình luận thất bại");
        return;
      }

      // Cập nhật UI ngay
      setComments(prev => prev.filter(c => c.id !== commentId));
      notifySuccess('Bình luận đã được xóa');

    } catch (err) {
      notifyError("Không thể xóa bình luận. Vui lòng thử lại.");
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
          console.log('Đã ghi nhận lượt xem');
        }
      } catch (err) {
        console.error('Lỗi ghi nhận lượt xem:', err);
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
      notifyWarning('Vui lòng nhập nội dung bình luận');
      return;
    }
    if (!token) {
      notifyWarning('Vui lòng đăng nhập để bình luận');
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
        notifySuccess('Bình luận đã được đăng!');
      } else {
        const error = await res.json();
        notifyError(error.error || 'Không thể đăng bình luận');
      }
    } catch (err) {
      notifyError('Không thể đăng bình luận. Vui lòng thử lại.');
    }
  };

  // --- MÔ PHỎNG LẠI PHẦN LOGIC ĐỂ CODE CHẠY ĐƯỢC ---
  useEffect(() => {
    // Kiểm tra đăng nhập trước
    if (!token) {
      notifyWarning('Vui lòng đăng nhập để xem chi tiết khóa học');
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
            notifyWarning('Vui lòng đăng nhập để xem chi tiết khóa học');
            navigate('/dang-nhap');
            return;
          }

          // Xử lý lỗi 403 - Không có quyền xem theo hạng đăng ký
          if (resCourse.status === 403) {
            const errorData = await resCourse.json();
            setAccessDenied({
              message: errorData.error,
              requiredTier: errorData.requiredTier,
              currentTier: errorData.currentTier
            });
            setLoading(false);
            return;
          }

          throw new Error("Lỗi tải khóa học");
        }

        // Reset access denied nếu thành công
        setAccessDenied(null);

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

  // Hiển thị UI khi bị từ chối quyền truy cập theo hạng
  // if (accessDenied) {
  //   return (
  //     <div className="lms-page" ref={topRef}>
  //       <div style={{ 
  //         display: 'flex', 
  //         flexDirection: 'column', 
  //         alignItems: 'center', 
  //         justifyContent: 'center', 
  //         minHeight: '60vh',
  //         padding: '40px 20px',
  //         textAlign: 'center'
  //       }}>
  //         <div style={{
  //           background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  //           borderRadius: '20px',
  //           padding: '50px 40px',
  //           maxWidth: '500px',
  //           boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  //           border: '1px solid rgba(255,255,255,0.1)'
  //         }}>
  //           {/* Icon khóa */}
  //           <div style={{
  //             width: '80px',
  //             height: '80px',
  //             borderRadius: '50%',
  //             background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
  //             display: 'flex',
  //             alignItems: 'center',
  //             justifyContent: 'center',
  //             margin: '0 auto 24px'
  //           }}>
  //             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
  //               <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  //               <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  //             </svg>
  //           </div>

  //           <h2 style={{ 
  //             color: '#fff', 
  //             fontSize: '1.8rem', 
  //             marginBottom: '16px',
  //             fontWeight: '600'
  //           }}>
  //             Khóa học bị khóa
  //           </h2>

  //           <p style={{ 
  //             color: '#b0b0b0', 
  //             fontSize: '1rem', 
  //             lineHeight: '1.6',
  //             marginBottom: '24px'
  //           }}>
  //             {accessDenied.message}
  //           </p>

  //           <div style={{
  //             background: 'rgba(255,255,255,0.05)',
  //             borderRadius: '12px',
  //             padding: '20px',
  //             marginBottom: '30px'
  //           }}>
  //             <div style={{ 
  //               display: 'flex', 
  //               justifyContent: 'space-between',
  //               marginBottom: '12px'
  //             }}>
  //               <span style={{ color: '#888' }}>Hạng của bạn:</span>
  //               <span style={{ 
  //                 color: accessDenied.currentTier === 'Chưa đăng ký' ? '#ff6b6b' : '#4ecdc4',
  //                 fontWeight: '600'
  //               }}>
  //                 {accessDenied.currentTier}
  //               </span>
  //             </div>
  //             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
  //               <span style={{ color: '#888' }}>Yêu cầu:</span>
  //               <span style={{ 
  //                 color: '#ffd93d',
  //                 fontWeight: '600'
  //               }}>
  //                 Hạng {accessDenied.requiredTier}
  //               </span>
  //             </div>
  //           </div>

  //           <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
  //             <button
  //               onClick={() => navigate('/khoa-hoc')}
  //               style={{
  //                 padding: '12px 24px',
  //                 borderRadius: '10px',
  //                 border: '1px solid rgba(255,255,255,0.2)',
  //                 background: 'transparent',
  //                 color: '#fff',
  //                 cursor: 'pointer',
  //                 fontSize: '0.95rem',
  //                 transition: 'all 0.3s'
  //               }}
  //               onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
  //               onMouseOut={(e) => e.target.style.background = 'transparent'}
  //             >
  //               ← Quay lại
  //             </button>
  //             <button
  //               onClick={() => navigate('/dang-ky-thi')}
  //               style={{
  //                 padding: '12px 24px',
  //                 borderRadius: '10px',
  //                 border: 'none',
  //                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  //                 color: '#fff',
  //                 cursor: 'pointer',
  //                 fontSize: '0.95rem',
  //                 fontWeight: '600',
  //                 transition: 'all 0.3s'
  //               }}
  //               onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
  //               onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
  //             >
  //               Nâng cấp hạng
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }
  if (accessDenied) {
    return (
      <div className="lms-page" ref={topRef}>
        <div className="access-denied-wrapper">
          <div className="access-denied-card">

            <div className="access-denied-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h2 className="access-denied-title">Khóa học bị khóa</h2>

            <p className="access-denied-message">
              {accessDenied.message}
            </p>

            <div className="access-denied-info">
              <div className="info-row">
                <span>Hạng của bạn:</span>
                <span className={`tier ${accessDenied.currentTier === 'Chưa đăng ký' ? 'tier-danger' : 'tier-ok'}`}>
                  {accessDenied.currentTier}
                </span>
              </div>
              <div className="info-row">
                <span>Yêu cầu:</span>
                <span className="tier tier-required">
                  Hạng {accessDenied.requiredTier}
                </span>
              </div>
            </div>

            <div className="access-denied-actions">
              <button className="btn-back" onClick={() => navigate('/khoa-hoc')}>
                Quay lại
              </button>
              <button className="btn-upgrade" onClick={() => navigate('/dang-ky-thi')}>
                Nâng cấp hạng
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }


  // if (!course) return <div className="lms-page"><div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Không tìm thấy khóa học</div></div>;
  if (!course)
    return (
      <div className="lms-page">
        <div className="course-not-found">
          Không tìm thấy khóa học
        </div>
      </div>
    );

  return (
    <div className="lms-page" ref={topRef}>

      {/* PLAYER SECTION */}
      <div className="lms-player-section">
        <div className="player-header">
          <div className="header-left">
            <button className="btn-back-list" onClick={() => navigate('/khoa-hoc')}>
              Danh Sách Khóa Học
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
                  <span className="chapter-title">{chapter.title}</span>
                  {expandedChapters[chapter.id] ? <ChevronUp size={16} color="#aaa" /> : <ChevronDown size={16} color="#aaa" />}
                </div>
                {expandedChapters[chapter.id] && (
                  <div className="lesson-list">
                    {chapter.lessons.length === 0 ? <div className="lesson-empty">
                      Chưa có bài học
                    </div>
                      :
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
                    <h2 className="quiz-title">{activeLesson.title}</h2>
                    <p className="quiz-desc">
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
                    <CheckCircle size={50} className="quiz-success-icon" />
                    <h2 className="quiz-success-title">Hoàn thành bài thi!</h2>
                    <p className="quiz-success-text">
                      Bạn trả lời đúng <strong className="quiz-score">{score}</strong> / {activeLesson.questions?.length} câu.
                    </p>
                    <button className="btn-start-learning" onClick={handleRetryQuiz}>
                      <RefreshCw size={16} className="quiz-retry-icon" />
                      Thực hiện lại bài thi
                    </button>
                  </div>
                )}
              </div>
            )}

            {!activeLesson && (
              <div className="no-lesson">
                <img src={noVideoImage} alt="No Video" className="no-lesson-image" />
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
                      <h4 className="comment-form-title">Nhận xét của bạn</h4>


                      {/* Chọn số sao */}
                      <div className="comment-rating-block" >
                        <label className="comment-rating-label">Đánh giá:</label>
                        <div className="comment-rating-stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              className="star-button"
                              onClick={() => setCommentRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
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
                        className="comment-textarea"
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="Chia sẻ ý kiến của bạn..."
                      />
                      <button className="comment-submit-btn" onClick={handlePostComment}>
                        Gửi bình luận
                      </button>

                    </div>
                  ) : (
                    <div div className="comment-login-warning">
                      <p>
                        Vui lòng{' '}
                        <span className="login-link" onClick={() => navigate('/dang-nhap')}>
                          đăng nhập
                        </span>{' '}
                        để bình luận
                      </p>
                    </div>
                  )}

                  {/* Danh sách bình luận */}
                  {loadingComments ? (
                    <div className="comments-loading">Đang tải bình luận...</div>
                  ) : comments.length > 0 ? (
                    <div className="comments-list">
                      {comments.map(comment => (
                        <div
                          key={comment.id}
                          className="comment-item"
                        >
                          {/* ACTIONS: Edit/Delete - chỉ hiển thị nếu là chủ comment */}
                          {currentUser && comment.user_id === currentUser.id && (
                            <div className="comment-actions">
                              {editingCommentId === comment.id ? (
                                <>
                                  <span
                                    className="comment-save"
                                    onClick={() => handleUpdateComment(comment.id)}
                                    style={{ color: '#28a745', cursor: 'pointer', marginRight: '10px' }}
                                  >
                                    Lưu
                                  </span>
                                  <span
                                    className="comment-cancel"
                                    onClick={handleCancelEdit}
                                    style={{ color: '#666', cursor: 'pointer' }}
                                  >
                                    Hủy
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="comment-edit"
                                    onClick={() => handleEditComment(comment)}
                                    style={{ color: '#0050B8', cursor: 'pointer', marginRight: '10px' }}
                                  >
                                    Sửa
                                  </span>
                                  <span
                                    className="comment-delete"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    Xóa
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Header */}
                          <div className="comment-header">
                            <div className="comment-avatar">
                              {comment.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="comment-user-info">
                              <div className="comment-user-name">{comment.full_name}</div>
                              <div className="comment-date">
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

                          {/* Nội dung - Hiển thị input khi đang edit */}
                          <div className="comment-content">
                            {editingCommentId === comment.id ? (
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                placeholder="Chỉnh sửa bình luận..."
                                style={{
                                  width: '100%',
                                  minHeight: '80px',
                                  padding: '10px',
                                  borderRadius: '6px',
                                  border: '1px solid #ddd',
                                  fontFamily: 'inherit',
                                  fontSize: '14px',
                                  resize: 'vertical'
                                }}
                              />
                            ) : (
                              comment.content
                            )}
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
          {/* <div className="intro-right-col">
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
          </div> */}
          <div className="intro-right-col">
            <div className="sidebar-card related-card">
              <h4>Khóa Học Liên Quan</h4>

              {relatedCourses.length > 0 ? (
                <div className="related-list">
                  {relatedCourses.map(rc => (
                    <div
                      key={rc.id}
                      className="related-item"
                      onClick={() => {
                        navigate(`/khoa-hoc/${rc.id}`);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <div className="related-item-inner">
                        <img
                          src={getFullMediaPath(rc.image)}
                          alt={rc.title}
                          className="related-thumb"
                          onError={(e) =>
                          (e.target.src =
                            'https://placehold.co/60x40/333/fff?text=Course')
                          }
                        />
                        <div className="related-info">
                          <div className="related-title">{rc.title}</div>
                          <div className="related-level">
                            Cấp độ: {rc.level}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-related-course">
                  Không có khóa học cùng cấp độ.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


export default CourseDetailPage;
