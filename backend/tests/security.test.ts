import { expect } from 'chai';
import { securityService } from '../src/services/security.service';
import { securityAlertRepository } from '../src/repositories/securityAlert.repository';
import { userRepository } from '../src/repositories/user.repository';

describe('Security Intelligence & Anomaly Detection Rules', () => {
  it('Rule 1: should flag excessive search queries (>= 15 in rolling 5 mins)', async () => {
    const user = await userRepository.findByEmail('hospital@citygeneral.demo');
    const actorId = user!.id;

    // Simulate 15 quick searches
    for (let i = 0; i < 15; i++) {
      await securityService.evaluateSearchActivity(actorId, '192.168.1.100');
    }

    const alerts = await securityAlertRepository.list({ status: 'open' });
    const searchAlert = alerts.find(
      (a) => a.rule_id === 'SEC_RULE_EXCESSIVE_SEARCH_001' && a.actor_id === actorId
    );

    expect(searchAlert).to.be.not.undefined;
    expect(searchAlert?.severity).to.equal('warning');
    expect(searchAlert?.description).to.include('donor searches');
    expect(searchAlert?.rule_name).to.include('Excessive Donor Search');
  });

  it('Rule 2: should flag repeated authentication failures (>= 5 in 10 mins)', async () => {
    const targetEmail = `victim.${Date.now()}@domain.demo`;

    for (let i = 0; i < 5; i++) {
      await securityService.recordFailedLogin(targetEmail, '10.0.0.50');
    }

    const alerts = await securityAlertRepository.list({ status: 'open' });
    const bruteForceAlert = alerts.find(
      (a) =>
        a.rule_id === 'SEC_RULE_BRUTE_FORCE_AUTH_002' &&
        a.description.includes(targetEmail)
    );

    expect(bruteForceAlert).to.be.not.undefined;
    expect(bruteForceAlert?.severity).to.equal('warning');
  });

  it('Rule 3: should flag unaccredited organization inventory attempts', async () => {
    const user = await userRepository.findByEmail('hospital.pending@stjude.demo');
    const actorId = user!.id;
    const unaccreditedOrgId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    await securityService.flagUnaccreditedAction(
      actorId,
      unaccreditedOrgId,
      'pending',
      'MUTATE_INVENTORY_STOCK',
      '127.0.0.1'
    );

    const alerts = await securityAlertRepository.list({ status: 'open' });
    const actionAlert = alerts.find(
      (a) =>
        a.rule_id === 'SEC_RULE_UNACCREDITED_ACTION_003' &&
        a.description.includes(unaccreditedOrgId)
    );

    expect(actionAlert).to.be.not.undefined;
    expect(actionAlert?.severity).to.equal('critical');
  });
});
