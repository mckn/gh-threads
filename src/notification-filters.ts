import {
  GitHubNotification,
  PullRequestDetails,
  GitHubTeam,
  NotificationFilter,
  Logger,
} from "./types";

export class MergedClosedPRFilter implements NotificationFilter {
  private logger: Logger;
  private currentUser: string;
  private getUserTeams: () => GitHubTeam[] | null;

  constructor(
    currentUser: string,
    logger: Logger,
    getUserTeams: () => GitHubTeam[] | null
  ) {
    this.currentUser = currentUser;
    this.logger = logger;
    this.getUserTeams = getUserTeams;
  }

  shouldMarkAsDone(
    notification: GitHubNotification,
    prDetails?: PullRequestDetails
  ): boolean {
    // Only process PullRequest notifications
    if (notification.subject.type !== "PullRequest") {
      return false;
    }

    // If we don't have PR details, we can't make a decision
    if (!prDetails) {
      this.logger.debug(
        `No PR details available for notification ${notification.id}`
      );
      return false;
    }

    // Check if PR is merged or closed
    const isMergedOrClosed =
      prDetails.state === "closed" || prDetails.merged === true;
    if (!isMergedOrClosed) {
      this.logger.debug(
        `PR ${prDetails.number} is still open, not marking as done`
      );
      return false;
    }

    // Check if user is a direct reviewer (not just part of a team)
    const isDirectReviewer = this.isDirectReviewer(prDetails);
    if (isDirectReviewer) {
      this.logger.debug(
        `User ${this.currentUser} is a direct reviewer for PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    // Check if user is the author of the PR
    const isAuthor = prDetails.user.login === this.currentUser;
    if (isAuthor) {
      this.logger.debug(
        `User ${this.currentUser} is the author of PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    // Check if user is assigned to the PR
    const isAssigned = prDetails.assignees.some(
      (assignee) => assignee.login === this.currentUser
    );
    if (isAssigned) {
      this.logger.debug(
        `User ${this.currentUser} is assigned to PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    this.logger.info(
      `PR ${prDetails.number} is ${
        prDetails.merged ? "merged" : "closed"
      } and user is not directly involved, marking as done`
    );
    return true;
  }

  private isDirectReviewer(prDetails: PullRequestDetails): boolean {
    // Check if user is in the requested reviewers list
    const isRequestedReviewer = prDetails.requested_reviewers.some(
      (reviewer) => reviewer.login === this.currentUser
    );

    if (isRequestedReviewer) {
      return true;
    }

    // Check if any of the user's teams are in the requested teams list
    const userTeams = this.getUserTeams();
    if (userTeams) {
      const isTeamReviewer = prDetails.requested_teams.some((requestedTeam) =>
        userTeams.some(
          (userTeam) =>
            userTeam.name === requestedTeam.name ||
            userTeam.slug === requestedTeam.name
        )
      );

      if (isTeamReviewer) {
        this.logger.debug(
          `User ${this.currentUser} is a direct reviewer through team membership`
        );
        return true;
      }
    }

    return false;
  }
}

export class RenovatePRFilter implements NotificationFilter {
  private logger: Logger;
  private currentUser: string;
  private getUserTeams: () => GitHubTeam[] | null;
  private readonly RENOVATE_APP_URL = "https://github.com/apps/renovate-sh-app";

  constructor(
    currentUser: string,
    logger: Logger,
    getUserTeams: () => GitHubTeam[] | null
  ) {
    this.currentUser = currentUser;
    this.logger = logger;
    this.getUserTeams = getUserTeams;
  }

  shouldMarkAsDone(
    notification: GitHubNotification,
    prDetails?: PullRequestDetails
  ): boolean {
    // Only process PullRequest notifications
    if (notification.subject.type !== "PullRequest") {
      return false;
    }

    // If we don't have PR details, we can't make a decision
    if (!prDetails) {
      this.logger.debug(
        `No PR details available for notification ${notification.id}`
      );
      return false;
    }

    // Check if PR is opened by Renovate app
    const isRenovatePR =
      prDetails.user.login === "renovate-sh-app[bot]" &&
      prDetails.user.type === "Bot";

    if (!isRenovatePR) {
      this.logger.debug(
        `PR ${prDetails.number} is not from Renovate, not marking as done`
      );
      return false;
    }

    // Check if user is a direct reviewer (not just part of a team)
    const isDirectReviewer = this.isDirectReviewer(prDetails);
    if (isDirectReviewer) {
      this.logger.debug(
        `User ${this.currentUser} is a direct reviewer for Renovate PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    // Check if user is the author of the PR (shouldn't happen with Renovate, but just in case)
    const isAuthor = prDetails.user.login === this.currentUser;
    if (isAuthor) {
      this.logger.debug(
        `User ${this.currentUser} is the author of Renovate PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    // Check if user is assigned to the PR
    const isAssigned = prDetails.assignees.some(
      (assignee) => assignee.login === this.currentUser
    );
    if (isAssigned) {
      this.logger.debug(
        `User ${this.currentUser} is assigned to Renovate PR ${prDetails.number}, not marking as done`
      );
      return false;
    }

    this.logger.info(
      `Renovate PR ${prDetails.number} opened by ${prDetails.user.login} and user is not directly involved, marking as done`
    );
    return true;
  }

  private isDirectReviewer(prDetails: PullRequestDetails): boolean {
    // Check if user is in the requested reviewers list
    const isRequestedReviewer = prDetails.requested_reviewers.some(
      (reviewer) => reviewer.login === this.currentUser
    );

    if (isRequestedReviewer) {
      return true;
    }

    return false;
  }
}

export class CompositeFilter implements NotificationFilter {
  private filters: NotificationFilter[];
  private logger: Logger;

  constructor(filters: NotificationFilter[], logger: Logger) {
    this.filters = filters;
    this.logger = logger;
  }

  shouldMarkAsDone(
    notification: GitHubNotification,
    prDetails?: PullRequestDetails
  ): boolean {
    // If any filter says we should mark as done, we mark it as done
    for (const filter of this.filters) {
      if (filter.shouldMarkAsDone(notification, prDetails)) {
        this.logger.debug(
          `Filter ${filter.constructor.name} says to mark notification ${notification.id} as done`
        );
        return true;
      }
    }

    this.logger.debug(`No filters matched for notification ${notification.id}`);
    return false;
  }
}
