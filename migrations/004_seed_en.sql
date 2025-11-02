-- 50 English questions across categories

INSERT OR IGNORE INTO question
(id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash) VALUES
-- GENERAL (easy)
('11111111-1111-4111-8111-111111111101','en','general','1','What is 2 + 2?','["3","4","5","6"]',2,'en:general:1:2+2'),
('11111111-1111-4111-8111-111111111102','en','general','1','What color is the sky on a clear day?','["Blue","Green","Red","Yellow"]',1,'en:general:1:sky-color'),
('11111111-1111-4111-8111-111111111103','en','general','1','Which day comes after Monday?','["Tuesday","Friday","Sunday","Saturday"]',1,'en:general:1:after-monday'),
('11111111-1111-4111-8111-111111111104','en','general','1','How many days are in a week?','["5","6","7","8"]',3,'en:general:1:days-week'),
('11111111-1111-4111-8111-111111111105','en','general','1','Which is a fruit?','["Carrot","Potato","Apple","Onion"]',3,'en:general:1:is-fruit'),

-- SCIENCE
('22222222-2222-4222-8222-222222222201','en','science','2','Water freezes at what °C?','["0","32","100","-10"]',1,'en:science:2:freeze-c'),
('22222222-2222-4222-8222-222222222202','en','science','2','Humans breathe in mostly which gas?','["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"]',2,'en:science:2:air-n2'),
('22222222-2222-4222-8222-222222222203','en','science','3','What is the chemical symbol for Gold?','["Gd","Au","Ag","Go"]',2,'en:science:3:gold-au'),
('22222222-2222-4222-8222-222222222204','en','science','3','Light year measures…','["Time","Distance","Mass","Speed"]',2,'en:science:3:light-year'),
('22222222-2222-4222-8222-222222222205','en','science','4','Which particle has a negative charge?','["Proton","Neutron","Electron","Alpha"]',3,'en:science:4:electron'),

-- HISTORY
('33333333-3333-4333-8333-333333333301','en','history','2','Who was the first President of the USA?','["Abraham Lincoln","George Washington","John Adams","Thomas Jefferson"]',2,'en:history:2:first-usa-president'),
('33333333-3333-4333-8333-333333333302','en','history','3','The Roman Empire fell roughly in which century?','["3rd","5th","8th","11th"]',2,'en:history:3:fall-rome'),
('33333333-3333-4333-8333-333333333303','en','history','4','Magna Carta was signed in which country?','["France","Italy","England","Spain"]',3,'en:history:4:magna-carta'),
('33333333-3333-4333-8333-333333333304','en','history','4','Who led the nonviolent movement for India’s independence?','["Nehru","Gandhi","Ambedkar","Patel"]',2,'en:history:4:gandhi'),
('33333333-3333-4333-8333-333333333305','en','history','5','The Battle of Hastings occurred in…','["1066","1215","1415","1666"]',1,'en:history:5:hastings'),

-- GEOGRAPHY
('44444444-4444-4444-8444-444444444401','en','geography','2','What is the capital of Japan?','["Osaka","Kyoto","Tokyo","Nagoya"]',3,'en:geography:2:capital-japan'),
('44444444-4444-4444-8444-444444444402','en','geography','2','Which continent is Brazil in?','["Europe","Africa","Asia","South America"]',4,'en:geography:2:brazil-continent'),
('44444444-4444-4444-8444-444444444403','en','geography','3','The Sahara is a…','["Forest","Desert","Lake","Glacier"]',2,'en:geography:3:sahara'),
('44444444-4444-4444-8444-444444444404','en','geography','3','Mount Everest lies on which border region?','["China–India","Nepal–China","India–Nepal","Bhutan–India"]',2,'en:geography:3:everest'),
('44444444-4444-4444-8444-444444444405','en','geography','4','Which river runs through Paris?','["Seine","Thames","Danube","Rhine"]',1,'en:geography:4:seine'),

-- SPORTS
('55555555-5555-4555-8555-555555555501','en','sports','1','How many players per side in soccer (on field)?','["9","10","11","12"]',3,'en:sports:1:soccer-eleven'),
('55555555-5555-4555-8555-555555555502','en','sports','2','The Olympic Games are held every…','["2 years","3 years","4 years","5 years"]',3,'en:sports:2:olympics'),
('55555555-5555-4555-8555-555555555503','en','sports','3','“Love” is a score in which sport?','["Basketball","Tennis","Cricket","Rugby"]',2,'en:sports:3:love-tennis'),
('55555555-5555-4555-8555-555555555504','en','sports','3','Which country won the 2010 FIFA World Cup?','["Germany","Spain","Brazil","Italy"]',2,'en:sports:3:fifa2010'),
('55555555-5555-4555-8555-555555555505','en','sports','4','NBA stands for…','["National Basket Association","National Basketball Association","North Basketball Alliance","National Base Association"]',2,'en:sports:4:nba'),

