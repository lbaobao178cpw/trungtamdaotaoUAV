import React from 'react';

// Đây là một "cái bẫy" lỗi. 
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Hàm này sẽ được gọi khi có lỗi
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Lỗi 3D bị bắt bởi Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Giao diện Lỗi
      return (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          color: 'red',
          fontFamily: 'monospace',
          padding: '20px',
          boxSizing: 'border-box',
          zIndex: 9999,
        }}>
          <h1 style={{ color: 'red', fontSize: '24px' }}>Lỗi 3D - Ứng dụng đã sập!</h1>
          <p style={{ fontSize: '16px' }}>Đây là lỗi thực sự đã xảy ra:</p>
          <pre style={{
            backgroundColor: '#fff0f0',
            border: '1px solid red',
            padding: '10px',
            borderRadius: '5px',
            maxWidth: '100%',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}>
            {this.state.error && this.state.error.toString()}
          </pre>
        </div>
      );
    }

    // Nếu không có lỗi, render các component con bình thường
    return this.props.children; 
  }
}

export default ErrorBoundary;