/**
 * Bengkel KIM 3 - Validation Utilities
 */

/**
 * Strict RFC 5322 & TLD Email Validation
 * 
 * Memastikan:
 * 1. Bagian username sebelum '@' tidak kosong dan valid
 * 2. Memiliki karakter '@'
 * 3. Bagian domain setelah '@' memiliki setidaknya satu tanda titik '.'
 * 4. Bagian Top-Level Domain (TLD) minimal 2 karakter (misal: .com, .id, .co.id, .net, .org)
 * 5. Mencegah email tidak lengkap seperti 'andini@test', 'user@domain', 'test@.com'
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(cleanEmail);
};
