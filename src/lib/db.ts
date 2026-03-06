import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Keep Neon Serverless Postgres warm to avoid cold start latency
// Neon scales to 0 after 5 minutes of inactivity on the free tier.
// Pinging every 4 minutes (240000ms) keeps it active.
setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch((err) => {
    console.error("[Postgres] Keep-alive ping failed:", err.message);
  });
}, 240000);