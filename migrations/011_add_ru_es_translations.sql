-- Add Russian (ru) and Spanish (es) translations for all questions
-- NOTE: correct_idx remains the same across all languages (0-based indexing)

-- Russian translations for GENERAL questions (original seed)
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash) VALUES
-- GENERAL (easy)
('11111111-1111-4111-8111-111111111101-ru','ru','general','1','Сколько будет 2 + 2?','["3","4","5","6"]',1,'ru:general:1:2+2'),
('11111111-1111-4111-8111-111111111102-ru','ru','general','1','Какого цвета небо в ясный день?','["Синее","Зелёное","Красное","Жёлтое"]',0,'ru:general:1:sky-color'),
('11111111-1111-4111-8111-111111111103-ru','ru','general','1','Какой день идёт после понедельника?','["Вторник","Пятница","Воскресенье","Суббота"]',0,'ru:general:1:after-monday'),
('11111111-1111-4111-8111-111111111104-ru','ru','general','1','Сколько дней в неделе?','["5","6","7","8"]',2,'ru:general:1:days-week'),
('11111111-1111-4111-8111-111111111105-ru','ru','general','1','Что из этого фрукт?','["Морковь","Картофель","Яблоко","Лук"]',2,'ru:general:1:is-fruit'),

-- SCIENCE
('22222222-2222-4222-8222-222222222201-ru','ru','science','2','При какой температуре замерзает вода (°C)?','["0","32","100","-10"]',0,'ru:science:2:freeze-c'),
('22222222-2222-4222-8222-222222222202-ru','ru','science','2','Каким газом в основном дышат люди?','["Кислород","Азот","Углекислый газ","Водород"]',1,'ru:science:2:air-n2'),
('22222222-2222-4222-8222-222222222203-ru','ru','science','3','Каков химический символ золота?','["Gd","Au","Ag","Go"]',1,'ru:science:3:gold-au'),
('22222222-2222-4222-8222-222222222204-ru','ru','science','3','Световой год измеряет...','["Время","Расстояние","Массу","Скорость"]',1,'ru:science:3:light-year'),
('22222222-2222-4222-8222-222222222205-ru','ru','science','4','Какая частица имеет отрицательный заряд?','["Протон","Нейтрон","Электрон","Альфа"]',2,'ru:science:4:electron'),

-- HISTORY
('33333333-3333-4333-8333-333333333301-ru','ru','history','2','Кто был первым президентом США?','["Авраам Линкольн","Джордж Вашингтон","Джон Адамс","Томас Джефферсон"]',1,'ru:history:2:first-usa-president'),
('33333333-3333-4333-8333-333333333302-ru','ru','history','3','Римская империя пала примерно в каком веке?','["3-м","5-м","8-м","11-м"]',1,'ru:history:3:fall-rome'),
('33333333-3333-4333-8333-333333333303-ru','ru','history','4','В какой стране была подписана Великая хартия вольностей?','["Франция","Италия","Англия","Испания"]',2,'ru:history:4:magna-carta'),
('33333333-3333-4333-8333-333333333304-ru','ru','history','4','Кто возглавлял ненасильственное движение за независимость Индии?','["Неру","Ганди","Амбедкар","Патель"]',1,'ru:history:4:gandhi'),
('33333333-3333-4333-8333-333333333305-ru','ru','history','5','Битва при Гастингсе произошла в...','["1066","1215","1415","1666"]',0,'ru:history:5:hastings'),

-- GEOGRAPHY
('44444444-4444-4444-8444-444444444401-ru','ru','geography','2','Какая столица Японии?','["Осака","Киото","Токио","Нагоя"]',2,'ru:geography:2:capital-japan'),
('44444444-4444-4444-8444-444444444402-ru','ru','geography','2','На каком континенте находится Бразилия?','["Европа","Африка","Азия","Южная Америка"]',3,'ru:geography:2:brazil-continent'),
('44444444-4444-4444-8444-444444444403-ru','ru','geography','3','Сахара это...','["Лес","Пустыня","Озеро","Ледник"]',1,'ru:geography:3:sahara'),
('44444444-4444-4444-8444-444444444404-ru','ru','geography','3','Эверест находится на границе...','["Китай–Индия","Непал–Китай","Индия–Непал","Бутан–Индия"]',1,'ru:geography:3:everest'),
('44444444-4444-4444-8444-444444444405-ru','ru','geography','4','Какая река протекает через Париж?','["Сена","Темза","Дунай","Рейн"]',0,'ru:geography:4:seine'),

