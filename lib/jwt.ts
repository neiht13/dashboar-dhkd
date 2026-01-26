import { jwtVerify } from 'jose';

export async function verifyShareToken(token: string, secretKey: string) {
    try {
        const secret = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, secret);
        return {
            valid: true,
            payload
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid token'
        };
    }
}
