import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'uniqueSalaryTemplate',
  pure:false
})
export class UniqueSalaryTemplatePipe implements PipeTransform {

  transform(value: any[], selectedCompenents:any, isRemove:boolean): any[] {
    let filterdArrValue:any[] = []
    let selectedCompenentsMap = new Map();
    if(!isRemove){
    if(selectedCompenents.length != 0){
      selectedCompenents.forEach((el:any)=>{
        selectedCompenentsMap.set(el.Id,el)
      });

      value.map((el:any)=>{
        if(!selectedCompenentsMap.has(el.Id)){
          filterdArrValue.push(el)
        }
      })

      return filterdArrValue;

    }else{
      return value;
    }
  }else{
    return value
  }
  }

}
