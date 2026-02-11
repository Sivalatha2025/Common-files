import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parentVarFilter',
  pure:false
})
export class ParentVarFilterPipe implements PipeTransform {

  transform(value: any, variantsSelectionArray: any[], currentParent : any): any[] {
   
    
    let arr = value;
      if(variantsSelectionArray.length!=1){
         variantsSelectionArray.forEach((item : any) =>{         
         arr = arr.filter((elem  :any) => elem.Id!=item.parent || elem.Id == currentParent)    
     })
    //  if(currentParent){ 
    //   arr.push(currentParent)
    //  }
    return arr;

    }else{
      return value;

    }
  }

}
