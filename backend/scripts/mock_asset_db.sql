-- Mock asset database schema and seed data
-- Run this script against schematic_mock_asset_db in pgAdmin4

CREATE TABLE IF NOT EXISTS asset_information (
    asset_record_id VARCHAR(64) PRIMARY KEY,
    fitting_position VARCHAR(64) NOT NULL,
    high_level_component VARCHAR(200),
    sub_system_name VARCHAR(200),
    sub_component_name VARCHAR(200)
);

-- Seed data: mock asset records linked to fitting position labels
INSERT INTO asset_information (asset_record_id, fitting_position, high_level_component, sub_system_name, sub_component_name)
VALUES
    ('ASSET-001', 'FP-PUMP-01-INLET',   'Cooling System', 'Primary Cooling Loop', 'Inlet Pump Assembly'),
    ('ASSET-002', 'FP-PUMP-01-OUTLET',  'Cooling System', 'Primary Cooling Loop', 'Outlet Pump Assembly'),
    ('ASSET-003', 'FP-VALVE-01-A',      'Cooling System', 'Flow Control',         'Isolation Valve A'),
    ('ASSET-004', 'FP-VALVE-01-B',      'Cooling System', 'Flow Control',         'Isolation Valve B'),
    ('ASSET-005', 'FP-SENSOR-TEMP-01',  'Cooling System', 'Instrumentation',      'Temperature Sensor 01'),
    ('ASSET-006', 'FP-SENSOR-PRES-01',  'Cooling System', 'Instrumentation',      'Pressure Sensor 01'),
    ('ASSET-007', 'FP-FILTER-01',       'Cooling System', 'Filtration',           'Primary Filter Unit'),
    ('ASSET-008', 'FP-HEAT-EX-01',      'Cooling System', 'Heat Exchange',        'Heat Exchanger 01')
ON CONFLICT (asset_record_id) DO NOTHING;
