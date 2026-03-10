/* =========================================================
   PC#100 – Local Tester Accounts (no backend)
   Purpose:
     - Define 10 predefined local tester accounts (id/username/password)
     - Provide canonical lookup helpers (by id / by username+password)
========================================================= */

export const ACCOUNTS_LOCAL_V1 = Object.freeze([
  { id: 'u1',  username: 'alpha',   password: 'test123' },
  { id: 'u2',  username: 'bravo',   password: 'test123' },
  { id: 'u3',  username: 'charlie', password: 'test123' },
  { id: 'u4',  username: 'delta',   password: 'test123' },
  { id: 'u5',  username: 'echo',    password: 'test123' },
  { id: 'u6',  username: 'foxtrot', password: 'test123' },
  { id: 'u7',  username: 'golf',    password: 'test123' },
  { id: 'u8',  username: 'hotel',   password: 'test123' },
  { id: 'u9',  username: 'india',   password: 'test123' },
  { id: 'u10', username: 'juliet',  password: 'test123' },
]);

function _normUsername(u) { return String(u ?? '').trim().toLowerCase(); }
function _normPassword(p) { return String(p ?? ''); }

export function getAccountById(userId) {
  const id = String(userId ?? '').trim();
  if (!id) return null;
  return ACCOUNTS_LOCAL_V1.find(a => a.id === id) || null;
}

export function hasUserId(userId) {
  return !!getAccountById(userId);
}

export function findAccount(username, password) {
  const u = _normUsername(username);
  const p = _normPassword(password);
  if (!u || !p) return null;
  return ACCOUNTS_LOCAL_V1.find(a =>
    _normUsername(a.username) === u && _normPassword(a.password) === p
  ) || null;
}

export function listAccountsSafe() {
  return ACCOUNTS_LOCAL_V1.map(a => ({ id: a.id, username: a.username }));
}

export default Object.freeze({
  ACCOUNTS_LOCAL_V1,
  getAccountById,
  hasUserId,
  findAccount,
  listAccountsSafe,
});