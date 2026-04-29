const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding multi-tenant database...');

  // 1. Create System Tenant for Super Admin
  // Since tenantId is now REQUIRED, Super Admin must belong to a tenant.
  const systemTenant = await prisma.tenant.upsert({
    where: { mobile: '0000000000' },
    update: { isSystem: true },
    create: {
      id: 'system-tenant',
      businessName: 'HotelPro Systems',
      ownerName: 'System Admin',
      address: 'Cloud',
      phoneNumber: '0000000000',
      mobile: '0000000000',
      password: await bcrypt.hash('system123', 12),
      isSystem: true
    },
  });

  console.log('✅ System Tenant created');

  // 2. Create Super Admin
  const superAdminPassword = await bcrypt.hash('superadmin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { mobile: '0000000000' },
    update: { tenantId: systemTenant.id },
    create: {
      name: 'Super Admin',
      mobile: '0000000000',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      tenantId: systemTenant.id,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.mobile);

  // 3. Create Subscription Plans
  const plans = [
    { name: "Demo Plan (10 Days)", durationInDays: 10, price: 0, isTrial: true },
    { name: "3 Months", durationInDays: 90, price: 3000, isTrial: false },
    { name: "6 Months", durationInDays: 180, price: 5000, isTrial: false },
    { name: "1 Year", durationInDays: 365, price: 9000, isTrial: false },
    { name: "2 Years", durationInDays: 730, price: 16000, isTrial: false }
  ];

  for (const plan of plans) {
    // Generate a cleaner ID: "Demo Plan (10 Days)" -> "demo_10_days"
    const planId = plan.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace sequences of non-alphanumeric with _
      .replace(/^_+|_+$/g, '');   // Trim underscores from ends

    await prisma.subscriptionPlan.upsert({
      where: { id: planId },
      update: { ...plan },
      create: {
        id: planId,
        ...plan
      },
    });
  }


  console.log('✅ Subscription plans created');

  console.log('\n🎉 Essential Seed complete! Super Admin ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
