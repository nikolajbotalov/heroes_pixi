import { CreatureStack } from "../entities/CreatureStack";
import { EventEmitter } from "pixi.js";

/**
 * Типы исходов боя
 */
export type BattleOutcome = "victory" | "defeat" | "ongoing";

/**
 * События VictoryConditionManager
 */
export const VictoryEvents = {
  BATTLE_ENDED: "battleEnded",
};

/**
 * VictoryConditionManager отслеживает условие победы/поражения
 * Победа: все стеки противника уничтожены
 * Поражение: все стеки игрока уничтожены
 */
export class VictoryConditionManager {
  private emitter: EventEmitter = new EventEmitter();
  private attackerStacks: CreatureStack[] = [];
  private defenderStacks: CreatureStack[] = [];
  private isPlayerAttacker: boolean = true;
  private outcome: BattleOutcome = "ongoing";
  private battleOver: boolean = false;

  constructor(isPlayerAttacker: boolean = true) {
    this.isPlayerAttacker = isPlayerAttacker;
  }

  /**
   * Инициализировать стеки
   */
  init(attackerStacks: CreatureStack[], defenderStacks: CreatureStack[]): void {
    this.attackerStacks = attackerStacks;
    this.defenderStacks = defenderStacks;
  }

  /**
   * Добавить стек (при появлении нового)
   */
  addStack(stack: CreatureStack): void {
    const creature = stack.getCreature();
    if (creature.isAttacker) {
      this.attackerStacks.push(stack);
    } else {
      this.defenderStacks.push(stack);
    }
  }

  /**
   * Удалить стек (при гибели)
   */
  removeStack(stack: CreatureStack): void {
    const creature = stack.getCreature();
    if (creature.isAttacker) {
      const index = this.attackerStacks.indexOf(stack);
      if (index !== -1) {
        this.attackerStacks.splice(index, 1);
      }
    } else {
      const index = this.defenderStacks.indexOf(stack);
      if (index !== -1) {
        this.defenderStacks.splice(index, 1);
      }
    }

    // Проверяем условие победы
    this.checkVictoryCondition();
  }

  /**
   * Проверить условие победы/поражения
   * Победа: все стеки одной из сторон уничтожены (count <= 0)
   */
  checkVictoryCondition(): BattleOutcome {
    const attackersAlive = this.attackerStacks.some(
      (s) => s.getCreature().count > 0,
    );
    const defendersAlive = this.defenderStacks.some(
      (s) => s.getCreature().count > 0,
    );

    if (!attackersAlive && !defendersAlive) {
      // Обе стороны уничтожены — ничья (редкий случай)
      this.outcome = "defeat";
      this.battleOver = true;
      this.emitter.emit(VictoryEvents.BATTLE_ENDED, this.outcome);
      return this.outcome;
    }

    if (!attackersAlive) {
      // Все атакующие уничтожены
      this.outcome = this.isPlayerAttacker ? "defeat" : "victory";
      this.battleOver = true;
      this.emitter.emit(VictoryEvents.BATTLE_ENDED, this.outcome);
      return this.outcome;
    }

    if (!defendersAlive) {
      // Все защитники уничтожены
      this.outcome = this.isPlayerAttacker ? "victory" : "defeat";
      this.battleOver = true;
      this.emitter.emit(VictoryEvents.BATTLE_ENDED, this.outcome);
      return this.outcome;
    }

    this.outcome = "ongoing";
    return this.outcome;
  }

  /**
   * Получить текущий исход боя
   */
  getOutcome(): BattleOutcome {
    return this.outcome;
  }

  /**
   * Проверить, завершён ли бой
   */
  isBattleOver(): boolean {
    return this.battleOver;
  }

  /**
   * Подписаться на события
   */
  on(event: string, callback: (outcome: BattleOutcome) => void): void {
    this.emitter.on(event, callback);
  }

  /**
   * Отписаться от событий
   */
  off(event: string, callback: (outcome: BattleOutcome) => void): void {
    this.emitter.off(event, callback);
  }
}
