import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'langauageFilter'
})
export class LangauageFilterPipe implements PipeTransform {

  transform(value: any[], searchword : string): any[] {
    
    if(searchword){
       value = value.filter(el => el.DisplayName?.toLowerCase().startsWith(searchword?.toLowerCase()))
    }

    return value;
  }

}
