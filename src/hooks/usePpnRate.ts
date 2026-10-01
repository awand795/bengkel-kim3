/**
 * Tarif PPN standar 11% (UU HPP).
 */
export const usePpnRate = () => {
  const rate: number = 11;

  const calcPpn = (subtotal: number): number =>
    Math.round(subtotal * (rate / 100));

  return {
    rate,
    isLoading: false,
    isError: false,
    refetch: async () => {},
    calcPpn,
  };
};
