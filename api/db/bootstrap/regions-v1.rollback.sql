-- Emergency rollback only. Run after proving no business rows reference these IDs.
DELETE FROM `region` WHERE `id` = 'region-cn-shenzhen';
DELETE FROM `region` WHERE `id` = 'region-cn-guangdong';
DELETE FROM `region` WHERE `id` = 'region-cn';
