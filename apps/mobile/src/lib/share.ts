const SUPPORTED_HOSTS = [
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "vt.tiktok.com",
  "vm.tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
];

type SharePayloadLike = {
  shareType?: string | null;
  value?: string | null;
  mimeType?: string | null;
  contentUri?: string | null;
};

function sanitizeCandidate(value: string) {
  return value.trim().replace(/[)\],.!?]+$/, "");
}

function looksSupported(url: URL) {
  return SUPPORTED_HOSTS.includes(url.hostname.toLowerCase());
}

export function extractSharedUrl(payloads: SharePayloadLike[]) {
  for (const payload of payloads) {
    const candidates = [payload.value, payload.contentUri].filter(
      (value): value is string => Boolean(value?.trim())
    );

    for (const candidate of candidates) {
      const direct = sanitizeCandidate(candidate);

      try {
        const url = new URL(direct);
        if (looksSupported(url)) {
          return url.toString();
        }
      } catch {
        // Ignore and continue to regex extraction below.
      }

      const match = candidate.match(/https?:\/\/[^\s]+/i);
      if (!match) {
        continue;
      }

      const extracted = sanitizeCandidate(match[0]);

      try {
        const url = new URL(extracted);
        if (looksSupported(url)) {
          return url.toString();
        }
      } catch {
        // Ignore invalid URLs inside shared text.
      }
    }
  }

  return null;
}
