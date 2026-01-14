-- Remove test hymns 1-10 that are not actual template items
-- These were added during initial development but should not be available as template options

DELETE FROM procedural_item_types
WHERE id IN (
    'hymn_001',
    'hymn_002',
    'hymn_003',
    'hymn_004',
    'hymn_005',
    'hymn_006',
    'hymn_007',
    'hymn_008',
    'hymn_009',
    'hymn_010'
);
