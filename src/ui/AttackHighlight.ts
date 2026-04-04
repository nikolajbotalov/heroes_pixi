import * as PIXI from "pixi.js";
import { Hex, hexToPixel, HEX_SIZE } from "../types/hex";
import { CreatureStack } from "../entities/CreatureStack";

/**
 * Подсветка доступных целей для атаки
 * Отображает красные гексы на вражеских стеках
 */
export class AttackHighlight extends PIXI.Container {
  private highlights: Map<string, PIXI.Graphics> = new Map();
  private hexSize: number;
  private onStackClickCallback: ((stack: CreatureStack) => void) | null = null;

  constructor(hexSize: number = HEX_SIZE) {
    super();
    this.hexSize = hexSize;
  }

  /**
   * Установить обработчик клика по стеку
   */
  setOnClick(callback: (stack: CreatureStack) => void): void {
    this.onStackClickCallback = callback;
  }

  /**
   * Показать подсветку для списка стеков-целей
   * @param targets - список стеков-целей
   * @param color - цвет подсветки: "red" (обычная атака) или "orange" (move+attack)
   */
  show(targets: CreatureStack[], color: "red" | "orange" = "red"): void {
    this.clear();

    const colorMap = {
      red: { fill: 0xff0000, stroke: 0xff0000, alpha: 0.35, strokeAlpha: 0.8 },
      orange: {
        fill: 0xff8c00,
        stroke: 0xff8c00,
        alpha: 0.4,
        strokeAlpha: 0.9,
      },
    };

    const colors = colorMap[color];

    for (const stack of targets) {
      const hex = stack.getHex();
      const key = `${hex.q},${hex.r}`;
      const graphic = this.createHighlight(hex, colors);

      graphic.on("click", (event) => {
        event.stopPropagation();
        if (this.onStackClickCallback) {
          this.onStackClickCallback(stack);
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
  private createHighlight(
    hex: Hex,
    colors: {
      fill: number;
      stroke: number;
      alpha: number;
      strokeAlpha: number;
    },
  ): PIXI.Graphics {
    const { x, y } = hexToPixel(hex, this.hexSize);
    const graphic = new PIXI.Graphics();
    const points = this.getHexCornerPoints(x, y);

    graphic.poly(points).fill({
      color: colors.fill,
      alpha: colors.alpha,
    });
    graphic.poly(points).stroke({
      width: 2,
      color: colors.stroke,
      alpha: colors.strokeAlpha,
    });

    // Делаем интерактивным для передачи кликов
    graphic.eventMode = "static";
    graphic.cursor = "crosshair";

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
