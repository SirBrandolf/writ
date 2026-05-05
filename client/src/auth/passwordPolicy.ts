/**
 * Password rules enforced on sign-up before calling Firebase (length, complexity, confirmation match).
 * Minimum length here is stricter than Firebase’s default unless you configure matching rules server-side.
 */
export const MIN_PASSWORD_LENGTH = 8

export function hasUpperCaseLetter(password: string): boolean {
  return /[A-Z]/.test(password)
}

export function hasDigit(password: string): boolean {
  return /[0-9]/.test(password)
}

/** True if any character is printable ASCII punctuation (code ranges covering common symbols). */
export function hasAsciiSpecialSymbol(password: string): boolean {
  return [...password].some((ch) => {
    const c = ch.charCodeAt(0)
    return (
      (c >= 33 && c <= 47) ||
      (c >= 58 && c <= 64) ||
      (c >= 91 && c <= 96) ||
      (c >= 123 && c <= 126)
    )
  })
}

/** Complexity rule: require at least one digit, one uppercase letter, or one ASCII symbol. */
export function hasDigitUppercaseOrSymbol(password: string): boolean {
  return hasDigit(password) || hasUpperCaseLetter(password) || hasAsciiSpecialSymbol(password)
}

export function meetsMinLength(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return confirmPassword.length > 0 && password === confirmPassword
}

/** Gate for submit: length + complexity + non-empty matching confirmation. */
export function allSignUpPasswordRequirementsMet(password: string, confirmPassword: string): boolean {
   return meetsMinLength(password) && hasDigitUppercaseOrSymbol(password) && passwordsMatch(password, confirmPassword)
}
