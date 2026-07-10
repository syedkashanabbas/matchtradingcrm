import {
  EpAccount,
  EpCreatedKey,
  EpConnectionStatus,
  EasierPropError,
  EpAuthError,
  EpConflictError,
  EpNotFoundError,
} from "./types";

/**
 * HTTP client for the EasierProp platform (docs.easierprop.com).
 *
 * - Admin operations authenticate via POST /admin/login (username/password -> JWT),
 *   cached until a 401 forces a re-login.
 * - Client operations authenticate with the per-client X-API-Key (sk_...) that
 *   the CRM creates during provisioning.
 * - Transient failures (network, 5xx, 429) are retried with a short backoff;
 *   4xx errors are mapped to typed errors and never retried.
 */
export class EasierPropClient {
  private baseUrl: string;
  private adminUsername: string;
  private adminPassword: string;
  private adminToken: string | null = null;

  constructor(opts?: { baseUrl?: string; adminUsername?: string; adminPassword?: string }) {
    this.baseUrl = (opts?.baseUrl ?? process.env.EASIERPROP_BASE_URL ?? "https://api.easierprop.com").replace(/\/$/, "");
    this.adminUsername = opts?.adminUsername ?? process.env.EASIERPROP_ADMIN_USERNAME ?? "";
    this.adminPassword = opts?.adminPassword ?? process.env.EASIERPROP_ADMIN_PASSWORD ?? "";
  }

  // ---------------------------------------------------------------
  // Low-level request with retry + error mapping
  // ---------------------------------------------------------------
  private async request<T>(
    method: string,
    path: string,
    opts: { headers?: Record<string, string>; body?: unknown; retries?: number } = {}
  ): Promise<T> {
    const retries = opts.retries ?? 2;
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...opts.headers,
          },
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          // One slow EasierProp endpoint must not stall the serial worker
          signal: AbortSignal.timeout(30_000),
        });
      } catch (networkError: any) {
        if (attempt < retries) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw new EasierPropError(
          `EasierProp network error at ${path}: ${networkError.message}`,
          null,
          path
        );
      }

      let body: unknown = null;
      const text = await response.text();
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      if (response.ok) {
        return body as T;
      }

      if (response.status === 401) throw new EpAuthError(path, body);
      if (response.status === 409) throw new EpConflictError(path, body);
      if (response.status === 404) throw new EpNotFoundError(path, body);

      // Retry 429/5xx
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw new EasierPropError(
        `EasierProp request failed (${response.status}) at ${path}`,
        response.status,
        path,
        body
      );
    }
  }

  // ---------------------------------------------------------------
  // Admin API (JWT)
  // ---------------------------------------------------------------
  private async adminLogin(): Promise<string> {
    const result = await this.request<{ token?: string; access_token?: string }>(
      "POST",
      "/admin/login",
      { body: { username: this.adminUsername, password: this.adminPassword }, retries: 1 }
    );
    const token = result.token ?? result.access_token;
    if (!token) {
      throw new EasierPropError("EasierProp admin login returned no token", null, "/admin/login", result);
    }
    this.adminToken = token;
    return token;
  }

  private async adminRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.adminToken) {
      await this.adminLogin();
    }
    try {
      return await this.request<T>(method, path, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        body,
      });
    } catch (error) {
      // Expired JWT: re-login once and retry
      if (error instanceof EpAuthError) {
        await this.adminLogin();
        return this.request<T>(method, path, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          body,
        });
      }
      throw error;
    }
  }

  /** Creates a client API key. The full sk_ key is returned ONLY here - persist it (encrypted) immediately. */
  async createClientKey(label: string, maxAccounts?: number): Promise<EpCreatedKey> {
    const result = await this.adminRequest<any>("POST", "/admin/keys", {
      label,
      ...(maxAccounts !== undefined ? { max_accounts: maxAccounts } : {}),
    });
    // Tolerate both flat and nested response shapes
    const data = result?.data ?? result;
    const key = data.key ?? data.api_key;
    const id = data.id ?? data.key_id;
    if (!key || !id) {
      throw new EasierPropError("EasierProp key creation returned unexpected shape", null, "/admin/keys", result);
    }
    return { id, key, label: data.label, max_accounts: data.max_accounts };
  }

  /** Raise-only update of a key's max_accounts cap. */
  async raiseMaxAccounts(keyId: string, maxAccounts: number): Promise<void> {
    await this.adminRequest("POST", `/admin/keys/${keyId}/raise-max-sub-accounts`, {
      max_accounts: maxAccounts,
    });
  }

  // ---------------------------------------------------------------
  // Client API (X-API-Key)
  // ---------------------------------------------------------------
  private clientHeaders(apiKey: string): Record<string, string> {
    return { "X-API-Key": apiKey };
  }

  /** Lists the key's MT5 accounts (used for idempotency checks). */
  async listAccounts(apiKey: string): Promise<EpAccount[]> {
    const result = await this.request<any>("GET", "/api/accounts", {
      headers: this.clientHeaders(apiKey),
    });
    return (result?.data ?? result ?? []) as EpAccount[];
  }

  /** Registers an MT5 account. 409 -> EpConflictError (max_accounts cap reached). */
  async createAccount(
    apiKey: string,
    account: { label: string; mt5_login: string; password: string; server_name: string }
  ): Promise<EpAccount> {
    const result = await this.request<any>("POST", "/api/accounts", {
      headers: this.clientHeaders(apiKey),
      body: account,
    });
    return (result?.data ?? result) as EpAccount;
  }

  async updateAccount(apiKey: string, accountId: string, patch: Partial<EpAccount>): Promise<EpAccount> {
    const result = await this.request<any>("PUT", `/api/accounts/${accountId}`, {
      headers: this.clientHeaders(apiKey),
      body: patch,
    });
    return (result?.data ?? result) as EpAccount;
  }

  /** Deletes an MT5 account (disconnects any active session). */
  async deleteAccount(apiKey: string, accountId: string): Promise<void> {
    await this.request("DELETE", `/api/accounts/${accountId}`, {
      headers: this.clientHeaders(apiKey),
    });
  }

  // ---- Sessions ----

  async connectSession(apiKey: string, accountId: string): Promise<void> {
    await this.request("POST", "/api/sessions/connect", {
      headers: this.clientHeaders(apiKey),
      body: { account_id: accountId },
    });
  }

  async disconnectSession(apiKey: string, accountId: string): Promise<void> {
    await this.request("POST", "/api/sessions/disconnect", {
      headers: this.clientHeaders(apiKey),
      body: { account_id: accountId },
    });
  }

  async connectionStatus(apiKey: string, accountId: string): Promise<EpConnectionStatus> {
    const result = await this.request<any>(
      "GET",
      `/api/sessions/connection-status?account_id=${encodeURIComponent(accountId)}`,
      { headers: this.clientHeaders(apiKey) }
    );
    return (result?.data ?? result) as EpConnectionStatus;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Shared singleton used by the worker and admin endpoints. */
export const easierPropClient = new EasierPropClient();
