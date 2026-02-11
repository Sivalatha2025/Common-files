import { Directive, ElementRef, HostListener, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appMaskingUnmasking]'
})
export class MaskingUnmaskingDirective implements OnInit, OnChanges {

  @Input('isMasked') isMasked: boolean = true;
  @Input('emailDisabled') emailDisabled: boolean = true;
  @Input('controlValue') controlValue: string = '';
  @Input('controlType') controlType: string = '';

  constructor(private el: ElementRef) { }
  ngOnInit(): void {
    // console.log('oninit');
    this.controlUpdates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log('onchanges');
    // console.log(changes?.['isMasked']?.previousValue);
    // console.log(changes?.['isMasked']?.currentValue);
    // if (changes?.['isMasked']?.previousValue != changes?.['isMasked']?.currentValue && !changes?.['isMasked']?.firstChange) {
      // console.log('onchanges');
       this.controlUpdates()
    // }
  }

  controlUpdates() {
    const inputValue = this.controlValue || '';
    if (this.isMasked && this.controlValue) {
      let maskedValue = inputValue;
      switch(this.controlType?.toLowerCase()){
       case 'email':
        if(this.emailDisabled){
          const [name, domain] = inputValue.split('@');
          maskedValue = `${name[0]}${new Array(name.length).join('x')}@${new Array(domain?.split('.')[0].length).join('x')}.${domain?.split('.')[1]}`;
          this.el.nativeElement.value = maskedValue;
        }
       break;
       case 'mobile':
          let mobileNumber = inputValue
          let str = '';
          if (mobileNumber) {
            for (let i = 0; i < mobileNumber.length; i++) {
              if (i > 1 && i < 8) {
                str += 'x';
              } else {
                str += mobileNumber.charAt(i);
              }
            }
          }
        maskedValue = str;
        this.el.nativeElement.value = maskedValue;
       break;
      }
      // Masking logic
    } else {
      // Unmasking logic
      this.el.nativeElement.value = inputValue;
    }
  }

}
