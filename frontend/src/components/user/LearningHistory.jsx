import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifyError } from '../../lib/notifications';
import './LearningHistory.css';

function LearningHistory() {
    const { profile } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        courses: [],
        quizHistory: [],
        stats: {
            total_courses: 0,
            avg_overall_score: 0,
            avg_quiz_score: 0,
            avg_progress: 0
        }
    });
    const [activeTab, setActiveTab] = useState('courses');

    useEffect(() => {
        const fetchLearningHistory = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user?.id) return;

                const res = await apiClient.get(`/users/${user.id}/learning-history`);
                setData(res.data);
            } catch (error) {
                console.error('Lỗi lấy lịch sử học tập:', error);
                notifyError('Không thể tải lịch sử học tập');
            } finally {
                setLoading(false);
            }
        };

        fetchLearningHistory();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        if (score >= 40) return '#f97316';
        return '#ef4444';
    };

    const getGrade = (score) => {
        if (score >= 90) return { label: 'Xuất sắc', class: 'excellent' };
        if (score >= 80) return { label: 'Giỏi', class: 'good' };
        if (score >= 70) return { label: 'Khá', class: 'fair' };
        if (score >= 50) return { label: 'Trung bình', class: 'average' };
        return { label: 'Cần cải thiện', class: 'poor' };
    };

    if (loading) {
        return (
            <div className="learning-history-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Đang tải lịch sử học tập...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="learning-history-page">
            <h2 className="page-title">Lịch Sử Học Tập</h2>

            {/* Stats Overview */}
            <div className="stats-overview">
                <div className="stat-card">
                    <div className="stat-value">{data.stats.total_courses}</div>
                    <div className="stat-label">Khóa học đã tham gia</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: getScoreColor(data.stats.avg_overall_score) }}>
                        {parseFloat(data.stats.avg_overall_score).toFixed(1)}
                    </div>
                    <div className="stat-label">Điểm trung bình</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: getScoreColor(data.stats.avg_quiz_score) }}>
                        {parseFloat(data.stats.avg_quiz_score).toFixed(1)}
                    </div>
                    <div className="stat-label">Điểm Quiz TB</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{parseFloat(data.stats.avg_progress).toFixed(0)}%</div>
                    <div className="stat-label">Tiến độ TB</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="history-tabs">
                <button
                    className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('courses')}
                >
                    Khóa học ({data.courses.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                    onClick={() => setActiveTab('quiz')}
                >
                    Lịch sử Quiz ({data.quizHistory.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'courses' && (
                    <div className="courses-list">
                        {data.courses.length === 0 ? (
                            <div className="empty-state">
                                <p>Bạn chưa tham gia khóa học nào</p>
                                <Link to="/khoa-hoc" className="btn-primary">Khám phá khóa học</Link>
                            </div>
                        ) : (
                            data.courses.map((course) => {
                                const grade = getGrade(course.overall_score || 0);
                                return (
                                    <div key={course.course_id} className="course-card">
                                        <div className="course-image">
                                            {course.course_image ? (
                                                <img src={course.course_image} alt={course.course_title} />
                                            ) : (
                                                <div className="placeholder-image">📚</div>
                                            )}
                                        </div>
                                        <div className="course-info">
                                            <h3 className="course-title">
                                                <Link to={`/khoa-hoc/${course.course_id}`}>{course.course_title}</Link>
                                            </h3>
                                            <div className="course-meta">
                                                <span className="level-badge">{course.course_level || 'Cơ bản'}</span>
                                                <span className="lessons-count">
                                                    {course.completed_lessons || 0}/{course.total_lessons || 0} bài học
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="progress-section">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${course.progress_percentage || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="progress-text">{course.progress_percentage || 0}% hoàn thành</span>
                                            </div>

                                            {/* Scores */}
                                            <div className="scores-section">
                                                <div className="score-item">
                                                    <span className="score-label">Điểm Quiz:</span>
                                                    <span className="score-value" style={{ color: getScoreColor(course.quiz_score || 0) }}>
                                                        {course.quiz_score ? parseFloat(course.quiz_score).toFixed(1) : '--'}
                                                    </span>
                                                </div>
                                                <div className="score-item">
                                                    <span className="score-label">Điểm tổng:</span>
                                                    <span className="score-value" style={{ color: getScoreColor(course.overall_score || 0) }}>
                                                        {course.overall_score ? parseFloat(course.overall_score).toFixed(1) : '--'}
                                                    </span>
                                                </div>
                                                <div className={`grade-badge ${grade.class}`}>
                                                    {grade.label}
                                                </div>
                                            </div>

                                            <div className="last-activity">
                                                Hoạt động gần nhất: {formatDate(course.last_activity)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'quiz' && (
                    <div className="quiz-history">
                        {data.quizHistory.length === 0 ? (
                            <div className="empty-state">
                                <p>Bạn chưa làm bài quiz nào</p>
                            </div>
                        ) : (
                            <table className="quiz-table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Khóa học</th>
                                        <th>Bài học</th>
                                        <th>Kết quả</th>
                                        <th>Điểm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.quizHistory.map((quiz) => (
                                        <tr key={quiz.id}>
                                            <td className="date-cell">{formatDate(quiz.created_at)}</td>
                                            <td className="course-cell">
                                                <Link to={`/khoa-hoc/${quiz.course_id}`}>{quiz.course_title}</Link>
                                            </td>
                                            <td className="lesson-cell">{quiz.lesson_title || 'Quiz tổng hợp'}</td>
                                            <td className="result-cell">
                                                {quiz.correct_answers}/{quiz.total_questions} câu đúng
                                            </td>
                                            <td className="score-cell">
                                                <span
                                                    className="score-badge"
                                                    style={{ backgroundColor: getScoreColor(quiz.score) }}
                                                >
                                                    {parseFloat(quiz.score).toFixed(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LearningHistory;
