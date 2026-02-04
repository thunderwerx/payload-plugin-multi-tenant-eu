# payload-plugin-multi-tenant-eu

**What it is:** A Payload CMS plugin that extends the official [Multi-Tenant Plugin](https://payloadcms.com/docs/plugins/multi-tenant) with EU/UK GDPR compliance: tenant-level privacy fields, data portability exports, retention management, and erasure hooks.

This plugin wraps `@payloadcms/plugin-multi-tenant` and adds the features needed for EU/UK data protection (tenant privacy fields, right to erasure, data portability, retention cleanup, and super-admin access control).

## Features

- **GDPR Tenant Fields**: Privacy policy URL, DPA signing date, data region preference, processing instructions, contract end date
- **Right to Erasure (Art. 17)**: Customizable cleanup callback on tenant delete for external storage (S3, etc.)
- **Data Portability (Art. 20)**: Export handlers for tenant and user data in machine-readable format
- **Retention Management (Art. 5(1)(e))**: Automated cleanup task with configurable retention period
- **Access Control**: SuperAdmin field for users with cross-tenant access
- **Fully Typed**: Complete TypeScript support

## Installation

```bash
npm install payload-plugin-multi-tenant-eu @payloadcms/plugin-multi-tenant
# or
pnpm add payload-plugin-multi-tenant-eu @payloadcms/plugin-multi-tenant
# or
yarn add payload-plugin-multi-tenant-eu @payloadcms/plugin-multi-tenant
```

## Quick Start

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { multiTenantGDPRPlugin } from 'payload-plugin-multi-tenant-eu'

export default buildConfig({
  // ... your config
  plugins: [
    multiTenantGDPRPlugin({
      // Collections to make tenant-aware
      collections: {
        pages: {},
        posts: {},
        media: {},
        users: {},
      },
      // GDPR-specific options
      gdpr: {
        retentionDays: 365,
        dataRegions: ['EU', 'UK'],
      },
      // Optional: Custom cleanup on tenant delete
      onTenantDelete: async ({ tenantId, payload }) => {
        // Clean up S3 files, external APIs, etc.
        const media = await payload.find({
          collection: 'media',
          where: { tenant: { equals: tenantId } },
        })
        // ... delete files from storage
      },
    }),
  ],
})
```

## Configuration

### Full Configuration Reference

```typescript
import { multiTenantGDPRPlugin } from 'payload-plugin-multi-tenant-eu'

multiTenantGDPRPlugin({
  // Slug for the tenants collection (default: 'tenants')
  tenantsSlug: 'tenants',

  // Collections to make tenant-aware
  collections: {
    pages: {
      isGlobal: false,        // One doc per tenant if true
      useBaseFilter: true,    // Auto-filter by tenant
      useTenantAccess: true,  // Auto-apply tenant access control
    },
    posts: {},
    media: {},
  },

  // Auto-delete related docs when tenant is deleted (default: true)
  cleanupAfterTenantDelete: true,

  // GDPR-specific configuration
  gdpr: {
    // Retention period in days (default: 365)
    retentionDays: 365,

    // Allowed data regions (default: ['EU', 'UK'])
    dataRegions: ['EU', 'UK'],

    // Add retention cleanup task to jobs (default: true)
    enableRetentionTask: true,

    // Field name for superAdmin on users (default: 'superAdmin', false to disable)
    superAdminFieldName: 'superAdmin',

    // Additional custom fields for tenants collection
    additionalTenantFields: [],
  },

  // Callback before tenant delete (for external cleanup)
  onTenantDelete: async ({ tenantId, payload, req }) => {
    // Your cleanup logic
  },

  // Custom function to determine superAdmin status
  userHasAccessToAllTenants: (user) => user.superAdmin === true,

  // Show tenant field in admin UI (default: false)
  debug: false,
})
```

## GDPR Compliance Features

### Tenant-Level Privacy Fields

The plugin automatically adds these fields to your tenants collection:

| Field | Type | Description |
|-------|------|-------------|
| `privacyPolicyUrl` | text | Tenant-specific privacy policy URL |
| `cookieConsentRequired` | checkbox | Whether cookie consent is required |
| `dpaSignedAt` | date | Date the Data Processing Agreement was signed |
| `dataRegion` | select | Preferred data residency (EU/UK) |
| `processingInstructions` | textarea | Documented processing instructions (GDPR Art. 28) |
| `contractEndDate` | date | For retention policy calculation |

### Right to Erasure (Art. 17)

When a tenant is deleted, the plugin:

1. Calls your `onTenantDelete` callback (if provided) to clean up external resources
2. Triggers the official plugin's cascade delete to remove all tenant-scoped documents

```typescript
multiTenantGDPRPlugin({
  collections: { /* ... */ },
  onTenantDelete: async ({ tenantId, payload }) => {
    // Example: Delete S3 files
    const media = await payload.find({
      collection: 'media',
      where: { tenant: { equals: tenantId } },
      limit: 10000,
    })

    for (const doc of media.docs) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: doc.filename,
      }))
    }
  },
})
```

### Data Portability (Art. 20)

Export handlers for building your own API routes:

```typescript
// api/tenant-export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { exportTenantData, createExportHeaders } from 'payload-plugin-multi-tenant-eu'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  const tenantId = req.nextUrl.searchParams.get('tenantId')

  const exportData = await exportTenantData({
    payload,
    tenantId,
    collections: ['pages', 'posts', 'media', 'users'],
    user,
  })

  return NextResponse.json(exportData, {
    headers: createExportHeaders(tenantId),
  })
}
```

### User Data Export (Subject Access Request)

```typescript
// api/users/[id]/export/route.ts
import { exportUserData, createUserExportHeaders } from 'payload-plugin-multi-tenant-eu'

