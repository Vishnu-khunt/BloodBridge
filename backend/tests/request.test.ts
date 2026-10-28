import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Emergency Request Lifecycle Workflow', () => {
  let hospitalToken: string;
  let bloodBankToken: string;
  let requestId: string;
  let matchedInventoryId: string;

  it('should authenticate hospital and blood bank', async () => {
    const hospRes = await request(app).post('/api/v1/auth/login').send({
      email: 'hospital@citygeneral.demo',
      password: 'HospitalPassword123!',
    });
    hospitalToken = hospRes.body.token;

    const bankRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bloodbank@redcross.demo',
      password: 'BloodBankPassword123!',
    });
    bloodBankToken = bankRes.body.token;
  });

  it('should create an emergency request and return suggested matches', async () => {
    const res = await request(app)
      .post('/api/v1/requests/emergency')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        bloodGroup: 'O-',
        componentType: 'packed_red_cells',
        unitsRequested: 2,
        urgencyLevel: 'emergency',
        destinationCity: 'New York',
        destinationLat: 40.7516,
        destinationLng: -73.9754,
        notes: 'Stat trauma transfusion required',
      });

    expect(res.status).to.equal(201);
    expect(res.body.request.status).to.equal('open');
    expect(res.body.matches.length).to.be.above(0);
    expect(res.body.onChainTxHash).to.be.not.undefined;

    requestId = res.body.request.id;
    matchedInventoryId = res.body.matches[0].target_id;
  });

  it('should allow verified blood bank to allocate inventory to the request', async () => {
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/allocate`)
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        inventoryId: matchedInventoryId,
        units: 2,
      });

    expect(res.status).to.equal(200);
    expect(res.body.request.status).to.equal('allocated');
    expect(res.body.reservationId).to.be.not.undefined;
  });

  it('should allow blood bank to dispatch reserved units', async () => {
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/dispatch`)
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        inventoryId: matchedInventoryId,
        units: 2,
      });

    expect(res.status).to.equal(200);
    expect(res.body.request.status).to.equal('dispatched');
  });

  it('should allow requesting hospital to fulfill and confirm receipt', async () => {
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/fulfill`)
      .set('Authorization', `Bearer ${hospitalToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.request.status).to.equal('fulfilled');
  });

  it('should reject cancellation of an already fulfilled request', async () => {
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ reason: 'Patient discharged' });

    expect(res.status).to.equal(500);
    expect(res.body.message).to.include('Cannot cancel a request that has already been fulfilled');
  });
});
