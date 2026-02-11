import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filenameellipsis'
})
export class FileNameEllipsisPipe implements PipeTransform {

  transform(value: string, maxLength: number): any {
    if(value && value.length > 0) {
      if (value?.length <= maxLength) {
        return value;
      }else {
        const lastDotIndex = value?.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? value.substring(lastDotIndex) : '';
    
        let truncatedValue = value;
        if (value?.length > maxLength) {
          truncatedValue = value.substring(0, maxLength) + '...';
        }
    
        return truncatedValue + extension;
      }
    }

  }

}
