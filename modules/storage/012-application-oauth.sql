CREATE TABLE application_oauth_clients (
 tenant_id text NOT NULL REFERENCES tenants(id), provider text NOT NULL,
 client_id text NOT NULL, secret_id text NOT NULL, redirect_uri text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,provider)
);
CREATE TABLE application_oauth_flows (
 id text PRIMARY KEY, tenant_id text NOT NULL, connection_id text NOT NULL,
 provider text NOT NULL, connection_version integer NOT NULL,
 state_hash text UNIQUE NOT NULL, verifier_secret_id text NOT NULL,
 client_updated_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending', error_code text,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connections(tenant_id,id)
);
