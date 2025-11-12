-- Convert all questions from 1-based to 0-based indexing
-- This ensures consistency with the frontend which uses 0-based array indexing

UPDATE question
SET correct_idx = correct_idx - 1
WHERE correct_idx > 0;
