import {Directive, OnInit, OnDestroy, Output, EventEmitter, ElementRef, Inject, HostListener} from '@angular/core';



@Directive({
  selector: '[appCloseClickOutside]'
})
export class CloseClickOutsideDirective{

 
  @Output() clickOutside = new EventEmitter<void>();
  
  constructor(private elementRef: ElementRef) {
    
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(target: any) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside && this.clickOutside !== undefined && this.clickOutside !== null) {
      this.clickOutside.emit();
    }
  }
}
