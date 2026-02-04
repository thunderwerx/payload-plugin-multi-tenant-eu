import type { Payload } from 'payload'
import type { GDPRUser, UserExportArgs, UserExportResult } from '../types'

/**
 * Check if a user can export another user's data.
 *
 * Access is granted if:
 * 1. Requesting user is the same as the target user (exporting own data), OR
 * 2. Requesting user is a superAdmin, OR
 * 3. Requesting user is a tenant admin for the target user's tenant
 */
async function userCanExportUser(
  payload: Payload,
  requestingUser: GDPRUser | null,
  targetUserId: string | number,
  superAdminFieldName: string = 'superAdmin',
  tenantsSlug: string = 'tenants'
): Promise<boolean> {
  if (!requestingUser) return false

  // User can always export their own data
  if (String(requestingUser.id) === String(targetUserId)) return true

  // SuperAdmin can export any user's data
  if (requestingUser[superAdminFieldName] === true) return true

  // For tenant admin check, we need to fetch the target user's tenant
  try {
    const targetUser = (await payload.findByID({
      collection: 'users',
      id: targetUserId,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>

    if (!targetUser) return false

    // Get the target user's tenant ID
    const targetTenant = targetUser.tenant as
      | string
      | number
      | { id: string | number }
      | undefined
    const targetTenantId =
      typeof targetTenant === 'object' && targetTenant?.id
        ? targetTenant.id
        : targetTenant

    if (!targetTenantId) return false

    // Check if requesting user belongs to the same tenant
    const requestingUserTenants = requestingUser.tenants as
      | Array<{ tenant?: string | number | { id: string | number } }>
      | undefined

    if (!Array.isArray(requestingUserTenants)) return false

    return requestingUserTenants.some((t) => {
      const id =
        typeof t.tenant === 'object' && t.tenant?.id ? t.tenant.id : t.tenant
      return String(id) === String(targetTenantId)
    })
  } catch (error) {
    return false
  }
}

/**
 * Export a single user's data for Subject Access Request (SAR) compliance.
 *
 * GDPR Art. 15 (Right of Access) & Art. 20 (Right to Data Portability):
 * This handler enables individuals to obtain a copy of their personal data
 * in a structured, commonly used, machine-readable format.
 *
 * @param args - Export arguments including payload instance, user ID, and requesting user
 * @returns Promise resolving to the export result with user data
 * @throws Error if requesting user doesn't have access to export the target user
 *
 * @example
 * ```typescript
 * // In a Next.js API route
 * import { exportUserData } from 'payload-plugin-multi-tenant-eu'
 *
 * export async function GET(req: NextRequest, { params }) {
 *   const payload = await getPayload({ config })
 *   const { user: requestingUser } = await payload.auth({ headers: req.headers })
 *   const { id } = await params
 *
 *   const exportData = await exportUserData({
 *     payload,
 *     userId: id,
 *     requestingUser,
 *   })
 *
 *   return NextResponse.json(exportData)
 * }
 * ```
 */
export async function exportUserData(
  args: UserExportArgs
): Promise<UserExportResult> {
  const {
    payload,
    userId,
    requestingUser,
    superAdminFieldName = 'superAdmin',
    tenantsSlug = 'tenants',
  } = args

  // Access control check
  const canExport = await userCanExportUser(
    payload,
    requestingUser,
    userId,
    superAdminFieldName,
    tenantsSlug
  )

  if (!canExport) {
    throw new Error('Forbidden: User does not have access to export this user data')
  }

  // Fetch the target user's full data
  const userData = await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 1, // Include first-level relationships
    overrideAccess: true,
  })

  if (!userData) {
    throw new Error('User not found')
  }

  // Sanitize sensitive fields that shouldn't be exported
  const sanitizedUser = { ...userData } as Record<string, unknown>
  delete sanitizedUser.hash
  delete sanitizedUser.salt
  delete sanitizedUser.resetPasswordToken
  delete sanitizedUser.resetPasswordExpiration
  delete sanitizedUser.lockUntil
  delete sanitizedUser.loginAttempts

  return {
    userId,
    exportedAt: new Date().toISOString(),
    user: sanitizedUser,
  }
}

/**
 * Creates response headers for a downloadable user export file
 */
export function createUserExportHeaders(userId: string | number): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="user-export-${userId}-${Date.now()}.json"`,
  }
}
