import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Tabs, 
  Tab 
} from '@mui/material';
import { createAccount, login, attemptBiometricAuth } from '../utils/auth';
import { useTranslation } from 'react-i18next';


function AuthScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authTab, setAuthTab] = useState(0);
  const { t } = useTranslation();

  const handleCreateAccount = async () => {
    try {
      await createAccount(username, password);
      setError('');
      setAuthTab(0); // Switch to login tab
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const key = await login(username, password);
      setError('');
      onLogin(username, key);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const { username: user, key } = await attemptBiometricAuth();
      setError('');
      onLogin(user, key);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          {t('appName')}
        </Typography>
        <Tabs value={authTab} onChange={(_, newValue) => setAuthTab(newValue)}>
          <Tab label="Login" />
          <Tab label="Create Account" />
        </Tabs>
        {error && <Typography color="error">{error}</Typography>}
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {authTab === 0 ? (
            <>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleLogin}
              >
                {t('signIn')}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                onClick={handleBiometricAuth}
              >
                {t('biometric')}
              </Button>
            </>
          ) : (
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleCreateAccount}
            >
              {t('createAccount')}
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default AuthScreen;