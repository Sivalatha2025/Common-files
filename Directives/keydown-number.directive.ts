import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appKeydownNumber]'
})
export class KeydownNumberDirective {

  private blockedKeys: string[] = [
    'ArrowUp',
    'ArrowDown',
    'e',
    'E',
    '+',
    '-',
    '.',
    ','
  ];

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }
}
