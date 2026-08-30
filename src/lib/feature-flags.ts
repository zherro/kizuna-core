function isTruthyEnv(value: string | undefined) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(normalized);
}

export function isShowcaseEnabled() {
  return isTruthyEnv(process.env.NEXT_PUBLIC_SHOWCASE_ENABLED ?? process.env.SHOWCASE_ENABLED);
}
