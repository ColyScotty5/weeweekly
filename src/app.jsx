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
  Tooltip,
  Divider,
  Menu,
  MenuItem
} from '@mui/material'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
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
import PasswordRecovery from './components/PasswordRecovery'

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
  const [showLogin, setShowLogin] = useState(false)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null)
  const { user, logout, loading } = useAuth()

  const showPublicSection = (sectionId) => {
    setMobileMenuAnchor(null)
    setShowAdmin(false)
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
  }

  const openLeaderboard = (type) => {
    setMobileMenuAnchor(null)
    setShowLeaderboard(type)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar sx={{ gap: { xs: 0.5, md: 2 }, py: 1 }}>
          <Button
            variant="text"
            color="inherit"
            onClick={() => showPublicSection('top')}
            sx={{
              flexGrow: { xs: 1, md: 0 },
              mr: 1,
              justifyContent: 'flex-start',
              typography: 'h6',
              fontWeight: 700,
              textAlign: 'left'
            }}
          >
            The Legendary Wee Weekly!
          </Button>

          <Stack
            component="nav"
            aria-label="Primary navigation"
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}
          >
            <Button color="inherit" size="small" onClick={() => showPublicSection('how-it-works')}>
              About
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SportsTennisIcon />}
              onClick={() => openLeaderboard('singles')}
            >
              Singles
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<SportsTennisIcon />}
              onClick={() => openLeaderboard('doubles')}
            >
              Doubles
            </Button>
            <Button color="inherit" size="small" onClick={() => showPublicSection('schedule')}>
              Schedule
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
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
              <Button color="inherit" size="small" onClick={() => setShowLogin(true)}>
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
          </Stack>
          <ThemeToggle />
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            aria-controls={mobileMenuAnchor ? 'mobile-navigation-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={mobileMenuAnchor ? 'true' : undefined}
            onClick={(event) => setMobileMenuAnchor(event.currentTarget)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        id="mobile-navigation-menu"
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={() => setMobileMenuAnchor(null)}
        MenuListProps={{ 'aria-label': 'Mobile navigation' }}
      >
        <MenuItem onClick={() => showPublicSection('how-it-works')}>About</MenuItem>
        <MenuItem onClick={() => openLeaderboard('singles')}>Singles rankings</MenuItem>
        <MenuItem onClick={() => openLeaderboard('doubles')}>Doubles rankings</MenuItem>
        <MenuItem onClick={() => showPublicSection('schedule')}>Season schedule</MenuItem>
        <Divider />
        {user ? (
          <>
            <MenuItem
              onClick={() => {
                setMobileMenuAnchor(null)
                setShowProfile(true)
              }}
            >
              Edit profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMobileMenuAnchor(null)
                setShowAdmin((current) => !current)
              }}
            >
              {showAdmin ? 'Public view' : 'Manage tournaments'}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMobileMenuAnchor(null)
                setConfirmLogout(true)
              }}
            >
              Sign out
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={() => {
              setMobileMenuAnchor(null)
              setShowLogin(true)
            }}
          >
            Administrator sign in
          </MenuItem>
        )}
      </Menu>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {showAdmin ? (
          <AuthGuard
            fallback={<PublicHome onOpenLeaderboard={setShowLeaderboard} />}
          >
            <TournamentManager />
          </AuthGuard>
        ) : (
          <PublicHome onOpenLeaderboard={setShowLeaderboard} />
        )}
      </Container>

      <PasswordRecovery />

      {showProfile && <Profile onClose={() => setShowProfile(false)} />}

      {showLeaderboard && (
        <Leaderboard
          type={showLeaderboard}
          onClose={() => setShowLeaderboard(null)}
        />
      )}

      <Dialog
        open={showLogin}
        onClose={() => {
          if (!loading) setShowLogin(false)
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="admin-sign-in-title"
      >
        <DialogTitle id="admin-sign-in-title">Administrator sign in</DialogTitle>
        <DialogContent dividers>
          <Login
            onCancel={() => setShowLogin(false)}
            onSuccess={() => setShowLogin(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        aria-labelledby="sign-out-title"
      >
        <DialogTitle id="sign-out-title">Sign out?</DialogTitle>
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
