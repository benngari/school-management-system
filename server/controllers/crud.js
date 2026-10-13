const { asyncH, ok, ApiError } = require('../utils/helpers');
const audit = require('../services/audit');
// Generic, permission-guarded CRUD with pagination, search, filtering and audit logging.
module.exports = (Model, { search = [], populate = '', sort = '-createdAt', filters = [], auditName } = {}) => ({
  list: asyncH(async (req, res) => {
    const page = Math.max(1, +req.query.page || 1), limit = Math.min(200, +req.query.limit || 25);
    const q = {};
    for (const f of filters) if (req.query[f] !== undefined && req.query[f] !== '') q[f] = req.query[f];
    if (req.query.q && search.length) { const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = search.map((f) => ({ [f]: rx })); }
    const [items, total] = await Promise.all([Model.find(q).populate(populate).sort(req.query.sort || sort).skip((page - 1) * limit).limit(limit), Model.countDocuments(q)]);
    ok(res, items, { page, limit, total, pages: Math.ceil(total / limit) });
  }),
  get: asyncH(async (req, res) => { const d = await Model.findById(req.params.id).populate(populate); if (!d) throw new ApiError(404, 'Not found'); ok(res, d); }),
  create: asyncH(async (req, res) => { const d = await Model.create(req.body); await audit(req, 'create', auditName || Model.modelName, d._id); ok(res, d, {}, 201); }),
  update: asyncH(async (req, res) => {
    const d = await Model.findById(req.params.id); if (!d) throw new ApiError(404, 'Not found');
    d.set(req.body); await d.save(); await audit(req, 'update', auditName || Model.modelName, d._id); ok(res, d);
  }),
  remove: asyncH(async (req, res) => { const d = await Model.findByIdAndDelete(req.params.id); if (!d) throw new ApiError(404, 'Not found'); await audit(req, 'delete', auditName || Model.modelName, d._id); ok(res, { deleted: true }); }),
});
