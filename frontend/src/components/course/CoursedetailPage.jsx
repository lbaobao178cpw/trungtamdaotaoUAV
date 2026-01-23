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
  const videoRef = useRef(null);

  // === QUIZ STATE ===
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

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

  // Kiểm tra URL có phải YouTube không
  const extractYouTubeId = (url) => {
    if (!url) return null;

    // Xử lý youtu.be
    let match = url.match(/youtu\.be\/([^\s&?]+)/);
    if (match) return match[1];

    // Xử lý youtube.com/watch?v=
    match = url.match(/youtube\.com\/watch\?v=([^\s&]+)/);
    if (match) return match[1];

    // Xử lý youtube.com/embed/
    match = url.match(/youtube\.com\/embed\/([^\s&?]+)/);
    if (match) return match[1];

    return null;
  };

  // Chuyển YouTube URL thành embed URL
  const getYouTubeEmbedUrl = (videoUrl) => {
    const videoId = extractYouTubeId(videoUrl);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
  };

  const formatLessonData = (l) => {
    let parsedQuestions = [];
    const rawQuizData = l.quiz_data || l.content_data;
    if (Array.isArray(rawQuizData)) {
      parsedQuestions = rawQuizData;
    } else if (typeof rawQuizData === 'string') {
      try { parsedQuestions = JSON.parse(rawQuizData); } catch (e) { parsedQuestions = []; }
    }

    // Lấy video URL (ưu tiên video_url, nếu không có thì content)
    let videoUrl = l.video_url || l.content || '';

    // Nếu là YouTube URL, chuyển thành embed URL
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
      videoUrl = getYouTubeEmbedUrl(videoUrl);
    }

    // Lấy quiz_time: ưu tiên quiz_time, nếu không có thì dùng duration (admin lưu vào duration)
    const quizTime = l.quiz_time || (l.type === 'quiz' ? parseInt(l.duration) || 100 : null);

    return {
      ...l,
      src: videoUrl,
      type: l.type || 'video',
      duration: l.duration || '00:00',
      questions: parsedQuestions,
      quiz_time: quizTime
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

  // Auto-pause video when user leaves the tab/window or when lesson changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        if (!vid.paused) vid.pause();
      }
    };

    const handleWindowBlur = () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (!vid.paused) vid.pause();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Ensure video is paused when switching lessons or unmounting
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid && !vid.paused) vid.pause();
    };
  }, [activeLesson]);

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
  const handleStartQuiz = () => {
    // Lấy thời gian từ quiz_time của lesson (đã được format từ duration trong formatLessonData)
    // Nếu không có thì mặc định 60 phút
    const quizTimeInMinutes = activeLesson?.quiz_time || 60;
    const quizTimeInSeconds = quizTimeInMinutes * 60;
    console.log('Quiz time from lesson:', activeLesson?.quiz_time, 'Using:', quizTimeInMinutes, 'minutes');
    setQuizStarted(true);
    setQuizSubmitted(false);
    setUserAnswers({});
    setScore(0);
    setTimeLeft(quizTimeInSeconds);
    setTotalTime(quizTimeInSeconds);
  };
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
  const handleRetryQuiz = () => {
    setQuizSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setScore(0);
    setQuizStarted(false);
    setTimeLeft(0);
    setTotalTime(0);
  };

  // === TIMER EFFECT ===
  useEffect(() => {
    let interval;

    if (quizStarted && !quizSubmitted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Tự động submit khi hết giờ
            clearInterval(interval);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && quizStarted && !quizSubmitted) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [quizStarted, quizSubmitted, timeLeft]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get time warning color
  const getTimeColor = () => {
    if (timeLeft > 300) return '#10b981'; // > 5 min = green
    if (timeLeft > 60) return '#f1c21b'; // > 1 min = yellow
    return '#da1e28'; // <= 1 min = red
  };

  if (loading) return <div className="lms-page"><div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Đang tải dữ liệu...</div></div>;

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
                <video
                  key={activeLesson.id}
                  ref={videoRef}
                  controls
                  autoPlay
                  className="main-video-player"
                >
                  <source src={getFullMediaPath(activeLesson.src)} type="video/mp4" />
                  Trình duyệt không hỗ trợ.
                </video>
                {activeLesson.src?.includes('youtube.com/embed') ? (
                  <iframe
                    key={activeLesson.id}
                    className="main-video-player"
                    src={activeLesson.src + '?modestbranding=1&rel=0&fs=1&autoplay=0'}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                ) : (
                  <video key={activeLesson.id} controls autoPlay className="main-video-player">
                    <source src={getFullMediaPath(activeLesson.src)} type="video/mp4" />
                    Trình duyệt không hỗ trợ.
                  </video>
                )}
              </div>
            )}

            {/* 2. DOCUMENT VIEWER */}
            {activeLesson?.type === 'document' && (
              <div className="doc-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <FileText size={64} color="#0050b8" style={{ marginBottom: '16px' }} />
                  <h3 style={{ marginBottom: '8px', color: '#333' }}>{activeLesson.title}</h3>
                  <p style={{ color: '#666', marginBottom: '24px' }}>Nhấn nút dưới để tải về tài liệu</p>
                  <a
                    href={`http://localhost:5000/api/courses/lessons/${activeLesson.id}/download-document`}
                    download
                    className="btn-download-doc"
                    style={{
                      display: 'inline-block',
                      padding: '12px 32px',
                      backgroundColor: '#0050b8',
                      color: '#fff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#003a82'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#0050b8'}
                  >
                    ⬇️ Tải tài liệu
                  </a>
                </div>
              </div>
            )}

            {/* 3. QUIZ PLAYER */}
            {activeLesson?.type === 'quiz' && (
              <div className="quiz-wrapper">
                {!quizStarted && !quizSubmitted && (
                  <div className="quiz-card">
                    <h2 className="quiz-title">{activeLesson.title}</h2>
                    <p className="quiz-desc" style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                      Bài kiểm tra trắc nghiệm gồm <strong>{activeLesson.questions?.length || 0} câu hỏi</strong>
                      <br />
                      <span style={{ fontSize: '14px', color: '#999', marginTop: '8px', display: 'block' }}>
                        Thời gian: <strong>{activeLesson?.quiz_time || 60} phút</strong>
                      </span>
                    </p>
                    <button className="btn-start-learning" onClick={handleStartQuiz}>
                      Bắt đầu làm bài
                    </button>
                  </div>
                )}

                {quizStarted && !quizSubmitted && activeLesson.questions && (
                  <div className="quiz-playing-card">
                    <div className="qp-header">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0050b8' }}>
                          Câu {currentQuestionIdx + 1} / {activeLesson.questions.length}
                        </h3>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          {/* Timer */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: getTimeColor() === '#da1e28' ? '#fee2e2' : getTimeColor() === '#f1c21b' ? '#fff3cd' : '#defbe6',
                            borderRadius: '20px',
                            fontWeight: '700',
                            fontSize: '14px',
                            color: getTimeColor(),
                            animation: timeLeft <= 60 ? 'pulse 1s infinite' : 'none'
                          }}>
                            <span style={{ minWidth: '40px' }}>{formatTime(timeLeft)}</span>
                          </div>

                          {/* Progress */}
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '6px 12px',
                            background: '#f0f0f0',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#666'
                          }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#0050b8',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              {currentQuestionIdx + 1}
                            </span>
                            <span>Tiến độ</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{
                        marginTop: '12px',
                        width: '100%',
                        height: '4px',
                        background: '#e0e0e0',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${((currentQuestionIdx + 1) / activeLesson.questions.length) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #0050b8, #003a82)',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                    </div>

                    <div className="qp-body">
                      <h4 className="qp-question-text" style={{
                        marginBottom: '32px',
                        fontSize: '20px',
                        lineHeight: '1.5',
                        color: '#222'
                      }}>
                        {activeLesson.questions[currentQuestionIdx]?.text}
                      </h4>

                      <div className="qp-options-list">
                        {activeLesson.questions[currentQuestionIdx]?.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`qp-option-item ${userAnswers[currentQuestionIdx] === oIdx ? 'selected' : ''}`}
                            onClick={() => handleSelectAnswer(currentQuestionIdx, oIdx)}
                            style={{
                              padding: '16px 20px',
                              border: userAnswers[currentQuestionIdx] === oIdx ? '2px solid #0050b8' : '1px solid #ddd',
                              borderRadius: '10px',
                              cursor: timeLeft > 0 ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              transition: 'all 0.25s ease',
                              background: userAnswers[currentQuestionIdx] === oIdx ? '#f0f6ff' : '#fff',
                              fontSize: '16px',
                              fontWeight: userAnswers[currentQuestionIdx] === oIdx ? '600' : '500',
                              color: userAnswers[currentQuestionIdx] === oIdx ? '#0050b8' : '#333',
                              opacity: timeLeft > 0 ? 1 : 0.6
                            }}
                          >
                            <span style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: userAnswers[currentQuestionIdx] === oIdx ? '#0050b8' : '#e0e0e0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: '700',
                              fontSize: '14px',
                              flexShrink: 0
                            }}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="qp-footer" style={{
                      padding: '20px 40px',
                      borderTop: '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: '#f9fafb',
                      gap: '16px'
                    }}>
                      <button
                        className="btn-nav-quiz"
                        disabled={currentQuestionIdx === 0 || timeLeft === 0}
                        onClick={() => setCurrentQuestionIdx(p => p - 1)}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: '#fff',
                          color: currentQuestionIdx === 0 || timeLeft === 0 ? '#ccc' : '#333',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: currentQuestionIdx === 0 || timeLeft === 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: currentQuestionIdx === 0 || timeLeft === 0 ? 0.5 : 1
                        }}
                      >
                        Quay lại
                      </button>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{
                          padding: '12px 16px',
                          background: '#fff3cd',
                          color: '#856404',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {Object.keys(userAnswers).length}/{activeLesson.questions.length} trả lời
                        </span>

                        {currentQuestionIdx < activeLesson.questions.length - 1 ? (
                          <button
                            className="btn-nav-quiz next"
                            onClick={() => setCurrentQuestionIdx(p => p + 1)}
                            disabled={timeLeft === 0}
                            style={{
                              padding: '12px 24px',
                              borderRadius: '8px',
                              border: 'none',
                              background: timeLeft === 0 ? '#ccc' : '#0050b8',
                              color: '#fff',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: timeLeft === 0 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: timeLeft === 0 ? 'none' : '0 2px 8px rgba(0, 80, 184, 0.25)'
                            }}
                            onMouseOver={(e) => {
                              if (timeLeft > 0) {
                                e.target.style.background = '#003a82';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 80, 184, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (timeLeft > 0) {
                                e.target.style.background = '#0050b8';
                                e.target.style.boxShadow = '0 2px 8px rgba(0, 80, 184, 0.25)';
                              }
                            }}
                          >
                            Tiếp theo
                          </button>
                        ) : (
                          <button
                            className="btn-submit-quiz"
                            onClick={handleSubmitQuiz}
                            disabled={timeLeft === 0}
                            style={{
                              padding: '12px 30px',
                              borderRadius: '8px',
                              border: 'none',
                              background: timeLeft === 0 ? '#ccc' : '#10b981',
                              color: '#fff',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: timeLeft === 0 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: timeLeft === 0 ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.25)'
                            }}
                            onMouseOver={(e) => {
                              if (timeLeft > 0) {
                                e.target.style.background = '#059669';
                                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (timeLeft > 0) {
                                e.target.style.background = '#10b981';
                                e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
                              }
                            }}
                          >
                            Nộp bài
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {quizSubmitted && (
                  <div className="quiz-card" style={{
                    background: 'linear-gradient(135deg, #f0f6ff 0%, #e8f4ff 100%)',
                    padding: '60px 40px'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                      boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                      fontSize: '40px'
                    }}>
                      ✓
                    </div>

                    <h2 className="quiz-success-title" style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#0050b8',
                      marginBottom: '12px'
                    }}>
                      Hoàn thành bài thi!
                    </h2>

                    <p style={{
                      fontSize: '16px',
                      color: '#666',
                      marginBottom: '24px',
                      lineHeight: '1.5'
                    }}>
                      Kết quả của bạn đã được ghi nhận
                    </p>

                    <div style={{
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '32px',
                      marginBottom: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '2px solid #10b981'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '56px',
                            fontWeight: '800',
                            color: '#10b981',
                            lineHeight: '1'
                          }}>
                            {score}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#999',
                            marginTop: '4px',
                            fontWeight: '600'
                          }}>
                            Câu đúng
                          </div>
                        </div>

                        <div style={{
                          fontSize: '32px',
                          color: '#ddd'
                        }}>
                          /
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '56px',
                            fontWeight: '800',
                            color: '#0050b8',
                            lineHeight: '1'
                          }}>
                            {activeLesson.questions?.length || 0}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#999',
                            marginTop: '4px',
                            fontWeight: '600'
                          }}>
                            Tổng câu
                          </div>
                        </div>
                      </div>

                      <div style={{
                        height: '8px',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: `${(score / (activeLesson.questions?.length || 1)) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #10b981, #059669)',
                          borderRadius: '4px'
                        }}></div>
                      </div>

                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#0050b8',
                        textAlign: 'center'
                      }}>
                        Điểm: {((score / (activeLesson.questions?.length || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'center'
                    }}>
                      <button
                        className="btn-start-learning"
                        onClick={handleRetryQuiz}
                        style={{
                          padding: '14px 32px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0050b8',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0, 80, 184, 0.25)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#003a82';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 80, 184, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#0050b8';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 184, 0.25)';
                        }}
                      >
                        Làm lại bài thi
                      </button>
                    </div>
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
                  {/* ...existing comments code... */}
                </div>
              )}
            </div>
          </div>

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
