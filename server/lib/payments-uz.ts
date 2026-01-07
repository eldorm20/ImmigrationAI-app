/**
 * Uzbekistan Payment Providers Integration (Click & Payme)
 * This module provides logic for handling payments from local providers.
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
    secretKey: string; // This is the key from Paycom cabinet
}

export interface PaymeError {
    code: number;
    message: {
        ru: string;
        uz: string;
        en: string;
    };
    data?: any;
}

/**
 * Click Integration Helpers
 */
export class ClickProvider {
    constructor(private config: ClickConfig) { }

    // Generate MD5 signature for Click
    generateSignature(clickTransId: string, serviceId: string, secretKey: string, merchantTransId: string, amount: number, action: number, signTime: string): string {
        // Signature format: md5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
        const text = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
        return crypto.createHash("md5").update(text).digest("hex");
    }

    // Prepare response based on Click requirements
    prepareResponse(clickTransId: number, merchantTransId: string, merchantPrepareId: number | null, error: number, errorNote: string) {
        return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            merchant_prepare_id: merchantPrepareId,
            error: error,
            error_note: errorNote
        };
    }

    completeResponse(clickTransId: number, merchantTransId: string, merchantConfirmId: number | null, error: number, errorNote: string) {
        return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            merchant_confirm_id: merchantConfirmId,
            error: error,
            error_note: errorNote
        };
    }

    // Generate payment link
    generatePaymentLink(amount: number, transactionId: string, returnUrl?: string): string {
        return `https://my.click.uz/services/pay?service_id=${this.config.serviceId}&merchant_id=${this.config.merchantId}&amount=${amount}&transaction_param=${transactionId}${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`;
    }
}

/**
 * Payme Integration Helpers
 * Implements JSON-RPC 2.0 protocol
 */
export class PaymeProvider {
    constructor(private config: PaymeConfig) { }

    checkAuth(authHeader: string | undefined): boolean {
        if (!authHeader || !authHeader.startsWith("Basic ")) return false;

        const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        // Payme sends "Paycom" as username usually, and key as password. 
        // Or sometimes merchant_id as username. We check password against key.
        const password = credentials[1];

        return password === this.config.secretKey;
    }

    // Standard Payme errors
    static Errors = {
        TransportError: { code: -32300, message: { ru: "Ошибка транспорта", uz: "Transport xatosi", en: "Transport error" } },
        AccessDenied: { code: -32504, message: { ru: "Недостаточно привилегий", uz: "Huquqlar yetarli emas", en: "Access denied" } },
        InvalidAmount: { code: -31001, message: { ru: "Неверная сумма", uz: "Noto'g'ri summa", en: "Incorrect amount" } },
        TransactionNotFound: { code: -31003, message: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" } },
        TransactionStateError: { code: -31008, message: { ru: "Невозможно выполнить операцию", uz: "Operatsiyani bajarib bo'lmaydi", en: "Could not perform operation" } },
        OrderNotFound: { code: -31050, message: { ru: "Заказ не найден", uz: "Buyurtma topilmadi", en: "Order not found" } },
        SystemError: { code: -32400, message: { ru: "Системная ошибка", uz: "Tizim xatosi", en: "System error" } },
    };

    // Generate link for payment (checkout)
    generatePaymentLink(amount: number, transactionId: string, returnUrl?: string): string {
        // Payme expects amount in tiyins (cents)
        const amountTiyin = Math.round(amount * 100);
        const params = `m=${this.config.merchantId};ac.invoice_id=${transactionId};a=${amountTiyin}${returnUrl ? `;c=${returnUrl}` : ""}`;
        const encodedParams = Buffer.from(params).toString("base64");
        return `https://checkout.paycom.uz/${encodedParams}`;
    }
}

