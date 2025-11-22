import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './CoursedetailPage.css';
import { 
    PlayCircle, FileText, CheckCircle, ChevronDown, ChevronUp, Star, 
    MessageSquare, MoreHorizontal, Play, Video, PenTool, ThumbsUp, Share2, Clock, QrCode 
} from 'lucide-react';

function CourseDetailPage() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('intro');
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedOverview, setExpandedOverview] = useState({ 1: true, 2: true });
    const [activeLesson, setActiveLesson] = useState({
        id: 1, title: 'Tổng quan về DJI Dock 2', type: 'video', src: '/course-video/course-video.webm'
    });
    const [quizStep, setQuizStep] = useState('intro');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    const comments = [
        { id: 1, name: 'Nguyễn Văn An', avatar: 'N', rating: 4, time: '25/02/2025 16:11:21', content: 'Khóa học rất chi tiết và đầy đủ thông tin', level: 'Cấp 1' },
        { id: 2, name: 'Trần Thị Bình', avatar: 'T', rating: 5, time: '21/02/2025 15:38:45', content: 'Tuyệt vời', level: 'Cấp 4' }
    ];

    const notes = [
        { id: 1, name: 'Lê Minh Dũng', time: '21/01/2025 15:11', videoTime: '01:14:12', lesson: 'Matrice 4 Series - Bài học cuối', content: 'So sánh Matrice 4 với dòng Mavic 3', likes: 1, level: 'Cấp 6' },
        { id: 2, name: 'Lê Minh Dũng', time: '21/01/2025 15:07', videoTime: '46:48', lesson: 'Matrice 4 Series - Bài học cuối', content: 'Chụp ảnh 3D thông minh', likes: 1, level: 'Cấp 6' }
    ];

    const quizQuestions = [
        { id: 1, question: "DJI Dock 2 có thể hoạt động trong điều kiện thời tiết nào?", options: ["Chỉ trong điều kiện thời tiết tốt", "Trong mọi điều kiện thời tiết (IP55)", "Chỉ ban ngày", "Chỉ khi không có gió"], correct: 1 },
        { id: 2, question: "Thời gian sạc nhanh của DJI Dock 2 từ 20% đến 90% là bao lâu?", options: ["15 phút", "25 phút", "45 phút", "60 phút"], correct: 1 },
        { id: 3, question: "Bán kính hoạt động hiệu quả tối đa của DJI Dock 2 là bao nhiêu?", options: ["5 km", "7 km", "10 km", "15 km"], correct: 2 },
        { id: 4, question: "Dòng máy bay nào tương thích với DJI Dock 2?", options: ["DJI Mavic 3 Enterprise", "DJI Matrice 3D/3TD", "DJI Matrice 300 RTK", "DJI Mini 4 Pro"], correct: 1 },
        { id: 5, question: "Tính năng 'Live Flight Controls' cho phép làm gì?", options: ["Chỉ xem video trực tiếp", "Điều khiển drone và gimbal thủ công từ xa", "Tự động chỉnh sửa video", "Tăng tốc độ bay"], correct: 1 }
    ];

    const courseData = {
        id: 1, title: 'Điều khiển thiết bị bay không người lái hạng A', rating: 4.8, progress: 30,
        chapters: [
            {
                id: 1, title: 'Giới thiệu về DJI Dock 2',
                lessons: [
                    { id: 1, title: 'Tổng quan về DJI Dock 2', type: 'video', duration: '10:22', completed: true, src: '/course-video/course-video.webm' },
                    { id: 2, title: 'Thông số kỹ thuật và khả năng', type: 'video', duration: '15:45', completed: true, src: '/course-video/course-video.webm' },
                    { id: 3, title: 'Các chế độ bay', type: 'video', duration: '12:30', completed: false, src: '/course-video/course-video.webm' },
                    { id: 4, title: 'Tài liệu kỹ thuật', type: 'doc', duration: '25 trang', completed: false, src: '/document/course-document.pdf' },
                ]
            },
            {
                id: 2, title: 'Tính năng nâng cao',
                lessons: [
                    { id: 5, title: 'Nhận diện đối tượng thông minh', type: 'video', duration: '14:20', completed: false, src: '/course-video/course-video.webm' },
                    { id: 6, title: 'Điều hướng theo điểm', type: 'video', duration: '13:55', completed: false, src: '/course-video/course-video.webm' },
                    { id: 7, title: 'Kiểm tra kiến thức', type: 'quiz', duration: '10:00', completed: false },
                ]
            }
        ],
        instructor: { name: 'Hệ thống đào tạo DJI', avatar: 'https://ui-avatars.com/api/?name=DJI&background=0D8ABC&color=fff' },
        description: `Đây là thông tin mới nhất về dòng DJI Matrice 4. Khóa đào tạo mới cung cấp hơn 10 tính năng mới. Xem liên kết bên dưới để biết thêm chi tiết.`
    };

    const handleLessonSelect = (lesson) => {
        setActiveLesson(lesson);
        if (lesson.type === 'quiz') { setQuizStep('intro'); setScore(0); setCurrentQuestionIndex(0); setSelectedAnswer(null); }
    };
    const handleAnswerSelect = (index) => setSelectedAnswer(index);
    const handleNextQuestion = () => {
        if (selectedAnswer === quizQuestions[currentQuestionIndex].correct) setScore(score + 1);
        if (currentQuestionIndex < quizQuestions.length - 1) { setCurrentQuestionIndex(currentQuestionIndex + 1); setSelectedAnswer(null); } else { setQuizStep('result'); }
    };
    const handleRetryQuiz = () => { setQuizStep('intro'); setScore(0); setCurrentQuestionIndex(0); setSelectedAnswer(null); };
    const toggleChapter = (id) => setExpandedChapters(p => ({...p, [id]: !p[id]}));
    const toggleOverview = (id) => setExpandedOverview(p => ({...p, [id]: !p[id]}));
    const getLessonIcon = (type) => {
        if (type === 'video') return <Video size={16} />;
        if (type === 'quiz') return <PenTool size={16} />;
        return <FileText size={16} />;
    };

    return (
        <div className="lms-page">
            <div className="lms-player-section">
                <div className="player-header">
                    <div className="header-left">
                        <h1 className="course-header-title">{courseData.title}</h1>
                        <div className="rating-badge"><Star size={14} fill="#ffc107" color="#ffc107" /> 4.8</div>
                        <span style={{fontSize: '0.8rem', color: '#aaa', marginLeft: '10px'}}>Thời lượng: 3h 45p | Bạn có thể nhận được 85 tín chỉ</span>
                    </div>
                    <div className="header-right">
                        <span style={{fontSize: '0.8rem', color: '#aaa'}}>Đã hoàn thành 3/10</span>
                        <div className="progress-bar"><div className="progress-fill" style={{width: '30%'}}></div></div>
                        <button className="btn-plan">Thêm vào kế hoạch của tôi</button>
                    </div>
                </div>

                <div className="player-body">
                    <div className="player-sidebar">
                        {courseData.chapters.map(chapter => (
                            <div key={chapter.id} className="chapter-group">
                                <div className="chapter-header" onClick={() => toggleChapter(chapter.id)}>
                                    <span>Chương {chapter.id}: {chapter.title}</span>
                                    {expandedChapters[chapter.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                                {expandedChapters[chapter.id] && (
                                    <div className="lesson-list">
                                        {chapter.lessons.map(lesson => (
                                            <div 
                                                key={lesson.id} 
                                                className={`lesson-item ${activeLesson.id === lesson.id ? 'active' : ''}`} 
                                                onClick={() => handleLessonSelect(lesson)}
                                            >
                                                <div className="lesson-icon">{getLessonIcon(lesson.type)}</div>
                                                <div className="lesson-info">
                                                    <div className="lesson-title">{lesson.title}</div>
                                                    <div className="lesson-duration">{lesson.duration}</div>
                                                </div>
                                                {lesson.completed && <div className="status-dot"></div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="player-screen">
                        {activeLesson.type === 'video' ? (
                            <div className="video-wrapper">
                                <video key={activeLesson.src} controls autoPlay className="main-video-player">
                                    <source src={activeLesson.src} type="video/webm" />
                                </video>
                            </div>
                        ) : activeLesson.type === 'quiz' ? (
                            <div className="quiz-wrapper">
                                {quizStep === 'intro' && (
                                    <div className="quiz-card">
                                        <div className="quiz-header-with-qr">
                                            <h2 className="quiz-main-title">Thời gian làm bài: Không giới hạn</h2>
                                            <div className="qr-icon-wrapper">
                                                <QrCode size={32} strokeWidth={1.5} color="#0066cc" />
                                            </div>
                                        </div>
                                        <div className="quiz-info-grid-light">
                                            <div className="info-item-light">
                                                <FileText size={18} color="#666" />
                                                <span>Tổng số câu hỏi: {quizQuestions.length} câu hỏi</span>
                                            </div>
                                            <div className="info-item-light">
                                                <CheckCircle size={18} color="#666" />
                                                <span>Số câu đã làm: 0 câu hỏi</span>
                                            </div>
                                            <div className="info-item-light">
                                                <Video size={18} color="#666" />
                                                <span>Số câu sai: 0 câu hỏi</span>
                                            </div>
                                            <div className="info-item-light">
                                                <Clock size={18} color="#666" />
                                                <span>Thời gian làm bài: 0s</span>
                                            </div>
                                        </div>
                                        <p className="quiz-description">
                                            Bạn có thể sử dụng những câu hỏi thực hành này để đánh giá mức độ hiểu biết của mình về chủ đề tạo.
                                        </p>
                                        <div className="quiz-actions">
                                            <button className="btn-light-outline">Làm lại</button>
                                            <button className="btn-blue-fill" onClick={() => setQuizStep('playing')}>Bắt đầu</button>
                                        </div>
                                    </div>
                                )}
                                {quizStep === 'playing' && (
                                    <div className="quiz-card">
                                        <div className="question-card-new">
                                            <div className="question-header-new">
                                                <h3>Câu hỏi {currentQuestionIndex + 1}/{quizQuestions.length}</h3>
                                                <div className="progress-bar-new">
                                                    <div className="progress-blue" style={{width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`}}></div>
                                                </div>
                                            </div>
                                            
                                            <p className="question-text-new">{quizQuestions[currentQuestionIndex].question}</p>
                                            
                                            <div className="options-list-new">
                                                {quizQuestions[currentQuestionIndex].options.map((opt, idx) => (
                                                    <label key={idx} className={`option-radio ${selectedAnswer === idx ? 'selected' : ''}`}>
                                                        <input 
                                                            type="radio" 
                                                            name="answer" 
                                                            checked={selectedAnswer === idx} 
                                                            onChange={() => handleAnswerSelect(idx)} 
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            
                                            <div className="quiz-footer-actions">
                                                <button className="btn-light-outline" disabled={currentQuestionIndex === 0}>
                                                    Câu trước
                                                </button>
                                                <button className="btn-blue-fill" disabled={selectedAnswer === null} onClick={handleNextQuestion}>
                                                    Câu tiếp
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {quizStep === 'result' && (
                                    <div className="quiz-card">
                                        <div className="result-box-bordered">
                                            <h3>Kết quả bài kiểm tra</h3>
                                            <span className="score-text-blue">{score}/{quizQuestions.length}</span>
                                            <div className="result-bar-light">
                                                <div className="result-fill-yellow" style={{width: `${(score / quizQuestions.length) * 100}%`}}></div>
                                            </div>
                                            <p className="result-percent-text">{((score / quizQuestions.length) * 100).toFixed(0)}% đúng</p>
                                        </div>
                                        <div className="quiz-footer-actions">
                                            <button className="btn-light-outline" onClick={handleRetryQuiz}>Làm lại</button>
                                            <button className="btn-blue-fill" onClick={() => setActiveLesson(courseData.chapters[0].lessons[0])}>Tiếp tục học</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="doc-wrapper">
                                <iframe src={activeLesson.src} className="pdf-viewer" title="Course Document"></iframe>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lms-info-section">
                <div className="container">
                    <div className="course-tabs">
                        <button className={`tab-btn ${activeTab === 'intro' ? 'active' : ''}`} onClick={() => setActiveTab('intro')}>
                            Giới thiệu
                        </button>
                        <button className={`tab-btn ${activeTab === 'comment' ? 'active' : ''}`} onClick={() => setActiveTab('comment')}>
                            Bình luận
                        </button>
                        <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                            Ghi chú
                        </button>
                    </div>

                    <div className="tab-content-grid">
                        {activeTab === 'intro' && (
                            <div className="main-col">
                                <div className="section-block">
                                    <h3>Giảng viên</h3>
                                    <div className="instructor-box">
                                        <img src={courseData.instructor.avatar} alt="Instructor" className="avatar-circle" />
                                        <div className="inst-info">
                                            <span className="label">Giảng viên</span>
                                            <span className="name">{courseData.instructor.name}</span>
                                        </div>
                                    </div>
                                    <div className="desc-text">
                                        <p><strong>Giới thiệu</strong></p>
                                        <p>{courseData.description}</p>
                                        <a href="#" style={{color: '#1890ff'}}>https://enterprise.dji.com/matrice-4-series</a>
                                    </div>
                                </div>
                                <div className="content-list-wrapper">
                                    <h3 className="content-section-title">Nội dung khóa học</h3>
                                    {courseData.chapters.map(chapter => (
                                        <div key={chapter.id} className="content-chapter-item">
                                            <div className="content-chapter-header" onClick={() => toggleOverview(chapter.id)}>
                                                <span className="chapter-title-text">{chapter.title}</span>
                                                <span className="chapter-chevron">{expandedOverview[chapter.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                                            </div>
                                            {expandedOverview[chapter.id] && (
                                                <div className="content-chapter-body">
                                                    {chapter.lessons.map(lesson => (
                                                        <div key={lesson.id} className="content-lesson-row">
                                                            <span className="lesson-row-icon">{getLessonIcon(lesson.type)}</span>
                                                            <span className="lesson-row-title">{lesson.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'comment' && (
                            <div className="main-col full-width">
                                <div className="comment-input-area">
                                    <textarea placeholder="Chia sẻ ý kiến của bạn..." rows="3"></textarea>
                                    <div className="comment-actions">
                                        <div className="rating-select">Đánh giá: <Star size={16} /> <Star size={16} /> <Star size={16} /> <Star size={16} /> <Star size={16} /></div>
                                        <span className="char-count">0/500</span>
                                        <button className="btn-send">Đăng</button>
                                    </div>
                                </div>
                                <div className="comments-list">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="user-avatar-badge">
                                                <div className="avatar-circle">{comment.avatar}</div>
                                                <span className="level-badge">{comment.level}</span>
                                            </div>
                                            <div className="comment-content-box">
                                                <div className="comment-header">
                                                    <span className="user-name">{comment.name}</span>
                                                    <div className="user-rating">{[...Array(comment.rating)].map((_,i)=><Star key={i} size={12} fill="#ffc107" color="#ffc107"/>)}</div>
                                                </div>
                                                <div className="comment-text">{comment.content}</div>
                                                <div className="comment-footer">
                                                    <span className="time">{comment.time}</span>
                                                    <button className="action-btn"><ThumbsUp size={12}/> Trả lời</button>
                                                    <button className="action-btn">0 <ThumbsUp size={12}/></button>
                                                    <button className="action-btn">Chia sẻ với học viên khác</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="main-col full-width">
                                <div className="notes-filter-tabs">
                                    <button className="filter-btn active">Tất cả</button>
                                    <button className="filter-btn">Nổi bật</button>
                                    <button className="filter-btn">Của tôi</button>
                                </div>
                                <div className="comments-list">
                                    {notes.map(note => (
                                        <div key={note.id} className="comment-item">
                                            <div className="user-avatar-badge">
                                                <div className="avatar-circle" style={{backgroundColor:'#ddd'}}>L</div>
                                                <span className="level-badge">{note.level}</span>
                                            </div>
                                            <div className="comment-content-box">
                                                <div className="comment-header">
                                                    <span className="user-name">{note.name}</span>
                                                    <span className="note-time-stamp">{note.time}</span>
                                                </div>
                                                <div className="note-link">
                                                    <Clock size={12}/> {note.videoTime} <span>{note.lesson}</span>
                                                </div>
                                                <div className="comment-text">{note.content}</div>
                                                <div className="comment-footer">
                                                    <button className="action-btn"><ThumbsUp size={12}/> {note.likes}</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'intro' && (
                            <div className="side-col">
                                <div className="side-card">
                                    <h3><MessageSquare size={16} /> Khu vực thảo luận</h3>
                                    <p className="small-text">Kết nối với bạn học và giảng viên để thảo luận và chia sẻ kiến thức về khóa học này.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetailPage;