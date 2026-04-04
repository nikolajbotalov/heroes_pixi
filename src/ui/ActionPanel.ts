import * as PIXI from "pixi.js";

/**
 * Типы действий в бою
 */
export type ActionType = "attack" | "defend" | "wait" | "move" | "skip";

/**
 * Панель действий (Attack, Defend, Wait, Move)
 * Отображается при выделении стека в фазе выбора действия
 */
export class ActionPanel extends PIXI.Container {
  private buttons: Map<ActionType, PIXI.Container> = new Map();
  private onActionCallback: ((action: ActionType) => void) | null = null;
  public panelHeight: number = 36; // Высота панели (кнопки)

  constructor() {
    super();
    this.setupButtons();
  }

  /**
   * Установить обработчик выбора действия
   */
  setOnAction(callback: (action: ActionType) => void): void {
    this.onActionCallback = callback;
  }

  /**
   * Создать кнопки действий
   */
  private setupButtons(): void {
    const actions: Array<{ type: ActionType; label: string; color: number }> = [
      { type: "attack", label: "⚔ Атака", color: 0xc0392b },
      { type: "defend", label: "🛡 Защита", color: 0x2980b9 },
      { type: "wait", label: "⏳ Ждать", color: 0x8e44ad },
      { type: "move", label: "👟 Движение", color: 0x27ae60 },
      { type: "skip", label: "⏭ Пропустить ход", color: 0x0f3460 },
    ];

    const buttonWidth = 140;
    const buttonHeight = 36;
    const gap = 8;

    actions.forEach((action, index) => {
      const button = this.createButton(
        action.label,
        action.color,
        buttonWidth,
        buttonHeight,
        () => this.onButtonClick(action.type),
      );

      button.x = index * (buttonWidth + gap);
      this.buttons.set(action.type, button);
      this.addChild(button);
    });

    // Центрируем панель
    const totalWidth =
      actions.length * buttonWidth + (actions.length - 1) * gap;
    this.x = -totalWidth / 2;
  }

  /**
   * Создать одну кнопку
   */
  private createButton(
    label: string,
    color: number,
    width: number,
    height: number,
    onClick: () => void,
  ): PIXI.Container {
    const container = new PIXI.Container();

    // Фон кнопки
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 6).fill({
      color: color,
      alpha: 0.85,
    });
    bg.roundRect(0, 0, width, height, 6).stroke({
      width: 2,
      color: 0xffffff,
      alpha: 0.3,
    });
    container.addChild(bg);

    // Текст
    const text = new PIXI.Text({
      text: label,
      style: {
        fontSize: 14,
        fill: 0xffffff,
        fontFamily: "Arial",
        fontWeight: "bold",
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    container.addChild(text);

    // Интерактивность
    container.eventMode = "static";
    container.cursor = "pointer";

    // Hover эффекты
    container.on("mouseenter", () => {
      bg.clear();
      bg.roundRect(0, 0, width, height, 6).fill({
        color: color,
        alpha: 1.0,
      });
      bg.roundRect(0, 0, width, height, 6).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.8,
      });
    });

    container.on("mouseleave", () => {
      bg.clear();
      bg.roundRect(0, 0, width, height, 6).fill({
        color: color,
        alpha: 0.85,
      });
      bg.roundRect(0, 0, width, height, 6).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.3,
      });
    });

    container.on("click", (event) => {
      event.stopPropagation();
      onClick();
    });

    return container;
  }

  /**
   * Обработка клика по кнопке
   */
  private onButtonClick(action: ActionType): void {
    if (this.onActionCallback) {
      this.onActionCallback(action);
    }
  }

  /**
   * Показать панель
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Скрыть панель
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Деактивировать кнопку (сделать неактивной)
   */
  disableAction(action: ActionType): void {
    const button = this.buttons.get(action);
    if (button) {
      button.alpha = 0.3;
      button.eventMode = "none";
    }
  }

  /**
   * Активировать кнопку
   */
  enableAction(action: ActionType): void {
    const button = this.buttons.get(action);
    if (button) {
      button.alpha = 1.0;
      button.eventMode = "static";
    }
  }
}
