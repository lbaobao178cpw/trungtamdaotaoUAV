import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiInterceptor';
import formatDateDDMM from '../../lib/formatDate';
import { Calendar, MapPin } from 'lucide-react';

export default function ExamHistory() {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/exams/my-registrations');
        setRegistrations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching exam history', err);
        setError(err.response?.data?.error || err.message || 'Lỗi khi tải lịch sử');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div>Đang tải lịch sử...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Lịch sử đăng ký thi</h3>
      {registrations.length === 0 ? (
        <div>Chưa có đăng ký nào.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {registrations.map((r) => (
            <div key={r.registration_id} style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{r.type}</div>
                <div style={{ fontSize: 12, color: '#374151' }}>
                  {r.registration_status || '--'}
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                <Calendar size={14} style={{ marginRight: 6 }} /> {formatDateDDMM(r.exam_date)}{r.exam_time ? ` • ${r.exam_time}` : ''}
              </div>

              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                <MapPin size={14} style={{ marginRight: 6 }} /> {r.location || r.address}
              </div>

              <div style={{ fontSize: 12, color: '#9ca3af' }}>Đăng ký: {formatDateDDMM(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
