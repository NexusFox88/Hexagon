CREATE TABLE harness_images (
 tenant_id text NOT NULL REFERENCES tenants(id),
 id text NOT NULL,
 version text NOT NULL,
 definition jsonb NOT NULL,
 registry_secret_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,id,version)
);
