import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { uploadImage, uploadVideo } from "../../lib/cloudinaryService";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION, MEDIA_BASE_URL } from "../../constants/api";
import "./CourseManager.css";

export default function CourseManager() {
  // --- 1. STATES ---
  const [viewMode, setViewMode] = useState("list");
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Modal States
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVideoUploadingOpen, setIsVideoUploadingOpen] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);

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
  const [activeChapterIdForLesson, setActiveChapterIdForLesson] = useState(null);

  // === FETCH COURSES WITH CUSTOM HOOK ===
  const { data: coursesData, loading: coursesLoading, refetch: refreshCourses } = useApi(API_ENDPOINTS.COURSES);
  const courses = useMemo(() => Array.isArray(coursesData) ? coursesData : [], [coursesData]);
  const { mutate: saveCourse } = useApiMutation();
  const isLoading = coursesLoading; // Alias for compatibility

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
  // Fetch courses using custom hook (defined at top of component)
  // Data automatically loaded and refetched via useApi hook


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
      thumbnail: course.image || course.thumbnail,
      type: course.level === "Nâng cao" ? "B" : "A",
    });
    setIsCourseFormOpen(true);
  };

  // Helper: Upload ảnh lên Cloudinary với progress tracking
  const uploadImageWithProgress = async (file) => {
    try {
      setIsThumbnailUploading(true);
      setThumbnailUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "uav-training/images");
      formData.append("displayName", file.name);

      const token = localStorage.getItem("admin_token");

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Simulate progress từ 0% -> 99%
        const progressInterval = setInterval(() => {
          setThumbnailUploadProgress((prev) => {
            if (prev >= 99) return 99;
            return prev + Math.random() * 20;
          });
        }, 300);

        xhr.addEventListener("load", () => {
          clearInterval(progressInterval);

          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              // Jump lên 100%
              setThumbnailUploadProgress(100);
              setTimeout(() => {
                setIsThumbnailUploading(false);
                setThumbnailUploadProgress(0);
              }, 500);
              resolve(response.url);
            } else {
              reject(new Error(response.error || "Upload failed"));
            }
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          clearInterval(progressInterval);
          reject(new Error("Upload error"));
        });

        xhr.open("POST", "http://localhost:5000/api/cloudinary/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err) {
      console.error("Upload error:", err);
      setIsThumbnailUploading(false);
      throw err;
    }
  };

  const handleSaveCourseInfo = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return alert("Phiên đăng nhập hết hạn");

      let thumbnailUrl = courseFormData.thumbnail;
      let courseDetail = null;

      // Nếu đang sửa, lấy thông tin khóa học cũ từ server để giữ ảnh
      if (courseFormData.id) {
        courseDetail = courses.find(c => c.id === courseFormData.id);
      }

      // Upload ảnh nếu là blob local
      if (thumbnailUrl && thumbnailUrl.includes("localhost")) {
        try {
          const response = await fetch(thumbnailUrl);
          const blob = await response.blob();
          const file = new File([blob], "course-thumbnail.jpg", {
            type: blob.type,
          });
          thumbnailUrl = await uploadImageWithProgress(file);
        } catch (err) {
          console.error("Error uploading thumbnail:", err);
          // Nếu upload ảnh thất bại, giữ lại ảnh cũ
          if (courseDetail && courseDetail.image) {
            thumbnailUrl = courseDetail.image;
          } else {
            throw err;
          }
        }
      } else if (!thumbnailUrl && courseDetail) {
        // Nếu không có ảnh mới, giữ lại ảnh cũ
        thumbnailUrl = courseDetail.image || courseDetail.thumbnail || "";
      }

      // Nếu đang sửa, cần lấy chapters cũ để không bị mất
      let currentChapters = [];
      if (courseDetail?.chapters) {
        currentChapters = courseDetail.chapters.map((c) => ({
          title: c.title,
          lessons: (c.lessons || []).map((l) => ({
            title: l.title,
            type: l.type,
            video_url: l.video_url,
            duration: l.duration,
            quiz_data: l.quiz_data || (l.content_data ? JSON.parse(l.content_data) : []),
          })),
        }));
      }

      const payload = {
        title: courseFormData.title,
        description: courseFormData.description,
        image: thumbnailUrl,
        level: courseFormData.type === "B" ? "Nâng cao" : "Cơ bản",
        price: 0,
        chapters: currentChapters,
      };

      const method = courseFormData.id ? "PUT" : "POST";
      const url = courseFormData.id ? `${API_ENDPOINTS.COURSES}/${courseFormData.id}` : API_ENDPOINTS.COURSES;

      await saveCourse({
        url: url,
        method: method,
        data: payload,
      });

      await refreshCourses();
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
      await saveCourse({
        url: `${API_ENDPOINTS.COURSES}/${id}`,
        method: "DELETE",
      });
      await refreshCourses();
    } catch (error) {
      alert("Lỗi xóa: " + error.message);
    }
  };

  // --- 4. CURRICULUM HANDLERS (QUAN TRỌNG: FIX LỖI Ở ĐÂY) ---

  // Hàm lấy chi tiết khóa học để soạn giáo trình
  const handleOpenCurriculum = async (course) => {
    try {
      console.log("Opening curriculum for course:", course);

      // Fetch chi tiết khóa học từ server để lấy chapters đầy đủ
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_ENDPOINTS.COURSES}/${course.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Không thể lấy chi tiết khóa học");
      }

      const courseDetail = await response.json();
      console.log("Course detail from server:", courseDetail);
      console.log("Chapters from API:", courseDetail.chapters);

      // Use the course data from server response
      const chaptersFromApi = courseDetail.chapters || [];

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

      console.log("Formatted chapters:", formattedChapters);

      // Tạo chương mặc định nếu trống
      if (formattedChapters.length === 0) {
        console.log("No chapters found, creating default chapter");
        formattedChapters.push({
          id: Date.now(),
          title: "Chương 1: Khởi động",
          lessons: [],
        });
      }

      const fullCourseData = { ...courseDetail, chapters: formattedChapters };
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
        video_url: l.content,
        duration: l.duration,
        quiz_data: l.questions || [],
      })),
    }));

    // Giữ lại ảnh gốc từ API (có thể là 'image' hoặc 'thumbnail')
    const imageUrl = selectedCourse.image || selectedCourse.thumbnail;

    const payload = {
      title: selectedCourse.title,
      description: selectedCourse.description,
      image: imageUrl,
      level: selectedCourse.level || "Cơ bản",
      price: 0,
      chapters: chaptersPayload,
    };

    try {
      await saveCourse({
        url: `${API_ENDPOINTS.COURSES}/${selectedCourse.id}`,
        method: "PUT",
        data: payload,
      });
      alert("Đã lưu nội dung giáo trình thành công!");

      // Chờ refreshCourses hoàn thành rồi mới quay lại danh sách
      await refreshCourses();

      // Quay về danh sách
      setViewMode("list");
      setSelectedCourse(null);
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
    if (!newTitle.trim()) {
      alert("Tên chương không được để trống");
      return;
    }
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId ? { ...c, title: newTitle } : c
      ),
    }));
  };

  const toggleChapter = (chapterId) =>
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));

  const deleteChapter = (chapterId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chương này?")) return;
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((c) => c.id !== chapterId),
    }));
  };

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

    // Validate lesson data
    if (!lessonFormData.title.trim()) {
      alert("Vui lòng nhập tên bài học");
      return;
    }

    if (lessonFormData.type !== "quiz" && !lessonFormData.content.trim()) {
      alert("Vui lòng nhập URL nội dung hoặc upload video");
      return;
    }

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

  const deleteLesson = (chapterId, lessonId) => {
    if (
      !window.confirm(
        "Xóa bài học này? Hành động này không thể không phục!"
      )
    )
      return;

    // Cập nhật giao diện - xóa bài học khỏi chương
    setSelectedCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, lessons: c.lessons.filter((l) => l.id !== lessonId) }
          : c
      ),
    }));
  };

  // Quiz
  const resetTempQuestion = () =>
    setTempQuestion({ text: "", options: ["", "", "", ""], correctIndex: 0 });

  const handleAddQuestionToQuiz = () => {
    if (!tempQuestion.text.trim()) {
      alert("Vui lòng nhập câu hỏi");
      return;
    }

    // Validate at least one option
    const validOptions = tempQuestion.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert("Vui lòng nhập ít nhất 2 đáp án");
      return;
    }

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

    // Validate video file
    if (!file.type.startsWith("video/")) {
      alert("Vui lòng chọn file video");
      return;
    }

    try {
      setIsVideoUploading(true);
      setVideoUploadProgress(0);

      // Simulate progress từ 0% -> 99%
      const progressInterval = setInterval(() => {
        setVideoUploadProgress((prev) => {
          if (prev >= 99) return 99;
          return prev + Math.random() * 25;
        });
      }, 400);

      const result = await uploadVideo(file);
      clearInterval(progressInterval);

      if (result.success) {
        // Jump lên 100%
        setVideoUploadProgress(100);
        setLessonFormData((prev) => ({ ...prev, content: result.url }));
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
                Tạo các khoá học và soạn thảo giáo trình cho học viên
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
                    src={getFullUrl(course.image || course.thumbnail)}
                    alt={course.title}
                    onError={(e) =>
                    (e.target.src =
                      "https://placehold.co/600x400?text=No+Image")
                    }
                  />
                </div>
                <div className="cm-course-content">
                  <div className="cm-course-header">
                    <h3 className="cm-course-title">{course.title}</h3>
                    <div
                      className={`cm-course-badge ${course.type === "A" || course.level === "Cơ bản" ? "cm-badge-a" : "cm-badge-b"
                        }`}
                    >
                      {course.type === "A" || course.level === "Cơ bản" ? (
                        <BookOpen size={14} />
                      ) : (
                        <Award size={14} />
                      )}
                      <span>{course.type === "A" || course.level === "Cơ bản" ? "Hạng A" : "Hạng B"}</span>
                    </div>
                  </div>
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
                    <button
                      onClick={() => deleteChapter(chapter.id)}
                      className="cm-btn cm-btn-sm cm-btn-danger-ghost"
                      title="Xóa chương"
                    >
                      <Trash2 size={14} />
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
                    className={`cm-type-btn ${courseFormData.type === "A" ? "active" : ""
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
                    className={`cm-type-btn ${courseFormData.type === "B" ? "active" : ""
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
                    disabled={isThumbnailUploading}
                  >
                    📁 Chọn ảnh
                  </button>
                </div>
                {isThumbnailUploading && (
                  <div style={{ marginTop: "15px" }}>
                    <div style={{
                      fontSize: "12px",
                      marginBottom: "8px",
                      textAlign: "center",
                      color: "#0066cc",
                      fontWeight: "600"
                    }}>
                      Đang upload... {thumbnailUploadProgress}%
                    </div>
                    <div style={{
                      width: "100%",
                      height: "6px",
                      background: "#e2e8f0",
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${thumbnailUploadProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #0066cc, #0052a3)",
                        transition: "width 0.3s ease",
                        borderRadius: "3px"
                      }} />
                    </div>
                  </div>
                )}
                {courseFormData.thumbnail && !isThumbnailUploading && (
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
            className={`cm-modal ${lessonFormData.type === "quiz" ? "cm-modal-large" : ""
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
              {videoUploadProgress === 100 ? (
                <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                  <CheckCircle
                    size={64}
                    color="#24a148"
                    style={{ margin: "0 auto 20px" }}
                  />
                  <p style={{ fontSize: "18px", fontWeight: "600", color: "#24a148", margin: "0 0 20px 0" }}>
                    Upload thành công! 🎉
                  </p>
                  <p style={{ fontSize: "14px", color: "#666", margin: "0 0 20px 0" }}>
                    Video đã được tải lên thành công. Modal sẽ tự động đóng...
                  </p>
                </div>
              ) : (
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
                      <p style={{ margin: "10px 0", fontWeight: "600" }}>
                        Đang upload... {Math.round(videoUploadProgress)}%
                      </p>
                      <div style={{
                        width: "100%",
                        height: "6px",
                        background: "#e2e8f0",
                        borderRadius: "3px",
                        overflow: "hidden",
                        marginTop: "15px"
                      }}>
                        <div style={{
                          width: `${videoUploadProgress}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #0066cc, #0052a3)",
                          transition: "width 0.3s ease",
                          borderRadius: "3px"
                        }} />
                      </div>
                    </>
                  ) : (
                    <p>Chọn hoặc kéo video vào đây</p>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
