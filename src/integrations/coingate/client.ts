/**
 * CoinGate client (M3, spec §6.2). Orders API + IPN callbacks.
 * Docs: https://developer.coingate.com
 */

export interface CoinGateOrder {
  id: number | string;
  status: string;
  price_amount: string;
  price_currency: string;
  payment_url?: string;
  order_id?: string;
  [key: string]: unknown;
}

export class CoinGateError extends Error {
  constructor(message: string, public readonly statusCode: number | null, public readonly body?: unknown) {
    super(message);
    this.name = "CoinGateError";
  }
}

const baseUrl = () =>
  (process.env.COINGATE_ENV ?? "sandbox") === "live"
    ? "https://api.coingate.com/v2"
    : "https://api-sandbox.coingate.com/v2";

const request = async <T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> => {
  const apiKey = process.env.COINGATE_API_KEY;
  if (!apiKey) throw new CoinGateError("COINGATE_API_KEY is not configured", null);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error: any) {
    throw new CoinGateError(`CoinGate network error: ${error.message}`, null);
  }

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new CoinGateError(`CoinGate request failed (${response.status}) at ${path}`, response.status, parsed);
  }
  return parsed as T;
};

/**
 * Creates a payment order. The `token` we pass is echoed back in every IPN
 * callback and is our verification secret for that order.
 */
export const createOrder = async (params: {
  localOrderId: string;
  amount: number;
  currency: string; // price currency (EUR/GBP/...)
  title: string;
  description?: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
  ipnToken: string;
}): Promise<CoinGateOrder> => {
  return request<CoinGateOrder>("POST", "/orders", {
    order_id: params.localOrderId,
    price_amount: params.amount,
    price_currency: params.currency,
    receive_currency: params.currency, // instant fiat settlement - never hold crypto (§6.2)
    title: params.title,
    description: params.description,
    callback_url: params.callbackUrl,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    token: params.ipnToken,
  });
};

export const getOrder = async (coingateOrderId: string): Promise<CoinGateOrder> => {
  return request<CoinGateOrder>("GET", `/orders/${coingateOrderId}`);
};
