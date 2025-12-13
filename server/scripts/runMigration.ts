import fs from 'fs';
import path from 'path';
import { db } from '../db';

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: ts-node runMigration.ts <migration-file.sql>');
    process.exit(2);
  }

  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error('File not found:', full);
    process.exit(2);
  }

  const sql = fs.readFileSync(full, 'utf8');
  try {
    console.log('Starting migration:', full);
    await db.execute(sql);
    console.log('Migration executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(3);
  }
}

run();
