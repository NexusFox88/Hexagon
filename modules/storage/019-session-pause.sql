ALTER TABLE sessions ADD COLUMN pause_scope text CHECK (pause_scope IN ('session','sandbox'));
CREATE TABLE session_lifecycle_events(
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL, session_id text NOT NULL, type text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,session_id) REFERENCES sessions(tenant_id,id)
);
CREATE INDEX runs_activity ON runs(tenant_id,created_at,updated_at);
