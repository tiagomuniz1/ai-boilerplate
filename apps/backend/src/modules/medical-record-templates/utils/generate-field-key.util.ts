const KEY_MAX_BASE_LENGTH = 40
const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SUFFIX_LENGTH = 4

/**
 * Converts a human label into a snake_case slug suitable for a stable field key.
 * Removes accents/diacritics and any non-alphanumeric character.
 */
export function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, KEY_MAX_BASE_LENGTH)
    .replace(/_+$/g, '')
}

function shortSuffix(): string {
  let suffix = ''
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)]
  }
  return suffix
}

/**
 * Generates a unique, immutable key for a template field based on its label.
 * The generated key is added to `usedKeys` to guarantee uniqueness within a template.
 */
export function generateFieldKey(label: string, usedKeys: Set<string>): string {
  const base = slugifyLabel(label) || 'field'
  let key = `${base}_${shortSuffix()}`
  while (usedKeys.has(key)) {
    key = `${base}_${shortSuffix()}`
  }
  usedKeys.add(key)
  return key
}
