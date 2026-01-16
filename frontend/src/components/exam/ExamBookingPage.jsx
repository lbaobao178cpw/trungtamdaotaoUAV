import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, MapPin, User, CheckCircle, AlertTriangle, ArrowLeft 
} from "lucide-react";
import "../Registration/RegisterPage.css"; // Đảm bảo đường dẫn CSS đúng

const ExamBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Dữ liệu nhận được từ ExamPage:", location.state);
  
  const { examId, examInfo, preSelectedTier, examLocation } = location.state || {};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra đăng nhập
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      alert("Vui lòng đăng nhập trước!");
      navigate("/dang-nhap");
      return;
    }
    setUser(JSON.parse(storedUser));

    // 2. Nếu không có thông tin kỳ thi (do reload trang), quay lại danh sách
    if (!examId) {
      navigate("/thi-sat-hach");
    }
  }, [navigate, examId]);

  const handleConfirmBooking = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng ký kỳ thi này?")) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/exams/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          exam_schedule_id: examId,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Lỗi đăng ký");

      alert("Đăng ký thành công! Chúng tôi sẽ liên hệ sớm để hướng dẫn đóng lệ phí.");
      navigate("/"); // Hoặc chuyển về trang profile/lịch sử
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="register-page" style={{ background: '#222222', minHeight: '100vh' }}>
      <div className="register-container" style={{maxWidth: '600px'}}>
        <div className="register-card" style={{ 
          background: '#e1e1e1', 
          border: '1px solid #555555',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 className="step-title" style={{ color: '#0050b8', marginBottom: '2rem' }}>
            Xác nhận đăng ký thi
          </h2>

          {/* Box Thông tin Lịch thi */}
          <div className="info-box" style={{
            background: 'rgba(255, 202, 5, 0.05)', 
            borderColor: '#0050b8',
            border: '1px solid #0050b8',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 className="info-title" style={{
              color: '#0050b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '1.1rem'
            }}>
              <Calendar size={20} /> Thông tin kỳ thi
            </h3>
            <div style={{marginTop: '10px', fontSize: '0.95rem', color: '#e0e0e0'}}>
              <p style={{marginBottom: '8px'}}>
                <strong style={{ color: '#0050b8' }}>Nội dung:</strong> {examInfo}
              </p>
              <p style={{marginBottom: '8px'}}>
                <strong style={{ color: '#0050b8' }}>Địa điểm:</strong> {examLocation}
              </p>
              <p style={{marginBottom: '0', color: '#f59e0b', fontWeight: 'bold'}}>
                Hạng chứng chỉ: {preSelectedTier}
              </p>
            </div>
          </div>

          {/* Box Thông tin Thí sinh */}
          <div className="summary-section" style={{
            background: '#ffffff',
            border: '1px solid #555555',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1rem',
              fontSize: '1.1rem'
            }}>
              <User size={18} /> Thông tin thí sinh
            </h3>
            <div className="summary-item" style={{ 
              color: '#b0b0b0',
              marginBottom: '10px',
              borderBottom: '1px solid #444',
              paddingBottom: '8px'
            }}>
              <strong style={{ color: '#0050b8' }}>Họ và tên:</strong> {user.full_name}
            </div>
            <div className="summary-item" style={{ 
              color: '#b0b0b0',
              marginBottom: '10px',
              borderBottom: '1px solid #444',
              paddingBottom: '8px'
            }}>
              <strong style={{ color: '#0050b8' }}>Email:</strong> {user.email || "Chưa cập nhật"}
            </div>
            <div className="summary-item" style={{ 
              color: '#b0b0b0',
              marginBottom: '0'
            }}>
              <strong style={{ color: '#0050b8' }}>Số điện thoại:</strong> {user.phone}
            </div>
          </div>

          {/* Điều khoản */}
          <div className="form-section">
             <div style={{
               display: 'flex', 
               gap: '10px', 
               padding: '12px', 
               background: 'rgba(245, 158, 11, 0.1)', 
               borderRadius: '8px', 
               border: '1px solid rgba(245, 158, 11, 0.3)',
               marginBottom: '1.5rem'
             }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{fontSize: '0.9rem', color: '#e0e0e0'}}>
                  Nhấn xác nhận đồng nghĩa với việc bạn cam kết tham gia và thanh toán lệ phí thi.
                </span>
             </div>
          </div>

          {/* Nút bấm */}
          <div className="form-actions" style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <button 
              type="button" 
              onClick={() => navigate("/thi-sat-hach")} 
              className="btn btn-secondary"
              style={{
                flex: 1,
                background: 'transparent',
                color: '#0050b8',
                border: '2px solid #0050b8',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 202, 5, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <ArrowLeft size={20} /> Hủy bỏ
            </button>
            <button 
              onClick={handleConfirmBooking} 
              className="btn btn-primary" 
              disabled={loading}
              style={{
                flex: 1,
                background: '#0050b8',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 0 20px rgba(255, 202, 5, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = '#e6b804';
                  e.target.style.boxShadow = '0 0 25px rgba(255, 202, 5, 0.5)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = '#0050b8';
                  e.target.style.boxShadow = '0 0 20px rgba(255, 202, 5, 0.3)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? "Đang xử lý..." : "Xác nhận đăng ký"} <CheckCircle size={20} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExamBookingPage;