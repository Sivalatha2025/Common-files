import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberShortener'
})
export class NumberShortenerPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return '';

    // Convert to number and remove commas if any
    const num = Number(value.toString().replace(/,/g, ''));
    if (isNaN(num)) return '';

    // If number is less than or equal to 9999, return the number as is
    if (num <= 9999) {
      return num.toString();
    }

    let shortened: number;
    let suffix = '';

    // Format number with appropriate suffix
    if (num >= 1_000_000_000_000) {
      shortened = num / 1_000_000_000_000;
      suffix = 'T';
    } else if (num >= 1_000_000_000) {
      shortened = num / 1_000_000_000;
      suffix = 'B';
    } else if (num >= 10_000_000) {
      shortened = num / 10_000_000;
      suffix = 'Cr';
    } else if (num >= 1_00_000) {
      shortened = num / 1_00_000;
      suffix = 'L';
    } else {
      shortened = num / 1_000;
      suffix = 'K';
    }

    // Truncate to 1 decimal place without rounding
    const finalNumber = Math.floor(shortened * 10) / 10;

    return `${finalNumber.toFixed(1)}${suffix}`;
  }
}
