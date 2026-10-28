import bcrypt from 'bcryptjs';
import { db } from './client';
import { runMigrations } from './migrate';

export async function runSeeds(): Promise<void> {
  console.log('[Seed] Seeding reproducible fictional demo data...');
  await runMigrations();

  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('AdminPassword123!', saltRounds);
  const hospitalPassword = await bcrypt.hash('HospitalPassword123!', saltRounds);
  const bloodBankPassword = await bcrypt.hash('BloodBankPassword123!', saltRounds);
  const donorPassword = await bcrypt.hash('DonorPassword123!', saltRounds);
  const volunteerPassword = await bcrypt.hash('VolunteerPassword123!', saltRounds);

  // 1. Seed Users
  console.log('[Seed] Inserting role demo users...');
  const users = [
    {
      email: 'admin@bloodbridge.demo',
      password_hash: adminPassword,
      role: 'admin',
      full_name: 'Dr. Eleanor Vance (System Admin)',
      phone: '+1-555-0100',
    },
    {
      email: 'hospital@citygeneral.demo',
      password_hash: hospitalPassword,
      role: 'hospital',
      full_name: 'Dr. Marcus Sterling (Chief Medical Officer)',
      phone: '+1-555-0200',
    },
    {
      email: 'hospital.pending@stjude.demo',
      password_hash: hospitalPassword,
      role: 'hospital',
      full_name: 'Dr. Arthur Pendelton (Attending Physician)',
      phone: '+1-555-0201',
    },
    {
      email: 'bloodbank@redcross.demo',
      password_hash: bloodBankPassword,
      role: 'blood_bank',
      full_name: 'Elena Rostova (Inventory Director)',
      phone: '+1-555-0300',
    },
    {
      email: 'bloodbank.pending@metrostor.demo',
      password_hash: bloodBankPassword,
      role: 'blood_bank',
      full_name: 'Jacob Meyer (Storage Supervisor)',
      phone: '+1-555-0301',
    },
    {
      email: 'donor.alex@bloodbridge.demo',
      password_hash: donorPassword,
      role: 'donor',
      full_name: 'Alex Rivera (Universal Donor O-)',
      phone: '+1-555-0400',
    },
    {
      email: 'donor.priya@bloodbridge.demo',
      password_hash: donorPassword,
      role: 'donor',
      full_name: 'Priya Sharma (Regular Donor A+)',
      phone: '+1-555-0401',
    },
    {
      email: 'donor.carlos@bloodbridge.demo',
      password_hash: donorPassword,
      role: 'donor',
      full_name: 'Carlos Mendez (Donor B+)',
      phone: '+1-555-0402',
    },
    {
      email: 'donor.sarah@bloodbridge.demo',
      password_hash: donorPassword,
      role: 'donor',
      full_name: 'Sarah Connor (Donor AB+)',
      phone: '+1-555-0403',
    },
    {
      email: 'volunteer.sam@bloodbridge.demo',
      password_hash: volunteerPassword,
      role: 'volunteer',
      full_name: 'Samira Khan (Community NGO Coordinator)',
      phone: '+1-555-0500',
    },
  ];

  const userMap: Record<string, string> = {};

  for (const u of users) {
    const res = await db.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id, email`,
      [u.email, u.password_hash, u.role, u.full_name, u.phone]
    );
    userMap[res.rows[0].email] = res.rows[0].id;
  }

  // 2. Seed Organizations
  console.log('[Seed] Inserting healthcare organizations...');
  const orgs = [
    {
      user_id: userMap['hospital@citygeneral.demo'],
      org_type: 'hospital',
      legal_name: 'City General Hospital (Demo Verified)',
      license_number: 'HOSP-NY-8891',
      address: '450 Lexington Ave, New York, NY',
      city: 'New York',
      latitude: 40.7516,
      longitude: -73.9754,
      verification_status: 'verified',
      eth_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat #1
    },
    {
      user_id: userMap['hospital.pending@stjude.demo'],
      org_type: 'hospital',
      legal_name: 'St. Jude Memorial Hospital (Demo Pending)',
      license_number: 'HOSP-NY-9912',
      address: '120 Park Ave, New York, NY',
      city: 'New York',
      latitude: 40.7519,
      longitude: -73.9774,
      verification_status: 'pending',
      eth_address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Hardhat #4
    },
    {
      user_id: userMap['bloodbank@redcross.demo'],
      org_type: 'blood_bank',
      legal_name: 'Metro Red Cross Blood Center (Demo Verified)',
      license_number: 'BB-NY-4421',
      address: '520 W 49th St, New York, NY',
      city: 'New York',
      latitude: 40.7645,
      longitude: -73.9934,
      verification_status: 'verified',
      eth_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Hardhat #2
    },
    {
      user_id: userMap['bloodbank.pending@metrostor.demo'],
      org_type: 'blood_bank',
      legal_name: 'Metro Blood Storage Unit (Demo Pending)',
      license_number: 'BB-NY-5510',
      address: '750 3rd Ave, New York, NY',
      city: 'New York',
      latitude: 40.7533,
      longitude: -73.9734,
      verification_status: 'pending',
      eth_address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Hardhat #3
    },
  ];

  const orgMap: Record<string, string> = {};

  for (const org of orgs) {
    const res = await db.query(
      `INSERT INTO organizations (user_id, org_type, legal_name, license_number, address, city, latitude, longitude, verification_status, eth_address, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (license_number) DO UPDATE SET verification_status = EXCLUDED.verification_status
       RETURNING id, legal_name`,
      [
        org.user_id,
        org.org_type,
        org.legal_name,
        org.license_number,
        org.address,
        org.city,
        org.latitude,
        org.longitude,
        org.verification_status,
        org.eth_address,
        org.verification_status === 'verified' ? userMap['admin@bloodbridge.demo'] : null,
      ]
    );
    orgMap[org.license_number] = res.rows[0].id;
  }

  // 3. Seed Donors
  console.log('[Seed] Inserting donor profiles...');
  const donors = [
    {
      user_id: userMap['donor.alex@bloodbridge.demo'],
      blood_group: 'O-',
      gender: 'Male',
      date_of_birth: '1995-04-12',
      weight_kg: 74.5,
      last_donation_date: '2026-05-10',
      is_available: true,
      city: 'New York',
      latitude: 40.758,
      longitude: -73.9855,
      emergency_contact_consent: true,
    },
    {
      user_id: userMap['donor.priya@bloodbridge.demo'],
      blood_group: 'A+',
      gender: 'Female',
      date_of_birth: '1998-09-22',
      weight_kg: 62.0,
      last_donation_date: '2026-06-15',
      is_available: true,
      city: 'New York',
      latitude: 40.7484,
      longitude: -73.9857,
      emergency_contact_consent: true,
    },
    {
      user_id: userMap['donor.carlos@bloodbridge.demo'],
      blood_group: 'B+',
      gender: 'Male',
      date_of_birth: '1992-11-03',
      weight_kg: 81.0,
      last_donation_date: '2026-04-01',
      is_available: true,
      city: 'New York',
      latitude: 40.7614,
      longitude: -73.9776,
      emergency_contact_consent: true,
    },
    {
      user_id: userMap['donor.sarah@bloodbridge.demo'],
      blood_group: 'AB+',
      gender: 'Female',
      date_of_birth: '2001-01-18',
      weight_kg: 58.5,
      last_donation_date: '2026-07-20',
      is_available: true,
      city: 'New York',
      latitude: 40.7505,
      longitude: -73.9934,
      emergency_contact_consent: true,
    },
  ];

  for (const d of donors) {
    await db.query(
      `INSERT INTO donors (user_id, blood_group, gender, date_of_birth, weight_kg, last_donation_date, is_available, emergency_contact_consent, city, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET is_available = EXCLUDED.is_available, blood_group = EXCLUDED.blood_group`,
      [
        d.user_id,
        d.blood_group,
        d.gender,
        d.date_of_birth,
        d.weight_kg,
        d.last_donation_date,
        d.is_available,
        d.emergency_contact_consent,
        d.city,
        d.latitude,
        d.longitude,
      ]
    );
  }

  // 4. Seed Blood Inventories (under verified Red Cross Blood Center)
  console.log('[Seed] Inserting blood inventories...');
  const redCrossId = orgMap['BB-NY-4421'];
  const today = new Date();
  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const inventoryBatches = [
    {
      blood_group: 'O-',
      component_type: 'packed_red_cells',
      units_available: 8,
      units_reserved: 0,
      collection_date: addDays(-7),
      expiry_date: addDays(28),
      batch_number: 'BATCH-PRC-O-NEG-001',
      storage_location: 'Cold Storage Vault A-1',
    },
    {
      blood_group: 'O+',
      component_type: 'packed_red_cells',
      units_available: 15,
      units_reserved: 0,
      collection_date: addDays(-5),
      expiry_date: addDays(30),
      batch_number: 'BATCH-PRC-O-POS-002',
      storage_location: 'Cold Storage Vault A-2',
    },
    {
      blood_group: 'A+',
      component_type: 'packed_red_cells',
      units_available: 12,
      units_reserved: 0,
      collection_date: addDays(-10),
      expiry_date: addDays(25),
      batch_number: 'BATCH-PRC-A-POS-003',
      storage_location: 'Cold Storage Vault A-3',
    },
    {
      blood_group: 'B+',
      component_type: 'packed_red_cells',
      units_available: 6,
      units_reserved: 0,
      collection_date: addDays(-4),
      expiry_date: addDays(31),
      batch_number: 'BATCH-PRC-B-POS-004',
      storage_location: 'Cold Storage Vault B-1',
    },
    {
      blood_group: 'O-',
      component_type: 'whole_blood',
      units_available: 4,
      units_reserved: 0,
      collection_date: addDays(-3),
      expiry_date: addDays(18),
      batch_number: 'BATCH-WB-O-NEG-005',
      storage_location: 'Cold Storage Vault B-2',
    },
    {
      blood_group: 'AB+',
      component_type: 'fresh_frozen_plasma',
      units_available: 10,
      units_reserved: 0,
      collection_date: addDays(-20),
      expiry_date: addDays(160),
      batch_number: 'BATCH-FFP-AB-POS-006',
      storage_location: 'Deep Freeze -40C Vault C-1',
    },
    {
      blood_group: 'A-',
      component_type: 'platelets',
      units_available: 5,
      units_reserved: 0,
      collection_date: addDays(-1),
      expiry_date: addDays(4), // Platelets have 5-day shelf life
      batch_number: 'BATCH-PLT-A-NEG-007',
      storage_location: 'Agitator Unit 1',
    },
  ];

  for (const b of inventoryBatches) {
    const existing = await db.query(
      'SELECT id FROM blood_inventories WHERE batch_number = $1',
      [b.batch_number]
    );
    if (existing.rowCount === 0) {
      await db.query(
        `INSERT INTO blood_inventories (blood_bank_id, blood_group, component_type, units_available, units_reserved, collection_date, expiry_date, batch_number, storage_location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available')`,
        [
          redCrossId,
          b.blood_group,
          b.component_type,
          b.units_available,
          b.units_reserved,
          b.collection_date,
          b.expiry_date,
          b.batch_number,
          b.storage_location,
        ]
      );
    }
  }

  console.log('[Seed] Demo data seeding completed successfully.');
}

if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Seeding failed:', err);
      process.exit(1);
    });
}
