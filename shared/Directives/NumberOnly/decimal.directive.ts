import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appDecimalInput]'
})
export class DecimalInputDirective {
  // constructor(private ngControl: NgControl) {}

  // @HostListener('keyup', ['$event'])
  // onKeyup(event: KeyboardEvent) {
  //   let inputValue: string = this.ngControl.value || '';
  //   
  //   // Remove any non-numeric and non-dot characters
  //   inputValue = inputValue.replace(/[^0-9.]/g, '');

  //   // Remove additional dots
  //   const dotCount = (inputValue.match(/\./g) || []).length;
  //   if (dotCount > 1) {
  //     inputValue = inputValue.substr(0, inputValue.lastIndexOf('.'));
  //   }

  //   this.ngControl.control?.setValue(inputValue);
  // }
  constructor(private el: ElementRef) {}

  @HostListener('keyup', ['$event']) onKeyUp(event: KeyboardEvent) {
    const inputValue: string = this.el.nativeElement.value;
    const regex: RegExp = /^\d*\.?\d{0,2}$/; // Regular expression for up to 2 decimal places
    
    if (!regex.test(inputValue)) {
      this.el.nativeElement.value = inputValue.slice(0, -1);
      event.preventDefault(); // Remove the last character if not valid
    }
  }
  
  @HostListener('keypress', ['$event']) onKeyPress(event: KeyboardEvent) {
    const inputValue: string = this.el.nativeElement.value;
    const regex: RegExp = /^\d*\.?\d{0,2}$/; // Regular expression for up to 2 decimal places
    
    if (!regex.test(inputValue)) {
      this.el.nativeElement.value = inputValue.slice(0, -1);
      event.preventDefault(); // Remove the last character if not valid
    }
  }
}