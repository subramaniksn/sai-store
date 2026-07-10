-- Collision-safe Issue/GRN numbering for existing databases.
-- Run this once before deploying the matching backend changes.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS material_issue_number_seq;
CREATE SEQUENCE IF NOT EXISTS grn_number_seq;

DO $$
DECLARE
    max_number BIGINT;
    current_number BIGINT;
    was_called BOOLEAN;
BEGIN
    SELECT COALESCE(
        MAX((SUBSTRING(issue_number FROM '([0-9]+)$'))::BIGINT),
        0
    )
    INTO max_number
    FROM material_issues
    WHERE issue_number ~ '[0-9]+$';

    SELECT last_value, is_called
    INTO current_number, was_called
    FROM material_issue_number_seq;

    PERFORM setval(
        'material_issue_number_seq',
        GREATEST(max_number, current_number, 1),
        was_called OR max_number > 0
    );

    SELECT COALESCE(
        MAX((SUBSTRING(grn_number FROM '([0-9]+)$'))::BIGINT),
        0
    )
    INTO max_number
    FROM goods_receipts
    WHERE grn_number ~ '[0-9]+$';

    SELECT last_value, is_called
    INTO current_number, was_called
    FROM grn_number_seq;

    PERFORM setval(
        'grn_number_seq',
        GREATEST(max_number, current_number, 1),
        was_called OR max_number > 0
    );
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_material_issues_issue_number
ON material_issues(issue_number);

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_goods_receipts_grn_number
ON goods_receipts(grn_number);

COMMIT;
