import { Directive, ElementRef, Input, HostListener } from '@angular/core';

@Directive({
  selector: '[numbersOnly]'
})
export class NumberOnlyDirective {

  private regex: RegExp = new RegExp('^([0-9]*[.])?[0-9]*$')  // integer
  private noDecimalregex: RegExp = new RegExp('^([0-9]*)?[0-9]*$')  // integer
  private specialKeys: Array<string> = ['Backspace', 'ArrowLeft', 'ArrowRight' , 'Tab', 'Enter'];
  @Input() isAllowDecimal = true;
  constructor(private elementRef: ElementRef) { }

  @HostListener('keydown', ['$event'])onKeyDown(event: KeyboardEvent) {
    let regex : any;
    if(this.isAllowDecimal){
       regex = this.regex;
    }else{
         regex = this.noDecimalregex;
    }

    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }
    const inputValue: string = this.elementRef.nativeElement.value.concat(event.key);
    if (inputValue && !String(inputValue).match(regex) && !event.ctrlKey) {
      
      event.preventDefault();
    }

    return;
  }


  @HostListener('paste', ['$event']) onPaste(event:any) {
  
    
      
      const clipboardData = (event.originalEvent || event).clipboardData.getData('text/plain');
      if (clipboardData) {
          if (!this.regex.test(clipboardData)) {
              event.preventDefault();
          }else if(!this.isAllowDecimal && this.regex.test(clipboardData)){
            event.preventDefault();
            this.elementRef.nativeElement.value = clipboardData.split('.')[0];
            this.elementRef.nativeElement.dispatchEvent(new Event('input'));
          }
      }
      return;
  }
}