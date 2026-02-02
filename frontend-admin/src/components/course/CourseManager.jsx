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
import { notifySuccess, notifyError, notifyWarning } from "../../lib/notifications";
import MediaSelector from "../mediaSelector/MediaSelector";
import { uploadCourseImage, uploadCourseVideo, uploadDocument, listImages, listVideos, listDocuments } from "../../lib/cloudinaryService";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION, MEDIA_BASE_URL } from "../../constants/api";
import "./Coursemanager.css";

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
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0);

  // Library States
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [libraryDocuments, setLibraryDocuments] = useState([]);
  const [loadingImageLibrary, setLoadingImageLibrary] = useState(false);
  const [loadingVideoLibrary, setLoadingVideoLibrary] = useState(false);
  const [loadingDocumentLibrary, setLoadingDocumentLibrary] = useState(false);

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
    documentUrl: "",
    displayName: "",  // Tên file gốc
    youtubeUrl: "",
    maxAttempts: 0,   // 0 = không giới hạn số lần làm quiz
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

        xhr.open("POST", API_ENDPOINTS.CLOUDINARY + "/upload");
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
      if (!token) return notifyError("Phiên đăng nhập hết hạn");

      let thumbnailUrl = courseFormData.thumbnail;
      let courseDetail = null;

      // Nếu đang sửa, lấy thông tin khóa học cũ từ server để giữ ảnh và chapters đầy đủ
      if (courseFormData.id) {
        try {
          const token = localStorage.getItem("admin_token");
          const resp = await fetch(`${API_ENDPOINTS.COURSES}/${courseFormData.id}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (resp.ok) {
            courseDetail = await resp.json();
          } else {
            // fallback to local list if fetch fails
            courseDetail = courses.find((c) => c.id === courseFormData.id);
          }
        } catch (err) {
          console.warn("Could not fetch full course detail, falling back:", err);
          courseDetail = courses.find((c) => c.id === courseFormData.id);
        }
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

      const result = await saveCourse({
        url: url,
        method: method,
        data: payload,
      });

      if (result.success) {
        await refreshCourses();
        setIsCourseFormOpen(false);
        notifySuccess(courseFormData.id ? "Cập nhật khóa học thành công!" : "Thêm khóa học thành công!");
      } else {
        notifyError(result.error || "Lỗi lưu khóa học");
      }
    } catch (error) {
      console.error("Error saving course:", error);
      notifyError("Lỗi: " + error.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khóa học này?")) return;
    const result = await saveCourse({
      url: `${API_ENDPOINTS.COURSES}/${id}`,
      method: "DELETE",
    });
    if (result.success) {
      await refreshCourses();
      notifySuccess("Xóa khóa học thành công!");
    } else {
      notifyError(result.error || "Lỗi xóa khóa học");
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
          documentUrl: l.type === 'document' ? l.video_url : '',
          displayName: l.display_name || '',  // Tên file gốc
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
      notifyError("Lỗi: " + error.message);
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
        // Map content dựa trên loại bài học
        content: l.type === 'document' ? (l.documentUrl || l.content || l.video_url || '') : (l.content || l.video_url || ''),
        video_url: l.type === 'document' ? (l.documentUrl || l.content || l.video_url || '') : (l.content || l.video_url || ''),
        // Lưu tên file gốc (display_name)
        display_name: l.displayName || l.display_name || null,
        duration: l.duration,
        quiz_data: l.questions || [],
        pass_score: l.passScore || 0,
        max_attempts: l.maxAttempts || 0,
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
      const result = await saveCourse({
        url: `${API_ENDPOINTS.COURSES}/${selectedCourse.id}`,
        method: "PUT",
        data: payload,
      });

      if (result.success) {
        notifySuccess("Đã lưu nội dung giáo trình thành công!");
        await refreshCourses();
        setViewMode("list");
        setSelectedCourse(null);
      } else {
        notifyError(result.error || "Lỗi lưu giáo trình");
      }
    } catch (error) {
      console.error("Error saving curriculum:", error);
      notifyError("Lỗi: " + error.message);
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
    notifySuccess("Chương mới được thêm!");
  };

  const updateChapterTitle = (chapterId, newTitle) => {
    if (!newTitle.trim()) {
      notifyWarning("Tên chương không được để trống");
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
    notifySuccess("Chương đã bị xóa!");
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
      documentUrl: "",
      displayName: "",
      youtubeUrl: "",
      maxAttempts: 0,
    });
    resetTempQuestion();
    setIsLessonModalOpen(true);
  };

  const editLesson = (chapterId, lesson) => {
    setActiveChapterIdForLesson(chapterId);
    setLessonFormData({
      ...lesson,
      documentUrl: lesson.documentUrl || (lesson.type === 'document' ? lesson.content : ''),
      displayName: lesson.displayName || lesson.display_name || '',
      questions: lesson.questions || [],
      passScore: lesson.passScore || 0,
      maxAttempts: lesson.maxAttempts || lesson.max_attempts || 0,
    });
    resetTempQuestion();
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = (e) => {
    e.preventDefault();

    // Validate lesson data
    if (!lessonFormData.title.trim()) {
      notifyWarning("Vui lòng nhập tên bài học");
      return;
    }

    // Kiểm tra nội dung dựa trên loại bài học
    if (lessonFormData.type === "video" && !lessonFormData.content.trim()) {
      notifyWarning("Vui lòng nhập URL hoặc upload video");
      return;
    }

    if (lessonFormData.type === "document" && !lessonFormData.documentUrl.trim()) {
      notifyWarning("Vui lòng upload tài liệu");
      return;
    }

    if (lessonFormData.type === "quiz" && lessonFormData.questions.length === 0) {
      notifyWarning("Vui lòng thêm ít nhất một câu hỏi cho quiz");
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
    notifySuccess(lessonFormData.id ? "Cập nhật bài học thành công!" : "Thêm bài học thành công!");
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
    notifySuccess("Bài học đã bị xóa!");
  };

  // Quiz
  const resetTempQuestion = () =>
    setTempQuestion({ text: "", options: ["", "", "", ""], correctIndex: 0 });

  const handleAddQuestionToQuiz = () => {
    if (!tempQuestion.text.trim()) {
      notifyWarning("Vui lòng nhập câu hỏi");
      return;
    }

    // Validate at least one option
    const validOptions = tempQuestion.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      notifyWarning("Vui lòng nhập ít nhất 2 đáp án");
      return;
    }

    setLessonFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...tempQuestion, id: Date.now() }],
    }));
    notifySuccess("Câu hỏi được thêm!");
    resetTempQuestion();
  };

  const handleDeleteQuizQuestion = (indexToRemove) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    const updatedQuestions = lessonFormData.questions.filter(
      (_, index) => index !== indexToRemove
    );
    setLessonFormData((prev) => ({ ...prev, questions: updatedQuestions }));
    notifySuccess("Câu hỏi đã bị xóa!");
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
      notifyWarning("Vui lòng chọn file video");
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
        notifySuccess("Upload video thành công!");
        setTimeout(() => {
          setIsVideoUploadingOpen(false);
          setVideoUploadProgress(0);
          setIsVideoUploading(false);
        }, 500);
      } else {
        throw new Error(result.error || "Upload thất bại");
      }
    } catch (error) {
      notifyError("Lỗi upload video: " + error.message);
      setVideoUploadProgress(0);
      setIsVideoUploading(false);
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsDocumentUploading(true);
      setDocumentUploadProgress(0);

      // Lưu tên file gốc (bao gồm extension)
      const originalFileName = file.name;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setDocumentUploadProgress((prev) => {
          if (prev >= 99) return 99;
          return prev + Math.random() * 25;
        });
      }, 400);

      const result = await uploadDocument(file);
      clearInterval(progressInterval);

      if (result.success) {
        setDocumentUploadProgress(100);
        // Lưu cả URL và tên file gốc (display_name)
        setLessonFormData((prev) => ({
          ...prev,
          documentUrl: result.url,
          displayName: originalFileName  // Tên file gốc với extension
        }));
        notifySuccess("Upload tài liệu thành công!");
        setTimeout(() => {
          setDocumentUploadProgress(0);
          setIsDocumentUploading(false);
        }, 500);
      } else {
        throw new Error(result.error || "Upload thất bại");
      }
    } catch (error) {
      notifyError("Lỗi upload tài liệu: " + error.message);
      setDocumentUploadProgress(0);
      setIsDocumentUploading(false);
    }
  };

  // === LIBRARY FUNCTIONS ===
  const handleShowImageLibrary = useCallback(async () => {
    setShowImageLibrary(true);
    setLoadingImageLibrary(true);
    
    try {
      const result = await listImages("uav-training/courses/thumbnails");
      if (result.success) {
        setLibraryImages(result.images || []);
      } else {
        notifyError("Không thể tải thư viện hình ảnh");
      }
    } catch (error) {
      console.error("Load image library error:", error);
      notifyError("Lỗi tải thư viện hình ảnh");
    } finally {
      setLoadingImageLibrary(false);
    }
  }, []);

  const handleSelectFromImageLibrary = useCallback(async (image) => {
    if (mediaTarget === "thumbnail") {
      setCourseFormData({ ...courseFormData, thumbnail: image.url });
      setShowImageLibrary(false);
      notifySuccess("Đã chọn hình ảnh từ thư viện!");
    }
    setMediaTarget(null);
  }, [courseFormData, mediaTarget]);

  const handleShowVideoLibrary = useCallback(async () => {
    setShowVideoLibrary(true);
    setLoadingVideoLibrary(true);
    
    try {
      const result = await listVideos("uav-training/courses/videos");
      if (result.success) {
        setLibraryVideos(result.images || []);
      } else {
        notifyError("Không thể tải thư viện video");
      }
    } catch (error) {
      console.error("Load video library error:", error);
      notifyError("Lỗi tải thư viện video");
    } finally {
      setLoadingVideoLibrary(false);
    }
  }, []);

  const handleSelectFromVideoLibrary = useCallback(async (video) => {
    if (mediaTarget === "lesson-video") {
      setLessonFormData({ ...lessonFormData, content: video.url });
      setShowVideoLibrary(false);
      notifySuccess("Đã chọn video từ thư viện!");
    }
    setMediaTarget(null);
  }, [lessonFormData, mediaTarget]);

  const handleShowDocumentLibrary = useCallback(async () => {
    setShowDocumentLibrary(true);
    setLoadingDocumentLibrary(true);
    
    try {
      const result = await listDocuments("uav-training/documents");
      if (result.success) {
        setLibraryDocuments(result.images || []);
      } else {
        notifyError("Không thể tải thư viện tài liệu");
      }
    } catch (error) {
      console.error("Load document library error:", error);
      notifyError("Lỗi tải thư viện tài liệu");
    } finally {
      setLoadingDocumentLibrary(false);
    }
  }, []);

  const handleSelectFromDocumentLibrary = useCallback(async (document) => {
    setLessonFormData({ 
      ...lessonFormData, 
      documentUrl: document.url,
      displayName: document.displayName || document.public_id || document.url.split('/').pop()
    });
    setShowDocumentLibrary(false);
    notifySuccess("Đã chọn tài liệu từ thư viện!");
  }, [lessonFormData]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyError('Vui lòng chọn file hình ảnh (JPG/PNG/GIF)');
      return;
    }

    try {
      setIsThumbnailUploading(true);
      const res = await uploadCourseImage(file);
      if (!res.success) {
        notifyError(res.error || 'Upload ảnh thất bại');
        return;
      }

      setCourseFormData((p) => ({ ...p, thumbnail: res.url }));
      notifySuccess('Tải ảnh khóa học lên Cloudinary thành công');
    } catch (err) {
      console.error('Image upload error:', err);
      notifyError(err.message || 'Lỗi khi upload ảnh');
    } finally {
      setIsThumbnailUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }, []);

  const handleLessonVideoUpload = useCallback(async (e, videoType = 'lesson') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      notifyError('Vui lòng chọn file video (MP4/AVI/MOV)');
      return;
    }

    try {
      setIsVideoUploading(true);
      const res = await uploadCourseVideo(file);
      if (!res.success) {
        notifyError(res.error || 'Upload video thất bại');
        return;
      }

      setLessonFormData((p) => ({ ...p, content: res.url }));
      notifySuccess('Tải video khóa học lên Cloudinary thành công');
    } catch (err) {
      console.error('Video upload error:', err);
      notifyError(err.message || 'Lỗi khi upload video');
    } finally {
      setIsVideoUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }, []);

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^\s&]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Handle YouTube URL input
  const handleYouTubeUrlChange = (url) => {
    setLessonFormData((prev) => ({ ...prev, youtubeUrl: url }));

    const videoId = extractYouTubeId(url);
    if (videoId && url.trim()) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      setLessonFormData((prev) => ({ ...prev, content: embedUrl }));
      notifySuccess("Liên kết YouTube được nhận diện!");
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
                    alt={`Khóa học: ${course.title}`}
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
                              {lesson.type === 'quiz' ? `${lesson.type} • ${lesson.duration}p` : lesson.type}
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
                <div style={{ textAlign: "center" }}>
                  {!courseFormData.thumbnail ? (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "12px" }}>
                        Chưa có hình ảnh bìa
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <label className="cm-btn cm-btn-primary" style={{ cursor: 'pointer', marginRight: '0' }}>
                          Upload từ máy tính
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            disabled={isThumbnailUploading}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTarget('thumbnail');
                            handleShowImageLibrary();
                          }}
                          className="cm-btn cm-btn-secondary"
                          disabled={loadingImageLibrary}
                        >
                          Chọn từ thư viện
                        </button>
                        <button
                          type="button"
                          onClick={() => openMediaSelector('thumbnail')}
                          className="cm-btn cm-btn-secondary"
                        >
                          Chọn từ Media
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={courseFormData.thumbnail}
                        alt="Xem trước hình ảnh khóa học"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "250px",
                          borderRadius: "6px",
                          marginBottom: "12px",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => document.querySelector('input[type="file"][accept="image/*"]')?.click()}
                          className="cm-btn"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "#007bff"}
                          disabled={isThumbnailUploading}
                        >
                          {isThumbnailUploading ? 'Đang upload...' : 'Thay đổi hình ảnh'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTarget('thumbnail');
                            handleShowImageLibrary();
                          }}
                          className="cm-btn cm-btn-secondary"
                          disabled={loadingImageLibrary}
                        >
                          Chọn từ thư viện
                        </button>
                        <button
                          type="button"
                          onClick={() => openMediaSelector('thumbnail')}
                          className="cm-btn cm-btn-secondary"
                        >
                          Chọn từ Media
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseFormData({ ...courseFormData, thumbnail: '' })}
                          className="cm-btn cm-btn-danger"
                        >
                          Xóa hình ảnh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                  {/* VIDEO CONTENT */}
                  {lessonFormData.type === "video" && (
                    <>
                      <div className="cm-form-group">
                        <label className="cm-form-label">Video từ YouTube</label>
                        <input
                          className="cm-form-input"
                          value={lessonFormData.youtubeUrl}
                          onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... hoặc youtu.be/..."
                        />
                        <small style={{ color: "#666", marginTop: "5px", display: "block" }}>
                          Nhập liên kết YouTube, hệ thống sẽ tự động nhận diện
                        </small>
                      </div>

                      <div className="cm-form-group">
                        <label className="cm-form-label">Hoặc Upload Video</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <input
                            className="cm-form-input"
                            value={lessonFormData.content}
                            onChange={(e) =>
                              setLessonFormData({
                                ...lessonFormData,
                                content: e.target.value,
                              })
                            }
                            placeholder="URL video hoặc YouTube embed URL..."
                            style={{ flex: 1 }}
                          />
                          {isVideoUploading && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label className="cm-btn cm-btn-primary cm-btn-sm" style={{ cursor: 'pointer', marginRight: '0' }}>
                            Upload
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleLessonVideoUpload}
                              style={{ display: 'none' }}
                              disabled={isVideoUploading}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaTarget('lesson-video');
                              handleShowVideoLibrary();
                            }}
                            className="cm-btn cm-btn-secondary cm-btn-sm"
                            disabled={loadingVideoLibrary}
                          >
                            Chọn từ thư viện
                          </button>
                          <button
                            type="button"
                            onClick={() => openMediaSelector('lesson-content')}
                            className="cm-btn cm-btn-secondary cm-btn-sm"
                          >
                            Chọn từ Media
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* DOCUMENT CONTENT */}
                  {lessonFormData.type === "document" && (
                    <div className="cm-form-group">
                      <label className="cm-form-label">Upload file</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {isDocumentUploading && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                        {lessonFormData.documentUrl && <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Đã upload</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => document.getElementById('documentInput')?.click()}
                          className="cm-btn cm-btn-primary cm-btn-sm"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={isDocumentUploading}
                        >
                          Upload từ máy tính
                        </button>
                        <button
                          type="button"
                          onClick={handleShowDocumentLibrary}
                          className="cm-btn cm-btn-secondary cm-btn-sm"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Chọn từ thư viện
                        </button>
                      </div>
                      {lessonFormData.documentUrl && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                          File: {lessonFormData.displayName || lessonFormData.documentUrl.split('/').pop()}
                        </div>
                      )}
                      <input
                        id="documentInput"
                        type="file"
                        onChange={handleDocumentUpload}
                        disabled={isDocumentUploading}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="cm-quiz-builder">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                        placeholder="VD: 30"
                      />
                    </div>
                    <div className="cm-form-group">
                      <label className="cm-form-label">
                        Giới hạn số lần làm
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="cm-form-input"
                        value={lessonFormData.maxAttempts === 0 ? "" : lessonFormData.maxAttempts}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLessonFormData({
                            ...lessonFormData,
                            maxAttempts: v === "" ? 0 : parseInt(v, 10) || 0,
                          });
                        }}
                        placeholder="0 = Không giới hạn"
                      />
                      <small style={{ color: '#666', fontSize: '11px' }}>0 = Không giới hạn số lần</small>
                    </div>
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

      {/* IMAGE LIBRARY MODAL */}
      {showImageLibrary && (
        <div className='cm-modal-overlay' onClick={() => setShowImageLibrary(false)}>
          <div className='cm-modal cm-modal-large' onClick={(e) => e.stopPropagation()}>
            <div className='cm-modal-header'>
              <h3>Chọn hình ảnh từ thư viện</h3>
              <button
                type='button'
                onClick={() => setShowImageLibrary(false)}
                className='cm-modal-close'
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  width: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e6eb';
                  e.target.style.color = '#495057';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            <div className='cm-modal-body'>
              {loadingImageLibrary ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Đang tải hình ảnh...</div>
                </div>
              ) : libraryImages.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', textAlign: 'center' }}>
                    Chưa có hình ảnh nào trong thư viện
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '16px'
                }}>
                  {libraryImages.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectFromImageLibrary(image)}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: 'white',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.public_id || `Image ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          marginBottom: '8px'
                        }}
                      />
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#495057',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {image.public_id}
                      </p>
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 123, 255, 0.8)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}>
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIDEO LIBRARY MODAL */}
      {showVideoLibrary && (
        <div className='cm-modal-overlay' onClick={() => setShowVideoLibrary(false)}>
          <div className='cm-modal cm-modal-large' onClick={(e) => e.stopPropagation()}>
            <div className='cm-modal-header'>
              <h3>Chọn video từ thư viện</h3>
              <button
                type='button'
                onClick={() => setShowVideoLibrary(false)}
                className='cm-modal-close'
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  width: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e6eb';
                  e.target.style.color = '#495057';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            <div className='cm-modal-body'>
              {loadingVideoLibrary ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Đang tải video...</div>
                </div>
              ) : libraryVideos.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', textAlign: 'center' }}>
                    Không có video nào trong thư viện
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '16px'
                }}>
                  {libraryVideos.map((video, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectFromVideoLibrary(video)}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: 'white',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <video
                        src={video.url}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          backgroundColor: '#000'
                        }}
                        muted
                        preload='metadata'
                      />
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#495057',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {video.public_id || `Video ${index + 1}`}
                      </p>
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 123, 255, 0.8)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}>
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT LIBRARY MODAL */}
      {showDocumentLibrary && (
        <div className='cm-modal-overlay' onClick={() => setShowDocumentLibrary(false)}>
          <div className='cm-modal cm-modal-large' onClick={(e) => e.stopPropagation()}>
            <div className='cm-modal-header'>
              <h3>Chọn tài liệu từ thư viện</h3>
              <button
                type='button'
                onClick={() => setShowDocumentLibrary(false)}
                className='cm-modal-close'
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  width: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e6eb';
                  e.target.style.color = '#495057';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            <div className='cm-modal-body'>
              {loadingDocumentLibrary ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Đang tải tài liệu...</div>
                </div>
              ) : libraryDocuments.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', textAlign: 'center' }}>
                    Không có tài liệu nào trong thư viện
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '16px'
                }}>
                  {libraryDocuments.map((document, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectFromDocumentLibrary(document)}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: 'white',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        fontSize: '40px',
                        marginBottom: '8px'
                      }}>📄</div>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#495057',
                        wordBreak: 'break-word',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {document.displayName || document.public_id || `Document ${index + 1}`}
                      </p>
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 123, 255, 0.8)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}>
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
