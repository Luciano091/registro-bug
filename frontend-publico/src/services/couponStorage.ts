import { getEstablishmentSlug } from './api';

const key = () => `ritmesa_coupon_code:${getEstablishmentSlug()}`;

export const getSavedCouponCode = () => {
  const stored = localStorage.getItem(key());
  if (stored !== null) return stored;

  // Preserva o código dos clientes BisBurger salvo antes da separação por loja.
  if (getEstablishmentSlug() === 'bisburger') {
    const legacy = localStorage.getItem('ritmesa_coupon_code');
    if (legacy) {
      localStorage.setItem(key(), legacy);
      localStorage.removeItem('ritmesa_coupon_code');
      return legacy;
    }
  }
  return '';
};

export const saveCouponCode = (codigo: string) => localStorage.setItem(key(), codigo);
export const clearSavedCouponCode = () => localStorage.removeItem(key());
