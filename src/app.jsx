import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Stack,
  Box,
  Container,
  Tooltip,
  Divider,
  Menu,
  MenuItem
} from '@mui/material'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuIcon from '@mui/icons-material/Menu'
import { ThemeProvider, useColorScheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme'
import DrawMaker from './components/DrawMaker'
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
  const [showLeaderboard, setShowLeaderboard] = useState(null)
  const [showDrawMaker, setShowDrawMaker] = useState(false)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null)

  const showPublicSection = (sectionId) => {
    setMobileMenuAnchor(null)
    setShowDrawMaker(false)
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
      <AppBar position="sticky" color="default" enableColorOnDark sx={{ displayPrint: 'none' }}>
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
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowDrawMaker((current) => !current)}
            >
              {showDrawMaker ? 'Public view' : 'Make a draw'}
            </Button>
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
        <MenuItem
          onClick={() => {
            setMobileMenuAnchor(null)
            setShowDrawMaker((current) => !current)
          }}
        >
          {showDrawMaker ? 'Public view' : 'Make a draw'}
        </MenuItem>
      </Menu>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {showDrawMaker ? (
          <DrawMaker />
        ) : (
          <PublicHome onOpenLeaderboard={setShowLeaderboard} />
        )}
      </Container>

      {showLeaderboard && (
        <Leaderboard
          type={showLeaderboard}
          onClose={() => setShowLeaderboard(null)}
        />
      )}

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
      <AppContent />
    </ThemeProvider>
  )
}
