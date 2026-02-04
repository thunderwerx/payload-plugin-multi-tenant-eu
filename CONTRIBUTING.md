# Contributing to payload-plugin-multi-tenant-eu

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributions from everyone.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/payload-plugin-multi-tenant-eu.git
   cd payload-plugin-multi-tenant-eu
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development

Build the project:
```bash
pnpm build
```

Watch mode for development:
```bash
pnpm dev
```

Type check:
```bash
pnpm typecheck
```

Lint:
```bash
pnpm lint
```

## Making Changes

### Code Style

- Use TypeScript for all source files
- Follow existing code patterns and naming conventions
- Add JSDoc comments for exported functions and types
- Keep functions focused and testable

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add support for custom data regions`
- `fix: handle null tenant in export handler`
- `docs: update configuration examples`
- `chore: update dependencies`

### Pull Requests

1. Ensure all checks pass (build, typecheck, lint)
2. Update documentation if needed
3. Add entries to CHANGELOG.md for notable changes
4. Write a clear PR description explaining your changes

## Project Structure

```
src/
├── index.ts              # Main exports
├── client.ts             # Client-safe exports
├── plugin.ts             # Plugin factory
├── types.ts              # TypeScript types
├── collections/          # Collection field definitions
├── fields/               # User field definitions
├── hooks/                # Payload hooks
├── handlers/             # Export handlers
├── tasks/                # Job tasks
└── utils/                # Utility functions
```

## Testing

Currently, the project doesn't have automated tests. Contributions to add testing infrastructure are welcome!

To test manually:

1. Build the plugin
2. Link it to a local Payload project:
   ```bash
   pnpm link --global
   # In your test project:
   pnpm link --global payload-plugin-multi-tenant-eu
   ```
3. Test the plugin in your Payload project

## Releasing

Releases are handled by maintainers. To request a release:

1. Ensure your changes are merged to main
2. Update CHANGELOG.md
3. Open an issue requesting a release

## Questions?

Open an issue for questions, bug reports, or feature requests.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
