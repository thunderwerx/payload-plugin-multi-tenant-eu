import type { CollectionBeforeDeleteHook } from 'payload'
import type { OnTenantDeleteCallback } from '../types'

/**
 * Creates a beforeDelete hook for the tenants collection that invokes
 * a user-provided callback before the tenant and its data are deleted.
 *
 * This hook runs BEFORE the multi-tenant plugin's cascade delete,
 * allowing you to clean up external resources (e.g., S3 files, external APIs)
 * while the tenant's documents are still in the database.
 *
 * GDPR Art. 17 (Right to Erasure): Use this hook to ensure complete
 * erasure of all tenant data, including files stored outside the database.
 *
 * @param onTenantDelete - Callback function for custom cleanup logic
 * @param options - Additional configuration options
 *
 * @example
 * ```typescript
 * // In your payload.config.ts
 * multiTenantGDPRPlugin({
 *   collections: { ... },
 *   onTenantDelete: async ({ tenantId, payload, req }) => {
 *     // Find all media files for this tenant
 *     const media = await payload.find({
 *       collection: 'media',
 *       where: { tenant: { equals: tenantId } },
 *       limit: 10000,
 *     })
 *
 *     // Delete files from S3
 *     for (const doc of media.docs) {
 *       await s3Client.send(new DeleteObjectCommand({
 *         Bucket: process.env.S3_BUCKET,
 *         Key: doc.filename,
 *       }))
 *     }
 *   },
 * })
 * ```
 */
export function createBeforeTenantDeleteHook(
  onTenantDelete?: OnTenantDeleteCallback,
  options: {
    /** Log actions to Payload logger */
    enableLogging?: boolean
  } = {}
): CollectionBeforeDeleteHook {
  const { enableLogging = true } = options

  return async ({ id, req }) => {
    if (enableLogging) {
      req.payload.logger?.info?.(
        `[GDPR] Tenant delete initiated for tenant ID: ${id}`
      )
    }

    if (onTenantDelete) {
      try {
        if (enableLogging) {
          req.payload.logger?.info?.(
            `[GDPR] Running onTenantDelete callback for tenant ID: ${id}`
          )
        }

        await onTenantDelete({
          tenantId: id,
          payload: req.payload,
          req,
        })

        if (enableLogging) {
          req.payload.logger?.info?.(
            `[GDPR] onTenantDelete callback completed for tenant ID: ${id}`
          )
        }
      } catch (error) {
        req.payload.logger?.error?.(
          `[GDPR] Error in onTenantDelete callback for tenant ID ${id}: ${error instanceof Error ? error.message : String(error)}`
        )
        // Re-throw to prevent tenant deletion if cleanup fails
        // This ensures data consistency
        throw error
      }
    }

    // The multi-tenant plugin's cascade delete will run after this hook
    if (enableLogging) {
      req.payload.logger?.info?.(
        `[GDPR] Proceeding with tenant cascade delete for tenant ID: ${id}`
      )
    }
  }
}
