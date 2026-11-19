ALTER TABLE agents ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE agents ADD COLUMN archived_at timestamptz;
ALTER TABLE agents ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE agent_revisions (
 tenant_id text NOT NULL,id text NOT NULL,revision integer NOT NULL,
 name text NOT NULL,definition jsonb NOT NULL,env_secret_id text,env_names jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,id,revision),
 FOREIGN KEY(tenant_id,id) REFERENCES agents(tenant_id,id) ON DELETE CASCADE
);
INSERT INTO agent_revisions(tenant_id,id,revision,name,definition,env_secret_id,env_names,created_at)
 SELECT tenant_id,id,revision,name,definition,env_secret_id,env_names,created_at FROM agents;
ALTER TABLE sessions ADD COLUMN agent_revision integer NOT NULL DEFAULT 1;
