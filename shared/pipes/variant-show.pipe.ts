import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'variantShow'
})
export class VariantShowPipe implements PipeTransform {

  transform(value: Map<any, any>, selectIndex: number): Map<any, any> {
    
    let counter = 0;
    let map = new Map<any, any>();
    for (let [key, value] of map) {
      {
        if (counter < selectIndex) {
          map.set(key, value);
          counter++;
        }
        else {
          break;
        }
      }
    }
    return map

  }
}
