import * as PIXI from "pixi.js";
import { CreatureStack } from "../entities/CreatureStack";

type Slot =
  | { type: "stack"; stack: CreatureStack }
  | { type: "round"; roundNumber: number };

export class TurnOrderPanel extends PIXI.Container {
  private bg: PIXI.Graphics;
  private icons: {
    slot: Slot;
    graphic: PIXI.Graphics;
    label: PIXI.Text;
  }[] = [];

  private slots: Slot[] = [];
  private readonly MAX_SLOTS = 12;
  private nextRoundMarker: number = 2;

  private panelWidth: number = 0;
  public panelHeight: number = 66;

  constructor() {
    super();
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);
  }

  /**
   * Инициализация: [Л, К1, К2, К3, R2, Л, К1, К2, К3, R3, Л, К1]
   */
  init(queue: CreatureStack[]): void {
    this.slots = [];
    this.nextRoundMarker = 2;

    const aliveStacks = queue.filter(
      (s) => s.getCreature().count > 0 && s.visible,
    );
    const seen = new Set<CreatureStack>();
    const roundOrder: CreatureStack[] = [];
    for (const stack of aliveStacks) {
      if (!seen.has(stack)) {
        seen.add(stack);
        roundOrder.push(stack);
      }
    }

    if (roundOrder.length === 0) return;

    let slotIndex = 0;
    let roundNum = 1;
    while (slotIndex < this.MAX_SLOTS) {
      for (const stack of roundOrder) {
        if (slotIndex >= this.MAX_SLOTS) break;
        this.slots.push({ type: "stack", stack });
        slotIndex++;
      }
      if (slotIndex < this.MAX_SLOTS) {
        roundNum++;
        this.slots.push({ type: "round", roundNumber: roundNum });
        slotIndex++;
      }
    }
    this.nextRoundMarker = roundNum + 1;
  }

  /**
   * Переинициализировать (при новом раунде)
   */
  reinit(queue: CreatureStack[], roundNumber: number): void {
    this.slots = [];
    this.nextRoundMarker = roundNumber + 1;

    const aliveStacks = queue.filter(
      (s) => s.getCreature().count > 0 && s.visible,
    );
    const seen = new Set<CreatureStack>();
    const roundOrder: CreatureStack[] = [];
    for (const stack of aliveStacks) {
      if (!seen.has(stack)) {
        seen.add(stack);
        roundOrder.push(stack);
      }
    }

    if (roundOrder.length === 0) return;

    let slotIndex = 0;
    let roundNum = roundNumber;
    while (slotIndex < this.MAX_SLOTS) {
      for (const stack of roundOrder) {
        if (slotIndex >= this.MAX_SLOTS) break;
        this.slots.push({ type: "stack", stack });
        slotIndex++;
      }
      if (slotIndex < this.MAX_SLOTS) {
        roundNum++;
        this.slots.push({ type: "round", roundNumber: roundNum });
        slotIndex++;
      }
    }
    this.nextRoundMarker = roundNum + 1;
  }

  /**
   * Сбросить Wait (новый раунд) — ничего не делает, reinit сам строит
   */
  resetWaiting(): void {
    // При новом раунде handleTurnEnded вызовет reinit, так что тут пусто
  }

  /**
   * Удалить все копии существа (при гибели)
   */
  removeStack(deadStack: CreatureStack): void {
    this.slots = this.slots.filter(
      (s) => !(s.type === "stack" && s.stack === deadStack),
    );
  }

  /**
   * Обычный ход: shift + push(actingStack) — стек уходит в конец всего массива
   */
  advanceTurn(actingStack: CreatureStack): void {
    const removed = this.slots.shift();
    if (!removed) return;

    if (removed.type === "round") {
      this.slots.push({ type: "round", roundNumber: this.nextRoundMarker });
      this.nextRoundMarker++;
    }

    if (actingStack.getCreature().count > 0) {
      this.slots.push({ type: "stack", stack: actingStack });
    }
  }

  /**
   * Wait: shift + вставить стек ПЕРЕД первой меткой раунда (в конец текущего раунда)
   */
  advanceTurnWithWait(waitingStack: CreatureStack): void {
    const removed = this.slots.shift();
    if (!removed) return;

    if (removed.type === "round") {
      // Удалена метка — ставим новую
      this.slots.push({ type: "round", roundNumber: this.nextRoundMarker });
      this.nextRoundMarker++;
    }

    // Вставляем waitingStack перед первой меткой раунда (конец текущего раунда)
    if (waitingStack.getCreature().count > 0) {
      const roundIndex = this.slots.findIndex((s) => s.type === "round");
      if (roundIndex === -1) {
        // Нет метки — просто в конец
        this.slots.push({ type: "stack", stack: waitingStack });
      } else {
        this.slots.splice(roundIndex, 0, {
          type: "stack",
          stack: waitingStack,
        });
      }
    }
  }

  getSlotNames(): string[] {
    return this.slots.map((s) =>
      s.type === "stack"
        ? s.stack.getCreature().config.name
        : `R${s.roundNumber}`,
    );
  }

  update(queue: CreatureStack[], currentStack: CreatureStack | null): void {
    if (this.slots.length === 0) {
      this.init(queue);
    }
    this.removeIcons();
    this.renderQueue(currentStack);
  }

  private renderQueue(currentStack: CreatureStack | null): void {
    const iconSize = 36;
    const gap = 12;
    const startX = 15;
    const startY = 15;

    if (this.slots.length === 0) {
      this.panelWidth = 300;
      this.drawBackground();
      return;
    }

    const visibleCount = Math.min(this.slots.length, this.MAX_SLOTS);
    for (let i = 0; i < visibleCount; i++) {
      const slot = this.slots[i];
      const x = startX + i * (iconSize + gap);
      const y = startY;

      if (slot.type === "stack") {
        this.renderStackIcon(
          x,
          y,
          iconSize,
          slot.stack,
          slot.stack === currentStack,
        );
      } else if (slot.type === "round") {
        this.renderRoundMarker(x, y, iconSize, slot.roundNumber);
      }
    }

    this.panelWidth = this.MAX_SLOTS * (iconSize + gap) + 15;
    this.drawBackground();
  }

  private renderStackIcon(
    x: number,
    y: number,
    size: number,
    stack: CreatureStack,
    isCurrent: boolean,
  ): void {
    const creature = stack.getCreature();
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    const graphic = new PIXI.Graphics();
    graphic.circle(cx, cy, radius).fill({
      color: creature.config.color,
      alpha: isCurrent ? 1.0 : 0.5,
    });
    graphic.circle(cx, cy, radius).stroke({
      width: isCurrent ? 4.5 : 1.5,
      color: isCurrent ? 0xffffff : 0x888888,
    });

    const label = new PIXI.Text({
      text: String(creature.count),
      style: {
        fontSize: 15,
        fill: 0xffffff,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    label.anchor.set(0.5);
    label.x = cx;
    label.y = cy;

    this.addChild(graphic);
    this.addChild(label);
    this.icons.push({ slot: { type: "stack", stack }, graphic, label });
  }

  private renderRoundMarker(
    x: number,
    y: number,
    size: number,
    roundNumber: number,
  ): void {
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    const graphic = new PIXI.Graphics();
    graphic.circle(cx, cy, radius).fill({ color: 0x333355, alpha: 0.8 });
    graphic.circle(cx, cy, radius).stroke({ width: 1.5, color: 0x555577 });

    const label = new PIXI.Text({
      text: `R${roundNumber}`,
      style: {
        fontSize: 13.5,
        fill: 0xaabbcc,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    label.anchor.set(0.5);
    label.x = cx;
    label.y = cy;

    this.addChild(graphic);
    this.addChild(label);
    this.icons.push({ slot: { type: "round", roundNumber }, graphic, label });
  }

  private drawBackground(): void {
    this.bg.clear();
    this.bg.roundRect(0, 0, this.panelWidth, this.panelHeight, 12).fill({
      color: 0x0a0a1a,
      alpha: 0.6,
    });
    this.bg.roundRect(0, 0, this.panelWidth, this.panelHeight, 12).stroke({
      width: 1.5,
      color: 0x333355,
      alpha: 0.5,
    });
    this.setChildIndex(this.bg, 0);
  }

  private removeIcons(): void {
    this.icons.forEach(({ graphic, label }) => {
      this.removeChild(graphic);
      this.removeChild(label);
    });
    this.icons = [];
  }
}
