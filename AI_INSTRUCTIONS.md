# AI Assistant Instructions

This file contains specific instructions for AI assistants working on this project.

## Project Overview
<!-- Describe what this project does, its purpose, and main goals -->

**Project Name:** gh-notifications
**Description:** Automatically mark GitHub threads as "done" when they don't require any action from the user. Reduces thread noise from being part of multiple organizations and teams.

**Main Goals:**
- Automate the process of marking non-actionable threads as done
- Reduce thread clutter from team memberships
- Focus on threads that actually require user attention
- Improve GitHub thread management workflow

## Technology Stack
<!-- List the main technologies, frameworks, and tools used -->

- **Language:** TypeScript/JavaScript
- **Framework:** Node.js
- **API:** GitHub REST API / GraphQL API
- **Authentication:** GitHub Personal Access Token
- **Build Tools:** npm/yarn
- **Testing:** Jest
- **Deployment:** GitHub Actions (scheduled runs)

## Code Standards & Preferences

### General Guidelines
- Follow [language/framework] best practices
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused

### Code Style
- **Indentation:** 2 spaces / 4 spaces / tabs
- **Line Length:** 80 / 100 / 120 characters
- **Quotes:** Single / Double quotes
- **Semicolons:** Always / Never / ASI

### File Organization
- **Structure:** 
- **Naming Conventions:** 
- **Import Order:** 

## Development Workflow

### Git Practices
- **Branch Naming:** 
- **Commit Messages:** 
- **Pull Request Process:** 

### Testing Requirements
- **Unit Tests:** Required / Optional
- **Integration Tests:** Required / Optional
- **Test Coverage:** Minimum % required
- **Test Framework:** 

### Code Review
- **Required Reviewers:** 
- **Review Checklist:** 
- **Automated Checks:** 

## Architecture & Patterns

### Design Patterns
- **State Management:** 
- **Data Flow:** 
- **Error Handling:** 
- **API Design:** 

### File Structure
```
project-root/
├── src/
├── tests/
├── docs/
└── ...
```

## Dependencies & Tools

### Key Dependencies
- 
- 
- 

### Development Tools
- **Linting:** 
- **Formatting:** 
- **Type Checking:** 
- **Bundling:** 

## Environment Setup

### Prerequisites
- Node.js version: 
- Python version: 
- Other requirements: 

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables OR use CLI with parameters
4. Run development server: `npm run dev` OR use CLI: `npm run cli -- process -t TOKEN -u USERNAME`

### Environment Variables
- `GITHUB_TOKEN`: Personal Access Token with notifications:write scope
- `NODE_ENV`: development/production
- `LOG_LEVEL`: debug/info/warn/error

## Notification Filtering Rules

### Current Rules
- **PR Threads:** Mark as done if the PR is already merged or closed AND the user is not a direct reviewer (individual or team-based)
- **Renovate PRs:** Mark as done if the PR is opened by "https://github.com/apps/renovate-sh-app" AND the user is not a direct reviewer (individual or team-based)

### Future Rules (to be implemented)
- Add more filtering criteria as needed
- Whitelist/blacklist specific repositories
- Filter by notification types (commits, issues, releases, etc.)

## Common Tasks & Patterns

### Adding New Features
1. Create feature branch
2. Implement with tests
3. Update documentation
4. Submit PR

### GitHub API Integration
- Use GitHub REST API for threads
- Handle rate limiting appropriately
- Implement proper error handling for API failures
- Use GraphQL for complex queries when needed

### Thread Processing
- Fetch user teams on startup (cached for performance)
- Fetch all unread threads
- Apply filtering rules (including team-based reviewer checking)
- Mark matching threads as done (or preview in dry-run mode)
- Log processed threads for debugging

### CLI Interface
- `process` command: Process threads with token/user parameters
- `test-connection` command: Test GitHub API connection
- `--dry-run` flag: Preview actions without executing
- `--log-level` flag: Control logging verbosity

## Specific Instructions for AI

### When Making Changes
- Always read existing code first
- Follow established patterns
- Update tests when adding features
- Update documentation as needed
- Consider backward compatibility

### Code Generation Preferences
- Prefer functional components over class components
- Use TypeScript interfaces for type safety
- Implement proper error boundaries
- Add loading states for async operations

### File Creation Guidelines
- Use appropriate file extensions
- Include proper imports
- Add necessary type definitions
- Follow project structure conventions

## Troubleshooting

### Common Issues
- **Issue 1:** 
- **Issue 2:** 

### Debugging Tips
- Use browser dev tools
- Check console logs
- Verify environment variables

## Resources & Documentation

### Internal Docs
- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

### External Resources
- [Framework Documentation](https://example.com)
- [Style Guide](https://example.com)

---

**Last Updated:** [Date]
**Maintainer:** [Your Name]