import { NextFunction, Request, Response } from 'express';
import { getFirebaseAdminAuth } from '../config/firebaseAdmin.js';

type AuthenticatedRequest = Request & { authUser?: { uid: string } };

/**
 * Validates Firebase ID token from Authorization: Bearer <token> and attaches uid to request.
 */
export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization ?? '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    try {
        const checkRevoked = process.env.FIREBASE_CHECK_REVOKED === 'true';
        const firebaseAdminAuth = getFirebaseAdminAuth();
        const decoded = await firebaseAdminAuth.verifyIdToken(token, checkRevoked);
        (req as AuthenticatedRequest).authUser = { uid: decoded.uid };
        next();
    } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('Firebase Admin not configured') || message.includes('initialize Firebase Admin')) {
            console.error('Firebase Admin configuration error:', message);
            res.status(500).json({ error: 'Server auth configuration is incomplete' });
            return;
        }
        res.status(401).json({ error: 'Invalid or expired auth token' });
    }
}
