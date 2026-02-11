import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'maskingUnmaskingPipe'
})
export class MaskingUnmaskingPipePipe implements PipeTransform {

  transform(value: string, isMasked: boolean): string {
    if (!value) return '';
;
    if (isMasked) {
      // Masking logic
      if (value.includes('@')) { // If it's an email
        const parts = value.split('@');
        const maskedUsername = parts[0].replace(/./g, '*');
        const domain = parts[1];
        return maskedUsername + '@' + domain;
      } else { // If it's a mobile number
        return value.replace(/.(?=.{4})/g, '*');
      }
    } else {
      // Unmasking logic
      return value;
    }
  }

}
