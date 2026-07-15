import { playersApi } from './supabase.js'
import playerData from '../players_singles.json'

const convertPlayerData = (player) => ({
  name: player.name
})

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...')

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
