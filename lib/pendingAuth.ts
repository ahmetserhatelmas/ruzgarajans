export type PendingSignup = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
};

let pendingSignup: PendingSignup | null = null;
let pendingReset: { email: string; resetToken: string } | null = null;

export function setPendingSignup(value: PendingSignup) {
  pendingSignup = value;
}

export function getPendingSignup() {
  return pendingSignup;
}

export function clearPendingSignup() {
  pendingSignup = null;
}

export function setPendingReset(value: { email: string; resetToken: string }) {
  pendingReset = value;
}

export function getPendingReset() {
  return pendingReset;
}

export function clearPendingReset() {
  pendingReset = null;
}
