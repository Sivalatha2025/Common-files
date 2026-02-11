import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'vendorfilter'
})
export class VendorfilterPipe implements PipeTransform {

  transform(value: any, searchWord:string): any {
    if(!searchWord){
      return value;
    }
    if(searchWord){
      value = value.filter((el:any) => el.Name?.toLowerCase().includes(searchWord?.toLowerCase()))
    }

    return value;
  }

}
