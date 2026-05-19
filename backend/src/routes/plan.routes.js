const express = require('express');
const router = express.Router();
const {
  getPlansWithStats,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan
} = require('../controllers/plan.controller');

router.get('/', getPlansWithStats);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.patch('/:id/status', togglePlanStatus);
router.delete('/:id', deletePlan);

module.exports = router;
