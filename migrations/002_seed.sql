INSERT OR IGNORE INTO question
(id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash)
VALUES
('00000000-0000-0000-0000-000000000001', 'en', 'general', '1',
 'What is 2 + 2?',
 '["3","4","5","6"]',
 2,
 'seed-2plus2');
