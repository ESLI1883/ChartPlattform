import { Router } from 'express';
import { getChartData } from '../controllers/dataController';

const router = Router();

router.get('/data/:symbol', getChartData);

export default router;