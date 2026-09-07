# RuoYi-Vue3 饮料管理系统 — 长期笔记

## 仓库与远程

- 远程仓库：`origin = https://github.com/MIKU-RI/rese-vue3.git`（2026-09-07 迁移自官方 RuoYi-Vue3 上游；GitHub 账号 MIKU-RI）
- 完整历史 439 commits（曾为 shallow clone，已 unshallow；勿再使用 --depth 克隆本仓库，否则无法推送到新空仓库）
- 本仓库凭据：local 配置 `credential.helper=""` + `wincred`（读 Windows 凭据管理器中 MIKU-RI 的 PAT）；不要依赖 WorkBuddy 的 helper-selector 弹窗（不可靠）
- 备用 Git：`C:/Program Files/Git/cmd/git.exe` 系统标准版；WorkBuddy 便携版为魔改版（helper-selector、LFS 过滤器注入）
- 网络：代理 `127.0.0.1:2129` 访问 GitHub 稳定；直连不稳定；Gitee `y_project/RuoYi-Vue3` 已 404

## 开发规范（用户要求）

- 代码改动必须单独打 git commit，commit message 详细描述改动内容，便于日后 git log 审阅
- 数据库表 / 定时任务的改动需在固定文档中生成改动记录
- 系统为饮料管理系统（RuoYi-Vue3 前端）：采购、销售、退货、库存、品牌定价等模块
- 交互约定：供应商、客户、商品+品牌等关联查询一律用下拉框，不用文本输入
