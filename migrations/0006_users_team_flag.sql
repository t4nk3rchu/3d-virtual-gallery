-- Migration 0006: mark internal team members (get the "Shared with me" picker tab)
ALTER TABLE users ADD COLUMN is_team_member INTEGER NOT NULL DEFAULT 0;