-- SPORTS
('55555555-5555-4555-8555-555555555501-ru','ru','sports','1','Сколько игроков на поле с каждой стороны в футболе?','["9","10","11","12"]',2,'ru:sports:1:soccer-eleven'),
('55555555-5555-4555-8555-555555555502-ru','ru','sports','2','Олимпийские игры проводятся каждые...','["2 года","3 года","4 года","5 лет"]',2,'ru:sports:2:olympics'),
('55555555-5555-4555-8555-555555555503-ru','ru','sports','3','«Лав» это счёт в каком виде спорта?','["Баскетбол","Теннис","Крикет","Регби"]',1,'ru:sports:3:love-tennis'),
('55555555-5555-4555-8555-555555555504-ru','ru','sports','3','Какая страна выиграла Чемпионат мира по футболу 2010?','["Германия","Испания","Бразилия","Италия"]',1,'ru:sports:3:fifa2010'),
('55555555-5555-4555-8555-555555555505-ru','ru','sports','4','NBA расшифровывается как...','["National Basket Association","National Basketball Association","North Basketball Alliance","National Base Association"]',1,'ru:sports:4:nba'),

-- MOVIES/TV
('66666666-6666-4666-8666-666666666601-ru','ru','movies','1','Кто озвучил «Вуди» в оригинале «Истории игрушек»?','["Том Хэнкс","Тим Аллен","Джим Керри","Робин Уильямс"]',0,'ru:movies:1:woody'),
('66666666-6666-4666-8666-666666666602-ru','ru','movies','2','«Единое кольцо» из какой серии?','["Нарния","Гарри Поттер","Властелин колец","Перси Джексон"]',2,'ru:movies:2:one-ring'),
('66666666-6666-4666-8666-666666666603-ru','ru','movies','2','«Ваканда» появляется в...','["DC","Звёздные войны","Marvel","Звёздный путь"]',2,'ru:movies:2:wakanda'),
('66666666-6666-4666-8666-666666666604-ru','ru','movies','3','Кто снял «Начало»?','["Нолан","Скотт","Тарантино","Финчер"]',0,'ru:movies:3:inception-nolan'),
('66666666-6666-4666-8666-666666666605-ru','ru','movies','4','Первый «Оскар» за лучший фильм был вручён в...','["1929","1939","1949","1959"]',0,'ru:movies:4:first-oscar'),

-- TECHNOLOGY
('77777777-7777-4777-8777-777777777701-ru','ru','tech','1','iOS разработан компанией...','["Google","Apple","Microsoft","Samsung"]',1,'ru:tech:1:ios'),
('77777777-7777-4777-8777-777777777702-ru','ru','tech','2','HTTP расшифровывается как...','["HyperText Transfer Protocol","High Transfer Text Protocol","Hyper Terminal Transfer Program","Host Transfer Text Protocol"]',0,'ru:tech:2:http'),
('77777777-7777-4777-8777-777777777703-ru','ru','tech','3','Двоичная система использует цифры...','["0 и 1","0-9","A–F","1-9"]',0,'ru:tech:3:binary'),
('77777777-7777-4777-8777-777777777704-ru','ru','tech','3','SSD хранит данные в основном на...','["Магнитных пластинах","Оптических дисках","Флэш-памяти","Ленте"]',2,'ru:tech:3:ssd'),
('77777777-7777-4777-8777-777777777705-ru','ru','tech','4','Первый iPhone был выпущен в...','["2005","2007","2009","2011"]',1,'ru:tech:4:iphone-2007'),

-- LITERATURE
('88888888-8888-4888-8888-888888888801-ru','ru','literature','2','Автор «1984»?','["Олдос Хаксли","Джордж Оруэлл","Рэй Брэдбери","Филип К. Дик"]',1,'ru:lit:2:1984'),
('88888888-8888-4888-8888-888888888802-ru','ru','literature','3','Шерлок Холмс живёт по адресу...','["Даунинг-стрит, 10","Бейкер-стрит, 221B","5-я авеню","Флит-стрит"]',1,'ru:lit:3:sherlock'),
('88888888-8888-4888-8888-888888888803-ru','ru','literature','3','«Одиссея» приписывается...','["Гомеру","Вергилию","Платону","Сократу"]',0,'ru:lit:3:odyssey'),
('88888888-8888-4888-8888-888888888804-ru','ru','literature','4','«Дон Кихот» написан...','["Сервантесом","Борхесом","Гарсия Маркесом","Пасом"]',0,'ru:lit:4:quixote'),
('88888888-8888-4888-8888-888888888805-ru','ru','literature','4','Термин «bildungsroman» относится к...','["Военная история","Роман взросления","Эпическая поэма","Детектив"]',1,'ru:lit:4:bildungsroman'),

