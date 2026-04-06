/**
 * Конфигурация типа существа (статичные данные из бестиария)
 */
export interface CreatureConfig {
  /** Название существа */
  name: string;
  /** Уровень */
  level: number;
  /** Атака */
  attack: number;
  /** Защита */
  defense: number;
  /** Минимальный урон */
  damageMin: number;
  /** Максимальный урон */
  damageMax: number;
  /** Здоровье одной единицы */
  health: number;
  /** Инициатива */
  initiative: number;
  /** Скорость (гексов за ход) */
  speed: number;
  /** Тип атаки */
  attackType: "melee" | "ranged";
  /** Цвет для отображения (пока нет спрайтов) */
  color: number;
  /** Размер существа в гексах (1 = обычный, 2 = занимает 2 гекса) */
  sizeInHexes?: number;
}

/**
 * Экземпляр существа на поле боя (конкретный стек)
 */
export interface Creature {
  /** Тип существа (ссылка на конфиг) */
  config: CreatureConfig;
  /** Количество существ в стеке */
  count: number;
  /** Текущее здоровье (всего стека) */
  currentHp: number;
  /** Сторона: true = атакующий, false = защитник */
  isAttacker: boolean;
  /** Управляется ли стек AI (по умолчанию false для игрока) */
  isAIControlled?: boolean;
}
