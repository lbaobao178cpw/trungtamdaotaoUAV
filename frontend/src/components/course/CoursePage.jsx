import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Award, BookOpen } from "lucide-react";
import "./CoursePage.css";

// --- CẤU HÌNH API ---
const API_URL = "http://localhost:5000/api/courses";
const COMMENTS_API = "http://localhost:5000/api/comments";
const MEDIA_BASE_URL = "http://localhost:5000";

// --- DANH SÁCH ẢNH BANNER SLIDER ---
// Bạn thay thế bằng link ảnh thực tế của bạn nhé
const BANNER_IMAGES = [
  "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=2000&auto=format&fit=crop", // Ảnh 1: Drone trên trời
  "https://images.unsplash.com/photo-1506947411487-a56738267384?q=80&w=2000&auto=format&fit=crop", // Ảnh 2: Phong cảnh núi
  "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=2000&auto=format&fit=crop", // Ảnh 3: Người điều khiển
];

// Icon Components
const StarIcon = () => (
  <svg className="star-icon" viewBox="0 0 24 24">
    <path
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      fill="#FFC107"
    />
  </svg>
);

const MedalIcon = () => (
  <svg className="icon-medal" viewBox="0 0 24 24">
    <path fill="#0050b8" d="M12 2l-5.5 9h11z" />
    <circle
      fill="none"
      stroke="#0050b8"
      strokeWidth="2"
      cx="12"
      cy="16"
      r="4"
    />
  </svg>
);

function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseRatings, setCourseRatings] = useState({});

  // --- STATE CHO SLIDER ---
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // --- HIỆU ỨNG TỰ CHẠY SLIDER ---
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) =>
        prevIndex === BANNER_IMAGES.length - 1 ? 0 : prevIndex + 1,
      );
    }, 5000); // Chuyển ảnh sau mỗi 5 giây

    return () => clearInterval(interval); // Dọn dẹp khi component unmount
  }, []);

  // Fetch dữ liệu từ API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Không thể kết nối Server");
        const data = await response.json();
        setCourses(data);

        // Fetch ratings cho từng course
        const ratings = {};
        for (const course of data) {
          try {
            const res = await fetch(`${COMMENTS_API}/course/${course.id}`);
            if (res.ok) {
              const comments = await res.json();
              const ratedComments = (comments.comments || []).filter(
                (c) => c.rating,
              );
              if (ratedComments.length > 0) {
                const avg = (
                  ratedComments.reduce((sum, c) => sum + c.rating, 0) /
                  ratedComments.length
                ).toFixed(1);
                ratings[course.id] = {
                  average: avg,
                  count: ratedComments.length,
                };
              }
            }
          } catch (err) {
            console.error(`Lỗi fetch comments cho course ${course.id}:`, err);
          }
        }
        setCourseRatings(ratings);
      } catch (err) {
        console.error("Lỗi fetch courses:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleCourseClick = (id) => {
    navigate(`/khoa-hoc/${id}`);
    window.scrollTo(0, 0);
  };

  const getImageUrl = (path) => {
    if (!path)
      return "https://placehold.co/600x400/333333/ffffff?text=No+Image";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${MEDIA_BASE_URL}${cleanPath}`;
  };

  const newestCourses = [...courses]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  const featuredCourses = [...courses]
    .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
    .slice(0, 4);

  const renderCourseCard = (course) => {
    const rating = courseRatings[course.id]?.average
      ? parseFloat(courseRatings[course.id].average)
      : 5;

    // Logic xác định Hạng A / Hạng B giống trang chủ
    const getBadgeInfo = (level) => {
      if (!level) return null;
      const lvl = level.toLowerCase();

      // Nếu là 'a' hoặc 'cơ bản' -> Hạng A
      if (lvl === "a" || lvl.includes("cơ bản")) {
        return { text: "HẠNG A", className: "badge-a" };
      }
      // Nếu là 'b' hoặc 'nâng cao' -> Hạng B
      if (lvl === "b" || lvl.includes("nâng cao")) {
        return { text: "HẠNG B", className: "badge-b" };
      }
      // Mặc định
      return { text: level, className: "badge-a" }; // Mặc định dùng style A
    };

    const badgeInfo = getBadgeInfo(course.level);

    return (
      <div
        key={course.id}
        className="course-card"
        onClick={() => handleCourseClick(course.id)}
      >
        <div className="course-image-wrapper">
          <img src={getImageUrl(course.image)} alt={course.title} />
          {/* Đã xóa badge cũ đè lên ảnh */}
        </div>

        <div className="course-content">
          {/* --- CẤU TRÚC MỚI: TIÊU ĐỀ + BADGE NGANG HÀNG --- */}
          <div className="course-title-row">
            <h3 className="course-title">{course.title}</h3>
            {badgeInfo && (
              <span className={`uav-style-badge ${badgeInfo.className}`}>
                {badgeInfo.text}
              </span>
            )}
          </div>

          <div className="course-rating">
            <div className="stars">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-icon" viewBox="0 0 24 24">
                  <path
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    fill={i < Math.round(rating) ? "#FFC107" : "#ddd"}
                  />
                </svg>
              ))}
            </div>
            <span style={{ color: "#b0b0b0" }}>
              {courseRatings[course.id]
                ? `${courseRatings[course.id].average} (${course.totalViews || 0} lượt xem)`
                : `${course.rating || "5.0"} (${course.totalViews || 0} lượt xem)`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="courses-page">
      {/* HERO BANNER SLIDER */}
      <section className="hero-banner-wrapper">
        {/* --- PHẦN SLIDER ẢNH NỀN --- */}
        <div className="hero-slider">
          {BANNER_IMAGES.map((img, index) => (
            <div
              key={index}
              className={`hero-slide-item ${index === currentBannerIndex ? "active" : ""}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          {/* Lớp phủ tối để làm nổi bật chữ Neon */}
          <div className="hero-overlay"></div>
        </div>

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">TRAINING CENTER</h1>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="hero-bottom-bar">
          <div className="container">
            <div className="bar-content">
              <div className="bar-item">
                <MedalIcon />
                <span>CHỨNG CHỈ CHÍNH THỨC</span>
              </div>
              <div className="bar-item">
                <MedalIcon />
                <span>HỌC TẬP CHUYÊN NGHIỆP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÁC SECTION KHÁC GIỮ NGUYÊN */}
      <section className="courses-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Khóa học mới nhất</h2>
            {courses.length > 4 && (
              <Link to="/newest" className="view-all">
                Xem tất cả
              </Link>
            )}
          </div>
          <div className="courses-grid">
            {newestCourses.length > 0 ? (
              newestCourses.map((course) => renderCourseCard(course))
            ) : (
              <p
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  color: "#666",
                  padding: "40px 0",
                }}
              >
                Chưa có khóa học nào.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="courses-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Khóa học nổi bật</h2>
            {courses.length > 4 && (
              <Link to="/featured" className="view-all">
                Xem tất cả
              </Link>
            )}
          </div>
          <div className="courses-grid">
            {featuredCourses.length > 0 ? (
              featuredCourses.map((course) => renderCourseCard(course))
            ) : (
              <p
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  color: "#666",
                  padding: "40px 0",
                }}
              >
                Chưa có khóa học nào.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="courses-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Tất cả khóa học</h2>
          </div>
          <div className="courses-grid">
            {courses.map((course) => renderCourseCard(course))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CoursesPage;