-- MUSIC
('99999999-9999-4999-8999-999999999901-ru','ru','music','1','У какого инструмента есть клавиши, педали и струны?','["Пианино","Барабан","Флейта","Скрипка"]',0,'ru:music:1:piano'),
('99999999-9999-4999-8999-999999999902-ru','ru','music','2','BPM расшифровывается как...','["Beats Per Minute","Bass Pitch Measure","Bars Per Measure","Basic Pulse Meter"]',0,'ru:music:2:bpm'),
('99999999-9999-4999-8999-999999999903-ru','ru','music','2','Композитор «К Элизе»?','["Моцарт","Бетховен","Шопен","Бах"]',1,'ru:music:2:furelise'),
('99999999-9999-4999-8999-999999999904-ru','ru','music','3','«Концерт» обычно включает...','["Солиста с оркестром","Только хор","Только ударные","Духовой оркестр"]',0,'ru:music:3:concerto'),
('99999999-9999-4999-8999-999999999905-ru','ru','music','4','Регги зародилось в...','["США","Ямайке","Бразилии","Нигерии"]',1,'ru:music:4:reggae'),

-- MATH / LOGIC
('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaa01-ru','ru','math','5','Производная x² равна...','["x","2x","x²","2"]',1,'ru:math:5:derivative-x2'),
('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaa02-ru','ru','math','5','Простое число это...','["Делится только на 1 и само себя","Только чётное","Кратное 3","Всегда нечётное"]',0,'ru:math:5:prime'),
('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaa03-ru','ru','math','6','Сколько будет 13 × 17?','["210","221","234","247"]',1,'ru:math:6:13x17'),
('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaa04-ru','ru','logic','6','Если все Блупы это Раззи и все Раззи это Лаззи, то все Блупы это...','["Лаззи","Раззи","Ни то, ни другое","Оба"]',0,'ru:logic:6:syl-log'),
('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaa05-ru','ru','logic','6','Две правды и ложь: что должно быть ложным при «ровно одно ложно»?','["A и B","B и C","Ровно одно утверждение","Все"]',2,'ru:logic:6:paradox-one');

-- Russian translations for generated questions
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
-- Difficulty 2
('gen-2-001-ru', 'ru', 'general', '2', 'Сколько континентов на Земле?', '["5", "6", "7", "8"]', 2, 'ru:general:сколько континентов', '[]', '[]', 'global', 1),
('gen-2-002-ru', 'ru', 'general', '2', 'Какая столица Франции?', '["Лондон", "Берлин", "Париж", "Мадрид"]', 2, 'ru:general:столица франции', '[]', '[]', 'global', 1),
('gen-2-003-ru', 'ru', 'general', '2', 'Сколько ног у паука?', '["6", "8", "10", "12"]', 1, 'ru:general:ноги паука', '[]', '[]', 'global', 1),
('gen-2-004-ru', 'ru', 'general', '2', 'Какой самый большой океан на Земле?', '["Атлантический", "Тихий", "Индийский", "Северный Ледовитый"]', 1, 'ru:general:самый большой океан', '[]', '[]', 'global', 1),
('gen-2-005-ru', 'ru', 'general', '2', 'Сколько часов в сутках?', '["12", "24", "36", "48"]', 1, 'ru:general:часов в сутках', '[]', '[]', 'global', 1),

