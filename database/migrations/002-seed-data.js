/**
 * Seed data migration
 * Populates nomenclature tables with essential lookup data
 */

async function up(db) {
  // Seed priorities
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, sort_order) VALUES
    ('priority', 'critical', 'Critical', 'Requires immediate attention', 1),
    ('priority', 'high', 'High', 'Urgent attention required', 2),
    ('priority', 'medium', 'Medium', 'Normal priority', 3),
    ('priority', 'low', 'Low', 'Can be addressed later', 4);
  `);

  // Seed request types
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, sort_order, metadata) VALUES
    ('request_type', 'water_supply', 'Water Supply', 'Issues related to water supply services', 1, '{"response_time_hours": 24, "escalation_hours": 48}'),
    ('request_type', 'sewerage', 'Sewerage', 'Sewer system and drainage issues', 2, '{"response_time_hours": 12, "escalation_hours": 24}'),
    ('request_type', 'street_lighting', 'Street Lighting', 'Street light maintenance and outages', 3, '{"response_time_hours": 48, "escalation_hours": 72}'),
    ('request_type', 'road_maintenance', 'Road Maintenance', 'Potholes, road damage, and maintenance', 4, '{"response_time_hours": 72, "escalation_hours": 120}'),
    ('request_type', 'waste_management', 'Waste Management', 'Garbage collection and waste disposal', 5, '{"response_time_hours": 24, "escalation_hours": 48}'),
    ('request_type', 'public_transport', 'Public Transport', 'Bus stops, shelters, and transport issues', 6, '{"response_time_hours": 48, "escalation_hours": 96}'),
    ('request_type', 'parks_recreation', 'Parks & Recreation', 'Parks, playgrounds, and recreational facilities', 7, '{"response_time_hours": 72, "escalation_hours": 120}'),
    ('request_type', 'noise_control', 'Noise Control', 'Noise complaints and violations', 8, '{"response_time_hours": 24, "escalation_hours": 48}'),
    ('request_type', 'building_permits', 'Building Permits', 'Construction permits and inspections', 9, '{"response_time_hours": 120, "escalation_hours": 240}'),
    ('request_type', 'public_health', 'Public Health', 'Health inspections and public safety', 10, '{"response_time_hours": 24, "escalation_hours": 48}');
  `);

  // Seed request topics
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, parent_id, sort_order) VALUES
    -- Water Supply topics
    ('topic', 'water_leak', 'Water Leak', 'Report water leaks and pipe bursts', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'water_supply'), 1),
    ('topic', 'water_pressure', 'Water Pressure Issues', 'Low or high water pressure problems', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'water_supply'), 2),
    ('topic', 'water_quality', 'Water Quality', 'Water discoloration, taste, or odor issues', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'water_supply'), 3),
    ('topic', 'water_meter', 'Water Meter Issues', 'Meter installation, repair, or reading problems', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'water_supply'), 4),
    
    -- Sewerage topics
    ('topic', 'sewer_blockage', 'Sewer Blockage', 'Blocked sewer lines and drains', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'sewerage'), 1),
    ('topic', 'sewer_overflow', 'Sewer Overflow', 'Sewage backup and overflow issues', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'sewerage'), 2),
    ('topic', 'drainage', 'Drainage Issues', 'Storm drainage problems', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'sewerage'), 3),
    
    -- Street Lighting topics
    ('topic', 'light_outage', 'Light Outage', 'Street light not working', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'street_lighting'), 1),
    ('topic', 'light_flicker', 'Flickering Light', 'Street light flickering or intermittent', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'street_lighting'), 2),
    ('topic', 'light_damage', 'Light Damage', 'Damaged or broken street lights', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'street_lighting'), 3),
    ('topic', 'new_light', 'New Light Installation', 'Request for new street light installation', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'street_lighting'), 4),
    
    -- Road Maintenance topics
    ('topic', 'pothole', 'Pothole Repair', 'Potholes and road surface damage', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'road_maintenance'), 1),
    ('topic', 'road_damage', 'Road Damage', 'Major road damage and deterioration', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'road_maintenance'), 2),
    ('topic', 'sidewalk', 'Sidewalk Issues', 'Sidewalk repair and maintenance', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'road_maintenance'), 3),
    ('topic', 'traffic_signs', 'Traffic Signs', 'Damaged or missing traffic signs', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'road_maintenance'), 4),
    
    -- Waste Management topics
    ('topic', 'garbage_collection', 'Garbage Collection', 'Missed garbage collection', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'waste_management'), 1),
    ('topic', 'recycling', 'Recycling Issues', 'Recycling collection problems', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'waste_management'), 2),
    ('topic', 'bulk_waste', 'Bulk Waste', 'Large item disposal and bulk waste', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'waste_management'), 3),
    ('topic', 'illegal_dumping', 'Illegal Dumping', 'Report illegal waste dumping', 
     (SELECT id FROM nomenclature WHERE type = 'request_type' AND code = 'waste_management'), 4);
  `);

  // Seed intake forms (was receipt_form in Feature)
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, sort_order, metadata) VALUES
    ('intake_form', 'online', 'Online Form', 'Online submission through citizen portal', 1, '{"requires_signature": false, "processing_days": 1}'),
    ('intake_form', 'phone', 'Phone Call', 'Request received via phone call', 2, '{"requires_signature": false, "processing_days": 1}'),
    ('intake_form', 'in_person', 'In-Person', 'Request submitted in person', 3, '{"requires_signature": true, "processing_days": 1}'),
    ('intake_form', 'email', 'Email', 'Request received via email', 4, '{"requires_signature": false, "processing_days": 2}'),
    ('intake_form', 'mobile_app', 'Mobile Application', 'Request submitted through mobile app', 5, '{"requires_signature": false, "processing_days": 1}');
  `);

  // Seed social groups (Phase 3)
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, sort_order) VALUES
    ('social_group', 'families', 'Families with Children', 'Households with children', 1),
    ('social_group', 'elderly', 'Elderly Residents', 'Senior citizens', 2),
    ('social_group', 'disabled', 'Persons with Disabilities', 'Residents with disabilities', 3),
    ('social_group', 'low_income', 'Low-Income Residents', 'Residents receiving social assistance', 4);
  `);

  // Seed executors (departments/roles)
  await db.exec(`
    INSERT INTO nomenclature (type, code, name, description, sort_order, metadata) VALUES
    ('executor', 'water_dept', 'Water Supply Department', 'Handles water supply and sewerage issues', 1, '{"email": "water@city.gov", "phone": "+12345678901", "response_time_hours": 24}'),
    ('executor', 'roads_dept', 'Road Maintenance Department', 'Manages road maintenance and street lighting', 2, '{"email": "roads@city.gov", "phone": "+12345678902", "response_time_hours": 72}'),
    ('executor', 'waste_dept', 'Waste Management Department', 'Handles garbage collection and waste disposal', 3, '{"email": "waste@city.gov", "phone": "+12345678903", "response_time_hours": 24}'),
    ('executor', 'transport_dept', 'Transport Department', 'Manages public transport and traffic', 4, '{"email": "transport@city.gov", "phone": "+12345678904", "response_time_hours": 48}'),
    ('executor', 'parks_dept', 'Parks Department', 'Maintains parks and recreational facilities', 5, '{"email": "parks@city.gov", "phone": "+12345678905", "response_time_hours": 72}'),
    ('executor', 'health_dept', 'Public Health Department', 'Handles public health and safety issues', 6, '{"email": "health@city.gov", "phone": "+12345678906", "response_time_hours": 24}'),
    ('executor', 'building_dept', 'Building Department', 'Manages building permits and inspections', 7, '{"email": "building@city.gov", "phone": "+12345678907", "response_time_hours": 120}'),
    ('executor', 'admin_office', 'Administrative Office', 'General administrative tasks and coordination', 8, '{"email": "admin@city.gov", "phone": "+12345678908", "response_time_hours": 48}');
  `);

  // Create default admin user (password: admin123)
  const bcrypt = require('bcrypt');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  
  await db.exec(`
    INSERT INTO users (username, email, password_hash, full_name, name, role, department, position, status) VALUES
    ('admin', 'admin@city.gov', '${adminPasswordHash}', 'System Administrator', 'System Administrator', 'admin', 'IT', 'System Administrator', 'active'),
    ('water_manager', 'water.manager@city.gov', '${adminPasswordHash}', 'Water Department Manager', 'Water Department Manager', 'executor', 'Water Supply Department', 'Department Manager', 'active'),
    ('roads_manager', 'roads.manager@city.gov', '${adminPasswordHash}', 'Roads Department Manager', 'Roads Department Manager', 'executor', 'Road Maintenance Department', 'Department Manager', 'active'),
    ('clerk', 'clerk@city.gov', '${adminPasswordHash}', 'Office Clerk', 'Office Clerk', 'operator', 'Administrative Office', 'Clerk', 'active');
  `);
}

async function down(db) {
  // Delete seed data in reverse order
  await db.exec('DELETE FROM users WHERE username IN ("admin", "water_manager", "roads_manager", "clerk")');
  await db.exec('DELETE FROM nomenclature WHERE type IN ("priority", "request_type", "topic", "intake_form", "social_group", "executor")');
}

module.exports = { up, down };
