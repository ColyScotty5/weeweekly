# Wee Weekly Tennis Tournament App

A comprehensive web application for managing weekly tennis tournaments with automated draw generation, match tracking, and player rankings.

## Features

### Tournament Management
- Create and manage weekly tournaments
- Support for both singles and doubles events
- Automated player registration system
- Tournament status tracking (upcoming, in-progress, completed)

### Draw Generation
- **Singles**: Top 1/4 of participants get seeded, rest are randomly placed
- **Doubles**: Half of participants get seeded, other half randomly assigned as partners
- Standard tournament bracket structure
- Support for consolation brackets

### Match Tracking
- Record match results with scores
- Automatic points calculation based on tournament rules
- Real-time tournament progress tracking
- Match status management (scheduled, in-progress, completed)

### Player Rankings
- Separate rankings for singles and doubles
- Points-based ranking system
- Historical performance tracking
- Automatic ranking updates after tournaments

### Points System

#### Singles Events
**Main Draw:**
- Winner: 45 points
- Runner-up: 30 points
- Semi-final: 20 points
- Quarter-final: 14 points
- Round of 16: 8 points
- Round of 32: 5 points

**Consolation Draw:**
- Winner: 14 points
- Runner-up: 12 points
- Semi-final: 8 points
- Quarter-final: 5 points
- Round of 16: 3 points
- Round of 32: 2 points

#### Doubles Events
**Main Draw:**
- Winner: 30 points
- Runner-up: 20 points
- Semi-final: 14 points
- Quarter-final: 10 points
- Round of 16: 5 points
- Round of 32: 3 points

**Consolation Draw:**
- Winner: 14 points
- Runner-up: 12 points
- Semi-final: 8 points
- Quarter-final: 5 points
- Round of 16: 3 points
- Round of 32: 2 points

## Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- **players**: Player information and statistics
- **tournaments**: Tournament details and scheduling
- **events**: Individual events within tournaments (singles/doubles)
- **event_participants**: Player registrations for events
- **matches**: Individual matches with results
- **match_results**: Points earned by players in matches

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### 1. Clone and Install
```bash
git clone <repository-url>
cd weeweeklyapp
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup
1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `database_migrations.sql`
3. Run the SQL commands to create all necessary tables and indexes

### 4. Initial Data (Optional)
The app includes a database test component that can seed initial player data from the existing JSON file.

### 5. Run the Application
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment

### Production Build
To build the app for production deployment:
```bash
npm run build
```

The built files will be in the `dist/` folder, ready for deployment to any web server.

### Deployment Options
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- GitHub Pages (free)
- Netlify (free tier available)
- Vercel (free tier available)
- Traditional web hosting

### Testing Production Build Locally
```bash
npm run preview
```

## Usage Guide

### Creating a Tournament
1. Go to the "Tournament Manager" tab
2. Click "Create New Tournament"
3. Fill in tournament details:
   - Name (e.g., "Wee Weekly - March 15, 2024")
   - Date
   - Description (optional)
   - Select which events to include (singles/doubles)
   - Set maximum participants for each event

### Managing Player Registration
1. Select a tournament from the list
2. For each event, click "Manage Registration"
3. Select players from the available list
4. Players are automatically sorted by ranking for seeding purposes

### Generating Draws
1. Ensure at least 4 players are registered for an event
2. Click "Generate Draw" for the event
3. The system will:
   - Seed top players according to tournament rules
   - Randomly place unseeded players
   - Create the bracket structure
   - Generate first round matches

### Recording Match Results
1. Navigate to an event with generated matches
2. Click "Record Result" on any scheduled match
3. Select the winner and enter the score
4. Points are automatically calculated and awarded
5. Player rankings are updated in real-time

### Viewing Rankings
Player rankings are automatically calculated based on tournament results and displayed throughout the application.

## Technical Details

### Architecture
- **Frontend**: Preact (React-like framework)
- **Backend**: Supabase (PostgreSQL + API)
- **Styling**: CSS-in-JS with inline styles
- **State Management**: Preact hooks

### Key Components
- `TournamentManager`: Main tournament creation and management interface
- `MatchResults`: Match result entry and tracking
- `DatabaseTest`: Database connection testing and data seeding
- Tournament utilities for draw generation and points calculation

### API Structure
The app uses a modular API structure with separate modules for:
- `playersApi`: Player CRUD operations and rankings
- `tournamentsApi`: Tournament management
- `eventsApi`: Event management within tournaments
- `participantsApi`: Player registration for events
- `matchesApi`: Match creation and result tracking
- `resultsApi`: Points and results management

## Development

### Adding New Features
The modular structure makes it easy to extend functionality:
- Add new API methods in `src/lib/supabase.js`
- Create new components in `src/components/`
- Extend tournament utilities in `src/lib/tournamentUtils.js`

### Database Modifications
When modifying the database schema:
1. Update `database_migrations.sql`
2. Update corresponding API methods
3. Update component interfaces as needed

## Troubleshooting

### Common Issues
1. **Database connection errors**: Check your `.env` file and Supabase credentials
2. **RLS (Row Level Security) issues**: Ensure policies are set up correctly in Supabase
3. **Draw generation fails**: Verify minimum participant requirements are met

### Support
For issues or questions, check the browser console for detailed error messages and ensure all database migrations have been applied correctly.
