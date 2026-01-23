import React, { useState, useRef, useEffect, useCallback } from 'react';
import './LookupPage.css';
import { Search, FileText, CreditCard, Smartphone, Camera, CheckCircle, XCircle, Lock, RefreshCw, Download } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function LookupPage() {
    const [activeTab, setActiveTab] = useState('so-giay-phep');
    const [formData, setFormData] = useState({
        licenseNumber: '',
        cccdNumber: '',
        birthDate: '',
        droneSerial: '',
        droneType: ''
    });

    // States cho OTP verification
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [otp, setOtp] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // States cho API
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultData, setResultData] = useState(null);

    // States cho OTP
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [otpError, setOtpError] = useState('');

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, []);

    // Countdown timer cho OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const [cameraActive, setCameraActive] = useState(false);
    const [mediaStream, setMediaStream] = useState(null);
    const [qrResult, setQrResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const qrCanvasRef = useRef(null);
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

    // Hàm download QR code
    const downloadQRCode = () => {
        if (qrCanvasRef.current) {
            const link = document.createElement('a');
            link.href = qrCanvasRef.current.toDataURL('image/png');
            link.download = `QR-${resultData.licenseNumber}.png`;
            link.click();
        }
    };

    // Effect để render QR code khi resultData thay đổi
    useEffect(() => {
        if (resultData && resultData.licenseNumber && qrCanvasRef.current) {
            QRCode.toCanvas(qrCanvasRef.current, resultData.licenseNumber, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 1,
                width: 200,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).catch(err => {
                console.error('Error generating QR code:', err);
            });
        }
    }, [resultData]);

    const handleSearch = (e) => {
        e.preventDefault();

        // Lấy giá trị tìm kiếm từ form
        let searchValue = '';
        if (activeTab === 'so-giay-phep') searchValue = formData.licenseNumber;
        else if (activeTab === 'cccd') searchValue = formData.cccdNumber;
        else if (activeTab === 'ma-thiet-bi') searchValue = formData.droneSerial;

        if (!searchValue.trim()) {
            alert('Vui lòng nhập thông tin tìm kiếm');
            return;
        }

        // Kiểm tra ngày sinh cho CCCD
        if (activeTab === 'cccd' && !formData.birthDate) {
            alert('Vui lòng nhập ngày sinh');
            return;
        }

        setSearchQuery(searchValue);
        setOtp('');
        setOtpError('');

        // Gửi OTP
        sendOtp(searchValue);
    };

    // Hàm gửi OTP
    const sendOtp = async (searchValue) => {
        setOtpSending(true);
        setOtpError('');

        try {
            const searchType = activeTab === 'so-giay-phep' ? 'license'
                : activeTab === 'cccd' ? 'cccd'
                    : 'device';

            const response = await fetch(`${API_BASE_URL}/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType,
                    searchValue,
                    birthDate: formData.birthDate || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Không thể gửi OTP');
            }

            setMaskedEmail(data.maskedEmail);
            setShowOtpScreen(true);
            setCountdown(60); // 60 giây trước khi cho phép gửi lại

        } catch (err) {
            console.error('Send OTP error:', err);
            setOtpError(err.message);
            alert(err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
        } finally {
            setOtpSending(false);
        }
    };

    // Hàm gửi lại OTP
    const resendOtp = async () => {
        if (countdown > 0) return;

        setOtpSending(true);
        setOtpError('');

        try {
            const searchType = activeTab === 'so-giay-phep' ? 'license'
                : activeTab === 'cccd' ? 'cccd'
                    : 'device';

            const response = await fetch(`${API_BASE_URL}/otp/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType,
                    searchValue: searchQuery,
                    birthDate: formData.birthDate || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Không thể gửi lại OTP');
            }

            setMaskedEmail(data.maskedEmail);
            setCountdown(60);
            setOtp('');
            setOtpError('');

        } catch (err) {
            console.error('Resend OTP error:', err);
            setOtpError(err.message);
        } finally {
            setOtpSending(false);
        }
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

    const rescan = () => {
        setQrResult(null);
        startScanning();
    };

    // Xử lý xác thực OTP
    const handleOtpSubmit = async () => {
        if (otp.length !== 6) {
            setOtpError('Vui lòng nhập đủ 6 chữ số OTP');
            return;
        }

        setOtpVerifying(true);
        setOtpError('');

        try {
            // Xác thực OTP trước
            const searchType = activeTab === 'so-giay-phep' ? 'license'
                : activeTab === 'cccd' ? 'cccd'
                    : 'device';

            const verifyResponse = await fetch(`${API_BASE_URL}/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType,
                    searchValue: searchQuery,
                    otp
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                throw new Error(verifyData.error || 'Mã OTP không đúng');
            }

            // OTP đúng - tiến hành tra cứu
            setLoading(true);

            let response;

            if (activeTab === 'so-giay-phep') {
                // Tra cứu theo số giấy phép
                response = await fetch(`${API_BASE_URL}/licenses/lookup/license/${searchQuery}`);
            } else if (activeTab === 'cccd') {
                // Tra cứu theo CCCD
                response = await fetch(`${API_BASE_URL}/licenses/lookup/cccd/${searchQuery}?birthDate=${formData.birthDate}`);
            } else if (activeTab === 'ma-thiet-bi') {
                // Tra cứu theo serial drone
                response = await fetch(`${API_BASE_URL}/licenses/lookup/device/${searchQuery}`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Không tìm thấy thông tin');
            }

            // Format dữ liệu từ API
            const formattedResult = {
                licenseNumber: data.license?.license_number || 'N/A',
                category: data.license?.license_tier || 'N/A',
                name: data.license?.full_name || 'N/A',
                idNumber: data.license?.identity_number || 'N/A',
                birthDate: data.license?.birth_date ? new Date(data.license.birth_date).toLocaleDateString('vi-VN') : 'N/A',
                address: data.license?.address || 'N/A',
                issueDate: data.license?.issue_date ? new Date(data.license.issue_date).toLocaleDateString('vi-VN') : 'N/A',
                expireDate: data.license?.expiry_date ? new Date(data.license.expiry_date).toLocaleDateString('vi-VN') : 'N/A',
                status: data.license?.license_status || 'N/A',
                licenseImage: data.license?.license_image || '/images/icons/license-default.jpg',
                drones: data.devices?.map(device => ({
                    model: device.model_name || 'N/A',
                    serial: device.serial_number || 'N/A',
                    weight: device.weight || 'N/A',
                    status: device.device_status || 'N/A'
                })) || []
            };

            setResultData(formattedResult);
            setShowResults(true);
            setShowOtpScreen(false);

        } catch (err) {
            console.error('Lookup error:', err);
            setOtpError(err.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
            setOtpVerifying(false);
        }
    };

    const handleBackToSearch = () => {
        setShowOtpScreen(false);
        setShowResults(false);
        setOtp('');
        setSearchQuery('');
        setOtpError('');
        setMaskedEmail('');
        setCountdown(0);
        setFormData({
            licenseNumber: '',
            cccdNumber: '',
            birthDate: '',
            droneSerial: '',
            droneType: ''
        });
    };

    const handleNewSearch = () => {
        setShowResults(false);
        setOtp('');
        setSearchQuery('');
        setResultData(null);
        setError('');
        setFormData({
            licenseNumber: '',
            cccdNumber: '',
            birthDate: '',
            droneSerial: '',
            droneType: ''
        });
    };

    // Xử lý kết quả QR - tự động fetch dữ liệu
    const handleQrResult = async () => {
        if (qrResult && qrResult.success) {
            const qrData = qrResult.data;
            setSearchQuery(qrData);
            setLoading(true);
            setError('');

            try {
                // Giả định QR chứa license number - điều chỉnh nếu cần
                const response = await fetch(`${API_BASE_URL}/licenses/lookup/license/${qrData}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Không tìm thấy thông tin');
                }

                // Format dữ liệu từ API
                const formattedResult = {
                    licenseNumber: data.license?.license_number || 'N/A',
                    category: data.license?.license_tier || 'N/A',
                    name: data.license?.full_name || 'N/A',
                    idNumber: data.license?.identity_number || 'N/A',
                    birthDate: data.license?.birth_date ? new Date(data.license.birth_date).toLocaleDateString('vi-VN') : 'N/A',
                    address: data.license?.address || 'N/A',
                    issueDate: data.license?.issue_date ? new Date(data.license.issue_date).toLocaleDateString('vi-VN') : 'N/A',
                    expireDate: data.license?.expiry_date ? new Date(data.license.expiry_date).toLocaleDateString('vi-VN') : 'N/A',
                    status: data.license?.license_status || 'N/A',
                    licenseImage: data.license?.license_image || '/images/icons/license-default.jpg',
                    drones: data.devices?.map(device => ({
                        model: device.model_name || 'N/A',
                        serial: device.serial_number || 'N/A',
                        weight: device.weight || 'N/A',
                        status: device.device_status || 'N/A'
                    })) || []
                };

                setResultData(formattedResult);
                setShowResults(true);
                setCameraActive(false);
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    setMediaStream(null);
                }
                stopScanning();

            } catch (err) {
                console.error('QR Lookup error:', err);
                setError(err.message || 'Không thể tra cứu thông tin từ QR');
                alert(err.message || 'Không thể tra cứu thông tin từ QR');
            } finally {
                setLoading(false);
            }
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
                    {!showOtpScreen && !showResults ? (
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
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-search"
                                        disabled={otpSending}
                                    >
                                        {otpSending ? (
                                            <>
                                                <RefreshCw size={20} className="spin" />
                                                Đang gửi OTP...
                                            </>
                                        ) : (
                                            <>
                                                <Search size={20} />
                                                Tra cứu
                                            </>
                                        )}
                                    </button>
                                )}
                            </form>
                        </div>
                    ) : showOtpScreen ? (
                        // OTP Screen
                        <div className="search-card">
                            <h2 className="search-title">Xác thực OTP</h2>
                            <p className="search-subtitle">Nhập mã OTP để tra cứu giấy phép/bằng lái drone</p>

                            <div className="otp-info-box">
                                <Lock size={20} />
                                <p>
                                    Mã OTP đã được gửi đến email: <strong>{maskedEmail}</strong>
                                    <br />
                                    Vui lòng kiểm tra hộp thư (bao gồm thư mục Spam)
                                </p>
                            </div>

                            <div className="otp-form">
                                <label>Mã OTP</label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    placeholder="Nhập mã OTP 6 chữ số"
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, ''));
                                        setOtpError('');
                                    }}
                                    className={`otp-input ${otpError ? 'error' : ''}`}
                                    disabled={otpVerifying || loading}
                                />
                                {otpError && <p className="otp-error">{otpError}</p>}
                                <div className="otp-timer-row">
                                    <p className="otp-timer">Mã xác thực sẽ hết hạn sau 5 phút</p>
                                    <button
                                        type="button"
                                        className={`otp-resend-btn ${countdown > 0 ? 'disabled' : ''}`}
                                        onClick={resendOtp}
                                        disabled={countdown > 0 || otpSending}
                                    >
                                        {otpSending ? (
                                            <><RefreshCw size={14} className="spin" /> Đang gửi...</>
                                        ) : countdown > 0 ? (
                                            `Gửi lại sau ${countdown}s`
                                        ) : (
                                            <><RefreshCw size={14} /> Gửi lại OTP</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="form-buttons">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleBackToSearch}
                                    disabled={otpVerifying || loading}
                                >
                                    Quay lại
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleOtpSubmit}
                                    disabled={otpVerifying || loading || otp.length !== 6}
                                >
                                    {otpVerifying || loading ? 'Đang xử lý...' : 'Xác thực'}
                                </button>
                            </div>
                        </div>
                    ) : resultData ? (
                        <div className="search-card">
                            <div className="results-card-inline">

                                {/* License Card - 2 Mặt */}
                                <div className="license-card-container">
                                    {/* Mặt trước */}
                                    <div className="license-card-front">
                                        <div className="license-header-top">
                                            <div className="header-text-content">
                                                <p className="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                                                <p className="tagline">Độc lập - Tự do - Hạnh phúc</p>
                                                <p className="title">GIẤY PHÉP ĐIỀU KHIỂN PHƯƠNG TIỆN BAY</p>
                                            </div>
                                            <div className="qr-box">
                                                <canvas ref={qrCanvasRef} className="license-qr" />
                                                <p className="qr-label">Mã QR</p>
                                            </div>
                                        </div>

                                        <div className="license-body">
                                            <div className="left-section">
                                                <div className="photo-box">
                                                    <div className="license-photo">
                                                        <img src={resultData.licenseImage} alt="User Photo" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="middle-section">
                                                <div className="info-row">
                                                    <span className="label">Số:</span>
                                                    <span className="value">{resultData.licenseNumber}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="label">Họ và tên:</span>
                                                    <span className="value">{resultData.name}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="label">Ngày sinh:</span>
                                                    <span className="value">{resultData.birthDate || 'N/A'}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="label">Nơi cư trú:</span>
                                                    <span className="value">{resultData.address || 'N/A'}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="label">Loại chứng chỉ:</span>
                                                    <span className="value">{resultData.category || 'N/A'}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="label">Ngày cấp:</span>
                                                    <span className="value">{resultData.issueDate || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="expiry-box">
                                            <span>Có giá trị đến: {resultData.expireDate}</span>
                                        </div>
                                    </div>

                                    {/* Mặt sau */}
                                    <div className="license-card-back">
                                        <h4 className="back-title">CÁC LOẠI PHƯƠNG TIỆN BAY ĐƯỢC ĐIỀU KHIỂN</h4>

                                        <div className="drone-categories">
                                            <div className="category-item">
                                                <span className="bullet">-</span>
                                                <label>Tàu bay không người lái có trong lương cầm nâng dưới 2kg</label>
                                            </div>
                                            <div className="category-item">
                                                <span className="bullet">-</span>
                                                <label>Phương tiện bay khác</label>
                                            </div>
                                        </div>

                                        <div className="back-content">
                                            <div className="back-section">
                                                <h5>Thiết bị đã đăng ký</h5>
                                                {resultData.drones && resultData.drones.length > 0 ? (
                                                    resultData.drones.map((drone, idx) => (
                                                        <div key={idx} className="back-drone-item">
                                                            <p><strong>Mẫu:</strong> {drone.model}</p>
                                                            <p><strong>Seri:</strong> {drone.serial}</p>
                                                            <p><strong>Trọng lượng:</strong> {drone.weight}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p>Không có thiết bị đã đăng ký</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-buttons">
                                    <button
                                        className="btn btn-qr-download"
                                        onClick={downloadQRCode}
                                        title="Tải mã QR"
                                    >
                                        <Download size={16} /> Tải QR code
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleNewSearch}
                                    >
                                        Tra cứu mới
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="search-card">
                            <div className="no-results">
                                <p>Không có dữ liệu để hiển thị</p>
                                <button className="btn btn-primary" onClick={handleNewSearch}>
                                    Tra cứu mới
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {!showResults && (
                <>
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
                </>
            )}
        </div>
    );
}

export default LookupPage;

