import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchModulePipe',

})
export class SearchModulePipePipe implements PipeTransform {

  transform(value: any[] | undefined, searchWord: string | undefined): any[] {
    if(value){
      if(searchWord){
      value =  value.filter(el => el.ModuleName?.toLowerCase()?.includes(searchWord?.toLowerCase()));
      }
      return value;
      
    }
    return [];
  }

}
