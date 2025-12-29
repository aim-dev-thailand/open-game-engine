import { EquipmentData } from "./equipment";

export interface CharacterData {
    id: string;
    sprite_id: string;
    character_name: string;
    class_name: string;
    level: number;
    hp: number;
    max_hp: number;
    str: number;
    dex: number;
    agi: number;
    vit: number;
    int: number;
    luk: number;
    exp: number;
    max_exp: number;
    atk: number;
    def: number;
    accuracy: number;
    evasion: number;
    crit_rate: number;
    move_speed: number;
    skill_points: number;
    stats_points: number;
    equipment: {
        head: EquipmentData;
        body: EquipmentData;
        legs: EquipmentData;
        feet: EquipmentData;
        weapon: EquipmentData;
        shield: EquipmentData;
    };
}
