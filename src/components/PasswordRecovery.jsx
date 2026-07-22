import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField
} from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import { useAuth } from '../contexts/AuthContext'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../lib/passwordPolicy'

export default function PasswordRecovery() {
  const {
    completePasswordRecovery,
    loading,
    passwordRecoveryRequired
  } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const validationError = validateNewPassword(password, confirmation)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await completePasswordRecovery(password)
      setPassword('')
      setConfirmation('')
      setCompleted(true)
    } catch (recoveryError) {
      setError(recoveryError.message)
    }
  }

  return (
    <Dialog
      open={passwordRecoveryRequired || completed}
      onClose={completed ? () => setCompleted(false) : undefined}
      disableEscapeKeyDown={!completed}
      maxWidth="xs"
      fullWidth
      aria-labelledby="password-recovery-title"
    >
      <DialogTitle id="password-recovery-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <LockResetIcon color="primary" aria-hidden="true" />
          <span>{completed ? 'Password updated' : 'Set a new password'}</span>
        </Stack>
      </DialogTitle>

      {completed ? (
        <>
          <DialogContent>
            <Alert severity="success">
              Your password was updated and all sessions were signed out. Sign in again
              with your new password.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => setCompleted(false)} autoFocus>
              Continue
            </Button>
          </DialogActions>
        </>
      ) : (
        <Stack component="form" onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <DialogContentText>
                This recovery link opened a temporary session. Choose a new password
                before continuing to administration.
              </DialogContentText>
              <TextField
                label="New password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError('')
                }}
                autoComplete="new-password"
                helperText={`Use at least ${MIN_PASSWORD_LENGTH} characters`}
                disabled={loading}
                required
                autoFocus
              />
              <TextField
                label="Confirm new password"
                type="password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value)
                  if (error) setError('')
                }}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={<LockResetIcon />}
            >
              {loading ? 'Updating password…' : 'Update password'}
            </Button>
          </DialogActions>
        </Stack>
      )}
    </Dialog>
  )
}
