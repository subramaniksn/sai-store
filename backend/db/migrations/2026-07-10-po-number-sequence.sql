BEGIN;

CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq;

SELECT setval(
    'purchase_order_number_seq',
    GREATEST(
        COALESCE((
            SELECT MAX((regexp_match(po_number, '([0-9]+)$'))[1]::INTEGER)
            FROM purchase_orders
            WHERE po_number ~ '[0-9]+$'
        ), 0),
        0
    ) + 1,
    FALSE
);

COMMIT;
