
import 'dotenv/config';
import { db, pool } from './server/db';
import * as schema from '@shared/schema';

async function check() {
    console.log('Checking Schema Exports...');
    const keys = Object.keys(schema);
    console.log('Schema Keys:', keys);

    if (!schema.applications) console.error('❌ applications table missing in schema export');
    else console.log('✅ applications table present');

    if (!schema.documents) console.error('❌ documents table missing in schema export');
    else console.log('✅ documents table present');

    console.log('Checking DB Query Object...');
    // @ts-ignore
    if (!db.query.applications) console.error('❌ db.query.applications missing');
    else console.log('✅ db.query.applications present');

    // @ts-ignore
    if (!db.query.documents) console.error('❌ db.query.documents missing');
    else console.log('✅ db.query.documents present');

    try {
        console.log('Attempting simple query...');
        const apps = await db.query.applications.findMany({ limit: 1 });
        console.log('✅ Generic query successful. Found:', apps.length);
    } catch (err) {
        console.error('❌ Query failed:', err);
    }

    pool.end();
}

check().catch(e => {
    console.error(e);
    process.exit(1);
});
