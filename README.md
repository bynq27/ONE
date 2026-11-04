# 合成塔防

网页塔防游戏：把同类同星的塔拖到一起合成升星；每波结束三选一（塔卡、配方、遗物）。两关（绿谷、双径河谷），每关 15 波、3 个 Boss；通关第一关解锁第二关。

## 直接玩
- 在线版：https://claude.ai/artifact/BCqoE5KFoUHQnKPZYBf7TR （私有链接，需在页面的分享菜单里开放给他人）
- 本地版：`npm run build` 后打开 `dist/index.html`（单文件，双击即可，不需要联网；联网时会加载更好看的字体）

设计文档：https://claude.ai/artifact/VABQHLsy5qM1FpTdx6rN6F

## 难度
开局前在标题界面选择：简单 / 困难 / 噩梦。数值在 `src/config.ts` 的 `DIFFICULTIES`。最佳纪录按难度分别保存。

## 操作
- 从底部商店把塔拖到草地上；也可以先点商店里的塔，再点草地
- 把地图上的塔拖到另一座同类同星的塔上 = 合成；拖到空草地 = 移动（每波 2 次）
- 点塔查看属性、卖出；点敌人查看血量
- 每波结束按手上金币的 10% 给利息（最多 30），金币旁边会显示
- 战斗中按 Q 或点「火雨」，再点地图落下火球（冷却 40 秒）
- 已获得的配方和遗物显示在左上角，点一下看说明；暂停界面有完整列表
- 快捷键：1–4 选塔 · 空格 暂停 · F 倍速 · Enter 开波 · Esc 取消

## 开发
需要 Node 18+。
```
npm install
npm run dev     # 本地开发服务器
npm run build   # 打包成 dist/index.html 单文件
```
- 所有数值在 `src/config.ts`
- 美术（D 风格手绘奇幻）全部用代码绘制，在 `src/sprites.ts`
- 音效和背景音乐用 ZzFX（MIT，见 `src/zzfx.ts`）即时合成（`src/audio.ts`）；以后可替换为素材库的音频文件
- `sim/bot.ts`：自动对局脚本，用于检查难度：`npx esbuild sim/bot.ts --bundle --platform=node --outfile=sim/bot.cjs && node sim/bot.cjs`

## 发布
- `python3 scripts/make-artifact.py release/play.html`：把 `dist/index.html` 转成在线版发布用的页面
- `docs/map2-sketch.png`：第二关「双径河谷」的设计草图

## 文件结构
| 文件 | 内容 |
| --- | --- |
| src/config.ts | 塔、敌人、波次、配方、遗物、卡池数值 |
| src/map.ts | 关卡地图（绿谷、双径河谷）：多条道路、障碍、可建格、每关波次 |
| src/game.ts | 游戏逻辑：波次、战斗、合成、经济、三选一 |
| src/render.ts | Canvas 绘制：深度排序、特效、射程椭圆 |
| src/sprites.ts | SVG 美术 → 预渲染位图 |
| src/ui.ts | HUD、商店、卡牌、信息框、面板 |
| src/main.ts | 输入（拖拽/点击/键盘）、主循环、存档 |
| src/audio.ts | 音效与背景音乐 |
| src/zzfx.ts | ZzFX 合成器（MIT） |
