import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, FormArray } from '@angular/forms';

@Pipe({
  name: 'controlsPipe',
  pure:false
})
export class ControlsPipe implements PipeTransform {

  transform(value: AbstractControl<any, any> |null): AbstractControl[] {
  if(value){

let controls = []
controls = (value as FormArray).controls || []
    return controls
  }else{
    return []
  }
    
  }

}
