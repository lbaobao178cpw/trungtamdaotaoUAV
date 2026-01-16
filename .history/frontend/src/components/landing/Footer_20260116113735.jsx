import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    // State mặc định
    const [config, setConfig] = useState({
        companyName: "Đang tải...",
        branch: "",
        address: "",
        email: "",
        workingHours: "",
        copyright: "",
        legalDocuments: [] // Mặc định là mảng rỗng
    });

    useEffect(() => {
        // Chỉ cần gọi 1 API footer-config là đủ
        fetch('http://localhost:5000/api/footer-config')
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
                    <h4 style={{color: '#ffcc00'}}>Cơ quan chủ quản</h4>
                    <p style={{ fontWeight: 'bold' }}>{config.companyName}</p>
                    <p>{config.branch}</p>
                    <p>Địa chỉ: {config.address}</p>
                </div>

                {/* Cột 2 */}
                <div className="footer-section">
                    <h4 style={{color: '#ffcc00'}}>Hỗ trợ</h4>
                    <a href={`mailto:${config.email}`}>Email: {config.email}</a>
                    <p>Thời gian: {config.workingHours}</p>
                </div>

                {/* Cột 3: VĂN BẢN PHÁP LÝ (DỮ LIỆU ĐỘNG TỪ JSON) */}
                <div className="footer-section">
                    <h4 style={{color: '#ffcc00'}}>Văn bản pháp lý</h4>
                    {config.legalDocuments && config.legalDocuments.length > 0 ? (
                        config.legalDocuments.map((doc, index) => (
                            <a 
                                key={index} 
                                href={doc.url || "#"} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ display: 'block', marginBottom: '8px' }}
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
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <a href="#" className="link-button" style={{ color: '#aaa' }}>Chính sách bảo mật</a> | 
                    <a href="#" className="link-button" style={{ color: '#aaa' }}>Điều khoản sử dụng</a> | 
                    <a href="#" className="link-button" style={{ color: '#aaa' }}>Sitemap</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;