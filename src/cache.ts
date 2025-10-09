import * as fs from 'fs-extra';
import * as path from 'path';
import { GitHubTeam, Logger } from './types';

export interface TeamCache {
  teams: GitHubTeam[];
  timestamp: number;
  username: string;
}

export class TeamCacheManager {
  private cacheDir: string;
  private logger: Logger;
  private cacheTTL: number; // Time to live in milliseconds

  constructor(logger: Logger, cacheDir: string = '.cache', cacheTTLHours: number = 24) {
    this.cacheDir = cacheDir;
    this.logger = logger;
    this.cacheTTL = cacheTTLHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  private getCacheFilePath(username: string): string {
    return path.join(this.cacheDir, `teams-${username}.json`);
  }

  async getCachedTeams(username: string): Promise<GitHubTeam[] | null> {
    try {
      const cacheFilePath = this.getCacheFilePath(username);
      
      if (!await fs.pathExists(cacheFilePath)) {
        this.logger.debug(`No cache file found for user ${username}`);
        return null;
      }

      const cacheData = await fs.readJson(cacheFilePath) as TeamCache;
      
      // Check if cache is expired
      const now = Date.now();
      const cacheAge = now - cacheData.timestamp;
      
      if (cacheAge > this.cacheTTL) {
        this.logger.debug(`Cache for user ${username} is expired (age: ${Math.round(cacheAge / (60 * 60 * 1000))} hours)`);
        return null;
      }

      // Check if cache is for the same user
      if (cacheData.username !== username) {
        this.logger.debug(`Cache file is for different user (${cacheData.username}), ignoring`);
        return null;
      }

      this.logger.debug(`Using cached teams for user ${username} (age: ${Math.round(cacheAge / (60 * 60 * 1000))} hours)`);
      return cacheData.teams;
      
    } catch (error) {
      this.logger.warn(`Failed to read cache for user ${username}:`, error);
      return null;
    }
  }

  async saveTeamsToCache(username: string, teams: GitHubTeam[]): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.ensureDir(this.cacheDir);
      
      const cacheData: TeamCache = {
        teams,
        timestamp: Date.now(),
        username,
      };

      const cacheFilePath = this.getCacheFilePath(username);
      await fs.writeJson(cacheFilePath, cacheData, { spaces: 2 });
      
      this.logger.debug(`Saved ${teams.length} teams to cache for user ${username}`);
      
    } catch (error) {
      this.logger.warn(`Failed to save cache for user ${username}:`, error);
      // Don't throw - caching is not critical
    }
  }

  async invalidateCache(username: string): Promise<void> {
    try {
      const cacheFilePath = this.getCacheFilePath(username);
      
      if (await fs.pathExists(cacheFilePath)) {
        await fs.remove(cacheFilePath);
        this.logger.info(`Invalidated cache for user ${username}`);
      } else {
        this.logger.debug(`No cache file found to invalidate for user ${username}`);
      }
      
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache for user ${username}:`, error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      if (await fs.pathExists(this.cacheDir)) {
        await fs.remove(this.cacheDir);
        this.logger.info('Cleared all cache files');
      } else {
        this.logger.debug('No cache directory found to clear');
      }
      
    } catch (error) {
      this.logger.warn('Failed to clear cache:', error);
    }
  }
}
