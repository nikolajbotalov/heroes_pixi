import { CreatureConfig } from '../types/creature';

/**
 * Конфигурация: Лучник (Archer) — Уровень 2
 * 
 * Характеристики из Heroes of Might and Magic III.
 * Дальний бой — атакует на расстоянии без штрафа.
 */
export const ARCHER_CONFIG: CreatureConfig = {
    name: 'Archer',
    level: 2,
    attack: 4,
    defense: 3,
    damageMin: 2,
    damageMax: 4,
    health: 10,
    initiative: 5,
    speed: 4,
    attackType: 'ranged',
    color: 0x4CAF50, // Зелёный — цвет одежды лучника
};
