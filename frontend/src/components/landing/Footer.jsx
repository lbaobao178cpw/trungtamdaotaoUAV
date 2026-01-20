import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    // State mặc định
    const [config, setConfig] = useState({
        companyName: "Đang tải...",
        branch: "",
        address: "",
        phone: "",
        email: "",
        workingHours: "",
        copyright: "",
        legalDocuments: [] // Mặc định là mảng rỗng
    });

    useEffect(() => {
        // Chỉ cần gọi 1 API footer-config là đủ
        fetch('http://localhost:5000/api/display/footer-config')
            .then(res => res.json())
            .then(data => {
                if (data.id) setConfig(data);
            })
            .catch(err => console.error("Lỗi tải footer:", err));
    }, []);

    return (
        <footer className="footer">
            <div className="footer-content">
                {/* Cột 1 */}
                <div className="footer-section">
                    <h4 style={{ color: '#ffcc00' }}>Cơ quan chủ quản</h4>
                    <p style={{ fontWeight: 'bold' }}>{config.companyName}</p>
                    <p>{config.branch}</p>
                    <p>Địa chỉ: {config.address}</p>
                </div>

                {/* Cột 2 */}
                <div className="footer-section">
                    <h4 style={{ color: '#ffcc00' }}>Hỗ trợ</h4>
                    {config.phone && (
                        <a href={`tel:${config.phone}`} style={{ display: 'block', marginBottom: '8px' }}>Số điện thoại: {config.phone}</a>
                    )}
                    <a href={`mailto:${config.email}`}>Email: {config.email}</a>
                    <p>Thời gian: {config.workingHours}</p>
                </div>

                {/* Cột 3: VĂN BẢN PHÁP LÝ (DỮ LIỆU ĐỘNG TỪ JSON) */}
                <div className="footer-section">
                    <h4 style={{ color: '#ffcc00' }}>Văn bản pháp lý</h4>
                    {config.legalDocuments && config.legalDocuments.length > 0 ? (
                        config.legalDocuments.map((doc, index) => (
                            <a
                                key={index}
                                href={doc.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    transition: 'color 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#ffcc00'}
                                onMouseLeave={(e) => e.target.style.color = '#ffffff'}
                            >
                                {doc.title}
                            </a>
                        ))
                    ) : (
                        <p style={{ fontSize: '12px', color: '#aaa' }}>Đang cập nhật...</p>
                    )}
                </div>
            </div>

            {/* Copyright */}
            <div className="footer-bottom">
                <p>{config.copyright}</p>
                <div style={{
                    marginTop: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {/* Chính sách bảo mật */}
                    <Link
                        to="/chinh-sach-bao-mat"
                        className="footer-link"
                        style={{
                            color: '#ffffff',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            padding: '5px 10px',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#ffcc00';
                            e.target.style.textDecoration = 'underline';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#ffffff';
                            e.target.style.textDecoration = 'none';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.backgroundColor = 'transparent';
                        }}
                    >
                        Chính sách bảo mật
                    </Link>

                    <span style={{ color: '#666' }}>|</span>

                    {/* Điều khoản sử dụng */}
                    <Link
                        to="/dieu-khoan-su-dung"
                        className="footer-link"
                        style={{
                            color: '#ffffff',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            padding: '5px 10px',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#ffcc00';
                            e.target.style.textDecoration = 'underline';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#ffffff';
                            e.target.style.textDecoration = 'none';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.backgroundColor = 'transparent';
                        }}
                    >
                        Điều khoản sử dụng
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;