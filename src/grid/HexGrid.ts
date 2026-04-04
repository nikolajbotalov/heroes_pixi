import * as PIXI from "pixi.js";
import { Hex, hexToPixel, HEX_SIZE } from "../types/hex";

/**
 * Генерация всех гексов для поля боя заданного размера
 * Возвращает массив гексов в форме ромба/прямоугольника
 */
function generateHexGrid(width: number, height: number): Hex[] {
  const hexes: Hex[] = [];
  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < width - rOffset; q++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Класс для отрисовки гексагональной сетки
 */
export class HexGrid extends PIXI.Container {
  private hexSize: number;
  private hexes: Hex[];

  constructor(gridWidth: number, gridHeight: number, size: number = HEX_SIZE) {
    super();
    this.hexSize = size;
    this.hexes = generateHexGrid(gridWidth, gridHeight);
    this.renderGrid();
  }

  /**
   * Отрисовка всех гексов
   */
  private renderGrid(): void {
    this.removeChildren();

    for (const hex of this.hexes) {
      const hexGraphic = this.createHexOutline(hex);
      this.addChild(hexGraphic);
    }
  }

  /**
   * Создать контур одного гекса
   */
  private createHexOutline(hex: Hex): PIXI.Graphics {
    const { x, y } = hexToPixel(hex, this.hexSize);
    const graphic = new PIXI.Graphics();

    const points = this.getHexCornerPoints(x, y);

    // Контур гекса
    graphic.poly(points).stroke({
      width: 1,
      color: 0x555577,
    });

    // Лёгкая заливка для видимости
    graphic.poly(points).fill({
      color: 0x2a2a4a,
      alpha: 0.3,
    });

    return graphic;
  }

  /**
   * Получить точки углов гекса (pointy-top)
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

  /**
   * Получить массив всех гексов
   */
  getHexes(): Hex[] {
    return [...this.hexes];
  }
}
