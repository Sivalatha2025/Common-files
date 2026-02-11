import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cityfilter'
})
export class CityfilterPipe implements PipeTransform {

  transform(value: any, state : any): any {
  let arr = []
  arr = value.filter((el : any) => {
    
    if(el.StateId == state?.StateId){
      return el
    }
  })
  
  
    return arr
  }

}
