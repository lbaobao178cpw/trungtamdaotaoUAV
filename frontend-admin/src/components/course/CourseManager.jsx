import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Video,
  Image as X,
  BookOpen,
  Award,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  Save,
  CheckCircle,
  Loader,
} from "lucide-react";
import MediaSelector from "../mediaSelector/MediaSelector";
import MediaUploader from "../MediaUploader";
import { uploadImage, uploadVideo } from "../../lib/cloudinaryService";
import "./CourseManager.css";

// CẤU HÌNH API
const API_URL = "http://localhost:5000/api/courses";
const MEDIA_BASE_URL = "http://localhost:5000";

export default function CourseManager() {
  // --- 1. STATES ---
  const [viewMode, setViewMode] = useState("list");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVideoUploadingOpen, setIsVideoUploadingOpen] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // Form States
  const [courseFormData, setCourseFormData] = useState({
    id: null,
    title: "",
    description: "",
    type: "A",
    thumbnail: "",
    chapters: [],
  });

  const [mediaTarget, setMediaTarget] = useState(null);

  // Editor States
  const [expandedChapters, setExpandedChapters] = useState({});
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeChapterIdForLesson, setActiveChapterIdForLesson] =
    useState(null);

  const [lessonFormData, setLessonFormData] = useState({
    id: null,
    title: "",
    type: "video",
    content: "",
    duration: "",
    questions: [],
    passScore: 0,
  });

  const [tempQuestion, setTempQuestion] = useState({
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  });

  // --- 2. API FUNCTIONS (CORE) ---

  // Load danh sách khóa học
  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token"); // Dùng admin_token
      const res = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!res.ok)
        throw new Error("Không thể kết nối server hoặc lỗi xác thực");
      const data = await res.json();

      const mappedCourses = data.map((c) => ({
        ...c,
        thumbnail: c.image,
        type: c.level === "Cơ bản" ? "A" : c.level === "Nâng cao" ? "B" : "A",
        chapters: [],
      }));

      setCourses(mappedCourses);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Helper: Lấy URL đầy đủ
  const getFullUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  // --- 3. COURSE INFO HANDLERS ---
  const handleCreateCourse = () => {
    setCourseFormData({
      id: null,
      title: "",
      description: "",
      type: "A",
      thumbnail: "",
      chapters: [],
    });
    setIsCourseFormOpen(true);
  };

  const handleEditCourseInfo = (course) => {
    setCourseFormData({
      ...course,
      type: course.level === "Nâng cao" ? "B" : "A", // Map lại level
    });
    setIsCourseFormOpen(true);
  };

  const handleSaveCourseInfo = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return alert("Phiên đăng nhập hết hạn");

      let thumbnailUrl = courseFormData.thumbnail;

      // Upload ảnh nếu là blob local
      if (thumbnailUrl && thumbnailUrl.includes("localhost")) {
        try {
          const response = await fetch(thumbnailUrl);
          const blob = await response.blob();
          const file = new File([blob], "course-thumbnail.jpg", {
            type: blob.type,
          });
          const result = await uploadImage(file);
          if (result.success) thumbnailUrl = result.url;
        } catch (err) {
          console.error("Error uploading thumbnail:", err);
        }
      }

      // Nếu đang sửa, cần lấy chapters cũ để không bị mất
      let currentChapters = [];
      if (courseFormData.id) {
        const detailRes = await fetch(`${API_URL}/${courseFormData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detailData = await detailRes.json();
        if (detailData.chapters) {
          // Map lại cấu trúc cũ để gửi lên
          currentChapters = detailData.chapters.map((c) => ({
            title: c.title,
            lessons: (c.lessons || []).map((l) => ({
              title: l.title,
              type: l.type,
              video_url: l.video_url,
              duration: l.duration,
              quiz_data:
                l.quiz_data ||
                (l.content_data ? JSON.parse(l.content_data) : []),
            })),
          }));
        }
      }

      const payload = {
        title: courseFormData.title,
        description: courseFormData.description,
        image: thumbnailUrl,
        level: courseFormData.type === "B" ? "Nâng cao" : "Cơ bản",
        price: 0,
        chapters: currentChapters,
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      if (courseFormData.id) {
        await fetch(`${API_URL}/${courseFormData.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      await fetchCourses();
      setIsCourseFormOpen(false);
      alert("Lưu thông tin thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khóa học này?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCourses();
    } catch (error) {
      alert("Lỗi xóa: " + error.message);
    }
  };

  // --- 4. CURRICULUM HANDLERS (QUAN TRỌNG: FIX LỖI Ở ĐÂY) ---

  // Hàm lấy chi tiết khóa học để soạn giáo trình
  const handleOpenCurriculum = async (course) => {
    try {
      const token = localStorage.getItem("admin_token"); // FIX: Dùng admin_token
      if (!token) {
        alert("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn!");
        return;
      }

      const res = await fetch(`${API_URL}/${course.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn.");
      if (!res.ok) throw new Error("Lỗi tải dữ liệu: " + res.statusText);

      const data = await res.json();
      const chaptersFromApi = data.chapters || [];

      const formattedChapters = chaptersFromApi.map((chap) => ({
        id: chap.id,
        title: chap.title,
        lessons: (chap.lessons || []).map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          content: l.video_url,
          duration: l.duration,
          questions:
            (typeof l.quiz_data === "string"
              ? JSON.parse(l.quiz_data)
              : l.quiz_data) || [],
          passScore: 0,
        })),
      }));

      // Tạo chương mặc định nếu trống
      if (formattedChapters.length === 0) {
        formattedChapters.push({
          id: Date.now(),
          title: "Chương 1: Khởi động",
          lessons: [],
        });
      }

      const fullCourseData = { ...course, chapters: formattedChapters };
      setSelectedCourse(fullCourseData);

      if (formattedChapters.length > 0) {
        setExpandedChapters({ [formattedChapters[0].id]: true });
      }

      setViewMode("editor");
    } catch (error) {
      console.error(error);
      alert("Lỗi: " + error.message);
    }
  };

  // Hàm lưu giáo trình lên server
  const saveCurriculum = async () => {
    if (!selectedCourse) return;

    const chaptersPayload = selectedCourse.chapters.map((chap) => ({
      title: chap.title,
      lessons: chap.lessons.map((l) => ({
        title: l.title,
        type: l.type,
        video_url: l.content, // Map content -> video_url
        duration: l.duration,
        quiz_data: l.questions || [],
      })),
    }));

    const payload = {
      title: selectedCourse.title,
      description: selectedCourse.description,
      image: selectedCourse.thumbnail,
      level: selectedCourse.level || "Cơ bản",
      price: 0,
      chapters: chaptersPayload,
    };

    try {
      const token = localStorage.getItem("admin_token"); // FIX: Dùng admin_token
      if (!token) return alert("Phiên đăng nhập hết hạn");

      const res = await fetch(`${API_URL}/${selectedCourse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Lỗi khi lưu giáo trình");
      alert("Đã lưu nội dung giáo trình thành công!");
      await fetchCourses();
    } catch (error) {
      alert("Lỗi lưu giáo trình: " + error.message);
    }
  };

  // --- 5. LOCAL UI HANDLERS (Chapters/Lessons/Quiz) ---

  // Chapter
  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      title: `Chương mới ${selectedCourse.chapters.length + 1}`,
      lessons: [],
    };
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
    }));
    setExpandedChapters((prev) => ({ ...prev, [newChapter.id]: true }));
  };

  const updateChapterTitle = (chapterId, newTitle) => {
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId ? { ...c, title: newTitle } : c
      ),
    }));
  };

  const toggleChapter = (chapterId) =>
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));

  // Lesson
  const openAddLessonModal = (chapterId) => {
    setActiveChapterIdForLesson(chapterId);
    setLessonFormData({
      id: null,
      title: "",
      type: "video",
      content: "",
      duration: "",
      questions: [],
      passScore: 0,
    });
    resetTempQuestion();
    setIsLessonModalOpen(true);
  };

  const editLesson = (chapterId, lesson) => {
    setActiveChapterIdForLesson(chapterId);
    setLessonFormData({
      ...lesson,
      questions: lesson.questions || [],
      passScore: lesson.passScore || 0,
    });
    resetTempQuestion();
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = (e) => {
    e.preventDefault();
    const newLesson = {
      ...lessonFormData,
      id: lessonFormData.id || Date.now(),
    };

    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chap) => {
        if (chap.id === activeChapterIdForLesson) {
          if (lessonFormData.id) {
            return {
              ...chap,
              lessons: chap.lessons.map((l) =>
                l.id === lessonFormData.id ? newLesson : l
              ),
            };
          }
          return { ...chap, lessons: [...chap.lessons, newLesson] };
        }
        return chap;
      }),
    }));
    setIsLessonModalOpen(false);
  };

  const deleteLesson = async (chapterId, lessonId) => {
    if (
      !window.confirm(
        "Xóa bài học này? Hành động này không thể không phục !"
      )
    )
      return;

    // 1. Cập nhật giao diện Admin trước cho nhanh
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, lessons: c.lessons.filter((l) => l.id !== lessonId) }
          : c
      ),
    }));

    setTimeout(() => {
      saveCurriculum();
    }, 100);
  };

  // Quiz
  const resetTempQuestion = () =>
    setTempQuestion({ text: "", options: ["", "", "", ""], correctIndex: 0 });

  const handleAddQuestionToQuiz = () => {
    if (!tempQuestion.text.trim()) return alert("Chưa nhập câu hỏi");
    setLessonFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...tempQuestion, id: Date.now() }],
    }));
    resetTempQuestion();
  };

  const handleDeleteQuizQuestion = (indexToRemove) => {
    const updatedQuestions = lessonFormData.questions.filter(
      (_, index) => index !== indexToRemove
    );
    setLessonFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  const handleEditQuizQuestion = (indexToEdit) => {
    const questionToEdit = lessonFormData.questions[indexToEdit];
    setTempQuestion({
      text: questionToEdit.text,
      options: questionToEdit.options,
      correctIndex: questionToEdit.correctIndex,
    });
    handleDeleteQuizQuestion(indexToEdit);
  };

  // Media & Upload
  const openMediaSelector = (target) => {
    setMediaTarget(target);
    setIsMediaModalOpen(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaTarget === "thumbnail") {
      setCourseFormData((prev) => ({ ...prev, thumbnail: url }));
    } else if (mediaTarget === "lesson-content") {
      setLessonFormData((prev) => ({ ...prev, content: url }));
    }
    setIsMediaModalOpen(false);
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsVideoUploading(true);
      setVideoUploadProgress(0);

      const progressInterval = setInterval(() => {
        setVideoUploadProgress((prev) =>
          prev >= 90 ? prev : prev + Math.random() * 30
        );
      }, 500);

      const result = await uploadVideo(file);
      clearInterval(progressInterval);

      if (result.success) {
        setLessonFormData((prev) => ({ ...prev, content: result.url }));
        setVideoUploadProgress(100);
        setTimeout(() => {
          setIsVideoUploadingOpen(false);
          setVideoUploadProgress(0);
          setIsVideoUploading(false);
        }, 500);
      } else {
        throw new Error(result.error || "Upload thất bại");
      }
    } catch (error) {
      alert("Lỗi upload video: " + error.message);
      setVideoUploadProgress(0);
      setIsVideoUploading(false);
    }
  };

  // --- 6. RENDER VIEWS ---

  // VIEW 1: Danh sách khóa học
  const renderCourseList = () => (
    <>
      <div className="cm-header">
        <div className="cm-header-content">
          <div className="cm-title-section">
            <div className="cm-icon-wrapper">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="cm-title">Quản lý Khóa học</h1>
              <p className="cm-subtitle">
                Dữ liệu được đồng bộ trực tiếp từ Database
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateCourse}
            className="cm-btn cm-btn-primary"
          >
            <Plus size={20} /> <span>Tạo khóa học mới</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="cm-loading">Đang tải dữ liệu...</div>
      ) : (
        <div className="cm-courses-grid">
          {courses.length === 0 ? (
            <p>Chưa có khóa học nào.</p>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="cm-course-card">
                <div className="cm-course-thumbnail">
                  <img
                    src={getFullUrl(course.thumbnail)}
                    alt={course.title}
                    onError={(e) =>
                      (e.target.src =
                        "https://placehold.co/600x400?text=No+Image")
                    }
                  />
                  <div
                    className={`cm-course-badge ${
                      course.type === "A" ? "cm-badge-a" : "cm-badge-b"
                    }`}
                  >
                    {course.type === "A" ? (
                      <BookOpen size={14} />
                    ) : (
                      <Award size={14} />
                    )}
                    <span>{course.type === "A" ? "Cơ bản" : "Nâng cao"}</span>
                  </div>
                </div>
                <div className="cm-course-content">
                  <h3 className="cm-course-title">{course.title}</h3>
                  <div className="cm-course-actions">
                    <button
                      onClick={() => handleOpenCurriculum(course)}
                      className="cm-btn cm-btn-primary cm-btn-sm"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <Edit2 size={16} /> Soạn giáo trình
                    </button>
                    <button
                      onClick={() => handleEditCourseInfo(course)}
                      className="cm-btn cm-btn-ghost cm-btn-icon"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="cm-btn cm-btn-ghost cm-btn-icon"
                      style={{ color: "red" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );

  // VIEW 2: Trình soạn thảo giáo trình
  const renderCurriculumEditor = () => (
    <div className="cm-editor-container">
      <div className="cm-editor-header">
        <button onClick={() => setViewMode("list")} className="cm-back-btn">
          <ArrowLeft size={20} /> Quay lại
        </button>
        <div className="cm-editor-title">
          <span className="cm-editor-label">Đang soạn thảo:</span>
          <h2>{selectedCourse?.title}</h2>
        </div>
        <button onClick={saveCurriculum} className="cm-btn cm-btn-primary">
          <Save size={18} /> Lưu thay đổi lên Server
        </button>
      </div>

      <div className="cm-curriculum-body">
        <div className="cm-chapter-list">
          {selectedCourse?.chapters &&
            selectedCourse.chapters.map((chapter, index) => (
              <div key={chapter.id} className="cm-chapter-item">
                <div className="cm-chapter-header">
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="cm-chapter-toggle"
                  >
                    {expandedChapters[chapter.id] ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  <div className="cm-chapter-info">
                    <span className="cm-chapter-index">
                      Chương {index + 1}:
                    </span>
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) =>
                        updateChapterTitle(chapter.id, e.target.value)
                      }
                      className="cm-chapter-title-input"
                      placeholder="Tên chương..."
                    />
                  </div>
                  <div className="cm-chapter-actions">
                    <button
                      onClick={() => openAddLessonModal(chapter.id)}
                      className="cm-btn cm-btn-sm cm-btn-secondary"
                    >
                      <Plus size={14} /> Thêm bài học
                    </button>
                  </div>
                </div>

                {expandedChapters[chapter.id] && (
                  <div className="cm-lesson-list">
                    {chapter.lessons.length === 0 ? (
                      <div className="cm-no-lessons">Chưa có bài học.</div>
                    ) : (
                      chapter.lessons.map((lesson) => (
                        <div key={lesson.id} className="cm-lesson-item">
                          <div className="cm-lesson-icon">
                            {lesson.type === "video" ? (
                              <Video size={16} />
                            ) : lesson.type === "quiz" ? (
                              <HelpCircle size={16} />
                            ) : (
                              <FileText size={16} />
                            )}
                          </div>
                          <div className="cm-lesson-info">
                            <span className="cm-lesson-title">
                              {lesson.title}
                            </span>
                            <span className="cm-lesson-meta">
                              {lesson.type} • {lesson.duration}
                            </span>
                          </div>
                          <div className="cm-lesson-actions">
                            <button
                              onClick={() => editLesson(chapter.id, lesson)}
                              className="cm-icon-btn"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() =>
                                deleteLesson(chapter.id, lesson.id)
                              }
                              className="cm-icon-btn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>

        <button onClick={addChapter} className="cm-add-chapter-btn">
          <Plus size={20} /> Thêm chương mới
        </button>
      </div>
    </div>
  );

  // --- 7. MAIN RETURN ---
  return (
    <div className="course-manager">
      {viewMode === "list" ? renderCourseList() : renderCurriculumEditor()}

      {/* MODAL: INFO */}
      {isCourseFormOpen && (
        <div className="cm-modal-overlay">
          <div className="cm-modal">
            <div className="cm-modal-header">
              <h2>{courseFormData.id ? "Cập nhật" : "Tạo mới"} khóa học</h2>
              <button
                onClick={() => setIsCourseFormOpen(false)}
                className="cm-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCourseInfo} className="cm-form">
              <div className="cm-form-group">
                <label className="cm-form-label">Tên khóa học *</label>
                <input
                  className="cm-form-input"
                  required
                  value={courseFormData.title}
                  onChange={(e) =>
                    setCourseFormData({
                      ...courseFormData,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-form-label">Mô tả</label>
                <textarea
                  className="cm-form-input cm-form-textarea"
                  value={courseFormData.description}
                  onChange={(e) =>
                    setCourseFormData({
                      ...courseFormData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="cm-form-group">
                <label className="cm-form-label">Phân loại khóa học *</label>
                <div className="cm-type-selector">
                  <button
                    type="button"
                    className={`cm-type-btn ${
                      courseFormData.type === "A" ? "active" : ""
                    }`}
                    onClick={() =>
                      setCourseFormData({ ...courseFormData, type: "A" })
                    }
                  >
                    <BookOpen size={18} />
                    <div className="cm-type-info">
                      <span className="cm-type-name">Cơ bản (A)</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`cm-type-btn ${
                      courseFormData.type === "B" ? "active" : ""
                    }`}
                    onClick={() =>
                      setCourseFormData({ ...courseFormData, type: "B" })
                    }
                  >
                    <Award size={18} />
                    <div className="cm-type-info">
                      <span className="cm-type-name">Nâng cao (B)</span>
                    </div>
                  </button>
                </div>
              </div>
              <div className="cm-form-group">
                <label className="cm-form-label">Ảnh bìa</label>
                <div className="cm-media-input-group">
                  <button
                    type="button"
                    onClick={() => openMediaSelector("thumbnail")}
                    className="cm-btn cm-btn-secondary"
                  >
                    📁 Chọn ảnh
                  </button>
                </div>
                {courseFormData.thumbnail && (
                  <div style={{ marginTop: "15px", textAlign: "center" }}>
                    <img
                      src={courseFormData.thumbnail}
                      alt="Preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="cm-modal-footer">
                <button type="submit" className="cm-btn cm-btn-primary">
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LESSON/QUIZ */}
      {isLessonModalOpen && (
        <div className="cm-modal-overlay">
          <div
            className={`cm-modal ${
              lessonFormData.type === "quiz" ? "cm-modal-large" : ""
            }`}
          >
            <div className="cm-modal-header">
              <h2>{lessonFormData.id ? "Sửa bài học" : "Thêm bài học"}</h2>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="cm-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveLesson} className="cm-form">
              <div className="cm-form-row">
                <div className="cm-form-group" style={{ flex: 2 }}>
                  <label className="cm-form-label">Tên bài học *</label>
                  <input
                    className="cm-form-input"
                    required
                    value={lessonFormData.title}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="cm-form-group" style={{ flex: 1 }}>
                  <label className="cm-form-label">Loại</label>
                  <select
                    className="cm-form-input"
                    value={lessonFormData.type}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        type: e.target.value,
                      })
                    }
                  >
                    <option value="video">Video</option>
                    <option value="document">Tài liệu</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
              </div>

              {lessonFormData.type !== "quiz" ? (
                <>
                  <div className="cm-form-group">
                    <label className="cm-form-label">Thời lượng</label>
                    <input
                      className="cm-form-input"
                      value={lessonFormData.duration}
                      onChange={(e) =>
                        setLessonFormData({
                          ...lessonFormData,
                          duration: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="cm-form-group">
                    <label className="cm-form-label">Nội dung (URL)</label>
                    <div className="cm-media-input-group">
                      <input
                        className="cm-form-input"
                        value={lessonFormData.content}
                        onChange={(e) =>
                          setLessonFormData({
                            ...lessonFormData,
                            content: e.target.value,
                          })
                        }
                        placeholder="URL video..."
                      />
                      <button
                        type="button"
                        onClick={() => setIsVideoUploadingOpen(true)}
                        className="cm-btn cm-btn-primary cm-btn-sm"
                      >
                        <Video size={16} /> Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => openMediaSelector("lesson-content")}
                        className="cm-btn cm-btn-secondary"
                      >
                        Chọn
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="cm-quiz-builder">
                  <div className="cm-form-group">
                    <label className="cm-form-label">
                      Thời gian làm bài (phút)
                    </label>
                    <input
                      type="number"
                      className="cm-form-input"
                      value={lessonFormData.duration}
                      onChange={(e) =>
                        setLessonFormData({
                          ...lessonFormData,
                          duration: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="cm-add-question-section">
                    <input
                      className="cm-form-input"
                      placeholder="Câu hỏi..."
                      value={tempQuestion.text}
                      onChange={(e) =>
                        setTempQuestion({
                          ...tempQuestion,
                          text: e.target.value,
                        })
                      }
                    />
                    <div className="cm-options-grid" style={{ marginTop: 10 }}>
                      {tempQuestion.options.map((opt, idx) => (
                        <div
                          key={idx}
                          style={{ display: "flex", gap: 5, marginBottom: 5 }}
                        >
                          <input
                            type="radio"
                            checked={tempQuestion.correctIndex === idx}
                            onChange={() =>
                              setTempQuestion({
                                ...tempQuestion,
                                correctIndex: idx,
                              })
                            }
                          />
                          <input
                            className="cm-form-input"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...tempQuestion.options];
                              newOpts[idx] = e.target.value;
                              setTempQuestion({
                                ...tempQuestion,
                                options: newOpts,
                              });
                            }}
                            placeholder={`Đáp án ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestionToQuiz}
                      className="cm-btn cm-btn-secondary cm-btn-sm"
                      style={{ marginTop: 10 }}
                    >
                      {tempQuestion.text ? "Thêm / Cập nhật" : "Thêm câu hỏi"}
                    </button>
                  </div>
                  <div
                    className="cm-added-questions-list"
                    style={{ marginTop: 20 }}
                  >
                    <h4 className="cm-section-title">
                      Danh sách câu hỏi ({lessonFormData.questions.length})
                    </h4>
                    {lessonFormData.questions.map((q, idx) => (
                      <div key={idx} className="cm-mini-question-card">
                        <div className="cm-mini-q-header">
                          <span className="cm-mini-q-num">Câu {idx + 1}</span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleEditQuizQuestion(idx)}
                              className="cm-icon-btn"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuizQuestion(idx)}
                              className="cm-icon-btn-danger"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="cm-mini-q-text">{q.text}</div>
                        <div className="cm-mini-q-ans">
                          <CheckCircle
                            size={12}
                            style={{ marginRight: 5 }}
                            color="green"
                          />{" "}
                          Đúng: <strong>{q.options[q.correctIndex]}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="cm-modal-footer">
                <button type="submit" className="cm-btn cm-btn-primary">
                  Lưu bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MEDIA & UPLOAD */}
      {isMediaModalOpen && (
        <div className="cm-modal-overlay">
          <div className="cm-modal cm-modal-large">
            <MediaSelector
              onClose={() => setIsMediaModalOpen(false)}
              onSelect={handleMediaSelect}
              mediaBaseUrl={MEDIA_BASE_URL}
            />
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="cm-modal-overlay">
          <div className="cm-modal cm-modal-upload">
            <div className="cm-modal-header">
              <h2>Upload Ảnh Bìa</h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="cm-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <MediaUploader
                type="image"
                onUploadSuccess={(result) => {
                  if (result.success) {
                    setCourseFormData((prev) => ({
                      ...prev,
                      thumbnail: result.url,
                    }));
                    setIsUploadModalOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isVideoUploadingOpen && (
        <div className="cm-modal-overlay">
          <div className="cm-modal" style={{ maxWidth: "500px" }}>
            <div className="cm-modal-header">
              <h2>Upload Video lên Cloud</h2>
              <button
                onClick={() => {
                  setIsVideoUploadingOpen(false);
                  setVideoUploadProgress(0);
                  setIsVideoUploading(false);
                }}
                className="cm-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "30px", textAlign: "center" }}>
              <label
                style={{
                  display: "block",
                  border: "2px dashed #d1d5db",
                  borderRadius: "8px",
                  padding: "30px",
                  cursor: isVideoUploading ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={isVideoUploading}
                  style={{ display: "none" }}
                />
                {isVideoUploading ? (
                  <>
                    <Loader
                      size={24}
                      style={{
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 10px",
                      }}
                    />
                    <p>Đang upload... {Math.round(videoUploadProgress)}%</p>
                  </>
                ) : (
                  <p>Chọn hoặc kéo video vào đây</p>
                )}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
