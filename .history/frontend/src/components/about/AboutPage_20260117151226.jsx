import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './AboutPage.css';
import { ChevronDown } from "lucide-react";

const API_URL = "http://localhost:5000/api/display";

function AboutPage() {
    const [activeTab, setActiveTab] = useState('van-ban');
    const [openFAQ, setOpenFAQ] = useState(null);
    const [legalDocuments, setLegalDocuments] = useState([]);
    const [authorities, setAuthorities] = useState([]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    const toggleFAQ = (index) => {
        setOpenFAQ(openFAQ === index ? null : index);
    };

    // Fetch legal data from admin
    useEffect(() => {
        fetchLegalData();
    }, []);

    const fetchLegalData = async () => {
        try {
            const [docsRes, authRes, formsRes] = await Promise.all([
                fetch(`${API_URL}/legal-documents`),
                fetch(`${API_URL}/authorities`),
                fetch(`${API_URL}/forms`)
            ]);

            const docsData = await docsRes.json();
            const authData = await authRes.json();
            const formsData = await formsRes.json();

            if (docsData.success) setLegalDocuments(docsData.data || []);
            if (authData.success) setAuthorities(authData.data || []);
            if (formsData.success) setForms(formsData.data || []);
        } catch (error) {
            console.error('Lỗi tải dữ liệu pháp lý:', error);
        } finally {
            setLoading(false);
        }
    };

    // Dữ liệu FAQ
    const faqData = [
        {
            q: "Tôi cần chứng chỉ loại nào cho UAV của mình?",
            a: (
                <>
                    <p>Loại chứng chỉ phụ thuộc vào trọng lượng của UAV:</p>
                    <ul>
                        <li><strong>UAV dưới 250g:</strong> Chứng chỉ hạng A</li>
                        <li><strong>UAV từ 250g đến 2kg:</strong> Chứng chỉ hạng B</li>
                    </ul>
                </>
            )
        },
        {
            q: "Thời gian học và thi mất bao lâu?",
            a: (
                <>
                    <p>Thời gian học và thi phụ thuộc vào loại chứng chỉ:</p>
                    <ul>
                        <li><strong>Chứng chỉ hạng A:</strong> từ 3 tuần</li>
                        <li><strong>Chứng chỉ hạng B:</strong> từ 6 tuần</li>
                    </ul>
                </>
            )
        },
        {
            q: "Chi phí đào tạo và cấp chứng chỉ là bao nhiêu?",
            a: (
                <>
                    <p>Chi phí đào tạo và cấp chứng chỉ phụ thuộc vào loại chứng chỉ:</p>
                    <ul>
                        <li><strong>Chứng chỉ hạng A:</strong> 500.000 đồng</li>
                        <li><strong>Chứng chỉ hạng B:</strong> 1.500.000 đồng</li>
                    </ul>
                    <p className="note">* Chi phí đã bao gồm học phí, tài liệu và sát hạch lý thuyết. Chưa bao gồm chi phí thuê/mướn thiết bị thực hành và sát hạch.</p>
                </>
            )
        },
        {
            q: "Chứng chỉ có thời hạn bao lâu?",
            a: (
                <>
                    <p>Thời hạn của chứng chỉ phụ thuộc vào loại:</p>
                    <ul>
                        <li><strong>Chứng chỉ hạng A:</strong> 10 năm</li>
                        <li><strong>Chứng chỉ hạng B:</strong> 10 năm</li>
                    </ul>
                    <p>Sau khi hết hạn, bạn cần làm thủ tục gia hạn theo quy định.</p>
                </>
            )
        },
        {
            q: "Tôi có thể bay UAV ở đâu sau khi có chứng chỉ?",
            a: (
                <>
                    <p>Sau khi có chứng chỉ, bạn được phép bay UAV tại các khu vực không cấm bay theo quy định. Tuy nhiên, bạn vẫn phải tuân thủ các quy định về độ cao, khoảng cách và thời gian bay.</p>
                    <p>Bạn nên sử dụng ứng dụng chính thức kiểm tra khu vực cấm bay trước khi thực hiện xin cấp phép bay.</p>
                </>
            )
        }
    ];

    return (
        <div className="about-page">
            {/* 1. Hero Section */}
            <section className="about-hero">
                <div className="container">
                    <h1 className="about-hero-title">Giới thiệu chương trình</h1>
                    <p className="about-hero-subtitle">
                        Tìm hiểu về chương trình đào tạo và cấp chứng chỉ điều khiển UAV quốc gia
                    </p>
                </div>
            </section>

            {/* 2. Mục tiêu chương trình */}
            <section className="section section-white">
                <div className="container">
                    <h2 className="section-title">Mục tiêu chương trình</h2>
                    <div className="objectives-grid">
                        {/* Card 1 */}
                        <div className="objective-card">
                            <div className="objective-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path d="M12 14v7" /></svg>
                            </div>
                            <h3 className="objective-title">Đào tạo kiến thức</h3>
                            <ul className="objective-list">
                                <li>Cung cấp kiến thức cần thiết về pháp luật, kỹ thuật và an toàn bay cho người điều khiển UAV.</li>
                                <li>Kiến thức hàng không cơ bản và nguyên lý bay.</li>
                                <li>Hệ thống tàu bay không người lái và các phương tiện bay khác.</li>
                            </ul>
                        </div>

                        {/* Card 2 */}
                        <div className="objective-card">
                            <div className="objective-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <h3 className="objective-title">Nâng cao ý thức</h3>
                            <ul className="objective-list">
                                <li>Nâng cao ý thức tuân thủ quy định về an toàn, bảo mật và pháp luật.</li>
                                <li>Vận hành an toàn và quy trình bay chuẩn.</li>
                                <li>Khí tượng, môi trường bay và quản lý rủi ro.</li>
                            </ul>
                        </div>

                        {/* Card 3 */}
                        <div className="objective-card">
                            <div className="objective-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                            </div>
                            <h3 className="objective-title">Quản lý hoạt động bay</h3>
                            <ul className="objective-list">
                                <li>Xây dựng hệ thống quản lý hoạt động bay UAV hiệu quả theo quy định.</li>
                                <li>Kỹ năng điều khiển cơ bản (VLOS).</li>
                                <li>Kỹ năng điều khiển nâng cao (BVLOS) và thực hành nhiệm vụ.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Cơ sở pháp lý */}
            <section className="section section-gray">
                <div className="container">
                    <h2 className="section-title">Cơ sở pháp lý</h2>

                    <div className="legal-tabs">
                        <button className={`legal-tab ${activeTab === 'van-ban' ? 'active' : ''}`} onClick={() => setActiveTab('van-ban')}>Văn bản pháp luật</button>
                        <button className={`legal-tab ${activeTab === 'tham-quyen' ? 'active' : ''}`} onClick={() => setActiveTab('tham-quyen')}>Thẩm quyền</button>
                        <button className={`legal-tab ${activeTab === 'bieu-mau' ? 'active' : ''}`} onClick={() => setActiveTab('bieu-mau')}>Các biểu mẫu</button>
                    </div>

                    <div className="legal-tab-content">
                        {activeTab === 'van-ban' && (
                            <div className="legal-documents-list">
                                {loading ? (
                                    <p>Đang tải dữ liệu...</p>
                                ) : legalDocuments.length > 0 ? (
                                    legalDocuments.map((doc) => (
                                        <div key={doc.id} className="legal-doc-item">
                                            <h4>{doc.title}</h4>
                                            <p>{doc.description}</p>
                                            {doc.issue_date && (
                                                <p className="legal-date">Ngày {new Date(doc.issue_date).toLocaleDateString('vi-VN')}</p>
                                            )}
                                            {doc.file_url && (
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="legal-link">Xem chi tiết →</a>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p>Không có văn bản pháp luật</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'tham-quyen' && (
                            <div className="authority-content">
                                {loading ? (
                                    <p>Đang tải dữ liệu...</p>
                                ) : authorities.length > 0 ? (
                                    authorities.map((auth) => (
                                        <div key={auth.id} className="authority-item">
                                            <h4>{auth.name}</h4>
                                            <p>{auth.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p>Không có thẩm quyền</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'bieu-mau' && (
                            <div className="forms-list">
                                {loading ? (
                                    <p>Đang tải dữ liệu...</p>
                                ) : forms.length > 0 ? (
                                    forms.map((form) => (
                                        <div key={form.id} className="form-item">
                                            <h4>{form.title}</h4>
                                            {form.file_url && (
                                                <a
                                                    href={`${API_URL}/forms/${form.id}/download`}
                                                    className="form-download"
                                                >
                                                    Tải xuống
                                                </a>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p>Không có biểu mẫu</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>


            {/* 4. Đơn vị tổ chức */}
            <section className="section section-white">
                <div className="container">
                    <h2 className="section-title">Đơn vị tổ chức</h2>
                    <div className="organization-grid">
                        {/* Card 1: Đào tạo và ứng dụng công nghệ */}
                        <div className="organization-card">
                            <div className="organization-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <h3 className="organization-title">Đào tạo và ứng dụng công nghệ</h3>
                            <p className="organization-subtitle">Công ty TNHH Khoa Học Roboboss</p>
                            <p className="organization-desc">Chịu trách nhiệm quản lý, giám sát và cấp chứng chỉ cho người điều khiển thiết bị bay không người lái.</p>
                        </div>

                        {/* Card 2: Cơ quan phối hợp */}
                        <div className="organization-card">
                            <div className="organization-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <h3 className="organization-title">Cơ quan phối hợp</h3>
                            <p className="organization-subtitle">Bộ Quốc phòng, Bộ Công an, Bộ Xây dựng</p>
                            <p className="organization-desc">Phối hợp trong việc xây dựng quy định, giám sát và đảm bảo an ninh cho hoạt động bay không người lái.</p>
                        </div>

                        {/* Card 3: Chuyên gia giảng dạy */}
                        <div className="organization-card">
                            <div className="organization-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <h3 className="organization-title">Chuyên gia giảng dạy</h3>
                            <p className="organization-subtitle">Các chuyên gia hàng không hàng đầu</p>
                            <p className="organization-desc">Đội ngũ giảng viên có kinh nghiệm trong lĩnh vực hàng không, pháp luật và kỹ thuật bay không người lái.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Yêu cầu đối với người học */}
            <section className="section section-gray">
                <div className="container">
                    <h2 className="section-title">Yêu cầu đối với người học</h2>
                    <div className="requirements-grid">
                        {/* Cột 1: Điều kiện cơ bản */}
                        <div className="requirement-card">
                            <h3>Điều kiện cơ bản</h3>
                            <ul className="requirement-list">
                                <li>Độ tuổi từ 18 tuổi trở lên</li>
                                <li>Có đủ năng lực hành vi dân sự</li>
                                <li>Không có tiền án, tiền sự về các tội xâm phạm an ninh quốc gia</li>
                                <li>Người nước ngoài được bảo lãnh bởi cơ quan đương sự tại Việt Nam</li>
                            </ul>
                        </div>

                        {/* Cột 2: Giấy tờ cần chuẩn bị */}
                        <div className="requirement-card">
                            <h3>Giấy tờ cần chuẩn bị</h3>
                            <ul className="requirement-list">
                                <li>01 giấy chứng nhận đủ sức khỏe (tương đương giấy khám sức khỏe cấp phép lái xe hạng A)</li>
                                <li>02 ảnh màu cỡ 3 cm x 4 cm, chụp không quá 6 tháng</li>
                                <li>Bản sao hợp lệ Hộ chiếu còn thời hạn (đối với người nước ngoài); giấy bảo lãnh</li>
                                <li>Sơ yếu lý lịch</li>
                                <li>Phiếu lý lịch tư pháp</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            {/* 5. FAQ Section */}
            <section className="section section-gray">
                <div className="container">
                    <h2 className="section-title">Câu hỏi thường gặp</h2>
                    <div className="faq-container">
                        {faqData.map((item, index) => (
                            <div key={index} className="faq-item">
                                <button
                                    className={`faq-question ${openFAQ === index ? 'active' : ''}`}
                                    onClick={() => toggleFAQ(index)}
                                >
                                    <span>{item.q}</span>
                                    <ChevronDown className={`faq-arrow ${openFAQ === index ? 'rotate' : ''}`} />
                                </button>
                                {openFAQ === index && (
                                    <div className="faq-answer">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <h2 className="cta-title">Sẵn sàng tham gia chương trình?</h2>
                    <p className="cta-subtitle">Đăng ký ngay hôm nay để bắt đầu hành trình trở thành người điều khiển UAV chuyên nghiệp</p>
                    <div className="cta-buttons">
                        {/* Sử dụng Link cho chuyển trang nội bộ */}
                        <Link to="/dang-ky" className="btn btn-primary">Đăng ký ngay</Link>
                        <button className="btn btn-secondary btn-large">Tìm hiểu thêm</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default AboutPage;