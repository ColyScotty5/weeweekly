import { Avatar as MuiAvatar } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'

export default function Avatar({
  src,
  alt = 'Avatar',
  size = 32,
  sx = {}
}) {
  return (
    <MuiAvatar
      src={src || undefined}
      alt={alt}
      sx={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.4),
        bgcolor: 'action.hover',
        color: 'text.secondary',
        ...sx
      }}
    >
      {!src && <PersonIcon sx={{ fontSize: Math.max(14, size * 0.55) }} />}
    </MuiAvatar>
  )
}
