import * as PIXI from "pixi.js";
import { CreatureStack } from "../entities/CreatureStack";

/**
 * Тип слота в панели очереди
 */
type Slot =
  | { type: "stack"; stack: CreatureStack }
  | { type: "round"; roundNumber: number };

/**
 * UI панель отображения очереди ходов
 * Фиксированная панель из 12 слотов. После каждого хода слоты сдвигаются влево,
 * а ходящее существо перемещается в конец (слот 11).
 */
export class TurnOrderPanel extends PIXI.Container {
  private bg: PIXI.Graphics;
  private icons: {
    slot: Slot;
    graphic: PIXI.Graphics;
    label: PIXI.Text;
  }[] = [];

  // Фиксированный массив из 12 слотов
  private slots: Slot[] = [];
  private readonly MAX_SLOTS = 12;
  // Текущий номер раунда для меток (R2, R3, R4...)
  private nextRoundMarker: number = 2;

  private panelWidth: number = 0;
  public panelHeight: number = 66; // 44 * 1.5

  constructor() {
    super();
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);
  }

  /**
   * Инициализировать панель с начальной очередью
   * Создаёт 12 слотов: существа + метки раундов (начиная с R2)
   */
  init(queue: CreatureStack[]): void {
    this.slots = [];
    this.nextRoundMarker = 2;

    // Только живые существа
    const aliveStacks = queue.filter(
      (s) => s.getCreature().count > 0 && s.visible,
    );

    if (aliveStacks.length === 0) {
      return;
    }

    // Заполняем 12 слотов: существа + метки раундов
    // Первая метка раунда = R2 (R1 — текущий раунд, не отображаем)
    let slotIndex = 0;

    while (slotIndex < this.MAX_SLOTS) {
      for (const stack of aliveStacks) {
        if (slotIndex >= this.MAX_SLOTS) break;
        this.slots.push({ type: "stack", stack });
        slotIndex++;
      }
      // Метка следующего раунда
      if (slotIndex < this.MAX_SLOTS) {
        this.slots.push({ type: "round", roundNumber: this.nextRoundMarker });
        this.nextRoundMarker++;
        slotIndex++;
      }
    }

    // Обрезаем до MAX_SLOTS
    this.slots = this.slots.slice(0, this.MAX_SLOTS);
  }

  /**
   * Удалить существо из очереди (при гибели)
   * Переинициализирует очередь без мёртвых существ
   */
  removeStack(deadStack: CreatureStack): void {
    // Удаляем из слотов
    this.slots = this.slots.filter(
      (s) => !(s.type === "stack" && s.stack === deadStack),
    );

    // Переинициализируем метки раундов
    this.rebuildRoundMarkers();
  }

  /**
   * Перестроить метки раундов после удаления существ
   */
  private rebuildRoundMarkers(): void {
    // Собираем все уникальные существа в порядке
    const orderedStacks: CreatureStack[] = [];
    for (const slot of this.slots) {
      if (slot.type === "stack") {
        orderedStacks.push(slot.stack);
      }
    }

    const uniqueStacks = [...new Set(orderedStacks)];
    if (uniqueStacks.length === 0) {
      this.slots = [];
      return;
    }

    // Пересобираем: существа + метки раундов
    this.slots = [];
    let slotIndex = 0;
    let nextRound = 2;

    for (let cycle = 0; cycle < 20 && slotIndex < this.MAX_SLOTS; cycle++) {
      let addedThisCycle = 0;
      for (const stack of uniqueStacks) {
        if (slotIndex >= this.MAX_SLOTS) break;
        this.slots.push({ type: "stack", stack });
        slotIndex++;
        addedThisCycle++;
      }
      // Метка раунда после каждого цикла
      if (slotIndex < this.MAX_SLOTS && addedThisCycle > 0) {
        this.slots.push({ type: "round", roundNumber: nextRound });
        nextRound++;
        slotIndex++;
      }
    }

    this.slots = this.slots.slice(0, this.MAX_SLOTS);
  }

  /**
   * Сдвинуть очередь после хода
   * - Удаляем первый слот
   * - Если удалён стек — добавляем ходящий стек в конец
   * - Если удалена метка раунда — добавляем новую метку в конец (nextRoundMarker++)
   * @param actingStack - существо, которое только что совершило ход
   */
  advanceTurn(actingStack: CreatureStack): void {
    const removed = this.slots.shift();

    if (removed?.type === "round") {
      // Метка раунда ушла — добавляем следующую
      this.slots.push({ type: "round", roundNumber: this.nextRoundMarker });
      this.nextRoundMarker++;
    } else {
      // Стек ушёл — добавляем ходящий стек в конец (если живое)
      if (actingStack.getCreature().count > 0) {
        this.slots.push({ type: "stack", stack: actingStack });
      }
    }
  }

  /**
   * Обновить отображение очереди
   * @param queue - полная очередь существ
   * @param currentStack - текущий ход (для подсветки)
   */
  update(queue: CreatureStack[], currentStack: CreatureStack | null): void {
    // Если панель ещё не инициализирована — инициализируем
    if (this.slots.length === 0) {
      this.init(queue);
    }

    this.removeIcons();
    this.renderQueue(currentStack);
  }

  /**
   * Отрисовать очередь
   */
  private renderQueue(currentStack: CreatureStack | null): void {
    const iconSize = 36; // 24 * 1.5
    const gap = 12; // 8 * 1.5
    const startX = 15; // 10 * 1.5
    const startY = 15; // 10 * 1.5

    if (this.slots.length === 0) {
      this.panelWidth = 300; // 200 * 1.5
      this.drawBackground();
      return;
    }

    // Рисуем все непустые слоты (максимум MAX_SLOTS)
    const visibleCount = Math.min(this.slots.length, this.MAX_SLOTS);

    for (let i = 0; i < visibleCount; i++) {
      const slot = this.slots[i];

      const x = startX + i * (iconSize + gap);
      const y = startY;

      if (slot.type === "stack") {
        const isCurrent = slot.stack === currentStack;
        this.renderStackIcon(x, y, iconSize, slot.stack, isCurrent);
      } else if (slot.type === "round") {
        this.renderRoundMarker(x, y, iconSize, slot.roundNumber);
      }
    }

    // Ширина панели — фиксированная на 12 слотов
    this.panelWidth = this.MAX_SLOTS * (iconSize + gap) + 15; // 10 * 1.5
    this.drawBackground();
  }

  /**
   * Отрисовать иконку существа
   */
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
      width: isCurrent ? 4.5 : 1.5, // 3 * 1.5 : 1 * 1.5
      color: isCurrent ? 0xffffff : 0x888888,
    });

    const label = new PIXI.Text({
      text: String(creature.count),
      style: {
        fontSize: 15, // 10 * 1.5
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

  /**
   * Отрисовать метку раунда
   */
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
    graphic.circle(cx, cy, radius).fill({
      color: 0x333355,
      alpha: 0.8,
    });
    graphic.circle(cx, cy, radius).stroke({
      width: 1.5, // 1 * 1.5
      color: 0x555577,
    });

    const label = new PIXI.Text({
      text: `R${roundNumber}`,
      style: {
        fontSize: 13.5, // 9 * 1.5
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

    this.icons.push({
      slot: { type: "round", roundNumber },
      graphic,
      label,
    });
  }

  /**
   * Отрисовать фон панели
   */
  private drawBackground(): void {
    this.bg.clear();
    this.bg.roundRect(0, 0, this.panelWidth, this.panelHeight, 12).fill({
      // 8 * 1.5
      color: 0x0a0a1a,
      alpha: 0.6,
    });
    this.bg.roundRect(0, 0, this.panelWidth, this.panelHeight, 12).stroke({
      // 8 * 1.5
      width: 1.5, // 1 * 1.5
      color: 0x333355,
      alpha: 0.5,
    });
    this.setChildIndex(this.bg, 0);
  }

  /**
   * Очистить иконки
   */
  private removeIcons(): void {
    this.icons.forEach(({ graphic, label }) => {
      this.removeChild(graphic);
      this.removeChild(label);
    });
    this.icons = [];
  }
}
