import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './landing/Header';
import Footer from './landing/Footer';

const MainLayout = () => {
    return (
        <>
            <Header />
            <main>
                {/* Hiển thị nội dung của trang con (About, Exam) hoặc trang chủ (UAVLandingPage) */}
                <Outlet />
            </main>
            <Footer />
        </>
    );
};

export default MainLayout;