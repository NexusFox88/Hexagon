-- A rotating refresh token must not be replayed after response loss or a process crash.
CREATE TABLE application_oauth_refresh_attempts (
 tenant_id text NOT NULL, connection_id text NOT NULL, secret_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('started','completed','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,connection_id,secret_id)
);
