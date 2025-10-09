#!/usr/bin/env node

import { Command } from 'commander';
import { ConsoleLogger } from './logger';
import { NotificationProcessor } from './notification-processor';
import { Logger } from './types';

const program = new Command();

program
  .name('gh-notifications')
  .description('Automatically mark GitHub threads as done when they don\'t require action')
  .version('1.0.0');

program
  .command('process')
  .description('Process GitHub threads and mark qualifying ones as done')
  .requiredOption('-t, --token <token>', 'GitHub Personal Access Token')
  .requiredOption('-u, --user <username>', 'GitHub username')
  .option('-d, --dry-run', 'Preview what would be marked as done without actually doing it', false)
  .option('-i, --invalidate-cache', 'Invalidate team cache and fetch fresh data', false)
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (options) => {
    const logger: Logger = new ConsoleLogger(options.logLevel);
    
    try {
      logger.info('GitHub Threads Processor CLI');
      logger.info(`Processing threads for user: ${options.user}`);
      logger.info(`Dry run mode: ${options.dryRun ? 'enabled' : 'disabled'}`);
      logger.info(`Cache invalidation: ${options.invalidateCache ? 'enabled' : 'disabled'}`);
      
      if (options.dryRun) {
        logger.info('🔍 DRY RUN MODE - No threads will actually be marked as done');
      }
      
      if (options.invalidateCache) {
        logger.info('🔄 CACHE INVALIDATION - Fetching fresh team data');
      }

      // Create and run the thread processor
      const processor = new NotificationProcessor(options.token, options.user, logger, options.dryRun, options.invalidateCache);
      await processor.processNotifications();

      logger.info('GitHub Threads Processor completed successfully');
      
    } catch (error) {
      logger.error('GitHub Threads Processor failed:', error);
      process.exit(1);
    }
  });

program
  .command('test-connection')
  .description('Test GitHub API connection and user authentication')
  .requiredOption('-t, --token <token>', 'GitHub Personal Access Token')
  .requiredOption('-u, --user <username>', 'GitHub username')
  .option('-i, --invalidate-cache', 'Invalidate team cache and fetch fresh data', false)
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (options) => {
    const logger: Logger = new ConsoleLogger(options.logLevel);
    
    try {
      logger.info('Testing GitHub API connection...');
      
      const processor = new NotificationProcessor(options.token, options.user, logger, true, options.invalidateCache);
      
      // Test by loading teams and fetching a small number of notifications
      await processor.testConnection();
      
      logger.info('✅ GitHub API connection test successful');
      
    } catch (error) {
      logger.error('❌ GitHub API connection test failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
