ALTER TABLE api_keys ADD COLUMN id text NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text);
ALTER TABLE api_keys ADD COLUMN role text NOT NULL DEFAULT 'owner' CHECK(role IN ('owner','application'));
ALTER TABLE api_keys ADD COLUMN expires_at timestamptz;
ALTER TABLE api_keys ADD COLUMN last_used_at timestamptz;
CREATE UNIQUE INDEX api_keys_tenant_id ON api_keys(tenant_id,id);
