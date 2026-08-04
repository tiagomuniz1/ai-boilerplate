// Captcha is required starting on the 3rd login attempt, i.e. once 2 prior
// failures are already recorded for the same email + login scope.
export const CAPTCHA_FAILED_ATTEMPTS_THRESHOLD = 2

// Failed-attempt counter TTL — resets on its own if the account isn't retried
// within this window (also cleared immediately on a successful login).
export const CAPTCHA_ATTEMPT_WINDOW_SECONDS = 900
