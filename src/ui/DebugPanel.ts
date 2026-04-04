import * as PIXI from "pixi.js";
import { Hex } from "../types/hex";

/**
 * Запись о перемещении
 */
interface MoveRecord {
  stackName: string;
  from: Hex;
  to: Hex;
  turn: number;
}

/**
 * Отладочная панель — отображает координаты перемещения существ атакующей стороны (игрока)
 */
export class DebugPanel extends PIXI.Container {
  private background: PIXI.Graphics;
  private titleText: PIXI.Text;
  private infoText: PIXI.Text;
  private panelWidth: number = 320;
  private moveHistory: MoveRecord[] = [];
  private currentTurn: number = 1;

  constructor() {
    super();

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.titleText = new PIXI.Text({
      text: "Отладка: перемещение игрока",
      style: {
        fontSize: 18,
        fill: 0x00ff88,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    this.addChild(this.titleText);

    this.infoText = new PIXI.Text({
      text: "Ожидание перемещений...",
      style: {
        fontSize: 13,
        fill: 0xaaffcc,
        fontFamily: "monospace",
        lineHeight: 18,
      },
    });
    this.addChild(this.infoText);

    this.render();
  }

  /**
   * Перерисовка панели
   */
  private render(): void {
    this.removeChildren();
    this.addChild(this.background);
    this.addChild(this.titleText);
    this.addChild(this.infoText);

    this.background.clear();

    const padding = 12;
    const titleHeight = 30;
    const panelHeight =
      titleHeight + this.calculateInfoHeight() + padding * 2 + 10;

    this.background.roundRect(0, 0, this.panelWidth, panelHeight, 8).fill({
      color: 0x0d1117,
      alpha: 0.92,
    });
    this.background.roundRect(0, 0, this.panelWidth, panelHeight, 8).stroke({
      width: 1,
      color: 0x00ff88,
      alpha: 0.4,
    });

    this.titleText.x = padding;
    this.titleText.y = padding;

    this.infoText.x = padding;
    this.infoText.y = padding + titleHeight;
  }

  /**
   * Рассчитать высоту текста информации
   */
  private calculateInfoHeight(): number {
    if (this.moveHistory.length === 0) return 24;
    // Каждая запись = 2 строки (from/to + turn), + заголовок
    return this.moveHistory.length * 36 + 24;
  }

  /**
   * Записать перемещение существа атакующей стороны
   */
  recordMove(stackName: string, from: Hex, to: Hex): void {
    this.moveHistory.push({
      stackName,
      from: { ...from },
      to: { ...to },
      turn: this.currentTurn,
    });

    this.updateDisplay();
    this.render();
  }

  /**
   * Увеличить счётчик хода (раунда)
   */
  nextTurn(): void {
    this.currentTurn++;
  }

  /**
   * Обновить отображение
   */
  private updateDisplay(): void {
    if (this.moveHistory.length === 0) {
      this.infoText.text = "Ожидание перемещений...";
      return;
    }

    const lines: string[] = [];
    // Показываем последние 8 записей (чтобы панель не росла бесконечно)
    const recent = this.moveHistory.slice(-8);

    lines.push(`Ход: ${this.currentTurn} | Всего перемещений: ${this.moveHistory.length}`);
    lines.push("");

    for (let i = 0; i < recent.length; i++) {
      const rec = recent[i];
      const globalIndex = this.moveHistory.length - recent.length + i + 1;
      lines.push(
        `#${globalIndex} [Ход ${rec.turn}] ${rec.stackName}\n` +
        `  from: (${rec.from.q}, ${rec.from.r})\n` +
        `  to:   (${rec.to.q}, ${rec.to.r})`
      );
      lines.push("");
    }

    this.infoText.text = lines.join("\n");
  }

  /**
   * Очистить историю перемещений
   */
  clear(): void {
    this.moveHistory = [];
    this.currentTurn = 1;
    this.updateDisplay();
    this.render();
  }
}
