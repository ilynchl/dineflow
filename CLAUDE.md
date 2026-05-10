# CLAUDE.md

## 语言要求

- 所有代码说明、变更描述、技术讨论，均使用中文
- 代码中的注释也应使用中文（保持变量名、函数名等标识符为英文不变）

## 数据库表命名规则

- **运营中台**（平台级）表前缀：`df_sys_`，例如 `df_sys_users`、`df_sys_tenants`
- **商家后台**（租户级）表前缀：`df_tns_`，例如 `df_tns_categories`、`df_tns_orders`

## 多租户架构

- **商家端**：每一个商家是一个独立租户（`df_sys_tenants` 中的一条记录），所有业务数据通过 `tenant_id` 完全隔离
  - 所有 `df_tns_*` 表均有 `tenant_id` 列，查询/写入时严格按 `tenant_id` 过滤
  - 商家端 API 请求通过 JWT 中的 `tenant_id` 自动过滤数据
  - 不同商家可创建同名的桌号、分类、菜品等（唯一约束均为 `(tenant_id, column)` 复合索引）
- **运营中台**：没有租户概念，`df_sys_*` 表不包含 `tenant_id` 列
  - 运营后台 API（`/api/saas/*`、`/api/system-params/*`）只校验 `super_admin` 角色，不涉及租户隔离
  - `df_sys_users` 为系统管理员表，无 `tenant_id` 字段
- **顾客端**：顾客无登录态，通过扫码 `/?__tenant=X&table=Y` 传入租户和桌号上下文，API 根据 `__tenant` 参数过滤对应商户的数据
  - 下单时 `tenant_id` 通过 `table_id` 关联 `df_tns_tables` 自动派生，防止篡改
  - 完整链接示例：`http://localhost:5173/?__tenant=3&table=7`

## Git 仓库

- GitHub 仓库：`https://github.com/ilynchl/dineflow.git`（remote: `origin`）
- 代码推送：`git push origin master`