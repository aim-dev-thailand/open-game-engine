-- สร้างฐานข้อมูล
-- CREATE DATABASE mmorpg_db;

-- ตารางผู้ใช้ (สำหรับระบบ Authentication)
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index สำหรับการค้นหา
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ตารางผู้เล่น (ข้อมูลในเกม)
CREATE TABLE players (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    x FLOAT DEFAULT 0,
    y FLOAT DEFAULT 0,
    hp INT DEFAULT 100,
    max_hp INT DEFAULT 100,
    mp INT DEFAULT 50,
    max_mp INT DEFAULT 50,

    -- Base Stats
    base_atk INT DEFAULT 20,
    base_def INT DEFAULT 10,
    accuracy FLOAT DEFAULT 0.9,
    evasion FLOAT DEFAULT 0.1,
    crit_rate FLOAT DEFAULT 0.05,
    move_speed FLOAT DEFAULT 2.0,

    -- Primary Stats (สถานะหลัก)
    str INT DEFAULT 5,  -- Strength - เพิ่มพลังโจมตีกายภาพ
    dex INT DEFAULT 5,  -- Dexterity - เพิ่มความแม่นยำและโจมตีทางไกล
    agi INT DEFAULT 5,  -- Agility - เพิ่มอัตราหลบหลีกและความเร็ว
    int INT DEFAULT 5,  -- Intelligence - เพิ่มพลังโจมตีเวทย์และ MP
    luk INT DEFAULT 5,  -- Luck - เพิ่มอัตราคริติคอลและ drop rate
    vit INT DEFAULT 5,  -- Vitality - เพิ่มพลังชีวิตและป้องกัน

    -- Leveling System
    level INT DEFAULT 1,
    current_exp INT DEFAULT 0,
    stat_points INT DEFAULT 0,  -- คะแนนสถานะที่ยังไม่ได้จัดสรร
    skill_points INT DEFAULT 0,

    last_updated TIMESTAMP DEFAULT NOW()
);

-- ตารางอาชีพ (Classes)
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- เงื่อนไขการเปลี่ยนอาชีพ
    min_level INT DEFAULT 1,
    quest_id INT, -- เควสที่ต้องทำเพื่อเปลี่ยนอาชีพ (foreign key จะถูกเพิ่มหลังจากสร้างตาราง quests)
    
    -- Base Stats ของอาชีพ
    str INT DEFAULT 5,  -- Strength
    dex INT DEFAULT 5,  -- Dexterity
    agi INT DEFAULT 5,  -- Agility
    vit INT DEFAULT 5,  -- Vitality
    int INT DEFAULT 5,  -- Intelligence
    luk INT DEFAULT 5,  -- Luck
    
    -- สถานะการต่อสู้ของอาชีพ
    hp INT DEFAULT 100,       -- พลังชีวิต
    atk INT DEFAULT 10,       -- พลังโจมตี
    def INT DEFAULT 5,        -- พลังป้องกัน
    matk INT DEFAULT 5,       -- พลังโจมตีเวทย์
    mdef INT DEFAULT 5,       -- พลังป้องกันเวทย์
    spd INT DEFAULT 5,        -- ความเร็ว (Attack Speed / Turn Speed)
    movespeed FLOAT DEFAULT 2.0, -- ความเร็วในการเคลื่อนที่
    evasion INT DEFAULT 10,   -- การหลบหลีก (%)
    accuracy INT DEFAULT 100, -- ความแม่นยำ (%)
    crit_rate INT DEFAULT 2,  -- อัตราคริติคอล (%)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- เพิ่มคอลัมน์ classes_id ในตาราง players
ALTER TABLE players ADD COLUMN classes_id INT REFERENCES classes(id);

-- ตารางเควส (สำหรับเงื่อนไขการเปลี่ยนอาชีพ)
CREATE TABLE quests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'class_change', -- 'class_change', 'main', 'side', 'daily'
    min_level INT DEFAULT 1,
    required_classes JSONB DEFAULT '[]'::jsonb, -- อาชีพที่ต้องการก่อนทำเควส
    rewards JSONB DEFAULT '{}'::jsonb, -- รางวัล (items, exp, gold, etc.)
    objectives JSONB DEFAULT '[]'::jsonb, -- เป้าหมายของเควส
    is_repeatable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- เพิ่ม foreign key constraint จาก classes ไปยัง quests
ALTER TABLE classes ADD CONSTRAINT fk_classes_quest_id FOREIGN KEY (quest_id) REFERENCES quests(id);

