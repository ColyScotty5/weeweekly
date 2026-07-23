import { createTheme } from '@mui/material/styles'

const brand = {
  blue: '#007bff',
  courtGreen: '#2E7D32',
  brandRed: '#971f1f',
  brandGold: '#ffc107',
  brandBronze: '#b26a00'
}

const focusVisible = ({ theme }) => ({
  outline: `${theme.focusRing.width}px solid ${theme.palette.primary.main}`,
  outlineOffset: theme.focusRing.offset
})

export const theme = createTheme({
  cssVariables: true,
  colorSchemeSelector: 'data-mui-color-scheme',
  defaultColorScheme: 'light',
  focusRing: {
    width: 3,
    offset: 2
  },
  bracket: {
    matchHeight: {
      compact: 120,
      regular: 140
    },
    columnWidth: {
      compact: 240,
      regular: 280
    },
    connectorThickness: 2
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: brand.blue,
          contrastText: '#ffffff'
        },
        secondary: {
          main: brand.courtGreen,
          contrastText: '#ffffff'
        },
        error: {
          main: brand.brandRed,
          contrastText: '#ffffff'
        },
        warning: {
          main: '#ed6c02',
          dark: '#e65100',
          light: '#ffb74d'
        },
        success: {
          main: brand.courtGreen,
          dark: '#1B5E20',
          light: '#81C784',
          contrastText: '#ffffff'
        },
        info: {
          main: brand.blue
        },
        background: {
          default: '#f5f5f5',
          paper: '#ffffff'
        },
        seed: {
          default: { main: '#d85b24', contrastText: '#ffffff' },
          first: { main: '#b26a00', contrastText: '#ffffff' },
          second: { main: '#5f6368', contrastText: '#ffffff' },
          semifinal: { main: '#8a4f16', contrastText: '#ffffff' }
        },
        gold: {
          main: brand.brandGold
        },
        bronze: {
          main: brand.brandBronze
        }
      }
    },
    dark: {
      palette: {
        primary: {
          main: '#4dabf7',
          contrastText: '#0a1929'
        },
        secondary: {
          main: '#66bb6a',
          contrastText: '#0a1f0c'
        },
        error: {
          main: '#e57373',
          contrastText: '#3b0a0a'
        },
        warning: {
          main: '#ffa726',
          dark: '#f57c00',
          light: '#ffb74d'
        },
        success: {
          main: '#66bb6a',
          dark: '#2E7D32',
          light: '#A5D6A7',
          contrastText: '#0a1f0c'
        },
        info: {
          main: '#4dabf7'
        },
        background: {
          default: '#121212',
          paper: '#1e1e1e'
        },
        seed: {
          default: { main: '#ff9c73', contrastText: '#2d0c00' },
          first: { main: '#ffc45d', contrastText: '#2b1700' },
          second: { main: '#c4c7c5', contrastText: '#1b1c1c' },
          semifinal: { main: '#e5a36d', contrastText: '#291704' }
        }
      }
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 500 }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:focus-visible': focusVisible({ theme })
        })
      }
    },
    MuiIconButton: {
      defaultProps: {
        size: 'large'
      }
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
        maxWidth: 'sm'
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 1
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true
      }
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'default'
      },
      styleOverrides: {
        root: {
          borderBottom: '1px solid',
          borderColor: 'divider'
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #app': {
          minHeight: '100%'
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms',
            animationIterationCount: '1',
            scrollBehavior: 'auto',
            transitionDuration: '0.01ms'
          }
        }
      }
    }
  }
})

export { brand }
