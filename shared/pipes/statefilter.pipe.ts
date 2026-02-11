import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statefilter'
})
export class StatefilterPipe implements PipeTransform {

  transform(value: any): any {
    let arr = []
    
    if(value && value.length !=0){
    arr = value.filter((el : any) => {
      if(el.CountryId == 1){
        return el
      }
    })
  }
    
      return arr
    }
}
