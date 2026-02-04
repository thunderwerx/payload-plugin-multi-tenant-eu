# Tenant Erasure Guide

This document describes how tenant data is deleted when a tenant is removed, supporting GDPR Article 17 (Right to Erasure).

## What Is Deleted

When a tenant is deleted, the following actions occur in order:

### 1. Custom Cleanup Callback (if provided)

Your `onTenantDelete` callback is invoked **before** any documents are deleted. This is your opportunity to clean up external resources while the data is still in the database.

```typescript
onTenantDelete: async ({ tenantId, payload, req }) => {
  // Example: Find and delete S3 files
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
}
```

### 2. Cascade Delete (Official Plugin)

The official `@payloadcms/plugin-multi-tenant` then cascades the delete to all tenant-scoped collections. This removes:

- All documents in configured collections where `tenant` matches the deleted tenant
- The tenant reference from users' `tenants` array

### 3. Tenant Document Deletion

Finally, the tenant document itself is deleted from the `tenants` collection.

## Collections Affected

All collections listed in your `collections` config are affected:

```typescript
multiTenantGDPRPlugin({
  collections: {
    pages: {},        // All pages for tenant deleted
    posts: {},        // All posts for tenant deleted
    media: {},        // All media documents for tenant deleted
    users: {},        // Tenant removed from users' tenants array
    customers: {},    // All customers for tenant deleted
    orders: {},       // All orders for tenant deleted
  },
})
```

## Implementing Storage Cleanup

### AWS S3 Example

```typescript
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ region: process.env.AWS_REGION })

multiTenantGDPRPlugin({
  collections: { media: {}, /* ... */ },
  onTenantDelete: async ({ tenantId, payload }) => {
    // Find all media files for this tenant
    const result = await payload.find({
      collection: 'media',
      where: { tenant: { equals: tenantId } },
      limit: 10000,
      depth: 0,
    })

    const bucket = process.env.AWS_S3_BUCKET

    for (const doc of result.docs) {
      const filename = doc.filename
      if (filename) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: filename,
            })
          )
          payload.logger?.info?.(`Deleted S3 object: ${filename}`)
        } catch (err) {
          payload.logger?.error?.(`Failed to delete S3 object ${filename}:`, err)
        }
      }
    }
  },
})
```

### Cloudinary Example

```typescript
import { v2 as cloudinary } from 'cloudinary'

multiTenantGDPRPlugin({
  collections: { media: {}, /* ... */ },
  onTenantDelete: async ({ tenantId, payload }) => {
    const result = await payload.find({
      collection: 'media',
      where: { tenant: { equals: tenantId } },
      limit: 10000,
    })

    for (const doc of result.docs) {
      if (doc.cloudinaryId) {
        await cloudinary.uploader.destroy(doc.cloudinaryId)
      }
    }
  },
})
```

### External API Cleanup

```typescript
multiTenantGDPRPlugin({
  collections: { /* ... */ },
  onTenantDelete: async ({ tenantId, payload }) => {
    // Notify external systems
    await fetch('https://api.external-service.com/webhooks/tenant-deleted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
      },
      body: JSON.stringify({ tenantId }),
    })
  },
})
```

## Error Handling

If your `onTenantDelete` callback throws an error, the tenant deletion is **aborted**. This ensures data consistency - if external cleanup fails, the database data remains intact.

```typescript
onTenantDelete: async ({ tenantId, payload }) => {
  try {
    await cleanupExternalResources(tenantId)
  } catch (error) {
    payload.logger?.error?.(`External cleanup failed for tenant ${tenantId}:`, error)
    // Re-throw to abort tenant deletion
    throw new Error(`Cannot delete tenant: external cleanup failed`)
  }
}
```

To allow tenant deletion even if external cleanup fails (not recommended):

```typescript
onTenantDelete: async ({ tenantId, payload }) => {
  try {
    await cleanupExternalResources(tenantId)
  } catch (error) {
    payload.logger?.error?.(`External cleanup failed for tenant ${tenantId}:`, error)
    // Don't re-throw - tenant will still be deleted
  }
}
```

## Retention-Based Deletion

The retention cleanup task automates tenant deletion based on:

1. **Contract End Date**: If `contractEndDate + retentionDays` is in the past
2. **Last Activity**: If no contract end date, `updatedAt + retentionDays` is in the past

Configure retention in your plugin config:

```typescript
multiTenantGDPRPlugin({
  gdpr: {
    retentionDays: 365, // Delete 1 year after contract end / last activity
    enableRetentionTask: true,
  },
})
```

Schedule the task via Payload jobs or cron:

```typescript
// Via Payload jobs API
await payload.jobs.queue({
  task: 'gdpr-tenant-retention-cleanup',
})

// Via cron (e.g., daily at 2 AM)
// POST /api/payload-jobs/run
// Authorization: Bearer YOUR_CRON_SECRET
```

## Documentation for DPA

When acting as a data processor, document in your Data Processing Agreement:

1. What data is deleted when a tenant terminates
2. Retention period after contract end
3. How external storage is handled
4. Timeline for deletion (e.g., "within 30 days of contract end + retention period")

See [DPA_SUBPROCESSORS_TEMPLATE.md](./DPA_SUBPROCESSORS_TEMPLATE.md) for a template.
