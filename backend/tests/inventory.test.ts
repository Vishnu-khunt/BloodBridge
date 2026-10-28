import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app';
import { inventoryRepository } from '../src/repositories/inventory.repository';
import { userRepository } from '../src/repositories/user.repository';
import { organizationRepository } from '../src/repositories/organization.repository';
import { requestRepository } from '../src/repositories/request.repository';

const app = createApp();

describe('Inventory Concurrency & Management', () => {
  let bloodBankToken: string;
  let batchId: string;

  it('should authenticate verified blood bank and register a new batch', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bloodbank@redcross.demo',
      password: 'BloodBankPassword123!',
    });
    bloodBankToken = loginRes.body.token;

    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${bloodBankToken}`)
      .send({
        blood_group: 'B-',
        component_type: 'packed_red_cells',
        units_available: 5,
        collection_date: '2026-10-20',
        expiry_date: '2026-11-25',
        batch_number: `BATCH-TEST-${Date.now()}`,
        storage_location: 'Rack 4-A',
      });

    expect(res.status).to.equal(201);
    expect(res.body.batch.units_available).to.equal(5);
    expect(res.body.batch.units_reserved).to.equal(0);
    batchId = res.body.batch.id;
  });

  it('should reserve stock successfully and track reserved units', async () => {
    const hospUser = await userRepository.findByEmail('hospital@citygeneral.demo');
    const hospOrg = await organizationRepository.findByUserId(hospUser!.id);
    const testReq = await requestRepository.create({
      hospital_id: hospOrg!.id,
      patient_ref_hash: '0x1234567890abcdef',
      blood_group: 'B-',
      component_type: 'packed_red_cells',
      units_requested: 3,
      urgency_level: 'routine',
      destination_city: 'New York',
    });
    const user = await userRepository.findByEmail('bloodbank@redcross.demo');

    // 1. Reserve 3 units
    const { inventory, reservationId } = await inventoryRepository.reserveStock(
      batchId,
      3,
      testReq.id,
      user!.id
    );

    expect(inventory.units_reserved).to.equal(3);

    // 2. Attempt to reserve 3 more units (should throw, only 2 unreserved remain)
    let caughtError = false;
    try {
      await inventoryRepository.reserveStock(batchId, 3, testReq.id, user!.id);
    } catch (err) {
      caughtError = true;
      expect((err as Error).message).to.include('Insufficient unreserved stock');
    }
    expect(caughtError).to.equal(true);

    // 3. Release the first reservation
    await inventoryRepository.releaseReservation(reservationId);
    const updated = await inventoryRepository.findById(batchId);
    expect(updated?.units_reserved).to.equal(0);
  });
});
