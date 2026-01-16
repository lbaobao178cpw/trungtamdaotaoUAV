import React, { useEffect, useRef } from "react";

// Component riêng để xử lý Panorama - Giúp code gọn và fix lỗi reload
const PanoramaViewer = ({ panoramaUrl }) => {
    const viewerContainerRef = useRef(null);
    const viewerInstanceRef = useRef(null);

    useEffect(() => {
        // 1. Kiểm tra thư viện và container
        if (!window.pannellum || !viewerContainerRef.current) return;

        // 2. Hàm dọn dẹp instance cũ nếu có
        const destroyViewer = () => {
            if (viewerInstanceRef.current) {
                try {
                    viewerInstanceRef.current.destroy();
                } catch (e) {
                    // Bỏ qua lỗi nếu viewer chưa sẵn sàng
                }
                viewerInstanceRef.current = null;
            }
        };

        // Dọn dẹp trước khi tạo mới
        destroyViewer();

        // 3. Khởi tạo Viewer mới
        try {
            viewerInstanceRef.current = window.pannellum.viewer(viewerContainerRef.current, {
                type: "equirectangular",
                panorama: panoramaUrl,
                autoLoad: true,
                showControls: true,
                showFullscreenCtrl: false, // Tắt full screen của pannellum để dùng của web nếu muốn
                showZoomCtrl: true,
                mouseZoom: true,
                hfov: 110,
                pitch: 0,
                yaw: 0,
                backgroundColor: "#222222" // [THEME] Màu nền tối khi ảnh đang load
            });
        } catch (error) {
            console.error("Lỗi khởi tạo Panorama:", error);
        }

        // 4. Cleanup khi component bị hủy (người dùng đóng popup hoặc chuyển tab)
        return () => {
            destroyViewer();
        };
    }, [panoramaUrl]); // Chạy lại khi URL thay đổi

    return (
        <div 
            ref={viewerContainerRef} 
            style={{ 
                width: '100%', 
                height: '300px', // Chiều cao cố định để không bị méo
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#e1e1e1', // [THEME] Màu nền card khi chưa có ảnh
                border: '1px solid #555'   // [THEME] Viền nhẹ
            }} 
        />
    );
};

export default PanoramaViewer;