import { CreatureStack } from "../entities/CreatureStack";

/**
 * Элемент в очереди ходов
 */
interface TurnQueueEntry {
  stack: CreatureStack;
  initiative: number;
}

/**
 * Система очереди ходов на основе инициативы
 * Порядок определяется по убыванию инициативы
 */
export class InitiativeQueue {
  private queue: TurnQueueEntry[] = [];
  private currentIndex: number = 0;
  private currentRound: number = 1;

  /**
   * Добавить стек в очередь
   */
  add(stack: CreatureStack): void {
    const creature = stack.getCreature();
    this.queue.push({
      stack,
      initiative: creature.config.initiative,
    });
    this.sort();
  }

  /**
   * Сортировка по инициативе (убывание)
   */
  private sort(): void {
    this.queue.sort((a, b) => b.initiative - a.initiative);
  }

  /**
   * Получить текущий стек (чей сейчас ход)
   */
  getCurrent(): CreatureStack | null {
    if (this.queue.length === 0) return null;
    return this.queue[this.currentIndex].stack;
  }

  /**
   * Перейти к следующему ходу
   * @returns { stack: CreatureStack | null, isNewRound: boolean }
   */
  next(): { stack: CreatureStack | null; isNewRound: boolean } {
    if (this.queue.length === 0) return { stack: null, isNewRound: false };

    const previousIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;

    // Если индекс обнулился — начался новый раунд
    const isNewRound = this.currentIndex === 0 && previousIndex !== 0;
    if (isNewRound) {
      this.currentRound++;
    }

    return { stack: this.getCurrent(), isNewRound };
  }

  /**
   * Получить текущий номер раунда
   */
  getRound(): number {
    return this.currentRound;
  }

  /**
   * Получить всю очередь (для отображения UI)
   */
  getQueue(): CreatureStack[] {
    // Возвращаем порядок начиная с текущего
    const ordered = [
      ...this.queue.slice(this.currentIndex),
      ...this.queue.slice(0, this.currentIndex),
    ];
    return ordered.map((entry) => entry.stack);
  }

  /**
   * Удалить стек из очереди (при гибели)
   */
  remove(stack: CreatureStack): void {
    const index = this.queue.findIndex((entry) => entry.stack === stack);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }
    }
  }

  /**
   * Количество участников в очереди
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Переместить стек в конец очереди (для действия Wait)
   */
  moveToEnd(stack: CreatureStack): void {
    const index = this.queue.findIndex((entry) => entry.stack === stack);
    if (index !== -1) {
      const [entry] = this.queue.splice(index, 1);
      this.queue.push(entry);

      // Обновляем текущий индекс
      if (index < this.currentIndex) {
        this.currentIndex--;
      }
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }
    }
  }
}
