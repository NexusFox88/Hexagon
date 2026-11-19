CREATE TABLE tool_calls (
 tenant_id text NOT NULL, run_id text NOT NULL, id text NOT NULL,
 binding text NOT NULL, operation text NOT NULL, arguments jsonb NOT NULL,
 request_hash text NOT NULL, state text NOT NULL DEFAULT 'pending',
 connection_version integer, approval_id text, result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id,id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES runs(tenant_id,id),
 FOREIGN KEY(tenant_id,approval_id) REFERENCES approvals(tenant_id,id)
);
