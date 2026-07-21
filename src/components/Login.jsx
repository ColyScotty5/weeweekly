import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Stack
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../contexts/AuthContext'

// Drop images here (served from /public):
//   public/login-bg-desktop.jpg  — wide / landscape
//   public/login-bg-mobile.jpg   — tall / portrait
const LOGIN_BG_DESKTOP = `${import.meta.env.BASE_URL}login-bg-desktop.jpg`
const LOGIN_BG_MOBILE = `${import.meta.env.BASE_URL}login-bg-mobile.jpg`

export default function Login({ onCancel }) {
  const [formData, setFormData] = useState({
    email: '',
    password: 'REMOVED'
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password')
      return
    }

    try {
      await login(formData.email, formData.password)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        // Mobile / portrait-first background
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${LOGIN_BG_MOBILE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Desktop / wider screens
        '@media (min-width: 768px)': {
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${LOGIN_BG_DESKTOP})`
        }
      }}
    >
      {/* Force light scheme so dark mode doesn't make text/inputs white on this card */}
      <Card
        data-mui-color-scheme="light"
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          color: 'text.primary',
          backdropFilter: 'blur(6px)',
          boxShadow: 6,
          '& .MuiTypography-root': {
            color: 'text.primary'
          },
          '& .MuiTypography-colorTextSecondary': {
            color: 'text.secondary'
          },
          '& .MuiInputBase-root': {
            color: 'text.primary',
            bgcolor: 'background.paper'
          },
          '& .MuiInputLabel-root': {
            color: 'text.secondary'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.23)'
          },
          '& .MuiIconButton-root': {
            color: 'action.active'
          }
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h5" component="h1" fontWeight={700} color="text.primary">
              The Legendary Wee Weekly!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please sign in to continue
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                autoComplete="email"
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                disabled={loading}
                fullWidth
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              {onCancel && (
                <Button type="button" color="inherit" onClick={onCancel} disabled={loading}>
                  Back to public view
                </Button>
              )}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
