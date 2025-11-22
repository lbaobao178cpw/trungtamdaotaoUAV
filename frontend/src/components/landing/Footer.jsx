const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Cơ quan chủ quản</h4>
                    <p>Công Ty TNHH Đào Tạo Robot Robotone</p>
                    <p>Chi Nhánh: Phòng Đào Tạo - UAV Lab</p>
                    <p>Địa chỉ: 572 Lữ Phương, Long Thượng, Hồ Chí Minh</p>
                </div>
                <div className="footer-section">
                    <h4>Hỗ trợ</h4>
                    <a href="mailto:khaodao@uavtrainingcenter.vn">Email: khaodao@uavtrainingcenter.vn</a>
                    <p>Thời gian: 8AM - 17h00, Thứ 2 - Thứ 6</p>
                </div>
                <div className="footer-section">
                    <h4>Văn bản pháp lý</h4>
                    <a href="#">Luật Phòng không Nhân Dân Số 56/2024/QH15</a>
                    <a href="#">Nghị Định 288/2025/NĐ-CP Quy Định về CL Tàu Bay Không Người Lái và Tàu Bay Khác</a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© 2025 Hệ thống Đào tạo và Cấp Chứng chỉ Điều khiển UAV Quốc gia. Bản quyền thuộc về Không-Việt UAV Việt Nam.</p>
                <p style={{ marginTop: '10px' }}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.7)', margin: '0 10px' }}>Chính sách bảo mật</a> |
                    <a href="#" style={{ color: 'rgba(255,255,255,0.7)', margin: '0 10px' }}>Điều khoản sử dụng</a> |
                    <a href="#" style={{ color: 'rgba(255,255,255,0.7)', margin: '0 10px' }}>Sitemap</a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;