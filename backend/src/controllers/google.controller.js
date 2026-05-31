const googleOAuthService = require("../services/googleOAuth.service");
const googleTokenService = require("../services/googleToken.service");

async function startAuth(req, res, next) {
  try {
    // TEMP: hardcoded tenant for browser testing without auth
    const tenantId =
      req.tenantId ||
      req.query.tenant_id ||
      "c0fe89d6-d9a3-4b14-9534-e82ba3558897";
    const url = googleOAuthService.getAuthUrl(tenantId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

async function callback(req, res, next) {
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const result = await googleOAuthService.handleCallback({
      code: req.query.code,
      state: req.query.state,
    });

    res.redirect(`${frontend}/settings?google=connected&tenant_id=${result.tenantId}`);
  } catch (err) {
    const message = encodeURIComponent(err.message || "OAuth failed");
    res.redirect(`${frontend}/settings?google=error&message=${message}`);
  }
}

async function status(req, res, next) {
  try {
    const tenantId = req.tenantId || req.query.tenant_id;
    const connected = await googleTokenService.isConnected(tenantId);
    res.json({ connected, tenantId });
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const tenantId = req.tenantId || req.query.tenant_id;
    await googleTokenService.disconnect(tenantId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { startAuth, callback, status, disconnect };
