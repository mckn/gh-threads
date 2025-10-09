import dotenv from 'dotenv';
import { ConsoleLogger } from './logger';
import { NotificationProcessor } from './notification-processor';
import { Logger } from './types';

// Load environment variables
dotenv.config();

async function main() {
  const logger: Logger = new ConsoleLogger(process.env.LOG_LEVEL || 'info');
  
  try {
    // Validate required environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const currentUser = process.env.GITHUB_USER;

    if (!githubToken) {
      logger.error('GITHUB_TOKEN environment variable is required');
      process.exit(1);
    }

    if (!currentUser) {
      logger.error('GITHUB_USER environment variable is required');
      process.exit(1);
    }

    logger.info('Starting GitHub Threads Processor');
    logger.info(`Processing threads for user: ${currentUser}`);

    // Create and run the thread processor
    const processor = new NotificationProcessor(githubToken, currentUser, logger);
    await processor.processNotifications();

    logger.info('GitHub Threads Processor completed successfully');
    
  } catch (error) {
    logger.error('GitHub Threads Processor failed:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}