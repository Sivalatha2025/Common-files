import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'childVar'
})
export class ChildVarPipe implements PipeTransform {

  transform(value: any[], Id : string): any[] {
   
   if(Id){
    value = value.filter(el => el.ParentVariantId == Id)
   }else{
    value = [];
   }
   
    return value;
  }

}
