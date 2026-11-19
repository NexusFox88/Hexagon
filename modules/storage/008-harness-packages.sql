CREATE TABLE harness_packages (
  tenant_id text NOT NULL REFERENCES tenants(id),
  id text NOT NULL,
  version text NOT NULL,
  digest text NOT NULL,
  package jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,id,version)
);
