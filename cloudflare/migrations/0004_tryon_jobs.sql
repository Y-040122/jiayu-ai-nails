CREATE TABLE IF NOT EXISTS tryon_jobs(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,status TEXT NOT NULL,input TEXT,result TEXT,error TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS tryon_jobs_owner ON tryon_jobs(owner_id,created_at);
