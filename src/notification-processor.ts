import { GitHubClient } from './github-client';
import { MergedClosedPRFilter, RenovatePRFilter, CompositeFilter } from './notification-filters';
import { GitHubNotification, GitHubTeam, Logger } from './types';
import { TeamCacheManager } from './cache';

export class NotificationProcessor {
  private githubClient: GitHubClient;
  private filter: CompositeFilter;
  private logger: Logger;
  private currentUser: string;
  private userTeams: GitHubTeam[] | null = null;
  private dryRun: boolean;
  private invalidateCache: boolean;

  constructor(githubToken: string, currentUser: string, logger: Logger, dryRun: boolean = false, invalidateCache: boolean = false) {
    const cacheManager = new TeamCacheManager(logger);
    this.githubClient = new GitHubClient(githubToken, logger, cacheManager);
    this.currentUser = currentUser;
    this.logger = logger;
    this.dryRun = dryRun;
    this.invalidateCache = invalidateCache;
    
    // Set up filters (teams will be loaded later)
    const prFilter = new MergedClosedPRFilter(currentUser, logger, () => this.userTeams);
    const renovateFilter = new RenovatePRFilter(currentUser, logger, () => this.userTeams);
    this.filter = new CompositeFilter([prFilter, renovateFilter], logger);
  }

  async processNotifications(): Promise<void> {
    try {
      this.logger.info('Starting thread processing...');
      
      // Load user teams first
      await this.loadUserTeams();
      
      // Get all unread notifications (threads)
      const notifications = await this.githubClient.getNotifications();
      
      if (notifications.length === 0) {
        this.logger.info('No unread threads found');
        return;
      }

      let processedCount = 0;
      let markedAsDoneCount = 0;

      for (const notification of notifications) {
        try {
          this.logger.debug(`Processing thread ${notification.id}: ${notification.subject.title}`);
          
          // Get PR details if this is a PR thread
          let prDetails = undefined;
          if (notification.subject.type === 'PullRequest') {
            const prInfo = this.githubClient.extractPullRequestInfo(notification.subject.url);
            if (prInfo) {
              try {
                prDetails = await this.githubClient.getPullRequestDetails(
                  prInfo.owner,
                  prInfo.repo,
                  prInfo.pullNumber
                );
              } catch (error) {
                this.logger.warn(`Failed to fetch PR details for thread ${notification.id}:`, error);
                // Continue processing without PR details
              }
            }
          }

          // Check if we should mark this thread as done
          if (this.filter.shouldMarkAsDone(notification, prDetails)) {
            if (this.dryRun) {
              this.logger.info(`[DRY RUN] Would mark thread as done: ${notification.subject.title}`);
              markedAsDoneCount++;
            } else {
              await this.githubClient.markThreadAsDone(notification.id);
              markedAsDoneCount++;
              this.logger.info(`Marked thread as done: ${notification.subject.title}`);
            }
          } else {
            this.logger.debug(`Keeping thread: ${notification.subject.title}`);
          }

          processedCount++;
          
          // Add a small delay to avoid rate limiting
          await this.delay(100);
          
        } catch (error) {
          this.logger.error(`Error processing thread ${notification.id}:`, error);
          // Continue with next thread
        }
      }

      const action = this.dryRun ? 'would be marked' : 'marked';
      this.logger.info(`Processing complete. Processed ${processedCount} threads, ${markedAsDoneCount} ${action} as done`);
      
    } catch (error) {
      this.logger.error('Failed to process threads:', error);
      throw error;
    }
  }

  private async loadUserTeams(): Promise<void> {
    if (this.userTeams === null) {
      try {
        this.logger.info(`Loading teams for user: ${this.currentUser}`);
        this.userTeams = await this.githubClient.getUserTeams(this.currentUser, this.invalidateCache);
        this.logger.info(`Loaded ${this.userTeams.length} teams for user ${this.currentUser}`);
      } catch (error) {
        this.logger.warn(`Failed to load teams for user ${this.currentUser}, continuing without team data:`, error);
        this.userTeams = [];
      }
    }
  }

  async testConnection(): Promise<void> {
    try {
      this.logger.info('Testing GitHub API connection...');
      
      // Load user teams
      await this.loadUserTeams();
      
      // Fetch a small number of notifications to test the API
      const notifications = await this.githubClient.getNotifications();
      
      this.logger.info(`✅ Successfully connected to GitHub API`);
      this.logger.info(`✅ Found ${notifications.length} unread threads`);
      this.logger.info(`✅ Loaded ${this.userTeams?.length || 0} teams for user ${this.currentUser}`);
      
      if (this.invalidateCache) {
        this.logger.info(`✅ Cache invalidation was requested and completed`);
      }
      
    } catch (error) {
      this.logger.error('❌ GitHub API connection test failed:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}