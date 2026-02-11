import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'autoCompleteFilter',
  pure : false
})
export class AutoCompleteFilterPipe implements PipeTransform {

  transform(value: any[], selected: any, type : string): any {
    
    let arr : any = [];
    if(selected){

       arr = value.filter(el => 
        {
          if(type == 'UOM'){
            if(el.ParentUOMTypeId == selected){
              return el;
            }
          }else{
            if(el.ParentCategoryId == selected){
              return el;
            }
          }
        
        
        })
        return arr;
      }
 
    return arr;
  }

}
