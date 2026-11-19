ALTER TABLE agents ADD COLUMN env_secret_id text;
ALTER TABLE agents ADD COLUMN env_names jsonb NOT NULL DEFAULT '[]';
ALTER TABLE agents ADD FOREIGN KEY (tenant_id,env_secret_id) REFERENCES secrets(tenant_id,id);
ALTER TABLE sessions ADD COLUMN env_secret_id text;
ALTER TABLE sessions ADD COLUMN env_names jsonb NOT NULL DEFAULT '[]';
ALTER TABLE sessions ADD FOREIGN KEY (tenant_id,env_secret_id) REFERENCES secrets(tenant_id,id);
