import React, { useState, useRef, useEffect, useCallback } from 'react';
import './LookupPage.css';
import { Search, FileText, CreditCard, Smartphone, Camera, CheckCircle, XCircle } from 'lucide-react';
import jsQR from 'jsqr';

function LookupPage() {
    const [activeTab, setActiveTab] = useState('so-giay-phep');
    const [formData, setFormData] = useState({
        licenseNumber: '',
        cccdNumber: '',
        birthDate: '',
        droneSerial: '',
        droneType: ''
    });
    useEffect(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, []);
    const [cameraActive, setCameraActive] = useState(false);
    const [mediaStream, setMediaStream] = useState(null);
    const [qrResult, setQrResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scanIntervalRef = useRef(null);

    // Hàm quét QR từ video frame
    const scanQRCode = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Kiểm tra video đã sẵn sàng chưa
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });
        
        if (code) {
            console.log('QR Code detected:', code.data);
            setQrResult({
                success: true,
                data: code.data
            });
            // Dừng quét sau khi tìm thấy
            stopScanning();
        }
    }, []);

    // Bắt đầu quét liên tục
    const startScanning = useCallback(() => {
        if (scanIntervalRef.current) return;
        setIsScanning(true);
        setQrResult(null);
        scanIntervalRef.current = setInterval(scanQRCode, 200); // Quét mỗi 200ms
    }, [scanQRCode]);

    // Dừng quét
    const stopScanning = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Gán stream cho video element sau khi nó được render
    useEffect(() => {
        if (cameraActive && mediaStream && videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            // Tự động bắt đầu quét khi camera bật
            videoRef.current.onloadedmetadata = () => {
                startScanning();
            };
        }
    }, [cameraActive, mediaStream, startScanning]);

    // Cleanup: tắt camera khi component unmount hoặc chuyển tab
    useEffect(() => {
        return () => {
            stopScanning();
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mediaStream, stopScanning]);

    // Tắt camera khi chuyển tab khác
    useEffect(() => {
        if (activeTab !== 'qr' && mediaStream) {
            stopScanning();
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
            setCameraActive(false);
            setQrResult(null);
        }
    }, [activeTab, mediaStream, stopScanning]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };


    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Searching with:', formData);
        // Xử lý tìm kiếm ở đây
        alert('Tính năng tra cứu đang được phát triển');
    };

    const activateCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            // Lưu stream vào state và bật camera
            // useEffect sẽ gán stream cho video sau khi render
            setMediaStream(stream);
            setCameraActive(true);
        } catch (err) {
            console.error('Lỗi khi bật camera:', err);
            alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
        }
    };

    const captureQR = () => {
        if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                setQrResult({
                    success: true,
                    data: code.data
                });
                stopScanning();
            } else {
                setQrResult({
                    success: false,
                    data: 'Không tìm thấy mã QR. Vui lòng thử lại.'
                });
            }
        }
    };

    // Quét lại
    const rescan = () => {
        setQrResult(null);
        startScanning();
    };

    // Xử lý kết quả QR
    const handleQrResult = () => {
        if (qrResult && qrResult.success) {
            // Phân tích dữ liệu QR và điền vào form
            const data = qrResult.data;
            // Giả sử QR chứa số giấy phép hoặc thông tin khác
            setFormData(prev => ({
                ...prev,
                licenseNumber: data
            }));
            alert(`Đã quét được mã QR: ${data}\nĐang tra cứu thông tin...`);
        }
    };



    return (
        <div className="lookup-page">
            {/* Hero Section */}
            <section className="lookup-hero">
                <div className="container">
                    <h1 className="lookup-hero-title">Tra cứu giấy phép điều khiển drone</h1>
                </div>
            </section>

            {/* Search Section */}
            <section className="search-section">
                <div className="container">
                    <div className="search-card">
                        <h2 className="search-title">Tra Cứu Thông Tin</h2>
                        <p className="search-subtitle">Nhập thông tin để tra cứu giấy phép/ bằng lái drone</p>

                        {/* Tabs */}
                        <div className="search-tabs">
                            <button
                                className={`search-tab ${activeTab === 'so-giay-phep' ? 'active' : ''}`}
                                onClick={() => setActiveTab('so-giay-phep')}
                            >
                                <FileText size={18} />
                                <span>Số giấy phép</span>
                            </button>
                            <button
                                className={`search-tab ${activeTab === 'cccd' ? 'active' : ''}`}
                                onClick={() => setActiveTab('cccd')}
                            >
                                <CreditCard size={18} />
                                <span>CCCD/CMND</span>
                            </button>
                            <button
                                className={`search-tab ${activeTab === 'ma-thiet-bi' ? 'active' : ''}`}
                                onClick={() => setActiveTab('ma-thiet-bi')}
                            >
                                <Smartphone size={18} />
                                <span>Mã thiết bị drone</span>
                            </button>
                            <button
                                className={`search-tab ${activeTab === 'qr' ? 'active' : ''}`}
                                onClick={() => setActiveTab('qr')}
                            >
                                <Camera size={18} />
                                <span>Quét mã QR</span>
                            </button>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSearch} className="search-form">
                            {/* Tab Số giấy phép */}
                            {activeTab === 'so-giay-phep' && (
                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Số giấy phép</label>
                                        <input
                                            type="text"
                                            name="licenseNumber"
                                            placeholder="Nhập số giấy phép (ví dụ: DC-2023-0012345)"
                                            value={formData.licenseNumber}
                                            onChange={handleInputChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab CCCD/CMND */}
                            {activeTab === 'cccd' && (
                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Số CCCD/CMND</label>
                                        <input
                                            type="text"
                                            name="cccdNumber"
                                            placeholder="Nhập số CCCD/CMND"
                                            value={formData.cccdNumber}
                                            onChange={handleInputChange}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ngày sinh</label>
                                        <input
                                            type="date"
                                            name="birthDate"
                                            value={formData.birthDate}
                                            onChange={handleInputChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab Mã thiết bị */}
                            {activeTab === 'ma-thiet-bi' && (
                                <div className="form-content">
                                    <div className="form-group">
                                        <label>Số seri thiết bị drone</label>
                                        <input
                                            type="text"
                                            name="droneSerial"
                                            placeholder="Nhập số seri của thiết bị drone"
                                            value={formData.droneSerial}
                                            onChange={handleInputChange}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Loại thiết bị</label>
                                        <select
                                            name="droneType"
                                            value={formData.droneType}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            <option value="">Chọn loại thiết bị</option>
                                            <option value="dji-mini">DJI Mini Series</option>
                                            <option value="dji-air">DJI Air Series</option>
                                            <option value="dji-mavic">DJI Mavic Series</option>
                                            <option value="dji-phantom">DJI Phantom Series</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Tab QR Code */}
                            {activeTab === 'qr' && (
                                <div className="form-content qr-content">
                                    <div className="qr-scanner">
                                        {!cameraActive ? (
                                            <div className="qr-placeholder">
                                                <Camera size={80} className="qr-icon" />
                                            </div>
                                        ) : (
                                            <>
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="qr-video"
                                                />
                                                {isScanning && (
                                                    <div className="qr-scanning-overlay">
                                                        <div className="scanning-line"></div>
                                                        <p className="scanning-text">Đang quét mã QR...</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                                    </div>
                                    
                                    {/* Hiển thị kết quả quét */}
                                    {qrResult && (
                                        <div className={`qr-result ${qrResult.success ? 'success' : 'error'}`}>
                                            {qrResult.success ? (
                                                <>
                                                    <CheckCircle size={24} />
                                                    <div className="qr-result-content">
                                                        <strong>Đã quét thành công!</strong>
                                                        <p>{qrResult.data}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle size={24} />
                                                    <div className="qr-result-content">
                                                        <strong>Không tìm thấy mã QR</strong>
                                                        <p>{qrResult.data}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="qr-buttons">
                                        {!cameraActive ? (
                                            <button 
                                                type="button"
                                                onClick={activateCamera}
                                                className="btn btn-primary btn-camera"
                                            >
                                                <Camera size={20} />
                                                Bật camera
                                            </button>
                                        ) : (
                                            <div className="camera-controls">
                                                {qrResult ? (
                                                    <>
                                                        <button 
                                                            type="button"
                                                            onClick={rescan}
                                                            className="btn btn-secondary"
                                                        >
                                                            <Camera size={20} />
                                                            Quét lại
                                                        </button>
                                                        {qrResult.success && (
                                                            <button 
                                                                type="button"
                                                                onClick={handleQrResult}
                                                                className="btn btn-primary"
                                                            >
                                                                <Search size={20} />
                                                                Tra cứu
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button 
                                                        type="button"
                                                        onClick={captureQR}
                                                        className="btn btn-primary btn-camera"
                                                    >
                                                        <Camera size={20} />
                                                        Chụp thủ công
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <p className="qr-instruction">
                                            {isScanning 
                                                ? 'Đưa mã QR vào khung hình, hệ thống sẽ tự động nhận diện'
                                                : 'Đặt mã QR trên giấy phép hoặc thẻ đăng ký drone vào khung hình camera'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            {activeTab !== 'qr' && (
                                <button type="submit" className="btn btn-primary btn-search">
                                    <Search size={20} />
                                    Tra cứu
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </section>

            {/* Instructions Section */}
            <section className="instructions-section">
                <div className="container">
                    <h2 className="instructions-title">Hướng dẫn tra cứu</h2>
                    <div className="instructions-container">
                        <div className="instructions-grid">
                            <div className="instruction-card">
                                <div className="instruction-icon">
                                    <FileText size={20} />
                                </div>
                                <div className="instruction-content">
                                    <h3>Cách tra cứu bằng số chứng chỉ</h3>
                                    <p>Nhập số chứng chỉ theo định dạng DC-YYYY-XXXXXXX (VD: DC-2023-0012345)</p>
                                </div>
                            </div>

                            <div className="instruction-card">
                                <div className="instruction-icon">
                                    <CreditCard size={20} />
                                </div>
                                <div className="instruction-content">
                                    <h3>Cách tra cứu bằng CCCD/CMND</h3>
                                    <p>Nhập số CCCD/CMND và ngày sinh chính xác của người đăng ký</p>
                                </div>
                            </div>

                            <div className="instruction-card">
                                <div className="instruction-icon">
                                    <Smartphone size={20} />
                                </div>
                                <div className="instruction-content">
                                    <h3>Cách tra cứu bằng mã QR</h3>
                                    <p>Quét mã QR trên giấy phép hoặc thẻ đăng ký drone để tra cứu nhanh chóng</p>
                                </div>
                            </div>

                            <div className="instruction-card">
                                <div className="instruction-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                </div>
                                <div className="instruction-content">
                                    <h3>Báo mật thông tin</h3>
                                    <p>Hệ thống yêu cầu xác thực OTP để đảm bảo quyền riêng tư và bảo mật thông tin</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Additional Info Section */}
            <section className="info-section">
                <div className="container">
                    <div className="info-box">
                        <h3>Lưu ý quan trọng</h3>
                        <ul>
                            <li>Thông tin tra cứu chỉ dành cho mục đích xác thực giấy phép hợp lệ</li>
                            <li>Vui lòng không chia sẻ thông tin cá nhân cho bên thứ ba</li>
                            <li>Liên hệ hotline <strong>1900-xxxx</strong> nếu cần hỗ trợ</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LookupPage;