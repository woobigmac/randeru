const INVITE_CODE_REGEX = /^[A-Z0-9]{4,16}$/;

function normalizeInviteCode(value: string): string | null {
  const code = value.trim().replace(/\s/g, '').toUpperCase();
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
    return code ? normalizeInviteCode(code) : null;
  } catch {
    const match = url.match(/(?:^|\/)invite\/([^/?#]+)/i);
    return match ? normalizeInviteCode(decodeURIComponent(match[1])) : null;
  }
}
