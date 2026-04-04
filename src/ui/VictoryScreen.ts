import * as PIXI from "pixi.js";
import { BattleOutcome } from "../core/VictoryConditionManager";

/**
 * Экран конца боя — победа или поражение
 * Показывает полупрозрачный оверлей с текстом и кнопкой
 */
export class VictoryScreen extends PIXI.Container {
  private overlay: PIXI.Graphics;
  private titleText: PIXI.Text;
  private subtitleText: PIXI.Text;
  private restartButton: PIXI.Container;
  private onRestartCallback: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;

    this.overlay = new PIXI.Graphics();
    this.titleText = new PIXI.Text({
      text: "",
      style: {
        fontSize: 48,
        fontFamily: "Arial",
        fontWeight: "bold",
        stroke: {
          color: 0x000000,
          width: 4,
        },
      },
    });
    this.titleText.anchor.set(0.5);

    this.subtitleText = new PIXI.Text({
      text: "",
      style: {
        fontSize: 24,
        fontFamily: "Arial",
        stroke: {
          color: 0x000000,
          width: 3,
        },
      },
    });
    this.subtitleText.anchor.set(0.5);

    this.restartButton = this.createRestartButton();

    this.addChild(this.overlay);
    this.addChild(this.titleText);
    this.addChild(this.subtitleText);
    this.addChild(this.restartButton);
  }

  /**
   * Показать экран конца боя
   */
  show(outcome: BattleOutcome, screenWidth: number, screenHeight: number): void {
    this.visible = true;

    // Рисуем оверлей
    this.overlay.clear();
    this.overlay.rect(0, 0, screenWidth, screenHeight).fill({
      color: 0x000000,
      alpha: 0.7,
    });

    // Настраиваем текст в зависимости от исхода
    if (outcome === "victory") {
      this.titleText.text = "ПОБЕДА!";
      this.titleText.style.fill = 0xf1c40f;
      this.subtitleText.text = "Враг повержен!";
      this.subtitleText.style.fill = 0xffffff;
    } else {
      this.titleText.text = "ПОРАЖЕНИЕ";
      this.titleText.style.fill = 0xe74c3c;
      this.subtitleText.text = "Ваша армия уничтожена...";
      this.subtitleText.style.fill = 0xffffff;
    }

    // Позиционируем элементы
    this.titleText.x = screenWidth / 2;
    this.titleText.y = screenHeight / 2 - 60;

    this.subtitleText.x = screenWidth / 2;
    this.subtitleText.y = screenHeight / 2;

    this.restartButton.x = screenWidth / 2 - 75;
    this.restartButton.y = screenHeight / 2 + 50;
  }

  /**
   * Скрыть экран
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Создать кнопку перезапуска
   */
  private createRestartButton(): PIXI.Container {
    const container = new PIXI.Container();
    const width = 150;
    const height = 40;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 8).fill({
      color: 0x2980b9,
      alpha: 0.9,
    });
    bg.roundRect(0, 0, width, height, 8).stroke({
      width: 2,
      color: 0xffffff,
      alpha: 0.5,
    });
    container.addChild(bg);

    const text = new PIXI.Text({
      text: "Заново",
      style: {
        fontSize: 18,
        fill: 0xffffff,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    container.addChild(text);

    container.eventMode = "static";
    container.cursor = "pointer";

    container.on("mouseenter", () => {
      bg.clear();
      bg.roundRect(0, 0, width, height, 8).fill({
        color: 0x3498db,
        alpha: 1.0,
      });
      bg.roundRect(0, 0, width, height, 8).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.8,
      });
    });

    container.on("mouseleave", () => {
      bg.clear();
      bg.roundRect(0, 0, width, height, 8).fill({
        color: 0x2980b9,
        alpha: 0.9,
      });
      bg.roundRect(0, 0, width, height, 8).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.5,
      });
    });

    container.on("click", (event) => {
      event.stopPropagation();
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    });

    return container;
  }

  /**
   * Установить обработчик перезапуска
   */
  setOnRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  /**
   * Изменить размер экрана
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.overlay.clear();
    this.overlay.rect(0, 0, screenWidth, screenHeight).fill({
      color: 0x000000,
      alpha: 0.7,
    });

    this.titleText.x = screenWidth / 2;
    this.titleText.y = screenHeight / 2 - 60;

    this.subtitleText.x = screenWidth / 2;
    this.subtitleText.y = screenHeight / 2;

    this.restartButton.x = screenWidth / 2 - 75;
    this.restartButton.y = screenHeight / 2 + 50;
  }
}
