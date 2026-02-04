# Configuration Guide

Complete reference for configuring the GDPR Multi-Tenant Plugin.

## Basic Configuration

```typescript
import { buildConfig } from 'payload'
import { multiTenantGDPRPlugin } from 'payload-plugin-multi-tenant-eu'

export default buildConfig({
  plugins: [
    multiTenantGDPRPlugin({
      collections: {
        pages: {},
        posts: {},
        media: {},
      },
    }),
  ],
})
```

## Configuration Options

### `tenantsSlug`

**Type**: `string`  
**Default**: `'tenants'`

The slug for the tenants collection. Must match if you're using a custom tenants collection.

```typescript
multiTenantGDPRPlugin({
  tenantsSlug: 'organizations', // Custom slug
  collections: { /* ... */ },
})
```

### `collections`

**Type**: `Record<string, CollectionOptions>`  
**Required**: Yes

Collections to make tenant-aware. Each collection can have these options:

```typescript
collections: {
  pages: {
    // Treat as a global (one doc per tenant, like site settings)
    isGlobal: false, // default

    // Automatically filter by selected tenant in admin
    useBaseFilter: true, // default

    // Automatically apply tenant access control
    useTenantAccess: true, // default
  },
}
```

### `cleanupAfterTenantDelete`

**Type**: `boolean`  
**Default**: `true`

Whether to automatically delete all documents in tenant-scoped collections when a tenant is deleted.

```typescript
multiTenantGDPRPlugin({
  cleanupAfterTenantDelete: true,
  collections: { /* ... */ },
})
```

### `gdpr`

GDPR-specific configuration options.

#### `gdpr.retentionDays`

**Type**: `number`  
**Default**: `365`

Number of days to retain tenant data after contract end or last activity.

```typescript
gdpr: {
  retentionDays: 730, // 2 years
}
```

#### `gdpr.dataRegions`

**Type**: `string[]`  
**Default**: `['EU', 'UK']`

Allowed data regions for the `dataRegion` select field on tenants.

```typescript
gdpr: {
  dataRegions: ['EU', 'UK', 'US', 'APAC'],
}
```

#### `gdpr.enableRetentionTask`

**Type**: `boolean`  
**Default**: `true`

Whether to add the retention cleanup task to Payload jobs.

```typescript
gdpr: {
  enableRetentionTask: false, // Disable if you handle retention differently
}
```

#### `gdpr.superAdminFieldName`

**Type**: `string | false`  
**Default**: `'superAdmin'`

Name of the superAdmin field to add to users. Set to `false` to disable.

```typescript
gdpr: {
  superAdminFieldName: 'isSuperAdmin', // Custom field name
}

// Or disable entirely
gdpr: {
  superAdminFieldName: false,
}
```

#### `gdpr.additionalTenantFields`

**Type**: `Field[]`  
**Default**: `[]`

Additional custom fields to add to the tenants collection.

```typescript
import { Field } from 'payload'

gdpr: {
  additionalTenantFields: [
    {
      name: 'billingEmail',
      type: 'email',
    },
    {
      name: 'maxUsers',
      type: 'number',
      defaultValue: 10,
    },
  ],
}
```

### `onTenantDelete`

**Type**: `(args: TenantDeleteArgs) => Promise<void>`  
**Default**: `undefined`

Callback invoked before a tenant is deleted. Use for external cleanup.

```typescript
onTenantDelete: async ({ tenantId, payload, req }) => {
  // Clean up S3 files
  const media = await payload.find({
    collection: 'media',
    where: { tenant: { equals: tenantId } },
    limit: 10000,
  })

  for (const doc of media.docs) {
    await deleteFromS3(doc.filename)
  }
}
```

### `userHasAccessToAllTenants`

**Type**: `(user: GDPRUser) => boolean`  
**Default**: Checks `superAdminFieldName` field

Custom function to determine if a user has access to all tenants.

```typescript
userHasAccessToAllTenants: (user) => {
  return user.role === 'platform-admin' || user.superAdmin === true
}
```

### `debug`

**Type**: `boolean`  
**Default**: `false`

When true, makes the tenant field visible in the admin UI.

```typescript
multiTenantGDPRPlugin({
  debug: process.env.NODE_ENV === 'development',
  collections: { /* ... */ },
})
```

## Environment Variables

The plugin respects these environment variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `TENANT_RETENTION_DAYS` | Retention task | Override default retention days |

## Jobs Configuration

The retention cleanup task is automatically added if `gdpr.enableRetentionTask` is true. Configure jobs access in your Payload config:

```typescript
export default buildConfig({
  jobs: {
    access: {
      run: ({ req }) => {
        // Allow authenticated users
        if (req.user) return true

        // Allow cron with secret
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
  },
  plugins: [
    multiTenantGDPRPlugin({ /* ... */ }),
  ],
})
```

## Using Individual Components

You can use individual components without the full plugin:

### GDPR Tenant Fields Only

```typescript
import { createGDPRTenantFields } from 'payload-plugin-multi-tenant-eu'

const Tenants: CollectionConfig = {
  slug: 'tenants',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    ...createGDPRTenantFields(['EU', 'UK']),
  ],
}
```

### SuperAdmin Field Only

```typescript
import { createSuperAdminField } from 'payload-plugin-multi-tenant-eu'

const Users: CollectionConfig = {
  slug: 'users',
  fields: [
    // ... your fields
    createSuperAdminField('superAdmin'),
  ],
}
```

### Export Handlers Only

```typescript
import { exportTenantData, exportUserData } from 'payload-plugin-multi-tenant-eu'

// In your API route
const data = await exportTenantData({
  payload,
  tenantId: 'tenant-123',
  collections: ['pages', 'posts'],
  user: currentUser,
})
```

### Retention Task Only

```typescript
import { createRetentionCleanupTask } from 'payload-plugin-multi-tenant-eu'

export default buildConfig({
  jobs: {
    tasks: [
      createRetentionCleanupTask({
        tenantsSlug: 'tenants',
        retentionDays: 365,
      }),
    ],
  },
})
```

## TypeScript

The plugin is fully typed. Import types as needed:

```typescript
import type {
  MultiTenantGDPRPluginConfig,
  GDPRConfig,
  TenantDeleteArgs,
  TenantExportResult,
  UserExportResult,
} from 'payload-plugin-multi-tenant-eu'
```
