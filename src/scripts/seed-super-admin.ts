import 'dotenv/config';
import { connectDb, disconnectDb } from '../config/db';
import { User } from '../modules/auth/user.model';
import { hashPassword } from '../shared/password';
import { logger } from '../shared/logger';

async function main() {
  const email = process.env.SEED_EMAIL ?? 'admin@emerhnet.local';
  const password = process.env.SEED_PASSWORD;
  const fullName = process.env.SEED_NAME ?? 'EMERHNET Super Admin';

  if (!password) {
    logger.error('SEED_PASSWORD env required');
    process.exit(1);
  }

  await connectDb();
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info({ email }, 'super admin already exists — skipping');
    await disconnectDb();
    return;
  }

  await User.create({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    fullName,
    role: 'superAdmin',
    hospitalId: null,
    status: 'active',
  });
  logger.info({ email }, 'super admin seeded');
  await disconnectDb();
}

main().catch((err) => {
  logger.error({ err }, 'seed failed');
  process.exit(1);
});
