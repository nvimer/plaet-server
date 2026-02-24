import { AsyncLocalStorage } from "async_hooks";

export interface TenantContext {
  restaurantId?: string;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();
