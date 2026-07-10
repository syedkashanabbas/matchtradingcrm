// EasierProp API types and error mapping.
// Docs: https://docs.easierprop.com

export interface EpAccount {
  id: string;
  label?: string;
  mt5_login?: string;
  server_name?: string;
  broker_host?: string;
  is_enabled?: boolean;
  auto_connect?: boolean;
  [key: string]: unknown;
}

export interface EpCreatedKey {
  /** Key UUID on the EasierProp side */
  id: string;
  /** Full sk_ key - returned only once at creation time */
  key: string;
  label?: string;
  max_accounts?: number;
}

export interface EpConnectionStatus {
  account_id: string;
  connected: boolean;
  [key: string]: unknown;
}

export class EasierPropError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly endpoint: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "EasierPropError";
  }
}

/** 401 - invalid/expired admin JWT or client API key */
export class EpAuthError extends EasierPropError {
  constructor(endpoint: string, body?: unknown) {
    super(`EasierProp auth failed (401) at ${endpoint}`, 401, endpoint, body);
    this.name = "EpAuthError";
  }
}

/** 409 - account limit reached (max_accounts cap) or duplicate */
export class EpConflictError extends EasierPropError {
  constructor(endpoint: string, body?: unknown) {
    super(`EasierProp conflict (409) at ${endpoint} - account limit reached or duplicate`, 409, endpoint, body);
    this.name = "EpConflictError";
  }
}

export class EpNotFoundError extends EasierPropError {
  constructor(endpoint: string, body?: unknown) {
    super(`EasierProp resource not found (404) at ${endpoint}`, 404, endpoint, body);
    this.name = "EpNotFoundError";
  }
}
