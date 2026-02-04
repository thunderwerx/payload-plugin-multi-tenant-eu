import type {
  RetentionCleanupInput,
  RetentionCleanupOutput,
  RetentionCleanupTaskConfig,
} from '../types'

/** Task config shape compatible with Payload jobs.tasks (avoids generic DTS emit issues) */
export interface GDPRRetentionTaskConfig {
  slug: string
  label: string
  inputSchema: Array<{ name: string; type: string; required: boolean; admin?: { description: string } }>
  outputSchema: Array<{ name: string; type: string; required: boolean }>
  handler: (args: {
    input?: RetentionCleanupInput
    req: {
      payload: {
        find: (args: unknown) => Promise<{ docs: unknown[] }>
        delete: (args: unknown) => Promise<unknown>
        logger?: { info?: (msg: string) => void; error?: (msg: string) => void }
      }
    }
  }) => Promise<{ output: RetentionCleanupOutput }>
}

/**
 * Task handler for GDPR retention cleanup.
 *
 * GDPR Art. 5(1)(e) - Storage Limitation:
 * Personal data shall be kept in a form which permits identification of data subjects
 * for no longer than is necessary for the purposes for which the personal data are processed.
 *
 * This task identifies tenants that have exceeded their retention period and deletes them,
 * triggering the multi-tenant plugin's cascade delete to remove all associated data.
 */
export function createRetentionCleanupHandler(config: RetentionCleanupTaskConfig) {
  const { tenantsSlug, retentionDays: defaultRetentionDays } = config

  return async ({ input, req }: {
    input?: RetentionCleanupInput
    req: {
      payload: {
        find: (args: unknown) => Promise<{ docs: unknown[] }>
        delete: (args: unknown) => Promise<unknown>
        logger?: { info?: (msg: string) => void; error?: (msg: string) => void }
      }
    }
  }) => {
    const retentionDays =
      (input as RetentionCleanupInput | undefined)?.retentionDays ?? defaultRetentionDays

    // Calculate cutoff date
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    req.payload.logger?.info?.(
      `[GDPR Retention] Running cleanup with ${retentionDays} day retention period (cutoff: ${cutoff.toISOString()})`
    )

    // Find tenants that may be eligible for deletion
    // We look for tenants where either:
    // 1. contractEndDate is set and past the cutoff, OR
    // 2. contractEndDate is not set and updatedAt is past the cutoff
    const tenantsResult = await req.payload.find({
      collection: tenantsSlug,
      where: {
        or: [
          { contractEndDate: { less_than_equal: cutoff.toISOString() } },
          {
            and: [
              { contractEndDate: { exists: false } },
              { updatedAt: { less_than_equal: cutoff.toISOString() } },
            ],
          },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    const deleted: string[] = []

    for (const tenant of tenantsResult.docs) {
      const tenantData = tenant as {
        id: string | number
        contractEndDate?: string
        updatedAt?: string
        name?: string
      }

      // Determine the reference date for retention calculation
      const contractEnd = tenantData.contractEndDate
      const updatedAt = tenantData.updatedAt
      const referenceDate = contractEnd
        ? new Date(contractEnd)
        : updatedAt
          ? new Date(updatedAt)
          : null

      if (!referenceDate) continue

      // Calculate when data should be deleted
      const retainUntil = new Date(referenceDate)
      retainUntil.setDate(retainUntil.getDate() + retentionDays)

      // Only delete if we're past the retention date
      if (retainUntil <= new Date()) {
        try {
          await req.payload.delete({
            collection: tenantsSlug,
            id: tenantData.id,
            overrideAccess: true,
          })

          deleted.push(String(tenantData.id))

          req.payload.logger?.info?.(
            `[GDPR Retention] Deleted tenant ${tenantData.id} (${tenantData.name || 'unnamed'}) - retention period exceeded`
          )
        } catch (error) {
          req.payload.logger?.error?.(
            `[GDPR Retention] Failed to delete tenant ${tenantData.id}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }
    }

    req.payload.logger?.info?.(
      `[GDPR Retention] Cleanup complete. Deleted ${deleted.length} tenant(s).`
    )

    return {
      output: {
        deletedCount: deleted.length,
        deletedTenantIds: deleted,
        retentionDays,
      } as RetentionCleanupOutput,
    }
  }
}

/**
 * Creates the retention cleanup task configuration for the Payload jobs queue.
 *
 * @param config - Task configuration options
 * @returns TaskConfig object to add to payload.config.ts jobs.tasks array
 *
 * @example
 * ```typescript
 * // In your payload.config.ts
 * import { createRetentionCleanupTask } from 'payload-plugin-multi-tenant-eu'
 *
 * export default buildConfig({
 *   jobs: {
 *     tasks: [
 *       createRetentionCleanupTask({
 *         tenantsSlug: 'tenants',
 *         retentionDays: 365,
 *       }),
 *     ],
 *   },
 * })
 * ```
 */
export function createRetentionCleanupTask(
  config: RetentionCleanupTaskConfig
): GDPRRetentionTaskConfig {
  return {
    slug: 'gdpr-tenant-retention-cleanup',
    label: 'GDPR Tenant Retention Cleanup',
    inputSchema: [
      {
        name: 'retentionDays',
        type: 'number',
        required: false,
        admin: {
          description: `Override the default retention period (default: ${config.retentionDays} days)`,
        },
      },
    ],
    outputSchema: [
      { name: 'deletedCount', type: 'number', required: true },
      { name: 'deletedTenantIds', type: 'json', required: true },
      { name: 'retentionDays', type: 'number', required: true },
    ],
    handler: createRetentionCleanupHandler(config),
  }
}

/**
 * Export the handler separately for advanced use cases
 */
export const retentionCleanupHandler = createRetentionCleanupHandler
