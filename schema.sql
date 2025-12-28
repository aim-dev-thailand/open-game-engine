-- สร้างฐานข้อมูล
-- CREATE DATABASE mmorpg_db;

-- ตารางผู้เล่น
CREATE TYPE user_role AS ENUM ('user', 'admin', 'root');
CREATE TABLE players (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    x FLOAT DEFAULT 0,
    y FLOAT DEFAULT 0,
    hp INT DEFAULT 100,
    base_atk INT DEFAULT 20,
    base_def INT DEFAULT 10,
    accuracy FLOAT DEFAULT 0.9,
    evasion FLOAT DEFAULT 0.1,
    crit_rate FLOAT DEFAULT 0.05,
    move_speed FLOAT DEFAULT 2.0,
    skill_points INT DEFAULT 0,
    level INT DEFAULT 1,
    role user_role DEFAULT 'user',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- ตารางสกิล
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    skill_type VARCHAR(20) NOT NULL, -- 'attack', 'buff', 'passive'
    base_power INT DEFAULT 0,
    duration_sec INT DEFAULT 0,
    effect_config JSONB DEFAULT '{}'::jsonb
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
    sub_type VARCHAR(50),
    icon_id VARCHAR(50),
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
