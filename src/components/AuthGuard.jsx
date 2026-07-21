import { Box, CircularProgress, Typography, Stack } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import Login from './Login'

export default function AuthGuard({ children, fallback = <Login /> }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="secondary" />
          <Typography color="text.secondary">Loading...</Typography>
        </Stack>
      </Box>
    )
  }

  if (!isAdmin) return fallback

  return children
}
