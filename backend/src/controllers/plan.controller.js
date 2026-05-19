const prisma = require('../lib/prisma');

// GET /api/plans (Detailed list with statistics for Super Admin)
const getPlansWithStats = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        // Active usage
        const activeCount = await prisma.subscription.count({
          where: { planId: plan.id, status: 'ACTIVE' }
        });

        // Queued usage
        const queuedCount = await prisma.subscription.count({
          where: { planId: plan.id, status: 'QUEUED' }
        });

        // Estimated revenue from completed SaaS payments
        const revenueAgg = await prisma.saaSPayment.aggregate({
          where: { planId: plan.id, status: 'COMPLETED' },
          _sum: { amount: true }
        });

        return {
          id: plan.id,
          name: plan.name,
          durationInDays: plan.durationInDays,
          price: plan.price,
          description: plan.description || '',
          isActive: plan.isActive,
          isTrial: plan.isTrial,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          activeUsageCount: activeCount,
          queuedUsageCount: queuedCount,
          estimatedRevenue: revenueAgg._sum.amount || 0
        };
      })
    );

    res.json({ success: true, data: plansWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/plans (Create a new subscription plan)
const createPlan = async (req, res) => {
  try {
    const { name, durationInDays, price, description = '', isActive = true, isTrial = false } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Plan name must be at least 2 characters' });
    }

    const duration = parseInt(durationInDays);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: 'Duration must be a positive number of days' });
    }

    const planPrice = parseFloat(price);
    if (isNaN(planPrice) || planPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative' });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: name.trim(),
        durationInDays: duration,
        price: planPrice,
        description: description.trim(),
        isActive,
        isTrial
      }
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/plans/:id (Edit an existing subscription plan)
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, durationInDays, price, description = '', isActive, isTrial } = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const updateData = {};
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Plan name must be at least 2 characters' });
      }
      updateData.name = name.trim();
    }

    if (durationInDays !== undefined) {
      const duration = parseInt(durationInDays);
      if (isNaN(duration) || duration <= 0) {
        return res.status(400).json({ success: false, message: 'Duration must be a positive number of days' });
      }
      updateData.durationInDays = duration;
    }

    if (price !== undefined) {
      const planPrice = parseFloat(price);
      if (isNaN(planPrice) || planPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price cannot be negative' });
      }
      updateData.price = planPrice;
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
    }

    if (isTrial !== undefined) {
      updateData.isTrial = !!isTrial;
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/plans/:id/status (Toggle plan active status)
const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive field is required' });
    }

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !!isActive }
    });

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/plans/:id (Hard delete plan with usage safeguards)
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Safeguard: Check if plan is currently assigned to any active or queued subscriptions
    const usageCount = await prisma.subscription.count({
      where: {
        planId: id,
        status: {
          in: ['ACTIVE', 'QUEUED']
        }
      }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This plan is currently assigned to active or queued subscriptions and cannot be deleted.'
      });
    }

    // Permanent hard delete (safeguarded)
    await prisma.subscriptionPlan.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Plan deleted permanently' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlansWithStats,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan
};
