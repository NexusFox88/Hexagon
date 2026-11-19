ALTER TABLE runs ADD COLUMN origin jsonb NOT NULL DEFAULT '{}';
ALTER TABLE runs ADD COLUMN execution_identity jsonb NOT NULL DEFAULT '{}';
