"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../components/3d/Experience"; // Đảm bảo đường dẫn đúng
import { useNavigate, Link } from "react-router-dom";
import { useActivate } from "react-activation";
import { apiClient } from "../lib/apiInterceptor";
import "./UAVLandingPage.css";

// =====================================================================
// LOADING SCREEN COMPONENT
// =====================================================================
const LoadingScreen = () => (
  <div className="loading-screen-overlay">
    <div className="loading-screen-content">
      {/* Animated spinner */}
      <div className="loading-spinner"></div>
      
      <div className="loading-text-container">
        <h2 className="loading-title">Đang tải dữ liệu</h2>
        <p className="loading-subtitle">Vui lòng chờ...</p>
      </div>

      {/* Dot animation */}
      <div className="loading-dots">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="loading-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// =====================================================================
// 0. WEBGL SUPPORT CHECK
// =====================================================================
const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
};

// Fallback component khi WebGL không khả dụng
const WebGLFallback = () => (
  <div className="webgl-fallback-container">
    <div className="webgl-fallback-icon">🏢</div>
    <h3 className="webgl-fallback-title">Mô hình 3D không khả dụng</h3>
    <p className="webgl-fallback-desc">
      Trình duyệt của bạn không hỗ trợ WebGL hoặc GPU đang bận.
      Vui lòng thử refresh trang hoặc sử dụng trình duyệt khác (Chrome, Firefox, Edge).
    </p>
  </div>
);