export async function GET(req: NextRequest, { params }) {
  const payload = await getPayload({ config })
  const { user: requestingUser } = await payload.auth({ headers: req.headers })
  const { id } = await params

  const exportData = await exportUserData({
    payload,
    userId: id,
    requestingUser,
  })

  return NextResponse.json(exportData, {
    headers: createUserExportHeaders(id),
  })
}
```

### Retention Management (Art. 5(1)(e))

The plugin adds a `gdpr-tenant-retention-cleanup` task that can be scheduled via Payload jobs or external cron:

```typescript
// Queue the retention cleanup job
await payload.jobs.queue({
  task: 'gdpr-tenant-retention-cleanup',
  input: {
    retentionDays: 365, // Optional override
  },
})

// Or run via cron endpoint
// POST /api/payload-jobs/run
// Authorization: Bearer YOUR_CRON_SECRET
```

Tenants are deleted when:
- `contractEndDate + retentionDays` is in the past, OR
- `updatedAt + retentionDays` is in the past (if no contractEndDate)

## API Reference

### Exports

```typescript
// Main plugin
import { multiTenantGDPRPlugin } from 'payload-plugin-multi-tenant-eu'

// Fields (for manual use)
import {
  createGDPRTenantFields,
  gdprTenantFields,
  createGDPRFieldGroup,
  createSuperAdminField,
  superAdminField,
} from 'payload-plugin-multi-tenant-eu'

// Handlers
import {
  exportTenantData,
  createExportHeaders,
  exportUserData,
  createUserExportHeaders,
} from 'payload-plugin-multi-tenant-eu'

// Tasks
import {
  createRetentionCleanupTask,
  retentionCleanupHandler,
} from 'payload-plugin-multi-tenant-eu'

// Utilities
import {
  userIsSuperAdmin,
  userHasAccessToTenant,
  userCanAccessTenant,
  getUserTenantIds,
  createUserHasAccessToAllTenants,
} from 'payload-plugin-multi-tenant-eu'

// Client-safe exports (for use in client components)
import { userIsSuperAdmin, userHasAccessToTenant } from 'payload-plugin-multi-tenant-eu/client'
```

### Utility Functions

```typescript
// Check if user is superAdmin
userIsSuperAdmin(user, 'superAdmin') // => boolean

// Check if user belongs to a tenant
userHasAccessToTenant(user, tenantId, 'tenants') // => boolean

// Check if user can access tenant (superAdmin OR belongs to tenant)
userCanAccessTenant(user, tenantId, {
  superAdminFieldName: 'superAdmin',
  tenantsFieldName: 'tenants',
}) // => boolean

// Get tenant IDs user has access to
getUserTenantIds(user, 'tenants') // => (string | number)[]
```

## Requirements

- Payload CMS 3.0+
- @payloadcms/plugin-multi-tenant 3.0+
- Node.js 18+

## Documentation

- [Tenant Erasure Guide](./docs/TENANT_ERASURE.md)
- [DPA Sub-Processors Template](./docs/DPA_SUBPROCESSORS_TEMPLATE.md)
- [Configuration Guide](./docs/CONFIGURATION.md)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT - see [LICENSE](./LICENSE)

## Author

[Thunderwerx Ltd](https://thunderwerx.co.uk)
