-- Migration: Add stories table for discover tab
-- Created: 2026-05-31

-- Create stories table
CREATE TABLE stories (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX stories_author_idx ON stories(author_id);
CREATE INDEX stories_location_idx ON stories(location_id);
CREATE INDEX stories_status_idx ON stories(status);
CREATE INDEX stories_created_at_idx ON stories(created_at);
