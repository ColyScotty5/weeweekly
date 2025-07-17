import { useState } from 'preact/hooks'
import { playersApi } from '../lib/supabase.js'
import { seedDatabase, clearPlayers } from '../lib/seedDatabase.js'

export default function DatabaseTest() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const testConnection = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await playersApi.getAll()
      setPlayers(data)
      setMessage(`✅ Connection successful! Found ${data.length} players`)
    } catch (error) {
      setMessage(`❌ Connection failed: ${error.message}`)
      console.error('Connection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const seedData = async () => {
    setLoading(true)
    setMessage('')
    try {
      await seedDatabase()
      setMessage('✅ Database seeded successfully!')
      // Refresh the player list
      const data = await playersApi.getAll()
      setPlayers(data)
    } catch (error) {
      setMessage(`❌ Seeding failed: ${error.message}`)
      console.error('Seeding error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearData = async () => {
    setLoading(true)
    setMessage('')
    try {
      await clearPlayers()
      setMessage('✅ All players cleared!')
      setPlayers([])
    } catch (error) {
      setMessage(`❌ Clear failed: ${error.message}`)
      console.error('Clear error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Database Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testConnection}
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        
        <button 
          onClick={seedData}
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white' }}
        >
          {loading ? 'Seeding...' : 'Seed Database'}
        </button>
        
        <button 
          onClick={clearData}
          disabled={loading}
          style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white' }}
        >
          {loading ? 'Clearing...' : 'Clear All'}
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {players.length > 0 && (
        <div>
          <h3>Players in Database ({players.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Singles</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Doubles</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.id}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.name}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.events_singles}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.events_doubles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 