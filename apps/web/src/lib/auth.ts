import { clearSession } from '@/lib/api';

export async function logout(): Promise<void> {
  try {
    await clearSession();
  } catch {
    // Still navigate away if API is unreachable
  }
}
