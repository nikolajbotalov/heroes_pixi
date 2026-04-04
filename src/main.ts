import * as PIXI from "pixi.js";
import { BattleScene } from "./core/BattleScene";
import {
  DEFAULT_GRID_CONFIG,
  INITIAL_STACKS,
  APP_CONFIG,
} from "./core/BattleConfig";

(async (): Promise<void> => {
  // --- Инициализация PixiJS ---
  const app = new PIXI.Application();

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: APP_CONFIG.backgroundColor,
    antialias: APP_CONFIG.antialias,
  });

  document.body.appendChild(app.canvas);

  // --- Заголовок ---
  const title = new PIXI.Text({
    text: "Heroes Arena",
    style: {
      fontSize: 36,
      fill: 0xffffff,
      fontFamily: "Arial",
      fontWeight: "bold",
    },
  });
  title.anchor.set(0.5, 0);
  title.x = app.screen.width / 2;
  title.y = 10;
  app.stage.addChild(title);

  // --- Боевая сцена ---
  const battleScene = new BattleScene(app, DEFAULT_GRID_CONFIG, INITIAL_STACKS);
  battleScene.init();

  // --- Ресайз ---
  window.addEventListener("resize", (): void => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    title.x = app.screen.width / 2;
    battleScene.onResize();
  });
})();
