const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

/**
 * 租户上下文中间件
 *
 * 从以下来源（按优先级）获取 tenant_id，设置到 req.tenantId：
 * 1. JWT 中的 tenant_id（商家端已登录请求）
 * 2. 查询参数 __tenant（顾客端扫码请求）
 *
 * 不拒绝请求 —— 路由自行处理缺少 tenant_id 的情况。
 */
function tenantContext(req, res, next) {
  // 1. 从 JWT 获取（商家端请求）
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const user = jwt.verify(header.slice(7), JWT_SECRET);
      if (user.tenant_id) {
        req.tenantId = user.tenant_id;
        req.user = user;
        return next();
      }
    }
  } catch {}

  // 2. 从查询参数获取（顾客端请求）
  const tid = parseInt(req.query.__tenant);
  if (tid > 0) {
    req.tenantId = tid;
    return next();
  }

  next();
}

/**
 * 要求请求携带租户信息，否则返回 400
 */
function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(400).json({ error: '缺少租户信息' });
  }
  next();
}

module.exports = { tenantContext, requireTenant };
