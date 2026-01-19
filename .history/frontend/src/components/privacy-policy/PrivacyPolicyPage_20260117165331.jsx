import React, { useState, useEffect } from 'react';
import './PrivacyPolicyPage.css';

const API_URL = "http://localhost:5000/api/display";

const PrivacyPolicyPage = () => {
    const [policy, setPolicy] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    // Thêm meta tags và title
    useEffect(() => {
        document.title = "Chính sách Bảo mật - UAV Training Center";

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Chính sách bảo mật thông tin của Trung tâm Đào tạo UAV');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Chính sách bảo mật thông tin của Trung tâm Đào tạo UAV';
            document.head.appendChild(newMeta);
        }

        return () => {
            document.title = "UAV Training Center"; // Reset title khi component unmount
        };
    }, []);

    useEffect(() => {
        fetchPrivacyPolicy();
    }, []);

    const fetchPrivacyPolicy = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/privacy-policy`);

            if (!response.ok) {
                throw new Error('Không thể tải chính sách bảo mật');
            }

            const data = await response.json();
            setPolicy(data.content || '');
        } catch (err) {
            console.error('Lỗi tải chính sách bảo mật:', err);
            setError(err.message);
            setPolicy(`# CHÍNH SÁCH BẢO MẬT

## 1. Thu thập thông tin
Chúng tôi thu thập thông tin cá nhân khi bạn đăng ký tài khoản, đăng ký khóa học, hoặc liên hệ với chúng tôi.

## 2. Sử dụng thông tin
Thông tin được sử dụng để:
- Cung cấp dịch vụ đào tạo
- Cải thiện chất lượng dịch vụ
- Liên hệ hỗ trợ khi cần thiết

## 3. Bảo mật thông tin
Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn bằng các biện pháp bảo mật tiên tiến.`);
        } finally {
            setLoading(false);
        }
    };

    const renderMarkdownContent = (text) => {
        if (!text) return null;

        const lines = text.split('\n');
        return lines.map((line, index) => {
            if (line.startsWith('# ')) {
                return <h1 key={index} className="policy-title">{line.substring(2)}</h1>;
            } else if (line.startsWith('## ')) {
                return <h2 key={index} className="policy-subtitle">{line.substring(3)}</h2>;
            } else if (line.startsWith('### ')) {
                return <h3 key={index} className="policy-subtitle-2">{line.substring(4)}</h3>;
            } else if (line.startsWith('- ')) {
                return <li key={index} className="policy-list-item">{line.substring(2)}</li>;
            } else if (line.trim() === '') {
                return <br key={index} />;
            } else if (line.includes('**') && line.includes('**')) {
                const parts = line.split('**');
                return (
                    <p key={index} className="policy-paragraph">
                        {parts.map((part, i) =>
                            i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                        )}
                    </p>
                );
            } else if (line.includes('*') && line.includes('*') && !line.startsWith('*')) {
                const parts = line.split('*');
                return (
                    <p key={index} className="policy-paragraph">
                        {parts.map((part, i) =>
                            i % 2 === 0 ? part : <em key={i}>{part}</em>
                        )}
                    </p>
                );
            } else {
                return <p key={index} className="policy-paragraph">{line}</p>;
            }
        });
    };

    if (loading) {
        return (
            <div className="policy-container">
                <div className="policy-loading">
                    <div className="spinner"></div>
                    <p>Đang tải chính sách bảo mật...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="policy-container">
                <div className="policy-error">
                    <h2>Đã xảy ra lỗi</h2>
                    <p>{error}</p>
                    <button onClick={fetchPrivacyPolicy} className="retry-btn">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="policy-container">
            <div className="policy-header">
                <div className="breadcrumb">
                    <a href="/">Trang chủ</a>
                    <span> / </span>
                    <span>Chính sách Bảo mật</span>
                </div>

                <div className="policy-header-content">
                    <div className="policy-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="policy-main-title">Chính sách Bảo mật</h1>
                    <p className="policy-intro">
                        Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
                    </p>

                    <div className="policy-meta">
                        <div className="policy-update">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="policy-content">
                <div className="policy-card">
                    <div className="policy-card-content">
                        {renderMarkdownContent(policy)}
                    </div>
                </div>

                <div className="policy-contact">
                    <div className="policy-contact-card">
                        <h3>Câu hỏi về Chính sách Bảo mật?</h3>
                        <p>Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật của chúng tôi, vui lòng liên hệ:</p>
                        <div className="contact-info">
                            <div className="contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                <span>Email: khaodao@uavtrainingcenter.vn</span>
                            </div>
                            <div className="contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>Hotline: 0912 345 678</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="policy-footer">
                <p>Bằng việc sử dụng dịch vụ của chúng tôi, bạn đồng ý với các điều khoản trong Chính sách Bảo mật này.</p>
                <div className="policy-links">
                    <a href="/dieu-khoan-su-dung" className="policy-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Điều khoản Sử dụng
                    </a>
                    <a href="/" className="policy-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Về trang chủ
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;