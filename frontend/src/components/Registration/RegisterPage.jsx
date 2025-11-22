import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';
import { ArrowLeft, ArrowRight, Camera, CheckCircle } from 'lucide-react';

function RegisterPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [formData, setFormData] = useState({
        // Bước 1: Xác minh danh tính
        verificationType: 'qr', // 'qr' hoặc 'upload'
        
        // Bước 2: Thông tin cá nhân (gộp với CCCD)
        fullName: '',
        birthDate: '',
        cccd: '',
        idNumber: '',
        issueDate: '',
        gender: '',
        address: '',
        ward: '',
        district: '',
        city: '',
        
        // Bước 3: Thông tin liên hệ
        email: '',
        emailConfirm: '',
        phone: '',
        
        // Địa chỉ thường trú
        permanentCity: '',
        permanentDistrict: '',
        permanentWard: '',
        permanentAddress: '',
        
        // Địa chỉ hiện tại
        sameAsPermanent: false,
        currentCity: '',
        currentDistrict: '',
        currentWard: '',
        currentAddress: '',
        
        // Thông tin liên hệ khẩn cấp
        emergencyName: '',
        emergencyRelation: '',
        emergencyPhone: '',
        
        // Bước 4: Thông tin UAV
        uavTypes: [],
        uavPurposes: [],
        activityArea: '',
        experience: '',
        certificateType: '',
        
        // Xác nhận
        confirmations: []
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            if (name.includes('uavType') || name.includes('uavPurpose')) {
                const arrayName = name.includes('uavType') ? 'uavTypes' : 'uavPurposes';
                const currentArray = formData[arrayName];
                
                setFormData(prev => ({
                    ...prev,
                    [arrayName]: checked 
                        ? [...currentArray, value]
                        : currentArray.filter(item => item !== value)
                }));
            } else if (name === 'confirmation') {
                const currentConfirmations = formData.confirmations;
                setFormData(prev => ({
                    ...prev,
                    confirmations: checked
                        ? [...currentConfirmations, value]
                        : currentConfirmations.filter(item => item !== value)
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleNext = () => {
        // Kiểm tra checkbox ở bước 1
        if (currentStep === 1 && !agreedToTerms) {
            alert('Vui lòng đồng ý với điều khoản để tiếp tục');
            return;
        }
        
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Registration data:', formData);
        alert('Đăng ký thành công!');
        navigate('/dang-nhap');
    };

    const renderStepIndicator = () => (
        <div className="step-indicator">
            <div className={`step-bar ${currentStep >= 1 ? 'active' : ''}`}></div>
            <div className={`step-bar ${currentStep >= 2 ? 'active' : ''}`}></div>
            <div className={`step-bar ${currentStep >= 3 ? 'active' : ''}`}></div>
            <div className={`step-bar ${currentStep >= 4 ? 'active' : ''}`}></div>
            <div className={`step-bar ${currentStep >= 5 ? 'active' : ''}`}></div>
        </div>
    );

    const renderStep1 = () => (
        <div className="register-step">
            <h2 className="step-title">Đăng ký tài khoản</h2>
            
            <div className="info-box">
                <h3 className="info-title">
                    <span className="info-icon">📋</span>
                    Quy trình đăng ký tài khoản
                </h3>
                <p className="info-subtitle">Hoàn thành các bước sau để tạo tài khoản và bắt đầu học tập</p>
                <ol className="info-list">
                    <li>Xác minh danh tính - Quét mã QR từ CCCD/CMND</li>
                    <li>Thông tin liên hệ - Cung cấp thông tin email, SĐT và địa chỉ</li>
                    <li>Thông tin UAV - Đăng ký loại UAV dự định sử dụng</li>
                    <li>Xác nhận thông tin - Kiểm tra lại thông tin đã cung cấp</li>
                    <li>Tạo mật khẩu - Thiết lập mật khẩu và xác minh email</li>
                </ol>
                <p className="info-note">
                    <span className="clock-icon">🕐</span>
                    Thời gian hoàn thành: khoảng 5-10 phút
                </p>
                <p className="info-highlight">
                    <CheckCircle size={16} />
                    Đăng ký tài khoản hoàn toàn miễn phí
                </p>
            </div>

            <div className="terms-section">
                <h3>Điều khoản ban đầu</h3>
                <p className="terms-intro">Bằng việc tiếp tục, bạn đồng ý:</p>
                <ul className="terms-list">
                    <li>Cung cấp thông tin chính xác và đầy đủ</li>
                    <li>Tuân thủ quy định về bảo mật thông tin</li>
                    <li>Chịu trách nhiệm về tính xác thực của thông tin cung cấp</li>
                </ul>
                <label className="checkbox-label required-checkbox">
                    <input 
                        type="checkbox" 
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <span>Tôi cam kết cung cấp thông tin trung thực và chính xác</span>
                </label>
            </div>

            <button 
                type="button" 
                onClick={handleNext} 
                className={`btn btn-primary btn-full ${!agreedToTerms ? 'btn-disabled' : ''}`}
                disabled={!agreedToTerms}
            >
                Tiếp tục với CCCD/CMND
                <ArrowRight size={20} />
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div className="register-step">
            <h2 className="step-title">Xác minh danh tính qua CCCD/CMND</h2>

            <div className="verification-options">
                <label className="radio-option">
                    <input
                        type="radio"
                        name="verificationType"
                        value="qr"
                        checked={formData.verificationType === 'qr'}
                        onChange={handleInputChange}
                    />
                    <span>Quét mã QR từ CCCD gắn chip (khuyến nghị)</span>
                </label>
                <label className="radio-option">
                    <input
                        type="radio"
                        name="verificationType"
                        value="upload"
                        checked={formData.verificationType === 'upload'}
                        onChange={handleInputChange}
                    />
                    <span>Tải lên ảnh CCCD/CMND</span>
                </label>
            </div>

            <div className="camera-box">
                <div className="camera-placeholder">
                    <Camera size={80} className="camera-icon" />
                </div>
                <button type="button" className="btn btn-primary btn-full">
                    <Camera size={20} />
                    Bật camera
                </button>
                <p className="camera-instruction">Đặt mã QR trên CCCD vào khung hình camera</p>
            </div>

            <div className="info-box-small">
                <h4>Hướng dẫn quét mã QR:</h4>
                <ul>
                    <li>Đặt mã QR ở mặt sau CCCD vào giữa khung hình camera</li>
                    <li>Đảm bảo mã QR nằm hoàn toàn trong khung hình và không bị che khuất</li>
                    <li>Giữ thiết bị ổn định, tránh rung lắc</li>
                    <li>Tìm nơi có đủ ánh sáng, tránh phần chiếu hoặc bóng dổ lên mã QR</li>
                    <li>Giữ khoảng cách phù hợp, không quá gần hoặc quá xa</li>
                    <li>Quá trình quét diễn ra tự động, không cần nhấn nút</li>
                </ul>
            </div>

            {/* Phần thông tin cá nhân */}
            <div className="form-section">
                <h3>Thông tin cá nhân</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Họ và tên</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Ngày tháng năm sinh</label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="mm/dd/yyyy"
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Số CCCD/CMND</label>
                        <input
                            type="text"
                            name="cccd"
                            value={formData.cccd}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Số định danh</label>
                        <input
                            type="text"
                            name="idNumber"
                            value={formData.idNumber}
                            onChange={handleInputChange}
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Ngày cấp</label>
                        <input
                            type="date"
                            name="issueDate"
                            value={formData.issueDate}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="mm/dd/yyyy"
                        />
                    </div>
                    <div className="form-group">
                        <label>Giới tính</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="">Chọn giới tính</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Địa chỉ</label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Phường/Xã</label>
                        <input
                            type="text"
                            name="ward"
                            value={formData.ward}
                            onChange={handleInputChange}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Quận/Huyện</label>
                        <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleInputChange}
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Tỉnh/Thành phố</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                </div>
            </div>

            <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                    Quay lại
                </button>
                <button type="button" onClick={handleNext} className="btn btn-primary">
                    Tiếp tục
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="register-step">
            <h2 className="step-title">Thông tin liên hệ</h2>

            {/* Thông tin cơ bản */}
            <div className="form-section">
                <h3>Thông tin cơ bản</h3>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="example@email.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Xác nhận email</label>
                    <input
                        type="email"
                        name="emailConfirm"
                        value={formData.emailConfirm}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="example@email.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="0912345678"
                        required
                    />
                </div>
            </div>

            {/* Địa chỉ thường trú */}
            <div className="form-section">
                <h3>Địa chỉ thường trú</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Tỉnh/Thành phố</label>
                        <select
                            name="permanentCity"
                            value={formData.permanentCity}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="">Chọn Tỉnh/Thành phố</option>
                            <option value="hanoi">Hà Nội</option>
                            <option value="hcm">TP. Hồ Chí Minh</option>
                            <option value="danang">Đà Nẵng</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Quận/Huyện</label>
                        <select
                            name="permanentDistrict"
                            value={formData.permanentDistrict}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="">Chọn Quận/Huyện</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Phường/Xã</label>
                        <select
                            name="permanentWard"
                            value={formData.permanentWard}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="">Chọn Phường/Xã</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Địa chỉ chi tiết</label>
                        <input
                            type="text"
                            name="permanentAddress"
                            value={formData.permanentAddress}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Số nhà, đường, khu phố"
                        />
                    </div>
                </div>
            </div>

            {/* Địa chỉ hiện tại */}
            <div className="form-section">
                <h3>Địa chỉ hiện tại</h3>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="sameAsPermanent"
                        checked={formData.sameAsPermanent}
                        onChange={handleInputChange}
                    />
                    <span>Giống địa chỉ thường trú</span>
                </label>

                {!formData.sameAsPermanent && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tỉnh/Thành phố</label>
                                <select
                                    name="currentCity"
                                    value={formData.currentCity}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="">Chọn Tỉnh/Thành phố</option>
                                    <option value="hanoi">Hà Nội</option>
                                    <option value="hcm">TP. Hồ Chí Minh</option>
                                    <option value="danang">Đà Nẵng</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quận/Huyện</label>
                                <select
                                    name="currentDistrict"
                                    value={formData.currentDistrict}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="">Chọn Quận/Huyện</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phường/Xã</label>
                                <select
                                    name="currentWard"
                                    value={formData.currentWard}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="">Chọn Phường/Xã</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Địa chỉ chi tiết</label>
                                <input
                                    type="text"
                                    name="currentAddress"
                                    value={formData.currentAddress}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Số nhà, đường, khu phố"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Thông tin liên hệ khẩn cấp */}
            <div className="form-section">
                <h3>Thông tin liên hệ khẩn cấp</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Họ tên người liên hệ</label>
                        <input
                            type="text"
                            name="emergencyName"
                            value={formData.emergencyName}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Nguyễn Văn A"
                        />
                    </div>
                    <div className="form-group">
                        <label>Mối quan hệ</label>
                        <select
                            name="emergencyRelation"
                            value={formData.emergencyRelation}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="">Chọn mối quan hệ</option>
                            <option value="father">Cha</option>
                            <option value="mother">Mẹ</option>
                            <option value="sibling">Anh/Chị/Em</option>
                            <option value="spouse">Vợ/Chồng</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                        type="tel"
                        name="emergencyPhone"
                        value={formData.emergencyPhone}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="0912345678"
                    />
                </div>
            </div>

            <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                    Quay lại
                </button>
                <button type="button" onClick={handleNext} className="btn btn-primary">
                    Tiếp tục
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="register-step">
            <h2 className="step-title">Thông tin về UAV</h2>

            <div className="form-section">
                <h3>Loại UAV dự định sử dụng</h3>
                <div className="checkbox-grid">
                    {['DJI Mini', 'DJI Mavic', 'DJI Phantom', 'Autel Robotics', 'Parrot', 'Khác'].map(type => (
                        <label key={type} className="checkbox-label">
                            <input
                                type="checkbox"
                                name="uavType"
                                value={type}
                                checked={formData.uavTypes.includes(type)}
                                onChange={handleInputChange}
                            />
                            <span>{type}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-section">
                <h3>Mục đích sử dụng</h3>
                <div className="checkbox-grid">
                    {['Cá nhân/Giải trí', 'Chụp ảnh/Quay phim', 'Thương mại', 'Nông nghiệp', 'Giám sát/An ninh', 'Nghiên cứu', 'Khác'].map(purpose => (
                        <label key={purpose} className="checkbox-label">
                            <input
                                type="checkbox"
                                name="uavPurpose"
                                value={purpose}
                                checked={formData.uavPurposes.includes(purpose)}
                                onChange={handleInputChange}
                            />
                            <span>{purpose}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Khu vực hoạt động dự kiến</label>
                <select
                    name="activityArea"
                    value={formData.activityArea}
                    onChange={handleInputChange}
                    className="form-select"
                >
                    <option value="">Chọn tỉnh/thành phố</option>
                    <option value="hanoi">Hà Nội</option>
                    <option value="hcm">TP. Hồ Chí Minh</option>
                    <option value="danang">Đà Nẵng</option>
                </select>
                <p className="field-note">
                    ⚠️ Lưu ý: Một số khu vực có thể bị cấm bay hoặc chế. Vui lòng kiểm tra quy định cụ thể trước khi bay.
                </p>
            </div>

            <div className="form-section">
                <h3>Kinh nghiệm bay UAV</h3>
                <div className="radio-list">
                    {[
                        { value: 'none', label: 'Chưa có kinh nghiệm' },
                        { value: 'under6', label: 'Dưới 6 tháng' },
                        { value: '6-12', label: '6-12 tháng' },
                        { value: '1-3', label: '1-3 năm' },
                        { value: 'over3', label: 'Trên 3 năm' }
                    ].map(exp => (
                        <label key={exp.value} className="radio-option">
                            <input
                                type="radio"
                                name="experience"
                                value={exp.value}
                                checked={formData.experience === exp.value}
                                onChange={handleInputChange}
                            />
                            <span>{exp.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-section">
                <h3>Lựa chọn loại chứng chỉ</h3>
                <div className="radio-list">
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="certificateType"
                            value="A"
                            checked={formData.certificateType === 'A'}
                            onChange={handleInputChange}
                        />
                        <span>Chứng chỉ hạng A (UAV &lt; 250g)</span>
                    </label>
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="certificateType"
                            value="B"
                            checked={formData.certificateType === 'B'}
                            onChange={handleInputChange}
                        />
                        <span>Chứng chỉ hạng B (UAV 250g - 2kg)</span>
                    </label>
                </div>
                <a href="#" className="link-primary">Xem bảng so sánh các loại chứng chỉ</a>
            </div>

            <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                    Quay lại
                </button>
                <button type="button" onClick={handleNext} className="btn btn-primary">
                    Tiếp tục
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="register-step">
            <h2 className="step-title">Xác nhận thông tin đăng ký</h2>

            <div className="summary-section">
                <h3>Thông tin cá nhân</h3>
                <div className="summary-item">
                    <strong>Họ và tên:</strong> {formData.fullName || 'Nguyễn Văn A'}
                </div>
                <div className="summary-item">
                    <strong>Ngày sinh:</strong> {formData.birthDate || '01/01/1990'}
                </div>
                <div className="summary-item">
                    <strong>Số CCCD:</strong> {formData.cccd || '012345678900'}
                </div>
                <div className="summary-item">
                    <strong>Địa chỉ thường trú:</strong> 123 Đường ABC, Phường XYZ, Quận 123, TP Hà Nội
                </div>
            </div>

            <div className="summary-section">
                <h3>Thông tin liên hệ</h3>
                <div className="summary-item">
                    <strong>Email:</strong> {formData.email || 'nguyenvana@example.com'}
                </div>
                <div className="summary-item">
                    <strong>Số điện thoại:</strong> {formData.phone || '0912345678'}
                </div>
                <div className="summary-item">
                    <strong>Địa chỉ hiện tại:</strong> 123 Đường ABC, Phường XYZ, Quận 123, TP Hà Nội
                </div>
            </div>

            <div className="summary-section">
                <h3>Thông tin UAV</h3>
                <div className="summary-item">
                    <strong>Loại UAV:</strong> DJI Mini 3 Pro
                </div>
                <div className="summary-item">
                    <strong>Mục đích sử dụng:</strong> Chụp ảnh, quay phim, giải trí
                </div>
                <div className="summary-item">
                    <strong>Khu vực hoạt động:</strong> TP Hà Nội
                </div>
                <div className="summary-item">
                    <strong>Loại chứng chỉ đăng ký:</strong> Chứng chỉ hạng B (UAV 250g - 2kg)
                </div>
            </div>

            <div className="form-section">
                <h3>Xác nhận</h3>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="confirmation"
                        value="confirm1"
                        onChange={handleInputChange}
                    />
                    <span>Tôi xác nhận thông tin trên là chính xác và đầy đủ</span>
                </label>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="confirmation"
                        value="confirm2"
                        onChange={handleInputChange}
                    />
                    <span>Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật</span>
                </label>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="confirmation"
                        value="confirm3"
                        onChange={handleInputChange}
                    />
                    <span>Tôi đã đọc và hiểu rõ Quy định về điều khiển UAV</span>
                </label>
            </div>

            <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                    Quay lại
                </button>
                <button type="submit" className="btn btn-primary">
                    Xác nhận đăng ký
                    <ArrowRight size={20} />
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