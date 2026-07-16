import { createTheme } from '@mui/material/styles'

const brand = {
  blue: '#007bff',
  courtGreen: '#2E7D32',
  brandRed: '#971f1f'
}

export const theme = createTheme({
  cssVariables: true,
  colorSchemeSelector: 'data-mui-color-scheme',
  defaultColorScheme: 'light',
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
        }
      }
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
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
    }
  }
})

export { brand }
