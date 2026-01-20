import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                    padding: '30px',
                    textAlign: 'center',
                    background: '#fff5f5',
                    color: '#c53030',
                    borderRadius: '12px',
                    border: '2px dashed #fc8181',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ fontSize: '60px', marginBottom: '15px' }}>⚠️</div>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold' }}>
                        Không thể tải Model 3D
                    </h2>
                    <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
                        File có thể đã bị xóa hoặc đường dẫn bị lỗi.<br />
                        Vui lòng kiểm tra lại cấu hình.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
