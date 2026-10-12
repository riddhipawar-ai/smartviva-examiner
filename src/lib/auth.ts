import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { get, run } from './db';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'smartviva-super-secret-key-2026-examiner';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { id: string; email: string; role: string; is_guest: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; email: string; role: string; is_guest: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get('sv_token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return null;
  }

  const user = await get<User>(
    'SELECT id, name, email, role, is_guest, xp, level, streak, last_active, created_at FROM users WHERE id = ?',
    [decoded.id]
  );

  return user || null;
}

export async function createGuestUser(): Promise<{ user: User; token: string }> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const guestId = `guest-${Date.now()}-${randomSuffix}`;
  const guestName = `Guest Scholar #${randomSuffix}`;
  const guestEmail = `guest_${randomSuffix}@smartviva.local`;

  await run(
    `INSERT INTO users (id, name, email, password_hash, role, is_guest, xp, level, streak, created_at)
     VALUES (?, ?, ?, NULL, 'student', 1, 100, 1, 1, datetime('now'))`,
    [guestId, guestName, guestEmail]
  );

  const user: User = {
    id: guestId,
    name: guestName,
    email: guestEmail,
    role: 'student',
    is_guest: true,
    xp: 100,
    level: 1,
    streak: 1,
    created_at: new Date().toISOString(),
  };

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    is_guest: true,
  });

  return { user, token };
}