-- Difficulty 3
('gen-3-001-ru', 'ru', 'general', '3', 'Какое самое маленькое простое число?', '["0", "1", "2", "3"]', 2, 'ru:general:самое маленькое простое', '[]', '[]', 'global', 1),
('gen-3-002-ru', 'ru', 'general', '3', 'Каков химический символ золота?', '["Go", "Gd", "Au", "Ag"]', 2, 'ru:general:символ золота', '[]', '[]', 'global', 1),
('gen-3-003-ru', 'ru', 'general', '3', 'Кто написал «Ромео и Джульетта»?', '["Чарльз Диккенс", "Марк Твен", "Уильям Шекспир", "Джейн Остин"]', 2, 'ru:general:ромео и джульетта автор', '[]', '[]', 'global', 1),
('gen-3-004-ru', 'ru', 'general', '3', 'Какова примерно скорость света?', '["300,000 км/с", "150,000 км/с", "450,000 км/с", "600,000 км/с"]', 0, 'ru:general:скорость света', '[]', '[]', 'global', 1),
('gen-3-005-ru', 'ru', 'general', '3', 'В каком году закончилась Вторая мировая война?', '["1943", "1944", "1945", "1946"]', 2, 'ru:general:конец второй мировой', '[]', '[]', 'global', 1),

-- Difficulty 4
('gen-4-001-ru', 'ru', 'general', '4', 'Какая самая длинная река в мире?', '["Амазонка", "Нил", "Миссисипи", "Янцзы"]', 1, 'ru:general:самая длинная река', '[]', '[]', 'global', 1),
('gen-4-002-ru', 'ru', 'general', '4', 'Какова формула площади круга?', '["πr", "πr²", "2πr", "πd"]', 1, 'ru:general:площадь круга', '[]', '[]', 'global', 1),
('gen-4-003-ru', 'ru', 'general', '4', 'Кто нарисовал Мону Лизу?', '["Микеланджело", "Леонардо да Винчи", "Рафаэль", "Донателло"]', 1, 'ru:general:мона лиза художник', '[]', '[]', 'global', 1),
('gen-4-004-ru', 'ru', 'general', '4', 'Какая самая маленькая страна в мире?', '["Монако", "Ватикан", "Сан-Марино", "Лихтенштейн"]', 1, 'ru:general:самая маленькая страна', '[]', '[]', 'global', 1),
('gen-4-005-ru', 'ru', 'general', '4', 'Сколько элементов в периодической таблице?', '["92", "108", "118", "126"]', 2, 'ru:general:элементов в таблице', '[]', '[]', 'global', 1),

-- Difficulty 5
('gen-5-001-ru', 'ru', 'general', '5', 'Какая столица Австралии?', '["Сидней", "Мельбурн", "Канберра", "Брисбен"]', 2, 'ru:general:столица австралии', '[]', '[]', 'global', 1),
('gen-5-002-ru', 'ru', 'general', '5', 'С каких чисел начинается последовательность Фибоначчи?', '["0", "1", "0 и 1", "1 и 1"]', 2, 'ru:general:начало фибоначчи', '[]', '[]', 'global', 1),
('gen-5-003-ru', 'ru', 'general', '5', 'Кто разработал теорию общей относительности?', '["Исаак Ньютон", "Нильс Бор", "Альберт Эйнштейн", "Стивен Хокинг"]', 2, 'ru:general:теория относительности', '[]', '[]', 'global', 1),
('gen-5-004-ru', 'ru', 'general', '5', 'Каков pH чистой воды?', '["5", "6", "7", "8"]', 2, 'ru:general:ph воды', '[]', '[]', 'global', 1),
('gen-5-005-ru', 'ru', 'general', '5', 'В каком году затонул Титаник?', '["1910", "1911", "1912", "1913"]', 2, 'ru:general:титаник год', '[]', '[]', 'global', 1),

-- Difficulty 6
('gen-6-001-ru', 'ru', 'general', '6', 'Каков период полураспада углерода-14?', '["5,730 лет", "11,460 лет", "2,865 лет", "1,000 лет"]', 0, 'ru:general:период полураспада c14', '[]', '[]', 'global', 1),
('gen-6-002-ru', 'ru', 'general', '6', 'Кто доказал Великую теорему Ферма?', '["Пьер де Ферма", "Эндрю Уайлс", "Леонард Эйлер", "Карл Фридрих Гаусс"]', 1, 'ru:general:теорема ферма', '[]', '[]', 'global', 1),
('gen-6-003-ru', 'ru', 'general', '6', 'Какой самый распространённый элемент во Вселенной?', '["Кислород", "Водород", "Гелий", "Углерод"]', 1, 'ru:general:самый распространённый элемент', '[]', '[]', 'global', 1),
('gen-6-004-ru', 'ru', 'general', '6', 'Чему примерно равно число Авогадро?', '["6,02 × 10²³", "3,14 × 10²³", "9,81 × 10²³", "1,60 × 10²³"]', 0, 'ru:general:число авогадро', '[]', '[]', 'global', 1),
('gen-6-005-ru', 'ru', 'general', '6', 'В каком году была сформулирована квантовая механика?', '["1900", "1915", "1925", "1935"]', 2, 'ru:general:квантовая механика год', '[]', '[]', 'global', 1);


