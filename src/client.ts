/**
 * Client-side exports for payload-plugin-multi-tenant-eu
 *
 * These exports are safe to use in browser/client contexts.
 * They do not include server-side functionality like database access.
 *
 * @packageDocumentation
 */

// Types (types are always safe for client use)
export type {
  MultiTenantGDPRPluginConfig,
  GDPRConfig,
  CollectionOptions,
  GDPRUser,
  TenantExportResult,
  UserExportResult,
} from './types'

// Client-safe utility functions
export {
  userIsSuperAdmin,
  userHasAccessToTenant,
  userCanAccessTenant,
  getUserTenantIds,
} from './utils'
