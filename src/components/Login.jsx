import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Stack
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../contexts/AuthContext'

export default function Login({ onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [requestingRecovery, setRequestingRecovery] = useState(false)
  const { login, loading, requestPasswordRecovery } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password')
      return
    }

    try {
      await login(formData.email, formData.password)
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handlePasswordRecovery = async () => {
    setError('')
    setSuccess('')
    if (!formData.email.trim()) {
      setError('Enter your email address to request a recovery link')
      return
    }

    setRequestingRecovery(true)
    try {
      await requestPasswordRecovery(formData.email)
      setSuccess(
        'If that email belongs to an account, a password recovery link has been sent.'
      )
    } catch (recoveryError) {
      setError(recoveryError.message)
    } finally {
      setRequestingRecovery(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ pt: 1 }}>
      <Stack spacing={2}>
        <TextField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={loading}
          autoComplete="email"
          autoFocus
          required
          fullWidth
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          required
          fullWidth
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
        {success && <Alert severity="success">{success}</Alert>}

        <Button
          type="submit"
          variant="contained"
          color="secondary"
          size="large"
          disabled={loading}
          fullWidth
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={handlePasswordRecovery}
          disabled={loading}
        >
          {requestingRecovery ? 'Sending recovery link…' : 'Forgot password?'}
        </Button>
        {onCancel && (
          <Button type="button" color="inherit" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </Stack>
    </Box>
  )
}