-- Spanish translations for GENERAL questions (original seed)
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash) VALUES
-- GENERAL (easy)
('11111111-1111-4111-8111-111111111101-es','es','general','1','¿Cuánto es 2 + 2?','["3","4","5","6"]',1,'es:general:1:2+2'),
('11111111-1111-4111-8111-111111111102-es','es','general','1','¿De qué color es el cielo en un día despejado?','["Azul","Verde","Rojo","Amarillo"]',0,'es:general:1:sky-color'),
('11111111-1111-4111-8111-111111111103-es','es','general','1','¿Qué día viene después del lunes?','["Martes","Viernes","Domingo","Sábado"]',0,'es:general:1:after-monday'),
('11111111-1111-4111-8111-111111111104-es','es','general','1','¿Cuántos días hay en una semana?','["5","6","7","8"]',2,'es:general:1:days-week'),
('11111111-1111-4111-8111-111111111105-es','es','general','1','¿Cuál es una fruta?','["Zanahoria","Papa","Manzana","Cebolla"]',2,'es:general:1:is-fruit'),

-- SCIENCE
('22222222-2222-4222-8222-222222222201-es','es','science','2','¿A qué temperatura se congela el agua (°C)?','["0","32","100","-10"]',0,'es:science:2:freeze-c'),
('22222222-2222-4222-8222-222222222202-es','es','science','2','¿Qué gas respiran principalmente los humanos?','["Oxígeno","Nitrógeno","Dióxido de carbono","Hidrógeno"]',1,'es:science:2:air-n2'),
('22222222-2222-4222-8222-222222222203-es','es','science','3','¿Cuál es el símbolo químico del oro?','["Gd","Au","Ag","Go"]',1,'es:science:3:gold-au'),
('22222222-2222-4222-8222-222222222204-es','es','science','3','El año luz mide...','["Tiempo","Distancia","Masa","Velocidad"]',1,'es:science:3:light-year'),
('22222222-2222-4222-8222-222222222205-es','es','science','4','¿Qué partícula tiene carga negativa?','["Protón","Neutrón","Electrón","Alfa"]',2,'es:science:4:electron'),

-- HISTORY
('33333333-3333-4333-8333-333333333301-es','es','history','2','¿Quién fue el primer presidente de EE.UU.?','["Abraham Lincoln","George Washington","John Adams","Thomas Jefferson"]',1,'es:history:2:first-usa-president'),
('33333333-3333-4333-8333-333333333302-es','es','history','3','El Imperio Romano cayó aproximadamente en el siglo...','["3","5","8","11"]',1,'es:history:3:fall-rome'),
('33333333-3333-4333-8333-333333333303-es','es','history','4','¿En qué país se firmó la Carta Magna?','["Francia","Italia","Inglaterra","España"]',2,'es:history:4:magna-carta'),
('33333333-3333-4333-8333-333333333304-es','es','history','4','¿Quién lideró el movimiento no violento por la independencia de India?','["Nehru","Gandhi","Ambedkar","Patel"]',1,'es:history:4:gandhi'),
('33333333-3333-4333-8333-333333333305-es','es','history','5','La batalla de Hastings ocurrió en...','["1066","1215","1415","1666"]',0,'es:history:5:hastings'),

-- GEOGRAPHY
('44444444-4444-4444-8444-444444444401-es','es','geography','2','¿Cuál es la capital de Japón?','["Osaka","Kioto","Tokio","Nagoya"]',2,'es:geography:2:capital-japan'),
('44444444-4444-4444-8444-444444444402-es','es','geography','2','¿En qué continente está Brasil?','["Europa","África","Asia","Sudamérica"]',3,'es:geography:2:brazil-continent'),
('44444444-4444-4444-8444-444444444403-es','es','geography','3','El Sahara es un...','["Bosque","Desierto","Lago","Glaciar"]',1,'es:geography:3:sahara'),
('44444444-4444-4444-8444-444444444404-es','es','geography','3','El Monte Everest está en la frontera...','["China–India","Nepal–China","India–Nepal","Bután–India"]',1,'es:geography:3:everest'),
('44444444-4444-4444-8444-444444444405-es','es','geography','4','¿Qué río atraviesa París?','["Sena","Támesis","Danubio","Rin"]',0,'es:geography:4:seine'),

