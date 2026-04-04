import { CreatureStack } from "../entities/CreatureStack";
import { InitiativeQueue } from "../core/InitiativeQueue";

/**
 * Типы действий
 */
export type ActionType = "attack" | "defend" | "wait" | "move";

/**
 * Состояние действия стека
 */
export interface StackActionState {
  hasMoved: boolean;
  hasActed: boolean;
  isDefending: boolean;
  isWaiting: boolean;
}

/**
 * ActionManager управляет действиями стеков
 * Каждый стек может: переместиться И выполнить одно действие (атака/защита/ожидание)
 */
export class ActionManager {
  private actionStates: Map<CreatureStack, StackActionState> = new Map();
  private initiativeQueue: InitiativeQueue | null = null;

  constructor() {}

  /**
   * Установить очередь инициативы
   */
  setInitiativeQueue(queue: InitiativeQueue): void {
    this.initiativeQueue = queue;
  }

  /**
   * Инициализировать стек (при добавлении в бой)
   */
  initStack(stack: CreatureStack): void {
    this.actionStates.set(stack, {
      hasMoved: false,
      hasActed: false,
      isDefending: false,
      isWaiting: false,
    });
  }

  /**
   * Сбросить действия для нового раунда
   */
  resetAllActions(): void {
    for (const [, state] of this.actionStates) {
      state.hasMoved = false;
      state.hasActed = false;
      state.isDefending = false;
      state.isWaiting = false;
    }
  }

  /**
   * Получить состояние действий стека
   */
  getActionState(stack: CreatureStack): StackActionState | undefined {
    return this.actionStates.get(stack);
  }

  /**
   * Отметить, что стек переместился
   */
  markMoved(stack: CreatureStack): void {
    const state = this.actionStates.get(stack);
    if (state) {
      state.hasMoved = true;
    }
  }

  /**
   * Отметить, что стек выполнил действие
   */
  markActed(stack: CreatureStack): void {
    const state = this.actionStates.get(stack);
    if (state) {
      state.hasActed = true;
    }
  }

  /**
   * Выполнить защиту (снижение урона на 50%)
   */
  defend(stack: CreatureStack): void {
    const state = this.actionStates.get(stack);
    if (state) {
      state.isDefending = true;
      state.hasActed = true;
    }
  }

  /**
   * Проверить, защищается ли стек
   */
  isDefending(stack: CreatureStack): boolean {
    const state = this.actionStates.get(stack);
    return state?.isDefending ?? false;
  }

  /**
   * Получить модификатор защиты (0.5 если защищается, 1.0 если нет)
   */
  getDefenseModifier(stack: CreatureStack): number {
    return this.isDefending(stack) ? 0.5 : 1.0;
  }

  /**
   * Выполнить ожидание — переместить стек в конец очереди (конец текущего раунда)
   */
  wait(stack: CreatureStack): boolean {
    if (!this.initiativeQueue) return false;

    const state = this.actionStates.get(stack);
    if (!state || state.hasActed) return false;

    this.initiativeQueue.moveToEnd(stack);
    state.hasActed = true;
    state.isWaiting = true;

    return true;
  }

  /**
   * Проверить, выполнил ли стек Wait
   */
  isWaiting(stack: CreatureStack): boolean {
    const state = this.actionStates.get(stack);
    return state?.isWaiting ?? false;
  }

  /**
   * Проверить, может ли стек выполнить действие
   */
  canAct(stack: CreatureStack): boolean {
    const state = this.actionStates.get(stack);
    return state ? !state.hasActed : false;
  }

  /**
   * Проверить, может ли стек переместиться
   */
  canMove(stack: CreatureStack): boolean {
    const state = this.actionStates.get(stack);
    return state ? !state.hasMoved : false;
  }

  /**
   * Удалить стек из управления (при гибели)
   */
  removeStack(stack: CreatureStack): void {
    this.actionStates.delete(stack);
  }
}
