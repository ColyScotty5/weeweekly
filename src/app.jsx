import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import 'preact-material-components/style.css';
import TournamentManager from './components/TournamentManager';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';

const AppContent = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { user, logout } = useAuth();

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

    const handleLogout = () => {
        if (confirm('Are you sure you want to sign out?')) {
            logout();
        }
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <h1>The Legendary Wee Weekly!</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ 
                                fontSize: '14px', 
                                color: 'var(--text-secondary)',
                                fontWeight: '500'
                            }}>
                                {user.name} ({user.role})
                            </span>
                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                    <button 
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>
            <TournamentManager />
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AuthGuard>
                <AppContent />
            </AuthGuard>
        </AuthProvider>
    );
};

export default App;