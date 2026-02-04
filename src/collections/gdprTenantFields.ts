import type { Field } from 'payload'

/**
 * Creates the GDPR-compliant fields for the tenants collection.
 * These fields support EU/UK data protection requirements including:
 * - Consent and lawful basis (Art. 6/7)
 * - Processor obligations (Art. 28)
 * - Data residency preferences
 * - Retention policy support (Art. 5(1)(e))
 *
 * @param dataRegions - Allowed data regions (default: ['EU', 'UK'])
 * @param additionalFields - Extra custom fields to include
 */
export function createGDPRTenantFields(
  dataRegions: string[] = ['EU', 'UK'],
  additionalFields: Field[] = []
): Field[] {
  return [
    // Privacy policy URL for tenant-specific consent
    {
      name: 'privacyPolicyUrl',
      type: 'text',
      admin: {
        description: 'URL to tenant-specific privacy policy (for consent and DPA)',
      },
    },
    // Cookie consent requirement toggle
    {
      name: 'cookieConsentRequired',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether cookie consent banner is required for this tenant',
      },
    },
    // Data Processing Agreement signature date
    {
      name: 'dpaSignedAt',
      type: 'date',
      admin: {
        description: 'Date the Data Processing Agreement was signed (if tenant is data controller)',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMM yyyy',
        },
      },
    },
    // Data residency preference
    {
      name: 'dataRegion',
      type: 'select',
      options: dataRegions.map((region) => ({
        label: region,
        value: region,
      })),
      admin: {
        description: 'Preferred data residency region for this tenant',
      },
    },
    // Processor instructions (GDPR Art. 28)
    {
      name: 'processingInstructions',
      type: 'textarea',
      admin: {
        description:
          'Documented processing instructions from the tenant (processor obligations under GDPR Art. 28)',
      },
    },
    // Contract end date for retention calculation
    {
      name: 'contractEndDate',
      type: 'date',
      admin: {
        description:
          'Contract or service end date for retention policy (data deleted after retention period)',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMM yyyy',
        },
      },
    },
    // Include any additional custom fields
    ...additionalFields,
  ]
}

/**
 * Default GDPR tenant fields with standard EU/UK regions
 */
export const gdprTenantFields = createGDPRTenantFields()

/**
 * Field group containing all GDPR fields (for organized admin UI)
 */
export function createGDPRFieldGroup(
  dataRegions: string[] = ['EU', 'UK'],
  additionalFields: Field[] = []
): Field {
  return {
    name: 'gdpr',
    type: 'group',
    label: 'GDPR / Privacy Settings',
    admin: {
      description: 'EU/UK data protection and privacy compliance settings',
    },
    fields: createGDPRTenantFields(dataRegions, additionalFields),
  }
}
