import 'dotenv/config';
import { db } from './db';
import { applications, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from './lib/logger';

const sampleStatus = ['new', 'in_progress', 'pending_documents', 'submitted', 'under_review', 'approved', 'rejected'];

async function seedApplications() {
  try {
    logger.info('Starting application seeding...');

    // Find a few user accounts to attach applications to
    const usersList = await db.select().from(users).limit(10).then(r => r);
    if (usersList.length === 0) {
      logger.info('No users found, cannot seed applications. Create sample users first.');
      process.exit(0);
    }

    const lawyer = usersList.find(u => u.role === 'lawyer') || usersList[0];

    // Create 6 sample applications
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const applicant = usersList.find(u => u.role === 'applicant') || usersList[0];
      const status = sampleStatus[i % sampleStatus.length];
      const visaType = i % 2 === 0 ? 'Skilled Worker' : 'General';
      const country = i % 3 === 0 ? 'CA' : i % 3 === 1 ? 'GB' : 'US';
      const fee = (50 + i * 25).toFixed(2);

      // If application already exists for this user and visaType, skip
      const exists = await db.query.applications.findFirst({ where: eq(applications.userId, applicant.id) });
      if (exists) continue;

      const [inserted] = await db.insert(applications).values({
        userId: applicant.id,
        visaType,
        country,
        fee,
        status,
        metadata: { sample: true },
        lawyerId: i % 4 === 0 ? lawyer.id : null,
        createdAt: new Date(now.getTime() - i * 24 * 3600 * 1000),
      } as any).returning();

      logger.info({ appId: inserted.id, userId: applicant.id }, 'Created sample application');
    }

    logger.info('✅ Application seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error seeding applications');
    process.exit(1);
  }
}

seedApplications();
