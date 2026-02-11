import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterConfigKey'
})
export class FilterConfigKeyPipe implements PipeTransform {

  transform(data: any[], searchQuery: string): any[] {
    
    if (!data || !searchQuery) {
      return data; 
    }
    let value =  data.filter(item =>
      item.ConfigKey.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return value;
  }

}
