import { DatePipe } from '@angular/common';
import { Directive, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

declare var $:any;

declare var changeTime:any

@Directive({
  selector: '[appTimePicker]'
})
export class TimePickerDirective {

  @Output() timePeriodChange = new EventEmitter<any>();
  @Input() fieldName: string = '';
  @Input() formControlIndex: number = 0;
  @Input() formArrayName: string = '';
  @Input() formArrayParentIndex: number = 0;

  @HostListener('change', ['$event.target.value'])
  onTimeChange(value: string): void {
    const [hours, minutes] = value.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert to 12-hour format
    const formattedTime = `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
    this.timePeriodChange.emit({ time: formattedTime, id: this.fieldName, index: this.formControlIndex, 
      formArrayName: this.formArrayName, formArrayParentIndex: this.formArrayParentIndex
     });
  }

  // @Input() fieldName:string = '';
  // @Input() format:string = '';
  
  // constructor(private datePipe:DatePipe) { }

  // ngOnInit(): void {
  //   $('.dateandtime').dateAndTime()

    
  //   $('.dateandtime').on('change', (event: any) => {
  //     let newValue = event.target.value;
  //     if(this.format){
  //       newValue = this.datePipe.transform(`1970-01-01T${newValue}:00`,this.format)
  //     }
  //     changeTime(newValue,this.fieldName)
      

  //   });
  // }

}
