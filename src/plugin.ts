import type { Config, Plugin } from 'payload'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type {
  MultiTenantGDPRPluginConfig,
  ResolvedGDPRConfig,
  GDPRUser,
} from './types'
import { createGDPRTenantFields } from './collections/gdprTenantFields'
import { createSuperAdminField } from './fields/superAdminField'
import { createBeforeTenantDeleteHook } from './hooks/beforeTenantDelete'
import { createRetentionCleanupTask } from './tasks/retentionCleanup'
import { createUserHasAccessToAllTenants } from './utils/accessControl'

/**
 * Default GDPR configuration values
 */
const DEFAULT_GDPR_CONFIG: ResolvedGDPRConfig = {
  retentionDays: 365,
  dataRegions: ['EU', 'UK'],
  enableRetentionTask: true,
  superAdminFieldName: 'superAdmin',
  additionalTenantFields: [],
  tenantsSlug: 'tenants',
}

/**
 * Resolve GDPR configuration with defaults
 */
function resolveGDPRConfig(
  config?: MultiTenantGDPRPluginConfig['gdpr'],
  tenantsSlug?: string
): ResolvedGDPRConfig {
  return {
    retentionDays: config?.retentionDays ?? DEFAULT_GDPR_CONFIG.retentionDays,
    dataRegions: config?.dataRegions ?? DEFAULT_GDPR_CONFIG.dataRegions,
    enableRetentionTask:
      config?.enableRetentionTask ?? DEFAULT_GDPR_CONFIG.enableRetentionTask,
    superAdminFieldName:
      config?.superAdminFieldName ?? DEFAULT_GDPR_CONFIG.superAdminFieldName,
    additionalTenantFields:
      config?.additionalTenantFields ?? DEFAULT_GDPR_CONFIG.additionalTenantFields,
    tenantsSlug: tenantsSlug ?? config?.tenantsSlug ?? DEFAULT_GDPR_CONFIG.tenantsSlug,
  }
}

/**
 * GDPR-compliant Multi-Tenant Plugin for Payload CMS.
 *
 * This plugin wraps the official @payloadcms/plugin-multi-tenant and adds
 * EU/UK GDPR compliance features including:
 *
 * - **Tenant-level privacy fields**: Privacy policy URL, DPA signing date,
 *   data region preference, processing instructions
 * - **Right to erasure support**: Customizable cleanup callback on tenant delete
 * - **Retention management**: Automated cleanup task based on configurable retention period
 * - **Access control**: SuperAdmin field for users with access to all tenants
 *
 * @param pluginConfig - Plugin configuration options
 * @returns Payload plugin
 *
 * @example
 * ```typescript
 * import { buildConfig } from 'payload'
 * import { multiTenantGDPRPlugin } from 'payload-plugin-multi-tenant-eu'
 *
 * export default buildConfig({
 *   plugins: [
 *     multiTenantGDPRPlugin({
 *       collections: {
 *         pages: {},
 *         posts: {},
 *         media: {},
 *       },
 *       gdpr: {
 *         retentionDays: 365,
 *         dataRegions: ['EU', 'UK'],
 *       },
 *       onTenantDelete: async ({ tenantId, payload }) => {
 *         // Clean up S3 files, external APIs, etc.
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export function multiTenantGDPRPlugin(
  pluginConfig: MultiTenantGDPRPluginConfig
): Plugin {
  const {
    tenantsSlug = 'tenants',
    collections,
    cleanupAfterTenantDelete = true,
    gdpr,
    onTenantDelete,
    userHasAccessToAllTenants: customUserHasAccessToAllTenants,
    debug = false,
  } = pluginConfig

  const resolvedGDPR = resolveGDPRConfig(gdpr, tenantsSlug)

  return (incomingConfig: Config): Config => {
    // Start with the incoming config
    let config = { ...incomingConfig }

    // 1. Apply the official multi-tenant plugin
    const officialPlugin = multiTenantPlugin({
      tenantsSlug,
      collections,
      cleanupAfterTenantDelete,
      debug,
      userHasAccessToAllTenants:
        customUserHasAccessToAllTenants ??
        (resolvedGDPR.superAdminFieldName
          ? createUserHasAccessToAllTenants(resolvedGDPR.superAdminFieldName)
          : undefined),
    })

    config = officialPlugin(config)

    // 2. Add GDPR fields to the tenants collection
    config.collections = config.collections?.map((collection) => {
      if (collection.slug === tenantsSlug) {
        // Add GDPR fields
        const gdprFields = createGDPRTenantFields(
          resolvedGDPR.dataRegions,
          resolvedGDPR.additionalTenantFields
        )

        // Add beforeDelete hook for custom cleanup
        const existingBeforeDelete = collection.hooks?.beforeDelete || []
        const beforeDeleteHooks = [
          createBeforeTenantDeleteHook(onTenantDelete),
          ...(Array.isArray(existingBeforeDelete)
            ? existingBeforeDelete
            : [existingBeforeDelete]),
        ]

        return {
          ...collection,
          fields: [...(collection.fields || []), ...gdprFields],
          hooks: {
            ...collection.hooks,
            beforeDelete: beforeDeleteHooks,
          },
        }
      }
      return collection
    })

    // 3. Add superAdmin field to users collection (if configured)
    if (resolvedGDPR.superAdminFieldName) {
      config.collections = config.collections?.map((collection) => {
        if (collection.slug === 'users') {
          const superAdminFieldDef = createSuperAdminField(
            resolvedGDPR.superAdminFieldName as string
          )

          return {
            ...collection,
            fields: [...(collection.fields || []), superAdminFieldDef],
          }
        }
        return collection
      })
    }

    // 4. Add retention cleanup task (if enabled)
    if (resolvedGDPR.enableRetentionTask) {
      const retentionTask = createRetentionCleanupTask({
        tenantsSlug,
        retentionDays: resolvedGDPR.retentionDays,
      })

      // Cast entire tasks array - GDPRRetentionTaskConfig is runtime-compatible with Payload's TaskConfig
      const existingTasks = config.jobs?.tasks ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newTasks = [...existingTasks, retentionTask] as any
      config.jobs = {
        ...config.jobs,
        tasks: newTasks,
      }
    }

    return config
  }
}
