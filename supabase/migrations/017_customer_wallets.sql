-- Allow customer wallets
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_owner_type_check;
ALTER TABLE wallets ADD CONSTRAINT wallets_owner_type_check
  CHECK (owner_type IN ('MERCHANT', 'RIDER', 'PLATFORM', 'CUSTOMER'));
