const prisma = require('../lib/prisma');
const { logAction } = require('../utils/audit');

// POST /api/payments
const createPayment = async (req, res) => {
  try {
    const { tenantId, amount, planId, method, paidAt } = req.body;

    if (!tenantId || !amount || !planId || !method) {
      return res.status(400).json({ success: false, message: 'tenantId, amount, planId, method are required' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create SaaS Payment
      const saasPayment = await tx.saaSPayment.create({
        data: {
          tenantId,
          amount: parseFloat(amount),
          planId,
          status: 'COMPLETED',
          method,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        }
      });

      // 2. Create Invoice
      const invoiceNumber = `INV-${Date.now()}`;
      const tax = parseFloat(amount) * 0.18; // 18% tax example
      await tx.saaSInvoice.create({
        data: {
          tenantId,
          paymentId: saasPayment.id,
          invoiceNumber,
          amount: parseFloat(amount) - tax,
          tax,
          total: parseFloat(amount),
          status: 'PAID',
        }
      });


      // 4. Log Action
      await logAction(req.user.id, 'CREATE_SAAS_PAYMENT', 'TENANT', tenantId, { amount, planId });

      return saasPayment;
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/tenant/:id
const getTenantPayments = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching SaaS payments for tenant ID:', id);
    const payments = await prisma.saaSPayment.findMany({
      where: { tenantId: id },
      include: { plan: true, invoice: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getTenantPayments };
