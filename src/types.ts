export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string;
    latest_comment_url: string;
    type: string; // Allow any string type from GitHub API
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  url: string;
  subscription_url: string;
  // Note: The notification ID is actually the thread ID for marking as done
}

export interface PullRequestDetails {
  id: number;
  number: number;
  state: 'open' | 'closed';
  merged: boolean;
  merged_at: string | null;
  closed_at: string | null;
  user: {
    login: string;
    id: number;
  };
  requested_reviewers: Array<{
    login: string;
    id: number;
  }>;
  requested_teams: Array<{
    name: string;
    id: number;
  }>;
  assignees: Array<{
    login: string;
    id: number;
  }>;
}

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  organization: {
    login: string;
    id: number;
  };
}

export interface NotificationFilter {
  shouldMarkAsDone(notification: GitHubNotification, prDetails?: PullRequestDetails): boolean;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}