import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appSingleZeroForProduct]'
})
export class SingleZeroForProductDirective {

  private regex: RegExp = new RegExp('^[0-9]*$');  // integer
  private specialKeys: Array<string> = ['Backspace', 'ArrowLeft', 'ArrowRight' , 'Tab', 'Enter'];
  constructor(private elementRef: ElementRef) { }

  @HostListener('blur', ['$event'])onKeyDown(event: KeyboardEvent) {
    let inputValue: any = this.elementRef.nativeElement.value;
    //console.log(inputValue);
    // if(inputValue.startsWith("0")) {
        // this.elementRef.nativeElement.value =  Number(inputValue);
        if(this.regex.test(inputValue)){

  
        try {
          if (inputValue) {
            this.elementRef.nativeElement.value =
              Math.round(Number(inputValue) * 100) / 100;
          } else {
            this.elementRef.nativeElement.value = '';
          }
          this.elementRef.nativeElement.dispatchEvent(new Event('input'));
        } catch (error) {}
    // }
    // this.elementRef.nativeElement.value = Math.round(this.elementRef.nativeElement.value * 1000) / 1000;
    // console.log(this.elementRef.nativeElement.value);
      }else{
       
      }
      return
  }

}
