import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterPage.css";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "../../config/apiConfig";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  ClipboardList,
  Lock,
  MapPin,
  CreditCard,
  User,
  Plane
} from "lucide-react";

// URL API
const API_URL = API_ENDPOINTS.AUTH + "/register";
const CHECK_EXISTENCE_URL = API_ENDPOINTS.AUTH + "/check-existence";

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [provinces, setProvinces] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [currentWards, setCurrentWards] = useState([]);

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [previewFront, setPreviewFront] = useState(null);
  const [previewBack, setPreviewBack] = useState(null);

  const preSelectedTier = location.state?.preSelectedTier || "";
  const examInfo = location.state?.examInfo || "";

  const [formData, setFormData] = useState({
    fullName: "", birthDate: "", cccd: "", gender: "", jobTitle: "", workPlace: "",
    cccdFront: null, cccdBack: null,
    permanentAddress: "", permanentCityId: "", permanentCityName: "", permanentWardId: "", permanentWardName: "",
    sameAsPermanent: false,
    currentAddress: "", currentCityId: "", currentCityName: "", currentWardId: "", currentWardName: "",
    email: "", phone: "", password: "", confirmPassword: "",
    emergencyName: "", emergencyRelation: "", emergencyPhone: "",
    uavTypes: [], uavPurpose: "", activityArea: "", experience: "", certificateType: preSelectedTier,
    confirmations: [],
  });

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const url = `${API_ENDPOINTS.LOCATION}/provinces`;
        console.log('Fetching provinces from:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('Provinces loaded:', data?.length, 'items');
        if (Array.isArray(data)) {
          setProvinces(data);
        } else {
          console.error('Provinces data is not an array:', data);
        }
      } catch (error) {
        console.error('Error loading provinces:', error);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // Real-time email validation
  useEffect(() => {
    if (formData.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email)) {
        setErrors(prev => ({ ...prev, email: 'Email không hợp lệ (chỉ cho phép ký tự ASCII)' }));
      } else {
        setErrors(prev => { const newErrs = { ...prev }; delete newErrs.email; return newErrs; });
      }
    } else {
      setErrors(prev => { const newErrs = { ...prev }; delete newErrs.email; return newErrs; });
    }
  }, [formData.email]);

  // Prevent non-ASCII characters in email
  const handleEmailKeyPress = (e) => {
    const char = String.fromCharCode(e.charCode);
    if (!/[a-zA-Z0-9@._%+-]/.test(char)) {
      e.preventDefault();
    }
  };

  // --- CHECK TRÙNG LẶP ---
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if ((name === 'email' || name === 'phone' || name === 'cccd') && value.trim() !== '') {
      setErrors(prev => { const newErrs = { ...prev }; delete newErrs[name]; return newErrs; });
      if (name === 'email' && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return;
      if (name === 'phone' && !/^0\d{9}$/.test(value)) return;
      if (name === 'cccd' && !/^\d{12}$/.test(value)) return;

      fetch(CHECK_EXISTENCE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: name, value: value.trim() }),
      })
        .then(response => response.json())
        .then(data => {
          console.log(`Check existence for ${name}:`, data);
          if (data.exists) {
            const fieldName = name === 'email' ? 'Email' : name === 'phone' ? 'Số điện thoại' : 'CCCD';
            setErrors(prev => ({ ...prev, [name]: `${fieldName} này đã được đăng ký!` }));
          }
        })
        .catch(error => console.error("Lỗi check existence:", error));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (errors[name] && name !== 'email') { setErrors(prev => { const newErrs = { ...prev }; delete newErrs[name]; return newErrs; }); }

    if (type === "checkbox") {
      if (name === "uavType") {
        const currentArray = formData.uavTypes;
        setFormData((prev) => ({ ...prev, uavTypes: checked ? [...currentArray, value] : currentArray.filter((item) => item !== value), }));
      } else if (name === "confirmation") {
        const currentConfirmations = formData.confirmations;
        setFormData((prev) => ({ ...prev, confirmations: checked ? [...currentConfirmations, value] : currentConfirmations.filter((item) => item !== value), }));
      } else if (name === "sameAsPermanent") {
        setFormData((prev) => ({
          ...prev, sameAsPermanent: checked,
          currentAddress: checked ? prev.permanentAddress : "",
          currentCityId: checked ? prev.permanentCityId : "",
          currentCityName: checked ? prev.permanentCityName : "",
          currentWardId: checked ? prev.permanentWardId : "",
          currentWardName: checked ? prev.permanentWardName : "",
        }));
      }
    } else if (type === "file") {
      const file = files[0];
      if (file) {
        if (name === "cccdFront") { setFormData(prev => ({ ...prev, cccdFront: file })); setPreviewFront(URL.createObjectURL(file)); }
        else if (name === "cccdBack") { setFormData(prev => ({ ...prev, cccdBack: file })); setPreviewBack(URL.createObjectURL(file)); }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePermanentCityChange = (e) => {
    const provinceId = e.target.value;
    const province = provinces.find(p => p.id == provinceId);
    setFormData(prev => ({ ...prev, permanentCityId: provinceId, permanentCityName: province?.name || "", permanentWardId: "", permanentWardName: "", }));
    if (provinceId) { fetch(`${API_ENDPOINTS.LOCATION}/wards?province_id=${provinceId}`).then(res => res.json()).then(setPermanentWards).catch(console.error); } else setPermanentWards([]);
  };

  const handleCurrentCityChange = (e) => {
    const provinceId = e.target.value;
    const province = provinces.find(p => p.id == provinceId);
    setFormData(prev => ({ ...prev, currentCityId: provinceId, currentCityName: province?.name || "", currentWardId: "", currentWardName: "", }));
    if (provinceId) { fetch(`${API_ENDPOINTS.LOCATION}/wards?province_id=${provinceId}`).then(res => res.json()).then(setCurrentWards).catch(console.error); } else setCurrentWards([]);
  };

  // --- VALIDATION ---
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.cccdFront) newErrors.cccdFront = "Thiếu ảnh mặt trước";
    if (!formData.cccdBack) newErrors.cccdBack = "Thiếu ảnh mặt sau";
    if (!formData.fullName?.trim()) newErrors.fullName = "Vui lòng nhập họ và tên";
    if (!formData.birthDate) newErrors.birthDate = "Vui lòng chọn ngày sinh";
    if (!formData.cccd || !/^\d{12}$/.test(formData.cccd)) newErrors.cccd = "CCCD phải gồm đúng 12 chữ số";
    if (!formData.gender) newErrors.gender = "Vui lòng chọn giới tính";
    if (!formData.permanentAddress?.trim()) newErrors.permanentAddress = "Nhập địa chỉ cụ thể";
    if (!formData.permanentCityId) newErrors.permanentCityId = "Chọn Tỉnh/Thành";
    if (!formData.permanentWardId) newErrors.permanentWardId = "Chọn Xã/Phường";
    if (!formData.sameAsPermanent) {
      if (!formData.currentAddress?.trim()) newErrors.currentAddress = "Nhập địa chỉ cụ thể";
      if (!formData.currentCityId) newErrors.currentCityId = "Chọn Tỉnh/Thành";
      if (!formData.currentWardId) newErrors.currentWardId = "Chọn Xã/Phường";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.email?.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) newErrors.email = "Email không hợp lệ (chỉ cho phép ký tự ASCII)";
    if (errors.email) newErrors.email = errors.email; // Kế thừa lỗi từ API check

    if (!formData.phone?.trim()) newErrors.phone = "Vui lòng nhập SĐT";
    else if (!/^0\d{9}$/.test(formData.phone)) newErrors.phone = "SĐT không hợp lệ";
    if (errors.phone) newErrors.phone = errors.phone; // Kế thừa lỗi từ API check

    if (!formData.password || formData.password.length < 6) newErrors.password = "Mật khẩu tối thiểu 6 ký tự";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Mật khẩu không khớp";

    if (!formData.emergencyName?.trim()) newErrors.emergencyName = "Nhập tên người liên hệ";
    if (!formData.emergencyRelation?.trim()) newErrors.emergencyRelation = "Nhập mối quan hệ";
    if (!formData.emergencyPhone?.trim() || !/^0\d{9}$/.test(formData.emergencyPhone)) newErrors.emergencyPhone = "SĐT người liên hệ không hợp lệ";
    if (formData.emergencyPhone === formData.phone) newErrors.emergencyPhone = "SĐT khẩn cấp không được trùng SĐT chính";

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      toast.warning("Vui lòng kiểm tra lại thông tin");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (!formData.uavPurpose?.trim()) newErrors.uavPurpose = "Vui lòng nhập mục đích sử dụng";
    if (!formData.activityArea) newErrors.activityArea = "Vui lòng chọn khu vực hoạt động";
    if (!formData.experience) newErrors.experience = "Vui lòng chọn kinh nghiệm bay";
    if (!formData.uavTypes || formData.uavTypes.length === 0) newErrors.uavTypes = "Vui lòng chọn ít nhất một loại thiết bị";

    // --- SỬA LỖI Ở ĐÂY: BẮT BUỘC CHỌN ---
    if (!formData.certificateType) newErrors.certificateType = "Vui lòng chọn hạng chứng chỉ";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleNext = () => {
    if (currentStep === 1 && !agreedToTerms) return toast.error("Vui lòng đồng ý điều khoản");
    if (currentStep === 2) { if (!validateStep2()) return; }
    if (currentStep === 3) { if (!validateStep3()) return; }
    if (currentStep === 4) { if (!validateStep4()) return; }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // === VALIDATE TẤT CẢ CÁC STEPS TRƯỚC KHI SUBMIT ===
      const allErrors = {};
      
      // Validate Step 2
      if (!formData.phone?.trim() || !/^0\d{9}$/.test(formData.phone)) allErrors.phone = "SĐT không hợp lệ";
      if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) allErrors.email = "Email không hợp lệ";
      if (!formData.password?.trim() || formData.password.length < 6) allErrors.password = "Mật khẩu phải >= 6 ký tự";
      if (formData.password !== formData.confirmPassword) allErrors.confirmPassword = "Mật khẩu không trùng khớp";
      if (!formData.fullName?.trim()) allErrors.fullName = "Họ tên không được bỏ trống";
      
      // Validate Step 3
      if (!formData.birthDate) allErrors.birthDate = "Ngày sinh không được bỏ trống";
      if (!formData.cccd?.trim()) allErrors.cccd = "CCCD/CMND không được bỏ trống";
      if (!formData.gender) allErrors.gender = "Giới tính không được bỏ trống";
      if (!formData.jobTitle?.trim()) allErrors.jobTitle = "Nghề nghiệp không được bỏ trống";
      if (!formData.workPlace?.trim()) allErrors.workPlace = "Nơi làm việc không được bỏ trống";
      if (!formData.permanentAddress?.trim()) allErrors.permanentAddress = "Địa chỉ hộ khẩu không được bỏ trống";
      if (!formData.permanentCityId) allErrors.permanentCityId = "Tỉnh/TP hộ khẩu không được bỏ trống";
      if (!formData.permanentWardId) allErrors.permanentWardId = "Xã/Phường hộ khẩu không được bỏ trống";
      if (!formData.sameAsPermanent && !formData.currentAddress?.trim()) allErrors.currentAddress = "Địa chỉ hiện tại không được bỏ trống";
      if (!formData.sameAsPermanent && !formData.currentCityId) allErrors.currentCityId = "Tỉnh/TP hiện tại không được bỏ trống";
      if (!formData.sameAsPermanent && !formData.currentWardId) allErrors.currentWardId = "Xã/Phường hiện tại không được bỏ trống";
      if (!formData.emergencyName?.trim()) allErrors.emergencyName = "Tên người liên hệ không được bỏ trống";
      if (!formData.emergencyPhone?.trim() || !/^0\d{9}$/.test(formData.emergencyPhone)) allErrors.emergencyPhone = "SĐT người liên hệ không hợp lệ";
      if (!formData.emergencyRelation?.trim()) allErrors.emergencyRelation = "Mối quan hệ không được bỏ trống";
      
      // Validate Step 4
      if (!formData.uavTypes || formData.uavTypes.length === 0) allErrors.uavTypes = "Phải chọn ít nhất 1 loại UAV";
      if (!formData.uavPurpose?.trim()) allErrors.uavPurpose = "Mục đích sử dụng không được bỏ trống";
      if (!formData.activityArea) allErrors.activityArea = "Khu vực hoạt động không được bỏ trống";
      if (!formData.experience) allErrors.experience = "Kinh nghiệm bay không được bỏ trống";
      if (!formData.certificateType) allErrors.certificateType = "Hạng chứng chỉ không được bỏ trống";
      
      // Validate CCCD images
      if (!formData.cccdFront) allErrors.cccdFront = "Ảnh CCCD mặt trước không được bỏ trống";
      if (!formData.cccdBack) allErrors.cccdBack = "Ảnh CCCD mặt sau không được bỏ trống";
      
      // Nếu có lỗi, báo chi tiết
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        const missingFields = Object.values(allErrors).join('\n');
        toast.error(`❌ Vui lòng kiểm tra lại:\n\n${missingFields}`);
        setIsLoading(false);
        return;
      }

      let cccdFrontUrl = null;
      let cccdBackUrl = null;

      // Upload CCCD Front lên backend (proxy Cloudinary)
      if (formData.cccdFront) {
        const formDataFront = new FormData();
        formDataFront.append('file', formData.cccdFront);

        const resFront = await fetch(`${API_ENDPOINTS.CLOUDINARY}/upload-cccd`, {
          method: 'POST',
          body: formDataFront
        });
        const dataFront = await resFront.json();
        if (!resFront.ok) throw new Error(dataFront.error || 'Không thể upload CCCD mặt trước');
        cccdFrontUrl = dataFront.secure_url;
      }

      // Upload CCCD Back lên backend (proxy Cloudinary)
      if (formData.cccdBack) {
        const formDataBack = new FormData();
        formDataBack.append('file', formData.cccdBack);

        const resBack = await fetch(`${API_ENDPOINTS.CLOUDINARY}/upload-cccd`, {
          method: 'POST',
          body: formDataBack
        });
        const dataBack = await resBack.json();
        if (!resBack.ok) throw new Error(dataBack.error || 'Không thể upload CCCD mặt sau');
        cccdBackUrl = dataBack.secure_url;
      }

      const submitData = {
        ...formData,
        // Auto-fill currentAddress nếu sameAsPermanent=true và currentAddress trống
        currentAddress: formData.sameAsPermanent && !formData.currentAddress ? formData.permanentAddress : formData.currentAddress,
        currentCityId: formData.sameAsPermanent && !formData.currentCityId ? formData.permanentCityId : formData.currentCityId,
        currentCityName: formData.sameAsPermanent && !formData.currentCityName ? formData.permanentCityName : formData.currentCityName,
        currentWardId: formData.sameAsPermanent && !formData.currentWardId ? formData.permanentWardId : formData.currentWardId,
        currentWardName: formData.sameAsPermanent && !formData.currentWardName ? formData.permanentWardName : formData.currentWardName,
        finalPermanentAddress: `${formData.permanentAddress}, ${formData.permanentWardName}, ${formData.permanentCityName}`,
        finalCurrentAddress: formData.sameAsPermanent ? `${formData.permanentAddress}, ${formData.permanentWardName}, ${formData.permanentCityName}` : `${formData.currentAddress}, ${formData.currentWardName}, ${formData.currentCityName}`,
        cccdFront: cccdFrontUrl,
        cccdBack: cccdBackUrl
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng ký thất bại");
      console.log("Đăng ký thành công, hiển thị toast");
      toast.success("Đăng ký thành công! Tài khoản của bạn đang chờ kiểm duyệt từ quản trị viên.");
      setTimeout(() => navigate("/dang-nhap"), 1000); // Delay 1s để toast hiện
    } catch (err) {
      toast.error(err.message);
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
      <h2 className="step-title">Quy định & Điều khoản</h2>
      {examInfo && (
        <div className="info-box-small info-box-exam">
          <h4 className="info-box-exam-title">Đăng ký thi:</h4>
          <p className="info-box-exam-text">{examInfo}</p>
        </div>
      )}
      <div className="info-box">
        <h3 className="info-title">
          <ClipboardList className="info-icon" size={24} />
          Quy trình
        </h3>
        <ol className="info-list">
          <li>
            <strong>Quan trọng:</strong> Chuẩn bị ảnh chụp CCCD mặt trước và mặt sau rõ nét.
          </li>
          <li>Kê khai thông tin cư trú chính xác.</li>
          <li>Cung cấp thông tin liên hệ khẩn cấp.</li>
        </ol>
      </div>

      <div className="terms-section"><label className="checkbox-label required-checkbox"><input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} /><span>Tôi cam kết các thông tin khai báo là trung thực</span></label></div>
      <button type="button" onClick={handleNext} className={`btn btn-primary btn-full ${!agreedToTerms ? "btn-disabled" : ""}`}>Bắt đầu đăng ký <ArrowRight size={20} /></button>
    </div>
  );

  const renderStep2 = () => (
    <div className="register-step">
      <h2 className="step-title">Thông tin cá nhân</h2>

      {/* CCCD SECTION */}
      <div className="form-section">
        <h3><CreditCard size={20} style={{ marginBottom: '-4px', marginRight: '8px' }} />Ảnh chụp CCCD/CMND</h3>
        <p style={{ fontSize: '0.9rem', color: '#b0b0b0', marginBottom: '15px' }}>Vui lòng tải lên ảnh chụp rõ nét, không bị lóa.</p>
        <div className="form-row">
          <div className="form-group">
            <label>Mặt trước <span style={{ color: 'red' }}>*</span></label>
            <div className="camera-box" style={{ margin: 0 }}>
              <label className="camera-placeholder" style={{ cursor: 'pointer', overflow: 'hidden', height: '180px' }}>
                {previewFront ? (
                  <img src={previewFront} alt="CCCD Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} className="camera-icon" />
                    <p className="camera-instruction">Tải lên mặt trước</p>
                  </div>
                )}
                <input type="file" name="cccdFront" accept="image/*" onChange={handleInputChange} style={{ display: 'none' }} />
              </label>
              {errors.cccdFront && <p className="error-text" style={{ textAlign: 'center' }}>{errors.cccdFront}</p>}
            </div>
          </div>
          <div className="form-group">
            <label>Mặt sau <span style={{ color: 'red' }}>*</span></label>
            <div className="camera-box" style={{ margin: 0 }}>
              <label className="camera-placeholder" style={{ cursor: 'pointer', overflow: 'hidden', height: '180px' }}>
                {previewBack ? (
                  <img src={previewBack} alt="CCCD Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} className="camera-icon" />
                    <p className="camera-instruction">Tải lên mặt sau</p>
                  </div>
                )}
                <input type="file" name="cccdBack" accept="image/*" onChange={handleInputChange} style={{ display: 'none' }} />
              </label>
              {errors.cccdBack && <p className="error-text" style={{ textAlign: 'center' }}>{errors.cccdBack}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* BASIC INFO SECTION */}
      <div className="form-section">
        <h3>Thông tin cơ bản</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Họ và tên</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={`form-input ${errors.fullName ? "input-error" : ""}`} placeholder="NHẬP CHỮ IN HOA" />
            {errors.fullName && <p className="error-text">{errors.fullName}</p>}
          </div>
          <div className="form-group">
            <label>Ngày sinh</label>
            <input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} className={`form-input ${errors.birthDate ? "input-error" : ""}`} />
            {errors.birthDate && <p className="error-text">{errors.birthDate}</p>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Số CCCD/CMND</label>
            <input type="text" name="cccd" value={formData.cccd} onChange={handleInputChange} onBlur={handleBlur} className={`form-input ${errors.cccd ? "input-error" : ""}`} placeholder="Nhập 12 chữ số" maxLength="12" />
            {errors.cccd && <p className="error-text">{errors.cccd}</p>}
          </div>
          <div className="form-group">
            <label>Giới tính</label>
            <select name="gender" value={formData.gender} onChange={handleInputChange} className={`form-select ${errors.gender ? "input-error" : ""}`}>
              <option value="">--Chọn--</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
            {errors.gender && <p className="error-text">{errors.gender}</p>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nghề nghiệp <span style={{ fontWeight: 'normal', fontSize: '12px' }}>(Tùy chọn)</span></label>
            <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Đơn vị công tác <span style={{ fontWeight: 'normal', fontSize: '12px' }}>(Tùy chọn)</span></label>
            <input type="text" name="workPlace" value={formData.workPlace} onChange={handleInputChange} className="form-input" />
          </div>
        </div>
      </div>

      {/* PERMANENT ADDRESS SECTION */}
      <div className="form-section">
        <h3><MapPin size={18} style={{ display: 'inline', marginBottom: '-3px' }} /> Hộ khẩu thường trú</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Tỉnh/Thành phố</label>
            <select value={formData.permanentCityId} onChange={handlePermanentCityChange} className={`form-select ${errors.permanentCityId ? "input-error" : ""}`}>
              <option value="">-- Chọn --</option>
              {provinces && provinces.length > 0 ? (
                provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              ) : (
                <option disabled>Đang tải dữ liệu...</option>
              )}
            </select>
            {errors.permanentCityId && <p className="error-text">{errors.permanentCityId}</p>}
          </div>
          <div className="form-group">
            <label>Xã/Phường</label>
            <select value={formData.permanentWardId} onChange={(e) => { const ward = permanentWards.find(w => w.id == e.target.value); setFormData(prev => ({ ...prev, permanentWardId: ward?.id, permanentWardName: ward?.name })); }} className={`form-select ${errors.permanentWardId ? "input-error" : ""}`} disabled={!permanentWards || permanentWards.length === 0}>
              <option value="">-- Chọn --</option>
              {permanentWards && permanentWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {errors.permanentWardId && <p className="error-text">{errors.permanentWardId}</p>}
          </div>
        </div>
        <div className="form-group">
          <label>Số nhà, tên đường, thôn/xóm</label>
          <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} className={`form-input ${errors.permanentAddress ? "input-error" : ""}`} />
          {errors.permanentAddress && <p className="error-text">{errors.permanentAddress}</p>}
        </div>
      </div>

      {/* CURRENT ADDRESS SECTION */}
      <div className="form-section" style={{ marginTop: '30px', borderTop: '1px dashed #555', paddingTop: '20px' }}>
        <h3><MapPin size={18} style={{ display: 'inline', marginBottom: '-3px' }} /> Nơi ở hiện tại</h3>
        <label className="checkbox-label" style={{ marginBottom: '20px' }}>
          <input type="checkbox" name="sameAsPermanent" checked={formData.sameAsPermanent} onChange={handleInputChange} />
          <span>Giống hộ khẩu thường trú</span>
        </label>
        {!formData.sameAsPermanent && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Tỉnh/Thành phố</label>
                <select value={formData.currentCityId} onChange={handleCurrentCityChange} className={`form-select ${errors.currentCityId ? "input-error" : ""}`}>
                  <option value="">-- Chọn --</option>
                  {provinces && provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {errors.currentCityId && <p className="error-text">{errors.currentCityId}</p>}
              </div>
              <div className="form-group">
                <label>Xã/Phường</label>
                <select value={formData.currentWardId} onChange={(e) => { const ward = currentWards.find(w => w.id == e.target.value); setFormData(prev => ({ ...prev, currentWardId: ward?.id, currentWardName: ward?.name })); }} className={`form-select ${errors.currentWardId ? "input-error" : ""}`} disabled={!currentWards || currentWards.length === 0}>
                  <option value="">-- Chọn --</option>
                  {currentWards && currentWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {errors.currentWardId && <p className="error-text">{errors.currentWardId}</p>}
              </div>
            </div>
            <div className="form-group">
              <label>Số nhà, tên đường, thôn/xóm</label>
              <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} className={`form-input ${errors.currentAddress ? "input-error" : ""}`} />
              {errors.currentAddress && <p className="error-text">{errors.currentAddress}</p>}
            </div>
          </>
        )}
      </div>

      {/* FORM ACTIONS */}
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
        <h3>Tài khoản đăng nhập</h3>
        <div className="form-row">
          <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} onKeyPress={handleEmailKeyPress} className={`form-input ${errors.email ? "input-error" : ""}`} />{errors.email && <p className="error-text">{errors.email}</p>}</div>
          <div className="form-group"><label>Số điện thoại chính</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} onBlur={handleBlur} className={`form-input ${errors.phone ? "input-error" : ""}`} />{errors.phone && <p className="error-text">{errors.phone}</p>}</div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Mật khẩu</label><div style={{ position: 'relative' }}><input type="password" name="password" value={formData.password} onChange={handleInputChange} className={`form-input ${errors.password ? "input-error" : ""}`} /><Lock size={16} style={{ position: 'absolute', right: 10, top: 14, color: '#999' }} /></div>{errors.password && <p className="error-text">{errors.password}</p>}</div>
          <div className="form-group"><label>Nhập lại mật khẩu</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={`form-input ${errors.confirmPassword ? "input-error" : ""}`} />{errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}</div>
        </div>
      </div>

      <div className="form-section">
        <h3>Liên hệ khẩn cấp (Bắt buộc)</h3>
        <div className="info-box-small" style={{ marginTop: 0, marginBottom: '15px', padding: '10px' }}><ul><li>Dùng trong trường hợp xảy ra sự cố bay hoặc cần xác minh danh tính gấp.</li></ul></div>
        <div className="form-row">
          <div className="form-group"><label>Họ tên người thân</label><input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleInputChange} className={`form-input ${errors.emergencyName ? "input-error" : ""}`} />{errors.emergencyName && <p className="error-text">{errors.emergencyName}</p>}</div>
          <div className="form-group"><label>Mối quan hệ</label><div style={{ position: 'relative' }}><input type="text" name="emergencyRelation" value={formData.emergencyRelation} onChange={handleInputChange} className={`form-input ${errors.emergencyRelation ? "input-error" : ""}`} placeholder="VD: Bố đẻ" /><User size={16} style={{ position: 'absolute', right: 10, top: 14, color: '#999' }} /></div>{errors.emergencyRelation && <p className="error-text">{errors.emergencyRelation}</p>}</div>
        </div>
        <div className="form-group"><label>Số điện thoại liên hệ</label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleInputChange} className={`form-input ${errors.emergencyPhone ? "input-error" : ""}`} style={{ maxWidth: '100%' }} />{errors.emergencyPhone && <p className="error-text">{errors.emergencyPhone}</p>}</div>
      </div>

      <div className="form-actions"><button type="button" onClick={handleBack} className="btn btn-secondary"><ArrowLeft size={20} /> Quay lại</button><button type="button" onClick={handleNext} className="btn btn-primary">Tiếp tục <ArrowRight size={20} /></button></div>
    </div>
  );

  const renderStep4 = () => (
    <div className="register-step">
      <h2 className="step-title">Kinh nghiệm & Thiết bị UAV</h2>
      <div className="form-section"><h3>Thiết bị đang sử dụng</h3><div className="checkbox-grid" style={errors.uavTypes ? { border: '1px solid red', padding: '10px', borderRadius: '8px' } : {}}>{["DJI Mini", "DJI Mavic", "DJI Phantom", "DJI Inspire", "Autel", "FPV", "Cánh bằng", "Khác"].map(t => (<label key={t} className="checkbox-label"><input type="checkbox" name="uavType" value={t} checked={formData.uavTypes.includes(t)} onChange={handleInputChange} /> <span>{t}</span></label>))}</div>{errors.uavTypes && <p className="error-text">{errors.uavTypes}</p>}</div>
      <div className="form-section"><h3>Mục đích sử dụng</h3><div className="form-group"><label>Mô tả mục đích sử dụng UAV của bạn</label><textarea name="uavPurpose" value={formData.uavPurpose} onChange={handleInputChange} className={`form-input ${errors.uavPurpose ? "input-error" : ""}`} placeholder="VD: Quay phim sự kiện, Khảo sát công trình, Phun thuốc nông nghiệp..." style={{ height: '80px', resize: 'vertical' }} />{errors.uavPurpose && <p className="error-text">{errors.uavPurpose}</p>}</div></div>
      <div className="form-section"><h3>Khu vực hoạt động chính</h3><select name="activityArea" value={formData.activityArea} onChange={handleInputChange} className={`form-select ${errors.activityArea ? "input-error" : ""}`}><option value="">-- Chọn khu vực --</option><option value="hanoi">Hà Nội & Miền Bắc</option><option value="danang">Đà Nẵng & Miền Trung</option><option value="hcm">TP.HCM & Miền Nam</option></select>{errors.activityArea && <p className="error-text">{errors.activityArea}</p>}</div>
      <div className="form-section"><h3><Plane size={18} style={{ display: 'inline', marginBottom: '-3px' }} /> Kinh nghiệm bay</h3><div className="radio-list" style={{ border: errors.experience ? '1px solid red' : 'none', padding: errors.experience ? '10px' : '0', borderRadius: '8px' }}>{["Chưa có kinh nghiệm", "Dưới 6 tháng", "6-12 tháng", "1-3 năm", "Trên 3 năm"].map((exp) => (<label key={exp} className="radio-option" style={{ padding: '10px', border: 'none', borderBottom: '1px solid #444' }}><input type="radio" name="experience" value={exp} checked={formData.experience === exp} onChange={handleInputChange} /><span style={{ marginLeft: '10px' }}>{exp}</span></label>))}</div>{errors.experience && <p className="error-text">{errors.experience}</p>}</div>

      {/* KHU VỰC CHỌN HẠNG CÓ SỬA LỖI UI */}
      <div className="form-section">
        <h3>Đăng ký hạng chứng chỉ</h3>
        {preSelectedTier && (<div style={{ marginBottom: '15px', padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', gap: '10px' }}><CheckCircle size={20} /><span>Hệ thống tự chọn <strong>Hạng {preSelectedTier}</strong> theo lịch thi.</span></div>)}
        <div className="radio-list" style={errors.certificateType ? { border: '1px solid red', padding: '10px', borderRadius: '8px' } : {}}>
          <label className="radio-option" style={formData.certificateType === "A" ? { borderColor: '#0066cc', background: 'rgba(0, 80, 184, 0.1)' } : {}}><input type="radio" name="certificateType" value="A" checked={formData.certificateType === "A"} onChange={handleInputChange} /><div><span style={{ fontWeight: 'bold' }}>Hạng A (Cơ bản)</span><div style={{ fontSize: '0.85rem', color: '#b0b0b0' }}>Dành cho UAV &lt; 250g hoặc bay trong tầm nhìn.</div></div></label>
          <label className="radio-option" style={formData.certificateType === "B" ? { borderColor: '#0066cc', background: 'rgba(0, 80, 184, 0.1)' } : {}}><input type="radio" name="certificateType" value="B" checked={formData.certificateType === "B"} onChange={handleInputChange} /><div><span style={{ fontWeight: 'bold' }}>Hạng B (Nâng cao)</span><div style={{ fontSize: '0.85rem', color: '#b0b0b0' }}>Dành cho UAV &gt; 250g, bay BVLOS hoặc bay phun thuốc.</div></div></label>
        </div>
        {errors.certificateType && <p className="error-text">{errors.certificateType}</p>}
      </div>

      <div className="form-actions"><button type="button" onClick={handleBack} className="btn btn-secondary"><ArrowLeft size={20} /> Quay lại</button><button type="button" onClick={handleNext} className="btn btn-primary">Tiếp tục <ArrowRight size={20} /></button></div>
    </div>
  );

  const renderStep5 = () => (
    <div className="register-step">
      <h2 className="step-title">Xác nhận thông tin</h2>
      <div className="summary-section">
        <div className="summary-item"><strong>Họ tên:</strong> {formData.fullName.toUpperCase()}</div>
        <div className="summary-item"><strong>CCCD:</strong> {formData.cccd} (Đã tải ảnh)</div>
        <div className="summary-item"><strong>Thường trú:</strong> {formData.permanentAddress}, {formData.permanentWardName}, {formData.permanentCityName}</div>
        <div className="summary-item"><strong>Nơi ở:</strong> {formData.sameAsPermanent ? "Giống thường trú" : `${formData.currentAddress}, ${formData.currentWardName}, ${formData.currentCityName}`}</div>
        <div className="summary-item"><strong>Email:</strong> {formData.email}</div>
        <div className="summary-item"><strong>SĐT:</strong> {formData.phone}</div>
        <div className="summary-item"><strong>Khẩn cấp:</strong> {formData.emergencyName} - {formData.emergencyRelation} ({formData.emergencyPhone})</div>
        <div className="summary-item"><strong>Kinh nghiệm:</strong> {formData.experience}</div>
        <div className="summary-item"><strong>Mục đích:</strong> {formData.uavPurpose}</div>
        <div className="summary-item"><strong>Chứng chỉ:</strong> Hạng {formData.certificateType}</div>
      </div>
      <div className="form-section"><label className="checkbox-label required-checkbox"><input type="checkbox" name="confirmation" value="confirmed" onChange={(e) => { if (e.target.checked) setFormData(prev => ({ ...prev, confirmations: ['confirmed'] })); else setFormData(prev => ({ ...prev, confirmations: [] })) }} /> <span>Tôi xin cam đoan các thông tin trên là đúng sự thật và chịu trách nhiệm trước pháp luật.</span></label></div>
      <div className="form-actions"><button type="button" onClick={handleBack} className="btn btn-secondary" disabled={isLoading}><ArrowLeft size={20} /> Quay lại</button><button type="submit" className="btn btn-primary" disabled={isLoading || formData.confirmations.length === 0}>{isLoading ? "Đang xử lý..." : "Hoàn tất đăng ký"} <ArrowRight size={20} /></button></div>
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