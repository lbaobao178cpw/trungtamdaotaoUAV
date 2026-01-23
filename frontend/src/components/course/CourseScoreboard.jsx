import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, TrendingUp, BookOpen, Trophy, AlertCircle } from 'lucide-react';
import './CourseScoreboard.css';

const API_BASE = "http://localhost:5000/api/courses";

const CourseScoreboard = ({ courseId, userId, refreshTrigger }) => {
    const [scoreData, setScoreData] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRank, setUserRank] = useState(null);

    useEffect(() => {
        if (courseId && userId) {
            fetchScoreData();
        }
    }, [courseId, userId, refreshTrigger]);

    const fetchScoreData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('user_token');

            console.log('🔄 Fetching score for user:', userId, 'course:', courseId);

            // Lấy điểm của user
            const scoreRes = await axios.get(
                `${API_BASE}/${courseId}/progress/${userId}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            console.log('📊 Score response:', scoreRes.data);

            // Nếu chưa có điểm tổng thể, tự động tính
            if (scoreRes.data.overall_score === null || scoreRes.data.overall_score === undefined) {
                console.log('⏳ Calculating score...');
                try {
                    const calcRes = await axios.post(
                        `${API_BASE}/${courseId}/calculate-score/${userId}`,
                        {},
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    console.log('✅ Calculate result:', calcRes.data);

                    // Wait 1 second then fetch again
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Fetch lại sau khi tính
                    const newScoreRes = await axios.get(
                        `${API_BASE}/${courseId}/progress/${userId}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    console.log('📊 Updated score:', newScoreRes.data);
                    setScoreData(newScoreRes.data);
                } catch (calcErr) {
                    console.error('❌ Auto calculate error:', calcErr);
                    setScoreData(scoreRes.data);
                }
            } else {
                console.log('✓ Already has score');
                setScoreData(scoreRes.data);
            }

            // Lấy bảng xếp hạng
            const leaderboardRes = await axios.get(
                `${API_BASE}/${courseId}/leaderboard`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            console.log('🏆 Leaderboard:', leaderboardRes.data.leaderboard);
            setLeaderboard(leaderboardRes.data.leaderboard || []);

            // Tìm vị trí của user trong xếp hạng
            const userInBoard = leaderboardRes.data.leaderboard?.find(u => u.user_id == userId);
            if (userInBoard) {
                setUserRank(userInBoard.rank);
            }

            setError(null);
        } catch (err) {
            console.error('❌ Error fetching score data:', err);
            setError(`Lỗi: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Nếu chưa đăng nhập
    if (!userId) {
        return (
            <div className="scoreboard-error">
                <AlertCircle size={20} />
                <span>Vui lòng đăng nhập để xem điểm số</span>
            </div>
        );
    }

    if (loading) {
        return <div className="scoreboard-loading">Đang tải dữ liệu điểm...</div>;
    }

    if (error) {
        return (
            <div className="scoreboard-error">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        );
    }

    if (!scoreData) {
        return (
            <div className="scoreboard-error">
                <AlertCircle size={20} />
                <span>Không có dữ liệu điểm. Vui lòng làm quiz trước.</span>
            </div>
        );
    }

    const overallScore = parseFloat(scoreData?.overall_score) || 0;
    const quizScore = parseFloat(scoreData?.quiz_score) || 0;
    const progressPercentage = parseInt(scoreData?.progress_percentage_value) || 0;

    // Xác định thang điểm
    const getGrade = (score) => {
        if (score >= 90) return { grade: 'A', color: '#10b981', text: 'Xuất sắc' };
        if (score >= 80) return { grade: 'B', color: '#3b82f6', text: 'Tốt' };
        if (score >= 70) return { grade: 'C', color: '#f59e0b', text: 'Khá' };
        if (score >= 60) return { grade: 'D', color: '#ef4444', text: 'Trung bình' };
        return { grade: 'F', color: '#6b7280', text: 'Chưa đạt' };
    };

    const scoreGrade = getGrade(overallScore);
    const quizGrade = getGrade(quizScore);

    return (
        <div className="course-scoreboard">
            {/* Main Score Card */}
            <div className="scoreboard-main">
                <div className="score-card">
                    <div className="score-card-header">
                        <h2 className="score-title">Điểm Tổng Thể</h2>
                        <span className="score-date">
                            Cập nhật: {new Date(scoreData?.score_calculated_at).toLocaleDateString('vi-VN')}
                        </span>
                    </div>

                    <div className="score-display">
                        <div className="score-circle">
                            <svg viewBox="0 0 100 100" className="score-ring">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke={scoreGrade.color}
                                    strokeWidth="3"
                                    strokeDasharray={`${(overallScore / 100) * 283} 283`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                />
                            </svg>
                            <div className="score-text">
                                <span className="score-number">{overallScore.toFixed(1)}</span>
                                <span className="score-max">/100</span>
                            </div>
                        </div>

                        <div className="score-grade">
                            <div
                                className="grade-badge"
                                style={{ background: scoreGrade.color }}
                            >
                                {scoreGrade.grade}
                            </div>
                            <p className="grade-text">{scoreGrade.text}</p>
                        </div>
                    </div>

                    {/* Formula Display */}
                    <div className="score-formula">
                        <p className="formula-title">Công thức tính:</p>
                        <div className="formula-content">
                            <div className="formula-item">
                                <span className="label">Quiz (70%):</span>
                                <span className="value">{quizScore.toFixed(1)} × 0.7 = <strong>{(quizScore * 0.7).toFixed(2)}</strong></span>
                            </div>
                            <div className="formula-item">
                                <span className="label">Tiến độ (30%):</span>
                                <span className="value">{progressPercentage} × 0.3 = <strong>{(progressPercentage * 0.3).toFixed(2)}</strong></span>
                            </div>
                            <div className="formula-divider" />
                            <div className="formula-item total">
                                <span className="label">Tổng cộng:</span>
                                <span className="value"><strong>{overallScore.toFixed(2)}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Cards */}
                <div className="score-details">
                    <div className="detail-card quiz-card">
                        <div className="detail-icon">
                            <BookOpen size={24} />
                        </div>
                        <div className="detail-content">
                            <p className="detail-label">Điểm Quiz Trung Bình</p>
                            <p className="detail-value">{quizScore.toFixed(1)}/100</p>
                            <p className="detail-note">
                                <span className={`badge ${quizGrade.grade.toLowerCase()}`}>
                                    {quizGrade.text}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="detail-card progress-card">
                        <div className="detail-icon">
                            <TrendingUp size={24} />
                        </div>
                        <div className="detail-content">
                            <p className="detail-label">Tiến Độ Hoàn Thành</p>
                            <p className="detail-value">{progressPercentage}%</p>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {userRank && (
                        <div className="detail-card rank-card">
                            <div className="detail-icon">
                                <Trophy size={24} />
                            </div>
                            <div className="detail-content">
                                <p className="detail-label">Xếp Hạng</p>
                                <p className="detail-value">#{userRank}</p>
                                <p className="detail-note">
                                    {userRank === 1 ? '🏆 Hạng nhất lớp' : `Trong ${leaderboard.length} học sinh`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
                <div className="leaderboard-section">
                    <div className="leaderboard-header">
                        <h3 className="leaderboard-title">
                            <Award size={20} />
                            Bảng Xếp Hạng Lớp
                        </h3>
                    </div>

                    <div className="leaderboard-table">
                        <div className="table-header">
                            <div className="col rank">Hạng</div>
                            <div className="col name">Tên Học Sinh</div>
                            <div className="col quiz">Quiz</div>
                            <div className="col progress">Tiến Độ</div>
                            <div className="col score">Điểm Tổng</div>
                        </div>

                        <div className="table-body">
                            {leaderboard.map((student, idx) => {
                                const isCurrentUser = student.user_id == userId;
                                const grade = getGrade(student.overall_score);

                                return (
                                    <div
                                        key={student.user_id}
                                        className={`table-row ${isCurrentUser ? 'current-user' : ''} ${idx < 3 ? 'top-rank' : ''}`}
                                    >
                                        <div className="col rank">
                                            <span className={`rank-badge rank-${idx + 1}`}>
                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#'}{idx + 1}
                                            </span>
                                        </div>
                                        <div className="col name">
                                            <span className={isCurrentUser ? 'current-name' : ''}>
                                                {student.full_name} {isCurrentUser && '(Bạn)'}
                                            </span>
                                        </div>
                                        <div className="col quiz">{parseFloat(student.quiz_score)?.toFixed(1) || '-'}</div>
                                        <div className="col progress">{parseInt(student.progress_percentage)}%</div>
                                        <div className="col score">
                                            <span
                                                className="score-badge"
                                                style={{ background: grade.color }}
                                            >
                                                {parseFloat(student.overall_score)?.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseScoreboard;
