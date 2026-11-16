import { Router } from 'express';
import { 
  getHistory, 
  getHistoryById, 
  deleteHistoryItem, 
  clearHistory,
  createHistoryItem
} from '../controllers/historyController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const ensureUser = (req, res, next) => {
  if (!req.user) {
    req.user = { id: 'default_user', name: 'User' };
  }
  next();
};

router.use(optionalAuth, ensureUser);

router.get('/', getHistory);
router.post('/', createHistoryItem);
router.delete('/', clearHistory);
router.get('/:id', getHistoryById);
router.delete('/:id', deleteHistoryItem);

export default router;
