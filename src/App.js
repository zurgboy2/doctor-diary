import React, { useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [currentKey, setCurrentKey] = useState(null);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#800000', contrastText: '#FFFFFF' },
                secondary: { main: '#F5E6D3' },
                background: { default: '#FFF8E7', paper: '#FFF8E7' },
                text: { primary: '#4A4A4A', secondary: '#800000' },
              }
            : {
                primary: { main: '#A9A9A9' },
                secondary: { main: '#2C2C2C' },
                background: { default: '#121212', paper: '#1E1E1E' },
                text: { primary: '#E0E0E0', secondary: '#B0B0B0' },
              }),
        },
      }),
    [mode],
  );

  const handleThemeChange = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user, key) => {
    setIsAuthenticated(true);
    setUsername(user);
    setCurrentKey(key);
  };

  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {isAuthenticated ? (
            <MainScreen 
              username={username} 
              currentKey={currentKey} 
              handleThemeChange={handleThemeChange}
              mode={mode}
            />
          ) : (
            <AuthScreen onLogin={handleLogin} />
          )}
        </Box>
    </ThemeProvider>
  );
}

export default App;