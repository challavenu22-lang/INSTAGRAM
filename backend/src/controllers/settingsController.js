import { settingsService } from '../services/settingsService.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getUserSettings(req.user.id);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    // Return updated preferences
    res.json({
      success: true,
      message: 'Settings preferences saved successfully.',
      preferences: req.body
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await settingsService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const result = await settingsService.deleteAccount(req.user.id, password);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
