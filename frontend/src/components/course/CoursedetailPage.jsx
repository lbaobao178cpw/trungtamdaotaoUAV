import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CoursedetailPage.css'; // Đảm bảo import CSS mới
import noVideoImage from "../assets/noVideoImage.png";
import { notifySuccess, notifyError, notifyWarning } from '../../lib/notifications';
import CourseScoreboard from './CourseScoreboard';
import { API_ENDPOINTS, MEDIA_BASE_URL } from '../../config/apiConfig';

import {
  Video, FileText, ChevronDown, ChevronUp,
  PenTool, PlayCircle, MessageSquare, CheckCircle, RefreshCw,
  Circle, CheckCircle2, Star, Award
} from 'lucide-react';

const API_BASE = API_ENDPOINTS.COURSES;
const COMMENTS_API = API_ENDPOINTS.COMMENTS;

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // === QUIZ ATTEMPTS STATE ===
  const [quizAttemptsInfo, setQuizAttemptsInfo] = useState(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // === COMMENT STATE ===
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentRating, setCommentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('user_token'));

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingRating, setEditingRating] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  const [scoreRefreshTrigger, setScoreRefreshTrigger] = useState(0);

  // === FULLSCREEN STATE ===
  const [isFullscreen, setIsFullscreen] = useState(false);

  // === VIDEO TRACKING STATE ===
  const videoRef = useRef(null);
  const videoTrackingTimeoutRef = useRef(null);
  const lastProgressUpdateRef = useRef(0);
  const [videoCumulativeTime, setVideoCumulativeTime] = useState(0);

  // Watermark text: prefer a custom override stored in localStorage ('watermark_text'),
  // otherwise prefer user's email, then displayName or username.
  const watermarkBase = (localStorage.getItem('watermark_text') || (currentUser && (currentUser.email || currentUser.displayName || currentUser.username)) || 'Guest');
  const watermarkText = `${watermarkBase} • ${new Date().toLocaleDateString()}${course ? ' • ' + (course.title || '') : ''}`;

  // Function to generate watermark SVG
  const generateWatermarkSVG = (text) => {
    const encodedText = encodeURIComponent(text);
    return `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='360' height='180'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='20' font-weight='900' fill='rgba(255,255,255,0.36)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45 180 90)'%3e${encodedText}%3c/text%3e%3c/svg%3e`;
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setEditingRating(comment.rating || 0);
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
          content: editingContent.trim(),
          rating: editingRating
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
          ? { ...c, content: editingContent.trim(), rating: editingRating }
          : c
      ));

      setEditingCommentId(null);
      setEditingContent('');
      setEditingRating(0);
      notifySuccess('Bình luận đã được cập nhật');

    } catch (err) {
      notifyError("Không thể cập nhật bình luận. Vui lòng thử lại.");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
    setEditingRating(0);
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
        }
      } catch (err) {
        // Lỗi ghi nhận lượt xem
      }
    };

    // Gọi ngay khi click vào khóa học
    recordView();

    // Cứ mỗi 10 phút ghi nhận 1 lần nếu user ở lại
    const interval = setInterval(recordView, 600000);

    return () => clearInterval(interval); // cleanup khi rời trang
  }, [id, token]);

  // === FULLSCREEN DETECTION ===
  useEffect(() => {
    let fullscreenOverlay = null;

    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      const isFs = !!fsElement;
      setIsFullscreen(isFs);

      if (isFs && !fullscreenOverlay) {
        // Create overlay and append to body
        fullscreenOverlay = document.createElement('div');
        fullscreenOverlay.className = 'fullscreen-watermark';
        fullscreenOverlay.setAttribute('aria-hidden', 'true');
        fullscreenOverlay.innerHTML = `
          <span class="wm-text">${watermarkText}</span>
          <span class="wm-text">${watermarkText}</span>
          <span class="wm-text">${watermarkText}</span>
        `;
        document.body.appendChild(fullscreenOverlay);
      } else if (!isFs && fullscreenOverlay) {
        // Remove overlay
        document.body.removeChild(fullscreenOverlay);
        fullscreenOverlay = null;
      }
    };

    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(event => document.addEventListener(event, handleFullscreenChange));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleFullscreenChange));
      if (fullscreenOverlay) {
        document.body.removeChild(fullscreenOverlay);
      }
    };
  }, [watermarkText]);


  // === UTILITY: Decode JWT để lấy user info ===
  const decodeToken = (token) => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
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
      // Lỗi tải comments
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

    // === PAUSE VIDEO KHI TAB KHÔNG ACTIVE ===
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

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
        // Lỗi fetch detail
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAllData();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

    // Lấy URL tài liệu (dùng cho document type)
    const documentUrl = l.type === 'document' ? (l.video_url || l.content || '') : '';
    const displayName = l.display_name || l.title || 'Tài liệu';

    return {
      ...l,
      src: videoUrl,
      documentUrl: documentUrl,
      displayName: displayName,
      type: l.type || 'video',
      duration: l.duration || '00:00',
      questions: parsedQuestions,
      quiz_time: quizTime
    };
  };

  const getFullMediaPath = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getAvatarUrl = (avatar, userId) => {
    if (!avatar) {
      return `https://i.pravatar.cc/40?u=${userId}`;
    }
    if (avatar.startsWith('http')) {
      return avatar;
    }
    return `${MEDIA_BASE_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
  };

  const handleLessonSelect = async (lesson) => {
    setActiveLesson(lesson);
    setQuizStarted(false);
    setQuizSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setScore(0);
    setVideoCumulativeTime(0); // Reset video time
    lastProgressUpdateRef.current = 0; // Reset progress tracking
    setQuizAttemptsInfo(null); // Reset quiz attempts info

    // Clear existing timeout
    if (videoTrackingTimeoutRef.current) {
      clearTimeout(videoTrackingTimeoutRef.current);
    }

    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });

    // === Kiểm tra số lần làm quiz nếu là bài quiz ===
    if (lesson?.type === 'quiz' && lesson.id) {
      try {
        setLoadingAttempts(true);
        const token = localStorage.getItem('user_token');
        const response = await axios.get(`${API_BASE}/${id}/quiz-attempts/${lesson.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setQuizAttemptsInfo(response.data);
      } catch (error) {
        setQuizAttemptsInfo(null);
      } finally {
        setLoadingAttempts(false);
      }
    }

    // === Track lesson viewing để cập nhật progress ===
    if (lesson && currentUser?.id) {
      try {
        const token = localStorage.getItem('user_token');

        // YouTube videos: Track ngay (không thể track watched % do cross-origin)
        // HTML5 videos: Track qua onTimeUpdate/onEnded events
        // Documents/Quiz: Track ngay

        const isYouTube = lesson.src?.includes('youtube.com/embed');

        if (lesson.type === 'video' && !isYouTube) {
          // Cho HTML5 video, tracking sẽ được handle bởi onTimeUpdate event
          // Không cần track ngay lúc này
        } else if (lesson.type === 'video' && isYouTube) {
          // YouTube videos: Track ngay khi select
          // Vì không thể access duration/currentTime do cross-origin restrictions
          await axios.post(`${API_BASE}/${id}/track-lesson/${lesson.id}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          // Recalculate score
          await axios.post(`${API_BASE}/${id}/calculate-score/${currentUser?.id}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          setScoreRefreshTrigger(prev => prev + 1);

          // Ghi chú: YouTube videos được tính vào progress ngay lúc xem
          // Không cần tracking watched_percentage
        } else {
          // Documents/Quiz: track ngay
          await axios.post(`${API_BASE}/${id}/track-lesson/${lesson.id}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          // Recalculate score
          await axios.post(`${API_BASE}/${id}/calculate-score/${currentUser?.id}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          setScoreRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        // Progress tracking not critical, continue anyway
      }
    }
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

  // === VIDEO TRACKING HANDLERS ===
  const handleVideoTimeUpdate = async () => {
    if (!videoRef.current || !activeLesson || activeLesson.type !== 'video') return;

    // ❌ KHÔNG TRACK nếu tab không active
    if (document.hidden) {
      return;
    }

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Update cumulative time (how much they've watched)
    setVideoCumulativeTime(currentTime);

    // Send progress update every 30 seconds of watch time
    if (currentTime - lastProgressUpdateRef.current >= 30) {
      try {
        const token = localStorage.getItem('user_token');
        await axios.post(`${API_BASE}/${id}/track-video/${activeLesson.id}`, {
          watchedSeconds: Math.round(currentTime),
          totalSeconds: Math.round(duration)
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        lastProgressUpdateRef.current = currentTime;
      } catch (err) {
        // Progress update failed (non-critical)
      }
    }

    // Track when they've watched >= 80% and we haven't sent it yet
    const watchedPercentage = (currentTime / duration) * 100;

    if (watchedPercentage >= 80 && !videoTrackingTimeoutRef.current) {

      try {
        const token = localStorage.getItem('user_token');

        // 1. Track video watching
        await axios.post(`${API_BASE}/${id}/track-video/${activeLesson.id}`, {
          watchedSeconds: Math.round(currentTime),
          totalSeconds: Math.round(duration)
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 2. Recalculate overall score
        await axios.post(`${API_BASE}/${id}/calculate-score/${currentUser?.id}`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 3. Refresh scoreboard
        setScoreRefreshTrigger(prev => prev + 1);

        // Mark so we don't track again
        videoTrackingTimeoutRef.current = true;
      } catch (err) {
        // Video tracking failed (non-critical)
      }
    }
  };

  const handleVideoEnded = async () => {
    if (!videoRef.current || !activeLesson || activeLesson.type !== 'video') return;

    const duration = videoRef.current.duration;

    try {
      const token = localStorage.getItem('user_token');

      // 1. Track video completion
      await axios.post(`${API_BASE}/${id}/track-video/${activeLesson.id}`, {
        watchedSeconds: Math.round(duration),
        totalSeconds: Math.round(duration)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 2. Recalculate overall score
      await axios.post(`${API_BASE}/${id}/calculate-score/${currentUser?.id}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 3. Refresh scoreboard
      setScoreRefreshTrigger(prev => prev + 1);
    } catch (err) {
      // Video tracking failed on end (non-critical)
    }
  };

  // Handle document download with proper filename
  const handleDownload = async () => {
    try {
      const url = activeLesson.documentUrl || activeLesson.src || activeLesson.video_url;
      const filename = activeLesson.displayName || activeLesson.title || 'document';

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      // Ensure filename has .pdf extension for documents
      const downloadName = activeLesson.type === 'document' && !filename.toLowerCase().endsWith('.pdf') 
        ? `${filename}.pdf` 
        : filename;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Download failed, fallback to direct link
      const a = document.createElement('a');
      a.href = activeLesson.documentUrl || activeLesson.src || activeLesson.video_url;
      const fallbackName = activeLesson.displayName || activeLesson.title;
      a.download = activeLesson.type === 'document' && !fallbackName.toLowerCase().endsWith('.pdf') 
        ? `${fallbackName}.pdf` 
        : fallbackName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Quiz Logic Handlers
  const handleStartQuiz = () => {
    // Kiểm tra số lần làm quiz
    if (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) {
      notifyWarning(`Bạn đã hết lượt làm bài (${quizAttemptsInfo.maxAttempts}/${quizAttemptsInfo.maxAttempts})`);
      return;
    }

    // Lấy thời gian từ quiz_time của lesson (đã được format từ duration trong formatLessonData)
    // Nếu không có thì mặc định 60 phút
    const quizTimeInMinutes = activeLesson?.quiz_time || 60;
    const quizTimeInSeconds = quizTimeInMinutes * 60;
    setQuizStarted(true);
    setQuizSubmitted(false);
    setUserAnswers({});
    setScore(0);
    setTimeLeft(quizTimeInSeconds);
    setTotalTime(quizTimeInSeconds);
  };
  const handleSelectAnswer = (qIdx, optionIdx) => { if (quizSubmitted) return; setUserAnswers(prev => ({ ...prev, [qIdx]: optionIdx })); };
  const handleSubmitQuiz = async () => {
    if (!activeLesson?.questions) return;
    let correctCount = 0;
    activeLesson.questions.forEach((q, idx) => {
      if (userAnswers[idx] === parseInt(q.correctIndex)) correctCount++;
    });
    setScore(correctCount);
    setQuizSubmitted(true);

    // === TÍNH ĐIỂM QUIZ VÀ LƯU VÀO DATABASE ===
    try {
      const totalQuestions = activeLesson.questions.length;
      const quizScorePercent = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const token = localStorage.getItem('user_token');

      // Lấy userId từ currentUser hoặc từ localStorage
      let userId = currentUser?.id;
      if (!userId) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            userId = JSON.parse(storedUser).id;
          } catch (e) {
            // Không thể parse user từ localStorage
          }
        }
      }

      if (!userId) {
        notifySuccess(`Đã nộp bài! Điểm: ${quizScorePercent.toFixed(1)}/100`);
        return;
      }

      // 1. Lưu kết quả quiz
      await axios.post(`${API_BASE}/${id}/quiz-result`, {
        lessonId: activeLesson.id,
        score: quizScorePercent,
        correctAnswers: correctCount,
        totalQuestions: totalQuestions
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 2. Tính lại điểm tổng thể
      await axios.post(`${API_BASE}/${id}/calculate-score/${userId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      notifySuccess(`Đã nộp bài! Điểm: ${quizScorePercent.toFixed(1)}/100`);

      // 3. Trigger refresh scoreboard
      setScoreRefreshTrigger(prev => prev + 1);

      // 4. Refresh quiz attempts info
      try {
        const attemptsRes = await axios.get(`${API_BASE}/${id}/quiz-attempts/${activeLesson.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setQuizAttemptsInfo(attemptsRes.data);
      } catch (e) {
        // Lỗi refresh quiz attempts
      }
    } catch (error) {
      // Lỗi lưu điểm quiz
      // Vẫn hiển thị điểm cho user
      const totalQuestions = activeLesson.questions.length;
      const quizScorePercent = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      notifySuccess(`Đã nộp bài! Điểm: ${quizScorePercent.toFixed(1)}/100`);
    }
  };

  const handleRetryQuiz = async () => {
    // Kiểm tra lại số lần làm quiz trước khi cho retry
    if (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) {
      notifyWarning(`Bạn đã hết lượt làm bài (${quizAttemptsInfo.maxAttempts}/${quizAttemptsInfo.maxAttempts})`);
      return;
    }

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
    <>
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
            {/* Watermark text computed per render */}
            {(() => {
              try {
                const _watermarkText = `${(currentUser && (currentUser.displayName || currentUser.username || currentUser.email)) || 'Guest'} • ${new Date().toLocaleDateString()}${course ? ' • ' + (course.title || '') : ''}`;
                return null; // variable only - actual rendering below uses same expression to avoid scope issues in JSX
              } catch (e) {
                return null;
              }
            })()}
            {activeLesson?.type === 'video' && (
              <div className="video-wrapper">
                {activeLesson.src?.includes('youtube.com/embed') ? (
                  <iframe
                    key={activeLesson.id}
                    className="main-video-player"
                    src={activeLesson.src + '?modestbranding=1&rel=0&fs=0&autoplay=0'}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={activeLesson.id}
                    controls
                    controlsList="nofullscreen nodownload noplaybackrate"
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    autoPlay
                    className="main-video-player"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                  >
                    <source src={getFullMediaPath(activeLesson.src)} type="video/mp4" />
                    Trình duyệt không hỗ trợ.
                  </video>
                )}
                {/* Watermark overlay (3 repeated marks: left, center, right) */}
                <div className="video-watermark" aria-hidden="true">
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                </div>
              </div>
            )}

            {/* 2. DOCUMENT VIEWER - Auto display */}
            {activeLesson?.type === 'document' && (
              <div className="document-preview-wrapper" style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '700px',
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}>
                <div className="preview-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>{activeLesson.title}</h3>
                    {activeLesson.displayName && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{activeLesson.displayName}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Nút tải về */}
                    <button
                      onClick={handleDownload}
                      className="btn-download-header"
                      style={{
                        background: '#0050b8',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#003a82';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#0050b8';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Tải về
                    </button>
                  </div>
                </div>

                {/* Iframe với Google Docs Viewer */}
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(activeLesson.documentUrl || activeLesson.src || activeLesson.video_url)}&embedded=true`}
                  className="document-preview-iframe"
                  style={{
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    background: '#fff'
                  }}
                  title={activeLesson.title}
                />
                {/* Watermark overlay for documents */}
                <div className="video-watermark" aria-hidden="true">
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                </div>
              </div>
            )}

            {/* 3. QUIZ PLAYER */}
            {activeLesson?.type === 'quiz' && (
              <div className="quiz-wrapper">
                <div className="video-watermark" aria-hidden="true">
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                  <span className="wm-text">{watermarkText}</span>
                </div>
                {!quizStarted && !quizSubmitted && (
                  <div className="quiz-card">
                    <h2 className="quiz-title">{activeLesson.title}</h2>
                    <p className="quiz-desc" style={{ marginBottom: '16px', fontSize: '16px', lineHeight: '1.6' }}>
                      Bài kiểm tra trắc nghiệm gồm <strong>{activeLesson.questions?.length || 0} câu hỏi</strong>
                      <br />
                      <span style={{ fontSize: '14px', color: '#999', marginTop: '8px', display: 'block' }}>
                        Thời gian: <strong>{activeLesson?.quiz_time || 60} phút</strong>
                      </span>
                    </p>

                    {/* Hiển thị thông tin số lần làm quiz */}
                    {loadingAttempts ? (
                      <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                        Đang kiểm tra...
                      </div>
                    ) : quizAttemptsInfo && (
                      <div style={{
                        padding: '12px 16px',
                        background: quizAttemptsInfo.canAttempt ? '#e8f5e9' : '#ffebee',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: `1px solid ${quizAttemptsInfo.canAttempt ? '#a5d6a7' : '#ef9a9a'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <strong style={{ color: quizAttemptsInfo.canAttempt ? '#2e7d32' : '#c62828' }}>
                              {quizAttemptsInfo.maxAttempts === 0
                                ? '✓ Không giới hạn số lần'
                                : quizAttemptsInfo.canAttempt
                                  ? `✓ Còn ${quizAttemptsInfo.remainingAttempts} lượt làm bài`
                                  : '✗ Đã hết lượt làm bài'}
                            </strong>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              {quizAttemptsInfo.maxAttempts > 0 && (
                                <>Đã làm: {quizAttemptsInfo.attemptCount}/{quizAttemptsInfo.maxAttempts} lần</>
                              )}
                              {(quizAttemptsInfo.bestScore !== undefined && quizAttemptsInfo.bestScore !== null && isFinite(Number(quizAttemptsInfo.bestScore)) && Number(quizAttemptsInfo.bestScore) > 0) && (
                                <span style={{ marginLeft: '12px' }}>
                                  | Điểm cao nhất: <strong style={{ color: '#0050b8' }}>{Number(quizAttemptsInfo.bestScore).toFixed(1)}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      className="btn-start-learning"
                      onClick={handleStartQuiz}
                      disabled={loadingAttempts || (quizAttemptsInfo && !quizAttemptsInfo.canAttempt)}
                      style={{
                        opacity: (loadingAttempts || (quizAttemptsInfo && !quizAttemptsInfo.canAttempt)) ? 0.5 : 1,
                        cursor: (loadingAttempts || (quizAttemptsInfo && !quizAttemptsInfo.canAttempt)) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {quizAttemptsInfo && !quizAttemptsInfo.canAttempt ? 'Hết lượt làm bài' : 'Bắt đầu làm bài'}
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
                      justifyContent: 'center',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      {/* Hiển thị thông tin số lần làm còn lại */}
                      {quizAttemptsInfo && quizAttemptsInfo.maxAttempts > 0 && (
                        <div style={{
                          padding: '10px 16px',
                          background: quizAttemptsInfo.canAttempt ? '#e8f5e9' : '#ffebee',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: quizAttemptsInfo.canAttempt ? '#2e7d32' : '#c62828',
                          fontWeight: '500'
                        }}>
                          {quizAttemptsInfo.canAttempt
                            ? `Còn ${quizAttemptsInfo.remainingAttempts} lượt làm bài`
                            : 'Đã hết lượt làm bài'}
                        </div>
                      )}

                      <button
                        className="btn-start-learning"
                        onClick={handleRetryQuiz}
                        disabled={quizAttemptsInfo && !quizAttemptsInfo.canAttempt}
                        style={{
                          padding: '14px 32px',
                          borderRadius: '8px',
                          border: 'none',
                          background: (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) ? '#9e9e9e' : '#0050b8',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) ? 'none' : '0 2px 8px rgba(0, 80, 184, 0.25)',
                          opacity: (quizAttemptsInfo && !quizAttemptsInfo.canAttempt) ? 0.7 : 1
                        }}
                        onMouseOver={(e) => {
                          if (!(quizAttemptsInfo && !quizAttemptsInfo.canAttempt)) {
                            e.currentTarget.style.background = '#003a82';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 80, 184, 0.4)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!(quizAttemptsInfo && !quizAttemptsInfo.canAttempt)) {
                            e.currentTarget.style.background = '#0050b8';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 184, 0.25)';
                          }
                        }}
                      >
                        {(quizAttemptsInfo && !quizAttemptsInfo.canAttempt) ? 'Hết lượt làm bài' : 'Làm lại bài thi'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!activeLesson && (
              <div className="no-lesson">
                <img src={noVideoImage} alt="Không có video - Hình ảnh thế chỗ" className="no-lesson-image" />
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
            <button className={`intro-tab ${activeTab === 'score' ? 'active' : ''}`} onClick={() => setActiveTab('score')}>
              Điểm Số
            </button>
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
              ) : activeTab === 'score' ? (
                <CourseScoreboard courseId={id} userId={currentUser?.id} refreshTrigger={scoreRefreshTrigger} />
              ) : (
                <div className="comments-section">
                  {/* Post Comment Form */}
                  <div className="comment-form-wrapper">
                    <h3>Viết bình luận</h3>
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Chia sẻ ý kiến của bạn..."
                      className="comment-textarea"
                      rows="4"
                    />
                    <div className="comment-form-footer">
                      <div className="rating-input">
                        <span>Đánh giá: </span>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={20}
                            className="rating-star"
                            fill={star <= (hoverRating || commentRating) ? '#ffc107' : 'none'}
                            color={star <= (hoverRating || commentRating) ? '#ffc107' : '#ddd'}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setCommentRating(star)}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </div>
                      <button onClick={handlePostComment} className="btn-post-comment">
                        Đăng bình luận
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="comments-list-wrapper">
                    <h3>Bình luận ({comments.length})</h3>
                    {loadingComments ? (
                      <p>Đang tải bình luận...</p>
                    ) : comments.length === 0 ? (
                      <p className="no-comments">Chưa có bình luận nào</p>
                    ) : (
                      <div className="comments-list">
                        {comments.map(comment => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-header">
                              <div className="comment-author-info">
                                <img
                                  src={getAvatarUrl(comment.user_avatar, comment.user_id)}
                                  alt={`Avatar của ${comment.user_name}`}
                                  className="comment-avatar"
                                  onError={(e) => e.target.src = `https://i.pravatar.cc/40?u=${comment.user_id}`}
                                />
                                <div className="comment-author-details">
                                  <strong className="comment-author-name">{comment.user_name}</strong>
                                  <small className="comment-date">
                                    {new Date(comment.created_at).toLocaleDateString('vi-VN')}
                                  </small>
                                </div>
                              </div>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className="comment-edit-form">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="comment-textarea"
                                  rows="3"
                                />
                                <div className="comment-edit-rating">
                                  <span>Đánh giá: </span>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      size={18}
                                      className="edit-rating-star"
                                      fill={star <= editingRating ? '#ffc107' : 'none'}
                                      color={star <= editingRating ? '#ffc107' : '#ddd'}
                                      onMouseEnter={() => setEditingRating(star)}
                                      onClick={() => setEditingRating(star)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  ))}
                                </div>
                                <div className="comment-edit-actions">
                                  <button
                                    onClick={() => handleUpdateComment(comment.id)}
                                    className="btn-save"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="btn-cancel"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="comment-content">{comment.content}</p>
                                {comment.rating > 0 && (
                                  <div className="comment-rating">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        fill={i < comment.rating ? '#ffc107' : 'none'}
                                        color={i < comment.rating ? '#ffc107' : '#ddd'}
                                      />
                                    ))}
                                  </div>
                                )}
                                <div className="comment-footer">
                                  {currentUser?.id === comment.user_id && (
                                    <div className="comment-actions">
                                      <button
                                        onClick={() => handleEditComment(comment)}
                                        className="btn-edit"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="btn-delete"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                          alt={`Khóa học liên quan: ${rc.title}`}
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
     </>
  );
}

export default CourseDetailPage;