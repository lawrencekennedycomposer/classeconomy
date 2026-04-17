/* =========================================================
   PC#100 – Local Tester Accounts (no backend)
   Purpose:
     - Define 10 predefined local tester accounts (id/username/password)
     - Provide canonical lookup helpers (by id / by username+password)
========================================================= */

export const ACCOUNTS_LOCAL_V1 = Object.freeze([
  { id: 'u1',  username: 'L Kennedy',   password: 'Lawrence' },
  { id: 'u2',  username: 'T Forsyth',   password: 'Tam' },
  { id: 'u3',  username: 'P Austin', password: 'Pete' },
  { id: 'u4',  username: 'R Boland',   password: 'Roberto' },
  { id: 'u5',  username: 'J Caught',    password: 'Jason' },
  { id: 'u6',  username: 'J Giles', password: 'Jo' },
  { id: 'u7',  username: 'A Broadley',    password: 'Andrew' },
  { id: 'u8',  username: 'S Hawkins',   password: 'Stephen' },
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