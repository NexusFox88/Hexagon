CREATE TABLE session_inputs (
 tenant_id text NOT NULL, session_id text NOT NULL, path text NOT NULL,
 content bytea NOT NULL, sha256 text NOT NULL, size integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,session_id,path),
 FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id)
);
