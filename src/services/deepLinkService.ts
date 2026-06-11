import { normalizeInviteCode } from './friendService';

const INVITE_CODE_REGEX = /^[A-Z0-9]{4,16}$/;

function validateNormalizedCode(value: string): string | null {
  const code = normalizeInviteCode(value);
  return INVITE_CODE_REGEX.test(code) ? code : null;
}

export function parseInviteCodeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = [parsed.hostname, ...parsed.pathname.split('/')]
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    const inviteIndex = parts.findIndex((part) => part.toLowerCase() === 'invite');
    if (inviteIndex < 0) return null;

    const code = parts[inviteIndex + 1];
    return code ? validateNormalizedCode(code) : null;
  } catch {
    const match = url.match(/(?:^|\/)invite\/([^/?#]+)/i);
    return match ? validateNormalizedCode(decodeURIComponent(match[1])) : null;
  }
}
