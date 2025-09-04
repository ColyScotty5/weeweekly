import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import 'preact-material-components/style.css';
import playersData from './players_singles.json';
import DatabaseTest from './components/DatabaseTest';
import TournamentManager from './components/TournamentManager';
import MatchResults from './components/MatchResults';

const App = () => {
    const [players, setPlayers] = useState([]);
    const [activeTab, setActiveTab] = useState('tournaments');

    useEffect(() => {
        setPlayers(playersData);
    }, []);

    const singlesPoints = {
        "main": {
            "winner": 45,
            "runner_up": 30,
            "semi_final": 20,
            "quarter_final": 14,
            "round_16": 8,
            "round_32": 5
        },
        "consolation": {
            "winner": 14,
            "runner_up": 12,
            "semi_final": 8,
            "quarter_final": 5,
            "round_16": 3,
            "round_32": 2
        }
    }

    const doublesPoints = {
        "main": {
            "winner": 30,
            "runner_up": 20,
            "semi_final": 14,
            "quarter_final": 10,
            "round_16": 5,
            "round_32": 3
        },
        "consolation": {
            "winner": 14,
            "runner_up": 12,
            "semi_final": 8,
            "quarter_final": 5,
            "round_16": 3,
            "round_32": 2
        }
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'tournaments':
                return <TournamentManager />
            case 'database':
                return <DatabaseTest />
            case 'legacy':
                return (
                    <div>
                        <h2>Legacy Data (from JSON)</h2>
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th role="columnheader" scope="col">Rank</th>
                                    <th role="columnheader" scope="col">Name</th>
                                    <th role="columnheader" scope="col">Rank Points</th>
                                    <th role="columnheader" scope="col">Total Points</th>
                                    <th role="columnheader" scope="col">Total Matches</th>
                                </tr>
                            </thead>
                            <tbody className="stats-table__content">
                                {players.map((player, index) => (
                                    <tr class="stats-table__row" key={player.id}>
                                        <td>{index + 1}</td>
                                        <td>{player.name}</td>
                                        <td>{Number(player.ranking_points).toFixed(2)}</td>
                                        <td>{player.total_points}</td>
                                        <td>{player.total_matches}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            default:
                return <TournamentManager />
        }
    }

    return (
        <div style={{ padding: '1rem' }}>
            <h1>Wee Weekly Tennis Tournament App</h1>
            
            {/* Navigation Tabs */}
            <div style={{ 
                borderBottom: '2px solid #ddd', 
                marginBottom: '2rem',
                display: 'flex',
                gap: '0'
            }}>
                {[
                    { id: 'tournaments', label: 'Tournament Manager' },
                    { id: 'database', label: 'Database Test' },
                    { id: 'legacy', label: 'Legacy Data' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                            backgroundColor: activeTab === tab.id ? '#f8f9fa' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            color: activeTab === tab.id ? '#007bff' : '#666'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
};

export default App;