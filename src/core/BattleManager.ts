import { CreatureStack } from "../entities/CreatureStack";
import { Hex } from "../types/hex";
import { EventEmitter } from "pixi.js";
import { ActionManager } from "./ActionManager";
import { VictoryConditionManager } from "./VictoryConditionManager";

/**
 * Состояния боевой системы
 */
export type BattleState =
  | "IDLE" // Ожидание, ничего не происходит
  | "SELECTED" // Стек выделен, показываем доступные гексы
  | "MOVING" // Анимация перемещения
  | "ATTACKING" // Выбор цели атаки
  | "ACTIONS" // Выбор действия (атака, защита, ожидание)
  | "DEFENDING" // Стек защищается
  | "WAITING" // Стек ожидает (перемещён в конец очереди)
  | "ACTION"; // Выбор действия (атака, защита, ожидание)

/**
 * События боевой системы
 */
export const BattleEvents = {
  STACK_SELECTED: "stackSelected",
  STACK_DESELECTED: "stackDeselected",
  STACK_MOVED: "stackMoved",
  STATE_CHANGED: "stateChanged",
  ATTACK_STARTED: "attackStarted",
  DAMAGE_APPLIED: "damageApplied",
  ACTIONS_STARTED: "actionsStarted",
  STACK_DESTROYED: "stackDestroyed",
  TURN_ENDED: "turnEnded",
};

/**
 * BattleManager — центральный класс управления состоянием боя
 * Управляет выделением стеков, перемещением, переходами состояний
 */
export class BattleManager {
  private state: BattleState = "IDLE";
  private selectedStack: CreatureStack | null = null;
  private allStacks: CreatureStack[] = [];
  private emitter: EventEmitter = new EventEmitter();
  private actionManager: ActionManager = new ActionManager();
  private victoryManager: VictoryConditionManager;

  constructor(isPlayerAttacker: boolean = true) {
    this.victoryManager = new VictoryConditionManager(isPlayerAttacker);
  }

  /**
   * Получить ActionManager
   */
  getActionManager(): ActionManager {
    return this.actionManager;
  }

  /**
   * Инициализация всеми стеками на поле
   */
  init(stacks: CreatureStack[]): void {
    this.allStacks = stacks;

    // Инициализируем состояния действий для каждого стека
    for (const stack of stacks) {
      this.actionManager.initStack(stack);
    }

    // Разделяем стеки на атакующих и защитников
    const attackerStacks = stacks.filter((s) => s.getCreature().isAttacker);
    const defenderStacks = stacks.filter((s) => !s.getCreature().isAttacker);
    this.victoryManager.init(attackerStacks, defenderStacks);
  }

  /**
   * Получить текущее состояние
   */
  getState(): BattleState {
    return this.state;
  }

  /**
   * Установить новое состояние
   */
  setState(newState: BattleState): void {
    this.state = newState;
    this.emitter.emit(BattleEvents.STATE_CHANGED, newState);
  }

  /**
   * Выделить стек
   */
  selectStack(stack: CreatureStack): void {
    // Снимаем предыдущее выделение
    if (this.selectedStack && this.selectedStack !== stack) {
      this.selectedStack.deselect();
    }

    this.selectedStack = stack;
    stack.select();
    this.setState("SELECTED");
    this.emitter.emit(BattleEvents.STACK_SELECTED, stack);
  }

  /**
   * Снять выделение
   */
  deselectStack(): void {
    if (this.selectedStack) {
      this.selectedStack.deselect();
      this.selectedStack = null;
      this.setState("IDLE");
      this.emitter.emit(BattleEvents.STACK_DESELECTED);
    }
  }

  /**
   * Получить выделенный стек
   */
  getSelectedStack(): CreatureStack | null {
    return this.selectedStack;
  }

  /**
   * Проверить, контролируется ли стек AI
   */
  isAIControlled(stack: CreatureStack): boolean {
    return stack.getCreature().isAIControlled ?? false;
  }

  /**
   * Переместить стек на новый гекс
   * @param stack - стек для перемещения
   * @param newHex - целевой гекс
   * @param onComplete - коллбэк после завершения анимации (для AI)
   */
  moveStack(stack: CreatureStack, newHex: Hex, onComplete?: () => void): void {
    const oldHex = stack.getHex();
    const occupiedHexes = this.getOccupiedHexes(stack);
    this.setState("MOVING");
    stack.moveTo(newHex, occupiedHexes, () => {
      this.setState("IDLE");
      this.emitter.emit(BattleEvents.STACK_MOVED, stack, oldHex, newHex);
      onComplete?.();
    });
  }

  /**
   * Получить все стеки на поле
   */
  getAllStacks(): CreatureStack[] {
    return [...this.allStacks];
  }

