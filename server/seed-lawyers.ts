import 'dotenv/config';
import { db } from './db';
import { users } from '@shared/schema';
import { hash } from 'bcryptjs';
import { logger } from './lib/logger';

/**
 * Seed script to populate lawyer records in the database.
 * Run with: npx tsx server/seed-lawyers.ts
 */

const lawyersData = [
  {
    email: 'alice.johnson@immigration.com',
    firstName: 'Alice',
    lastName: 'Johnson',
    phone: '+998901234567',
    specialization: 'Visa & Immigration Law',
    yearsExperience: 12,
    rating: 4.8,
  },
  {
    email: 'bob.smith@immigration.com',
    firstName: 'Bob',
    lastName: 'Smith',
    phone: '+998901234568',
    specialization: 'Family Immigration',
    yearsExperience: 8,
    rating: 4.6,
  },
  {
    email: 'carol.martinez@immigration.com',
    firstName: 'Carol',
    lastName: 'Martinez',
    phone: '+998901234569',
    specialization: 'Employment-Based Immigration',
    yearsExperience: 15,
    rating: 4.9,
  },
  {
    email: 'david.wilson@immigration.com',
    firstName: 'David',
    lastName: 'Wilson',
    phone: '+998901234570',
    specialization: 'Asylum & Refugee Law',
    yearsExperience: 10,
    rating: 4.7,
  },
  {
    email: 'elena.rodriguez@immigration.com',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    phone: '+998901234571',
    specialization: 'Student Visas & Education',
    yearsExperience: 7,
    rating: 4.5,
  },
  {
    email: 'frank.thompson@immigration.com',
    firstName: 'Frank',
    lastName: 'Thompson',
    phone: '+998901234572',
    specialization: 'Business Immigration',
    yearsExperience: 11,
    rating: 4.8,
  },
];

async function seedLawyers() {
  try {
    logger.info('Starting lawyer seeding...');

    for (const lawyer of lawyersData) {
      // Check if lawyer already exists
      const existing = await db
        .select()
        .from(users)
        .where((table) => table.email === lawyer.email)
        .limit(1)
        .then((res) => res[0]);

      if (existing) {
        logger.info({ email: lawyer.email }, 'Lawyer already exists, skipping');
        continue;
      }

      // Create a default password hash (password: "LawyerPass123!")
      const hashedPassword = await hash('LawyerPass123!', 10);

      // Insert lawyer
      const inserted = await db
        .insert(users)
        .values({
          email: lawyer.email,
          hashedPassword,
          firstName: lawyer.firstName,
          lastName: lawyer.lastName,
          phone: lawyer.phone,
          role: 'lawyer' as any,
          emailVerified: true,
          metadata: {
            specialization: lawyer.specialization,
            yearsExperience: lawyer.yearsExperience,
            rating: lawyer.rating,
            biography: `${lawyer.firstName} is a specialized immigration lawyer with ${lawyer.yearsExperience} years of experience in ${lawyer.specialization}. Rated ${lawyer.rating}/5 by clients.`,
            availability: {
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '17:00' },
              saturday: { start: '10:00', end: '15:00' },
              sunday: null,
            },
            consultationFee: 50, // USD
            languages: ['English', 'Russian', 'Uzbek'],
          },
        })
        .returning();

      if (inserted.length > 0) {
        logger.info(
          { email: lawyer.email, lawyerId: inserted[0].id },
          `✅ Lawyer created successfully`
        );
      }
    }

    logger.info('✅ Lawyer seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error seeding lawyers');
    process.exit(1);
  }
}

// Run the seed function
seedLawyers();
