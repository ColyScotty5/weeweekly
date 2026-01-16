import { useState, useEffect } from 'preact/hooks'
import { playersApi } from '../lib/supabase.js'
import Avatar from './Avatar.jsx'
import { getUserAvatarByEmail } from '../contexts/AuthContext.jsx'

export default function Leaderboard({ type, onClose }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPlayers()
  }, [type])

  const loadPlayers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await playersApi.getAll()
      
      // Calculate rankings for each player
      const playersWithRankings = data.map(player => {
        let eventsPlayed, totalPoints
        
        if (type === 'singles') {
          eventsPlayed = player.singles_events_played || 0
          totalPoints = player.total_singles_points || 0
        } else {
          eventsPlayed = player.doubles_events_played || 0
          totalPoints = player.total_doubles_points || 0
        }
        
        // Calculate CD = 1.5(events_played * 0.5) = 0.75 * events_played
        const cd = eventsPlayed > 0 ? 1.5 + (eventsPlayed * 0.5) : 0
        
        // Calculate Rank Points = total_points / CD
        const rankPoints = cd > 0 ? totalPoints / cd : 0
        
        return {
          ...player,
          eventsPlayed,
          totalPoints,
          cd,
          rankPoints
        }
      })
      
      // Filter out players with no events played
      const activePlayers = playersWithRankings.filter(p => p.eventsPlayed > 0)
      
      // Sort by rank points (descending)
      activePlayers.sort((a, b) => b.rankPoints - a.rankPoints)
      
      // Assign ranks (handling ties)
      let currentRank = 1
      for (let i = 0; i < activePlayers.length; i++) {
        if (i > 0 && activePlayers[i].rankPoints < activePlayers[i - 1].rankPoints) {
          currentRank = i + 1
        }
        activePlayers[i].rank = currentRank
      }
      
      setPlayers(activePlayers)
    } catch (err) {
      console.error('Error loading players:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="leaderboard-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div style={{
        backgroundColor: 'var(--card-background)',
        borderRadius: '12px',
        padding: '0',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderBottom: '2px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px 12px 0 0'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--text-color)',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            🏆 {type === 'singles' ? 'Singles' : 'Doubles'} Leaderboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: '20px'
        }}>
          {loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
              Loading leaderboard...
            </div>
          )}

          {error && (
            <div style={{ 
              padding: '20px',
              backgroundColor: 'var(--danger)',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              ❌ Error: {error}
            </div>
          )}

          {!loading && !error && players.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
              No players have competed in {type} events yet.
            </div>
          )}

          {!loading && !error && players.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white'
                  }}>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      width: '60px'
                    }}>
                      Rank
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      Player
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      width: '120px'
                    }}>
                      Rank Points
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      width: '120px'
                    }}>
                      Total Points
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      width: '120px'
                    }}>
                      Total Matches
                    </th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                      width: '80px'
                    }}>
                      CD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr 
                      key={player.id}
                      style={{
                        borderBottom: index < players.length - 1 ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-secondary)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                      }}
                    >
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '18px',
                        color: player.rank === 1 ? '#FFD700' : 
                               player.rank === 2 ? '#C0C0C0' : 
                               player.rank === 3 ? '#CD7F32' : 
                               'var(--text-primary)'
                      }}>
                        {player.rank === 1 && '🥇'}
                        {player.rank === 2 && '🥈'}
                        {player.rank === 3 && '🥉'}
                        {player.rank > 3 && player.rank}
                      </td>
                      <td style={{ 
                        padding: '16px 12px',
                        color: 'var(--text-primary)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <Avatar 
                            src={getUserAvatarByEmail(player.email)} 
                            alt={player.name}
                            size={40}
                          />
                          <span style={{ fontWeight: '500' }}>{player.name}</span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: 'var(--accent-primary)',
                        fontSize: '16px'
                      }}>
                        {player.rankPoints.toFixed(2)}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        color: 'var(--text-primary)'
                      }}>
                        {player.totalPoints.toFixed(0)}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        color: 'var(--text-primary)'
                      }}>
                        {player.eventsPlayed}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                      }}>
                        {player.cd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with explanation */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '0 0 12px 12px'
        }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            <strong>How rankings work:</strong><br/>
            CD (Countable Days) = 1.5 × (Events Played × 0.5) | 
            Rank Points = Total Points ÷ CD
          </div>
        </div>
      </div>
    </div>
  )
}
