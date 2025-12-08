import fetch from 'node-fetch';

// Usage: node tools/test_stripe_subscription.ts <API_URL> <JWT_TOKEN> <TIER>
// Example: node tools/test_stripe_subscription.ts http://localhost:3000 "Bearer <token>" professional

const [,, apiUrl, jwt, tier] = process.argv;
if (!apiUrl || !jwt || !tier) {
  console.error('Usage: node tools/test_stripe_subscription.ts <API_URL> <JWT_TOKEN> <TIER>');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`${apiUrl}/api/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwt,
      },
      body: JSON.stringify({ tier }),
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Request failed', err);
    process.exit(1);
  }
})();
