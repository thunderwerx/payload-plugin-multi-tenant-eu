import type { Field } from 'payload'

/**
 * Creates a superAdmin field for the users collection.
 * Users with this field set to true have access to all tenants.
 *
 * GDPR Note: Restrict superAdmin access to the minimal set of users
 * necessary for system administration (principle of least privilege).
 *
 * @param fieldName - Name of the field (default: 'superAdmin')
 * @param options - Additional field configuration options
 */
export function createSuperAdminField(
  fieldName: string = 'superAdmin',
  options: {
    /** Only show for admin role users */
    adminRoleOnly?: boolean
    /** Custom description */
    description?: string
  } = {}
): Field {
  const {
    adminRoleOnly = true,
    description = 'Full access to all tenants. GDPR: Restrict to minimal necessary set of users.',
  } = options

  return {
    name: fieldName,
    type: 'checkbox',
    defaultValue: false,
    admin: {
      description,
      position: 'sidebar',
      ...(adminRoleOnly && {
        condition: (data) => data?.role === 'admin',
      }),
    },
    access: {
      // Cannot set superAdmin on user creation
      create: () => false,
      // Only existing superAdmins can grant superAdmin to others
      update: ({ req }) => {
        const user = req.user as Record<string, unknown> | undefined
        return Boolean(user?.[fieldName])
      },
    },
  }
}

/**
 * Default superAdmin field with standard configuration
 */
export const superAdminField = createSuperAdminField()
