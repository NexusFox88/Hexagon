CREATE TABLE managed_secrets (
 tenant_id text NOT NULL REFERENCES tenants(id), id text NOT NULL, name text NOT NULL,
 secret_id text NOT NULL, version integer NOT NULL DEFAULT 1, enabled boolean NOT NULL DEFAULT true,
 deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id), FOREIGN KEY(tenant_id,secret_id) REFERENCES secrets(tenant_id,id)
);
ALTER TABLE connections DROP CONSTRAINT connections_kind_check;
ALTER TABLE connections ADD CHECK(kind IN ('sandbox','tool','model','http'));
ALTER TABLE connections ADD COLUMN managed_secret_id text;
ALTER TABLE connections ADD FOREIGN KEY(tenant_id,managed_secret_id) REFERENCES managed_secrets(tenant_id,id);
CREATE TABLE session_connections (
 tenant_id text NOT NULL, session_id text NOT NULL, name text NOT NULL, connection_id text NOT NULL,
 PRIMARY KEY(tenant_id,session_id,name), FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connections(tenant_id,id)
);
CREATE TABLE access_grants (
 tenant_id text NOT NULL, id text NOT NULL, session_id text NOT NULL, connection_id text NOT NULL,
 run_id text, connection_version integer NOT NULL, token_hash text NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id), UNIQUE(id), FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connections(tenant_id,id)
);
