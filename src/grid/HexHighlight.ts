import * as PIXI from "pixi.js";
import { Hex, hexToPixel, HEX_SIZE } from "../types/hex";

/**
 * Визуальная подсветшка доступных гексов
 * Отображает полупрозрачные зелёные гексы
 */
export class HexHighlight extends PIXI.Container {
  private highlights: Map<string, PIXI.Graphics> = new Map();
  private hexSize: number;
  private onHexClickCallback: ((hex: Hex) => void) | null = null;

  constructor(hexSize: number = HEX_SIZE) {
    super();
    this.hexSize = hexSize;
  }

  /**
   * Установить обработчик клика по гексу
   */
  setOnClick(callback: (hex: Hex) => void): void {
    this.onHexClickCallback = callback;
  }

  /**
   * Показать подсветку для списка гексов
   */
  show(hexes: Hex[]): void {
    this.clear();

    for (const hex of hexes) {
      const key = `${hex.q},${hex.r}`;
      const graphic = this.createHighlight(hex);

      graphic.on("click", (event) => {
        event.stopPropagation();
        if (this.onHexClickCallback) {
          this.onHexClickCallback(hex);
        }
      });

      this.highlights.set(key, graphic);
      this.addChild(graphic);
    }
  }

  /**
   * Скрыть все подсветки
   */
  clear(): void {
    this.removeChildren();
    this.highlights.clear();
  }

  /**
   * Создать один гекс-подсветку
   */
  private createHighlight(hex: Hex): PIXI.Graphics {
    const { x, y } = hexToPixel(hex, this.hexSize);
    const graphic = new PIXI.Graphics();
    const points = this.getHexCornerPoints(x, y);

    graphic.poly(points).fill({
      color: 0x00ff00,
      alpha: 0.25,
    });
    graphic.poly(points).stroke({
      width: 1,
      color: 0x00ff00,
      alpha: 0.6,
    });

    // Делаем интерактивным для передачи кликов
    graphic.eventMode = "static";
    graphic.cursor = "pointer";

    return graphic;
  }

  /**
   * Получить точки углов гекса
   */
  private getHexCornerPoints(cx: number, cy: number): number[] {
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = cx + this.hexSize * Math.cos(angle);
      const py = cy + this.hexSize * Math.sin(angle);
      points.push(px, py);
    }
    return points;
  }
}
