import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'storeFilter',
})
export class StoreFilterPipe implements PipeTransform {

  transform(value: Map<string,any>, isAllStore: boolean, change : boolean): Map<string,any> {
    
    let map = new Map<string , any>()
    //  if(isAllStore){
      
    //   value.forEach((val : any , key : string)=>{
      
    //     if(key == 'For All Stores'){
    //       map.set(key,val);
    //     }

    //   })

    // }else{
      value.forEach((val : any , key : string)=>{
      
        if(key != 'For All Stores'){
          map.set(key,val);
        }

      })
    // }
    return map;
  }

}
