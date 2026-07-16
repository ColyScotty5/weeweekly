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
import Avatar from './Avatar'

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
  const [avatar, setAvatar] = useState(user?.avatar || null)
  const [avatarFile, setAvatarFile] = useState(null)
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar file size must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target.result)
    }
    reader.readAsDataURL(file)
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
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
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
      setError(err.message)
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
      setSuccess('Email address updated successfully!')
      setEmailData({ newEmail: '', confirmEmail: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarSave = async () => {
    if (!avatarFile && !avatar) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await updateProfile({ avatar })
      setSuccess('Avatar updated successfully!')
      setAvatarFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const removeAvatar = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await updateProfile({ avatar: null })
      setAvatar(null)
      setAvatarFile(null)
      setSuccess('Avatar removed successfully!')
    } catch (err) {
      setError(err.message)
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
              <strong>Role:</strong> {user?.role}
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

          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Profile Picture
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Avatar src={avatar} alt="Profile Avatar" size={80} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" component="label" disabled={loading}>
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </Button>
                {avatar && avatarFile && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleAvatarSave}
                    disabled={loading}
                  >
                    Save
                  </Button>
                )}
                {avatar && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={removeAvatar}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </Typography>
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
