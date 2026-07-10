BEGIN;

ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE materials
SET is_active = TRUE
WHERE is_active IS NULL;

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE suppliers
SET is_active = TRUE
WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_materials_active
    ON materials(is_active);

CREATE INDEX IF NOT EXISTS idx_suppliers_active
    ON suppliers(is_active);

COMMIT;