  /**
   * Получить множество занятых гексов (все стеки кроме выбранного)
   * Учитывает размер существ (sizeInHexes) — большие существа занимают несколько гексов
   */
  getOccupiedHexes(excludeStack?: CreatureStack): Set<string> {
    const occupied = new Set<string>();
    for (const stack of this.allStacks) {
      if (excludeStack && stack === excludeStack) continue;
      // Для существ на 2+ гекса — добавляем все занимаемые гексы
      const occupiedHexes = stack.getOccupiedHexes();
      for (const hex of occupiedHexes) {
        occupied.add(`${hex.q},${hex.r}`);
      }
    }
    return occupied;
  }

  /**
   * Найти стек, занимающий указанный гекс (учитывает существа на 2+ гекса)
   * @returns стек или null, если гекс свободен
   */
  getStackAtHex(hex: Hex): CreatureStack | null {
    for (const stack of this.allStacks) {
      if (stack.occupiesHex(hex)) {
        return stack;
      }
    }
    return null;
  }

  /**
   * Проверить, может ли стек встать на указанную позицию
   * Для существ на 2+ гекса — проверяет, что все гексы свободны и в пределах поля
   */
  canStackMoveTo(
    stack: CreatureStack,
    targetHex: Hex,
    gridWidth: number,
    gridHeight: number,
  ): boolean {
    const occupiedHexes = stack.getOccupiedHexesAt(targetHex);

    // Проверяем каждый гекс
    for (const hex of occupiedHexes) {
      // Проверка границ поля
      const rOffset = Math.floor(hex.r / 2);
      const minQ = -rOffset;
      const maxQ = gridWidth - rOffset - 1;
      if (hex.r < 0 || hex.r >= gridHeight || hex.q < minQ || hex.q > maxQ) {
        return false;
      }

      // Проверка, что гекс не занят другим стеком
      for (const other of this.allStacks) {
        if (other === stack) continue;
        if (other.occupiesHex(hex)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Подписаться на события
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.emitter.on(event, callback);
  }

  /**
   * Отписаться от событий
   */
  off(event: string, callback: (...args: any[]) => void): void {
    this.emitter.off(event, callback);
  }

  /**
   * Перейти в режим атаки (после перемещения или сразу)
   */
  startAttackPhase(): void {
    this.setState("ATTACKING");
    this.emitter.emit(BattleEvents.ATTACK_STARTED, this.selectedStack);
  }

  /**
   * Применить урон к целевому стеку
   */
  applyDamage(target: CreatureStack, damage: number, killed: number): void {
    const creature = target.getCreature();
    creature.currentHp = Math.max(0, creature.currentHp - damage);
    creature.count = Math.max(0, creature.count - killed);

    // Обновляем HP бар
    target.updateHealthBar();

    this.emitter.emit(BattleEvents.DAMAGE_APPLIED, target, damage, killed);

    // Если стек уничтожен
    if (creature.count <= 0) {
      this.removeStack(target);
    }
  }

  /**
   * Удалить стек из боя (уничтожен)
   */
  private removeStack(stack: CreatureStack): void {
    const index = this.allStacks.indexOf(stack);
    if (index !== -1) {
      this.allStacks.splice(index, 1);
      this.actionManager.removeStack(stack);

      // Уведомляем VictoryManager о гибели стека
      this.victoryManager.removeStack(stack);

      // Генерируем событие для обновления UI
      this.emitter.emit(BattleEvents.STACK_DESTROYED, stack);

      // Анимация смерти
      stack.animateDeath(() => {
        stack.destroy();
      });
    }
  }

  /**
   * Получить VictoryConditionManager
   */
  getVictoryManager(): VictoryConditionManager {
    return this.victoryManager;
  }

  /**
   * Выполнить защиту
   * @param stack - стек, который защищается (если null — использует selectedStack)
   */
  defend(stack?: CreatureStack): void {
    const target = stack ?? this.selectedStack;
    if (!target) return;

    this.actionManager.defend(target);
    this.setState("DEFENDING");

    // Завершаем ход с задержкой
    setTimeout(() => {
      if (this.selectedStack === target) {
        this.deselectStack();
      }
      this.endTurn(target);
    }, 800);
  }

  /**
   * Выполнить ожидание
   */
  wait(): boolean {
    if (!this.selectedStack) return false;

    const success = this.actionManager.wait(this.selectedStack);
    if (success) {
      this.setState("WAITING");

      // Завершаем ход с задержкой
      setTimeout(() => {
        const stack = this.selectedStack;
        this.deselectStack();
        this.endTurn(stack);
      }, 500);
    }

    return success;
  }

  /**
   * Завершить ход и уведомить слушателей
   */
  endTurn(stack: CreatureStack | null): void {
    this.emitter.emit(BattleEvents.TURN_ENDED, stack);
  }
}
