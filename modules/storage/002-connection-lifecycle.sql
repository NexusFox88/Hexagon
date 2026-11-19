ALTER TABLE connections ADD COLUMN deleted_at timestamptz;
CREATE TABLE session_tools (
 tenant_id text NOT NULL, session_id text NOT NULL, name text NOT NULL, connection_id text NOT NULL,
 PRIMARY KEY(tenant_id,session_id,name),
 FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id),
 FOREIGN KEY(tenant_id,connection_id) REFERENCES connections(tenant_id,id)
);
