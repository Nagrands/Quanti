import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@quanti/db";

export const MONEY_SCALE = 100n;
export const QUANTITY_SCALE = 1_000n;
export const FACTOR_SCALE = 1_000_000n;

type FixedScale = typeof MONEY_SCALE | typeof QUANTITY_SCALE | typeof FACTOR_SCALE;
type DecimalInput = Prisma.Decimal | bigint | number | string;

function decimalPlaces(scale: FixedScale) {
  return scale.toString().length - 1;
}

export function toScaled(value: DecimalInput, scale: FixedScale, label = "decimal value") {
  try {
    const decimal = new Prisma.Decimal(value.toString());
    const scaled = decimal.mul(scale.toString());
    if (!scaled.isInteger()) {
      throw new Error(`${label} has more than ${decimalPlaces(scale)} decimal places.`);
    }
    return BigInt(scaled.toFixed(0));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`Invalid ${label}: ${value.toString()}. ${detail}`);
  }
}

export function fromScaled(value: bigint, scale: FixedScale) {
  return new Prisma.Decimal(value.toString()).div(scale.toString());
}

export function formatScaled(value: bigint, scale: FixedScale) {
  return fromScaled(value, scale).toString();
}

export function formatScaledFixed(value: bigint, scale: FixedScale) {
  return fromScaled(value, scale).toFixed(decimalPlaces(scale));
}

export function multiplyQuantity(quantity: bigint, factor: bigint) {
  const product = quantity * factor;
  const sign = product < 0n ? -1n : 1n;
  const absolute = product < 0n ? -product : product;
  return sign * ((absolute + FACTOR_SCALE / 2n) / FACTOR_SCALE);
}

export function sumScaled(values: bigint[]) {
  return values.reduce((sum, value) => sum + value, 0n);
}
