import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'multiautoCompleteFilter'
})
export class MultiAutoCompleteFilterPipe implements PipeTransform {

  transform(value: string[], selectedArr: any[]): any {

    let arr : any = [];
    value.map((el : string) => {
        if(selectedArr.indexOf(el) == -1){
          arr.push(el)
        }
    })
    return arr;
  }

}
