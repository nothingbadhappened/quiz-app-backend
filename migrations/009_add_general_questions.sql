-- Add general category questions across all difficulty levels
-- NOTE: correct_idx uses 0-based indexing (0, 1, 2, 3 for 4 options)
-- This was migrated from 1-based in migration 010

-- Difficulty 2
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
('gen-2-001', 'en', 'general', '2', 'How many continents are there?', '["5", "6", "7", "8"]', 3, 'en:general:how many continents are there', '[]', '[]', 'global', 1),
('gen-2-002', 'en', 'general', '2', 'What is the capital of France?', '["London", "Berlin", "Paris", "Madrid"]', 3, 'en:general:what is the capital of france', '[]', '[]', 'global', 1),
('gen-2-003', 'en', 'general', '2', 'How many legs does a spider have?', '["6", "8", "10", "12"]', 2, 'en:general:how many legs does a spider have', '[]', '[]', 'global', 1),
('gen-2-004', 'en', 'general', '2', 'What is the largest ocean on Earth?', '["Atlantic", "Pacific", "Indian", "Arctic"]', 2, 'en:general:what is the largest ocean on earth', '[]', '[]', 'global', 1),
('gen-2-005', 'en', 'general', '2', 'How many hours are in a day?', '["12", "24", "36", "48"]', 2, 'en:general:how many hours are in a day', '[]', '[]', 'global', 1);

-- Difficulty 3
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
('gen-3-001', 'en', 'general', '3', 'What is the smallest prime number?', '["0", "1", "2", "3"]', 3, 'en:general:what is the smallest prime number', '[]', '[]', 'global', 1),
('gen-3-002', 'en', 'general', '3', 'What is the chemical symbol for gold?', '["Go", "Gd", "Au", "Ag"]', 3, 'en:general:what is the chemical symbol for gold', '[]', '[]', 'global', 1),
('gen-3-003', 'en', 'general', '3', 'Who wrote "Romeo and Juliet"?', '["Charles Dickens", "Mark Twain", "William Shakespeare", "Jane Austen"]', 3, 'en:general:who wrote romeo and juliet', '[]', '[]', 'global', 1),
('gen-3-004', 'en', 'general', '3', 'What is the speed of light approximately?', '["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"]', 1, 'en:general:what is the speed of light approximately', '[]', '[]', 'global', 1),
('gen-3-005', 'en', 'general', '3', 'In which year did World War II end?', '["1943", "1944", "1945", "1946"]', 3, 'en:general:in which year did world war ii end', '[]', '[]', 'global', 1);

-- Difficulty 4
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
('gen-4-001', 'en', 'general', '4', 'What is the longest river in the world?', '["Amazon", "Nile", "Mississippi", "Yangtze"]', 2, 'en:general:what is the longest river in the world', '[]', '[]', 'global', 1),
('gen-4-002', 'en', 'general', '4', 'What is the formula for the area of a circle?', '["πr", "πr²", "2πr", "πd"]', 2, 'en:general:what is the formula for the area of a circle', '[]', '[]', 'global', 1),
('gen-4-003', 'en', 'general', '4', 'Who painted the Mona Lisa?', '["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"]', 2, 'en:general:who painted the mona lisa', '[]', '[]', 'global', 1),
('gen-4-004', 'en', 'general', '4', 'What is the smallest country in the world?', '["Monaco", "Vatican City", "San Marino", "Liechtenstein"]', 2, 'en:general:what is the smallest country in the world', '[]', '[]', 'global', 1),
('gen-4-005', 'en', 'general', '4', 'How many elements are in the periodic table?', '["92", "108", "118", "126"]', 3, 'en:general:how many elements are in the periodic table', '[]', '[]', 'global', 1);

-- Difficulty 5
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
('gen-5-001', 'en', 'general', '5', 'What is the capital of Australia?', '["Sydney", "Melbourne", "Canberra", "Brisbane"]', 3, 'en:general:what is the capital of australia', '[]', '[]', 'global', 1),
('gen-5-002', 'en', 'general', '5', 'What is the Fibonacci sequence starting number?', '["0", "1", "0 and 1", "1 and 1"]', 3, 'en:general:what is the fibonacci sequence starting number', '[]', '[]', 'global', 1),
('gen-5-003', 'en', 'general', '5', 'Who developed the theory of general relativity?', '["Isaac Newton", "Niels Bohr", "Albert Einstein", "Stephen Hawking"]', 3, 'en:general:who developed the theory of general relativity', '[]', '[]', 'global', 1),
('gen-5-004', 'en', 'general', '5', 'What is the pH of pure water?', '["5", "6", "7", "8"]', 3, 'en:general:what is the ph of pure water', '[]', '[]', 'global', 1),
('gen-5-005', 'en', 'general', '5', 'In which year did the Titanic sink?', '["1910", "1911", "1912", "1913"]', 3, 'en:general:in which year did the titanic sink', '[]', '[]', 'global', 1);

-- Difficulty 6
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
('gen-6-001', 'en', 'general', '6', 'What is the half-life of Carbon-14?', '["5,730 years", "11,460 years", "2,865 years", "1,000 years"]', 1, 'en:general:what is the half life of carbon 14', '[]', '[]', 'global', 1),
('gen-6-002', 'en', 'general', '6', 'Who proved Fermat''s Last Theorem?', '["Pierre de Fermat", "Andrew Wiles", "Leonhard Euler", "Carl Friedrich Gauss"]', 2, 'en:general:who proved fermats last theorem', '[]', '[]', 'global', 1),
('gen-6-003', 'en', 'general', '6', 'What is the most abundant element in the universe?', '["Oxygen", "Hydrogen", "Helium", "Carbon"]', 2, 'en:general:what is the most abundant element in the universe', '[]', '[]', 'global', 1),
('gen-6-004', 'en', 'general', '6', 'What is Avogadro''s number approximately?', '["6.02 × 10²³", "3.14 × 10²³", "9.81 × 10²³", "1.60 × 10²³"]', 1, 'en:general:what is avogadros number approximately', '[]', '[]', 'global', 1),
('gen-6-005', 'en', 'general', '6', 'In what year was quantum mechanics formulated?', '["1900", "1915", "1925", "1935"]', 3, 'en:general:in what year was quantum mechanics formulated', '[]', '[]', 'global', 1);
