import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { Eye, EyeOff } from 'lucide-react';

function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        rememberMe: false
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Demo: Giả lập đăng nhập thành công
        console.log('Login data:', formData);
        
        // Lưu thông tin đơn giản (demo)
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userPhone', formData.phone);
        
        // Chuyển về trang chủ
        navigate('/');
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    {/* Header */}
                    <div className="login-header">
                        <h1 className="login-title">Đăng nhập</h1>
                        <p className="login-subtitle">
                            Hoặc <a href="/dang-ky" className="link-primary">đăng ký tài khoản mới</a>
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Phone Input */}
                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">
                                Nhập SĐT
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Số điện thoại"
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Mật khẩu
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="form-footer">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    className="form-checkbox"
                                />
                                <span>Nhớ mật khẩu</span>
                            </label>
                            <a href="/quen-mat-khau" className="link-primary">
                                Quên mật khẩu?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="btn btn-primary btn-login">
                            Đăng nhập
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;