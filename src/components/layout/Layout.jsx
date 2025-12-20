import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Navbar />
            <main className="main-content">
                {children}
            </main>
            <footer className="footer">
                <p>© 2025 서울신답초등학교 정용석 · Total Visual Art Class. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;
