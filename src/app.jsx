import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import 'preact-material-components/style.css';
import TournamentManager from './components/TournamentManager';

const App = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load theme preference from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDarkMode(savedTheme === 'dark');
        } else {
            // Check system preference
            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    }, []);

    // Apply theme to document and save preference
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <h1>The Legendary Wee Weekly!</h1>
                <button 
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>
            <TournamentManager />
        </div>
    );
};

export default App;