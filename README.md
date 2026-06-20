# 群星世界杯 · Stars World Cup

> 跨越时空，你的梦幻阵容能走多远

一款单页 H5 足球阵容模拟小游戏：选 1 个国家 → 1 套阵型 → 系统按位置随机抽届 → 玩家从该届适配该位置的球员中挑 1 人 → 凑齐 11 人 → 生成阵容海报。

- 在线访问：https://kouzihou.github.io/stars-world-cup/
- 数据：61 个国家 × 10 届世界杯（1990-2026）共 7024 名真实球员
- 技术栈：Vite + Vue 3 + TailwindCSS + Pinia + vue-router (HashRouter)

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在 `dist/`。推送到 main 分支后 GitHub Actions 会自动部署到 GitHub Pages。

## 数据契约

- `public/data/countries.json`：64 国清单 + 13 条 B 类顶替规则 + 10 届元信息
- `public/data/formations.json`：8 种阵型 + 11 个 slot（含 x/y 坐标）
- `public/data/players/{CODE}.json`：每国 10 届球员名单

## 品牌

- 金 #FFD700 · 草绿 #16A34A · 深蓝 #1E3A8A
