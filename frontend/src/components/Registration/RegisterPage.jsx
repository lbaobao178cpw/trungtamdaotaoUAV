import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Thêm useLocation
import "./RegisterPage.css";
import { toast } from "sonner";


import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  ClipboardList,
  Lock,
  AlertTriangle,
} from "lucide-react";

// Định nghĩa API URL
const API_URL = "http://localhost:5000/api/auth/register";

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook lấy dữ liệu từ trang ExamPage

  const [errors, setErrors] = useState({}); // check thông tin 


  // Lấy dữ liệu được truyền sang (nếu có)
  const preSelectedTier = location.state?.preSelectedTier || "";
  const examInfo = location.state?.examInfo || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateStep2 = () => {
    const newErrors = {};
    // ===== KIỂM TRA HỌ VÀ TÊN =====
    const fullName = formData.fullName?.trim();

    if (!fullName) {
      newErrors.fullName = "Vui lòng nhập họ và tên";
    } else if (!/^[A-Za-zÀ-ỹ]+(?:\s+[A-Za-zÀ-ỹ]+)+$/.test(fullName)) {
      newErrors.fullName =
        "Họ tên phải có ít nhất 2 từ và chỉ chứa chữ cái";
    }

    // ===== KIỂM TRA NGÀY SINH =====
    if (!formData.birthDate) {
      newErrors.birthDate = "Vui lòng chọn ngày sinh";
    }
    // ===== KIỂM TRA CCCD =====
    if (!formData.cccd) {
      newErrors.cccd = "Vui lòng nhập CCCD";
    } else if (!/^\d{12}$/.test(formData.cccd)) {
      newErrors.cccd = "CCCD phải gồm đúng 12 chữ số";
    }
    // ===== KIỂM TRA GIỚI TÍNH =====
    if (!formData.gender) {
      newErrors.gender = "Vui lòng chọn giới tính";
    }

    // if (!formData.phone) {
    //   newErrors.phone = "Vui lòng nhập số điện thoại";
    // } else if (!/^0\d{9}$/.test(formData.phone)) {
    //   newErrors.phone = "SĐT phải bắt đầu bằng 0 và đủ 10 số";
    // }

    // ===== KIỂM TRA ĐỊA CHỈ THƯỜNG TRÚ =====
    if (!formData.address.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ";
    }

    if (!formData.city.trim()) {
      newErrors.city = "Vui lòng nhập tỉnh/thành";
    }

    if (!formData.district.trim()) {
      newErrors.district = "Vui lòng nhập quận/huyện";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.warning("Vui lòng kiểm tra lại thông tin");
      return false;
    }

    return true;
  };

  // const validateStep3 = () => {
  //   const newErrors = {};

  //   // EMAIL
  //   if (!formData.email.trim()) {
  //     newErrors.email = "Vui lòng nhập email";
  //   } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
  //     newErrors.email = "Email không hợp lệ";
  //   }

  //   // SỐ ĐIỆN THOẠI
  //   if (!formData.phone) {
  //     newErrors.phone = "Vui lòng nhập số điện thoại";
  //   } else if (!/^0\d{9}$/.test(formData.phone)) {
  //     newErrors.phone = "SĐT phải bắt đầu bằng 0 và đủ 10 số";
  //   }

  //   // MẬT KHẨU
  //   if (!formData.password) {
  //     newErrors.password = "Vui lòng nhập mật khẩu";
  //   } else if (formData.password.length < 6) {
  //     newErrors.password = "Mật khẩu tối thiểu 6 ký tự";
  //   }

  //   if (!formData.confirmPassword) {
  //     newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
  //   } else if (formData.password !== formData.confirmPassword) {
  //     newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
  //   }


  //   // ===== LIÊN HỆ KHẨN CẤP =====
  //   const hasEmergencyName = !!formData.emergencyName?.trim();
  //   const hasEmergencyPhone = !!formData.emergencyPhone;

  //   // Nếu nhập 1 trong 2 thì bắt buộc nhập đủ
  //   if (hasEmergencyPhone && !hasEmergencyName) {
  //     newErrors.emergencyName = "Vui lòng nhập họ tên người liên hệ";
  //   }

  //   if (hasEmergencyName && !hasEmergencyPhone) {
  //     newErrors.emergencyPhone = "Vui lòng nhập số điện thoại người liên hệ";
  //   }

  //   // Kiểm tra họ tên hợp lệ
  //   if (hasEmergencyName) {
  //     if (!/^[A-Za-zÀ-ỹ\s]{2,}$/.test(formData.emergencyName.trim())) {
  //       newErrors.emergencyName =
  //         "Họ tên chỉ chứa chữ cái và phải có ít nhất 2 ký tự";
  //     }
  //   }

  //   // Kiểm tra số điện thoại hợp lệ
  //   if (hasEmergencyPhone) {
  //     if (!/^0\d{9}$/.test(formData.emergencyPhone)) {
  //       newErrors.emergencyPhone =
  //         "SĐT người liên hệ phải bắt đầu bằng 0 và đủ 10 số";
  //     }
  //   }

  //   return true;
  // };

  const validateStep3 = () => {
    const newErrors = {};

    // ===== EMAIL =====
    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Email không hợp lệ";
    }

    // ===== SỐ ĐIỆN THOẠI =====
    if (!formData.phone?.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^0\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "SĐT phải bắt đầu bằng 0 và đủ 10 số";
    }

    // ===== MẬT KHẨU =====
    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu tối thiểu 6 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    // ===== LIÊN HỆ KHẨN CẤP (BẮT BUỘC) =====
    const emergencyName = formData.emergencyName?.trim();
    const emergencyPhone = formData.emergencyPhone?.trim();

    // Bắt buộc nhập
    if (!emergencyName) {
      newErrors.emergencyName = "Vui lòng nhập họ tên người liên hệ";
    }

    if (!emergencyPhone) {
      newErrors.emergencyPhone = "Vui lòng nhập số điện thoại người liên hệ";
    }

    // Kiểm tra họ tên hợp lệ
    if (emergencyName && !/^[A-Za-zÀ-ỹ\s]{2,}$/.test(emergencyName)) {
      newErrors.emergencyName =
        "Họ tên chỉ chứa chữ cái và phải có ít nhất 2 ký tự";
    }

    // Kiểm tra số điện thoại hợp lệ
    if (emergencyPhone && !/^0\d{9}$/.test(emergencyPhone)) {
      newErrors.emergencyPhone =
        "SĐT người liên hệ phải bắt đầu bằng 0 và đủ 10 số";
    }
    if (
      emergencyPhone &&
      formData.phone &&
      emergencyPhone === formData.phone.trim()
    ) {
      newErrors.emergencyPhone =
        "Số điện thoại người liên hệ không được trùng với số đăng ký";
    }

    // ===== SET ERROR & RETURN =====
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.warning("Vui lòng kiểm tra thông tin liên hệ & bảo mật");
      return false;
    }

    return true;
  };




  const [formData, setFormData] = useState({
    verificationType: "qr",
    fullName: "",
    birthDate: "",
    cccd: "",
    idNumber: "",
    issueDate: "",
    gender: "",
    address: "", ward: "", district: "", city: "",
    email: "", phone: "", password: "", confirmPassword: "",
    permanentCity: "", permanentDistrict: "", permanentWard: "", permanentAddress: "",
    sameAsPermanent: false,
    currentCity: "", currentDistrict: "", currentWard: "", currentAddress: "",
    emergencyName: "", emergencyRelation: "", emergencyPhone: "",

    uavTypes: [],
    uavPurposes: [],
    activityArea: "",
    experience: "",

    // Tự động điền nếu có preSelectedTier, nếu không để trống
    certificateType: preSelectedTier,

    confirmations: [],
  });

  // Tự động cuộn lên đầu khi chuyển bước
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name.includes("uavType") || name.includes("uavPurpose")) {
        const arrayName = name.includes("uavType") ? "uavTypes" : "uavPurposes";
        const currentArray = formData[arrayName];
        setFormData((prev) => ({
          ...prev,
          [arrayName]: checked ? [...currentArray, value] : currentArray.filter((item) => item !== value),
        }));
      } else if (name === "confirmation") {
        const currentConfirmations = formData.confirmations;
        setFormData((prev) => ({
          ...prev,
          confirmations: checked ? [...currentConfirmations, value] : currentConfirmations.filter((item) => item !== value),
        }));
      } else if (name === "sameAsPermanent") {
        setFormData((prev) => ({ ...prev, sameAsPermanent: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !agreedToTerms) {
      alert("Vui lòng đồng ý với điều khoản để tiếp tục");
      return;
    }

    if (currentStep === 2) {
      if (!validateStep2()) return;
    }



    if (currentStep === 3) {
      if (!validateStep3()) return;
    }



    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };


  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng ký thất bại");

      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/dang-nhap");
    } catch (error) {
      console.error("Lỗi:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5].map(step => (
        <div key={step} className={`step-bar ${currentStep >= step ? "active" : ""}`}></div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="register-step">
      <h2 className="step-title">Đăng ký tài khoản</h2>
      {examInfo && (
        <div className="info-box-small" style={{ border: '1px solid #0066cc', background: '#f0f9ff' }}>
          <h4 style={{ color: '#0066cc' }}>Bạn đang đăng ký cho:</h4>
          <p style={{ fontWeight: 'bold' }}>{examInfo}</p>
        </div>
      )}
      <div className="info-box">
        <h3 className="info-title"><ClipboardList className="info-icon" size={24} />Quy trình đăng ký</h3>
        <ol className="info-list">
          <li>Xác minh danh tính - CCCD/CMND</li>
          <li>Thông tin liên hệ & Mật khẩu</li>
          <li>Thông tin UAV</li>
          <li>Xác nhận thông tin</li>
        </ol>
      </div>
      <div className="terms-section">
        <label className="checkbox-label required-checkbox">
          <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
          <span>Tôi cam kết cung cấp thông tin trung thực và chính xác</span>
        </label>
      </div>
      <button type="button" onClick={handleNext} className={`btn btn-primary btn-full ${!agreedToTerms ? "btn-disabled" : ""}`} disabled={!agreedToTerms}>
        Tiếp tục <ArrowRight size={20} />
      </button>
    </div>
  );

  // const renderStep2 = () => (
  //     <div className="register-step">
  //       <h2 className="step-title">Thông tin cá nhân</h2>
  //       <div className="form-section">
  //         <div className="form-row">
  //            <div className="form-group"><label>Họ và tên</label><input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="form-input" required /></div>
  //            <div className="form-group"><label>Ngày sinh</label><input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} className="form-input" required /></div>
  //         </div>
  //         <div className="form-row">
  //            <div className="form-group"><label>Số CCCD</label><input type="text" name="cccd" value={formData.cccd} onChange={handleInputChange} className="form-input" required /></div>
  //            <div className="form-group"><label>Giới tính</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select"><option value="">Chọn</option><option value="male">Nam</option><option value="female">Nữ</option></select></div>
  //         </div>
  //          <div className="form-group"><label>Địa chỉ thường trú</label><input type="text" name="address" value={formData.address} onChange={handleInputChange} className="form-input" placeholder="Số nhà, đường" /></div>
  //          <div className="form-row">
  //               <div className="form-group"><label>Tỉnh/Thành</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} className="form-input" /></div>
  //               <div className="form-group"><label>Quận/Huyện</label><input type="text" name="district" value={formData.district} onChange={handleInputChange} className="form-input" /></div>
  //          </div>
  //       </div>
  //       <div className="form-actions">
  //          <button type="button" onClick={handleBack} className="btn btn-secondary"><ArrowLeft size={20} /> Quay lại</button>
  //          <button type="button" onClick={handleNext} className="btn btn-primary">Tiếp tục <ArrowRight size={20} /></button>
  //       </div>
  //     </div>
  // );
  const renderStep2 = () => (
    <div className="register-step">
      <h2 className="step-title">Thông tin cá nhân</h2>

      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label>Họ và tên</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`form-input ${errors.fullName ? "input-error" : ""}`}
            />
            {errors.fullName && <p className="error-text">{errors.fullName}</p>}

          </div>

          <div className="form-group">
            <label>Ngày sinh</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              className={`form-input ${errors.birthDate ? "input-error" : ""}`}
            />
            {errors.birthDate && (
              <p className="error-text">{errors.birthDate}</p>
            )}
          </div>

        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Số CCCD</label>
            <input
              type="text"
              name="cccd"
              value={formData.cccd}
              onChange={handleInputChange}
              className={`form-input ${errors.cccd ? "input-error" : ""}`}
            />
            {errors.cccd && <p className="error-text">{errors.cccd}</p>}
          </div>


          <div className="form-group">
            <label>Giới tính</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={`form-select ${errors.gender ? "input-error" : ""}`}
            >
              <option value="">Chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>

            {errors.gender && (
              <p className="error-text">{errors.gender}</p>
            )}
          </div>

        </div>



        <div className="form-group">
          <label>Địa chỉ thường trú</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className={`form-input ${errors.address ? "input-error" : ""}`}
            placeholder="Số nhà, đường"
          />

          {errors.address && (
            <p className="error-text">{errors.address}</p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tỉnh/Thành</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className={`form-input ${errors.city ? "input-error" : ""}`}
              required
            />
            {errors.city && (
              <p className="error-text">{errors.city}</p>
            )}
          </div>

          <div className="form-group">
            <label>Quận/Huyện</label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleInputChange}
              className={`form-input ${errors.district ? "input-error" : ""}`}
              required
            />
            {errors.district && (
              <p className="error-text">{errors.district}</p>
            )}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={handleBack} className="btn btn-secondary">
          <ArrowLeft size={20} /> Quay lại
        </button>
        <button type="button" onClick={handleNext} className="btn btn-primary">
          Tiếp tục <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="register-step">
      <h2 className="step-title">Liên hệ & Bảo mật</h2>
      <div className="form-section">
        <h3>Thông tin đăng nhập</h3>
        <div className="form-group"><label>Email</label><input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`form-input ${errors.email ? "input-error" : ""}`}
        />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>
        <div className="form-group"><label>Số điện thoại</label><input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className={`form-input ${errors.phone ? "input-error" : ""}`}
        />
          {errors.phone && <p className="error-text">{errors.phone}</p>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? "input-error" : ""}`}
              />
              {errors.password && <p className="error-text">{errors.password}</p>}

              <Lock size={16} style={{ position: 'absolute', right: 10, top: 14, color: '#999' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Nhập lại mật khẩu</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${errors.confirmPassword ? "input-error" : ""}`}
            />
            {errors.confirmPassword && (
              <p className="error-text">{errors.confirmPassword}</p>
            )}

          </div>
        </div>
      </div>
      <div className="form-section">
        <h3>Liên hệ khẩn cấp</h3>
        <div className="form-row">
          <div className="form-group"><label>Họ tên người liên hệ</label><input
            type="text"
            name="emergencyName"
            value={formData.emergencyName}
            onChange={handleInputChange}
            className={`form-input ${errors.emergencyName ? "input-error" : ""}`}
          />
            {errors.emergencyName && (
              <p className="error-text">{errors.emergencyName}</p>
            )}
          </div>
          <div className="form-group"><label>Số điện thoại</label><input
            type="tel"
            name="emergencyPhone"
            value={formData.emergencyPhone}
            onChange={handleInputChange}
            className={`form-input ${errors.emergencyPhone ? "input-error" : ""}`}
          />
            {errors.emergencyPhone && (
              <p className="error-text">{errors.emergencyPhone}</p>
            )}
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" onClick={handleBack} className="btn btn-secondary"><ArrowLeft size={20} /> Quay lại</button>
        <button type="button" onClick={handleNext} className="btn btn-primary">Tiếp tục <ArrowRight size={20} /></button>
      </div>
    </div>
  );

  // --- STEP 4 CÓ PHẦN TỰ CHỌN HẠNG ---
  const renderStep4 = () => (
    <div className="register-step">
      <h2 className="step-title">Thông tin UAV</h2>
      <div className="form-section">
        <h3>Loại UAV</h3>
        <div className="checkbox-grid">
          {["DJI Mini", "DJI Mavic", "DJI Phantom", "Autel", "Khác"].map(t => (
            <label key={t} className="checkbox-label"><input type="checkbox" name="uavType" value={t} checked={formData.uavTypes.includes(t)} onChange={handleInputChange} /> <span>{t}</span></label>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>Khu vực hoạt động</label>
        <select name="activityArea" value={formData.activityArea} onChange={handleInputChange} className="form-select">
          <option value="">Chọn khu vực</option><option value="hanoi">Hà Nội</option><option value="hcm">TP.HCM</option>
        </select>
      </div>

      {/* PHẦN QUAN TRỌNG: CHỌN HẠNG CHỨNG CHỈ */}
      <div className="form-section">
        <h3>Loại chứng chỉ</h3>

        {preSelectedTier && (
          <div style={{ marginBottom: '15px', padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', gap: '10px' }}>
            <CheckCircle size={20} />
            <span>Hệ thống đã tự chọn <strong>Hạng {preSelectedTier}</strong> dựa trên lịch thi bạn vừa chọn.</span>
          </div>
        )}

        <div className="radio-list">
          <label className="radio-option" style={formData.certificateType === "A" ? { borderColor: '#0066cc', background: '#f0f9ff' } : {}}>
            <input type="radio" name="certificateType" value="A" checked={formData.certificateType === "A"} onChange={handleInputChange} />
            <span>Hạng A (&lt; 250g)</span>
          </label>
          <label className="radio-option" style={formData.certificateType === "B" ? { borderColor: '#0066cc', background: '#f0f9ff' } : {}}>
            <input type="radio" name="certificateType" value="B" checked={formData.certificateType === "B"} onChange={handleInputChange} />
            <span>Hạng B (&gt; 250g)</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={handleBack} className="btn btn-secondary"><ArrowLeft size={20} /> Quay lại</button>
        <button type="button" onClick={handleNext} className="btn btn-primary">Tiếp tục <ArrowRight size={20} /></button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="register-step">
      <h2 className="step-title">Xác nhận thông tin</h2>
      <div className="summary-section">
        <div className="summary-item"><strong>Họ tên:</strong> {formData.fullName}</div>
        <div className="summary-item"><strong>Email:</strong> {formData.email}</div>
        <div className="summary-item"><strong>SĐT:</strong> {formData.phone}</div>
        <div className="summary-item"><strong>Chứng chỉ:</strong> Hạng {formData.certificateType}</div>
      </div>
      <div className="form-section">
        <label className="checkbox-label"><input type="checkbox" name="confirmation" value="confirm1" onChange={handleInputChange} /> <span>Tôi xác nhận thông tin trên là chính xác</span></label>
      </div>
      <div className="form-actions">
        <button type="button" onClick={handleBack} className="btn btn-secondary" disabled={isLoading}><ArrowLeft size={20} /> Quay lại</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Hoàn tất đăng ký"} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {renderStepIndicator()}
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;