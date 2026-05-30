import { Group } from '../models/Group.model';

// No ambiguous chars: 0/O, 1/I
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generate(len = 8): string {
  return Array.from({ length: len }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');
}

/** Generate a code guaranteed unique in the DB */
export async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generate();
    const exists = await Group.findOne({ inviteCode: code }).lean();
    if (!exists) return code;
  }
  throw new Error('Could not generate unique invite code after 10 attempts');
}
