# 第一章试玩版

在线版：https://claude.ai/artifact/FLsUaH9tS3dYWUURQh7z92 （私有链接，需在页面的分享菜单里开放给他人）

本地玩：用浏览器直接打开 `index.html`。不需要安装任何东西，字体需要联网加载。

## 文件
| 文件 | 内容 |
|---|---|
| `index.html` | 页面结构和样式 |
| `js/puppets.js` | 皮影角色：拆分部件、关节动作 |
| `js/scenes.js` | 各个场景的幕布剪影、证物图标 |
| `js/story.js` | 剧本、证物、调查点、地图、三轮质证的数据 |
| `js/engine.js` | 剧本引擎：对话、选择、调查、地图、质证、令签、存档、音效 |

## 改剧本
台词都在 `js/story.js` 的 `YY.SCRIPT` 里，是一套很简单的脚本格式，语法说明在 `js/engine.js` 顶部。比如：

```
# 节点名
@bg hall
@chars shen@L han@C fu@R
han: 阿福，把那晚听见的，原原本本说一遍。
fu[shock]: 大人饶命！
```

公堂上每句证词能出示什么证物，在 `YY.TRIALS` 的 `present` 里配置。
