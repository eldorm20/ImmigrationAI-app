import { readFileSync } from 'fs'; const content = readFileSync('dist/index.cjs', 'utf-8'); console.log('Contains require zod:', content.includes('require(\
zod\)'));