-- เพิ่มข้อมูลอาชีพพื้นฐาน "นักพจญภัย"
INSERT INTO classes (name, description, min_level, str, dex, agi, vit, int, luk, hp, atk, def, magic_atk, magic_def, evasion, accuracy, crit_rate)
VALUES (
    'นักพจญภัย',
    'อาชีพพื้นฐานสำหรับผู้เริ่มต้นผจญภัย',
    1,
    5,  -- str
    5,  -- dex
    5,  -- agi
    5,  -- vit
    5,  -- int
    5,  -- luk
    100, -- hp
    10,  -- atk
    5,   -- def
    5,   -- magic_atk
    5,   -- magic_def
    10,  -- evasion (%)
    100, -- accuracy (%)
    2    -- crit_rate (%)
);

-- ตารางสกิล
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_id VARCHAR(100),
    type VARCHAR(20) DEFAULT 'active',
    element VARCHAR(20) DEFAULT 'none',
    level_required INT DEFAULT 1,
    mp_cost INT DEFAULT 0,
    cooldown INT DEFAULT 0,
    cast_time FLOAT DEFAULT 0,
    range FLOAT DEFAULT 1.0,
    area_of_effect FLOAT DEFAULT 0,
    effects JSONB DEFAULT '[]'::jsonb,
    learnable_by JSONB DEFAULT '["warrior","mage","archer"]'::jsonb
);

-- ตารางสกิลของผู้เล่น
CREATE TABLE player_skills (
    player_id VARCHAR(64) REFERENCES players(id),
    skill_id INT REFERENCES skills(id),
    skill_level INT DEFAULT 1,
    PRIMARY KEY (player_id, skill_id)
);

-- ตารางมอนสเตอร์ (Template)
CREATE TABLE monster_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    sprite_id VARCHAR(100),
    base_hp INT,
    base_atk INT,
    move_speed FLOAT,
    accuracy FLOAT,
    evasion FLOAT,
    crit_rate FLOAT
);

-- ตารางจุดเกิดมอนสเตอร์
CREATE TABLE map_spawns (
    id SERIAL PRIMARY KEY,
    map_id INT NOT NULL,
    monster_template_id INT REFERENCES monster_templates(id),
    spawn_type VARCHAR(20), -- 'fixed' or 'random'
    pos_x FLOAT,
    pos_y FLOAT,
    radius FLOAT DEFAULT 0,
    max_count INT DEFAULT 5,
    respawn_time_sec INT DEFAULT 10
);

-- ตารางไอเทม
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),
    icon_id VARCHAR(50),
    description TEXT,
    rarity VARCHAR(20) DEFAULT 'common',
    value INT DEFAULT 0,
    stackable BOOLEAN DEFAULT FALSE,
    max_stack INT,
    stats JSONB DEFAULT '{}'::jsonb
);

-- ตารางคลังของ
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(64) REFERENCES players(id),
    item_id INT REFERENCES items(id),
    quantity INT DEFAULT 1,
    expiry_time TIMESTAMP -- สำหรับไอเทมชั่วคราว
);

-- ตารางอุปกรณ์ที่สวมใส่
CREATE TABLE equipment (
    player_id VARCHAR(64) REFERENCES players(id) PRIMARY KEY,
    main_hand INT REFERENCES items(id),
    off_hand INT REFERENCES items(id),
    head INT REFERENCES items(id),
    body INT REFERENCES items(id),
    cloak INT REFERENCES items(id),
    glasses INT REFERENCES items(id),
    mask INT REFERENCES items(id),
    shoes INT REFERENCES items(id)
);

