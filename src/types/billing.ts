export interface PlanPrice {
  currency_code: string;
  amount_minor: number;
  country_codes: string[];
}

export interface BillingPlan {
  code: string;
  name: string;
  description: string;
  credits_granted: number;
  credit_validity_days: number;
  badge: string;
  prices: PlanPrice[];
  features: string[];
}

export interface ModuleCost {
  code: string;
  name: string;
  unit: string;
  credit_cost: number;
  is_active: true;
}

export interface CreditLot {
  credits_remaining: number;
  credits_granted: number;
  source: string;
  granted_at: string;
  expires_at: string;
}

export interface Wallet {
  balance: number;
  lifetime_granted: number;
  lifetime_spent: number;
  low_balance: boolean;
  lots: CreditLot[];
}



export interface LedgerEntry {
  delta: number;
  reason: string;
  module_code: string;
  balance_after: number;
  created_at: string;
}

export interface DiscountPreviewResponse {
  code: string;
  kind: string;
  valid: boolean;
  description: string;
  credits: number;
}

export interface RedeemDiscountRequest {
  code: string;
}

export interface RedeemDiscountResponse {
  code: string;
  credits_granted: number;
  balance: number;
}

export interface CheckoutRequest {
  plan_code: string;
  discount_code?: string;
}

export interface CheckoutResponse {
  transaction_id: string;
  client_token: string;
  environment: string;
}
