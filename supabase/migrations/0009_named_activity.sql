-- Named people accounts + a Supabase job that keeps using the catalog.
-- Copy this whole file into SQL Editor and Run. Do not type the file name.
-- Likes stay up. No comments. No live chat.
-- If the cron lines at the bottom fail: Database → Extensions → enable pg_cron, then run only those last lines again.

create table if not exists public.named_people (
  n int primary key,
  id text not null unique,
  email text not null unique,
  display_name text not null,
  handle text not null
);

create table if not exists public.named_activity_state (
  id int primary key,
  cursor bigint not null default 0
);
insert into public.named_activity_state (id, cursor) values (1, 0)
on conflict (id) do nothing;

create table if not exists public.named_watches (
  user_id text not null,
  content_id text not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.vote_tallies (
  content_id text primary key,
  up bigint not null default 0,
  down bigint not null default 0
);

create table if not exists public.live_lobby (
  user_id text primary key,
  is_live boolean not null default true,
  title text,
  handle text,
  display_name text,
  category text,
  started_at timestamptz,
  watcher_ids text[] not null default '{}'
);

insert into public.named_people (n, id, email, display_name, handle) values
  (1, 'named-0001', 'name1@calabi.com', 'Lucy Bennett', 'lucybennett1'),
  (2, 'named-0002', 'name2@calabi.com', 'Elias Rogers', 'eliasrogers2'),
  (3, 'named-0003', 'name3@calabi.com', 'Liam Long', 'liamlong3'),
  (4, 'named-0004', 'name4@calabi.com', 'Alexander Bailey', 'alexanderbailey4'),
  (5, 'named-0005', 'name5@calabi.com', 'Benjamin Cook', 'benjamincook5'),
  (6, 'named-0006', 'name6@calabi.com', 'Layla Davis', 'layladavis6'),
  (7, 'named-0007', 'name7@calabi.com', 'Isabella Kelly', 'isabellakelly7'),
  (8, 'named-0008', 'name8@calabi.com', 'William Harrison', 'williamharrison8'),
  (9, 'named-0009', 'name9@calabi.com', 'Mia Walker', 'miawalker9'),
  (10, 'named-0010', 'name10@calabi.com', 'Sebastian Green', 'sebastiangreen10'),
  (11, 'named-0011', 'name11@calabi.com', 'Avery Wilson', 'averywilson11'),
  (12, 'named-0012', 'name12@calabi.com', 'Ella Wood', 'ellawood12'),
  (13, 'named-0013', 'name13@calabi.com', 'Camila Hamilton', 'camilahamilton13'),
  (14, 'named-0014', 'name14@calabi.com', 'Zoe Richardson', 'zoerichardson14'),
  (15, 'named-0015', 'name15@calabi.com', 'William Roberts', 'williamroberts15'),
  (16, 'named-0016', 'name16@calabi.com', 'Muhammad Smith', 'muhammadsmith16'),
  (17, 'named-0017', 'name17@calabi.com', 'Eleanor Wood', 'eleanorwood17'),
  (18, 'named-0018', 'name18@calabi.com', 'Paisley Fitzgerald', 'paisleyfitzgerald18'),
  (19, 'named-0019', 'name19@calabi.com', 'Isla Schmidt', 'islaschmidt19'),
  (20, 'named-0020', 'name20@calabi.com', 'Josiah Cook', 'josiahcook20'),
  (21, 'named-0021', 'name21@calabi.com', 'Atlas Kelly', 'atlaskelly21'),
  (22, 'named-0022', 'name22@calabi.com', 'Elias Schmidt', 'eliasschmidt22'),
  (23, 'named-0023', 'name23@calabi.com', 'Grayson Davis', 'graysondavis23'),
  (24, 'named-0024', 'name24@calabi.com', 'Aria Morgan', 'ariamorgan24'),
  (25, 'named-0025', 'name25@calabi.com', 'Ava Long', 'avalong25'),
  (26, 'named-0026', 'name26@calabi.com', 'Camila Murray', 'camilamurray26'),
  (27, 'named-0027', 'name27@calabi.com', 'Maverick Reynolds', 'maverickreynolds27'),
  (28, 'named-0028', 'name28@calabi.com', 'Luke Perry', 'lukeperry28'),
  (29, 'named-0029', 'name29@calabi.com', 'Aria Rogers', 'ariarogers29'),
  (30, 'named-0030', 'name30@calabi.com', 'Delilah Turner', 'delilahturner30'),
  (31, 'named-0031', 'name31@calabi.com', 'Riley Williams', 'rileywilliams31'),
  (32, 'named-0032', 'name32@calabi.com', 'Aurora Walker', 'aurorawalker32'),
  (33, 'named-0033', 'name33@calabi.com', 'Zoe Turner', 'zoeturner33'),
  (34, 'named-0034', 'name34@calabi.com', 'Muhammad Watson', 'muhammadwatson34'),
  (35, 'named-0035', 'name35@calabi.com', 'Violet Patterson', 'violetpatterson35'),
  (36, 'named-0036', 'name36@calabi.com', 'Gabriel Moore', 'gabrielmoore36'),
  (37, 'named-0037', 'name37@calabi.com', 'Henry Owens', 'henryowens37'),
  (38, 'named-0038', 'name38@calabi.com', 'Nora Schmidt', 'noraschmidt38'),
  (39, 'named-0039', 'name39@calabi.com', 'Charlotte Clark', 'charlotteclark39'),
  (40, 'named-0040', 'name40@calabi.com', 'Noah Rogers', 'noahrogers40'),
  (41, 'named-0041', 'name41@calabi.com', 'Wyatt West', 'wyattwest41'),
  (42, 'named-0042', 'name42@calabi.com', 'Roman Phillips', 'romanphillips42'),
  (43, 'named-0043', 'name43@calabi.com', 'Evelyn Jenkins', 'evelynjenkins43'),
  (44, 'named-0044', 'name44@calabi.com', 'Roman Cook', 'romancook44'),
  (45, 'named-0045', 'name45@calabi.com', 'Zoe Ellis', 'zoeellis45'),
  (46, 'named-0046', 'name46@calabi.com', 'Matthew Fisher', 'matthewfisher46'),
  (47, 'named-0047', 'name47@calabi.com', 'Penelope Fitzgerald', 'penelopefitzgerald47'),
  (48, 'named-0048', 'name48@calabi.com', 'Ivy Wright', 'ivywright48'),
  (49, 'named-0049', 'name49@calabi.com', 'Chloe Miller', 'chloemiller49'),
  (50, 'named-0050', 'name50@calabi.com', 'Santiago Perry', 'santiagoperry50'),
  (51, 'named-0051', 'name51@calabi.com', 'Willow Reynolds', 'willowreynolds51'),
  (52, 'named-0052', 'name52@calabi.com', 'Isabella Barnes', 'isabellabarnes52'),
  (53, 'named-0053', 'name53@calabi.com', 'Benjamin Hughes', 'benjaminhughes53'),
  (54, 'named-0054', 'name54@calabi.com', 'Ava Perry', 'avaperry54'),
  (55, 'named-0055', 'name55@calabi.com', 'James Reynolds', 'jamesreynolds55'),
  (56, 'named-0056', 'name56@calabi.com', 'Delilah Miller', 'delilahmiller56'),
  (57, 'named-0057', 'name57@calabi.com', 'Ayla Sullivan', 'aylasullivan57'),
  (58, 'named-0058', 'name58@calabi.com', 'Riley Patterson', 'rileypatterson58'),
  (59, 'named-0059', 'name59@calabi.com', 'Waylon Marshall', 'waylonmarshall59'),
  (60, 'named-0060', 'name60@calabi.com', 'Benjamin Bryant', 'benjaminbryant60'),
  (61, 'named-0061', 'name61@calabi.com', 'Theodore Taylor', 'theodoretaylor61'),
  (62, 'named-0062', 'name62@calabi.com', 'Ayla Parker', 'aylaparker62'),
  (63, 'named-0063', 'name63@calabi.com', 'Chloe Martin', 'chloemartin63'),
  (64, 'named-0064', 'name64@calabi.com', 'Emma Parker', 'emmaparker64'),
  (65, 'named-0065', 'name65@calabi.com', 'Alexander Jenkins', 'alexanderjenkins65'),
  (66, 'named-0066', 'name66@calabi.com', 'Levi Jordan', 'levijordan66'),
  (67, 'named-0067', 'name67@calabi.com', 'Olivia Edwards', 'oliviaedwards67'),
  (68, 'named-0068', 'name68@calabi.com', 'Henry Adams', 'henryadams68'),
  (69, 'named-0069', 'name69@calabi.com', 'Hudson Bryant', 'hudsonbryant69'),
  (70, 'named-0070', 'name70@calabi.com', 'Levi Jackson', 'levijackson70'),
  (71, 'named-0071', 'name71@calabi.com', 'Stella Owens', 'stellaowens71'),
  (72, 'named-0072', 'name72@calabi.com', 'Ava Sanders', 'avasanders72'),
  (73, 'named-0073', 'name73@calabi.com', 'Isabella Evans', 'isabellaevans73'),
  (74, 'named-0074', 'name74@calabi.com', 'Layla Morris', 'laylamorris74'),
  (75, 'named-0075', 'name75@calabi.com', 'Asher Barnes', 'asherbarnes75'),
  (76, 'named-0076', 'name76@calabi.com', 'Lucy Rogers', 'lucyrogers76'),
  (77, 'named-0077', 'name77@calabi.com', 'Samuel Graham', 'samuelgraham77'),
  (78, 'named-0078', 'name78@calabi.com', 'Emma Brooks', 'emmabrooks78'),
  (79, 'named-0079', 'name79@calabi.com', 'Carter Wright', 'carterwright79'),
  (80, 'named-0080', 'name80@calabi.com', 'Elizabeth Carter', 'elizabethcarter80'),
  (81, 'named-0081', 'name81@calabi.com', 'Luke Murphy', 'lukemurphy81'),
  (82, 'named-0082', 'name82@calabi.com', 'Mila Smith', 'milasmith82'),
  (83, 'named-0083', 'name83@calabi.com', 'Atlas Baker', 'atlasbaker83'),
  (84, 'named-0084', 'name84@calabi.com', 'Lainey Richardson', 'laineyrichardson84'),
  (85, 'named-0085', 'name85@calabi.com', 'Paisley Smith', 'paisleysmith85'),
  (86, 'named-0086', 'name86@calabi.com', 'Zoe Jordan', 'zoejordan86'),
  (87, 'named-0087', 'name87@calabi.com', 'Thomas Wright', 'thomaswright87'),
  (88, 'named-0088', 'name88@calabi.com', 'Oliver Brown', 'oliverbrown88'),
  (89, 'named-0089', 'name89@calabi.com', 'Amelia Parker', 'ameliaparker89'),
  (90, 'named-0090', 'name90@calabi.com', 'Evelyn Robinson', 'evelynrobinson90'),
  (91, 'named-0091', 'name91@calabi.com', 'Ethan Perry', 'ethanperry91'),
  (92, 'named-0092', 'name92@calabi.com', 'Eleanor Jenkins', 'eleanorjenkins92'),
  (93, 'named-0093', 'name93@calabi.com', 'Michael Cooper', 'michaelcooper93'),
  (94, 'named-0094', 'name94@calabi.com', 'Chloe Mitchell', 'chloemitchell94'),
  (95, 'named-0095', 'name95@calabi.com', 'Josiah Miller', 'josiahmiller95'),
  (96, 'named-0096', 'name96@calabi.com', 'Hazel Wilson', 'hazelwilson96'),
  (97, 'named-0097', 'name97@calabi.com', 'Liam Collins', 'liamcollins97'),
  (98, 'named-0098', 'name98@calabi.com', 'Sofia Moore', 'sofiamoore98'),
  (99, 'named-0099', 'name99@calabi.com', 'Gabriel Ross', 'gabrielross99'),
  (100, 'named-0100', 'name100@calabi.com', 'Aurora Murray', 'auroramurray100'),
  (101, 'named-0101', 'name101@calabi.com', 'David Reynolds', 'davidreynolds101'),
  (102, 'named-0102', 'name102@calabi.com', 'Avery Bailey', 'averybailey102'),
  (103, 'named-0103', 'name103@calabi.com', 'David Allen', 'davidallen103'),
  (104, 'named-0104', 'name104@calabi.com', 'Layla Fisher', 'laylafisher104'),
  (105, 'named-0105', 'name105@calabi.com', 'Atlas Stewart', 'atlasstewart105'),
  (106, 'named-0106', 'name106@calabi.com', 'Ava Russell', 'avarussell106'),
  (107, 'named-0107', 'name107@calabi.com', 'Aria Edwards', 'ariaedwards107'),
  (108, 'named-0108', 'name108@calabi.com', 'Julian Nelson', 'juliannelson108'),
  (109, 'named-0109', 'name109@calabi.com', 'James Miller', 'jamesmiller109'),
  (110, 'named-0110', 'name110@calabi.com', 'Theo White', 'theowhite110'),
  (111, 'named-0111', 'name111@calabi.com', 'Josiah Williams', 'josiahwilliams111'),
  (112, 'named-0112', 'name112@calabi.com', 'Santiago Gray', 'santiagogray112'),
  (113, 'named-0113', 'name113@calabi.com', 'Evelyn Stewart', 'evelynstewart113'),
  (114, 'named-0114', 'name114@calabi.com', 'Asher Carter', 'ashercarter114'),
  (115, 'named-0115', 'name115@calabi.com', 'Liam Thompson', 'liamthompson115'),
  (116, 'named-0116', 'name116@calabi.com', 'Josiah Schmidt', 'josiahschmidt116'),
  (117, 'named-0117', 'name117@calabi.com', 'Delilah Sullivan', 'delilahsullivan117'),
  (118, 'named-0118', 'name118@calabi.com', 'Evelyn Wagner', 'evelynwagner118'),
  (119, 'named-0119', 'name119@calabi.com', 'Leilani Scott', 'leilaniscott119'),
  (120, 'named-0120', 'name120@calabi.com', 'Leilani Foster', 'leilanifoster120'),
  (121, 'named-0121', 'name121@calabi.com', 'Hudson Fitzgerald', 'hudsonfitzgerald121'),
  (122, 'named-0122', 'name122@calabi.com', 'Rowan Myers', 'rowanmyers122'),
  (123, 'named-0123', 'name123@calabi.com', 'Julian Jackson', 'julianjackson123'),
  (124, 'named-0124', 'name124@calabi.com', 'Ella Martin', 'ellamartin124'),
  (125, 'named-0125', 'name125@calabi.com', 'William Davis', 'williamdavis125'),
  (126, 'named-0126', 'name126@calabi.com', 'Paisley Schmidt', 'paisleyschmidt126'),
  (127, 'named-0127', 'name127@calabi.com', 'Mila West', 'milawest127'),
  (128, 'named-0128', 'name128@calabi.com', 'Elena Fisher', 'elenafisher128'),
  (129, 'named-0129', 'name129@calabi.com', 'Gianna Coleman', 'giannacoleman129'),
  (130, 'named-0130', 'name130@calabi.com', 'Thomas Simmons', 'thomassimmons130'),
  (131, 'named-0131', 'name131@calabi.com', 'Wyatt Ross', 'wyattross131'),
  (132, 'named-0132', 'name132@calabi.com', 'Liam Robinson', 'liamrobinson132'),
  (133, 'named-0133', 'name133@calabi.com', 'Josiah Russell', 'josiahrussell133'),
  (134, 'named-0134', 'name134@calabi.com', 'Noah Fox', 'noahfox134'),
  (135, 'named-0135', 'name135@calabi.com', 'Harper Foster', 'harperfoster135'),
  (136, 'named-0136', 'name136@calabi.com', 'Ivy Harrison', 'ivyharrison136'),
  (137, 'named-0137', 'name137@calabi.com', 'Hudson Brooks', 'hudsonbrooks137'),
  (138, 'named-0138', 'name138@calabi.com', 'Evelyn Henderson', 'evelynhenderson138'),
  (139, 'named-0139', 'name139@calabi.com', 'Sofia Smith', 'sofiasmith139'),
  (140, 'named-0140', 'name140@calabi.com', 'Gabriel Green', 'gabrielgreen140'),
  (141, 'named-0141', 'name141@calabi.com', 'Theo Hayes', 'theohayes141'),
  (142, 'named-0142', 'name142@calabi.com', 'Thomas Cook', 'thomascook142'),
  (143, 'named-0143', 'name143@calabi.com', 'Harper Thomas', 'harperthomas143'),
  (144, 'named-0144', 'name144@calabi.com', 'Chloe Williams', 'chloewilliams144'),
  (145, 'named-0145', 'name145@calabi.com', 'Luna Fisher', 'lunafisher145'),
  (146, 'named-0146', 'name146@calabi.com', 'David Johnson', 'davidjohnson146'),
  (147, 'named-0147', 'name147@calabi.com', 'Isaiah Kelly', 'isaiahkelly147'),
  (148, 'named-0148', 'name148@calabi.com', 'Ellie Perry', 'ellieperry148'),
  (149, 'named-0149', 'name149@calabi.com', 'Ellie Roberts', 'ellieroberts149'),
  (150, 'named-0150', 'name150@calabi.com', 'Penelope Parker', 'penelopeparker150'),
  (151, 'named-0151', 'name151@calabi.com', 'Scarlett Fitzgerald', 'scarlettfitzgerald151'),
  (152, 'named-0152', 'name152@calabi.com', 'Elias Cox', 'eliascox152'),
  (153, 'named-0153', 'name153@calabi.com', 'Penelope Wilson', 'penelopewilson153'),
  (154, 'named-0154', 'name154@calabi.com', 'Sofia Hayes', 'sofiahayes154'),
  (155, 'named-0155', 'name155@calabi.com', 'Elizabeth Powell', 'elizabethpowell155'),
  (156, 'named-0156', 'name156@calabi.com', 'Leilani Roberts', 'leilaniroberts156'),
  (157, 'named-0157', 'name157@calabi.com', 'Mason Hall', 'masonhall157'),
  (158, 'named-0158', 'name158@calabi.com', 'Levi Baker', 'levibaker158'),
  (159, 'named-0159', 'name159@calabi.com', 'William Sullivan', 'williamsullivan159'),
  (160, 'named-0160', 'name160@calabi.com', 'David Hamilton', 'davidhamilton160'),
  (161, 'named-0161', 'name161@calabi.com', 'Silas Mitchell', 'silasmitchell161'),
  (162, 'named-0162', 'name162@calabi.com', 'Hazel Cox', 'hazelcox162'),
  (163, 'named-0163', 'name163@calabi.com', 'Weston Phillips', 'westonphillips163'),
  (164, 'named-0164', 'name164@calabi.com', 'Levi Cook', 'levicook164'),
  (165, 'named-0165', 'name165@calabi.com', 'Leo Campbell', 'leocampbell165'),
  (166, 'named-0166', 'name166@calabi.com', 'Lucy Sanders', 'lucysanders166'),
  (167, 'named-0167', 'name167@calabi.com', 'James Mitchell', 'jamesmitchell167'),
  (168, 'named-0168', 'name168@calabi.com', 'Luna Collins', 'lunacollins168'),
  (169, 'named-0169', 'name169@calabi.com', 'Alexander Baker', 'alexanderbaker169'),
  (170, 'named-0170', 'name170@calabi.com', 'Ivy Coleman', 'ivycoleman170'),
  (171, 'named-0171', 'name171@calabi.com', 'Asher Bailey', 'asherbailey171'),
  (172, 'named-0172', 'name172@calabi.com', 'Owen Brooks', 'owenbrooks172'),
  (173, 'named-0173', 'name173@calabi.com', 'Luke Henderson', 'lukehenderson173'),
  (174, 'named-0174', 'name174@calabi.com', 'Noah Baker', 'noahbaker174'),
  (175, 'named-0175', 'name175@calabi.com', 'Oliver Clark', 'oliverclark175'),
  (176, 'named-0176', 'name176@calabi.com', 'Riley Smith', 'rileysmith176'),
  (177, 'named-0177', 'name177@calabi.com', 'Naomi Phillips', 'naomiphillips177'),
  (178, 'named-0178', 'name178@calabi.com', 'Benjamin Cooper', 'benjamincooper178'),
  (179, 'named-0179', 'name179@calabi.com', 'Carter Davis', 'carterdavis179'),
  (180, 'named-0180', 'name180@calabi.com', 'Thomas Wagner', 'thomaswagner180'),
  (181, 'named-0181', 'name181@calabi.com', 'Henry Miller', 'henrymiller181'),
  (182, 'named-0182', 'name182@calabi.com', 'Wyatt Hughes', 'wyatthughes182'),
  (183, 'named-0183', 'name183@calabi.com', 'Cooper Howard', 'cooperhoward183'),
  (184, 'named-0184', 'name184@calabi.com', 'Aurora Cook', 'auroracook184'),
  (185, 'named-0185', 'name185@calabi.com', 'Avery Campbell', 'averycampbell185'),
  (186, 'named-0186', 'name186@calabi.com', 'Riley Powell', 'rileypowell186'),
  (187, 'named-0187', 'name187@calabi.com', 'Josiah Ross', 'josiahross187'),
  (188, 'named-0188', 'name188@calabi.com', 'Daniel Reynolds', 'danielreynolds188'),
  (189, 'named-0189', 'name189@calabi.com', 'Iris Rogers', 'irisrogers189'),
  (190, 'named-0190', 'name190@calabi.com', 'Oliver Howard', 'oliverhoward190'),
  (191, 'named-0191', 'name191@calabi.com', 'Mason Miller', 'masonmiller191'),
  (192, 'named-0192', 'name192@calabi.com', 'Gabriel Baker', 'gabrielbaker192'),
  (193, 'named-0193', 'name193@calabi.com', 'Mason Rogers', 'masonrogers193'),
  (194, 'named-0194', 'name194@calabi.com', 'Layla Bryant', 'laylabryant194'),
  (195, 'named-0195', 'name195@calabi.com', 'Iris Young', 'irisyoung195'),
  (196, 'named-0196', 'name196@calabi.com', 'Delilah Allen', 'delilahallen196'),
  (197, 'named-0197', 'name197@calabi.com', 'Liam Simmons', 'liamsimmons197'),
  (198, 'named-0198', 'name198@calabi.com', 'Evelyn Richardson', 'evelynrichardson198'),
  (199, 'named-0199', 'name199@calabi.com', 'Levi Rogers', 'levirogers199'),
  (200, 'named-0200', 'name200@calabi.com', 'Eleanor Bennett', 'eleanorbennett200'),
  (201, 'named-0201', 'name201@calabi.com', 'Olivia Lewis', 'olivialewis201'),
  (202, 'named-0202', 'name202@calabi.com', 'Theo Harrison', 'theoharrison202'),
  (203, 'named-0203', 'name203@calabi.com', 'Aria Young', 'ariayoung203'),
  (204, 'named-0204', 'name204@calabi.com', 'Amelia Hill', 'ameliahill204'),
  (205, 'named-0205', 'name205@calabi.com', 'Wyatt Murphy', 'wyattmurphy205'),
  (206, 'named-0206', 'name206@calabi.com', 'Sofia Bryant', 'sofiabryant206'),
  (207, 'named-0207', 'name207@calabi.com', 'Ezekiel Price', 'ezekielprice207'),
  (208, 'named-0208', 'name208@calabi.com', 'Lainey Jackson', 'laineyjackson208'),
  (209, 'named-0209', 'name209@calabi.com', 'Elias Fitzgerald', 'eliasfitzgerald209'),
  (210, 'named-0210', 'name210@calabi.com', 'Gabriel Reed', 'gabrielreed210'),
  (211, 'named-0211', 'name211@calabi.com', 'Elena Wood', 'elenawood211'),
  (212, 'named-0212', 'name212@calabi.com', 'Michael Smith', 'michaelsmith212'),
  (213, 'named-0213', 'name213@calabi.com', 'Matthew Davis', 'matthewdavis213'),
  (214, 'named-0214', 'name214@calabi.com', 'Atlas Jordan', 'atlasjordan214'),
  (215, 'named-0215', 'name215@calabi.com', 'Maverick Wallace', 'maverickwallace215'),
  (216, 'named-0216', 'name216@calabi.com', 'Ella Fitzgerald', 'ellafitzgerald216'),
  (217, 'named-0217', 'name217@calabi.com', 'Ezekiel King', 'ezekielking217'),
  (218, 'named-0218', 'name218@calabi.com', 'Daniel Coleman', 'danielcoleman218'),
  (219, 'named-0219', 'name219@calabi.com', 'Ella Walker', 'ellawalker219'),
  (220, 'named-0220', 'name220@calabi.com', 'Paisley White', 'paisleywhite220'),
  (221, 'named-0221', 'name221@calabi.com', 'Elijah Sanders', 'elijahsanders221'),
  (222, 'named-0222', 'name222@calabi.com', 'Thomas Harris', 'thomasharris222'),
  (223, 'named-0223', 'name223@calabi.com', 'Elizabeth Hayes', 'elizabethhayes223'),
  (224, 'named-0224', 'name224@calabi.com', 'Muhammad Bryant', 'muhammadbryant224'),
  (225, 'named-0225', 'name225@calabi.com', 'Chloe Simmons', 'chloesimmons225'),
  (226, 'named-0226', 'name226@calabi.com', 'Elizabeth Roberts', 'elizabethroberts226'),
  (227, 'named-0227', 'name227@calabi.com', 'Ethan Green', 'ethangreen227'),
  (228, 'named-0228', 'name228@calabi.com', 'Ella Cook', 'ellacook228'),
  (229, 'named-0229', 'name229@calabi.com', 'Elena Thomas', 'elenathomas229'),
  (230, 'named-0230', 'name230@calabi.com', 'Weston Smith', 'westonsmith230'),
  (231, 'named-0231', 'name231@calabi.com', 'Wyatt Henderson', 'wyatthenderson231'),
  (232, 'named-0232', 'name232@calabi.com', 'Julian Clark', 'julianclark232'),
  (233, 'named-0233', 'name233@calabi.com', 'Luke Edwards', 'lukeedwards233'),
  (234, 'named-0234', 'name234@calabi.com', 'Liam Russell', 'liamrussell234'),
  (235, 'named-0235', 'name235@calabi.com', 'Santiago Ellis', 'santiagoellis235'),
  (236, 'named-0236', 'name236@calabi.com', 'Daniel Stewart', 'danielstewart236'),
  (237, 'named-0237', 'name237@calabi.com', 'Elijah Young', 'elijahyoung237'),
  (238, 'named-0238', 'name238@calabi.com', 'Santiago Reed', 'santiagoreed238'),
  (239, 'named-0239', 'name239@calabi.com', 'Leilani Fox', 'leilanifox239'),
  (240, 'named-0240', 'name240@calabi.com', 'Luca Allen', 'lucaallen240'),
  (241, 'named-0241', 'name241@calabi.com', 'Luna Evans', 'lunaevans241'),
  (242, 'named-0242', 'name242@calabi.com', 'James Bailey', 'jamesbailey242'),
  (243, 'named-0243', 'name243@calabi.com', 'Lily Cooper', 'lilycooper243'),
  (244, 'named-0244', 'name244@calabi.com', 'Emilia White', 'emiliawhite244'),
  (245, 'named-0245', 'name245@calabi.com', 'Carter Robinson', 'carterrobinson245'),
  (246, 'named-0246', 'name246@calabi.com', 'Daniel Perry', 'danielperry246'),
  (247, 'named-0247', 'name247@calabi.com', 'Valentina West', 'valentinawest247'),
  (248, 'named-0248', 'name248@calabi.com', 'Theo Fitzgerald', 'theofitzgerald248'),
  (249, 'named-0249', 'name249@calabi.com', 'Nora Kelly', 'norakelly249'),
  (250, 'named-0250', 'name250@calabi.com', 'James Fitzgerald', 'jamesfitzgerald250'),
  (251, 'named-0251', 'name251@calabi.com', 'Asher Reynolds', 'asherreynolds251'),
  (252, 'named-0252', 'name252@calabi.com', 'Violet Long', 'violetlong252'),
  (253, 'named-0253', 'name253@calabi.com', 'Michael Morgan', 'michaelmorgan253'),
  (254, 'named-0254', 'name254@calabi.com', 'Wyatt Lewis', 'wyattlewis254'),
  (255, 'named-0255', 'name255@calabi.com', 'Eleanor Mitchell', 'eleanormitchell255'),
  (256, 'named-0256', 'name256@calabi.com', 'Asher Morris', 'ashermorris256'),
  (257, 'named-0257', 'name257@calabi.com', 'Luna Russell', 'lunarussell257'),
  (258, 'named-0258', 'name258@calabi.com', 'Layla Jackson', 'laylajackson258'),
  (259, 'named-0259', 'name259@calabi.com', 'Paisley Johnson', 'paisleyjohnson259'),
  (260, 'named-0260', 'name260@calabi.com', 'Daniel Long', 'daniellong260'),
  (261, 'named-0261', 'name261@calabi.com', 'Leilani Lewis', 'leilanilewis261'),
  (262, 'named-0262', 'name262@calabi.com', 'Ezekiel Wagner', 'ezekielwagner262'),
  (263, 'named-0263', 'name263@calabi.com', 'Amara James', 'amarajames263'),
  (264, 'named-0264', 'name264@calabi.com', 'Valentina Green', 'valentinagreen264'),
  (265, 'named-0265', 'name265@calabi.com', 'Harper Morgan', 'harpermorgan265'),
  (266, 'named-0266', 'name266@calabi.com', 'Charlotte Cox', 'charlottecox266'),
  (267, 'named-0267', 'name267@calabi.com', 'Ella Wallace', 'ellawallace267'),
  (268, 'named-0268', 'name268@calabi.com', 'Ella Barnes', 'ellabarnes268'),
  (269, 'named-0269', 'name269@calabi.com', 'Nora Edwards', 'noraedwards269'),
  (270, 'named-0270', 'name270@calabi.com', 'Asher Nelson', 'ashernelson270'),
  (271, 'named-0271', 'name271@calabi.com', 'Gabriel Thompson', 'gabrielthompson271'),
  (272, 'named-0272', 'name272@calabi.com', 'Nova Cole', 'novacole272'),
  (273, 'named-0273', 'name273@calabi.com', 'Layla Murray', 'laylamurray273'),
  (274, 'named-0274', 'name274@calabi.com', 'Jack Schmidt', 'jackschmidt274'),
  (275, 'named-0275', 'name275@calabi.com', 'Elizabeth Hall', 'elizabethhall275'),
  (276, 'named-0276', 'name276@calabi.com', 'Eliana Brown', 'elianabrown276'),
  (277, 'named-0277', 'name277@calabi.com', 'Emilia Ward', 'emiliaward277'),
  (278, 'named-0278', 'name278@calabi.com', 'Muhammad Harrison', 'muhammadharrison278'),
  (279, 'named-0279', 'name279@calabi.com', 'Ava Lewis', 'avalewis279'),
  (280, 'named-0280', 'name280@calabi.com', 'Camila Cox', 'camilacox280'),
  (281, 'named-0281', 'name281@calabi.com', 'Gabriel Miller', 'gabrielmiller281'),
  (282, 'named-0282', 'name282@calabi.com', 'Lucas Jenkins', 'lucasjenkins282'),
  (283, 'named-0283', 'name283@calabi.com', 'Camila Morgan', 'camilamorgan283'),
  (284, 'named-0284', 'name284@calabi.com', 'Julian Harris', 'julianharris284'),
  (285, 'named-0285', 'name285@calabi.com', 'Noah Evans', 'noahevans285'),
  (286, 'named-0286', 'name286@calabi.com', 'Ezekiel Evans', 'ezekielevans286'),
  (287, 'named-0287', 'name287@calabi.com', 'Santiago Parker', 'santiagoparker287'),
  (288, 'named-0288', 'name288@calabi.com', 'Camila Martin', 'camilamartin288'),
  (289, 'named-0289', 'name289@calabi.com', 'Atlas Adams', 'atlasadams289'),
  (290, 'named-0290', 'name290@calabi.com', 'Grayson Graham', 'graysongraham290'),
  (291, 'named-0291', 'name291@calabi.com', 'Lainey Brooks', 'laineybrooks291'),
  (292, 'named-0292', 'name292@calabi.com', 'Nova Barnes', 'novabarnes292'),
  (293, 'named-0293', 'name293@calabi.com', 'Julian Bryant', 'julianbryant293'),
  (294, 'named-0294', 'name294@calabi.com', 'Leo West', 'leowest294'),
  (295, 'named-0295', 'name295@calabi.com', 'Luna Phillips', 'lunaphillips295'),
  (296, 'named-0296', 'name296@calabi.com', 'Ivy Schmidt', 'ivyschmidt296'),
  (297, 'named-0297', 'name297@calabi.com', 'Penelope Graham', 'penelopegraham297'),
  (298, 'named-0298', 'name298@calabi.com', 'Wyatt Phillips', 'wyattphillips298'),
  (299, 'named-0299', 'name299@calabi.com', 'Benjamin Cole', 'benjamincole299'),
  (300, 'named-0300', 'name300@calabi.com', 'Santiago Price', 'santiagoprice300'),
  (301, 'named-0301', 'name301@calabi.com', 'Samuel Walker', 'samuelwalker301'),
  (302, 'named-0302', 'name302@calabi.com', 'Luke Fox', 'lukefox302'),
  (303, 'named-0303', 'name303@calabi.com', 'Rowan Anderson', 'rowananderson303'),
  (304, 'named-0304', 'name304@calabi.com', 'Layla Harris', 'laylaharris304'),
  (305, 'named-0305', 'name305@calabi.com', 'Ayla Bennett', 'aylabennett305'),
  (306, 'named-0306', 'name306@calabi.com', 'Emma Hill', 'emmahill306'),
  (307, 'named-0307', 'name307@calabi.com', 'Camila Moore', 'camilamoore307'),
  (308, 'named-0308', 'name308@calabi.com', 'Weston Jackson', 'westonjackson308'),
  (309, 'named-0309', 'name309@calabi.com', 'Valentina Harrison', 'valentinaharrison309'),
  (310, 'named-0310', 'name310@calabi.com', 'Luna James', 'lunajames310'),
  (311, 'named-0311', 'name311@calabi.com', 'Isabella James', 'isabellajames311'),
  (312, 'named-0312', 'name312@calabi.com', 'Luke Watson', 'lukewatson312'),
  (313, 'named-0313', 'name313@calabi.com', 'Luna Richardson', 'lunarichardson313'),
  (314, 'named-0314', 'name314@calabi.com', 'Carter Collins', 'cartercollins314'),
  (315, 'named-0315', 'name315@calabi.com', 'Matthew Morgan', 'matthewmorgan315'),
  (316, 'named-0316', 'name316@calabi.com', 'Ellie Morris', 'elliemorris316'),
  (317, 'named-0317', 'name317@calabi.com', 'Lily Hughes', 'lilyhughes317'),
  (318, 'named-0318', 'name318@calabi.com', 'Thomas Cole', 'thomascole318'),
  (319, 'named-0319', 'name319@calabi.com', 'Theo Hughes', 'theohughes319'),
  (320, 'named-0320', 'name320@calabi.com', 'Charlotte Barnes', 'charlottebarnes320'),
  (321, 'named-0321', 'name321@calabi.com', 'Leo Brooks', 'leobrooks321'),
  (322, 'named-0322', 'name322@calabi.com', 'Paisley Mitchell', 'paisleymitchell322'),
  (323, 'named-0323', 'name323@calabi.com', 'Henry Ward', 'henryward323'),
  (324, 'named-0324', 'name324@calabi.com', 'Naomi Turner', 'naomiturner324'),
  (325, 'named-0325', 'name325@calabi.com', 'Leilani James', 'leilanijames325'),
  (326, 'named-0326', 'name326@calabi.com', 'Samuel Cox', 'samuelcox326'),
  (327, 'named-0327', 'name327@calabi.com', 'Leo Young', 'leoyoung327'),
  (328, 'named-0328', 'name328@calabi.com', 'William Smith', 'williamsmith328'),
  (329, 'named-0329', 'name329@calabi.com', 'Benjamin Cox', 'benjamincox329'),
  (330, 'named-0330', 'name330@calabi.com', 'Levi Reynolds', 'levireynolds330'),
  (331, 'named-0331', 'name331@calabi.com', 'Jack Jenkins', 'jackjenkins331'),
  (332, 'named-0332', 'name332@calabi.com', 'Penelope Cook', 'penelopecook332'),
  (333, 'named-0333', 'name333@calabi.com', 'Lily Scott', 'lilyscott333'),
  (334, 'named-0334', 'name334@calabi.com', 'Matthew Walker', 'matthewwalker334'),
  (335, 'named-0335', 'name335@calabi.com', 'Violet Murray', 'violetmurray335'),
  (336, 'named-0336', 'name336@calabi.com', 'Leilani Myers', 'leilanimyers336'),
  (337, 'named-0337', 'name337@calabi.com', 'Riley Wallace', 'rileywallace337'),
  (338, 'named-0338', 'name338@calabi.com', 'Noah Scott', 'noahscott338'),
  (339, 'named-0339', 'name339@calabi.com', 'Lucy Owens', 'lucyowens339'),
  (340, 'named-0340', 'name340@calabi.com', 'Lucas Scott', 'lucasscott340'),
  (341, 'named-0341', 'name341@calabi.com', 'Grayson Morris', 'graysonmorris341'),
  (342, 'named-0342', 'name342@calabi.com', 'Aurora Ross', 'auroraross342'),
  (343, 'named-0343', 'name343@calabi.com', 'Olivia Brooks', 'oliviabrooks343'),
  (344, 'named-0344', 'name344@calabi.com', 'Grayson Perry', 'graysonperry344'),
  (345, 'named-0345', 'name345@calabi.com', 'Layla Nelson', 'laylanelson345'),
  (346, 'named-0346', 'name346@calabi.com', 'Owen Adams', 'owenadams346'),
  (347, 'named-0347', 'name347@calabi.com', 'Aria Owens', 'ariaowens347'),
  (348, 'named-0348', 'name348@calabi.com', 'Theo Edwards', 'theoedwards348'),
  (349, 'named-0349', 'name349@calabi.com', 'Nora Moore', 'noramoore349'),
  (350, 'named-0350', 'name350@calabi.com', 'Chloe Bailey', 'chloebailey350'),
  (351, 'named-0351', 'name351@calabi.com', 'Ivy Barnes', 'ivybarnes351'),
  (352, 'named-0352', 'name352@calabi.com', 'Chloe Long', 'chloelong352'),
  (353, 'named-0353', 'name353@calabi.com', 'Paisley Davis', 'paisleydavis353'),
  (354, 'named-0354', 'name354@calabi.com', 'Charlotte Coleman', 'charlottecoleman354'),
  (355, 'named-0355', 'name355@calabi.com', 'William Bryant', 'williambryant355'),
  (356, 'named-0356', 'name356@calabi.com', 'Riley Brooks', 'rileybrooks356'),
  (357, 'named-0357', 'name357@calabi.com', 'David Howard', 'davidhoward357'),
  (358, 'named-0358', 'name358@calabi.com', 'Zoe Sullivan', 'zoesullivan358'),
  (359, 'named-0359', 'name359@calabi.com', 'Charlotte Allen', 'charlotteallen359'),
  (360, 'named-0360', 'name360@calabi.com', 'David Brown', 'davidbrown360'),
  (361, 'named-0361', 'name361@calabi.com', 'James Jackson', 'jamesjackson361'),
  (362, 'named-0362', 'name362@calabi.com', 'Penelope Simmons', 'penelopesimmons362'),
  (363, 'named-0363', 'name363@calabi.com', 'Lily Graham', 'lilygraham363'),
  (364, 'named-0364', 'name364@calabi.com', 'Santiago Turner', 'santiagoturner364'),
  (365, 'named-0365', 'name365@calabi.com', 'Charlotte Myers', 'charlottemyers365'),
  (366, 'named-0366', 'name366@calabi.com', 'Hudson Murphy', 'hudsonmurphy366'),
  (367, 'named-0367', 'name367@calabi.com', 'Emilia Parker', 'emiliaparker367'),
  (368, 'named-0368', 'name368@calabi.com', 'Scarlett Kelly', 'scarlettkelly368'),
  (369, 'named-0369', 'name369@calabi.com', 'David Nelson', 'davidnelson369'),
  (370, 'named-0370', 'name370@calabi.com', 'Ivy Jenkins', 'ivyjenkins370'),
  (371, 'named-0371', 'name371@calabi.com', 'Emma Reynolds', 'emmareynolds371'),
  (372, 'named-0372', 'name372@calabi.com', 'Lily Ross', 'lilyross372'),
  (373, 'named-0373', 'name373@calabi.com', 'Gabriel Cook', 'gabrielcook373'),
  (374, 'named-0374', 'name374@calabi.com', 'Weston Gray', 'westongray374'),
  (375, 'named-0375', 'name375@calabi.com', 'Nora Robinson', 'norarobinson375'),
  (376, 'named-0376', 'name376@calabi.com', 'Naomi Morris', 'naomimorris376'),
  (377, 'named-0377', 'name377@calabi.com', 'Chloe Murphy', 'chloemurphy377'),
  (378, 'named-0378', 'name378@calabi.com', 'Alexander Wright', 'alexanderwright378'),
  (379, 'named-0379', 'name379@calabi.com', 'Luke Mitchell', 'lukemitchell379'),
  (380, 'named-0380', 'name380@calabi.com', 'Grayson Sullivan', 'graysonsullivan380'),
  (381, 'named-0381', 'name381@calabi.com', 'William Green', 'williamgreen381'),
  (382, 'named-0382', 'name382@calabi.com', 'David James', 'davidjames382'),
  (383, 'named-0383', 'name383@calabi.com', 'Asher Baker', 'asherbaker383'),
  (384, 'named-0384', 'name384@calabi.com', 'Julian Martin', 'julianmartin384'),
  (385, 'named-0385', 'name385@calabi.com', 'Ellie Brown', 'elliebrown385'),
  (386, 'named-0386', 'name386@calabi.com', 'Samuel Patterson', 'samuelpatterson386'),
  (387, 'named-0387', 'name387@calabi.com', 'Camila Young', 'camilayoung387'),
  (388, 'named-0388', 'name388@calabi.com', 'Ezra Jackson', 'ezrajackson388'),
  (389, 'named-0389', 'name389@calabi.com', 'Elizabeth Murphy', 'elizabethmurphy389'),
  (390, 'named-0390', 'name390@calabi.com', 'Leilani Cole', 'leilanicole390'),
  (391, 'named-0391', 'name391@calabi.com', 'Rowan Richardson', 'rowanrichardson391'),
  (392, 'named-0392', 'name392@calabi.com', 'Gabriel Thomas', 'gabrielthomas392'),
  (393, 'named-0393', 'name393@calabi.com', 'Ayla Murphy', 'aylamurphy393'),
  (394, 'named-0394', 'name394@calabi.com', 'Samuel Hughes', 'samuelhughes394'),
  (395, 'named-0395', 'name395@calabi.com', 'Elijah Simmons', 'elijahsimmons395'),
  (396, 'named-0396', 'name396@calabi.com', 'Leo Jordan', 'leojordan396'),
  (397, 'named-0397', 'name397@calabi.com', 'Muhammad Johnson', 'muhammadjohnson397'),
  (398, 'named-0398', 'name398@calabi.com', 'Ayla White', 'aylawhite398'),
  (399, 'named-0399', 'name399@calabi.com', 'Leilani Hamilton', 'leilanihamilton399'),
  (400, 'named-0400', 'name400@calabi.com', 'Lily Rogers', 'lilyrogers400'),
  (401, 'named-0401', 'name401@calabi.com', 'Owen Campbell', 'owencampbell401'),
  (402, 'named-0402', 'name402@calabi.com', 'Hudson Bennett', 'hudsonbennett402'),
  (403, 'named-0403', 'name403@calabi.com', 'Sophia Brooks', 'sophiabrooks403'),
  (404, 'named-0404', 'name404@calabi.com', 'William Murphy', 'williammurphy404'),
  (405, 'named-0405', 'name405@calabi.com', 'Hazel Powell', 'hazelpowell405'),
  (406, 'named-0406', 'name406@calabi.com', 'Asher Brooks', 'asherbrooks406'),
  (407, 'named-0407', 'name407@calabi.com', 'Avery Johnson', 'averyjohnson407'),
  (408, 'named-0408', 'name408@calabi.com', 'Carter Coleman', 'cartercoleman408'),
  (409, 'named-0409', 'name409@calabi.com', 'Carter Reed', 'carterreed409'),
  (410, 'named-0410', 'name410@calabi.com', 'James Howard', 'jameshoward410'),
  (411, 'named-0411', 'name411@calabi.com', 'Olivia Miller', 'oliviamiller411'),
  (412, 'named-0412', 'name412@calabi.com', 'Alexander West', 'alexanderwest412'),
  (413, 'named-0413', 'name413@calabi.com', 'Leo Hall', 'leohall413'),
  (414, 'named-0414', 'name414@calabi.com', 'Oliver Campbell', 'olivercampbell414'),
  (415, 'named-0415', 'name415@calabi.com', 'Zoe Morgan', 'zoemorgan415'),
  (416, 'named-0416', 'name416@calabi.com', 'Willow Cole', 'willowcole416'),
  (417, 'named-0417', 'name417@calabi.com', 'David Ford', 'davidford417'),
  (418, 'named-0418', 'name418@calabi.com', 'Grayson West', 'graysonwest418'),
  (419, 'named-0419', 'name419@calabi.com', 'Camila Taylor', 'camilataylor419'),
  (420, 'named-0420', 'name420@calabi.com', 'James Price', 'jamesprice420'),
  (421, 'named-0421', 'name421@calabi.com', 'Charlotte Fisher', 'charlottefisher421'),
  (422, 'named-0422', 'name422@calabi.com', 'David Baker', 'davidbaker422'),
  (423, 'named-0423', 'name423@calabi.com', 'David Russell', 'davidrussell423'),
  (424, 'named-0424', 'name424@calabi.com', 'Rowan West', 'rowanwest424'),
  (425, 'named-0425', 'name425@calabi.com', 'Hazel Anderson', 'hazelanderson425'),
  (426, 'named-0426', 'name426@calabi.com', 'Olivia Young', 'oliviayoung426'),
  (427, 'named-0427', 'name427@calabi.com', 'Paisley Campbell', 'paisleycampbell427'),
  (428, 'named-0428', 'name428@calabi.com', 'Mila Moore', 'milamoore428'),
  (429, 'named-0429', 'name429@calabi.com', 'Aurora Harris', 'auroraharris429'),
  (430, 'named-0430', 'name430@calabi.com', 'Mia Murray', 'miamurray430'),
  (431, 'named-0431', 'name431@calabi.com', 'Elena Owens', 'elenaowens431'),
  (432, 'named-0432', 'name432@calabi.com', 'Camila Foster', 'camilafoster432'),
  (433, 'named-0433', 'name433@calabi.com', 'Noah Walker', 'noahwalker433'),
  (434, 'named-0434', 'name434@calabi.com', 'Naomi Williams', 'naomiwilliams434'),
  (435, 'named-0435', 'name435@calabi.com', 'Elijah Coleman', 'elijahcoleman435'),
  (436, 'named-0436', 'name436@calabi.com', 'Evelyn Russell', 'evelynrussell436'),
  (437, 'named-0437', 'name437@calabi.com', 'Ayla Nelson', 'aylanelson437'),
  (438, 'named-0438', 'name438@calabi.com', 'Theo Evans', 'theoevans438'),
  (439, 'named-0439', 'name439@calabi.com', 'Isla Bryant', 'islabryant439'),
  (440, 'named-0440', 'name440@calabi.com', 'Scarlett White', 'scarlettwhite440'),
  (441, 'named-0441', 'name441@calabi.com', 'Elias Myers', 'eliasmyers441'),
  (442, 'named-0442', 'name442@calabi.com', 'Olivia Jenkins', 'oliviajenkins442'),
  (443, 'named-0443', 'name443@calabi.com', 'Isla Hill', 'islahill443'),
  (444, 'named-0444', 'name444@calabi.com', 'Ethan Ellis', 'ethanellis444'),
  (445, 'named-0445', 'name445@calabi.com', 'Aurora Carter', 'auroracarter445'),
  (446, 'named-0446', 'name446@calabi.com', 'Eleanor Fox', 'eleanorfox446'),
  (447, 'named-0447', 'name447@calabi.com', 'Rowan Brown', 'rowanbrown447'),
  (448, 'named-0448', 'name448@calabi.com', 'Emma Howard', 'emmahoward448'),
  (449, 'named-0449', 'name449@calabi.com', 'Violet Hall', 'violethall449'),
  (450, 'named-0450', 'name450@calabi.com', 'Mila Phillips', 'milaphillips450'),
  (451, 'named-0451', 'name451@calabi.com', 'Owen Wright', 'owenwright451'),
  (452, 'named-0452', 'name452@calabi.com', 'Ava Sullivan', 'avasullivan452'),
  (453, 'named-0453', 'name453@calabi.com', 'Benjamin Clark', 'benjaminclark453'),
  (454, 'named-0454', 'name454@calabi.com', 'Camila Barnes', 'camilabarnes454'),
  (455, 'named-0455', 'name455@calabi.com', 'Harper Graham', 'harpergraham455'),
  (456, 'named-0456', 'name456@calabi.com', 'Naomi Miller', 'naomimiller456'),
  (457, 'named-0457', 'name457@calabi.com', 'Luca Stewart', 'lucastewart457'),
  (458, 'named-0458', 'name458@calabi.com', 'Eleanor Hamilton', 'eleanorhamilton458'),
  (459, 'named-0459', 'name459@calabi.com', 'Olivia Morgan', 'oliviamorgan459'),
  (460, 'named-0460', 'name460@calabi.com', 'Emilia Harris', 'emiliaharris460'),
  (461, 'named-0461', 'name461@calabi.com', 'Sebastian Walker', 'sebastianwalker461'),
  (462, 'named-0462', 'name462@calabi.com', 'Lily Brown', 'lilybrown462'),
  (463, 'named-0463', 'name463@calabi.com', 'Lucas Hayes', 'lucashayes463'),
  (464, 'named-0464', 'name464@calabi.com', 'Nora Thomas', 'norathomas464'),
  (465, 'named-0465', 'name465@calabi.com', 'Owen Hill', 'owenhill465'),
  (466, 'named-0466', 'name466@calabi.com', 'Ayla Williams', 'aylawilliams466'),
  (467, 'named-0467', 'name467@calabi.com', 'Sophia Wood', 'sophiawood467')
on conflict (n) do update set
  id = excluded.id,
  email = excluded.email,
  display_name = excluded.display_name,
  handle = excluded.handle;

alter table public.vote_tallies enable row level security;
alter table public.live_lobby enable row level security;
alter table public.named_people enable row level security;
alter table public.named_watches enable row level security;
alter table public.named_activity_state enable row level security;

drop policy if exists "vote_tallies_select" on public.vote_tallies;
create policy "vote_tallies_select" on public.vote_tallies for select using (true);

drop policy if exists "live_lobby_select" on public.live_lobby;
create policy "live_lobby_select" on public.live_lobby for select using (true);
drop policy if exists "live_lobby_upsert" on public.live_lobby;
create policy "live_lobby_upsert" on public.live_lobby for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "live_lobby_update" on public.live_lobby;
create policy "live_lobby_update" on public.live_lobby for update
  using (auth.uid()::text = user_id);
drop policy if exists "live_lobby_delete" on public.live_lobby;
create policy "live_lobby_delete" on public.live_lobby for delete
  using (auth.uid()::text = user_id);

drop policy if exists "named_people_select" on public.named_people;
create policy "named_people_select" on public.named_people for select using (true);

create or replace function public.upsert_library_video(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vid text;
begin
  vid := payload->>'id';
  if vid is null or vid not like 'org-%' then
    raise exception 'library videos must use an org- id';
  end if;
  insert into public.videos (
    id, creator_id, handle, type, title, description,
    source_url, media_url, thumb_url, origin, hosted,
    duration_sec, tags, views, created_at
  ) values (
    vid,
    null,
    payload->>'handle',
    coalesce(nullif(payload->>'type', ''), 'video'),
    coalesce(nullif(payload->>'title', ''), 'Untitled'),
    coalesce(payload->>'description', ''),
    payload->>'source_url',
    payload->>'media_url',
    payload->>'thumb_url',
    coalesce(payload->>'origin', 'public-domain-org'),
    true,
    coalesce((payload->>'duration_sec')::numeric, 0),
    case
      when jsonb_typeof(payload->'tags') = 'array' then array(select jsonb_array_elements_text(payload->'tags'))
      else '{}'::text[]
    end,
    coalesce((payload->>'views')::bigint, 0),
    coalesce((payload->>'created_at')::timestamptz, now())
  )
  on conflict (id) do update set
    handle = excluded.handle,
    type = excluded.type,
    title = excluded.title,
    description = excluded.description,
    source_url = excluded.source_url,
    media_url = excluded.media_url,
    thumb_url = excluded.thumb_url,
    duration_sec = excluded.duration_sec,
    tags = excluded.tags;
end;
$$;

revoke all on function public.upsert_library_video(jsonb) from public;
grant execute on function public.upsert_library_video(jsonb) to anon, authenticated;

create or replace function public.run_named_activity(batch integer default 40)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n_people int;
  n_videos int;
  i int;
  pid text;
  cid text;
  vtype text;
  liked int;
  watched int;
  roll double precision;
  want text;
  live_id text;
begin
  if batch is null or batch < 1 then batch := 40; end if;
  if batch > 200 then batch := 200; end if;

  select count(*) into n_people from public.named_people;
  select count(*) into n_videos from public.videos;
  if n_people < 1 then return 0; end if;

  for i in 1..batch loop
    pid := null;
    cid := null;
    vtype := null;
    live_id := null;
    select id into pid from public.named_people
      offset floor(random() * n_people)::int
      limit 1;
    if pid is null then continue; end if;

    roll := random();

    if roll < 0.18 then
      select user_id into live_id
      from public.live_lobby
      where is_live = true
      order by random()
      limit 1;
      if live_id is not null then
        update public.live_lobby
        set watcher_ids = case
          when watcher_ids @> array[pid]::text[] then watcher_ids
          else array_append(watcher_ids, pid)
        end
        where user_id = live_id;
      end if;
      continue;
    end if;

    if n_videos < 1 then continue; end if;

    want := case
      when roll < 0.42 then 'pic'
      when roll < 0.72 then 'short'
      else 'video'
    end;

    select v.id, v.type into cid, vtype
    from public.videos v
    where v.type = want
      and not exists (
        select 1 from public.votes vo
        where vo.user_id = pid and vo.content_id = v.id
      )
    order by random()
    limit 1;

    if cid is null then
      select v.id, v.type into cid, vtype
      from public.videos v
      where v.type = want
      order by random()
      limit 1;
    end if;

    if cid is null then
      select v.id, v.type into cid, vtype
      from public.videos v
      order by random()
      limit 1;
    end if;

    if cid is null then continue; end if;

    insert into public.votes (user_id, content_id, direction)
    values (pid, cid, 'up')
    on conflict (user_id, content_id) do nothing;
    get diagnostics liked = row_count;
    if liked > 0 then
      insert into public.vote_tallies (content_id, up, down)
      values (cid, 1, 0)
      on conflict (content_id) do update set up = public.vote_tallies.up + 1;
      update public.videos
      set engagement = jsonb_set(
        coalesce(engagement, '{}'::jsonb),
        '{likes}',
        to_jsonb(coalesce((engagement->>'likes')::int, 0) + 1)
      )
      where id = cid;
    end if;

    insert into public.named_watches (user_id, content_id)
    values (pid, cid)
    on conflict (user_id, content_id) do nothing;
    get diagnostics watched = row_count;
    if watched > 0 then
      if vtype = 'short' then
        update public.videos
        set
          views = views + 1,
          engagement = jsonb_set(
            coalesce(engagement, '{}'::jsonb),
            '{loops}',
            to_jsonb(coalesce((engagement->>'loops')::int, 0) + 1)
          )
        where id = cid;
      else
        update public.videos
        set
          views = views + 1,
          engagement = jsonb_set(
            coalesce(engagement, '{}'::jsonb),
            '{completes}',
            to_jsonb(coalesce((engagement->>'completes')::int, 0) + 1)
          )
        where id = cid;
      end if;
    end if;

    if random() < 0.38 then
      select user_id into live_id
      from public.live_lobby
      where is_live = true
      order by random()
      limit 1;
      if live_id is not null then
        update public.live_lobby
        set watcher_ids = case
          when watcher_ids @> array[pid]::text[] then watcher_ids
          else array_append(watcher_ids, pid)
        end
        where user_id = live_id;
      end if;
    end if;
  end loop;

  return batch;
end;
$$;

revoke all on function public.run_named_activity(integer) from public;

do $cron$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'Turn on pg_cron under Database → Extensions, then re-run the schedule lines.';
  end;
  begin
    perform cron.unschedule('clips-named-activity');
  exception when others then
    null;
  end;
  begin
    perform cron.schedule('clips-named-activity', '15 seconds', 'select public.run_named_activity(40)');
  exception when others then
    raise notice 'pg_cron schedule failed. Enable the extension and run: select cron.schedule(''clips-named-activity'', ''15 seconds'', ''select public.run_named_activity(40)'');';
  end;
end
$cron$;
