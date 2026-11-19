CREATE TABLE preview_grants (
 id text PRIMARY KEY, tenant_id text NOT NULL, session_id text NOT NULL,
 port integer NOT NULL CHECK(port BETWEEN 3000 AND 8999 AND port<>8765),
 token_digest text NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id)
);
