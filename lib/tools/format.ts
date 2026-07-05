export function formatNumber(value: number, maximumFractionDigits = 2, minimumFractionDigits = 0): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits,
  });
}

export function formatSignedNumber(value: number, maximumFractionDigits = 2): string {
  const formatted = formatNumber(value, maximumFractionDigits);
  return value > 0 ? `+${formatted}` : formatted;
}

export function formatQuantity(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.min(4, Math.ceil(Math.log10(1 / step)));
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrencyValue(value: number, currency: string, maximumFractionDigits = 2): string {
  return `${formatNumber(value, maximumFractionDigits)} ${currency}`;
}
