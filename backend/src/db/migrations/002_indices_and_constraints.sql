-- 002_indices_and_constraints.sql
-- Indexes and performance optimizations

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(verification_status);
CREATE INDEX IF NOT EXISTS idx_organizations_city ON organizations(city);

CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_available ON donors(is_available);
CREATE INDEX IF NOT EXISTS idx_donors_city ON donors(city);

CREATE INDEX IF NOT EXISTS idx_inventory_blood_bank ON blood_inventories(blood_bank_id);
CREATE INDEX IF NOT EXISTS idx_inventory_group_component ON blood_inventories(blood_group, component_type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON blood_inventories(status);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON blood_inventories(expiry_date);

CREATE INDEX IF NOT EXISTS idx_requests_hospital ON blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_urgency ON blood_requests(urgency_level);

CREATE INDEX IF NOT EXISTS idx_matches_request ON request_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_target ON request_matches(target_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_rule ON security_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_actor ON security_alerts(actor_id);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_status ON blockchain_transactions(status);
