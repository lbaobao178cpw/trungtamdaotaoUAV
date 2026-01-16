import React, { useState, useEffect } from 'react';
import './TermsOfServicePage.css';

const API_URL = "http://localhost:5000/api";

const TermsOfServicePage = () => {
    const [terms, setTerms] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    // Thêm meta tags và title
    useEffect(() => {
        document.title = "Điều khoản Sử dụng - UAV Training Center";

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Điều khoản sử dụng dịch vụ của Trung tâm Đào tạo UAV');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Điều khoản sử dụng dịch vụ của Trung tâm Đào tạo UAV';
            document.head.appendChild(newMeta);
        }

        return () => {
            document.title = "UAV Training Center"; // Reset title khi component unmount
        };
    }, []);

    useEffect(() => {
        fetchTermsOfService();
    }, []);

    const fetchTermsOfService = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/terms-of-service`);

            if (!response.ok) {
                throw new Error('Không thể tải điều khoản sử dụng');
            }

            const data = await response.json();
            setTerms(data.content || '');
        } catch (err) {
            console.error('Lỗi tải điều khoản sử dụng:', err);
            setError(err.message);
            setTerms(`# ĐIỀU KHOẢN SỬ DỤNG

## 1. Chấp nhận điều khoản
Bằng cách truy cập và sử dụng trang web này, bạn đồng ý với các điều khoản sử dụng được quy định dưới đây.

## 2. Quyền sử dụng dịch vụ
Chúng tôi cung cấp các dịch vụ đào tạo UAV cho cá nhân và tổ chức có nhu cầu học tập và được cấp chứng chỉ.

## 3. Trách nhiệm người dùng
Người dùng có trách nhiệm:
- Cung cấp thông tin chính xác
- Tuân thủ quy định an toàn
- Thanh toán đầy đủ học phí

## 4. Sở hữu trí tuệ
Mọi nội dung trên website thuộc quyền sở hữu của Trung tâm Đào tạo UAV.`);
        } finally {
            setLoading(false);
        }
    };

    const renderMarkdownContent = (text) => {
        if (!text) return null;

        const lines = text.split('\n');
        return lines.map((line, index) => {
            if (line.startsWith('# ')) {
                return <h1 key={index} className="terms-title">{line.substring(2)}</h1>;
            } else if (line.startsWith('## ')) {
                return <h2 key={index} className="terms-subtitle">{line.substring(3)}</h2>;
            } else if (line.startsWith('### ')) {
                return <h3 key={index} className="terms-subtitle-2">{line.substring(4)}</h3>;
            } else if (line.startsWith('- ')) {
                return <li key={index} className="terms-list-item">{line.substring(2)}</li>;
            } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                return <li key={index} className="terms-numbered-item">{line}</li>;
            } else if (line.trim() === '') {
                return <br key={index} />;
            } else if (line.includes('**') && line.includes('**')) {
                const parts = line.split('**');
                return (
                    <p key={index} className="terms-paragraph">
                        {parts.map((part, i) =>
                            i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                        )}
                    </p>
                );
            } else if (line.includes('*') && line.includes('*') && !line.startsWith('*')) {
                const parts = line.split('*');
                return (
                    <p key={index} className="terms-paragraph">
                        {parts.map((part, i) =>
                            i % 2 === 0 ? part : <em key={i}>{part}</em>
                        )}
                    </p>
                );
            } else {
                return <p key={index} className="terms-paragraph">{line}</p>;
            }
        });
    };

    if (loading) {
        return (
            <div className="terms-container">
                <div className="terms-loading">
                    <div className="spinner"></div>
                    <p>Đang tải điều khoản sử dụng...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="terms-container">
                <div className="terms-error">
                    <h2>Đã xảy ra lỗi</h2>
                    <p>{error}</p>
                    <button onClick={fetchTermsOfService} className="retry-btn">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="terms-container">
            <div className="terms-header">
                <div className="breadcrumb">
                    <a href="/">Trang chủ</a>
                    <span> / </span>
                    <span>Điều khoản Sử dụng</span>
                </div>

                <div className="terms-header-content">
                    <div className="terms-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <h1 className="terms-main-title">Điều khoản Sử dụng</h1>
                    <p className="terms-intro">
                        Vui lòng đọc kỹ các điều khoản sử dụng trước khi sử dụng dịch vụ của chúng tôi.
                        Bằng việc sử dụng dịch vụ, bạn đồng ý với tất cả các điều khoản dưới đây.
                    </p>

                    <div className="terms-meta">
                        <div className="terms-update">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="terms-version">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" />
                                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
                            </svg>

                        </div>
                    </div>
                </div>
            </div>

            <div className="terms-content">
                <div className="terms-card">
                    <div className="terms-card-content">
                        {renderMarkdownContent(terms)}
                    </div>
                </div>

                <div className="terms-important">
                    <div className="terms-important-card">
                        <h3>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            Thông tin quan trọng
                        </h3>
                        <div className="important-items">
                            <div className="important-item">
                                <div className="important-icon">✓</div>
                                <div className="important-text">
                                    <strong>Quyền lợi và trách nhiệm:</strong> Người dùng có trách nhiệm đọc và hiểu rõ các điều khoản trước khi sử dụng dịch vụ.
                                </div>
                            </div>
                            <div className="important-item">
                                <div className="important-icon">⚠</div>
                                <div className="important-text">
                                    <strong>Cập nhật điều khoản:</strong> Chúng tôi có quyền cập nhật điều khoản mà không cần thông báo trước. Vui lòng kiểm tra thường xuyên.
                                </div>
                            </div>
                            <div className="important-item">
                                <div className="important-icon">ℹ</div>
                                <div className="important-text">
                                    <strong>Liên hệ hỗ trợ:</strong> Nếu có bất kỳ thắc mắc nào về điều khoản, vui lòng liên hệ với chúng tôi để được giải đáp.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="terms-contact">
                    <div className="terms-contact-card">
                        <h3>Cần hỗ trợ về Điều khoản?</h3>
                        <p>Nếu bạn có câu hỏi hoặc cần làm rõ bất kỳ điều khoản nào, đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ:</p>
                        <div className="contact-info">
                            <div className="contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                <span>Email pháp lý: legal@uavtrainingcenter.vn</span>
                            </div>
                            <div className="contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>Hotline pháp lý: 0918 456 789</span>
                            </div>
                            <div className="contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>Giờ làm việc: Thứ 2 - Thứ 6, 8:00 - 17:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="terms-footer">
                <div className="acceptance-box">
                    <div className="acceptance-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div className="acceptance-text">
                        <p>
                            <strong>Xác nhận đồng ý:</strong> Bằng việc tiếp tục sử dụng dịch vụ của chúng tôi,
                            bạn xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản sử dụng được nêu trên.
                        </p>
                        <small>
                            Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của chúng tôi.
                        </small>
                    </div>
                </div>

                <div className="terms-links">
                    <a href="/chinh-sach-bao-mat" className="terms-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Chính sách Bảo mật
                    </a>
                    <a href="/" className="terms-link">
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

export default TermsOfServicePage;