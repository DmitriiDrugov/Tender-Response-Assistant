-- Optional seed: a starter capability matrix for the industrial / warehouse logistics demo profile.
-- Run manually after migrations if desired. The Capabilities page also offers a "seed from template" button.

insert into capabilities (category, name, description, evidence) values
('Certifications', 'ISO 9001 Quality Management', 'Quality management system certified to ISO 9001:2015 across all operating sites.', 'Cert ID QMS-9001-2024-DE-014, valid through 2027-06-30. Issued by TÜV Süd.'),
('Certifications', 'ISO 14001 Environmental Management', 'Environmental management system certified to ISO 14001:2015.', 'Cert ID EMS-14001-2024-DE-009, valid through 2026-11-12.'),
('Certifications', 'IEC 61508 Functional Safety SIL2', 'Engineering staff certified for IEC 61508 SIL2 system design and verification.', '14 staff certified by TÜV Rheinland (2022 – 2024). Reference projects available on request.'),
('Past projects', 'ASRS deployment, automotive tier-1 supplier', 'Greenfield Automated Storage and Retrieval System, 18,000 pallet positions, throughput 1,200 pallets/hr peak. Commissioned 2023.', 'Project ref ASRS-2023-AUT-04. Acceptance signed off 2023-09-12.'),
('Past projects', 'Shuttle system retrofit, consumer goods DC', 'Brownfield shuttle integration into a live DC, zero downtime cutover across 11 weekends.', 'Project ref SHT-2022-CG-11. Customer reference letter on file.'),
('Past projects', 'AGV fleet, 38 units, pharmaceutical logistics', 'AGV deployment for cleanroom-adjacent pharma operations, GxP-aligned commissioning.', 'Project ref AGV-2024-PH-02. Validation documentation per GAMP 5.'),
('Technical', 'SAP EWM integration', 'In-house competency in SAP Extended Warehouse Management interface design, IDOC + REST channel implementations.', '6 EWM go-lives 2020 – 2024. Solution architect team of 8.'),
('Technical', 'Manhattan SCALE integration', 'Integration experience with Manhattan SCALE WMS, including custom adapter development.', '3 SCALE integration projects, most recent 2024-Q1.'),
('Team & coverage', '24/7 hotline support, DE/AT/CH', 'Multilingual L1/L2 service desk in Stuttgart with on-call escalation to L3 engineering.', 'SLA-backed response times: P1 ≤ 30 min, P2 ≤ 2 hr. Available continuously since 2019.'),
('Team & coverage', 'On-site engineering, Central Europe', 'Field engineering team of 42 deployed across DE/AT/CH/CZ/PL with shared resource pool.', 'Average dispatch-to-site time: 4.5 hours in covered regions.');
