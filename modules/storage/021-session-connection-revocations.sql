CREATE TABLE session_connection_revocations (
 tenant_id text NOT NULL, session_id text NOT NULL, connection_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,session_id,connection_id),
 FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connections(tenant_id,id)
);
