import { ContentChildren, Directive, ElementRef, HostListener, QueryList, Renderer2 } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appErrorInputFocus]'
})
export class ErrorInputFocusDirective {
  @ContentChildren(NgControl) formControls!: QueryList<NgControl>;
  constructor(private renderer: Renderer2, private el: ElementRef) { }
  @HostListener('submit')
  check(formControls?: QueryList<NgControl>) {
    
    const controls = formControls? formControls.toArray(): this.formControls.toArray();

    for (let field of controls) {
      if (field.invalid) {
        (field.valueAccessor as any)._elementRef.nativeElement.focus();
        break;
      }
    }
  }
  
}