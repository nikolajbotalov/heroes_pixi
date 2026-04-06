import { CreatureConfig } from "../types/creature";

/**
 * Грифон (Griffin) — Уровень 3
 * Существо, занимающее 2 гекса (двойной размер)
 * Характеристики основаны на HoMM3
 */
export const GRIFFIN_CONFIG: CreatureConfig = {
  name: "Griffin",
  level: 3,
  attack: 8,
  defense: 8,
  damageMin: 3,
  damageMax: 6,
  health: 25,
  initiative: 6,
  speed: 5,
  attackType: "melee",
  color: 0xdaa520, // Золотисто-коричневый цвет
  sizeInHexes: 2, // Грифон занимает 2 гекса
};
