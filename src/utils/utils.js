export function calculateRentAmount(termPeriod, paymentFrequency) {
  if (!termPeriod || !termPeriod.amount || !paymentFrequency) return 0;
  const multiplier = getPaymentMultiplier(paymentFrequency);
  return termPeriod.amount * multiplier;
}

export function calculateTerms(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months <= 0) return 'Invalid term';
  return `${months} month${months > 1 ? 's' : ''}`;
}

export function getPaymentMultiplier(frequency) {
  switch (frequency.toLowerCase()) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi-annually':
      return 6;
    case 'annually':
      return 12;
    default:
      return 1;
  }
}