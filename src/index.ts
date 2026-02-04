/**
 * payload-plugin-multi-tenant-eu
 *
 * EU/UK GDPR compliance extension for the official Payload CMS Multi-Tenant Plugin.
 *
 * @packageDocumentation
 */

// Main plugin export
export { multiTenantGDPRPlugin } from './plugin'

// Types
export type {
  MultiTenantGDPRPluginConfig,
  GDPRConfig,
  CollectionOptions,
  GDPRUser,
  TenantDeleteArgs,
  OnTenantDeleteCallback,
  TenantExportArgs,
  TenantExportResult,
  UserExportArgs,
  UserExportResult,
  RetentionCleanupTaskConfig,
  RetentionCleanupInput,
  RetentionCleanupOutput,
  ResolvedGDPRConfig,
} from './types'

// Collection fields
export {
  createGDPRTenantFields,
  gdprTenantFields,
  createGDPRFieldGroup,
} from './collections'

// User fields
export { createSuperAdminField, superAdminField } from './fields'

// Hooks
export { createBeforeTenantDeleteHook } from './hooks'

// Handlers (for custom API routes)
export {
  exportTenantData,
  createExportHeaders,
  exportUserData,
  createUserExportHeaders,
} from './handlers'

// Tasks
export {
  createRetentionCleanupTask,
  createRetentionCleanupHandler,
  retentionCleanupHandler,
  type GDPRRetentionTaskConfig,
} from './tasks'

// Utilities
export {
  userIsSuperAdmin,
  userHasAccessToTenant,
  userCanAccessTenant,
  getUserTenantIds,
  createUserHasAccessToAllTenants,
} from './utils'
