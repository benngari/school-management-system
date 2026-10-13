// Role -> permission map. "*" = everything. Permission = "<module>:<read|write|...>".
const R = {
  super_admin: ['*'],
  school_admin: ['*'],
  headteacher: ['*:read', 'students:write', 'staff:write', 'duty:write', 'duty:approve', 'events:write', 'tasks:write', 'academics:write', 'announcements:write', 'discipline:write'],
  deputy: ['*:read', 'students:write', 'duty:write', 'duty:approve', 'events:write', 'tasks:write', 'academics:write', 'announcements:write', 'discipline:write'],
  bursar: ['students:read', 'finance:write', 'reports:read', 'announcements:read'],
  teacher: ['students:read', 'academics:read', 'attendance:write', 'results:write', 'duty:read', 'duty:self', 'events:read', 'tasks:read', 'announcements:read', 'leave:self', 'library:read'],
  class_teacher: ['students:read', 'academics:read', 'attendance:write', 'results:write', 'duty:read', 'duty:self', 'events:read', 'tasks:read', 'announcements:read', 'leave:self', 'discipline:write'],
  librarian: ['students:read', 'library:write', 'announcements:read'],
  secretary: ['students:write', 'admissions:write', 'announcements:read', 'events:read'],
  transport_manager: ['students:read', 'transport:write', 'duty:read', 'duty:self'],
  boarding_manager: ['students:read', 'boarding:write', 'duty:read', 'duty:self'],
  kitchen_manager: ['kitchen:write', 'duty:read', 'duty:self'],
  clinic_staff: ['students:read', 'clinic:write'],
  maintenance: ['maintenance:write', 'tasks:read', 'duty:self'],
  parent: ['portal:parent', 'announcements:read', 'events:read'],
  student: ['portal:student', 'announcements:read', 'events:read'],
};
// "*:read" grants read on every module; "<m>:write" implies "<m>:read".
const can = (role, perm) => {
  const list = R[role] || [];
  const [mod, act] = perm.split(':');
  return list.includes('*') || list.includes(perm) || list.includes(`*:${act}`) ||
    (act === 'read' && list.includes(`${mod}:write`));
};
module.exports = { ROLES: Object.keys(R), can, R };
