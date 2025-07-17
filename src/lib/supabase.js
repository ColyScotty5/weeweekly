import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Players table operations
export const playersApi = {
  // Get all players
  async getAll() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get player by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new player
  async create(player) {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update player
  async update(id, updates) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete player
  async delete(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
} 