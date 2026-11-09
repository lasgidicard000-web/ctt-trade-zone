# Architecture Rules

- Keep Field Marshal TRON gas funds in a per-member balance with an append-only ledger; change balances only through security-definer database functions so withdrawal reservations and refunds stay atomic and auditable.