import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Available themes
export const themes = {
    pink: {
        name: '파스텔 핑크 (기본)',
        primary: '#f472b6',
        primaryHover: '#ec4899',
        bgColor: '#fdf2f8',
        textMain: '#4a044e',
        textSub: '#831843',
        cardBg: '#ffffff',
        accent: '#fbbf24'
    },
    blue: {
        name: '클래식 블루',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        bgColor: '#f8fafc',
        textMain: '#1e293b',
        textSub: '#64748b',
        cardBg: '#ffffff',
        accent: '#0ea5e9'
    },
    green: {
        name: '네이처 그린',
        primary: '#10b981',
        primaryHover: '#059669',
        bgColor: '#ecfdf5',
        textMain: '#064e3b',
        textSub: '#047857',
        cardBg: '#ffffff',
        accent: '#84cc16'
    },
    purple: {
        name: '라벤더 퍼플',
        primary: '#a855f7',
        primaryHover: '#9333ea',
        bgColor: '#faf5ff',
        textMain: '#581c87',
        textSub: '#7c3aed',
        cardBg: '#ffffff',
        accent: '#f472b6'
    }
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState('pink');

    // Apply theme to CSS variables
    useEffect(() => {
        const theme = themes[currentTheme];
        const root = document.documentElement;

        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--primary-hover', theme.primaryHover);
        root.style.setProperty('--bg-color', theme.bgColor);
        root.style.setProperty('--text-main', theme.textMain);
        root.style.setProperty('--text-sub', theme.textSub);
        root.style.setProperty('--card-bg', theme.cardBg);
        root.style.setProperty('--accent', theme.accent);
    }, [currentTheme]);

    const switchTheme = (themeName) => {
        if (themes[themeName]) {
            setCurrentTheme(themeName);
            // Optional: Save to localStorage
            localStorage.setItem('app-theme', themeName);
        }
    };

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('app-theme');
        if (saved && themes[saved]) {
            setCurrentTheme(saved);
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ currentTheme, switchTheme, themes }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
