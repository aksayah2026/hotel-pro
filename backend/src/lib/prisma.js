const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // Singleton pattern for development: save instance globally to prevent exhausting connections during hot reload
  if (!global.prismaInstance) {
    global.prismaInstance = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.prismaInstance;
}

// Graceful shutdown disconnect handling (Requirement 12)
const handleShutdown = async () => {
  console.log('[Prisma Client] App termination detected. Gracefully disconnecting...');
  try {
    await prisma.$disconnect();
    console.log('[Prisma Client] Disconnected successfully.');
  } catch (err) {
    console.error('[Prisma Client] Error during graceful disconnection:', err.message);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

module.exports = prisma;
