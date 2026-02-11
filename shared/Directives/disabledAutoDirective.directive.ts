import {
    Directive,
    Input,
    OnChanges,
    SimpleChanges,
    Optional,
    Self
  } from '@angular/core';
  import { NgControl } from '@angular/forms';
 
  @Directive({
    selector: '[disabled][formControlName], [disabled][formControl], [disabled][ngModel]'
  })
  export class AutoDisableDirective implements OnChanges {
    @Input() disabled: any;
 
    constructor(@Optional() @Self() private ngControl: NgControl) {}
 
    ngOnChanges(changes: SimpleChanges): void {
      if (!this.ngControl?.control) return;
 
      const disable =
        this.disabled === '' ||
        this.disabled === true ||
        this.disabled === 'true';
 
      if (disable && this.ngControl.control.enabled) {
        this.ngControl.control.disable({ emitEvent: false });
      } else if (!disable && this.ngControl.control.disabled) {
        this.ngControl.control.enable({ emitEvent: false });
      }
    }
  }
