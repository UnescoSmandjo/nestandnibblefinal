CREATE TABLE IF NOT EXISTS docs (
  path       TEXT PRIMARY KEY,           -- contoh: orders/abc123, stock/2026-11-06, cfg/main
  col        TEXT NOT NULL,              -- orders | att | stock | day | cfg
  dkey       TEXT NOT NULL DEFAULT '',   -- tanggal (YYYY-MM-DD) untuk filter
  body       TEXT NOT NULL,              -- isi dokumen (JSON)
  u          INTEGER NOT NULL DEFAULT 0, -- versi dari aplikasi (last-writer-wins)
  updated_at INTEGER NOT NULL,           -- waktu server (ms)
  deleted    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_docs_col_upd  ON docs(col, updated_at);
CREATE INDEX IF NOT EXISTS idx_docs_upd      ON docs(updated_at);
CREATE INDEX IF NOT EXISTS idx_docs_col_dkey ON docs(col, dkey);
