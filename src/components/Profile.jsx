import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Box,
  Divider,
  Paper
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from '../contexts/AuthContext'

export default function Profile({ onClose }) {
  const { user, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: 'REMOVED',
    newPassword: 'REMOVED',
    confirmPassword: 'REMOVED'
  })
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const clearMessages = () => {
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    clearMessages()
  }

  const handleEmailChange = (field, value) => {
    setEmailData((prev) => ({ ...prev, [field]: value }))
    clearMessages()
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.currentPassword) {
      setError('Current password is required')
      return
    }
    if (!formData.newPassword) {
      setError('New password is required')
      return
    }
    if (formData.newPassword.length < 12) {
      setError('New password must be at least 12 characters long')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    try {
      await updateProfile({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      setSuccess('Password updated successfully!')
      setFormData({ currentPassword: 'REMOVED', newPassword: 'REMOVED', confirmPassword: 'REMOVED' })
    } catch (err) {
      setError(err.message || 'Password could not be updated')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailUpdate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!emailData.newEmail) {
      setError('New email address is required')
      return
    }
    if (emailData.newEmail !== emailData.confirmEmail) {
      setError('Email addresses do not match')
      return
    }
    if (emailData.newEmail === user.email) {
      setError('New email must be different from current email')
      return
    }

    setLoading(true)
    try {
      await updateProfile({ newEmail: emailData.newEmail })
      setSuccess('Check both email addresses to confirm the change.')
      setEmailData({ newEmail: '', confirmEmail: '' })
    } catch (err) {
      setError(err.message || 'Email address could not be updated')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Profile Settings
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              User Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Role:</strong> {user?.roleLabel}
            </Typography>
          </Paper>

          <Box component="form" onSubmit={handleEmailUpdate}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Change Email Address
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="New Email Address"
                type="email"
                value={emailData.newEmail}
                onChange={(e) => handleEmailChange('newEmail', e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Confirm New Email Address"
                type="email"
                value={emailData.confirmEmail}
                onChange={(e) => handleEmailChange('confirmEmail', e.target.value)}
                disabled={loading}
              />
              <Box>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Email'}
                </Button>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box component="form" onSubmit={handlePasswordChange}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Change Password
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Current Password"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                disabled={loading}
              />
              <TextField
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={loading}
              />
              <Box>
                <Button type="submit" variant="contained" color="secondary" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Stack>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