-- SPORTS
('55555555-5555-4555-8555-555555555501-es','es','sports','1','¿Cuántos jugadores por equipo en fútbol (en campo)?','["9","10","11","12"]',2,'es:sports:1:soccer-eleven'),
('55555555-5555-4555-8555-555555555502-es','es','sports','2','Los Juegos Olímpicos se celebran cada...','["2 años","3 años","4 años","5 años"]',2,'es:sports:2:olympics'),
('55555555-5555-4555-8555-555555555503-es','es','sports','3','«Love» es una puntuación en...','["Baloncesto","Tenis","Críquet","Rugby"]',1,'es:sports:3:love-tennis'),
('55555555-5555-4555-8555-555555555504-es','es','sports','3','¿Qué país ganó la Copa Mundial de 2010?','["Alemania","España","Brasil","Italia"]',1,'es:sports:3:fifa2010'),
('55555555-5555-4555-8555-555555555505-es','es','sports','4','NBA significa...','["National Basket Association","National Basketball Association","North Basketball Alliance","National Base Association"]',1,'es:sports:4:nba'),

-- MOVIES/TV
('66666666-6666-4666-8666-666666666601-es','es','movies','1','¿Quién puso voz a «Woody» en Toy Story (original)?','["Tom Hanks","Tim Allen","Jim Carrey","Robin Williams"]',0,'es:movies:1:woody'),
('66666666-6666-4666-8666-666666666602-es','es','movies','2','El «Anillo Único» es de qué serie?','["Narnia","Harry Potter","El Señor de los Anillos","Percy Jackson"]',2,'es:movies:2:one-ring'),
('66666666-6666-4666-8666-666666666603-es','es','movies','2','«Wakanda» aparece en...','["DC","Star Wars","Marvel","Star Trek"]',2,'es:movies:2:wakanda'),
('66666666-6666-4666-8666-666666666604-es','es','movies','3','¿Quién dirigió «Origen»?','["Nolan","Scott","Tarantino","Fincher"]',0,'es:movies:3:inception-nolan'),
('66666666-6666-4666-8666-666666666605-es','es','movies','4','El primer Óscar a Mejor Película se otorgó en...','["1929","1939","1949","1959"]',0,'es:movies:4:first-oscar'),

-- TECHNOLOGY
('77777777-7777-4777-8777-777777777701-es','es','tech','1','iOS está hecho por...','["Google","Apple","Microsoft","Samsung"]',1,'es:tech:1:ios'),
('77777777-7777-4777-8777-777777777702-es','es','tech','2','HTTP significa...','["HyperText Transfer Protocol","High Transfer Text Protocol","Hyper Terminal Transfer Program","Host Transfer Text Protocol"]',0,'es:tech:2:http'),
('77777777-7777-4777-8777-777777777703-es','es','tech','3','El binario usa qué dígitos?','["0 y 1","0 a 9","A–F","1 a 9"]',0,'es:tech:3:binary'),
('77777777-7777-4777-8777-777777777704-es','es','tech','3','Los SSD almacenan datos principalmente en...','["Discos magnéticos","Discos ópticos","Memoria flash","Cinta"]',2,'es:tech:3:ssd'),
('77777777-7777-4777-8777-777777777705-es','es','tech','4','El primer iPhone se lanzó en...','["2005","2007","2009","2011"]',1,'es:tech:4:iphone-2007'),

-- LITERATURE
('88888888-8888-4888-8888-888888888801-es','es','literature','2','¿Autor de «1984»?','["Aldous Huxley","George Orwell","Ray Bradbury","Philip K. Dick"]',1,'es:lit:2:1984'),
('88888888-8888-4888-8888-888888888802-es','es','literature','3','Sherlock Holmes vive en...','["10 Downing St","221B Baker St","5ta Avenida","Fleet St"]',1,'es:lit:3:sherlock'),
('88888888-8888-4888-8888-888888888803-es','es','literature','3','La «Odisea» se atribuye a...','["Homero","Virgilio","Platón","Sócrates"]',0,'es:lit:3:odyssey'),
('88888888-8888-4888-8888-888888888804-es','es','literature','4','«Don Quijote» fue escrito por...','["Cervantes","Borges","García Márquez","Paz"]',0,'es:lit:4:quixote'),
('88888888-8888-4888-8888-888888888805-es','es','literature','4','El término «bildungsroman» se refiere a...','["Historia de guerra","Novela de formación","Poema épico","Historia detectivesca"]',1,'es:lit:4:bildungsroman'),

