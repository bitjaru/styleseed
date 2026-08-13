const ZERO_WIDTH_AND_BIDI = /[\u200B-\u200D\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/gu;
const MAX_TEXT = 600;

function clean(value) {
  return String(value).normalize("NFKC").replace(ZERO_WIDTH_AND_BIDI, "");
}

function isLuhn(value) {
  let sum = 0;
  let parity = value.length % 2;
  for (let i = 0; i < value.length; i += 1) {
    let digit = Number(value[i]);
    if (i % 2 === parity) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function luhnCard(text) {
  const candidates = text.match(/(?:\d[ -]?){13,19}/gu) ?? [];
  return candidates.some((value) => {
    const digits = value.replace(/\D/gu, "");
    return digits.length >= 13 && digits.length <= 19 && isLuhn(digits);
  });
}

const RULES = [
  ["code-or-markup", /```|<\/?[A-Za-z][^>]*>|\b(?:import|export)\s+.+\bfrom\b|\b(?:className|onClick|useState)\s*=/iu],
  ["url-or-domain", /(?:https?:\/\/|ftp:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|dev|app|co\.kr|kr)\b)/iu],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu],
  ["local-path", /(?:^|[\s"'`])\/(?:Users|home|private|var|tmp|workspace|Volumes)\/[^\s"'`]+|\b[A-Z]:\\[^\s"'`]+/u],
  ["secret-like", /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{20,})\b/u],
  ["color-value", /(?:^|[^A-Za-z0-9])#[0-9a-f]{3,8}(?:[^A-Za-z0-9]|$)|\b(?:rgb|hsl)a?\([^)]{3,}\)/iu],
  ["resident-id-like", /\b\d{6}[- ]?[1-4]\d{6}\b/u],
  ["ip-address", /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/u],
  ["card-number", /(?:\d[ -]?){13,19}/u],
  ["phone", /(?:\+?82[- .]?10|(?:01[016789]|02|0[3-9]\d))[- .]?\d{3,4}[- .]?\d{4}/u],
  ["account-like", /\b\d(?:[ -]?\d){9,18}\b/u],
];

const FREE_TEXT_FIELDS = [
  ["title", (candidate) => [candidate.title]],
  ["learning.problem", (candidate) => [candidate.learning?.problem]],
  ["learning.intervention", (candidate) => [candidate.learning?.intervention]],
  ["learning.rationale", (candidate) => [candidate.learning?.rationale]],
  ["learning.appliesWhen", (candidate) => candidate.learning?.appliesWhen ?? []],
  ["learning.avoidWhen", (candidate) => candidate.learning?.avoidWhen ?? []],
];

export const scannerVersion = 2;

export function scanCandidatePrivacy(candidate) {
  const findings = [];
  for (const [field, getter] of FREE_TEXT_FIELDS) {
    for (const value of getter(candidate)) {
      if (typeof value !== "string") continue;
      const text = clean(value).slice(0, MAX_TEXT);
      for (const [code, pattern] of RULES) {
        const matched = code === "card-number" ? luhnCard(text) : pattern.test(text);
        if (matched || (code === "account-like" && luhnCard(text))) {
          findings.push({ code: code === "account-like" && luhnCard(text) ? "card-number" : code, field });
          break;
        }
      }
    }
  }
  return { scannerVersion, findings };
}

export function assertCandidatePrivacy(candidate) {
  const result = scanCandidatePrivacy(candidate);
  if (result.findings.length > 0) {
    throw new Error(`Privacy scan rejected ${result.findings[0].code} in ${result.findings[0].field}. Generalize the candidate further.`);
  }
  return candidate;
}
