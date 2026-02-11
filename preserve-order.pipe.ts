import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'preserveOrder'
})
export class PreserveOrderPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    if (typeof value !== 'object' || value === null) {
      return [];
    }

    return Object.keys(value).map(key => {
      return { key, value: value[key] };
    });
  }

}
