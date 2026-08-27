const { db, auth } = require('../firebaseAdmin');

const ROLES = ['empleado', 'instructor', 'admin_area', 'admin_rrhh', 'knowledge_manager', 'superadmin'];

const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'ultragroupla.com,linextravel.com,linex-loyalty.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function emailDomainAllowed(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

// Verifies the Firebase ID token, then loads (or auto-provisions) the app's
// own `users/{uid}` doc. A successful Microsoft/Entra ID login only proves
// identity — this is the app's own authorization layer on top of it, per
// .claude/skills/connect-entra-id-firebase-auth/SKILL.md, "Implementation
// in a new app inside linexrewards-app", step 3.
async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    if (!match) {
      return next({ status: 401, message: 'Falta el token de autenticación' });
    }

    const decoded = await auth.verifyIdToken(match[1]);
    const email = decoded.email;

    if (!email || !decoded.email_verified) {
      return next({ status: 403, message: 'La cuenta de Microsoft debe tener un correo verificado' });
    }

    const userRef = db.collection('users').doc(decoded.uid);
    const snap = await userRef.get();

    let userData;
    if (snap.exists) {
      userData = snap.data();
    } else {
      if (!emailDomainAllowed(email)) {
        return next({ status: 403, message: 'Tu dominio de correo no tiene acceso a esta plataforma' });
      }
      userData = {
        email,
        displayName: decoded.name || email,
        role: 'empleado',
        createdAt: new Date().toISOString(),
      };
      await userRef.set(userData);
    }

    req.user = { uid: decoded.uid, ...userData };
    next();
  } catch (err) {
    next({ status: 401, message: 'Token inválido o expirado', cause: err });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next({ status: 401, message: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return next({ status: 403, message: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole, ROLES, emailDomainAllowed };
