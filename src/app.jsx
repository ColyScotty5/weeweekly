import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Stack,
  Box,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import { ThemeProvider, useColorScheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme'
import TournamentManager from './components/TournamentManager'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthGuard from './components/AuthGuard'
import Login from './components/Login'
import Profile from './components/Profile'
import Avatar from './components/Avatar'
import Leaderboard from './components/Leaderboard'
import PublicHome from './components/PublicHome'

function ThemeToggle() {
  const { mode, setMode, systemMode } = useColorScheme()
  const resolvedMode = mode === 'system' ? systemMode : mode
  const isDark = resolvedMode === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        color="inherit"
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}

function AppContent() {
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const { user, logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, mr: 1 }}>
            The Legendary Wee Weekly!
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SportsTennisIcon />}
              onClick={() => setShowLeaderboard('singles')}
            >
              Singles
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<SportsTennisIcon />}
              onClick={() => setShowLeaderboard('doubles')}
            >
              Doubles
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {user && (
              <>
                <Button
                  color="inherit"
                  onClick={() => setShowProfile(true)}
                  startIcon={
                    <Avatar src={user.avatar} alt={user.name} size={32} />
                  }
                  sx={{ textTransform: 'none' }}
                >
                  {user.name} ({user.roleLabel})
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={() => setConfirmLogout(true)}
                >
                  Sign Out
                </Button>
              </>
            )}
            {!user && (
              <Button color="inherit" size="small" onClick={() => setShowAdmin(true)}>
                Admin sign in
              </Button>
            )}
            {user && (
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowAdmin((current) => !current)}
              >
                {showAdmin ? 'Public view' : 'Manage tournaments'}
              </Button>
            )}
            <ThemeToggle />
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {showAdmin ? (
          <AuthGuard fallback={<Login onCancel={() => setShowAdmin(false)} />}>
            <TournamentManager />
          </AuthGuard>
        ) : (
          <PublicHome onOpenLeaderboard={setShowLeaderboard} />
        )}
      </Container>

      {showProfile && <Profile onClose={() => setShowProfile(false)} />}

      {showLeaderboard && (
        <Leaderboard
          type={showLeaderboard}
          onClose={() => setShowLeaderboard(null)}
        />
      )}

      <Dialog open={confirmLogout} onClose={() => setConfirmLogout(false)}>
        <DialogTitle>Sign out?</DialogTitle>
        <DialogContent>
          Are you sure you want to sign out?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLogout(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmLogout(false)
              setShowAdmin(false)
              logout()
            }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="light"
      modeStorageKey="theme"
      disableTransitionOnChange
      forceThemeRerender
    >
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
