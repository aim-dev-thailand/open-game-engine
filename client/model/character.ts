import { EquipmentData } from "./equipment";

export interface CharacterData {
    id: string;
    sprite_id: string;
    user_id: number;
    username: string;
    classes_id: number;
    classes_name: string;
    level: number;
    map_id: number;
    x: number;
    y: number;
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