-- MOVIES/TV
('66666666-6666-4666-8666-666666666601','en','movies','1','Who voiced “Woody” in Toy Story (original)?','["Tom Hanks","Tim Allen","Jim Carrey","Robin Williams"]',1,'en:movies:1:woody'),
('66666666-6666-4666-8666-666666666602','en','movies','2','The “One Ring” is from which series?','["Narnia","Harry Potter","Lord of the Rings","Percy Jackson"]',3,'en:movies:2:one-ring'),
('66666666-6666-4666-8666-666666666603','en','movies','2','“Wakanda” appears in…','["DC","Star Wars","Marvel","Star Trek"]',3,'en:movies:2:wakanda'),
('66666666-6666-4666-8666-666666666604','en','movies','3','Who directed “Inception”?','["Nolan","Scott","Tarantino","Fincher"]',1,'en:movies:3:inception-nolan'),
('66666666-6666-4666-8666-666666666605','en','movies','4','First Best Picture Oscar was awarded in…','["1929","1939","1949","1959"]',1,'en:movies:4:first-oscar'),

-- TECHNOLOGY
('77777777-7777-4777-8777-777777777701','en','tech','1','iOS is made by…','["Google","Apple","Microsoft","Samsung"]',2,'en:tech:1:ios'),
('77777777-7777-4777-8777-777777777702','en','tech','2','HTTP stands for…','["HyperText Transfer Protocol","High Transfer Text Protocol","Hyper Terminal Transfer Program","Host Transfer Text Protocol"]',1,'en:tech:2:http'),
('77777777-7777-4777-8777-777777777703','en','tech','3','Binary uses which digits?','["0 and 1","0 to 9","A–F","1 to 9"]',1,'en:tech:3:binary'),
('77777777-7777-4777-8777-777777777704','en','tech','3','SSD primarily stores data on…','["Magnetic platters","Optical discs","Flash memory","Tape"]',3,'en:tech:3:ssd'),
('77777777-7777-4777-8777-777777777705','en','tech','4','The first iPhone launched in…','["2005","2007","2009","2011"]',2,'en:tech:4:iphone-2007'),

-- LITERATURE
('88888888-8888-4888-8888-888888888801','en','literature','2','Author of “1984”?','["Aldous Huxley","George Orwell","Ray Bradbury","Philip K. Dick"]',2,'en:lit:2:1984'),
('88888888-8888-4888-8888-888888888802','en','literature','3','Sherlock Holmes lives at…','["10 Downing St","221B Baker St","5th Ave","Fleet St"]',2,'en:lit:3:sherlock'),
('88888888-8888-4888-8888-888888888803','en','literature','3','“Odyssey” is attributed to…','["Homer","Virgil","Plato","Socrates"]',1,'en:lit:3:odyssey'),
('88888888-8888-4888-8888-888888888804','en','literature','4','“Don Quixote” was written by…','["Cervantes","Borges","García Márquez","Paz"]',1,'en:lit:4:quixote'),
('88888888-8888-4888-8888-888888888805','en','literature','4','The term “bildungsroman” refers to…','["War story","Coming-of-age novel","Epic poem","Detective story"]',2,'en:lit:4:bildungsroman'),

-- MUSIC
('99999999-9999-4999-8999-999999999901','en','music','1','Which instrument has keys, pedals, and strings?','["Piano","Drum","Flute","Violin"]',1,'en:music:1:piano'),
('99999999-9999-4999-8999-999999999902','en','music','2','BPM stands for…','["Beats Per Minute","Bass Pitch Measure","Bars Per Measure","Basic Pulse Meter"]',1,'en:music:2:bpm'),
('99999999-9999-4999-8999-999999999903','en','music','2','Composer of “Für Elise”?','["Mozart","Beethoven","Chopin","Bach"]',2,'en:music:2:furelise'),
('99999999-9999-4999-8999-999999999904','en','music','3','A “concerto” typically features…','["Soloist with orchestra","Only choir","Only percussion","Brass band"]',1,'en:music:3:concerto'),
('99999999-9999-4999-8999-999999999905','en','music','4','Reggae originated in…','["USA","Jamaica","Brazil","Nigeria"]',2,'en:music:4:reggae'),

-- MATH / LOGIC (harder)
('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaa01','en','math','5','Derivative of x² is…','["x","2x","x²","2"]',2,'en:math:5:derivative-x2'),
('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaa02','en','math','5','Prime number is…','["Only divisible by 1 and itself","Only even","Multiple of 3","Always odd"]',1,'en:math:5:prime'),
('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaa03','en','math','6','What is 13 × 17?','["210","221","234","247"]',2,'en:math:6:13x17'),
('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaa04','en','logic','6','If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are…','["Lazzies","Razzies","Neither","Both"]',1,'en:logic:6:syl-log'),
('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaa05','en','logic','6','Two truths and a lie: which must be false given “exactly one is false”?','["A and B","B and C","Exactly one statement","All of them"]',3,'en:logic:6:paradox-one');
