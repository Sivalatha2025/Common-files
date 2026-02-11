import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appMaxLength]'
})
export class MaxLengthDirective {

  @Input() appMaxLength!: number;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    const value = input.value;

    if (value && value.length > this.appMaxLength) {
      input.value = value.slice(0, this.appMaxLength);
    }
  }
}
