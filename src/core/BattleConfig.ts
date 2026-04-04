import { Hex } from "../types/hex";

/**
 * Конфигурация гексагональной сетки.
 */
export interface GridConfig {
  /** Ширина сетки в гексах */
  width: number;
  /** Высота сетки в гексах */
  height: number;
  /** Размер одного гекса (в пикселях) */
  hexSize: number;
}

/**
 * Конфигурация стека существ для начальной расстановки.
 */
export interface StackConfig {
  /** Имя конфигурации существа (ключ для фабрики) */
  creatureType: string;
  /** Количество существ в стеке */
  count: number;
  /** Позиция на сетке */
  hex: Hex;
  /** Атакующая сторона (true) или защищающаяся (false) */
  isAttacker: boolean;
  /** Управляется ли AI */
  isAIControlled: boolean;
}

/**
 * Константы для layout UI элементов.
 */
export const LAYOUT = {
  /** Отступ сетки от краёв экрана */
  gridPadding: 40,
  /** Дополнительное смещение сетки по Y */
  gridOffsetY: 30,
  /** Отступ панели очереди от сетки */
  turnOrderGap: 20,
  /** Отступ панели действий от панели очереди */
  actionPanelGap: 10,
  /** Отступ панели информации от сетки по X */
  infoPanelOffsetX: -350,
  /** Отступ панели информации от сетки по Y */
  infoPanelOffsetY: -50,
  /** Отступ панели отладки от сетки */
  debugPanelOffsetX: 20,
} as const;

/**
 * Настройки приложения PixiJS.
 */
export const APP_CONFIG = {
  backgroundColor: 0x1a1a2e,
  antialias: true,
} as const;

/**
 * Задержка перед выполнением AI-хода (мс).
 * Даёт визуальную обратную связь игроку.
 */
export const AI_TURN_DELAY_MS = 500;

/**
 * Конфигурация сетки по умолчанию.
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: 12,
  height: 10,
  hexSize: 30,
};

/**
 * Начальная расстановка стеков атакующей стороны (игрок).
 * 5 слотов: от левого верхнего угла вниз-вправо по диагонали.
 */
export const ATTACKER_PLACEMENT: Hex[] = [
  { q: 0, r: 0 },   // стек 1
  { q: -1, r: 2 },  // стек 2
  { q: -2, r: 4 },  // стек 3
  { q: -3, r: 6 },  // стек 4
  { q: -4, r: 8 },  // стек 5
];

/**
 * Начальная расстановка стеков защищающейся стороны (враг).
 * 5 слотов: зеркально атакующим, от правого верхнего угла вниз-влево.
 * Зеркальное отражение: q_defender = q_min + q_max - q_attacker
 */
export const DEFENDER_PLACEMENT: Hex[] = [
  { q: 11, r: 0 },  // стек 1 (зеркало q=0 при r=0)
  { q: 10, r: 2 },  // стек 2 (зеркало q=-1 при r=2)
  { q: 9, r: 4 },   // стек 3 (зеркало q=-2 при r=4)
  { q: 8, r: 6 },   // стек 4 (зеркало q=-3 при r=6)
  { q: 7, r: 8 },   // стек 5 (зеркало q=-4 при r=8)
];

/**
 * Конфигурация начальных стеков для демонстрационного боя.
 */
export const INITIAL_STACKS: StackConfig[] = [
  {
    creatureType: "peasant",
    count: 20,
    hex: ATTACKER_PLACEMENT[0],
    isAttacker: true,
    isAIControlled: false,
  },
  {
    creatureType: "peasant",
    count: 15,
    hex: DEFENDER_PLACEMENT[0],
    isAttacker: false,
    isAIControlled: true,
  },
  {
    creatureType: "peasant",
    count: 10,
    hex: DEFENDER_PLACEMENT[1],
    isAttacker: false,
    isAIControlled: true,
  },
  {
    creatureType: "archer",
    count: 5,
    hex: ATTACKER_PLACEMENT[1],
    isAttacker: true,
    isAIControlled: false,
  },
];
