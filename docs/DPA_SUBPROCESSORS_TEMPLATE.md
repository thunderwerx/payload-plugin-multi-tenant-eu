# Data Processing Agreement (DPA) and Sub-Processors Template

Use this template to document your data processing arrangements and sub-processors when using the GDPR Multi-Tenant Plugin.

---

## Data Processing Agreement Overview

When your platform processes personal data on behalf of tenants (data controllers), you act as a **data processor** under GDPR. This requires a Data Processing Agreement (DPA) that covers:

1. Nature and purpose of processing
2. Type of personal data processed
3. Categories of data subjects
4. Duration of processing
5. Obligations and rights of both parties
6. Sub-processors

## Tenant Collection Fields

The plugin adds the following fields to track DPA compliance:

| Field | Purpose |
|-------|---------|
| `dpaSignedAt` | Date the DPA was signed by the tenant |
| `processingInstructions` | Documented instructions from the tenant |
| `dataRegion` | Tenant's preferred data residency (EU/UK) |
| `contractEndDate` | When the contract ends (for retention calculation) |

## Sub-Processors Template

List all sub-processors that process personal data on behalf of your tenants:

### Infrastructure

| Sub-Processor | Purpose | Location | Legal Basis |
|---------------|---------|----------|-------------|
| MongoDB Atlas / Self-hosted | Database storage | [Your DB region, e.g., EU-WEST-1] | SCCs / Adequacy |
| AWS (S3, CloudFront) | Media file storage and delivery | [Your AWS region, e.g., eu-west-2] | SCCs / Adequacy |
| [Your hosting provider] | Application hosting | [Region] | SCCs / Adequacy |

### Third-Party Services

| Sub-Processor | Purpose | Location | Legal Basis |
|---------------|---------|----------|-------------|
| Stripe | Payment processing | US (EU data in EU) | SCCs / DPF |
| SendGrid / Mailgun / etc. | Transactional email | [Region] | SCCs / Adequacy |
| [Analytics provider] | Usage analytics | [Region] | SCCs / Adequacy |

### Notes

- **SCCs**: Standard Contractual Clauses (for transfers outside EU/UK adequacy)
- **DPF**: EU-US Data Privacy Framework
- **Adequacy**: Country has an EU adequacy decision

## Data Residency

Configure data residency per tenant using the `dataRegion` field:

```typescript
// In your tenants collection, tenants can set their preferred region
{
  name: 'Acme Corp',
  slug: 'acme',
  dataRegion: 'EU', // or 'UK'
}
```

Ensure your infrastructure configuration matches:
- Database in appropriate region
- Storage buckets in appropriate region
- No data transferred outside region without legal basis

## Data Retention

Document your retention policy:

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| Tenant account data | Duration of contract + [X] days | Contract |
| User personal data | Duration of contract + [X] days | Contract |
| Media files | Duration of contract + [X] days | Contract |
| Logs / Analytics | [X] days | Legitimate interest |
| Backup data | [X] days after deletion | Legal obligation |

Configure retention in the plugin:

```typescript
multiTenantGDPRPlugin({
  gdpr: {
    retentionDays: 365, // Adjust based on your policy
  },
})
```

## Data Subject Rights

Document how you assist tenants with data subject rights:

### Right of Access (Art. 15)

- **Tenant export**: `GET /api/tenant-export?tenantId=...`
- **User export**: `GET /api/users/[id]/export`

### Right to Erasure (Art. 17)

- Tenant deletion cascades to all tenant-scoped data
- External storage cleanup via `onTenantDelete` callback
- Automated retention cleanup after contract end

### Right to Data Portability (Art. 20)

- Export handlers return JSON (machine-readable format)
- All tenant data exportable in single request

## Processing Instructions

Use the `processingInstructions` field to document tenant-specific requirements:

```
Example processing instructions:
- Only process data for providing the contracted services
- Do not use data for marketing without explicit consent
- Notify within 24 hours of any data breach
- Annual security review required
```

## Breach Notification

Document your breach notification process:

1. Detect breach (monitoring, alerts, reports)
2. Assess impact and affected tenants
3. Notify affected tenants within [X] hours
4. Tenants notify their data subjects as required

## Security Measures

Document technical and organizational measures:

### Technical Measures

- [ ] Encryption at rest (database, storage)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Access control (role-based, tenant isolation)
- [ ] Logging and monitoring
- [ ] Regular backups
- [ ] Vulnerability scanning

### Organizational Measures

- [ ] Staff training on data protection
- [ ] Access limited to necessary personnel
- [ ] Confidentiality agreements
- [ ] Incident response procedures
- [ ] Regular security audits

## Template DPA Clauses

Include in your DPA:

### Scope of Processing

> Processor shall process personal data only on documented instructions from Controller, including with regard to transfers of personal data to a third country, unless required to do so by applicable law.

### Sub-Processors

> Processor shall not engage another processor without prior specific or general written authorization of Controller. In the case of general written authorization, Processor shall inform Controller of any intended changes concerning the addition or replacement of other processors.

### Data Deletion

> Upon termination of the service agreement, Processor shall, at the choice of Controller, delete or return all personal data and delete existing copies unless applicable law requires storage of the personal data. Deletion shall occur within [X] days of contract termination plus the agreed retention period.

### Assistance

> Taking into account the nature of processing, Processor shall assist Controller by appropriate technical and organizational measures for the fulfillment of Controller's obligation to respond to requests for exercising data subject's rights.

---

**Note**: This template provides guidance only. Consult with legal counsel to ensure your DPA and sub-processor documentation meets your specific requirements and applicable laws.
