import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import TournamentManager from './components/TournamentManager';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Profile from './components/Profile';
import Avatar from './components/Avatar';
import Leaderboard from './components/Leaderboard';

const AppContent = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(null); // 'singles' | 'doubles' | null
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0 }}>The Legendary Wee Weekly!</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowLeaderboard('singles')}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎾 Singles
                        </button>
                        <button
                            onClick={() => setShowLeaderboard('doubles')}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                backgroundColor: 'var(--info)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎾🎾 Doubles
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div 
                                onClick={() => setShowProfile(true)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    transition: 'background-color 0.2s',
                                    ':hover': {
                                        backgroundColor: 'var(--background-color)'
                                    }
                                }}
                            >
                                <Avatar 
                                    src={user.avatar} 
                                    alt={user.name}
                                    size={32}
                                    style={{ border: '2px solid var(--border-color)' }}
                                />
                                <span style={{ 
                                    fontSize: '14px', 
                                    color: 'var(--text-secondary)',
                                    fontWeight: '500'
                                }}>
                                    {user.name} ({user.role})
                                </span>
                            </div>
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
            
            {showProfile && (
                <Profile onClose={() => setShowProfile(false)} />
            )}

            {showLeaderboard && (
                <Leaderboard 
                    type={showLeaderboard} 
                    onClose={() => setShowLeaderboard(null)} 
                />
            )}
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