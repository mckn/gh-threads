import { Octokit } from '@octokit/rest';
import { GitHubNotification, PullRequestDetails, GitHubTeam, Logger } from './types';
import { TeamCacheManager } from './cache';

export class GitHubClient {
  private octokit: Octokit;
  private logger: Logger;
  private cacheManager: TeamCacheManager;

  constructor(token: string, logger: Logger, cacheManager?: TeamCacheManager) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.logger = logger;
    this.cacheManager = cacheManager || new TeamCacheManager(logger);
  }

  async getNotifications(): Promise<GitHubNotification[]> {
    try {
      this.logger.debug('Fetching unread threads...');
      const allNotifications = await this.fetchAllNotifications();
      
      this.logger.info(`Found ${allNotifications.length} unread threads`);
      return allNotifications;
    } catch (error) {
      this.logger.error('Failed to fetch threads:', error);
      throw error;
    }
  }

  async getPullRequestDetails(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<PullRequestDetails> {
    try {
      this.logger.debug(`Fetching PR details for ${owner}/${repo}#${pullNumber}`);
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      
      return data as PullRequestDetails;
    } catch (error) {
      this.logger.error(`Failed to fetch PR details for ${owner}/${repo}#${pullNumber}:`, error);
      throw error;
    }
  }

  async markThreadAsDone(threadId: string): Promise<void> {
    try {
      this.logger.debug(`Marking thread ${threadId} as done`);
      await this.octokit.rest.activity.markThreadAsDone({
        thread_id: parseInt(threadId),
      });
      this.logger.info(`Successfully marked thread ${threadId} as done`);
    } catch (error) {
      this.logger.error(`Failed to mark thread ${threadId} as done:`, error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    try {
      this.logger.debug('Marking all notifications as read');
      await this.octokit.rest.activity.markNotificationsAsRead();
      this.logger.info('Successfully marked all notifications as read');
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async getUserTeams(username: string, invalidateCache: boolean = false): Promise<GitHubTeam[]> {
    try {
      // Check cache first (unless invalidating)
      if (!invalidateCache) {
        const cachedTeams = await this.cacheManager.getCachedTeams(username);
        if (cachedTeams) {
          this.logger.info(`Using cached teams for user ${username}: ${cachedTeams.map(t => `${t.name}@${t.organization.login}`).join(', ')}`);
          return cachedTeams;
        }
      } else {
        this.logger.info(`Cache invalidation requested, fetching fresh teams for user ${username}`);
        await this.cacheManager.invalidateCache(username);
      }

      this.logger.debug(`Fetching teams for user ${username}...`);
      
      // Try to get the authenticated user's organizations first
      let orgs;
      try {
        orgs = await this.fetchAllOrgsForAuthenticatedUser();
        this.logger.debug(`Found ${orgs.length} organizations for authenticated user: ${orgs.map(o => o.login).join(', ')}`);
      } catch (error) {
        this.logger.debug(`Could not fetch authenticated user's organizations, trying public orgs for ${username}:`, error);
        // Fallback to public organizations
        orgs = await this.fetchAllOrgsForUser(username);
        this.logger.debug(`Found ${orgs.length} public organizations for user ${username}: ${orgs.map(o => o.login).join(', ')}`);
      }
      
      // Then get teams from each organization
      const allTeams: GitHubTeam[] = [];
      
      for (const org of orgs) {
        this.logger.debug(`Fetching teams for organization: ${org.login}`);
        try {
          // Fetch all teams with pagination
          const allOrgTeams = await this.fetchAllTeamsForOrg(org.login);
          
          this.logger.debug(`Found ${allOrgTeams.length} teams in organization ${org.login}: ${allOrgTeams.map(t => t.name).join(', ')}`);
          
          // Filter teams where the user is a member
          for (const team of allOrgTeams) {
            try {
              const { status } = await this.octokit.rest.teams.getMembershipForUserInOrg({
                org: org.login,
                team_slug: team.slug,
                username,
              });
              
              if (status === 200) {
                this.logger.debug(`User ${username} is a member of team ${team.name} in org ${org.login}`);
                allTeams.push({
                  id: team.id,
                  name: team.name,
                  slug: team.slug,
                  organization: {
                    login: org.login,
                    id: org.id,
                  },
                });
              }
            } catch (error) {
              // User is not a member of this team, skip
              this.logger.debug(`User ${username} is not a member of team ${team.name} in org ${org.login}`);
              continue;
            }
          }
        } catch (error) {
          // Skip organizations where we can't fetch teams
          this.logger.debug(`Could not fetch teams for organization ${org.login}:`, error);
          continue;
        }
      }
      
      this.logger.info(`Found ${allTeams.length} teams for user ${username}: ${allTeams.map(t => `${t.name}@${t.organization.login}`).join(', ')}`);
      
      // Save to cache
      await this.cacheManager.saveTeamsToCache(username, allTeams);
      
      return allTeams;
    } catch (error) {
      this.logger.error(`Failed to fetch teams for user ${username}:`, error);
      throw error;
    }
  }

  private async fetchAllOrgsForAuthenticatedUser(): Promise<any[]> {
    const allOrgs: any[] = [];
    let page = 1;
    const perPage = 100; // Maximum per page
    
    while (true) {
      try {
        this.logger.debug(`Fetching organizations for authenticated user, page ${page}`);
        
        const { data: orgs, headers } = await this.octokit.rest.orgs.listForAuthenticatedUser({
          per_page: perPage,
          page: page,
        });
        
        if (orgs.length === 0) {
          // No more organizations
          break;
        }
        
        allOrgs.push(...orgs);
        this.logger.debug(`Fetched ${orgs.length} organizations from page ${page} (total so far: ${allOrgs.length})`);
        
        // Check if there are more pages by looking at the Link header
        const linkHeader = headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          // No next page
          break;
        }
        
        page++;
        
        // Add a small delay to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        this.logger.error(`Failed to fetch organizations for authenticated user on page ${page}:`, error);
        throw error;
      }
    }
    
    this.logger.debug(`Fetched all ${allOrgs.length} organizations for authenticated user`);
    return allOrgs;
  }

  private async fetchAllOrgsForUser(username: string): Promise<any[]> {
    const allOrgs: any[] = [];
    let page = 1;
    const perPage = 100; // Maximum per page
    
    while (true) {
      try {
        this.logger.debug(`Fetching public organizations for user ${username}, page ${page}`);
        
        const { data: orgs, headers } = await this.octokit.rest.orgs.listForUser({
          username,
          per_page: perPage,
          page: page,
        });
        
        if (orgs.length === 0) {
          // No more organizations
          break;
        }
        
        allOrgs.push(...orgs);
        this.logger.debug(`Fetched ${orgs.length} organizations from page ${page} (total so far: ${allOrgs.length})`);
        
        // Check if there are more pages by looking at the Link header
        const linkHeader = headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          // No next page
          break;
        }
        
        page++;
        
        // Add a small delay to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        this.logger.error(`Failed to fetch organizations for user ${username} on page ${page}:`, error);
        throw error;
      }
    }
    
    this.logger.debug(`Fetched all ${allOrgs.length} organizations for user ${username}`);
    return allOrgs;
  }

  private async fetchAllTeamsForOrg(orgLogin: string): Promise<any[]> {
    const allTeams: any[] = [];
    let page = 1;
    const perPage = 100; // Maximum per page
    
    while (true) {
      try {
        this.logger.debug(`Fetching teams for organization ${orgLogin}, page ${page}`);
        
        const { data: teams, headers } = await this.octokit.rest.teams.list({
          org: orgLogin,
          per_page: perPage,
          page: page,
        });
        
        if (teams.length === 0) {
          // No more teams
          break;
        }
        
        allTeams.push(...teams);
        this.logger.debug(`Fetched ${teams.length} teams from page ${page} (total so far: ${allTeams.length})`);
        
        // Check if there are more pages by looking at the Link header
        const linkHeader = headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          // No next page
          break;
        }
        
        page++;
        
        // Add a small delay to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        this.logger.error(`Failed to fetch teams for organization ${orgLogin} on page ${page}:`, error);
        throw error;
      }
    }
    
    this.logger.debug(`Fetched all ${allTeams.length} teams for organization ${orgLogin}`);
    return allTeams;
  }

  private async fetchAllNotifications(): Promise<GitHubNotification[]> {
    const allNotifications: GitHubNotification[] = [];
    let page = 1;
    const perPage = 100; // Maximum per page
    
    while (true) {
      try {
        this.logger.debug(`Fetching notifications page ${page}`);
        
        const { data: notifications, headers } = await this.octokit.rest.activity.listNotificationsForAuthenticatedUser({
          all: false, // Only unread threads
          per_page: perPage,
          page: page,
        });
        
        if (notifications.length === 0) {
          // No more notifications
          break;
        }
        
        allNotifications.push(...notifications);
        this.logger.debug(`Fetched ${notifications.length} notifications from page ${page} (total so far: ${allNotifications.length})`);
        
        // Check if there are more pages by looking at the Link header
        const linkHeader = headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          // No next page
          break;
        }
        
        page++;
        
        // Add a small delay to avoid rate limiting
        await this.delay(100);
        
      } catch (error) {
        this.logger.error(`Failed to fetch notifications on page ${page}:`, error);
        throw error;
      }
    }
    
    this.logger.debug(`Fetched all ${allNotifications.length} notifications`);
    return allNotifications as GitHubNotification[];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractPullRequestInfo(url: string): { owner: string; repo: string; pullNumber: number } | null {
    // Extract PR info from GitHub URL
    // Format: https://api.github.com/repos/owner/repo/pulls/123
    const match = url.match(/\/repos\/([^\/]+)\/([^\/]+)\/pulls\/(\d+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        pullNumber: parseInt(match[3]),
      };
    }
    return null;
  }
}