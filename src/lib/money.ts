// DISPLAY: never format money yourself. The API sends a `display` string built for that
// row's own currency. Print it as-is.
export const money = (p: { display: string }) => p.display;

// INPUT: minor units are not always hundredths.
export const toMinor = (value: number, exponent: number) =>
  Math.round(value * 10 ** exponent);

export const fromMinor = (minor: number, exponent: number) =>
  minor / 10 ** exponent;
