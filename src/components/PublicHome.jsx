import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Link,
  Stack,
  Typography
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import SportsTennisIcon from '@mui/icons-material/SportsTennis'
import SeasonSchedule from './SeasonSchedule'

const HOME_BG_DESKTOP = `${import.meta.env.BASE_URL}login-bg-desktop.jpg`
const HOME_BG_MOBILE = `${import.meta.env.BASE_URL}login-bg-mobile.jpg`

const details = [
  {
    icon: <GroupsIcon color="primary" />,
    title: 'Open to every level',
    body: 'The Wee Weekly is a friendly, drop-in tournament that gives club members regular tournament-style play.'
  },
  {
    icon: <SportsTennisIcon color="secondary" />,
    title: 'Singles and doubles',
    body: 'The event alternates between singles and doubles. Doubles players are randomly paired with a partner.'
  },
  {
    icon: <AccessTimeIcon color="primary" />,
    title: 'Saturday mornings',
    body: 'Arrive before 8:45 a.m. to make the draw. Matches are called and begin shortly after 9:00 a.m.'
  }
]

const leaderboardOptions = [
  {
    type: 'singles',
    title: 'Singles leaderboard',
    body: 'See the current rolling singles standings from completed events in the last 12 months.',
    color: 'primary'
  },
  {
    type: 'doubles',
    title: 'Doubles leaderboard',
    body: 'See the current rolling doubles standings from completed events in the last 12 months.',
    color: 'secondary'
  }
]

export default function PublicHome({ onOpenLeaderboard }) {
  return (
    <Box>
      <Box
        component="section"
        aria-labelledby="wee-weekly-heading"
        sx={{
          minHeight: { xs: 460, md: 520 },
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          color: 'common.white',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.48)), url(${HOME_BG_MOBILE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: { xs: 0, md: 3 },
          overflow: 'hidden',
          '@media (min-width: 768px)': {
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.42)), url(${HOME_BG_DESKTOP})`
          }
        }}
      >
        <Container maxWidth="md" sx={{ py: { xs: 7, md: 10 }, textAlign: 'center' }}>
          <Stack spacing={2.5} alignItems="center">
            <Typography
              id="wee-weekly-heading"
              variant="h2"
              component="h1"
              fontWeight={800}
              sx={{ fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4rem' } }}
            >
              The Legendary Wee Weekly
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{ maxWidth: 720, color: 'rgba(255, 255, 255, 0.92)', lineHeight: 1.55 }}
            >
              A weekly, drop-in tennis tournament for St. George&apos;s members of every
              playing level.
            </Typography>
            <Button
              component="a"
              href="#how-it-works"
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<SportsTennisIcon />}
            >
              See how it works
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box
        id="how-it-works"
        component="section"
        aria-labelledby="how-it-works-heading"
        sx={{ py: { xs: 6, md: 9 }, scrollMarginTop: 96 }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={1.5}
            sx={{ maxWidth: 760, mx: 'auto', mb: 4, textAlign: 'center' }}
          >
            <Typography id="how-it-works-heading" variant="h4" component="h2" fontWeight={750}>
              How the Wee Weekly works
            </Typography>
            <Typography color="text.secondary">
              Register by 8:00 p.m. on Thursday and include your full name. Top-ranked
              players are placed in the draw first, with the remaining opening matchups
              assigned randomly.
            </Typography>
            <Typography>
              To pre-register, please email{' '}
              <Link href="mailto:jillrobertson1717@gmail.com">Jill Robertson</Link>.
            </Typography>
          </Stack>

          <Grid container spacing={2.5}>
            {details.map((detail) => (
              <Grid key={detail.title} size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={1.5} alignItems="flex-start">
                      {detail.icon}
                      <Typography variant="h6" component="h3" fontWeight={700}>
                        {detail.title}
                      </Typography>
                      <Typography color="text.secondary">{detail.body}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Stack
            spacing={1.5}
            sx={{ maxWidth: 760, mx: 'auto', mt: 4, textAlign: 'center' }}
          >
            <Typography>
              Each match is one standard set with a seven-point tiebreak at 6–6.
              Players are encouraged to bring a new or lightly used can of balls.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Information adapted from the{' '}
              <Link
                href="https://www.stgeorgestennisclub.com/wee-weekly/"
                target="_blank"
                rel="noopener noreferrer"
              >
                official St. George&apos;s Tennis Club Wee Weekly page
              </Link>
              .
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Box
        id="rankings"
        component="section"
        aria-labelledby="rankings-heading"
        sx={{
          py: { xs: 6, md: 8 },
          px: { xs: 2, sm: 3 },
          bgcolor: 'action.hover',
          borderRadius: { xs: 0, md: 3 },
          scrollMarginTop: 96
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 4, textAlign: 'center' }}>
            <EmojiEventsIcon color="primary" sx={{ fontSize: 64 }} />
            <Typography id="rankings-heading" variant="h4" component="h2" fontWeight={750}>
              Player rankings
            </Typography>
            <Typography color="text.secondary">
              Follow the latest singles and doubles standings. Rankings are available
              publicly—no sign-in required.
            </Typography>
          </Stack>

          <Grid container spacing={2.5}>
            {leaderboardOptions.map((option) => (
              <Grid key={option.type} size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} alignItems="flex-start" sx={{ height: '100%' }}>
                      <SportsTennisIcon color={option.color} fontSize="large" />
                      <Typography variant="h5" component="h3" fontWeight={700}>
                        {option.title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                        {option.body}
                      </Typography>
                      <Button
                        variant="contained"
                        color={option.color}
                        onClick={() => onOpenLeaderboard(option.type)}
                        startIcon={<EmojiEventsIcon />}
                      >
                        View {option.type} rankings
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <SeasonSchedule />
    </Box>
  )
}
