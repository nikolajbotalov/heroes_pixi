import { CreatureConfig } from '../types/creature';

/**
 * Конфигурация: Крестьянин (Peasant) — Уровень 1
 */
export const PEASANT_CONFIG: CreatureConfig = {
    name: 'Peasant',
    level: 1,
    attack: 1,
    defense: 1,
    damageMin: 1,
    damageMax: 2,
    health: 1,
    initiative: 4,
    speed: 3,
    attackType: 'melee',
    color: 0x8B7355, // Коричневый — цвет одежды крестьянина
};
