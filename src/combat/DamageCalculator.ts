import { Creature } from "../types/creature";

/**
 * Результат расчёта атаки
 */
export interface DamageResult {
  /** Базовый урон (до модификаторов) */
  baseDamage: number;
  /** Итоговый урон (после модификаторов) */
  finalDamage: number;
  /** Количество убитых существ */
  killed: number;
  /** Бонус атаки (если атакующий сильнее) */
  attackBonus: number;
  /** Снижение урона (если защитник сильнее) */
  defenseBonus: number;
}

/**
 * Калькулятор урона по формуле HoMM3
 *
 * Формула:
 * - Базовый урон = случайное число между damageMin и damageMax * количество
 * - Если атака > защиты: урон увеличивается на 5% за каждое очко разницы (макс +30%)
 * - Если защита > атаки: урон уменьшается на 2.5% за каждое очко разницы (макс -30%)
 * - Если защищается: урон дополнительно снижается на 50%
 */
export class DamageCalculator {
  /**
   * Рассчитать урон от атакующего к защитнику
   */
  static calculateDamage(
    attacker: Creature,
    defender: Creature,
    defenseModifier: number = 1.0,
  ): DamageResult {
    const { config: atkConfig } = attacker;
    const { config: defConfig } = defender;

    // Случайный урон в диапазоне
    const damageRange = atkConfig.damageMax - atkConfig.damageMin;
    const randomFactor = damageRange > 0 ? Math.random() * damageRange : 0;
    const baseDamagePerUnit = atkConfig.damageMin + randomFactor;
    const baseDamage = Math.round(baseDamagePerUnit * attacker.count);

    // Расчёт модификатора от атаки/защиты
    const attackDefenseDiff = atkConfig.attack - defConfig.defense;
    let modifier = 1.0;

    if (attackDefenseDiff > 0) {
      // Атака выше защиты: +5% за очко, макс +30%
      modifier = 1.0 + Math.min(attackDefenseDiff * 0.05, 0.3);
    } else if (attackDefenseDiff < 0) {
      // Защита выше атаки: -2.5% за очко, макс -30%
      modifier = 1.0 - Math.min(Math.abs(attackDefenseDiff) * 0.025, 0.3);
    }

    const finalDamage = Math.max(
      1,
      Math.round(baseDamage * modifier * defenseModifier),
    );

    // Рассчитываем сколько существ убито
    const hpPerUnit = defConfig.health;
    const totalDefenderHp = defender.currentHp;
    const remainingHp = Math.max(0, totalDefenderHp - finalDamage);
    const killed = Math.floor((totalDefenderHp - remainingHp) / hpPerUnit);

    return {
      baseDamage,
      finalDamage,
      killed,
      attackBonus: attackDefenseDiff > 0 ? attackDefenseDiff : 0,
      defenseBonus: attackDefenseDiff < 0 ? Math.abs(attackDefenseDiff) : 0,
    };
  }

  /**
   * Рассчитать урон с гарантированным минимумом (для ИИ)
   */
  static calculateMinDamage(
    attacker: Creature,
    defender: Creature,
  ): DamageResult {
    const { config: atkConfig } = attacker;
    const { config: defConfig } = defender;

    const baseDamage = atkConfig.damageMin * attacker.count;
    const attackDefenseDiff = atkConfig.attack - defConfig.defense;
    let modifier = 1.0;

    if (attackDefenseDiff > 0) {
      modifier = 1.0 + Math.min(attackDefenseDiff * 0.05, 0.3);
    } else if (attackDefenseDiff < 0) {
      modifier = 1.0 - Math.min(Math.abs(attackDefenseDiff) * 0.025, 0.3);
    }

    const finalDamage = Math.max(1, Math.round(baseDamage * modifier));
    const hpPerUnit = defConfig.health;
    const killed = Math.floor(finalDamage / hpPerUnit);

    return {
      baseDamage,
      finalDamage,
      killed,
      attackBonus: attackDefenseDiff > 0 ? attackDefenseDiff : 0,
      defenseBonus: attackDefenseDiff < 0 ? Math.abs(attackDefenseDiff) : 0,
    };
  }

  /**
   * Проверить, может ли атакующий убить хотя бы одно существо
   */
  static canKill(attacker: Creature, defender: Creature): boolean {
    const minDamage = this.calculateMinDamage(attacker, defender);
    return minDamage.killed > 0;
  }

  /**
   * Рассчитать ожидаемый (средний) урон
   */
  static calculateExpectedDamage(
    attacker: Creature,
    defender: Creature,
  ): number {
    const { config: atkConfig } = attacker;
    const { config: defConfig } = defender;

    const avgDamagePerUnit = (atkConfig.damageMin + atkConfig.damageMax) / 2;
    const baseDamage = avgDamagePerUnit * attacker.count;
    const attackDefenseDiff = atkConfig.attack - defConfig.defense;
    let modifier = 1.0;

    if (attackDefenseDiff > 0) {
      modifier = 1.0 + Math.min(attackDefenseDiff * 0.05, 0.3);
    } else if (attackDefenseDiff < 0) {
      modifier = 1.0 - Math.min(Math.abs(attackDefenseDiff) * 0.025, 0.3);
    }

    return Math.round(baseDamage * modifier);
  }
}
