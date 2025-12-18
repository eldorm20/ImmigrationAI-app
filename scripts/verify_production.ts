import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function check(url: string, name: string) {
    try {
        const res = await fetch(`${BASE_URL}${url}`);
        if (res.ok) {
            console.log(`✅ ${name}: OK (${res.status})`);
            try {
                const json = await res.json();
                // console.log(json);
            } catch (e) { }
        } else {
            console.error(`❌ ${name}: FAILED (${res.status}) - ${res.statusText}`);
        }
    } catch (err) {
        console.error(`❌ ${name}: NETWORK ERROR`, err);
    }
}

async function run() {
    console.log(`Verifying Production Features at ${BASE_URL}...`);
    await check('/health', 'System Health');
    await check('/api/public-stats', 'Public Stats (Homepage)');
    await check('/api/auth/check', 'Auth Check'); // Might 401, that's fine, checks availability
    await check('/api/consultations', 'Consultations API');
}

run().catch(console.error);
