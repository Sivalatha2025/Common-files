import { Pipe, PipeTransform } from '@angular/core';
import { CustomTranslatePipe } from './custom-translate.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'translateSafePipe'
})
export class TranslateSafePipePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer, private translateService:CustomTranslatePipe) { }

  transform(value: any,changedetect:boolean,root?:any): SafeHtml {
    //  
    if(value){
    let trimmedValue = value?.replace(/\s+/g, ' ').replace(/[\r\n]+/g, '')?.replace(/"/g, "'").trim();
    let val:any = this.translateService.transform(trimmedValue, changedetect,root);
    return this.sanitizer.bypassSecurityTrustHtml(val)
    }else{
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }

  }

}
