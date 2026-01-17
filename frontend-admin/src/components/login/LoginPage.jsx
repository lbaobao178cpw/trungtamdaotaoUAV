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
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/auth/login-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: formData.phone,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Đăng nhập thất bại");
            }

            // Save token and user info
            localStorage.setItem("admin_token", data.token);
            localStorage.setItem("admin_user", JSON.stringify(data.user));

            // Redirect to admin panel
            navigate("/admin");

        } catch (err) {
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
                        <h1 className="login-title">Đăng Nhập</h1>

                    </div>

                    {/* Form */}
                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Phone Input */}
                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">
                                Nhập SĐT hoặc Email
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
                                Quên mật khẩu ?
                            </a>
                        </div>
                        <p className="login-subtitle">
                            Vui lòng liên hệ <a href="/dang-ky" className="link-primary"> : 0xxxxxxxx để cấp tài khoản</a>
                        </p>
                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-login"
                            disabled={loading}
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;