import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { addToCart, getCart, removeFromCart } from '../controllers/cartController';

const router = Router();
router.use(authenticate);
router.get('/', getCart);
router.post('/', addToCart);
router.delete('/:templateId', removeFromCart);

export default router;
