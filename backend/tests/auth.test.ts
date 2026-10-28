import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app';
import { userRepository } from '../src/repositories/user.repository';
import { organizationRepository } from '../src/repositories/organization.repository';
import { donorRepository } from '../src/repositories/donor.repository';

const app = createApp();

describe('Authentication & Registration System', () => {
  // 1. Existing Demo Credentials
  it('should successfully log in with demo admin credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@bloodbridge.demo',
      password: 'AdminPassword123!',
    });

    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a('string');
    expect(res.body.user.role).to.equal('admin');
    expect(res.body.user.email).to.equal('admin@bloodbridge.demo');
    expect(res.body.user.password_hash).to.be.undefined;
  });

  it('should reject login with incorrect password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@bloodbridge.demo',
      password: 'WrongPassword!',
    });

    expect(res.status).to.equal(401);
    expect(res.body.message).to.equal('Incorrect email or password.');
  });

  // 2. Role 1: Blood Donor Registration & Login
  it('should register a new blood donor with valid details and Indian phone', async () => {
    const email = `donor.test.${Date.now()}@bloodbridge.demo`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecureDonorPassword123!',
      role: 'donor',
      full_name: 'Priya Sharma',
      phone: '+91 9876543210',
      blood_group: 'O-',
      city: 'Mumbai',
      emergency_contact_consent: true,
    });

    expect(res.status).to.equal(201);
    expect(res.body.token).to.be.a('string');
    expect(res.body.user.email).to.equal(email);
    expect(res.body.user.role).to.equal('donor');
    expect(res.body.user.password_hash).to.be.undefined;

    // Verify stored password in database is a bcrypt hash (starts with $2)
    const userInDb = await userRepository.findByEmail(email);
    expect(userInDb).to.be.not.null;
    expect(userInDb!.password_hash).to.match(/^\$2[aby]\$/);
    expect(userInDb!.password_hash).to.not.equal('SecureDonorPassword123!');

    // Verify donor profile created
    const profile = await donorRepository.findByUserId(userInDb!.id);
    expect(profile).to.be.not.null;
    expect(profile!.blood_group).to.equal('O-');
    expect(profile!.city).to.equal('Mumbai');

    // Verify login with newly registered donor
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'SecureDonorPassword123!',
    });
    expect(loginRes.status).to.equal(200);
    expect(loginRes.body.user.role).to.equal('donor');
  });

  // 3. Role 2: Hospital Registration
  it('should register a new hospital in pending verification state', async () => {
    const email = `hospital.reg.${Date.now()}@metrocare.demo`;
    const licenseNumber = `HOSP-REG-${Date.now()}`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'HospitalPassword123!',
      role: 'hospital',
      full_name: 'Dr. Anita Desai',
      phone: '+91-22-26543210',
      legal_name: 'Metro Care Super Specialty Hospital',
      license_number: licenseNumber,
      address: '74 Healthcare Avenue, Bandra West',
      city: 'Mumbai',
    });

    expect(res.status).to.equal(201);
    expect(res.body.user.role).to.equal('hospital');

    // Verify organization created with pending status
    const org = await organizationRepository.findByLicense(licenseNumber);
    expect(org).to.be.not.null;
    expect(org!.verification_status).to.equal('pending');
    expect(org!.legal_name).to.equal('Metro Care Super Specialty Hospital');

    // Verify login and /me endpoint
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'HospitalPassword123!',
    });
    expect(loginRes.status).to.equal(200);

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).to.equal(200);
    expect(meRes.body.organization.verification_status).to.equal('pending');
  });

  // 4. Role 3: Blood Bank Registration
  it('should register a new blood bank in pending verification state', async () => {
    const email = `bloodbank.reg.${Date.now()}@lifeline.demo`;
    const licenseNumber = `BB-REG-${Date.now()}`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'BloodBankPassword123!',
      role: 'blood_bank',
      full_name: 'Rajesh Kulkarni',
      phone: '02228495000',
      legal_name: 'LifeLine Regional Blood Storage Center',
      license_number: licenseNumber,
      address: '12 Red Cross Road',
      city: 'Pune',
    });

    expect(res.status).to.equal(201);
    expect(res.body.user.role).to.equal('blood_bank');

    const org = await organizationRepository.findByLicense(licenseNumber);
    expect(org).to.be.not.null;
    expect(org!.verification_status).to.equal('pending');
  });

  // 5. Role 4: Volunteer / NGO Registration
  it('should register a new volunteer / NGO coordinator', async () => {
    const email = `volunteer.reg.${Date.now()}@rotary.demo`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'VolunteerPass123!',
      role: 'volunteer',
      full_name: 'Kavita Menon',
      phone: '+91 9988776655',
      legal_name: 'Rotary Youth Blood Club',
      city: 'Bengaluru',
    });

    expect(res.status).to.equal(201);
    expect(res.body.user.role).to.equal('volunteer');
    expect(res.body.user.full_name).to.equal('Kavita Menon');
  });

  // 6. Role 5: System Administrator Self-Registration Must Fail (403)
  it('should prevent self-elevation to admin role with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `hacker.${Date.now()}@evil.demo`,
      password: 'Password123!',
      role: 'admin',
      full_name: 'Attacker Admin',
    });

    expect(res.status).to.equal(403);
    expect(res.body.message).to.equal(
      'System administrator accounts cannot be self-registered.'
    );
  });

  // 7. Duplicate Email Conflict (409)
  it('should return 409 Conflict when registering with an existing email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'admin@bloodbridge.demo',
      password: 'NewPassword123!',
      role: 'donor',
      full_name: 'Duplicate User',
      blood_group: 'A+',
      city: 'Delhi',
    });

    expect(res.status).to.equal(409);
    expect(res.body.message).to.equal(
      'An account with this email already exists. Please sign in or use another email.'
    );
  });

  // 8. Field Validations: Missing Name, Invalid Email, Short Password, Invalid Blood Group
  it('should reject registration when full name is missing with clear message', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `noname.${Date.now()}@test.demo`,
      password: 'Password123!',
      role: 'donor',
      full_name: '',
      blood_group: 'O+',
      city: 'Delhi',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('full legal name');
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      role: 'donor',
      full_name: 'Valid Name',
      blood_group: 'O+',
      city: 'Delhi',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Enter a valid email address.');
  });

  it('should reject registration with password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `shortpass.${Date.now()}@test.demo`,
      password: '123',
      role: 'donor',
      full_name: 'Valid Name',
      blood_group: 'O+',
      city: 'Delhi',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('8 characters');
  });

  it('should reject registration with invalid phone format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `badphone.${Date.now()}@test.demo`,
      password: 'Password123!',
      role: 'donor',
      full_name: 'Valid Name',
      phone: '1234', // Too short
      blood_group: 'O+',
      city: 'Delhi',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('valid phone number');
  });

  it('should reject donor registration when blood group is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `badgroup.${Date.now()}@test.demo`,
      password: 'Password123!',
      role: 'donor',
      full_name: 'Valid Name',
      blood_group: 'X_INVALID',
      city: 'Delhi',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('blood group');
  });

  // 9. Legacy / CamelCase payload resilience
  it('should gracefully handle camelCase and nested donorProfile payloads', async () => {
    const email = `camel.${Date.now()}@bloodbridge.demo`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'CamelPassword123!',
      role: 'donor',
      fullName: 'CamelCase Donor',
      donorProfile: {
        bloodGroup: 'B+',
        city: 'Jaipur',
        emergencyContactConsent: true,
      },
    });

    expect(res.status).to.equal(201);
    expect(res.body.user.full_name).to.equal('CamelCase Donor');
  });
});
