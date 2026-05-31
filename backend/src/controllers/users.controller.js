const usersService = require("../services/users.service");

async function list(req, res, next) {
  try {
    const tenantId = req.user.role === "admin" ? req.tenantId || req.query.tenant_id : req.user.tenantId;
    const users = await usersService.listUsers({
      tenantId: tenantId || undefined,
      role: req.query.role,
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);

    if (req.user.role !== "admin" && user.id !== req.user.userId) {
      if (req.user.tenantId !== user.tenant_id) {
        const err = new Error("Access denied");
        err.status = 403;
        throw err;
      }
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await usersService.createUser(req.body, req.user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await usersService.deleteUser(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
