import { CreatureStack } from "../entities/CreatureStack";

interface TurnQueueEntry {
  stack: CreatureStack;
  initiative: number;
}

export class InitiativeQueue {
  private queue: TurnQueueEntry[] = [];
  private currentIndex: number = 0;
  private currentRound: number = 1;

  add(stack: CreatureStack): void {
    const creature = stack.getCreature();
    this.queue.push({
      stack,
      initiative: creature.config.initiative,
    });
    this.sort();
  }

  private sort(): void {
    this.queue.sort((a, b) => b.initiative - a.initiative);
  }

  getCurrent(): CreatureStack | null {
    if (this.queue.length === 0) return null;
    return this.queue[this.currentIndex].stack;
  }

  next(): { stack: CreatureStack | null; isNewRound: boolean } {
    if (this.queue.length === 0) return { stack: null, isNewRound: false };

    const previousIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;

    const isNewRound = this.currentIndex === 0 && previousIndex !== 0;
    if (isNewRound) {
      this.currentRound++;
    }

    return { stack: this.getCurrent(), isNewRound };
  }

  getRound(): number {
    return this.currentRound;
  }

  getQueue(): CreatureStack[] {
    const ordered = [
      ...this.queue.slice(this.currentIndex),
      ...this.queue.slice(0, this.currentIndex),
    ];
    return ordered.map((entry) => entry.stack);
  }

  remove(stack: CreatureStack): void {
    const index = this.queue.findIndex((entry) => entry.stack === stack);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }
    }
  }

  get size(): number {
    return this.queue.length;
  }

  /**
   * Переместить стек в конец очереди (для действия Wait)
   * Стек уходит в конец текущего раунда.
   */
  moveToEnd(stack: CreatureStack): void {
    const index = this.queue.findIndex((entry) => entry.stack === stack);
    if (index !== -1) {
      const [entry] = this.queue.splice(index, 1);
      this.queue.push(entry);

      if (index < this.currentIndex) {
        this.currentIndex--;
      }
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }
    }
  }

  /**
   * Заглушка для обратной совместимости
   */
  isWaiting(_stack: CreatureStack | null): boolean {
    return false;
  }

  skipTurn(_stack: CreatureStack): void {
    // Заглушка
  }

  has(stack: CreatureStack): boolean {
    return this.queue.some((entry) => entry.stack === stack);
  }
}
