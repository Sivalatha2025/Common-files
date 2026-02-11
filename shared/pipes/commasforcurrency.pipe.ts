import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'commasforcurrency'
})
export class CommasforcurrencyPipe implements PipeTransform {

  transform(value: number, decimalPlaces: number = 2): string {
    if (value === null || value === undefined) return '';
       value = Number(value)
    // Convert the number to a string and separate integer and decimal parts
    let [integerPart, decimalPart] = value.toFixed(decimalPlaces).split('.');

    // Format the integer part with commas as per Indian numbering system
    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);

    const formattedIntegerPart = otherNumbers 
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;

    // Combine the formatted integer part with the decimal part (if any)
    return decimalPart ? `${formattedIntegerPart}.${decimalPart}` : formattedIntegerPart;
  }

}
