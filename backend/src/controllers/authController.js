import { authService } from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const fullName = req.body.fullName || req.body.name || '';
    const userName = req.body.userName || req.body.username || '';
    const { email, password } = req.body;
    const result = await authService.register(fullName, userName, email, password);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.token);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    res.json({ success: true, message: 'Logged out from all active sessions.' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = req.user;
    const displayName = user.name || user.fullName || user.username || '';
    const displayUsername = user.username || '';
    res.json({
      success: true,
      user: {
        id: user.id,
        name: displayName,
        fullName: displayName,
        userName: displayName,
        username: displayUsername,
        email: user.email,
        picture: user.picture,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
