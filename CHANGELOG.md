# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-04

### Fixed

- DTS build: logger calls now use string messages (no second `error` argument) so types match Payload's logger
- Retention task handler: explicit parameter types and interface alignment so declaration emit succeeds
- Handler return type compatibility with Payload `TaskConfig`

## [1.0.0] - 2024-XX-XX

### Added

- Initial release
- GDPR-compliant tenant fields (privacyPolicyUrl, cookieConsentRequired, dpaSignedAt, dataRegion, processingInstructions, contractEndDate)
- Super admin field for users with access to all tenants
- Tenant delete hook with customizable storage cleanup callback
- Tenant data export handler (GDPR Art. 15/20 data portability)
- User data export handler (Subject Access Request support)
- Retention cleanup task for automated tenant data deletion
- Access control utilities
- Comprehensive documentation
