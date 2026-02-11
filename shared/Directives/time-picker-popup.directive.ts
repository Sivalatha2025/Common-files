import {
  Directive,
  ElementRef,
  HostListener,
  ComponentRef,
  ViewContainerRef,
  ComponentFactoryResolver,
} from '@angular/core';
import { TimePickerPopupComponent } from '../components/time-picker-popup/time-picker-popup.component';

@Directive({
  selector: '[appTimePickerPopup]',
})
export class TimePickerPopupDirective {
  private popupRef: ComponentRef<TimePickerPopupComponent> | null = null;
  ngSelectOpened: boolean = false;
  
  constructor(
    private el: ElementRef,
    private vcr: ViewContainerRef,
    private cfr: ComponentFactoryResolver
  ) {}

  @HostListener('click')
  togglePopup(): void {
    if (this.popupRef) {
      this.closePopup();
    } else {
      this.openPopup();
    }
  }

  private openPopup(): void {
    const factory =
      this.cfr.resolveComponentFactory(TimePickerPopupComponent);
    this.popupRef = this.vcr.createComponent(factory);

    const hostElementRect = this.el.nativeElement.getBoundingClientRect();
    const [time, period] =this.el.nativeElement.value.split(' ');
    const [hour, minute] = time.split(':');

    this.popupRef.instance.hour = hour || '';
    this.popupRef.instance.minute = minute || '';
    this.popupRef.instance.period = period || 'AM'; 
    // Position the popup below the input
    const popupElement = this.popupRef.location.nativeElement;
    popupElement.style.position = 'absolute';
    popupElement.style.top = `${hostElementRect.bottom + window.scrollY}px`;
    popupElement.style.left = `${hostElementRect.left + window.scrollX}px`;

    // Listen to popup events
    this.popupRef.instance.timeSelected.subscribe((selectedTime: string) => {
      this.el.nativeElement.value = selectedTime;
      this.el.nativeElement.dispatchEvent(new Event('input'));
      this.closePopup();
    });

    this.popupRef.instance.popupClosed.subscribe(() => {
      this.closePopup();
    });
  }

  private closePopup(): void {
    if (this.popupRef) {
      this.popupRef.destroy();
      this.popupRef = null;
    }
  }


  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    // Check if the click is inside the time picker input
    const targetElement : any = event.target;
    const currentTarget : any= event.currentTarget;
    const classvalue  = $(targetElement).attr('class');
    if(currentTarget && classvalue){

      console.log($('.time-picker-popup').find(targetElement).length , $('.ng-select').find(targetElement).length)
    }
    const clickedInsideInput = this.el.nativeElement.contains(targetElement);
    const clickedInsidePopup = this.popupRef?.location.nativeElement.contains(targetElement);

    // Check if the click is inside the ng-select dropdown
    const clickedInsideNgSelect = targetElement?.closest('ng-select') !== null;

    // Prevent closing the popup if clicking inside the ng-select dropdown
  

    if (!clickedInsideInput && !$(targetElement).closest('.time-picker-popup').length && !(classvalue && classvalue?.includes('ng-option'))) {
      this.closePopup();
    }
  }


}
