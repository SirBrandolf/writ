/** Firebase Admin bootstrap for verifying client ID tokens on the API. */
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAdminAuthSingleton: ReturnType<typeof getAuth> | null = null;
let firebaseAdminInitError: Error | null = null;

/**
 * Lazy Firebase Admin init so the process can boot without credentials; unauthenticated routes (e.g. GET /health)
 * stay available until the first protected handler calls verifyIdToken.
 */
export function getFirebaseAdminAuth(): ReturnType<typeof getAuth> {
    if (firebaseAdminAuthSingleton) return firebaseAdminAuthSingleton;
    if (firebaseAdminInitError) throw firebaseAdminInitError;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    try {
        const adminApp = (() => {
            if (getApps().length > 0) return getApps()[0];

            if (projectId && clientEmail && privateKey) {
                return initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
            }

            if (adcPath) {
                return initializeApp({
                    credential: applicationDefault(),
                    projectId,
                });
            }

            throw new Error(
                'Firebase Admin not configured. Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.',
            );
        })();

        firebaseAdminAuthSingleton = getAuth(adminApp);
        return firebaseAdminAuthSingleton;
    } catch (err) {
        firebaseAdminInitError = err instanceof Error ? err : new Error('Failed to initialize Firebase Admin Auth');
        throw firebaseAdminInitError;
    }
}
