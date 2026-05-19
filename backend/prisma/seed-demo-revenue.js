/**
 * Production-Quality Seed Script for HotelPro
 * Generates realistic historical booking, customer, payment, and revenue data for testing:
 * - dashboard analytics
 * - revenue charts
 * - past events
 * - payment reports
 * - booking history
 * - occupancy metrics
 * 
 * Target Tenant ID: 9a37864e-5677-4ed9-92f5-c974d54b2e68
 * Run via: node prisma/seed-demo-revenue.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Ensure single PrismaClient instance for seed
const prisma = new PrismaClient();

const TARGET_TENANT_ID = '9a37864e-5677-4ed9-92f5-c974d54b2e68';

// Realistic Indian customer names
const CUSTOMER_NAMES = [
  'Aarav Sharma', 'Aditya Patel', 'Vihaan Iyer', 'Rohan Gupta', 'Karan Mehta',
  'Ishaan Joshi', 'Sai Ramakrishnan', 'Ananya Sen', 'Diya Mukherjee', 'Riya Nair',
  'Meera Pillai', 'Siddharth Rao', 'Kavya Bhat', 'Arjun Kapoor', 'Kabir Verma',
  'Aanya Chaturvedi', 'Pranav Deshmukh', 'Shreya Kulkarni', 'Aditi Shah', 'Neil Fernandes',
  'Tanvi Singhal', 'Rahul Chawla', 'Neha Bhatia', 'Vikram Malhotra', 'Sanjay Dutt'
];

// Indian cities for addresses
const CITIES = [
  'Mumbai, Maharashtra', 'Delhi, NCR', 'Bangalore, Karnataka', 'Chennai, Tamil Nadu',
  'Kolkata, West Bengal', 'Hyderabad, Telangana', 'Pune, Maharashtra', 'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh'
];

// Target revenue figures as requested
const REVENUE_AMOUNTS = [1200, 2500, 4800, 7500, 12000];

// Booking status values
const BOOKING_STATUS = 'COMPLETED';
const PAYMENT_STATUS = 'PAID';

// Spanned day offsets over the previous days and months
const DAY_OFFSETS = [
  1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 22, 24, 26, 28, 30, 
  33, 36, 39, 42, 45, 48, 52, 56, 60
];

async function main() {
  console.log('🚀 Starting HotelPro demo revenue seeding...');
  console.log(`🔑 Target Tenant ID: ${TARGET_TENANT_ID}`);

  // 1. Verify Tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: TARGET_TENANT_ID }
  });

  if (!tenant) {
    throw new Error(`Target tenant with ID '${TARGET_TENANT_ID}' was not found in the database. Please ensure the tenant is created before seeding.`);
  }
  console.log(`✅ Tenant found: "${tenant.businessName}"`);

  // 2. Fetch User associated with the Tenant
  const user = await prisma.user.findFirst({
    where: { tenantId: TARGET_TENANT_ID }
  });

  if (!user) {
    throw new Error(`No users found for tenant ID '${TARGET_TENANT_ID}'. Cannot associate bookings without a creator/user relation.`);
  }
  console.log(`✅ User found to attribute bookings: "${user.name || 'Staff'}" (Role: ${user.role})`);

  // 3. Fetch active Rooms associated with the Tenant
  const rooms = await prisma.room.findMany({
    where: { 
      tenantId: TARGET_TENANT_ID,
      isActive: true 
    }
  });

  if (rooms.length === 0) {
    throw new Error(`No active rooms found for tenant ID '${TARGET_TENANT_ID}'. Please create at least one room before seeding bookings.`);
  }
  console.log(`✅ Rooms found: ${rooms.length} active rooms.`);

  // 4. Cleanup old demo bookings (with 'BK-DEMO-' prefix) to allow safe reruns
  console.log('🧹 Scanning database for old demo bookings to clean up...');
  const oldDemoBookings = await prisma.booking.findMany({
    where: {
      tenantId: TARGET_TENANT_ID,
      bookingNumber: { startsWith: 'BK-DEMO-' }
    },
    select: { id: true }
  });

  if (oldDemoBookings.length > 0) {
    const oldDemoIds = oldDemoBookings.map(b => b.id);
    console.log(`   👉 Found ${oldDemoIds.length} old demo bookings. Cleaning up dependent records first...`);

    // Clean up dependent records sequentially to prevent foreign key errors
    await prisma.customer.deleteMany({ where: { bookingId: { in: oldDemoIds } } });
    await prisma.bookingRoom.deleteMany({ where: { bookingId: { in: oldDemoIds } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: oldDemoIds } } });
    await prisma.extraCharge.deleteMany({ where: { bookingId: { in: oldDemoIds } } });
    
    // Delete the bookings themselves
    const deleteResult = await prisma.booking.deleteMany({ where: { id: { in: oldDemoIds } } });
    console.log(`   ✅ Successfully deleted ${deleteResult.count} historical demo bookings.`);
  } else {
    console.log('   ✅ No old demo bookings found. Proceeding with insert stage.');
  }

  let createdBookingsCount = 0;
  let createdPaymentsCount = 0;

  // 5. Generate Bookings using lightweight sequential queries to avoid transaction locking/timeout errors
  console.log(`⏳ Seeding ${DAY_OFFSETS.length} historical stays...`);

  const currentTimestamp = Math.floor(Date.now() / 1000);

  for (let i = 0; i < DAY_OFFSETS.length; i++) {
    const offset = DAY_OFFSETS[i];
    
    // Calculate dates in past
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() - offset);
    checkInDate.setHours(12, 0, 0, 0); // Standard check-in at 12 PM

    const durationNights = (i % 2 === 0) ? 1 : 2; // Alternating 1-2 nights
    
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + durationNights);
    checkOutDate.setHours(11, 0, 0, 0); // Standard check-out at 11 AM

    // Select target revenue amount
    const totalAmount = REVENUE_AMOUNTS[i % REVENUE_AMOUNTS.length];
    
    // Choose room in round-robin fashion
    const room = rooms[i % rooms.length];

    // Generate dynamic collision-proof booking number with prefix as requested
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-DEMO-${currentTimestamp}-${i}-${randomSuffix}`;

    // Get customer credentials
    const customerName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const mobileNumber = '98' + String(10000000 + i).slice(-8);
    const email = `${customerName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
    const address = `Flat ${100 + i}, Sector ${i % 15 + 1}, ${CITIES[i % CITIES.length]}`;
    const aadhaarImage = `https://res.cloudinary.com/demo/image/upload/v1234567890/hotelpro/tenant-${TARGET_TENANT_ID}/aadhaar/sample_aadhaar.jpg`;

    // Determine payment mode split: CASH, UPI, CARD
    const modes = ['CASH', 'UPI', 'CARD'];
    const primaryMode = modes[i % modes.length];

    // Write database records sequentially
    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        tenantId: TARGET_TENANT_ID,
        userId: user.id,
        bookingNumber,
        checkInDate,
        checkOutDate,
        actualCheckIn: checkInDate,
        actualCheckOut: checkOutDate,
        status: BOOKING_STATUS,
        roomAmount: totalAmount,
        discount: 0,
        totalAmount,
        paidAmount: totalAmount,
        pendingAmount: 0,
        paymentStatus: PAYMENT_STATUS,
        specialRequests: i % 4 === 0 ? 'Quiet room preferred' : null,
        notes: 'Completed booking generated via system seed.',
        createdAt: checkInDate,
        updatedAt: checkOutDate
      }
    });

    // Create BookingRoom Map
    await prisma.bookingRoom.create({
      data: {
        bookingId: booking.id,
        roomId: room.id
      }
    });

    // Create Customer Info
    await prisma.customer.create({
      data: {
        bookingId: booking.id,
        name: customerName,
        mobile: mobileNumber,
        email,
        aadhaarImage,
        address
      }
    });

    // Payment splits: Full Payment vs Advance + Remaining splits
    if (i % 3 === 0) {
      // Split: 40% Advance Payment & 60% Remaining Balance Payment
      const advanceAmount = Math.round(totalAmount * 0.4);
      const remainingAmount = totalAmount - advanceAmount;

      const advancePaidAt = new Date(checkInDate);
      advancePaidAt.setDate(advancePaidAt.getDate() - 3); // Paid 3 days before check-in

      // Advance payment record
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: advanceAmount,
          mode: primaryMode,
          type: 'ADVANCE',
          reference: `TXN-ADV-${currentTimestamp}-${booking.id.slice(0, 4).toUpperCase()}`,
          paidAt: advancePaidAt,
          createdAt: advancePaidAt
        }
      });

      // Remaining payment record
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: remainingAmount,
          mode: primaryMode,
          type: 'REMAINING',
          reference: `TXN-REM-${currentTimestamp}-${booking.id.slice(0, 4).toUpperCase()}`,
          paidAt: checkOutDate,
          createdAt: checkOutDate
        }
      });

      createdPaymentsCount += 2;
    } else {
      // Single Full Payment at Check-In
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalAmount,
          mode: primaryMode,
          type: 'FULL',
          reference: `TXN-FUL-${currentTimestamp}-${booking.id.slice(0, 4).toUpperCase()}`,
          paidAt: checkInDate,
          createdAt: checkInDate
        }
      });

      createdPaymentsCount += 1;
    }

    createdBookingsCount++;
  }

  // 6. Update tenant totals count with absolute database count
  const absoluteBookingsCount = await prisma.booking.count({
    where: { tenantId: TARGET_TENANT_ID }
  });

  await prisma.tenant.update({
    where: { id: TARGET_TENANT_ID },
    data: {
      totalBookings: absoluteBookingsCount
    }
  });

  console.log('\n✨ Database Seed Successfully Completed! ✨');
  console.log(`📦 Bookings Seeded:     ${createdBookingsCount}`);
  console.log(`💳 Payments Recorded:   ${createdPaymentsCount}`);
  console.log(`📈 Total Revenue Added: ₹${(createdBookingsCount * 5600).toLocaleString('en-IN')} (approx split)`);
  console.log('✅ All relations mapped securely according to schema constraints.');
}

main()
  .catch((e) => {
    console.error('❌ Error occurred during data seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('👋 Disconnected from database client.');
  });
