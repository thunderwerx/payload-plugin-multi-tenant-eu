import type { Payload } from 'payload'
import type {
  GDPRUser,
  TenantExportArgs,
  TenantExportResult,
} from '../types'

/**
 * Check if a user has access to export a specific tenant's data.
 *
 * Access is granted if:
 * 1. User is a superAdmin (has access to all tenants), OR
 * 2. User belongs to the tenant being exported
 */
function userCanExportTenant(
  user: GDPRUser | null,
  tenantId: string | number,
  superAdminFieldName: string = 'superAdmin',
  userTenantsFieldName: string = 'tenants'
): boolean {
  if (!user) return false

  // Check if user is superAdmin
  if (user[superAdminFieldName] === true) return true

  // Check if user belongs to the tenant
  const userTenants = user[userTenantsFieldName] as
    | Array<{ tenant?: string | number | { id: string | number } }>
    | undefined

  if (!Array.isArray(userTenants)) return false

  return userTenants.some((t) => {
    const id =
      typeof t.tenant === 'object' && t.tenant?.id ? t.tenant.id : t.tenant
    return String(id) === String(tenantId)
  })
}

/**
 * Export all data for a specific tenant in a machine-readable format.
 *
 * GDPR Art. 15 (Right of Access) & Art. 20 (Right to Data Portability):
 * This handler enables data controllers to fulfill subject access requests
 * and data portability requests for tenant-scoped data.
 *
 * @param args - Export arguments including payload instance, tenant ID, and requesting user
 * @returns Promise resolving to the export result with all tenant data
 * @throws Error if user doesn't have access to export the tenant
 *
 * @example
 * ```typescript
 * // In a Next.js API route
 * import { exportTenantData } from 'payload-plugin-multi-tenant-eu'
 *
 * export async function GET(req: NextRequest) {
 *   const payload = await getPayload({ config })
 *   const { user } = await payload.auth({ headers: req.headers })
 *   const tenantId = req.nextUrl.searchParams.get('tenantId')
 *
 *   const exportData = await exportTenantData({
 *     payload,
 *     tenantId,
 *     collections: ['pages', 'posts', 'media', 'users'],
 *     user,
 *   })
 *
 *   return NextResponse.json(exportData)
 * }
 * ```
 */
export async function exportTenantData(
  args: TenantExportArgs
): Promise<TenantExportResult> {
  const {
    payload,
    tenantId,
    collections,
    user,
    superAdminFieldName = 'superAdmin',
    userTenantsFieldName = 'tenants',
  } = args

  // Access control check
  if (
    !userCanExportTenant(user, tenantId, superAdminFieldName, userTenantsFieldName)
  ) {
    throw new Error('Forbidden: User does not have access to export this tenant')
  }

  const exportData: Record<string, { docs: unknown[]; totalDocs: number }> = {}

  // Export data from each collection
  for (const collectionSlug of collections) {
    try {
      const result = await payload.find({
        collection: collectionSlug,
        where: { tenant: { equals: tenantId } },
        limit: 10000, // Reasonable limit for export
        depth: 0, // Don't populate relationships for portability
        overrideAccess: true, // We've already checked access
      })

      exportData[collectionSlug] = {
        docs: result.docs,
        totalDocs: result.totalDocs,
      }
    } catch (error) {
      // Log error but continue with other collections
      payload.logger?.warn?.(
        `[GDPR Export] Failed to export collection ${collectionSlug} for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`
      )
      exportData[collectionSlug] = { docs: [], totalDocs: 0 }
    }
  }

  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    collections: exportData,
  }
}

/**
 * Creates response headers for a downloadable export file
 */
export function createExportHeaders(tenantId: string | number): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="tenant-export-${tenantId}-${Date.now()}.json"`,
  }
}
