import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Phase 5 End-to-End 12-Step Guided Demo Flow', () => {
  let adminToken: string;
  let hospitalToken: string;
  let bloodBankToken: string;
  let donorToken: string;

  let pendingHospitalId: string;
  let emergencyRequestId: string;
  let batchIdToVerify: string;

  it('Step 1: Admin verifies unaccredited hospital on-chain', async () => {
    // 1. Admin login
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@bloodbridge.demo',
      password: 'AdminPassword123!',
    });
    expect(adminRes.status).to.equal(200);
    adminToken = adminRes.body.token;

    // 2. Find pending hospital
    const orgsRes = await request(app)
      .get('/api/v1/organizations?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(orgsRes.status).to.equal(200);

    const pending = orgsRes.body.organizations.find(
      (o: any) => o.legal_name.includes('St. Jude') || o.verification_status === 'pending'
    );
    expect(pending).to.be.not.undefined;
    pendingHospitalId = pending.id;

    // 3. Admin verifies organization
    const verifyRes = await request(app)
      .post(`/api/v1/organizations/${pendingHospitalId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(verifyRes.status).to.equal(200);
    expect(verifyRes.body.organization.verification_status).to.equal('verified');
  });

  it('Step 2: Blood Bank ingests a verified cold-storage batch', async () => {
    const bankRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bloodbank@redcross.demo',
      password: 'BloodBankPassword123!',
    });
    expect(bankRes.status).to.equal(200);
    bloodBankToken = bankRes.body.token;

    const addRes = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        blood_group: 'O-',
        component_type: 'packed_red_cells',
        units_available: 15,
        collection_date: '2026-10-25',
        expiry_date: '2026-12-05',
        batch_number: `DEMO-O-NEG-${Date.now()}`,
        storage_location: 'CryoVault-9, Tier-A',
      });
    expect(addRes.status).to.equal(201);
    expect(addRes.body.batch.blood_group).to.equal('O-');
    expect(addRes.body.batch.units_available).to.equal(15);
  });

  it('Step 3: Voluntary Donor confirms availability & freshness', async () => {
    const donorRes = await request(app).post('/api/v1/auth/login').send({
      email: 'donor.alex@bloodbridge.demo',
      password: 'DonorPassword123!',
    });
    expect(donorRes.status).to.equal(200);
    donorToken = donorRes.body.token;

    const availRes = await request(app)
      .post('/api/v1/donors/availability')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ isAvailable: true });
    expect(availRes.status).to.equal(200);
    expect(availRes.body.profile.is_available).to.equal(true);
    expect(availRes.body.profile.availability_confirmed_at).to.be.not.undefined;
  });

  it('Step 4 & 5 & 6: Hospital creates emergency request, verifies on-chain hash & ranked matches', async () => {
    const hospRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hospital@citygeneral.demo',
      password: 'HospitalPassword123!',
    });
    expect(hospRes.status).to.equal(200);
    hospitalToken = hospRes.body.token;

    // Create emergency request
    const reqRes = await request(app)
      .post('/api/v1/requests/emergency')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        bloodGroup: 'O-',
        componentType: 'packed_red_cells',
        unitsRequested: 3,
        urgencyLevel: 'emergency',
        destinationCity: 'New York',
        notes: 'Acute hemorrhage - trauma resuscitation',
      });

    expect(reqRes.status).to.equal(201);
    expect(reqRes.body.request.blood_group).to.equal('O-');
    expect(reqRes.body.request.on_chain_request_hash).to.be.not.undefined;
    expect(reqRes.body.onChainTxHash).to.be.not.undefined;

    emergencyRequestId = reqRes.body.request.id;

    // Verify explainable ranked matches
    const matchesRes = await request(app)
      .get(`/api/v1/requests/${emergencyRequestId}/matches`)
      .set('Authorization', `Bearer ${hospitalToken}`);
    expect(matchesRes.status).to.equal(200);
    expect(matchesRes.body.matches.length).to.be.above(0);

    const topMatch = matchesRes.body.matches[0];
    expect(topMatch.explanation_json).to.be.not.undefined;
    expect(topMatch.explanation_json.reasons).to.be.an('array');
    expect(topMatch.explanation_json.medicalDisclaimer).to.be.a('string');
  });

  it('Step 7 & 8: Blood Bank allocates units and dispatches cold-chain shipment', async () => {
    // 1. Fetch available inventory
    const invRes = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${bloodBankToken}`);
    expect(invRes.status).to.equal(200);
    const candidateBatch = invRes.body.inventory.find(
      (b: any) => b.blood_group === 'O-' && b.units_available >= 3
    );
    expect(candidateBatch).to.be.not.undefined;

    // 2. Allocate
    const allocRes = await request(app)
      .post(`/api/v1/requests/${emergencyRequestId}/allocate`)
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        inventoryId: candidateBatch.id,
        units: 3,
      });
    expect(allocRes.status).to.equal(200);
    expect(allocRes.body.request.status).to.equal('allocated');

    // 3. Dispatch
    const dispatchRes = await request(app)
      .post(`/api/v1/requests/${emergencyRequestId}/dispatch`)
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        inventoryId: candidateBatch.id,
        units: 3,
      });
    expect(dispatchRes.status).to.equal(200);
    expect(dispatchRes.body.request.status).to.equal('dispatched');
  });

  it('Step 9: Hospital confirms delivery & fulfills emergency request', async () => {
    const fulfillRes = await request(app)
      .post(`/api/v1/requests/${emergencyRequestId}/fulfill`)
      .set('Authorization', `Bearer ${hospitalToken}`);
    expect(fulfillRes.status).to.equal(200);
    expect(fulfillRes.body.request.status).to.equal('fulfilled');
  });

  it('Step 10, 11 & 12: Security intelligence, audit trail & cryptographic anchor verification', async () => {
    // 1. Retrieve security alerts
    const alertsRes = await request(app)
      .get('/api/v1/admin/security/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alertsRes.status).to.equal(200);
    expect(alertsRes.body.alerts).to.be.an('array');

    // 2. Retrieve audit logs
    const logsRes = await request(app)
      .get('/api/v1/admin/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).to.equal(200);
    expect(logsRes.body.logs.length).to.be.above(0);

    // 3. Anchor audit batch to smart contract
    const anchorRes = await request(app)
      .post('/api/v1/admin/audit/anchor-batch')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(anchorRes.status).to.equal(200);
    expect(anchorRes.body.batchId).to.be.a('string');
    expect(anchorRes.body.rootHash).to.be.a('string');
    batchIdToVerify = anchorRes.body.batchId;

    // 4. Verify cryptographic tamper-free status
    const verifyRes = await request(app)
      .get(`/api/v1/admin/audit/verify/${batchIdToVerify}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(verifyRes.status).to.equal(200);
    expect(verifyRes.body.isTamperFree).to.equal(true);
    expect(verifyRes.body.storedRootHash).to.equal(verifyRes.body.recomputedRootHash);
    expect(verifyRes.body.disclaimer).to.be.a('string');
  });
});
