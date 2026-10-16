-- tblUsers: unique id, name, email, position, group
CREATE TABLE IF NOT EXISTS "tblUsers" (
    "id"         SERIAL PRIMARY KEY,
    "name"       VARCHAR(255) NOT NULL,
    "email"      VARCHAR(255) NOT NULL UNIQUE,
    "position"   VARCHAR(100),
    "group"      VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tblUserWinner: timestamp, name, email, group, position
CREATE TABLE IF NOT EXISTS "tblUserWinner" (
    "id"         SERIAL PRIMARY KEY,
    "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "name"       VARCHAR(255) NOT NULL,
    "email"      VARCHAR(255) NOT NULL,
    "group"      VARCHAR(100),
    "position"   VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_tbluserwinner_email ON "tblUserWinner" ("email");
