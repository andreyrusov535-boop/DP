const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { BCRYPT_ROUNDS, JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY } = require('../config');
const { createUser, getUserByEmail, updateUser } = require('../models/userModel');
const { logAuditEntry } = require('../utils/audit');

const VALID_ROLES = ['citizen', 'operator', 'executor', 'supervisor', 'admin'];
const VALID_STATUSES = ['active', 'locked'];

function validatePassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!hasUppercase) {
    return { valid: false, message: 'Password must contain uppercase letter' };
  }
  if (!hasLowercase) {
    return { valid: false, message: 'Password must contain lowercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain number' };
  }
  return { valid: true };
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function generateTokens(userId, email, role) {
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function register(userData) {
  const { email, password, name, role } = userData;

  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim();
  const normalizedRole = (role || 'citizen').toLowerCase();

  if (!VALID_ROLES.includes(normalizedRole)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const userId = await createUser({
    email: normalizedEmail,
    password_hash: passwordHash,
    name: normalizedName,
    role: normalizedRole,
    status: 'active',
    created_at: now,
    updated_at: now
  });

  await logAuditEntry({
    user_id: userId,
    action: 'user_registered',
    entity_type: 'user',
    payload: { email: normalizedEmail, name: normalizedName, role: normalizedRole },
    created_at: now
  });

  const { accessToken, refreshToken } = generateTokens(userId, normalizedEmail, normalizedRole);

  return {
    userId,
    email: normalizedEmail,
    name: normalizedName,
    role: normalizedRole,
    accessToken,
    refreshToken
  };
}

async function login(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === 'locked') {
    throw new Error('Account is locked');
  }

  const passwordMatch = await verifyPassword(password, user.password_hash);
  if (!passwordMatch) {
    throw new Error('Invalid email or password');
  }

  const now = new Date().toISOString();
  await logAuditEntry({
    user_id: user.id,
    action: 'user_login',
    entity_type: 'user',
    payload: { email: normalizedEmail },
    created_at: now
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accessToken,
    refreshToken
  };
}

async function refreshAccessToken(refreshToken) {
  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    throw new Error('Invalid or expired refresh token');
  }

  const { userId, email } = decoded;
  const user = await getUserByEmail(email);

  if (!user || user.id !== userId) {
    throw new Error('User not found');
  }

  if (user.status === 'locked') {
    throw new Error('Account is locked');
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email, user.role);

  return {
    accessToken,
    refreshToken: newRefreshToken
  };
}

async function getProfile(userId) {
  const user = await getUserByEmail(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  };
}

async function assignRole(userId, role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const changes = await updateUser(userId, { role });
  if (changes === 0) {
    throw new Error('User not found');
  }

  const now = new Date().toISOString();
  await logAuditEntry({
    user_id: userId,
    action: 'role_assigned',
    entity_type: 'user',
    payload: { role },
    created_at: now
  });
}

async function updateUserStatus(userId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const changes = await updateUser(userId, { status });
  if (changes === 0) {
    throw new Error('User not found');
  }

  const now = new Date().toISOString();
  await logAuditEntry({
    user_id: userId,
    action: 'status_updated',
    entity_type: 'user',
    payload: { status },
    created_at: now
  });
}

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,
  register,
  login,
  refreshAccessToken,
  getProfile,
  assignRole,
  updateUserStatus,
  VALID_ROLES,
  VALID_STATUSES
};
