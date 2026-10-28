import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Role-Based Access Control & Organization Verification', () => {
  let donorToken: string;
  let adminToken: string;
  let unverifiedHospitalToken: string;
  let unverifiedOrgId: string;

  it('should authenticate donor, admin, and unverified hospital', async () => {
    // Login donor
    const donorRes = await request(app).post('/api/v1/auth/login').send({
      email: 'donor.alex@bloodbridge.demo',
      password: 'DonorPassword123!',
    });
    donorToken = donorRes.body.token;

    // Login admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@bloodbridge.demo',
      password: 'AdminPassword123!',
    });
    adminToken = adminRes.body.token;

    // Login unverified hospital
    const unverifiedRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hospital.pending@stjude.demo',
      password: 'HospitalPassword123!',
    });
    unverifiedHospitalToken = unverifiedRes.body.token;

    // Get unverified org ID
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${unverifiedHospitalToken}`);
    unverifiedOrgId = meRes.body.organization.id;
  });

  it('should prevent donors from accessing admin security alerts', async () => {
    const res = await request(app)
      .get('/api/v1/admin/security/alerts')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include("Role 'donor' is not authorized");
  });

  it('should block unverified hospital from creating emergency requests', async () => {
    const res = await request(app)
      .post('/api/v1/requests/emergency')
      .set('Authorization', `Bearer ${unverifiedHospitalToken}`)
      .send({
        bloodGroup: 'O-',
        componentType: 'packed_red_cells',
        unitsRequested: 2,
        urgencyLevel: 'emergency',
        destinationCity: 'New York',
      });

    expect(res.status).to.equal(403);
    expect(res.body.message).to.include("Organization accreditation status is 'pending'");
  });

  it('should allow admin to verify the pending hospital', async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${unverifiedOrgId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.organization.verification_status).to.equal('verified');
  });

  it('should allow the newly verified hospital to proceed with emergency request', async () => {
    // Refresh login token to get updated orgStatus
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hospital.pending@stjude.demo',
      password: 'HospitalPassword123!',
    });
    const refreshedToken = loginRes.body.token;

    const res = await request(app)
      .post('/api/v1/requests/emergency')
      .set('Authorization', `Bearer ${refreshedToken}`)
      .send({
        bloodGroup: 'O-',
        componentType: 'packed_red_cells',
        unitsRequested: 2,
        urgencyLevel: 'emergency',
        destinationCity: 'New York',
      });

    expect(res.status).to.equal(201);
    expect(res.body.request.status).to.equal('open');
  });
});
