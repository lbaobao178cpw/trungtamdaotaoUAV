import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // State quản lý form
    const [formData, setFormData] = useState({
        phone: '', // Người dùng nhập SĐT (hoặc email)
        password: '',
        rememberMe: false
    });

    // State quản lý giao diện
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null); // Lưu thông báo lỗi
    const [loading, setLoading] = useState(false); // Trạng thái đang tải

    // Xử lý thay đổi input
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Xóa lỗi khi người dùng bắt đầu nhập lại
        if (error) setError(null);
    };

    // Xử lý Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Gọi API Backend
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Backend nhận 'identifier' và 'password'
                body: JSON.stringify({
                    identifier: formData.phone, // Map phone từ form sang identifier của API
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Đăng nhập thất bại');
            }

            // --- ĐĂNG NHẬP THÀNH CÔNG ---

            // 1. Kiểm tra quyền hạn - chỉ cho phép student/user login tại đây
            if (data.user.role === 'admin') {
                throw new Error('Tài khoản admin vui lòng truy cập trang quản trị');
            }

            if (data.user.role !== 'student') {
                throw new Error('Tài khoản không hợp lệ');
            }

            // 2. Lưu Token và User info vào LocalStorage
            localStorage.setItem('user_token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refresh_token', data.refreshToken);
            }
            localStorage.setItem('user', JSON.stringify(data.user));

            // 2b. Cập nhật AuthContext
            login(data.token, data.user, data.refreshToken);

            // 3. Kiểm tra "Ghi nhớ đăng nhập" (Demo logic)
            if (formData.rememberMe) {
                localStorage.setItem('rememberedPhone', formData.phone);
            } else {
                localStorage.removeItem('rememberedPhone');
            }

            // 4. Điều hướng vào trang chủ
            navigate('/');

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    {/* Header */}
                    <div className="login-header">
                        <h1 className="login-title">Đăng nhập</h1>

                    </div>

                    {/* Hiển thị thông báo lỗi nếu có */}
                    {error && (
                        <div className="error-banner" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Phone Input */}
                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">
                                Nhập SĐT hoặc Email
                            </label>
                            <input
                                type="text"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className={`form-input ${error ? 'error' : ''}`}
                                placeholder="Nhập SĐT hoặc Email đã đăng ký"
                                required
                                autoFocus
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
                                    className={`form-input ${error ? 'error' : ''}`}
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
                                <span>Lưu thông tin đăng nhập</span>
                            </label>
                            <Link to="/quen-mat-khau" className="link-primary">
                                Quên mật khẩu?
                            </Link>
                        </div>
                        <p className="login-subtitle">
                            Bạn chưa có tài khoản ? <Link to="/dang-ky" className="link-primary"> Đăng kí ngay</Link>
                        </p>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading} // Vô hiệu hóa khi đang tải
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spin" size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Đăng nhập'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* CSS inline cho animation xoay (hoặc bạn có thể thêm vào file css) */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default LoginPage;