import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterUsedOption',
})
export class FilterUsedOptionPipe implements PipeTransform {

  transform(value: any[], formArray : any[], index : number, fieldName : string, detectFilterChange : boolean): any[] {
    
    if(fieldName == 'SupportTicketPriorityId'){
      if(value && value.length !=0 && formArray && formArray.length!=0){
        let selectedValuesObj : any = {}
        formArray.forEach((control : any , i: number) =>{
          if(control.get('SupportTicketPriorityId')?.value && i!=index){
            selectedValuesObj[control.get('SupportTicketPriorityId')?.value] = true;
          }
        })

        value =  value.filter(el =>{
            if(!selectedValuesObj[el.Id]){
              return el;
            }
        })
      
      }
    }
    
    return value;
  }

}
