// Lightweight mock Stripe client for development when STRIPE_SECRET_KEY is not set
// Provides only the subset used by the server routes (paymentIntents.create/retrieve)
export function createMockStripe() {
  const paymentIntents: any = {};

  return {
    paymentIntents: {
      async create(opts: any) {
        // produce a deterministic-ish id and client_secret for dev
        const id = `pi_mock_${Math.random().toString(36).slice(2, 10)}`;
        const client_secret = `cs_mock_${Math.random().toString(36).slice(2, 16)}`;
        const intent = {
          id,
          client_secret,
          amount: opts.amount,
          currency: opts.currency || 'usd',
          status: 'requires_payment_method',
        };
        paymentIntents[id] = intent;
        return intent;
      },
      async retrieve(id: string) {
        const intent = paymentIntents[id];
        if (!intent) {
          // Simulate a succeeded payment if id looks like a client secret passed back
          return {
            id,
            amount: 0,
            currency: 'usd',
            status: id.startsWith('pi_mock_') ? 'succeeded' : 'requires_payment_method',
          };
        }
        return intent;
      },
    },
  } as any;
}

export default createMockStripe;