// =====================================================================
// 1. COMPONENT PANORAMA VIEWER (FINAL FIX: LOADING LOGIC)
// =====================================================================
const PanoramaViewer = ({ panoramaUrl }) => {
  const viewerContainerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!viewerContainerRef.current) return;

    // 1. Dọn dẹp viewer cũ ngay lập tức
    if (viewerInstanceRef.current) {
      try {
        viewerInstanceRef.current.destroy();
      } catch (e) { }
      viewerInstanceRef.current = null;
    }

    // Luôn bật loading khi URL thay đổi
    setIsLoading(true);

    // 2. Dùng setTimeout để trì hoãn việc khởi tạo (tránh lag khi slide panel)
    const timer = setTimeout(() => {
      if (!window.pannellum || !viewerContainerRef.current) return;

      try {
        viewerInstanceRef.current = window.pannellum.viewer(
          viewerContainerRef.current,
          {
            type: "equirectangular",
            panorama: panoramaUrl,
            autoLoad: true, // Tự động tải ảnh
            showControls: true,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            mouseZoom: true,
            draggable: true,
            friction: 0.15,
            hfov: 110,
            pitch: 0,
            yaw: 0,
            backgroundColor: [0.1, 0.1, 0.1], // Màu nền tối
            strings: {
              loadingLabel: "", // Ẩn loading mặc định của thư viện (hộp đen)
              errorMsg: "Không thể tải ảnh.",
            },
          }
        );

        // --- QUAN TRỌNG: Lắng nghe sự kiện 'load' ---
        // Chỉ tắt loading spinner KHI ẢNH ĐÃ TẢI XONG
        viewerInstanceRef.current.on('load', () => {
          setIsLoading(false);
        });

        // Phòng trường hợp lỗi tải ảnh thì cũng tắt loading
        viewerInstanceRef.current.on('error', () => {
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Lỗi khởi tạo Pannellum:", error);
        setIsLoading(false);
      }
    }, 500); // 500ms delay cho hiệu ứng trượt panel

    return () => {
      clearTimeout(timer);
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch (e) { }
      }
    };
  }, [panoramaUrl]);

  return (
    <div
      ref={viewerContainerRef}
      className="panorama-viewer-container"
    >
      {/* Chỉ hiển thị Loading khi state isLoading = true */}
      {isLoading && (
        <div className="panorama-loading-overlay">
          <div className="pano-spinner"></div>
          <span className="panorama-loading-text">
            Đang tải không gian 360°...
          </span>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 2. ICON STAR
// =====================================================================
const StarIcon = () => (
  <svg
    className="star-icon-svg"
    viewBox="0 0 24 24"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

// =====================================================================
// 3. MAIN COMPONENT (UAV LANDING PAGE)
// =====================================================================
function UAVLandingPage() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // State
  const [points, setPoints] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseRatings, setCourseRatings] = useState({});
  const [modelUrl, setModelUrl] = useState(null);
  const [cameraSettings, setCameraSettings] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedPointData, setSelectedPointData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCertTab, setActiveCertTab] = useState("map");
  const [webglSupported, setWebglSupported] = useState(true); // WebGL support state
  const [monthlyExams, setMonthlyExams] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage on mount
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Kiểm tra WebGL support khi component mount
  useEffect(() => {
    setWebglSupported(checkWebGLSupport());
  }, []);

  useActivate(() => {
    window.dispatchEvent(new Event("resize"));
  });

  const certTabsData = {
    map: ["Nghiệp vụ Khảo Sát Bản Đồ Số Hoá Dân Dụng & Công Nghiệp"],
    check: ["Nghiệp vụ Khảo Sát - Kiểm Tra Thiết bị", "Hạ tầng Dân Dụng & Công Nghiệp"],
    agro: ["Nghiệp vụ Khảo Sát Nông - Lâm - Ngư Nghiệp", "Dịch Vụ Nông Nghiệp Công Nghệ Cao"],
    art: ["Trình diễn nghệ thuật UAV", "Biểu Diễn Mô Hình R/C", "Tổ hợp sáng tạo nội dung số UAV"],
  };

  // Dynamic Hạng B groups (fetched from backend). Each group: { label, items }
  const [hangBGroups, setHangBGroups] = useState({});
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [modalGroup, setModalGroup] = useState(null);

  // tab keys come from API-driven groups (no static fallback)
  const tabKeys = Object.keys(hangBGroups);

useEffect(() => {
    let mounted = true;
    apiClient.get('/nghiep-vu-hang-b')
      .then((res) => {
        let data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        
        // --- THÊM MỚI: Sắp xếp dữ liệu theo sort_order tăng dần ---
        // Việc này đảm bảo cả Item và Thứ tự Nhóm (Category) đều đúng theo Admin
        data = data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const grouped = {};

        const defaultLabelFor = (key) => {
          if (key === 'map') return 'Khảo sát bản đồ';
          if (key === 'check') return 'Kiểm tra công nghiệp';
          if (key === 'agro') return 'Nông Lâm Vận Tải';
          if (key === 'art') return 'Trình diễn nghệ thuật';
          return key;
        };

        data.forEach((item) => {
          const rawCat = (item.category || '').toLowerCase();
          let key = 'other';
          
          // Logic xác định key nhóm (giữ nguyên logic cũ của bạn)
          if (rawCat.includes('map') || rawCat.includes('khảo')) key = 'map';
          else if (rawCat.includes('check') || rawCat.includes('kiểm')) key = 'check';
          else if (rawCat.includes('agro') || rawCat.includes('nông') || rawCat.includes('lâm')) key = 'agro';
          else if (rawCat.includes('art') || rawCat.includes('trình') || rawCat.includes('biểu')) key = 'art';
          else key = item.category; // Fallback lấy luôn tên category nếu không khớp keyword

          // Nếu nhóm chưa tồn tại, tạo mới.
          // Do data đã sort, nhóm nào có item xuất hiện trước sẽ được tạo trước -> Tab sẽ đúng thứ tự.
          if (!grouped[key]) grouped[key] = { label: item.category || defaultLabelFor(key), items: [] };
          
          grouped[key].items.push(item);
        });

        if (mounted) setHangBGroups(grouped);
      })
      .catch((err) => console.error('Lỗi fetch nghiep vu hang B:', err));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsDataLoading(true);
        
        // Fetch all data in parallel
        const [pointsRes, solutionsRes, notificationsRes, coursesRes, modelRes, cameraRes] = await Promise.allSettled([
          apiClient.get("/points"),
          apiClient.get("/solutions"),
          apiClient.get("/display/notifications"),
          apiClient.get("/courses"),
          apiClient.get("/settings/current_model_url"),
          apiClient.get("/settings/default_camera_view")
        ]);

        // Handle points
        if (pointsRes.status === 'fulfilled') {
          setPoints(pointsRes.value.data);
        }

        // Handle solutions
        if (solutionsRes.status === 'fulfilled') {
          setSolutions(solutionsRes.value.data);
        }

        // Handle notifications
        if (notificationsRes.status === 'fulfilled') {
          setNotifications(Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : notificationsRes.value.data.data || []);
        }

        // Handle courses and ratings
        if (coursesRes.status === 'fulfilled') {
          const courses = coursesRes.value.data;
          setCourses(courses);

          // Fetch ratings cho từng course
          const ratings = {};
          courses.forEach((course) => {
            apiClient.get(`/comments/course/${course.id}`)
              .then((commentsRes) => {
                const ratedComments = (commentsRes.data.comments || []).filter(c => c.rating);
                if (ratedComments.length > 0) {
                  const avg = (ratedComments.reduce((sum, c) => sum + c.rating, 0) / ratedComments.length).toFixed(1);
                  ratings[course.id] = { average: avg, count: ratedComments.length };
                  setCourseRatings(prev => ({ ...prev, [course.id]: { average: avg, count: ratedComments.length } }));
                }
              })
              .catch((err) => console.error(`Lỗi fetch comments cho course ${course.id}:`, err));
          });
        }

        // Handle model URL
        if (modelRes.status === 'fulfilled') {
          setModelUrl(modelRes.value.data.value || "/models/scene.glb");
        } else {
          setModelUrl("/models/scene.glb");
        }

        // Handle camera settings
        if (cameraRes.status === 'fulfilled') {
          if (cameraRes.value.data.value) {
            try {
              setCameraSettings(JSON.parse(cameraRes.value.data.value));
            } catch (e) {
              console.error("Lỗi parse camera settings:", e);
            }
          }
        }

        setIsDataLoading(false);
      } catch (error) {
        console.error("Lỗi khi fetch dữ liệu:", error);
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Fetch all upcoming exams for banner
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based

    // Fetch exams for the current month (include past dates in month)
    const endpoint = `/exams/month?year=${year}&month=${month}`;

    apiClient.get(endpoint)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setMonthlyExams(data);
      })
      .catch((err) => console.error("❌ [LandingPage] Lỗi fetch exams:", err));
  }, [user]);

  // Lắng nghe thay đổi user
  useEffect(() => {
    const handleUserChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      setUser(updatedUser);
    };

    // Don't call handleUserChange here - user already initialized from localStorage

    window.addEventListener("storage", handleUserChange);
    window.addEventListener("userLoggedIn", handleUserChange);

    return () => {
      window.removeEventListener("storage", handleUserChange);
      window.removeEventListener("userLoggedIn", handleUserChange);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isFullscreen]);

  const handlePointClick = (pointId) => {
    const data = points.find((p) => p.id === pointId);
    if (data) {
      setSelectedPointData(data);
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => setIsPanelOpen(false);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const handleCourseClick = (id) => {
    navigate(`/khoa-hoc/${id}`);
    window.scrollTo(0, 0);
  };

  const shouldShowSchedule = (point) => {
    if (!point.schedule || Object.keys(point.schedule).length === 0) return false;
    const status = point.enableSchedule;
    if (status === false || status === 0 || status === "false") return false;
    return true;
  };

  const newestCourses = [...courses]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  const renderCourseCard = (course) => {
    const rating = courseRatings[course.id]?.average ? parseFloat(courseRatings[course.id].average) : (course.rating || 5.0);

    // --- LOGIC MỚI: Xác định loại Badge (Hạng A / Hạng B) ---
    const getBadgeInfo = (text) => {
      if (!text) return null;
      const t = text.toLowerCase();

      // Nếu là 'a' hoặc 'cơ bản' -> Style Hạng A (Màu xanh/vàng)
      if (t.includes('a') || t.includes('cơ bản')) {
        return { label: 'HẠNG A', className: 'badge-a' };
      }
      // Nếu là 'b' hoặc 'nâng cao' -> Style Hạng B (Màu xanh lá)
      if (t.includes('b') || t.includes('nâng cao')) {
        return { label: 'HẠNG B', className: 'badge-b' };
      }
      // Mặc định dùng style A
      return { label: text, className: 'badge-a' };
    };

    // Lấy thông tin badge từ dữ liệu (kiểm tra cả 'level' và 'badge' phòng trường hợp API trả về khác nhau)
    const badgeInfo = getBadgeInfo(course.level || course.badge);

    return (
      <div key={course.id} className="course-card" onClick={() => handleCourseClick(course.id)}>
        <div className="course-image-wrapper">
          <img
            src={course.image}
            alt={course.title}
            onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x200"; }}
          />
          {/* Đã XÓA badge cũ ở đây để không hiện đè lên ảnh */}
        </div>

        <div className="course-content">
          {/* --- CẤU TRÚC MỚI: Flexbox cho Tiêu đề và Badge --- */}
          <div className="course-title-row">
            <h3 className="course-title">{course.title}</h3>
            {badgeInfo && (
              <span className={`uav-cert-badge course-inline-badge ${badgeInfo.className}`}>
                {badgeInfo.label}
              </span>
            )}
          </div>

          <div className="course-rating">
            <div className="stars" style={{ display: "flex" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-icon-svg" viewBox="0 0 24 24">
                  <path
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    fill={i < Math.round(rating) ? '#FFC107' : '#ddd'}
                  />
                </svg>
              ))}
            </div>
            <span className="rating-text">
              {courseRatings[course.id]
                ? `${courseRatings[course.id].average} (${course.totalViews || 0} lượt xem)`
                : `${course.rating || '5.0'} (${course.totalViews || 0} lượt xem)`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Format exam date to Vietnam timezone: DD-MM-YYYY HH:mm:ss
  const formatExamDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).replace(/,/g, "");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <>
      {/* Show loading screen while fetching data */}
      {isDataLoading && <LoadingScreen />}

      {/* 1. Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-logo">
            <img src="/images/logo_white_on_trans.png" alt="Logo" onError={(e) => (e.target.style.display = "none")} />
          </div>
          <h1>Hệ thống Đào tạo và Cấp Chứng chỉ<br />Điều khiển UAV Theo Tiêu Chuẩn<br />Quy Định Pháp Luật Việt Nam</h1>
          <p>Theo Nghị định Số 288/2025/NĐ-CP Quy Định về Quản lý Tàu Bay Không Người Lái</p>
          <Link to="/dang-ky" className="btn btn-register1">
            Đăng ký học tập
          </Link>

        </div>
      </section>

      {/* 2. Intro */}
      <section className="intro-section">
        <div className="container">
          {monthlyExams && monthlyExams.length > 0 && (() => {
            const now = new Date();
            const bannerMonth = now.getMonth() + 1;
            const bannerYear = now.getFullYear();
            const renderDayMonth = (dateStr) => {
              try {
                const d = new Date(dateStr);
                const day = d.getDate();
                const month = d.getMonth() + 1;
                return { day, month };
              } catch (e) {
                return { day: '', month: '' };
              }
            };

            return (
              <div className="exam-banner">
                <h3 className="exam-banner-title">Kỳ Thi Tháng {bannerMonth} Năm {bannerYear}</h3>

                <div className="exam-marquee-wrapper">
                  <marquee behavior="scroll" direction="left" scrollamount="10" className="exam-marquee-content">
                    <div className="exam-list-flex">
                      {monthlyExams.map((ex) => {
                        const { day, month } = renderDayMonth(ex.exam_date || ex.date || null);
                        const timeText = ex.exam_time || (ex.exam_date && new Date(ex.exam_date).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })) || '';
                        return (
                          <div key={ex.id} className="exam-card">
                            <div className="exam-date-box">
                              <div className="exam-date-inner">
                                <div className="exam-day">{day || '-'}</div>
                                <div className="exam-month">THÁNG {month || '-'}</div>
                              </div>
                            </div>

                            <div className="exam-info">
                              <div className="exam-title">{ex.title || ex.type || 'Kỳ Thi'}</div>
                              <div className="exam-location">{ex.location || ex.address || ''}</div>
                              <div className="exam-time">Giờ: {timeText}</div>
                              <div className={`exam-spots ${ex.spots_left > 0 ? 'exam-spots-available' : 'exam-spots-full'}`}>
                                {ex.spots_left > 0 ? `Còn ${ex.spots_left} chỗ` : 'Hết chỗ'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </marquee>
                </div>
              </div>
            );
          })()}
          <h2 className="intro-title">Giới thiệu</h2>
          <div className="intro-content">
            <p className="intro-description">Hệ thống đào tạo và Cấp Chứng Chỉ Điều Khiển UAV Theo Tiêu Chuẩn Quy Định Pháp Luật Việt Nam <br/> 
            <strong>được xây dựng nhằm đảm bảo an toàn không phân, nâng cao ý thức người sử dụng và tuân thủ các quy định pháp luật <br/>
             về hoạt động bay không người lái tại Việt Nam.</strong></p>
            <p className="intro-description">Sở hữu chứng chỉ hợp pháp giúp bạn tránh các khoản phạt hành chính, được phép bay tại các khu vực cho phép <br/>
            và mở ra cơ hội nghề nghiệp trong lĩnh vực công nghệ bay không người lái đang phát triển mạnh mẽ.</p>
          </div>
          <div className="intro-stats">
            <div className="intro-stat-item"><div className="intro-stat-number">XXX+</div><div className="intro-stat-label">Học viên</div></div>
            <div className="intro-stat-item"><div className="intro-stat-number">100%</div><div className="intro-stat-label">Công nhận</div></div>
            <div className="intro-stat-item"><div className="intro-stat-number">24/7</div><div className="intro-stat-label">Hỗ trợ</div></div>
          </div>
        </div>
      </section>

      {/* 3. Steps */}
      <section className="section section-white steps-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title" style={{ fontWeight: "800", marginBottom: "50px" }}>Các bước thực hiện</h2>
          
          {/* Row 1: Steps 1-4 (left to right) */}
          <div className="steps-row steps-row1">
            {/* Step 1 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/1.png" alt="Step 1" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Đăng ký tài khoản</div>
              <div className="step-desc">Tạo tài khoản với thông tin cá nhân và xác thực qua CCCD/CMND</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 1→2 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 2 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/2.png" alt="Step 2" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Đăng nhập hệ thống</div>
              <div className="step-desc">Đăng nhập tài khoản và xác nhận thông tin cá nhân</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 2→3 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 3 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/3.png" alt="Step 3" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Đăng ký khóa học</div>
              <div className="step-desc">Chọn khóa học phù hợp (Hạng A hoặc Hạng B)</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 3→4 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 4 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/4.png" alt="Step 4" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Thanh toán học phí</div>
              <div className="step-desc">Hoàn tất thanh toán học phí khóa học</div>
            </div>
            <div className="step-arrow-vertical">↓</div>
          </div>

          {/* Arrow Down from Step 4 to Step 5 */}
          <div className="step-arrow-down step-arrow-down-container">
            <svg width="16" height="80" viewBox="0 0 24 100" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="0" width="2" height="50" rx="1" fill="currentColor"></rect>
              <polygon points="8,52 16,52 12,60" fill="currentColor"></polygon>
            </svg>
          </div>

          {/* Row 2: Steps 8-5 (left to right) */}
          <div className="steps-row steps-row2">
            {/* Step 8 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/8.png" alt="Step 8" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Nhận chứng chỉ</div>
              <div className="step-desc">Cấp chứng chỉ điều khiển UAV hợp lệ</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 8←7 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 7 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/7.png" alt="Step 7" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Thi lý thuyết & Bay thực hành</div>
              <div className="step-desc">Hoàn thành kỳ thi trắc nghiệm và bay thực hành</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 7←6 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 6 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/6.png" alt="Step 6" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Đào tạo thực hành tại chỗ</div>
              <div className="step-desc">Học bay và điều khiển UAV tại trung tâm</div>
            </div>
            <div className="step-arrow-vertical">↓</div>

            {/* Arrow 6←5 */}
            <div className="step-arrow">
              <svg width="70" height="16" viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
                <rect x="0" y="9" width="150" height="6" fill="#0050b8"></rect>
                <polygon points="150,4 150,20 165,12" fill="#0050b8"></polygon>
              </svg>
            </div>

            {/* Step 5 */}
            <div className="step-item">
              <div className="step-icon">
                <img src="/images/5.png" alt="Step 5" onError={(e) => (e.target.src = "https://via.placeholder.com/80")} />
              </div>
              <div className="step-title">Hoàn thành khóa học online</div>
              <div className="step-desc">Hoàn tất tất cả bài học và bài tập online</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Certificates */}
      <section className="uav-cert-section">
        <div className="container">
          <h2 className="section-title">Các loại chứng chỉ UAV</h2>
          <div className="uav-cert-grid">
            <div className="uav-cert-card">
              <div>
                <span className="uav-cert-badge badge-a">Hạng A</span>
                <h3 className="uav-cert-title">VLOS – Visual Line of Sight</h3>
                <p className="uav-cert-desc">Giấy phép điều khiển bay bằng trực quan (Hạng A) áp dụng đối với người điều khiển phương tiện bay có trọng lượng cất cách tối đa từ 0,25 ki-lô-gam đến nhỏ hơn 2 ki-lô-gam, bay trong tầm nhìn trực quan;</p>
                <p className="uav-cert-note">Thời gian hiệu lực: 10 năm.</p>
                <p className="uav-cert-note">Chứng chỉ cơ bản phù hợp cho người mới bắt đầu sử dụng UAV.</p>
                <strong>Nội dung chương trình học:</strong>
                <ol className="uav-cert-list">
                  <li>Pháp luật quy định về tàu bay.</li>
                  <li>Kiến thức hàng không cơ bản.</li>
                  <li>Hệ thống tàu bay không người lái.</li>
                  <li>Vận hành an toàn và quy trình bay.</li>
                  <li>Khí tượng và môi trường bay.</li>
                  <li>Quản lý không phận và UTM cơ bản.</li>
                  <li>Kỹ năng điều khiển cơ bản (VLOS).</li>
                  <li>Thực hành nhiệm vụ VLOS nâng cao.</li>
                </ol>
                <br />
                <br />
              </div>
              <div className="uav-duration-box">Thời gian đào tạo: xx Tuần</div>
            </div>
            <div className="uav-cert-card">
              <div>
                <span className="uav-cert-badge badge-b">Hạng B</span>
                <h3 className="uav-cert-title">BVLOS - Beyond Visual Line of Sight</h3>
                <p className="uav-cert-desc">Giấy phép điều khiển bay bằng thiết bị (Hạng B) áp dụng đối với người điều khiển phương tiện bay có trọng lượng cất cánh tối đa từ 2 ki-lô-gam trở lên, phương tiện bay bay ngoài tầm nhìn trực quan, phương tiện bay được lập trình thông qua bộ điều khiển trung tâm.</p>
                <p className="uav-cert-note">Thời gian hiệu lực: 10 năm.</p>
                <br /> <br />
                <strong>Nội dung chương trình học:</strong>
                <ol className="uav-cert-list">
                  <li>Pháp luật quy định về tàu bay không người lái và phương tiện bay khác.</li>
                  <li>Kiến thức hàng không cơ bản và nguyên lý bay.</li>
                  <li>Hệ thống tàu bay không người lái và phương tiện bay khác; trang bị, thiết bị đồng bộ.</li>
                  <li>Vận hành an toàn và quy trình bay.</li>
                  <li>Khí tượng và môi trường bay.</li>
                  <li>Quản lý không phận và UTM cơ bản.</li>
                  <li>Kỹ năng điều khiển cơ bản (VLOS).</li>
                  <li>Thực hành nhiệm vụ VLOS nâng cao.</li>
                  <li>Kỹ năng điều khiển nâng cao (BVLOS).</li>
                </ol>
              </div>
              <div className="uav-duration-box">Thời gian đào tạo: xx Tuần (Tùy lĩnh vực ứng dụng)</div>
              {/* <div className="cert-tabs-container">
                <span className="cert-tabs-label">Các nghiệp vụ bao gồm:</span>
                <div className="cert-tabs-header">
                  {Object.keys(certTabsData).map((key) => (
                    <button key={key} className={`cert-tab-btn ${activeCertTab === key ? "active" : ""}`} onClick={() => setActiveCertTab(key)}>
                      {key === 'map' ? 'Khảo sát bản đồ' : key === 'check' ? 'Kiểm tra công nghiệp' : key === 'agro' ? 'Nông Lâm Vận Tải' : 'Trình diễn nghệ thuật'}
                    </button>
                  ))}
                </div>
                <div className="cert-tab-content">
                  <ul className="sub-list-arrow">
                    {certTabsData[activeCertTab].map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div> */}
              <div className="cert-tabs-container">
                <span className="cert-tabs-label">Các nghiệp vụ bao gồm:</span>

                <div className="cert-tabs-header scroll-x">
                  {tabKeys.map((key) => (
                    <button
                      key={key}
                      className={`cert-tab-btn ${activeCertTab === key ? "active" : ""}`}
                      onClick={() => setActiveCertTab(key)}
                    >
                      {hangBGroups[key] && hangBGroups[key].label ? hangBGroups[key].label : key}
                    </button>
                  ))}
                </div>

                <div className="cert-tab-content">
                  <ul className="sub-list-arrow">
                    {(hangBGroups[activeCertTab] && hangBGroups[activeCertTab].items && hangBGroups[activeCertTab].items.length > 0)
                      ? hangBGroups[activeCertTab].items.map((item) => (
                          <li
                            key={item.id || item.title}
                            className="hangb-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const key = item.id ?? item.title;
                              setExpandedItemId(expandedItemId === key ? null : key);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const key = item.id ?? item.title;
                                setExpandedItemId(expandedItemId === key ? null : key);
                              }
                            }}
                          >
                            <div className="hangb-item-row">
                              <span className="hangb-item-title">{item.title || 'Nghiệp vụ'}</span>
                            </div>
                            {expandedItemId === (item.id ?? item.title) && (
                              <div className="hangb-item-desc">
                                {item.description || 'Không có mô tả.'}
                              </div>
                            )}
                          </li>
                        ))
                      : null
                    }
                  </ul>
                </div>
              </div>

              {/* detail button removed */}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Courses */}
      <section className="section section-gray">
        <div className="container">
          <h2 className="section-title">Khóa học mới nhất</h2>
          <div className="courses-grid">
            {newestCourses.map((course) => renderCourseCard(course))}
          </div>
        </div>
      </section>

      {/* 6. Map 3D */}
      <section className="map-3d-section">
        <div className="map-3d-header">
          <h2 className="section-title">Cơ sở vật chất</h2>
          <p className="map-header-desc">Khám phá cơ sở vật chất hiện đại qua mô hình 3D tương tác.</p>
        </div>
        <div className={`map-3d-container ${isFullscreen ? "fullscreen" : ""}`} id="map3d">
          <button className="fullscreen-btn" onClick={toggleFullscreen}>{isFullscreen ? "✕" : "⛶"}</button>

          {/* Kiểm tra WebGL trước khi render Canvas */}
          {webglSupported ? (
            <Canvas shadows camera={{ position: [15, 15, 15], fov: 25 }}>
              <Experience points={points} onPointClick={handlePointClick} modelUrl={modelUrl} cameraSettings={cameraSettings} />
            </Canvas>
          ) : (
            <WebGLFallback />
          )}

          {/* INFO PANEL */}
          <div className={`map-info-panel ${isPanelOpen ? "active" : ""}`} id="infoPanel">
            <div className="map-info-header"><button className="close-btn" onClick={handleClosePanel}>✕</button></div>
            {selectedPointData && (
              <div className="map-info-body">
                <div className="map-info-image-container">
                  {selectedPointData.panoramaUrl ? (
                    <div style={{ position: "relative" }}>
                      <PanoramaViewer key={selectedPointData.id} panoramaUrl={selectedPointData.panoramaUrl} />
                      <div className="panorama-overlay-hint">Kéo để xoay 360°</div>
                    </div>
                  ) : (
                    <img className="map-info-image" src={selectedPointData.imageSrc || "/images/img-default.jpg"} alt={selectedPointData.title} />
                  )}
                </div>
                <div className="map-info-content">
                  {/* FIX LOGO: Style inline để chắc chắn logo nhỏ */}
                  <img
                    className="map-info-logo"
                    src={selectedPointData.logoSrc}
                    alt="logo"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <h3 className="map-info-title-new">{selectedPointData.title}</h3>
                  {selectedPointData.description && (
                    <div className="map-info-description-new html-content" dangerouslySetInnerHTML={{ __html: selectedPointData.description }} />
                  )}
                  {selectedPointData.website && (
                    <div className="map-website-btn-container">
                      <a href={selectedPointData.website} target="_blank" rel="noopener noreferrer" className="btn btn-primary map-website-btn">Truy cập Website</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. GIẢI PHÁP */}
      <section className="section section-white" style={{ padding: "60px 0" }}>
        <div className="container">
          <h2 className="section-title solutions-section-title">Giải pháp cho các ngành nghề khác nhau</h2>
          {solutions.length === 0 ? (
            <div className="solutions-loading"><p>Đang tải dữ liệu giải pháp...</p></div>
          ) : (
            <div className="solutions-grid">
              {solutions.map((item) => (
                <div key={item.id} className="service-card">
                  <div className="service-image-wrapper">
                    <img src={item.image} alt={item.title} className="service-image" onError={(e) => { e.target.onerror = null; e.target.src = `https://via.placeholder.com/250x150?text=${encodeURIComponent(item.title)}`; }} />
                  </div>
                  <h3 className="service-title">{item.title}</h3>
                  <p className="service-desc">{item.description}</p>
                  <Link to={item.link || "#"} className="service-btn">
                    Xem chi tiết
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8. THÔNG BÁO CHÍNH THỨC */}
      <section className="section section-gray">
        <div className="container">
          <h2 className="section-title">Thông báo chính thức</h2>
          {notifications.length === 0 ? (
            <div className="notifications-empty">Chưa có thông báo nào.</div>
          ) : (
            <div className="news-grid">
              {notifications.map((news) => (
                <div key={news.id} className="news-card">
                  {news.isNew && <div className="news-badge">MỚI</div>}
                  <div className="news-content">
                    <div className="news-date">Cập nhật {news.date}</div>
                    <div className="news-title">{news.title}</div>
                    <div className="news-desc">{news.description}</div>
                    <a href={news.link || "#"} className="link-button">Xem chi tiết</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Certificate Details Modal */}
      {showCertModal && modalGroup && (
        <div className="cert-modal-overlay">
          <div className="cert-modal-content">
            <div className="cert-modal-header">
              <h3 className="cert-modal-title">{modalGroup.label || 'Chi tiết nghiệp vụ'}</h3>
              <button onClick={() => setShowCertModal(false)} className="cert-modal-close">✕</button>
            </div>
            <div className="cert-modal-body">
              {modalGroup.items.map((it) => (
                <div key={it.id} className="cert-modal-item">
                  <h4 className="cert-modal-item-title">{it.title}</h4>
                  <div className="cert-modal-item-desc">{it.description || 'Không có mô tả.'}</div>
                </div>
              ))}
            </div>
            <div className="cert-modal-footer">
              <button className="btn cert-modal-close-btn" onClick={() => setShowCertModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UAVLandingPage;