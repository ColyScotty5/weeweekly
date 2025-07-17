import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import 'preact-material-components/style.css';
import playersData from './players_singles.json';
import DatabaseTest from './components/DatabaseTest';

const App = () => {
    const [players, setPlayers] = useState([]);

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

    return (
        <div style={{ padding: '1rem' }}>
            <h1>Tennis Tournament</h1>
            
            {/* Database Test Component */}
            <DatabaseTest />
            
            <hr style={{ margin: '2rem 0' }} />
            
            <h2>Current Data (from JSON)</h2>
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
    );
};

export default App;