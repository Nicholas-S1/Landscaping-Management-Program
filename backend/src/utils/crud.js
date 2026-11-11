const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const httpError = (status, message) => Object.assign(new Error(message), { status });

const isManager = (user) => ['manager', 'admin'].includes(user.role);
const isStaff = (user) => ['employee', 'manager', 'admin'].includes(user.role);

// Copies only whitelisted keys; empty strings become null so blank form fields clear a value.
const pick = (source, keys) =>
  keys.reduce((result, key) => {
    if (source[key] !== undefined) result[key] = source[key] === '' ? null : source[key];
    return result;
  }, {});

const paginate = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  return { page, limit, offset: (page - 1) * limit };
};

const sendList = async (Model, req, res, { where = {}, include = [], order = [['createdAt', 'DESC']], map } = {}) => {
  const { page, limit, offset } = paginate(req.query);
  const { count, rows } = await Model.findAndCountAll({ where, include, order, limit, offset, distinct: true });
  res.json({
    success: true,
    data: {
      items: map ? rows.map(map) : rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) }
    }
  });
};

const findOr404 = async (Model, id, options = {}) => {
  const record = await Model.findByPk(id, options);
  if (!record) throw httpError(404, `${Model.name} not found`);
  return record;
};

module.exports = { wrap, httpError, isManager, isStaff, pick, paginate, sendList, findOr404 };
