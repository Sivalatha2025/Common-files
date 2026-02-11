import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customUpperCase'
})
export class UppercasePipe implements PipeTransform {

  transform(value: string): string {
    return value ? value.toUpperCase() : '';
  }

}
