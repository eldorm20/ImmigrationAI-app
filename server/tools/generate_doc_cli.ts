#!/usr/bin/env tsx
import dotenv from 'dotenv';
dotenv.config();
import { generateDocument } from '../lib/ai';

async function main() {
  const template = process.argv[2] || 'Motivation Letter';
  const sample = {
    name: 'John Doe',
    role: 'Software Engineer',
    company: 'TechCorp UK',
    experience: '5',
    education: "Bachelor's in Computer Science",
    skills: 'JavaScript, Node.js, React',
    achievements: 'Led migration to cloud, reduced costs by 20%'
  };

  try {
    console.log(`Generating template: ${template} (using configured AI provider if available)`);
    const doc = await generateDocument(template, sample, process.env.LANG || 'en');
    console.log('\n---- GENERATED DOCUMENT ----\n');
    console.log(doc);
    console.log('\n---- END ----\n');
  } catch (err) {
    console.error('Failed to generate document:', err);
    process.exit(1);
  }
}

main();
