import { Router } from 'express';
import { 
  getHistory, 
  getHistoryById, 
  deleteHistoryItem, 
  clearHistory 
} from '../controllers/historyController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

router.get('/', getHistory);
router.delete('/', clearHistory);
router.get('/:id', getHistoryById);
router.delete('/:id', deleteHistoryItem);

export default router;
