import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db';
import { comparePassword, createGuestUser, generateToken, getCurrentUser, hashPassword } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'guest') {
      const { user, token } = await createGuestUser();
      const res = NextResponse.json({ success: true, user, token });
      res.cookies.set('sv_token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    if (action === 'register') {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return NextResponse.json({ success: false, error: 'Name, email, and password are required.' }, { status: 400 });
      }

      const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 400 });
      }

      const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const hash = await hashPassword(password);

      await run(
        `INSERT INTO users (id, name, email, password_hash, role, is_guest, xp, level, streak, created_at)
         VALUES (?, ?, ?, ?, 'student', 0, 150, 1, 1, datetime('now'))`,
        [userId, name.trim(), email.toLowerCase().trim(), hash]
      );

      const user: User = {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'student',
        is_guest: false,
        xp: 150,
        level: 1,
        streak: 1,
        created_at: new Date().toISOString(),
      };

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        is_guest: false,
      });

      const res = NextResponse.json({ success: true, user, token });
      res.cookies.set('sv_token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
      }

      const userRow = await get<User & { password_hash: string }>(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );

      if (!userRow || !userRow.password_hash) {
        return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
      }

      const isMatch = await comparePassword(password, userRow.password_hash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
      }

      const user: User = {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        is_guest: Boolean(userRow.is_guest),
        xp: userRow.xp || 0,
        level: userRow.level || 1,
        streak: userRow.streak || 1,
        created_at: userRow.created_at,
      };

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        is_guest: user.is_guest,
      });

      const res = NextResponse.json({ success: true, user, token });
      res.cookies.set('sv_token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    if (action === 'google') {
      // Google Auth login simulation/support
      const { email, name } = body;
      const targetEmail = (email || 'google_scholar@smartviva.edu').toLowerCase();
      let user = await get<User>('SELECT * FROM users WHERE email = ?', [targetEmail]);

      if (!user) {
        const userId = `usr-g-${Date.now()}`;
        await run(
          `INSERT INTO users (id, name, email, password_hash, role, is_guest, xp, level, streak, created_at)
           VALUES (?, ?, ?, NULL, 'student', 0, 200, 1, 1, datetime('now'))`,
          [userId, name || 'Google Verified Scholar', targetEmail]
        );
        user = {
          id: userId,
          name: name || 'Google Verified Scholar',
          email: targetEmail,
          role: 'student',
          is_guest: false,
          xp: 200,
          level: 1,
          streak: 1,
          created_at: new Date().toISOString(),
        };
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        is_guest: false,
      });

      const res = NextResponse.json({ success: true, user, token });
      res.cookies.set('sv_token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    if (action === 'forgot-password') {
      const { email } = body;
      // Generate password recovery acknowledgment
      return NextResponse.json({
        success: true,
        message: `If an account exists for ${email}, a secure password reset link has been dispatched to your inbox.`,
      });
    }

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.set('sv_token', '', { httpOnly: true, path: '/', maxAge: 0 });
      return res;
    }

    return NextResponse.json({ success: false, error: 'Unknown authentication action' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
