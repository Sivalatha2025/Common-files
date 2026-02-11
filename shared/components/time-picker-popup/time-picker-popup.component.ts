import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-time-picker-popup',
  templateUrl: './time-picker-popup.component.html',
  styleUrls: ['./time-picker-popup.component.css'],
})
export class TimePickerPopupComponent {
  @Input() hour: string = '';
  @Input() minute: string = '';
  @Input() period: string = 'AM'; 

  hoursArray = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')); // 1-12
  sixtyElementsArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')); // 0-59
  meridians = ['AM', 'PM'];

  @Output() timeSelected = new EventEmitter<string>();
  @Output() popupClosed = new EventEmitter<void>();

  closePopup(): void {
    this.popupClosed.emit();
  }

  applyTime(): void {
    const formattedTime = `${this.hour}:${this.minute
      ?.toString()
      .padStart(2, '0')} ${this.period}`;
    this.timeSelected.emit(formattedTime);
    this.closePopup();
  }

  
}
