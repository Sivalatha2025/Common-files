import { filter } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'socialUrl',
  pure:false
})
export class SocialUrlPipe implements PipeTransform {

  transform(value: any,socialChannelArr:any,index:any): any {
    let selectedObj:any={};
    socialChannelArr.controls.forEach((control:any,i:any)=>{
      if( i != index && control.value.Status == ''){
        selectedObj[control.value.SocialChannel] = true;
      }
    });
    
    value = value.filter((item:any)=>{
      if(!selectedObj[item.Id]){
        return item;
      }
    })
    return value;
  }

}