-- ตารางแผนที่
CREATE TABLE maps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    width INT NOT NULL,
    height INT NOT NULL,
    tiles JSONB DEFAULT '[]'::jsonb, -- เก็บข้อมูล tile layers
    spawn_points JSONB DEFAULT '[]'::jsonb, -- จุด spawn ของผู้เล่น
    npcs JSONB DEFAULT '[]'::jsonb, -- ตำแหน่ง NPC ในแผนที่
    monsters JSONB DEFAULT '[]'::jsonb, -- ตำแหน่ง monster spawn
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ตารางชุด Tileset
CREATE TABLE tilesets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255), -- URL ของรูป tileset
    tile_width INT DEFAULT 32,
    tile_height INT DEFAULT 32,
    columns INT, -- จำนวนคอลัมน์ในรูป
    tile_count INT, -- จำนวน tiles ทั้งหมด
    properties JSONB DEFAULT '{}'::jsonb, -- คุณสมบัติเพิ่มเติม (collision, animation, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ตาราง Map-Tileset Relationship (แผนที่หนึ่งใช้ได้หลาย tileset)
CREATE TABLE map_tilesets (
    id SERIAL PRIMARY KEY,
    map_id INT REFERENCES maps(id) ON DELETE CASCADE,
    tileset_id INT REFERENCES tilesets(id) ON DELETE CASCADE,
    first_gid INT NOT NULL, -- Global ID แรกของ tileset นี้ในแผนที่
    UNIQUE(map_id, tileset_id)
);

-- ตาราง NPC
CREATE TABLE npcs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sprite_id VARCHAR(100),
    level INT DEFAULT 1,
    hp INT DEFAULT 100,
    max_hp INT DEFAULT 100,
    attack INT DEFAULT 10,
    defense INT DEFAULT 5,
    move_speed FLOAT DEFAULT 1.0,
    is_hostile BOOLEAN DEFAULT FALSE,
    can_trade BOOLEAN DEFAULT FALSE,
    can_quest BOOLEAN DEFAULT FALSE,
    dialogue JSONB DEFAULT '[]'::jsonb, -- บทสนทนา
    shop_items JSONB DEFAULT '[]'::jsonb, -- สินค้าที่ขาย (array of item_id)
    quests JSONB DEFAULT '[]'::jsonb, -- เควสที่ให้ (array of quest_id)
    position JSONB DEFAULT '{}'::jsonb, -- ตำแหน่งเริ่มต้น {x, y}
    map_id INT REFERENCES maps(id), -- แผนที่ที่อยู่
    
    -- เพิ่มเติม
    npc_type VARCHAR(20) DEFAULT 'monster', -- 'monster', 'shop', 'quest'
    crit_rate FLOAT DEFAULT 0.05,
    dodge_value FLOAT DEFAULT 0.0,
    hit_value FLOAT DEFAULT 0.0,
    attack_first BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ตารางประสบการณ์ต่อเลเวล (EXP Table)
CREATE TABLE level_exp_table (
    level INT PRIMARY KEY,
    exp_required INT NOT NULL,  -- EXP ที่ต้องการเพื่อขึ้นเลเวลนี้
    exp_cumulative INT NOT NULL,  -- EXP สะสมรวมจาก level 1
    stat_points_reward INT DEFAULT 5,  -- Stat points ที่ได้รับเมื่อขึ้นเลเวล
    skill_points_reward INT DEFAULT 1,  -- Skill points ที่ได้รับเมื่อขึ้นเลเวล
    created_at TIMESTAMP DEFAULT NOW()
);

-- สร้างข้อมูล EXP table สำหรับ level 1-100
-- สูตร: exp_required = 100 * level^1.5
INSERT INTO level_exp_table (level, exp_required, exp_cumulative, stat_points_reward, skill_points_reward)
SELECT
    level,
    FLOOR(100 * POWER(level, 1.5))::INT as exp_required,
    SUM(FLOOR(100 * POWER(i, 1.5))) OVER (ORDER BY level)::INT as exp_cumulative,
    5 as stat_points_reward,
    1 as skill_points_reward
FROM generate_series(1, 100) as level
CROSS JOIN LATERAL generate_series(1, level) as i
GROUP BY level
ORDER BY level;

-- ตารางสูตร EXP (สำหรับปรับแต่งสูตรในอนาคต)
CREATE TABLE exp_formula (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_exp INT DEFAULT 100,  -- ค่าพื้นฐาน
    exponent FLOAT DEFAULT 1.5,  -- เลขยกกำลัง
    multiplier FLOAT DEFAULT 1.0,  -- ตัวคูณ
    is_active BOOLEAN DEFAULT TRUE,  -- สูตรที่ใช้งานอยู่
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- เพิ่มสูตรเริ่มต้น
INSERT INTO exp_formula (name, description, base_exp, exponent, multiplier, is_active)
VALUES (
    'Default EXP Formula',
    'สูตรพื้นฐาน: exp = base_exp * level^exponent * multiplier',
    100,
    1.5,
    1.0,
    true
);

-- ตารางการเลเวลอัพของผู้เล่น (Level Up History)
CREATE TABLE player_level_history (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
    old_level INT NOT NULL,
    new_level INT NOT NULL,
    exp_gained INT NOT NULL,  -- EXP ที่ได้รับก่อนเลเวลอัพ
    stat_points_gained INT DEFAULT 5,
    skill_points_gained INT DEFAULT 1,
    leveled_up_at TIMESTAMP DEFAULT NOW()
);

-- Index สำหรับ performance
CREATE INDEX idx_maps_name ON maps(name);
CREATE INDEX idx_tilesets_name ON tilesets(name);
CREATE INDEX idx_npcs_map_id ON npcs(map_id);
CREATE INDEX idx_map_spawns_map_id ON map_spawns(map_id);
CREATE INDEX idx_level_exp_table_level ON level_exp_table(level);
CREATE INDEX idx_player_level_history_player_id ON player_level_history(player_id);
CREATE INDEX idx_exp_formula_active ON exp_formula(is_active);

-- Index สำหรับตาราง classes
CREATE INDEX idx_classes_name ON classes(name);
CREATE INDEX idx_classes_min_level ON classes(min_level);
CREATE INDEX idx_players_classes_id ON players(classes_id);

-- Index สำหรับตาราง quests
CREATE INDEX idx_quests_name ON quests(name);
CREATE INDEX idx_quests_type ON quests(type);
CREATE INDEX idx_quests_min_level ON quests(min_level);
