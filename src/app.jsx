import { h } from 'preact';
import 'preact-material-components/style.css';
import TournamentManager from './components/TournamentManager';

const App = () => {
    return (
        <div style={{ padding: '1rem' }}>
            <h1>Wee Weekly Tennis Tournament App</h1>
            <TournamentManager />
        </div>
    );
};

export default App;