-- MUSIC
('99999999-9999-4999-8999-999999999901-es','es','music','1','¿Qué instrumento tiene teclas, pedales y cuerdas?','["Piano","Tambor","Flauta","Violín"]',0,'es:music:1:piano'),
('99999999-9999-4999-8999-999999999902-es','es','music','2','BPM significa...','["Beats Per Minute","Bass Pitch Measure","Bars Per Measure","Basic Pulse Meter"]',0,'es:music:2:bpm'),
('99999999-9999-4999-8999-999999999903-es','es','music','2','¿Compositor de «Para Elisa»?','["Mozart","Beethoven","Chopin","Bach"]',1,'es:music:2:furelise'),
('99999999-9999-4999-8999-999999999904-es','es','music','3','Un «concierto» típicamente presenta...','["Solista con orquesta","Solo coro","Solo percusión","Banda de metales"]',0,'es:music:3:concerto'),
('99999999-9999-4999-8999-999999999905-es','es','music','4','El reggae se originó en...','["EE.UU.","Jamaica","Brasil","Nigeria"]',1,'es:music:4:reggae'),

-- MATH / LOGIC
('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaa01-es','es','math','5','La derivada de x² es...','["x","2x","x²","2"]',1,'es:math:5:derivative-x2'),
('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaa02-es','es','math','5','Un número primo es...','["Solo divisible por 1 y sí mismo","Solo par","Múltiplo de 3","Siempre impar"]',0,'es:math:5:prime'),
('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaa03-es','es','math','6','¿Cuánto es 13 × 17?','["210","221","234","247"]',1,'es:math:6:13x17'),
('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaa04-es','es','logic','6','Si todos los Bloops son Razzies y todos los Razzies son Lazzies, entonces todos los Bloops son...','["Lazzies","Razzies","Ninguno","Ambos"]',0,'es:logic:6:syl-log'),
('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaa05-es','es','logic','6','Dos verdades y una mentira: ¿qué debe ser falso si «exactamente una es falsa»?','["A y B","B y C","Exactamente una afirmación","Todas"]',2,'es:logic:6:paradox-one');

-- Spanish translations for generated questions
INSERT OR IGNORE INTO question (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified) VALUES
-- Difficulty 2
('gen-2-001-es', 'es', 'general', '2', '¿Cuántos continentes hay?', '["5", "6", "7", "8"]', 2, 'es:general:cuantos continentes', '[]', '[]', 'global', 1),
('gen-2-002-es', 'es', 'general', '2', '¿Cuál es la capital de Francia?', '["Londres", "Berlín", "París", "Madrid"]', 2, 'es:general:capital francia', '[]', '[]', 'global', 1),
('gen-2-003-es', 'es', 'general', '2', '¿Cuántas patas tiene una araña?', '["6", "8", "10", "12"]', 1, 'es:general:patas araña', '[]', '[]', 'global', 1),
('gen-2-004-es', 'es', 'general', '2', '¿Cuál es el océano más grande de la Tierra?', '["Atlántico", "Pacífico", "Índico", "Ártico"]', 1, 'es:general:oceano más grande', '[]', '[]', 'global', 1),
('gen-2-005-es', 'es', 'general', '2', '¿Cuántas horas hay en un día?', '["12", "24", "36", "48"]', 1, 'es:general:horas en un dia', '[]', '[]', 'global', 1),

-- Difficulty 3
('gen-3-001-es', 'es', 'general', '3', '¿Cuál es el número primo más pequeño?', '["0", "1", "2", "3"]', 2, 'es:general:primo más pequeño', '[]', '[]', 'global', 1),
('gen-3-002-es', 'es', 'general', '3', '¿Cuál es el símbolo químico del oro?', '["Go", "Gd", "Au", "Ag"]', 2, 'es:general:simbolo oro', '[]', '[]', 'global', 1),
('gen-3-003-es', 'es', 'general', '3', '¿Quién escribió "Romeo y Julieta"?', '["Charles Dickens", "Mark Twain", "William Shakespeare", "Jane Austen"]', 2, 'es:general:quien escribio romeo', '[]', '[]', 'global', 1),
('gen-3-004-es', 'es', 'general', '3', '¿Cuál es la velocidad de la luz aproximadamente?', '["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"]', 0, 'es:general:velocidad luz', '[]', '[]', 'global', 1),
('gen-3-005-es', 'es', 'general', '3', '¿En qué año terminó la Segunda Guerra Mundial?', '["1943", "1944", "1945", "1946"]', 2, 'es:general:fin segunda guerra', '[]', '[]', 'global', 1),

