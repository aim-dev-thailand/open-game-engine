export interface EquipmentData {
    id: string;
    name: string;
    description: string;
    sprite_id: string;
    type: string;
    rarity: string;
    value: number;
    stats: {
        attack?: number;
        defense?: number;
        hp?: number;
        mp?: number;
    };
}