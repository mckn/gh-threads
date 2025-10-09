# GitHub Threads Processor

Automatically mark GitHub threads as "done" when they don't require any action from you. This tool helps reduce thread noise from being part of multiple organizations and teams.

## Features

- **Smart Filtering**: Automatically identifies threads that don't require action
- **PR Management**: Marks merged/closed PR threads as done when you're not directly involved
- **Scheduled Processing**: Runs automatically via GitHub Actions
- **Configurable**: Easy to add new filtering rules
- **Logging**: Comprehensive logging for debugging and monitoring

## Current Filtering Rules

- **Pull Request Threads**: Marks as done if the PR is already merged or closed AND you're not a direct reviewer (individual or team-based)
- **Renovate PRs**: Marks as done if the PR is opened by Renovate (renovate-sh-app or renovate[bot]) AND you're not a direct reviewer (individual or team-based)

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd gh-notifications
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `GITHUB_TOKEN`: Your GitHub Personal Access Token with `notifications:read` and `notifications:write` scopes
- `GITHUB_USER`: Your GitHub username

### 3. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `notifications:read` - to read your threads
   - `notifications:write` - to mark threads as done
4. Copy the token and add it to your `.env` file

### 4. Test Locally

#### Using the CLI (Recommended)

```bash
# Test your GitHub connection first
npm run cli -- test-connection -t YOUR_TOKEN -u YOUR_USERNAME

# Preview what would be marked as done (dry run)
npm run cli -- process -t YOUR_TOKEN -u YOUR_USERNAME --dry-run

# Actually process threads
npm run cli -- process -t YOUR_TOKEN -u YOUR_USERNAME

# With debug logging
npm run cli -- process -t YOUR_TOKEN -u YOUR_USERNAME --dry-run --log-level debug
```

#### Using Environment Variables (Legacy)

```bash
# Set up environment variables
export GITHUB_TOKEN=your_token_here
export GITHUB_USER=your_username

# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

## GitHub Actions Setup

### 1. Repository Secrets

Add these secrets to your repository:

- `GITHUB_TOKEN`: Your GitHub Personal Access Token (same as above)
- `GITHUB_USER`: Your GitHub username

### 2. Workflow

The workflow is already configured to run every 6 hours. You can also trigger it manually from the Actions tab.

## How It Works

1. **Load User Teams**: Fetches and caches your team memberships on startup (cached for 24 hours)
2. **Fetch Threads**: Retrieves all unread GitHub threads
3. **Filter PR Threads**: Identifies Pull Request threads
4. **Get PR Details**: Fetches detailed information about each PR
5. **Apply Rules**: Checks if the PR is merged/closed and if you're directly involved (individual or team-based)
6. **Mark as Done**: Marks qualifying threads as done (or previews in dry-run mode)

## Caching

The tool caches team memberships to improve performance and reduce API calls:

- **Cache Location**: `.cache/teams-{username}.json`
- **Cache TTL**: 24 hours (configurable)
- **Cache Benefits**: Faster startup, fewer API calls, better rate limit management
- **Cache Invalidation**: Use `--invalidate-cache` flag to force refresh

### When to Invalidate Cache

- When you're added to new teams
- When team memberships change
- When you suspect stale data
- Periodically (e.g., weekly) to ensure accuracy

## CLI Usage

### Commands

#### `process` - Process GitHub threads
```bash
npm run cli -- process -t <token> -u <username> [options]
```

**Options:**
- `-t, --token <token>` - GitHub Personal Access Token (required)
- `-u, --user <username>` - GitHub username (required)
- `-d, --dry-run` - Preview what would be marked as done without actually doing it
- `-i, --invalidate-cache` - Invalidate team cache and fetch fresh data
- `-l, --log-level <level>` - Log level: debug, info, warn, error (default: info)

**Examples:**
```bash
# Dry run to see what would be processed
npm run cli -- process -t ghp_xxx -u myusername --dry-run

# Actually process threads
npm run cli -- process -t ghp_xxx -u myusername

# Invalidate cache and fetch fresh team data
npm run cli -- process -t ghp_xxx -u myusername --invalidate-cache

# Debug mode to see detailed logs
npm run cli -- process -t ghp_xxx -u myusername --dry-run --log-level debug
```

#### `test-connection` - Test GitHub API connection
```bash
npm run cli -- test-connection -t <token> -u <username> [options]
```

**Options:**
- `-t, --token <token>` - GitHub Personal Access Token (required)
- `-u, --user <username>` - GitHub username (required)
- `-i, --invalidate-cache` - Invalidate team cache and fetch fresh data
- `-l, --log-level <level>` - Log level: debug, info, warn, error (default: info)

**Examples:**
```bash
# Test your GitHub connection
npm run cli -- test-connection -t ghp_xxx -u myusername

# Test connection and refresh team cache
npm run cli -- test-connection -t ghp_xxx -u myusername --invalidate-cache
```

## Adding New Filtering Rules

To add new filtering rules, create a new filter class implementing the `NotificationFilter` interface:

```typescript
export class MyCustomFilter implements NotificationFilter {
  shouldMarkAsDone(notification: GitHubNotification, prDetails?: PullRequestDetails): boolean {
    // Your filtering logic here
    return false; // or true to mark as done
  }
}
```

Then add it to the `CompositeFilter` in `notification-processor.ts`.

## Development

### Scripts

- `npm run dev` - Run in development mode with ts-node
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the built application
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Project Structure

```
src/
├── index.ts                 # Main entry point
├── types.ts                 # TypeScript type definitions
├── logger.ts                # Logging utilities
├── github-client.ts         # GitHub API client
├── notification-filters.ts  # Filtering logic
└── notification-processor.ts # Main processing logic
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT