-- 匿名用户免费使用记录表
CREATE TABLE IF NOT EXISTS anonymous_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_anonymous_usage_device_id ON anonymous_usage(device_id);
