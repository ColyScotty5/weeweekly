import { playersApi } from './supabase.js'
import playerData from '../players_singles.json'

// Convert the JSON data to match your new table structure
const convertPlayerData = (player) => ({
  name: player.name,
  events_singles: player.tournaments || 0, // Convert tournaments to events_singles
  events_doubles: 0 // Default to 0 for new field
})

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...')
    
    // Convert and insert each player
    for (const player of playerData) {
      const convertedPlayer = convertPlayerData(player)
      await playersApi.create(convertedPlayer)
      console.log(`Added player: ${convertedPlayer.name}`)
    }
    
    console.log('Database seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

// Function to clear all players (useful for testing)
export const clearPlayers = async () => {
  try {
    const players = await playersApi.getAll()
    for (const player of players) {
      await playersApi.delete(player.id)
    }
    console.log('All players cleared from database')
  } catch (error) {
    console.error('Error clearing players:', error)
    throw error
  }
} 