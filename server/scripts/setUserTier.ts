import { setUserSubscriptionTier } from "../lib/subscriptionTiers";

async function main() {
  const [,, userId, tier] = process.argv;

  if (!userId) {
    console.error("Usage: node dist/server/scripts/setUserTier.js <userId> [tier]");
    process.exit(1);
  }

  const targetTier = (tier as any) || 'enterprise';

  try {
    const ok = await setUserSubscriptionTier(userId, targetTier as any);
    if (ok) {
      console.log(`User ${userId} updated to tier ${targetTier}`);
      process.exit(0);
    } else {
      console.error(`Failed to update user ${userId}`);
      process.exit(2);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  }
}

main();
