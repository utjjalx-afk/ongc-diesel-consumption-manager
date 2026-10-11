import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(String(password), salt, 64).toString('hex')}`;
}

export function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const [scheme, salt, digest] = encoded.split(':');
  if (scheme !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(digest || '')) return false;
  return timingSafeEqual(scryptSync(String(password), salt, 64), Buffer.from(digest, 'hex'));
}

export function migratePasswords(db) {
  for (const user of db.users) {
    if (user.password !== undefined) {
      user.passwordHash = hashPassword(user.password);
      delete user.password;
    }
    delete user.altPasswords;
  }
  return db;
}

export function publicUser(user) {
  const { password, passwordHash, altPasswords, ...safe } = user;
  return safe;
}

export function createSessionManager(loadUsers) {
  const sessions = new Map();
  const cookieName = 'ongc_session';
  function cookie(req) {
    return String(req.headers.cookie || '').split(';').map(p => p.trim())
      .find(p => p.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  }
  return {
    issue(req, res, user, remember = false) {
      for (const [key, session] of sessions) if (session.expires <= Date.now()) sessions.delete(key);
      const previous = cookie(req);
      if (previous) sessions.delete(previous);
      const token = randomBytes(32).toString('hex');
      const duration = (remember ? 7 * 24 : 12) * 60 * 60 * 1000;
      sessions.set(token, { userId: user.userId, expires: Date.now() + duration });
      res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: req.secure,
        path: '/', ...(remember ? { maxAge: duration } : {}) });
    },
    revoke(req, res) {
      sessions.delete(cookie(req));
      res.clearCookie(cookieName, { path: '/', httpOnly: true, sameSite: 'strict' });
    },
    identify(req) {
      const key = cookie(req);
      if (!key) return null;
      const session = sessions.get(key);
      if (!session || session.expires <= Date.now()) {
        sessions.delete(key);
        return null;
      }
      const user = loadUsers().users.find(u => u.userId === session.userId);
      if (!user || user.status !== 'active') {
        sessions.delete(key);
        return null;
      }
      return publicUser(user);
    },
    authenticate(req, res, next) {
      const key = cookie(req);
      const session = sessions.get(key);
      if (!session || session.expires <= Date.now()) {
        sessions.delete(key);
        return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
      }
      const user = loadUsers().users.find(u => u.userId === session.userId);
      if (!user || user.status !== 'active') {
        sessions.delete(key);
        return res.status(401).json({ success: false, error: 'Your account is unavailable. Please sign in again.' });
      }
      req.user = publicUser(user);
      next();
    }
  };
}
