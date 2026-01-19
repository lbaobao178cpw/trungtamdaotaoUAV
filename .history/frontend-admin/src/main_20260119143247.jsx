import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Dòng này nhập 'App' từ 'App.jsx'
import './lib/apiInterceptor.js' // Khởi tạo API interceptor


// Dòng này tìm 'root' trong 'index.html' và render App vào đó
ReactDOM.createRoot(document.getElementById('root')).render(
  // === SỬA LỖI ===
  // Chúng ta đã XÓA <React.StrictMode>
  // để ngăn useEffect chạy 2 lần
  <App />
);