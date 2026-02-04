import type { Field, Payload, PayloadRequest } from 'payload'

/**
 * User type with potential tenant associations
 */
export interface GDPRUser {
  id: string | number
  email?: string
  [key: string]: unknown
}

/**
 * Arguments passed to the onTenantDelete callback
 */
export interface TenantDeleteArgs {
  /** ID of the tenant being deleted */
  tenantId: string | number
  /** Payload instance for database operations */
  payload: Payload
  /** The original request context */
  req: PayloadRequest
}

/**
 * Callback function for custom storage cleanup on tenant delete
 */
export type OnTenantDeleteCallback = (args: TenantDeleteArgs) => Promise<void>

/**
 * Result of a tenant data export operation
 */
export interface TenantExportResult {
  /** ID of the exported tenant */
  tenantId: string | number
  /** ISO timestamp of when the export was created */
  exportedAt: string
  /** Data from each collection, keyed by collection slug */
  collections: Record<string, {
    docs: unknown[]
    totalDocs: number
  }>
}

/**
 * Result of a user data export operation (SAR)
 */
export interface UserExportResult {
  /** ID of the exported user */
  userId: string | number
  /** ISO timestamp of when the export was created */
  exportedAt: string
  /** The user's data */
  user: unknown
  /** Related data from tenant-scoped collections (if applicable) */
  relatedData?: Record<string, unknown[]>
}

/**
 * GDPR-specific configuration options
 */
export interface GDPRConfig {
  /**
   * Number of days to retain tenant data after contract end or last activity
   * @default 365
   */
  retentionDays?: number

  /**
   * Allowed data regions for tenant data residency
   * @default ['EU', 'UK']
   */
  dataRegions?: string[]

  /**
   * Whether to automatically add the retention cleanup task
   * @default true
   */
  enableRetentionTask?: boolean

  /**
   * Name of the superAdmin field to add to users collection
   * Set to false to disable adding the field
   * @default 'superAdmin'
   */
  superAdminFieldName?: string | false

  /**
   * Additional custom fields to add to the tenants collection
   */
  additionalTenantFields?: Field[]

  /**
   * Name of the tenants collection slug (must match tenantsSlug)
   * @default 'tenants'
   */
  tenantsSlug?: string
}

/**
 * Collection-specific options (passed through to official plugin)
 */
export interface CollectionOptions {
  /**
   * Whether this collection behaves as a global (one doc per tenant)
   * @default false
   */
  isGlobal?: boolean

  /**
   * Set to false to manually apply tenant filtering
   * @default true
   */
  useBaseFilter?: boolean

  /**
   * Set to false to manually handle tenant access control
   * @default true
   */
  useTenantAccess?: boolean
}

/**
 * Main plugin configuration
 */
export interface MultiTenantGDPRPluginConfig {
  /**
   * Slug for the tenants collection
   * @default 'tenants'
   */
  tenantsSlug?: string

  /**
   * Collections to make tenant-aware
   * Key is the collection slug, value is collection-specific options
   */
  collections: Record<string, CollectionOptions>

  /**
   * Whether to automatically delete related documents when a tenant is deleted
   * @default true
   */
  cleanupAfterTenantDelete?: boolean

  /**
   * GDPR-specific configuration
   */
  gdpr?: GDPRConfig

  /**
   * Callback invoked before a tenant is deleted
   * Use this to implement custom storage cleanup (e.g., S3 file deletion)
   */
  onTenantDelete?: OnTenantDeleteCallback

  /**
   * Function to determine if a user has access to all tenants
   * Users who return true bypass tenant filtering
   */
  userHasAccessToAllTenants?: (user: GDPRUser) => boolean

  /**
   * Enable debug mode (makes tenant field visible in admin UI)
   * @default false
   */
  debug?: boolean
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedGDPRConfig {
  retentionDays: number
  dataRegions: string[]
  enableRetentionTask: boolean
  superAdminFieldName: string | false
  additionalTenantFields: Field[]
  tenantsSlug: string
}

/**
 * Arguments for the tenant export handler
 */
export interface TenantExportArgs {
  /** Payload instance */
  payload: Payload
  /** ID of the tenant to export */
  tenantId: string | number
  /** Collection slugs to include in export */
  collections: string[]
  /** User requesting the export (for access control) */
  user: GDPRUser
  /** Field name for superAdmin check */
  superAdminFieldName?: string
  /** Field name for user's tenant associations */
  userTenantsFieldName?: string
}

/**
 * Arguments for the user export handler
 */
export interface UserExportArgs {
  /** Payload instance */
  payload: Payload
  /** ID of the user to export */
  userId: string | number
  /** User making the request (for access control) */
  requestingUser: GDPRUser
  /** Field name for superAdmin check */
  superAdminFieldName?: string
  /** Tenants collection slug */
  tenantsSlug?: string
}

/**
 * Configuration for the retention cleanup task
 */
export interface RetentionCleanupTaskConfig {
  /** Tenants collection slug */
  tenantsSlug: string
  /** Default retention days (can be overridden per job) */
  retentionDays: number
}

/**
 * Input schema for retention cleanup task
 */
export interface RetentionCleanupInput {
  /** Override the default retention days */
  retentionDays?: number
}

/**
 * Output schema for retention cleanup task
 */
export interface RetentionCleanupOutput {
  /** Number of tenants deleted */
  deletedCount: number
  /** IDs of deleted tenants */
  deletedTenantIds: string[]
  /** Retention days used for this run */
  retentionDays: number
}
