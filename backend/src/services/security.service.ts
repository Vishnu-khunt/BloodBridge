import { securityAlertRepository } from '../repositories/securityAlert.repository';
import { auditRepository } from '../repositories/audit.repository';
import { SecurityAlert } from '../types';

export class SecurityService {
  /**
   * Evaluates Search query frequency.
   * Rule 1: EXCESSIVE_DONOR_SEARCH - Flags >= 15 searches within a rolling 5-minute window.
   */
  async evaluateSearchActivity(actorId: string, ipAddress?: string): Promise<void> {
    await auditRepository.log({
      actor_id: actorId,
      actor_role: 'hospital',
      event_type: 'SEARCH_PERFORMED',
      resource_type: 'donor_search',
      ip_address: ipAddress,
      severity: 'info',
    });

    const recentCount = await securityAlertRepository.countRecentEvents(
      'SEARCH_PERFORMED',
      actorId,
      undefined,
      5
    );

    if (recentCount >= 15) {
      await this.triggerAlert({
        rule_id: 'SEC_RULE_EXCESSIVE_SEARCH_001',
        rule_name: 'Excessive Donor Search Rate',
        severity: 'warning',
        actor_id: actorId,
        ip_address: ipAddress,
        description: `Actor performed ${recentCount} donor searches within 5 minutes. Potential automated scraping or unauthorized harvesting.`,
        metadata: { searchCount: recentCount, windowMinutes: 5 },
      });
    }
  }

  /**
   * Evaluates failed login attempts.
   * Rule 2: REPEATED_LOGIN_FAILURES - Flags >= 5 consecutive failures within 10 minutes.
   */
  async recordFailedLogin(email: string, ipAddress?: string, userId?: string): Promise<void> {
    await auditRepository.log({
      actor_id: userId || null,
      event_type: 'USER_LOGIN_FAILED',
      resource_type: 'user',
      details: { email },
      ip_address: ipAddress,
      severity: 'warning',
    });

    const recentFailures = await securityAlertRepository.countRecentEvents(
      'USER_LOGIN_FAILED',
      userId,
      ipAddress,
      10
    );

    if (recentFailures >= 5) {
      await this.triggerAlert({
        rule_id: 'SEC_RULE_BRUTE_FORCE_AUTH_002',
        rule_name: 'Repeated Authentication Failures',
        severity: 'warning',
        actor_id: userId,
        ip_address: ipAddress,
        description: `Recorded ${recentFailures} failed authentication attempts for target '${email}' within 10 minutes. Potential credential stuffing or brute-force pattern.`,
        metadata: { failedAttempts: recentFailures, targetEmail: email, windowMinutes: 10 },
      });
    }
  }

  /**
   * Evaluates unaccredited actions.
   * Rule 3: UNACCREDITED_INVENTORY_ACTION - Flags unverified/revoked org attempting inventory action.
   */
  async flagUnaccreditedAction(
    actorId: string,
    orgId: string,
    orgStatus: string,
    action: string,
    ipAddress?: string
  ): Promise<void> {
    await auditRepository.log({
      actor_id: actorId,
      event_type: 'UNACCREDITED_ACTION_ATTEMPTED',
      resource_type: 'inventory',
      resource_id: orgId,
      details: { attemptedAction: action, organizationStatus: orgStatus },
      ip_address: ipAddress,
      severity: 'critical',
    });

    await this.triggerAlert({
      rule_id: 'SEC_RULE_UNACCREDITED_ACTION_003',
      rule_name: 'Unaccredited Privileged Action Attempt',
      severity: 'critical',
      actor_id: actorId,
      ip_address: ipAddress,
      description: `Organization ${orgId} with status '${orgStatus}' attempted privileged operation '${action}'. Blocked by server authorization.`,
      metadata: { orgId, orgStatus, action },
    });
  }

  /**
   * Triggers or updates a security alert with deduplication against existing open alerts.
   */
  private async triggerAlert(alertData: {
    rule_id: string;
    rule_name: string;
    severity: 'info' | 'warning' | 'critical';
    actor_id?: string | null;
    ip_address?: string | null;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<SecurityAlert> {
    // Check if open alert exists for this rule and actor within recent time
    const existing = await securityAlertRepository.list({ status: 'open' });
    const duplicate = existing.find(
      (a) =>
        a.rule_id === alertData.rule_id &&
        (a.actor_id === alertData.actor_id || a.ip_address === alertData.ip_address)
    );

    if (duplicate) {
      return duplicate;
    }

    return await securityAlertRepository.create(alertData);
  }
}

export const securityService = new SecurityService();
