const tenantsService = require("../services/tenants.service");

async function list(req, res, next) {
  try {
    const tenantId = req.user.role === "admin" ? req.tenantId || undefined : req.user.tenantId;
    const tenants = await tenantsService.listTenants(tenantId);
    res.json({ tenants });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const tenant = await tenantsService.getTenantById(req.params.id);

    if (req.user.role !== "admin" && tenant.id !== req.user.tenantId) {
      const err = new Error("Access denied");
      err.status = 403;
      throw err;
    }

    res.json({ tenant });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const tenant = await tenantsService.createTenant(req.body, req.user);
    res.status(201).json({ tenant });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const tenant = await tenantsService.updateTenant(req.params.id, req.body, req.user);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await tenantsService.deleteTenant(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
