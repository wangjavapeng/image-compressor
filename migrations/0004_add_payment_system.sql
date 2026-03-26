-- 给 user_points 表添加无限会员标记
ALTER TABLE user_points ADD COLUMN is_unlimited INTEGER NOT NULL DEFAULT 0;

-- 支付记录表
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  paypal_order_id TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