-- Difficulty 4
('gen-4-001-es', 'es', 'general', '4', '¿Cuál es el río más largo del mundo?', '["Amazonas", "Nilo", "Misisipi", "Yangtsé"]', 1, 'es:general:rio más largo', '[]', '[]', 'global', 1),
('gen-4-002-es', 'es', 'general', '4', '¿Cuál es la fórmula del área de un círculo?', '["πr", "πr²", "2πr", "πd"]', 1, 'es:general:formula area circulo', '[]', '[]', 'global', 1),
('gen-4-003-es', 'es', 'general', '4', '¿Quién pintó la Mona Lisa?', '["Miguel Ángel", "Leonardo da Vinci", "Rafael", "Donatello"]', 1, 'es:general:quien pinto mona lisa', '[]', '[]', 'global', 1),
('gen-4-004-es', 'es', 'general', '4', '¿Cuál es el país más pequeño del mundo?', '["Mónaco", "Ciudad del Vaticano", "San Marino", "Liechtenstein"]', 1, 'es:general:pais más pequeño', '[]', '[]', 'global', 1),
('gen-4-005-es', 'es', 'general', '4', '¿Cuántos elementos hay en la tabla periódica?', '["92", "108", "118", "126"]', 2, 'es:general:elementos tabla periodica', '[]', '[]', 'global', 1),

-- Difficulty 5
('gen-5-001-es', 'es', 'general', '5', '¿Cuál es la capital de Australia?', '["Sídney", "Melbourne", "Canberra", "Brisbane"]', 2, 'es:general:capital australia', '[]', '[]', 'global', 1),
('gen-5-002-es', 'es', 'general', '5', '¿Con qué números comienza la secuencia de Fibonacci?', '["0", "1", "0 y 1", "1 y 1"]', 2, 'es:general:inicio fibonacci', '[]', '[]', 'global', 1),
('gen-5-003-es', 'es', 'general', '5', '¿Quién desarrolló la teoría de la relatividad general?', '["Isaac Newton", "Niels Bohr", "Albert Einstein", "Stephen Hawking"]', 2, 'es:general:teoria relatividad', '[]', '[]', 'global', 1),
('gen-5-004-es', 'es', 'general', '5', '¿Cuál es el pH del agua pura?', '["5", "6", "7", "8"]', 2, 'es:general:ph agua', '[]', '[]', 'global', 1),
('gen-5-005-es', 'es', 'general', '5', '¿En qué año se hundió el Titanic?', '["1910", "1911", "1912", "1913"]', 2, 'es:general:titanic año', '[]', '[]', 'global', 1),

-- Difficulty 6
('gen-6-001-es', 'es', 'general', '6', '¿Cuál es la vida media del Carbono-14?', '["5,730 años", "11,460 años", "2,865 años", "1,000 años"]', 0, 'es:general:vida media c14', '[]', '[]', 'global', 1),
('gen-6-002-es', 'es', 'general', '6', '¿Quién demostró el Último Teorema de Fermat?', '["Pierre de Fermat", "Andrew Wiles", "Leonhard Euler", "Carl Friedrich Gauss"]', 1, 'es:general:teorema fermat', '[]', '[]', 'global', 1),
('gen-6-003-es', 'es', 'general', '6', '¿Cuál es el elemento más abundante en el universo?', '["Oxígeno", "Hidrógeno", "Helio", "Carbono"]', 1, 'es:general:elemento más abundante', '[]', '[]', 'global', 1),
('gen-6-004-es', 'es', 'general', '6', '¿Cuánto vale aproximadamente el número de Avogadro?', '["6,02 × 10²³", "3,14 × 10²³", "9,81 × 10²³", "1,60 × 10²³"]', 0, 'es:general:numero avogadro', '[]', '[]', 'global', 1),
('gen-6-005-es', 'es', 'general', '6', '¿En qué año se formuló la mecánica cuántica?', '["1900", "1915", "1925", "1935"]', 2, 'es:general:mecanica cuantica año', '[]', '[]', 'global', 1);
