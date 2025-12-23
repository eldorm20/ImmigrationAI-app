/**
 * Uzbekistan Payment Providers Integration (Click & Payme)
 * This module provides stubs and signature generation for UZ payments.
 */

import { logger } from "./logger";
import crypto from "crypto";

export interface ClickConfig {
    merchantId: string;
    serviceId: string;
    secretKey: string;
    merchantUserId: string;
}

export interface PaymeConfig {
    merchantId: string;
    secretKey: string;
}

/**
 * Click Integration Helpers
 */
export class ClickProvider {
    constructor(private config: ClickConfig) { }

    generateSignature(requestId: string, amount: number, orderId: string, status: number): string {
        const text = `${requestId}${this.config.serviceId}${this.config.secretKey}${orderId}${amount}${status}`;
        return crypto.createHash("md5").update(text).digest("hex");
    }

    // Verify Click signature for Prepare/Complete requests
    verifySignature(requestId: string, amount: number, orderId: string, status: number, signature: string): boolean {
        const expected = this.generateSignature(requestId, amount, orderId, status);
        return expected === signature;
    }

    async handleCallback(data: any) {
        logger.info({ requestId: data.click_paydoc_id }, "Handling Click callback");

        const {
            click_trans_id,
            service_id,
            click_paydoc_id,
            merchant_trans_id,
            amount,
            action,
            error,
            error_note,
            sign_time,
            sign_string
        } = data;

        // Verify signature
        if (!this.verifySignature(click_paydoc_id, parseFloat(amount), merchant_trans_id, parseInt(error), sign_string)) {
            return { error: -1, error_note: "Signature mismatch" };
        }

        return { success: true, action, merchant_trans_id };
    }
}

/**
 * Payme Integration Helpers
 */
export class PaymeProvider {
    constructor(private config: PaymeConfig) { }

    getAuthHeader(): string {
        const auth = Buffer.from(`Paycom:${this.config.secretKey}`).toString("base64");
        return `Basic ${auth}`;
    }

    // Placeholder for Payme JSON-RPC callback handling
    async handleRPC(method: string, params: any) {
        logger.info({ method, params }, "Handling Payme RPC");
        // Implementation for CheckPerformTransaction, CreateTransaction, etc.
        return { result: { success: true } };
    }
}
