import type { GDPRUser } from '../types'

/**
 * Check if a user is a superAdmin (has access to all tenants).
 *
 * @param user - The user object to check
 * @param fieldName - Name of the superAdmin field (default: 'superAdmin')
 * @returns true if user is a superAdmin
 *
 * @example
 * ```typescript
 * import { userIsSuperAdmin } from 'payload-plugin-multi-tenant-eu'
 *
 * // In access control
 * access: {
 *   read: ({ req }) => userIsSuperAdmin(req.user) || { tenant: { equals: req.user.tenant } }
 * }
 * ```
 */
export function userIsSuperAdmin(
  user: GDPRUser | null | undefined,
  fieldName: string = 'superAdmin'
): boolean {
  if (!user) return false
  return user[fieldName] === true
}

/**
 * Check if a user belongs to a specific tenant.
 *
 * @param user - The user object to check
 * @param tenantId - The tenant ID to check against
 * @param tenantsFieldName - Name of the tenants array field on user (default: 'tenants')
 * @returns true if user belongs to the tenant
 *
 * @example
 * ```typescript
 * import { userHasAccessToTenant } from 'payload-plugin-multi-tenant-eu'
 *
 * // Check if user can access tenant data
 * if (userHasAccessToTenant(user, tenantId)) {
 *   // Allow access
 * }
 * ```
 */
export function userHasAccessToTenant(
  user: GDPRUser | null | undefined,
  tenantId: string | number,
  tenantsFieldName: string = 'tenants'
): boolean {
  if (!user) return false

  const userTenants = user[tenantsFieldName] as
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
 * Check if a user has access to a tenant (either superAdmin or belongs to tenant).
 *
 * @param user - The user object to check
 * @param tenantId - The tenant ID to check against
 * @param options - Configuration options
 * @returns true if user has access to the tenant
 *
 * @example
 * ```typescript
 * import { userCanAccessTenant } from 'payload-plugin-multi-tenant-eu'
 *
 * // Check if user can access tenant
 * if (userCanAccessTenant(user, tenantId)) {
 *   // Allow access
 * }
 * ```
 */
export function userCanAccessTenant(
  user: GDPRUser | null | undefined,
  tenantId: string | number,
  options: {
    superAdminFieldName?: string
    tenantsFieldName?: string
  } = {}
): boolean {
  const { superAdminFieldName = 'superAdmin', tenantsFieldName = 'tenants' } =
    options

  return (
    userIsSuperAdmin(user, superAdminFieldName) ||
    userHasAccessToTenant(user, tenantId, tenantsFieldName)
  )
}

/**
 * Get the tenant IDs that a user has access to.
 *
 * @param user - The user object
 * @param tenantsFieldName - Name of the tenants array field on user (default: 'tenants')
 * @returns Array of tenant IDs the user can access
 *
 * @example
 * ```typescript
 * import { getUserTenantIds } from 'payload-plugin-multi-tenant-eu'
 *
 * const tenantIds = getUserTenantIds(user)
 * // Filter data by tenant IDs
 * ```
 */
export function getUserTenantIds(
  user: GDPRUser | null | undefined,
  tenantsFieldName: string = 'tenants'
): (string | number)[] {
  if (!user) return []

  const userTenants = user[tenantsFieldName] as
    | Array<{ tenant?: string | number | { id: string | number } }>
    | undefined

  if (!Array.isArray(userTenants)) return []

  return userTenants
    .map((t) => {
      const id =
        typeof t.tenant === 'object' && t.tenant?.id ? t.tenant.id : t.tenant
      return id
    })
    .filter((id): id is string | number => id !== undefined)
}

/**
 * Create a default userHasAccessToAllTenants function for the plugin config.
 *
 * @param superAdminFieldName - Name of the superAdmin field (default: 'superAdmin')
 * @returns Function suitable for multiTenantPlugin userHasAccessToAllTenants option
 *
 * @example
 * ```typescript
 * import { createUserHasAccessToAllTenants } from 'payload-plugin-multi-tenant-eu'
 *
 * multiTenantGDPRPlugin({
 *   userHasAccessToAllTenants: createUserHasAccessToAllTenants('superAdmin'),
 * })
 * ```
 */
export function createUserHasAccessToAllTenants(
  superAdminFieldName: string = 'superAdmin'
): (user: GDPRUser) => boolean {
  return (user) => userIsSuperAdmin(user, superAdminFieldName)
}
