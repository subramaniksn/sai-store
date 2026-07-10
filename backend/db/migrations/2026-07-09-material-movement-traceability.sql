-- Add auditable issue/return references and collision-safe return numbering.
-- Run this once on an existing SAI_Store PostgreSQL database.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS material_return_number_seq;

DO $$
DECLARE
    max_return_no BIGINT;
    current_sequence_no BIGINT;
    sequence_was_called BOOLEAN;
BEGIN
    SELECT COALESCE(
        MAX((SUBSTRING(return_number FROM '([0-9]+)$'))::BIGINT),
        0
    )
    INTO max_return_no
    FROM material_returns
    WHERE return_number ~ '[0-9]+$';

    SELECT last_value, is_called
    INTO current_sequence_no, sequence_was_called
    FROM material_return_number_seq;

    PERFORM setval(
        'material_return_number_seq',
        GREATEST(max_return_no, current_sequence_no, 1),
        sequence_was_called OR max_return_no > 0
    );
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_material_returns_return_number
ON material_returns(return_number);

ALTER TABLE material_transactions
    ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES material_issues(id),
    ADD COLUMN IF NOT EXISTS return_id INTEGER REFERENCES material_returns(id);

-- Backfill only historical movements that have one unambiguous source document.
WITH issue_matches AS (
    SELECT
        mt.id AS transaction_id,
        MIN(mi.id) AS issue_id
    FROM material_transactions mt
    JOIN material_issue_items mii
        ON mii.material_id = mt.material_id
       AND mii.issued_qty = mt.quantity
    JOIN material_issues mi
        ON mi.id = mii.issue_id
       AND mi.issue_date = mt.txn_date
    WHERE mt.txn_type = 'outgoing'
      AND mt.issue_id IS NULL
    GROUP BY mt.id
    HAVING COUNT(DISTINCT mi.id) = 1
)
UPDATE material_transactions mt
SET issue_id = issue_matches.issue_id
FROM issue_matches
WHERE mt.id = issue_matches.transaction_id;

WITH return_matches AS (
    SELECT
        mt.id AS transaction_id,
        MIN(mr.id) AS return_id,
        MIN(mr.issue_id) AS issue_id
    FROM material_transactions mt
    JOIN material_return_items mri
        ON mri.material_id = mt.material_id
       AND mri.returned_qty = mt.quantity
    JOIN material_returns mr
        ON mr.id = mri.return_id
       AND mr.return_date = mt.txn_date
    WHERE mt.txn_type = 'return'
      AND mt.return_id IS NULL
    GROUP BY mt.id
    HAVING COUNT(DISTINCT mr.id) = 1
)
UPDATE material_transactions mt
SET
    return_id = return_matches.return_id,
    issue_id = return_matches.issue_id
FROM return_matches
WHERE mt.id = return_matches.transaction_id;

CREATE INDEX IF NOT EXISTS
    idx_material_transactions_issue
ON material_transactions(issue_id);

CREATE INDEX IF NOT EXISTS
    idx_material_transactions_return
ON material_transactions(return_id);

COMMIT;
