const authService = require('../services/authService');

async function register(req, res) {
  const result = await authService.register(req.validated);
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  res.status(201).json({ user: result.user });
}

async function login(req, res) {
  const result = await authService.login(req.validated);
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  res.json({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    user: result.user,
  });
}

async function refresh(req, res) {
  const result = await authService.refresh(req.validated.refresh_token);
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  res.json({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    user: result.user,
  });
}

async function logout(req, res) {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await authService.logout(refresh_token);
  }
  res.json({ message: 'Déconnexion réussie' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, refresh, logout, me };
