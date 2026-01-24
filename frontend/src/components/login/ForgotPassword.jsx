import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifySuccess, notifyError } from '../../lib/notifications';
import './LoginPage.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email) return notifyError('Vui lòng nhập email');
    setLoading(true);
    try {
      const resp = await apiClient.post('/otp/send-password', { email });
      notifySuccess(resp.data.message || 'Đã gửi mã OTP');
      setMaskedEmail(resp.data.maskedEmail || null);
      setStep(2);
    } catch (err) {
      notifyError(err.response?.data?.error || err.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) return notifyError('Vui lòng điền đầy đủ thông tin');
    setLoading(true);
    try {
      const resp = await apiClient.post('/otp/reset-password', { email, otp, newPassword, confirmPassword });
      notifySuccess(resp.data.message || 'Đổi mật khẩu thành công');
      navigate('/dang-nhap');
    } catch (err) {
      notifyError(err.response?.data?.error || err.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Quên mật khẩu</h1>
          </div>

          {step === 1 && (
            <form onSubmit={handleSend} className="login-form">
              <div className="form-group">
                <label className="form-label">Nhập email đã đăng ký</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</button>
                <Link to="/dang-nhap" style={{ marginLeft: 12 }} className="link-primary">Quay lại đăng nhập</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset} className="login-form">
              <div className="form-group">
                <label className="form-label">Mã OTP đã gửi tới</label>
                <input className="form-input" type="text" value={maskedEmail || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Nhập mã OTP</label>
                <input className="form-input" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu</label>
                <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Gửi lại email</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
