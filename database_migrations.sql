-- Tennis Tournament Database Schema
-- Run these commands in your Supabase SQL editor

-- First, let's update the existing players table to match our new schema
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS total_singles_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_doubles_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS singles_events_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS doubles_events_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS singles_ranking_points DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS doubles_ranking_points DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove old columns if they exist
ALTER TABLE players DROP COLUMN IF EXISTS events_singles;
ALTER TABLE players DROP COLUMN IF EXISTS events_doubles;

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tournament_date DATE NOT NULL,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table (singles/doubles events within a tournament)
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT REFERENCES tournaments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('singles', 'doubles')),
    max_participants INTEGER,
    status TEXT DEFAULT 'registration' CHECK (status IN ('registration', 'draw_created', 'in_progress', 'completed')),
    draw_structure JSONB, -- Store the bracket structure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_participants table (who's playing in each event)
CREATE TABLE IF NOT EXISTS event_participants (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    partner_id BIGINT REFERENCES players(id) ON DELETE CASCADE, -- For doubles only
    seed_position INTEGER, -- Seeding position (1, 2, 3, etc. for seeded players)
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'eliminated', 'withdrawn')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, player_id) -- A player can only register once per event
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    player1_id BIGINT REFERENCES players(id),
    player2_id BIGINT REFERENCES players(id),
    player1_partner_id BIGINT REFERENCES players(id), -- For doubles
    player2_partner_id BIGINT REFERENCES players(id), -- For doubles
    round_name TEXT NOT NULL, -- 'Final', 'Semi-Final', 'Quarter-Final', 'Round of 16', etc.
    bracket_type TEXT NOT NULL CHECK (bracket_type IN ('main', 'consolation')),
    match_number INTEGER, -- Position in the draw
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'walkover', 'cancelled')),
    score TEXT, -- Store match score as text (e.g., "6-4, 6-2")
    winner_id BIGINT REFERENCES players(id), -- Can be player1_id or player2_id
    scheduled_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_results table (points earned by each player/team)
CREATE TABLE IF NOT EXISTS match_results (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES matches(id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL DEFAULT 0,
    result_type TEXT NOT NULL, -- 'winner', 'runner_up', 'semi_final', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(tournament_date);
CREATE INDEX IF NOT EXISTS idx_events_tournament ON events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_player ON event_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player ON match_results(player_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - adjust policies as needed for your auth setup
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you may want to adjust these based on your authentication needs)
CREATE POLICY "Enable read access for all users" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON matches FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON match_results FOR SELECT USING (true);

-- You'll want to add more restrictive policies for INSERT/UPDATE/DELETE based on your auth setup
-- For now, allowing all operations (adjust as needed):
CREATE POLICY "Enable all operations for authenticated users" ON tournaments FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON events FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON event_participants FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON matches FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON match_results FOR ALL USING (true);
