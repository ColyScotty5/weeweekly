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
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
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
            Cancel
          </Button>
        )}
      </Stack>
    </Box>
  )
}
