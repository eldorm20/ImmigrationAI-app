import 'dotenv/config';
import { db } from '../server/db';
import { researchArticles } from '@shared/schema';

async function main() {
  console.log('Seeding mock research articles...');

  const samples = [
    {
      title: 'UK Skilled Worker Visa: Overview and Requirements',
      slug: 'uk-skilled-worker-visa-overview',
      summary: 'A concise guide to eligibility, documentation, and application process for the UK Skilled Worker visa.',
      body: 'This article summarizes the Skilled Worker visa requirements, sponsored employment, minimum salary thresholds, and supporting documents. It covers common pitfalls and tips for successful applications.',
      category: 'visa',
      type: 'guide',
      language: 'en',
      tags: ['uk','skilled-worker','visa','guides'],
      source: 'GOV.UK',
      isPublished: true,
    },
    {
      title: 'Germany Job Seeker Visa: What to Prepare',
      slug: 'germany-job-seeker-visa-prepare',
      summary: 'Checklist and timeline for applicants seeking a job seeker visa for Germany.',
      body: 'Key documents: CV, cover letter, proof of funds, recognized qualifications. Recommended steps include credential recognition and networking tips.',
      category: 'visa',
      type: 'guide',
      language: 'en',
      tags: ['germany','job-seeker','visa','checklist'],
      source: 'Federal Office for Migration',
      isPublished: true,
    },
    {
      title: 'Case Law: Recent Precedents in Asylum Claims (2024)',
      slug: 'case-law-asylum-2024',
      summary: 'Selected case law summaries relevant to asylum claim evaluations.',
      body: 'This article presents short summaries of notable cases and the implications for claimants and legal representatives.',
      category: 'caseLaw',
      type: 'case-study',
      language: 'en',
      tags: ['asylum','case-law','europe'],
      source: 'Public Court Records',
      isPublished: true,
    },
  ];

  for (const s of samples) {
    try {
      const [created] = await db.insert(researchArticles).values({
        ...s,
        createdAt: new Date(),
        publishedAt: new Date(),
        createdByUserId: null,
      }).returning();
      console.log('Inserted:', created.id, created.title);
    } catch (err) {
      console.warn('Failed to insert sample', s.slug, err instanceof Error ? err.message : err);
    }
  }

  console.log('Seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding error', err);
  process.exit(1);
});
