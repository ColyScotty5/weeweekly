-- Link existing players to user profiles by adding email addresses
-- Run this in your Supabase SQL editor after running the main migration

-- Update Scott Turnbull's player record with his email
UPDATE players 
SET email = 'blazin.media@gmail.com' 
WHERE name = 'Scott Turnbull';

-- Update Luke Adams' player record with his email  
UPDATE players 
SET email = 'jlukeadams@gmail.com' 
WHERE name = 'Luke Adams';

-- Verify the updates
SELECT id, name, email FROM players WHERE email IS NOT NULL;
