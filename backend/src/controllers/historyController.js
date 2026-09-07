import { historyService } from '../services/historyService.js';

export const getHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await historyService.getUserHistory(req.user.id, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await historyService.getHistoryById(req.user.id, id);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await historyService.deleteHistoryItem(req.user.id, id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const clearHistory = async (req, res, next) => {
  try {
    const result = await historyService.clearUserHistory(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const createHistoryItem = async (req, res, next) => {
  try {
    const item = await historyService.createHistoryItem(req.user.id, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};
