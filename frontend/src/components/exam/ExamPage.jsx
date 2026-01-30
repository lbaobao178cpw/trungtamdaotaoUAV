import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/apiInterceptor";
import "./ExamPage.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { API_ENDPOINTS } from "../../config/apiConfig";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import {
  FileText, CheckCircle2, Plane, Award, ChevronDown, Phone, Mail, FileDown,
  MapPin, Calendar, Clock, BookOpen, AlertCircle, UserCheck, ShieldCheck,
  BarChart3
} from "lucide-react";

const ExamPage = () => {
  const [selectedCertificate, setSelectedCertificate] = useState("hang-a");
  const [registeredTier, setRegisteredTier] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [faqList, setFaqList] = useState([]);
  const [footerConfig, setFooterConfig] = useState({ phone: "", email: "", workingHours: "" });
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage on mount
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const formRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    const handleUserChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      console.log("📢 User changed:", updatedUser?.id || 'null');
      setUser(updatedUser);
    };

    // Don't call handleUserChange here - user already initialized from localStorage

    // Lắng nghe storage event từ tab khác
    window.addEventListener("storage", handleUserChange);

    // Lắng nghe custom event từ login/logout trong cùng tab
    window.addEventListener("userLoggedIn", handleUserChange);

    return () => {
      window.removeEventListener("storage", handleUserChange);
      window.removeEventListener("userLoggedIn", handleUserChange);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch exams - gửi user_id nếu user đã login để filter theo level
        try {
          let examEndpoint = "/exams";
          if (user) {
            console.log("👤 User logged in:", { id: user.id, name: user.name });
            console.log("🔑 Token in localStorage:", localStorage.getItem('user_token') ? '✅ EXISTS' : '❌ NOT FOUND');
            examEndpoint = `/exams?user_id=${user.id}`;
          } else {
            console.log("👤 No user logged in - public view");
          }
          console.log("🔗 Fetching exam endpoint:", examEndpoint);
          const examResponse = await apiClient.get(examEndpoint);
          const data = examResponse.data;
          const activeExams = Array.isArray(data)
            ? data.filter(exam => exam.is_active === 1 || exam.is_active === true)
            : [];
          console.log("📋 Fetched exams:", activeExams.length, "exams total");
          console.log("📋 Exam types:", activeExams.map(e => e.type).join(", "));
          setUpcomingExams(activeExams);
        } catch (err) {
          console.error("❌ Error fetching exams:", err);
        }

        // Fetch study materials (API công khai)
        try {
          const materialsResponse = await apiClient.get("/study-materials");
          const materialsData = materialsResponse.data;
          if (materialsData.success) {
            setStudyMaterials(materialsData.data || []);
          }
        } catch (err) {
          console.error("Error fetching materials:", err);
        }

        // Fetch FAQs (API công khai)
        try {
          const faqResponse = await apiClient.get("/faqs?category=exam");
          const faqData = faqResponse.data;
          setFaqList(faqData.data || []);
        } catch (err) {
          console.error("Error fetching FAQs:", err);
        }
        // Fetch footer config (for phone and email)
        try {
          const footerResponse = await apiClient.get("/display/footer-config");
          setFooterConfig(footerResponse.data);
        } catch (err) {
          console.error("Error fetching footer config:", err);
        }
        // --- PHẦN SỬA LỖI 401 ---
        if (user) {
          try {
            const profileResponse = await apiClient.get(`/users/${user.id}/profile`);
            const profileData = profileResponse.data;
            if (profileData.target_tier) {
              setRegisteredTier(profileData.target_tier);
              setSelectedCertificate(profileData.target_tier === "B" ? "hang-b" : "hang-a");
            }
          } catch (err) {
            console.error("Error fetching profile:", err);
          }
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const scrollToExams = () => {
    const section = document.getElementById("exam-list-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFAQ = (index) => setOpenFAQ(openFAQ === index ? null : index);
  const formatDate = (iso) => new Date(iso).toLocaleDateString("vi-VN");
  const getTierFromType = (t) => t?.toLowerCase().includes("hạng a") ? "A" : "B";
  const getSpotBadgeColor = (n) => {
    if (n === 0) return "bg-destructive text-white";
    if (n <= 5) return "bg-amber-500 text-white";
    return "bg-accent text-accent-foreground";
  };

  // Handle study materials download with proper PDF MIME type
  const handleStudyMaterialDownload = async (doc) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.STUDY_MATERIALS}/${doc.id}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      // Create a new blob with explicit PDF MIME type
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct link
      const a = document.createElement('a');
      a.href = `${API_ENDPOINTS.STUDY_MATERIALS}/${doc.id}/download`;
      a.download = `${doc.title}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const processSteps = [
    { label: "Đăng ký dự thi", icon: FileText, desc: "Hoàn thành đăng ký và thanh toán lệ phí thi trực tuyến hoặc tại văn phòng." },
    { label: "Xác nhận tư cách dự thi", icon: CheckCircle2, desc: "Hệ thống xác nhận bạn đã hoàn thành các khóa học bắt buộc và đủ điều kiện dự thi." },
    { label: "Thi lý thuyết", icon: BookOpen, desc: "Hoàn thành bài thi trắc nghiệm với ít nhất 80% câu trả lời đúng để đạt yêu cầu." },
    { label: "Thi thực hành", icon: Plane, desc: "Thực hiện các bài bay theo yêu cầu để chứng minh kỹ năng điều khiển UAV." },
    { label: "Nhận chứng chỉ", icon: Award, desc: "Chứng chỉ điện tử sẽ được cấp trong vòng 5 ngày làm việc sau khi thi đạt." },
  ];

  // Lấy danh sách tài liệu từ studyMaterials
  const documentsList = studyMaterials && studyMaterials.length > 0 ? studyMaterials : [];

  const faqDataList = faqList && faqList.length > 0 ? faqList : [];

  return (
    <div className="exam-page-wrapper min-h-screen flex flex-col bg-muted">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br text-white py-20">
        <div className="container relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Thi sát hạch điều khiển UAV</h1>
          <p className="text-lg md:text-xl opacity-90">Chứng chỉ hợp pháp tại Việt Nam</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quy trình thi */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-3">Quy trình thi sát hạch</h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Các bước để hoàn thành kỳ thi sát hạch và nhận chứng chỉ
                </p>

                <div className="space-y-6">
                  {processSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-start relative">
                      {/* Đường dọc nối icon */}
                      {idx < processSteps.length - 1 && (
                        <div className="process-line" />
                      )}

                      <div className="process-icon flex items-center justify-center flex-shrink-0 rounded-full">
                        <step.icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold mb-2 text-white text-base">
                          {step.label}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Chi tiết chứng chỉ */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-3">
                  {registeredTier ? "Chứng chỉ bạn đã đăng ký" : "Các loại chứng chỉ"}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Thông tin chi tiết về các hạng chứng chỉ và yêu cầu tương ứng
                </p>

                {/* Tab selector - chỉ hiển thị khi CHƯA đăng ký */}
                {!registeredTier && (
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setSelectedCertificate("hang-a")}
                      className={`certificate-btn ${selectedCertificate === "hang-a" ? "active" : ""
                        }`}
                    >
                      Hạng A
                    </button>

                    <button
                      onClick={() => setSelectedCertificate("hang-b")}
                      className={`certificate-btn ${selectedCertificate === "hang-b" ? "active" : ""
                        }`}
                    >
                      Hạng B
                    </button>
                  </div>
                )}


                {/* Hiển thị Hạng A - nếu đã đăng ký A HOẶC đang chọn A */}
                {((registeredTier === 'A') || (!registeredTier && selectedCertificate === "hang-a")) && (
                  <div className="tier-card tier-a-card p-6 border rounded-lg">

                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div>
                        {registeredTier === 'A' && (
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                              style={{
                                background: 'transparent',
                                color: '#0050b8'
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" /> ĐÃ ĐĂNG KÝ
                            </span>
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">
                          Hạng A (Cơ bản)
                        </h3>
                        {/* BADGE HẠNG A */}
                        <span className="tier-uav-badge">
                          UAV &lt; 250g
                        </span>
                      </div>
                      <span className="text-primary text-2xl font-bold whitespace-nowrap">
                        5.800.000 VNĐ
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Phù hợp với người dùng UAV cá nhân, sử dụng cho mục đích giải trí, chụp ảnh, quay phim cá nhân.
                    </p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-white mb-3">Yêu cầu:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Độ tuổi tối thiểu: 16 tuổi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Hoàn thành khóa học trực tuyến và 4 giờ thực hành</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Thi trắc nghiệm đạt ít nhất 80%</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Thi thực hành bay cơ bản</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-3">Quyền hạn:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay UAV dưới 250g</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay ở độ cao tối đa 120m</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay trong tầm nhìn thẳng</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay với khoảng cách tối đa 500m</span>
                        </li>
                      </ul>
                    </div>

                    {!registeredTier && (
                      <Link
                        to="/dang-ky"
                        state={{ preSelectedTier: "A" }}
                        className="tier-register-btn mt-6 inline-block text-center rounded-lg font-bold transition-all bg-primary hover:bg-primary/90"
                      >
                        Đăng ký thi Hạng A
                      </Link>
                    )}
                  </div>
                )}

                {/* Hiển thị Hạng B - nếu đã đăng ký B HOẶC đang chọn B */}
                {((registeredTier === 'B') || (!registeredTier && selectedCertificate === "hang-b")) && (
                  <div className="tier-card tier-b-card p-6 border rounded-lg">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div>
                        {registeredTier === 'B' && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="tier-registered-badge inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold">

                              <CheckCircle2 className="w-3 h-3" /> ĐÃ ĐĂNG KÝ
                            </span>
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">
                          Hạng B (Trung cấp)
                        </h3>
                        {/* BADGE HẠNG B */}
                        <span className="tier-uav-badge">
                          UAV 250g - 2kg
                        </span>
                      </div>
                      <span className="text-primary text-2xl font-bold whitespace-nowrap">
                        12.900.000 VNĐ
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Phù hợp với người dùng UAV chuyên nghiệp hơn, sử dụng cho mục đích chụp ảnh, quay phim.
                    </p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-white mb-3">Yêu cầu:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Độ tuổi tối thiểu: 18 tuổi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Hoàn thành khóa học trực tuyến và 4 giờ thực hành</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Thi trắc nghiệm đạt ít nhất 80%</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Thi thực hành bay cơ bản</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-3">Quyền hạn:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay UAV từ 250g đến 2kg</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay ở độ cao tối đa 120m</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay trong tầm nhìn thẳng</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>Bay với khoảng cách tối đa 500m</span>
                        </li>
                      </ul>
                    </div>

                    {!registeredTier && (
                      <Link
                        className="tier-register-btn mt-6 inline-block text-center rounded-lg font-bold transition-all bg-primary hover:bg-primary/90"
                      >
                        Đăng ký thi Hạng B
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* FAQ */}
              <div className="card p-6">
                <h3 className="font-bold mb-6 text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-primary" />
                  </div>
                  Câu hỏi thường gặp
                </h3>
                <div className="space-y-3">
                  {faqDataList.map((faq, idx) => (
                    <div key={idx} className="faq-item">
                      <div className="faq-question" onClick={() => toggleFAQ(idx)}>
                        <span className="font-medium text-white">{faq.question}</span>
                        <ChevronDown className={`w-5 h-5 text-primary ${openFAQ === idx ? 'rotate-180' : ''}`} />
                      </div>
                      {openFAQ === idx && (
                        <div className="faq-answer">{faq.answer}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-6">
              {/* Đăng ký nhanh */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Đăng ký nhanh</h3>

                {registeredTier ? (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 mb-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Bạn đã đăng ký học</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Chứng chỉ Hạng {registeredTier}</p>
                    <button onClick={scrollToExams} className="w-full mt-4 btn-view-schedule">
                      Xem lịch thi
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 mb-4">
                      <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedCertificate === "hang-a" ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}>
                        <input type="radio" name="cert-sidebar" checked={selectedCertificate === "hang-a"} onChange={() => setSelectedCertificate("hang-a")} className="mr-3 accent-primary" />
                        <span className="text-sm font-medium text-white">Chứng chỉ Hạng A (UAV &lt; 250g)</span>
                      </label>
                      <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedCertificate === "hang-b" ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}>
                        <input type="radio" name="cert-sidebar" checked={selectedCertificate === "hang-b"} onChange={() => setSelectedCertificate("hang-b")} className="mr-3 accent-primary" />
                        <span className="text-sm font-medium text-white">Chứng chỉ Hạng B (UAV 250g - 2kg)</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg mb-6 border">
                      <span className="text-sm font-semibold text-muted-foreground">Lệ phí thi:</span>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block mb-1">{selectedCertificate === "hang-a" ? "Hạng A" : "Hạng B"}</span>
                        <strong className="text-primary text-lg">{selectedCertificate === "hang-a" ? "5.800.000 VNĐ" : "12.900.000 VNĐ"}</strong>
                      </div>
                    </div>

                    <Link
                      to="/dang-ky"
                      state={{ preSelectedTier: selectedCertificate === "hang-a" ? "A" : "B" }}
                      className="block w-full text-center bg-primary hover:bg-primary/90 py-3 rounded-lg font-bold transition-all shadow-sm text-white"
                      style={{ textDecoration: 'none' }}
                    >
                      Đăng ký thi sát hạch
                    </Link>

                    <p className="text-xs text-muted-foreground mt-4 text-center">Cần hỗ trợ? Vui lòng liên hệ Hotline <strong className="text-primary">1900 xxxx</strong>.</p>
                  </>
                )}
              </div>

              {/* Tài liệu ôn thi */}
              {/* <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Tài liệu ôn thi</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {documentsList && documentsList.length > 0 ? (
                    documentsList.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '15px',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                          height: 'fit-content',
                          minHeight: '60px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'var(--primary-color, #0050b8)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                      >
                        <p
                          style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: 'var(--primary-color, #0050b8)',
                            margin: '0',
                            marginRight: '45px',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            flexShrink: 0
                          }}
                        >
                          {doc.title}
                        </p>
                        {doc.file_url && (
                          <button
                            onClick={() => handleStudyMaterialDownload(doc)}
                            title="Tải xuống"
                            style={{
                              color: 'var(--primary-color, #0050b8)',
                              textDecoration: 'none',
                              transition: 'all 0.2s ease',
                              position: 'absolute',
                              right: '15px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              background: 'rgba(0, 80, 184, 0.08)',
                              padding: '0',
                              border: 'none',
                              cursor: 'pointer',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0, 80, 184, 0.15)';
                              e.currentTarget.style.transform = 'translateY(calc(-50% - 2px))';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0, 80, 184, 0.08)';
                              e.currentTarget.style.transform = 'translateY(-50%)';
                            }}
                          >
                            <FileDown size={18} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#999' }}>Không có tài liệu ôn thi</p>
                  )}
                </div>
              </div> */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg">Tài liệu ôn thi</h3>

                <div className="exam-docs-grid">
                  {documentsList && documentsList.length > 0 ? (
                    documentsList.map((doc) => (
                      <div key={doc.id} className="exam-doc-item">
                        <p className="exam-doc-title">{doc.title}</p>

                        {doc.file_url && (
                          <button
                            onClick={() => handleStudyMaterialDownload(doc)}
                            title="Tải xuống"
                            className="exam-doc-download"
                          >
                            <FileDown size={18} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="exam-doc-empty">Không có tài liệu ôn thi</p>
                  )}
                </div>
              </div>

              {/* Thống kê */}
              <div className="card p-6">
                <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Thống kê
                </h3>
                <div className="space-y-3 text-sm stats-list">
                  <div className="stats-row">
                    <span className="text-muted-foreground">Tổng số đã cấp chứng chỉ:</span>
                    <span className="font-bold text-white">12,548</span>
                  </div>

                  <div className="stats-row">
                    <span className="text-muted-foreground">Tỷ lệ đậu trung bình:</span>
                    <span className="font-bold text-green-600">78%</span>
                  </div>

                  <div className="stats-row">
                    <span className="text-muted-foreground">Kỳ thi gần nhất:</span>
                    <span className="font-bold text-white">25/12/2025</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số lượng trung tâm:</span>
                    <span className="font-bold text-white">15</span>
                  </div>
                </div>
              </div>
              {/* Support */}
              <div className="card p-6 support-card">
                <h3 className="font-bold mb-6 text-lg support-title">
                  Liên hệ hỗ trợ
                </h3>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="support-icon-wrapper">
                      <Phone className="support-icon" />
                    </div>
                    <div>
                      <p className="support-label">Tổng đài hỗ trợ</p>
                      <p className="support-text">{footerConfig.phone || '1900 xxxx'}</p>
                      {footerConfig.workingHours && (
                        <p className="support-subtext">{footerConfig.workingHours}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="support-icon-wrapper">
                      <Mail className="support-icon" />
                    </div>
                    <div>
                      <p className="support-label">Email hỗ trợ</p>
                      <p className="support-email">
                        {footerConfig.email || 'support@UAVcert.gov.vn'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Lịch thi sắp tới */}
      <section id="exam-list-section" className="py-16 border-t" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-primary">Lịch thi sắp tới</h2>
            <p className="text-muted-foreground">Đăng ký tham gia các kỳ thi sát hạch trong thời gian tới</p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : (
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={24}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              breakpoints={{
                768: {
                  slidesPerView: 2,
                },
                1280: {
                  slidesPerView: 3,
                },
              }}
              className="max-w-6xl mx-auto mb-8"
            >
              {upcomingExams.map((exam, idx) => {
                const tier = getTierFromType(exam.type);
                let ButtonRender;

                if (exam.is_registered === 1) {
                  ButtonRender = (
                    <button
                      disabled
                      className="w-full py-2 bg-green-100 text-green-700 font-bold rounded cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Đã đăng ký
                    </button>
                  );
                } else if (exam.spots_left <= 0) {
                  ButtonRender = (
                    <button
                      disabled
                      className="w-full py-2 bg-gray-200 text-gray-500 font-bold rounded cursor-not-allowed"
                    >
                      Đã hết chỗ
                    </button>
                  );
                } else {
                  ButtonRender = (
                    <Link
                      to={user ? "/dat-lich-thi" : "/dang-ky"}
                      state={{
                        preSelectedTier: tier,
                        examId: exam.id,
                        examLocation: exam.location,
                        examInfo: `${exam.type} - ${formatDate(exam.exam_date)}`,
                      }}
                      className="block w-full text-center bg-primary hover:bg-primary/90 py-2 rounded font-bold transition-all"
                      style={{ textDecoration: "none" }}
                    >
                      Đăng ký ngay
                    </Link>
                  );
                }

                return (
                  <SwiperSlide key={idx}>
                    <div className="card p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-lg text-white">{exam.type}</h3>
                        <div className={`badge ${getSpotBadgeColor(exam.spots_left)}`}>
                          {exam.spots_left > 0
                            ? `Còn ${exam.spots_left} chỗ`
                            : "Hết chỗ"}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-white">{exam.location}</p>
                            <p className="text-xs text-muted-foreground">{exam.address}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(exam.exam_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{exam.exam_time}</span>
                          </div>
                        </div>
                      </div>

                      {ButtonRender}
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>

          )}
        </div>
      </section>
    </div>
  );
};

export default ExamPage;