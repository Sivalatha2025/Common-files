import { Directive, ElementRef, HostBinding, HostListener, Input, Renderer2 } from '@angular/core';
import { environment } from 'src/environments/environment';
@Directive({
  selector: '[appImageReplace]'
})
export class ImageReplaceDirective {
  @Input() datasrc: string = '';
  imagesPath = '/assets/images/';
  @Input() ImageType: string = ''

  constructor(private elRef: ElementRef,private renderer: Renderer2) {
   }
   
  //  @HostListener('load') onLoad() {
  //    
  //   if(this.doesFileExist(this.datasrc.replace('jpg','webp'))){
  //     this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.datasrc.replace('jpg','webp'));
  //     return
  //   }
  // }

  @HostListener('error') onError() {
    
    // if(this.doesFileExist(this.datasrc) && this.datasrc !=='') {
    //   this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.datasrc);
    //   this.renderer.setAttribute(this.elRef.nativeElement, 'type', 'image/jpg');
    // }
    // else {
      this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.ImageType);
      this.renderer.setAttribute(this.elRef.nativeElement, 'type', 'image/jpg');
    // }
    // this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.onErrorSrc);
  }

  doesFileExist(urlToFile: string) {
    try {
    
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', urlToFile, false);
      xhr.send();
       //;
      if (xhr.status == 404) {
          return false;
      }
      else if (xhr.status == 403) {
        return false;
      } else {
          return true;
      }
    } catch (error) {
      return false
    }
   
}
 

}
