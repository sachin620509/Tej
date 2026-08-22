import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'InstaFrame Administrator';

async function main() {
  if (!email || !username || !password) throw new Error('BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD are required');
  if (!/^[a-z0-9._]{3,30}$/.test(username)) throw new Error('Bootstrap username is invalid');
  if (password.length < 16 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password)) throw new Error('Bootstrap password must be 16+ characters with upper, lower, number and symbol');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  if (await User.exists({ role: 'SUPER_ADMIN' })) throw new Error('A SUPER_ADMIN already exists; use the audited admin-management workflow');
  if (await User.exists({ $or: [{ email }, { username }] })) throw new Error('Email or username already belongs to an account');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await User.create({ name, email, username, passwordHash, emailVerifiedAt: new Date(), role: 'SUPER_ADMIN', status: 'active', isPrivate: true });
  console.warn(`Created SUPER_ADMIN ${admin.username} (${admin._id})`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
