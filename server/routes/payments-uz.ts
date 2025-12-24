import { Router } from "express";
import { ClickProvider, PaymeProvider } from "../lib/payments-uz";
import { db } from "../db";
import { payments, subscriptions, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Initialize providers with env vars
const click = new ClickProvider({
    merchantId: process.env.CLICK_MERCHANT_ID || "",
    serviceId: process.env.CLICK_SERVICE_ID || "",
    secretKey: process.env.CLICK_SECRET_KEY || "",
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID || "",
});

const payme = new PaymeProvider({
    merchantId: process.env.PAYME_MERCHANT_ID || "",
    secretKey: process.env.PAYME_SECRET_KEY || "",
});

/**
 * Click Prepare & Complete Callbacks
 * Documentation: https://docs.click.uz/en/click-api-prepare-and-complete-v2/
 */
router.post("/click/callback", async (req, res) => {
    const result = await click.handleCallback(req.body);

    if (result.error) {
        return res.json(result);
    }

    // Update payment/subscription logic here
    logger.info({ orderId: result.merchant_trans_id }, "Click payment processed");

    // Stub: Actual business logic to activate subscription
    // await db.update(subscriptions)...

    res.json({
        click_trans_id: req.body.click_trans_id,
        merchant_trans_id: result.merchant_trans_id,
        error: 0,
        error_note: "Success"
    });
});

/**
 * Payme JSON-RPC Callback
 * Documentation: https://developer.help.paycom.uz/ru/metody-merchant-api
 */
router.post("/payme/callback", async (req, res) => {
    const { method, params, id } = req.body;

    logger.info({ method, id }, "Payme RPC call");

    const result = await payme.handleRPC(method, params);

    res.json({
        jsonrpc: "2.0",
        id,
        ...result
    });
});

export default router;
