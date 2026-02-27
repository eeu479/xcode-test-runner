-- Per-target pass/fail for a run (scheme or package key -> success).
ALTER TABLE test_runs ADD COLUMN target_results TEXT;
