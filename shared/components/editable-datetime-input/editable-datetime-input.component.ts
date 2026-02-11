import { Component, forwardRef, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, Injector } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { BsDatepickerDirective } from 'ngx-bootstrap/datepicker';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';

@Component({
  selector: 'app-editable-datetime-input',
  templateUrl: './editable-datetime-input.component.html',
  styleUrls: ['./editable-datetime-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditableDatetimeInputComponent),
      multi: true
    }
  ]
})
export class EditableDatetimeInputComponent implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  constructor(private injector: Injector) {
    // Get NgControl after initialization to avoid circular dependency
  }
  @Input() id: string = '';
  @Input() placeholder: string = 'DD/MM/YYYY HH:mm:ss';
  @Input() disabled: boolean = false;
  @Input() format: string = 'dd/MM/yyyy HH:mm:ss';
  @Input() fieldName: string = '';
  @Input() ControlTypeConfigurationId?: string;
  
  // Support for legacy properties to maintain backward compatibility
  @Input() isFromList: boolean = false;
  @Input() isPastDate: boolean = false;
  
  @Output() dateChange = new EventEmitter<any>();
  @Output() searchDateChanges = new EventEmitter<any>();
  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;
  @ViewChild('hiddenDatePicker', { static: false }) hiddenDatePicker!: ElementRef<HTMLInputElement>;
  @ViewChild('datePickerDirective', { static: false }) datePickerDirective!: any; // BsDateFormatDirectiveOpt

  value: string = '';
  private destroy$ = new Subject<void>();
  private onChange = (value: string) => {};
  private onTouched = () => {};
  private isUpdatingFromPicker = false;
  showError: boolean = false;
  errorMessage: string = '';
  private ngControl?: NgControl;
  private isDeleting: boolean = false;
  private lastDeletedValue: string = '';
  private isProcessingBlur: boolean = false;

  ngOnInit(): void {
    // Initialize with empty value or format existing value
    if (this.value) {
      this.formatDateTimeValue(this.value);
    }
    
    // Map legacy properties to ControlTypeConfigurationId if not already set
    if (!this.ControlTypeConfigurationId) {
      this.ControlTypeConfigurationId = this.getControlTypeConfigurationIdFromLegacyProps();
    }
    
    // Try to get NgControl for validation
    try {
      const control = this.injector.get(NgControl, null);
      this.ngControl = control || undefined;
    } catch (e) {
      this.ngControl = undefined;
    }
  }

  private getControlTypeConfigurationIdFromLegacyProps(): string | undefined {
    if (this.isPastDate) {
      return DSControlTypeConfigurationGuid.AllowFutureDateOnly;
    }
    
    if (this.isFromList && !this.isPastDate) {
      return DSControlTypeConfigurationGuid.AllowPastDateOnly;
    }
    
    return undefined;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeDatePicker();
    }, 0);
    
    setTimeout(() => {
      this.initializeDatePicker();
    }, 100);
    
    setTimeout(() => {
      this.initializeDatePicker();
    }, 300);
  }

  private initializeDatePicker(): void {
    let datepicker: BsDatepickerDirective | null = null;
    
    if (this.datePickerDirective) {
      try {
        // Access the internal 'bs' property from BsDateFormatDirectiveOpt
        datepicker = (this.datePickerDirective as any)['bs'] || 
                     (this.datePickerDirective as any).bs || 
                     (this.datePickerDirective as any).bsDatepicker || 
                     (this.datePickerDirective as any).datepicker;
      } catch (e) {
        // Silently fail
      }
    }
    
    if (datepicker && this.value) {
      const date = this.parseDateTimeString(this.value);
      if (date) {
        try {
          // Update the hidden input element's value first
          if (this.hiddenDatePicker?.nativeElement) {
            this.hiddenDatePicker.nativeElement.value = this.value;
          }
          
          // Then update the datepicker's bsValue
          datepicker.bsValue = date;
        } catch (e) {
          // Silently fail
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;
    let inputValue = input.value;
    const cursorPosition = input.selectionStart || 0;
    const oldValue = this.value || '';
    
    // Remove all non-numeric characters except '/', ':', and space
    inputValue = inputValue.replace(/[^\d\/: ]/g, '');
    
    // CRITICAL: If user is typing (adding characters), reset blocking flags
    // This ensures formatting works after clearing and re-entering
    const oldNumbersOnly = oldValue.replace(/[\/: ]/g, '');
    const newNumbersOnly = inputValue.replace(/[\/: ]/g, '');
    const isAddingCharacters = newNumbersOnly.length > oldNumbersOnly.length;
    const isActuallyDeleting = newNumbersOnly.length < oldNumbersOnly.length || this.isDeleting;
    
    if (isAddingCharacters) {
      // User is actively typing - reset all blocking flags to allow formatting
      this.isProcessingBlur = false;
      this.isUpdatingFromPicker = false;
    } else if (this.isUpdatingFromPicker && !this.isProcessingBlur) {
      // Not typing and flag is set - block to prevent interference
      return;
    }
    
    // Detect if user is deleting
    
    if (inputEvent.inputType) {
      if (inputEvent.inputType === 'deleteContentBackward' || 
          inputEvent.inputType === 'deleteContentForward' ||
          inputEvent.inputType === 'deleteByDrag' ||
          inputEvent.inputType === 'deleteByCut') {
        this.isDeleting = true;
      } else if (inputEvent.inputType === 'insertText' || 
                 inputEvent.inputType === 'insertCompositionText') {
        this.isDeleting = false;
      }
    }

    // Handle deletion
    if (isActuallyDeleting) {
      let finalValue = inputValue.replace(/\/{2,}/g, '/').replace(/:{2,}/g, ':').replace(/ {2,}/g, ' ');
      
      if (finalValue.length > 19) {
        finalValue = finalValue.substring(0, 19);
      }
      
      const cursorPos = input.selectionStart || 0;
      
      // Update datepicker during deletion
      if (this.datePickerDirective) {
        try {
          this.isUpdatingFromPicker = true;
          const datepicker = (this.datePickerDirective as any).bsDatepicker || 
                            (this.datePickerDirective as any).datepicker;
          if (datepicker) {
            const currentDatepickerValue = datepicker.bsValue;
            
            if (finalValue && this.isValidDateTime(finalValue)) {
              const date = this.parseDateTimeString(finalValue);
              if (date && (!currentDatepickerValue || 
                  currentDatepickerValue.getTime() !== date.getTime())) {
                datepicker.bsValue = date;
              }
            } else {
              if (currentDatepickerValue !== null) {
                datepicker.bsValue = null;
              }
            }
            
            setTimeout(() => {
              this.isUpdatingFromPicker = false;
            }, 400);
          }
        } catch (e) {
          this.isUpdatingFromPicker = false;
        }
      }
      
      this.value = finalValue;
      input.value = finalValue;
      
      setTimeout(() => {
        const safePos = Math.min(cursorPos, finalValue.length);
        input.setSelectionRange(safePos, safePos);
      }, 0);
      
      if (!finalValue || finalValue.trim() === '') {
        this.showError = false;
        this.errorMessage = '';
        this.setFormControlError(null);
      } else {
        this.validateDateTime();
      }
      
      setTimeout(() => {
        if (this.isDeleting || input.value === finalValue) {
          this.onChange(finalValue);
          this.onTouched();
        }
      }, 0);
      
      setTimeout(() => {
        this.isDeleting = false;
        setTimeout(() => {
          this.lastDeletedValue = '';
        }, 100);
      }, 500);
      
      return;
    }

    // Handle typing - format datetime
    const numbersBeforeCursor = (oldValue.substring(0, cursorPosition).replace(/[\/: ]/g, '')).length;
    inputValue = this.autoFormatDateTime(inputValue);

    if (inputValue.length > 19) {
      inputValue = inputValue.substring(0, 19);
    }

    this.value = inputValue;
    
    if (input.value !== inputValue) {
      input.value = inputValue;
    }

    // Restore cursor position
    setTimeout(() => {
      const digitsBeforeOld = numbersBeforeCursor;
      let digitCount = 0;
      let newCursorPos = inputValue.length;
      
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== '/' && inputValue[i] !== ':' && inputValue[i] !== ' ') {
          digitCount++;
          if (digitCount > digitsBeforeOld) {
            newCursorPos = i + 1;
            break;
          }
        }
      }
      
      if (newCursorPos === inputValue.length && digitCount <= digitsBeforeOld) {
        newCursorPos = inputValue.length;
      }
      
      newCursorPos = Math.min(Math.max(0, newCursorPos), inputValue.length);
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    this.onChange(inputValue);
    this.onTouched();

    this.validateDateTime();

    // Don't sync datepicker value while typing - only sync on blur or when user clicks calendar
    // This prevents the calendar from opening automatically when user enters a valid date
    // The datepicker will be synced when user clicks the calendar icon (in openDatePicker)
    // or when the value is set programmatically (in writeValue)
    
    if (this.isValidDateTime(inputValue)) {
      this.emitDateChange(inputValue);
      // Only update the hidden input value, don't update datepicker bsValue while typing
      // This prevents the calendar from opening
      if (this.hiddenDatePicker?.nativeElement) {
        this.hiddenDatePicker.nativeElement.value = inputValue;
      }
    } else if (inputValue.length === 0) {
      // Clear datepicker if input is empty
      if (this.datePickerDirective) {
        try {
          const datepicker = (this.datePickerDirective as any)['bs'] || 
                            (this.datePickerDirective as any).bs || 
                            (this.datePickerDirective as any).bsDatepicker || 
                            (this.datePickerDirective as any).datepicker;
          if (datepicker) {
            this.isUpdatingFromPicker = true;
            datepicker.bsValue = null;
            setTimeout(() => {
              this.isUpdatingFromPicker = false;
            }, 50);
          }
        } catch (e) {
          this.isUpdatingFromPicker = false;
        }
      }
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const key = event.key;

    if (event.keyCode === 8 || event.keyCode === 46) {
      this.isDeleting = true;
      this.lastDeletedValue = input.value;
    } else if (key.length === 1 && /[0-9\/: ]/.test(key)) {
      this.isDeleting = false;
      this.lastDeletedValue = '';
    }

    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(event.keyCode) !== -1 ||
      (event.keyCode === 65 && event.ctrlKey === true) ||
      (event.keyCode === 67 && event.ctrlKey === true) ||
      (event.keyCode === 86 && event.ctrlKey === true) ||
      (event.keyCode === 88 && event.ctrlKey === true)) {
      return;
    }

    if (key === '/' || key === ':' || key === ' ') {
      return;
    }

    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    
    let cleanedValue = pastedText.replace(/[^\d\/: ]/g, '');
    cleanedValue = this.autoFormatDateTime(cleanedValue);
    
    if (cleanedValue.length > 19) {
      cleanedValue = cleanedValue.substring(0, 19);
    }

    this.value = cleanedValue;
    if (this.dateInput) {
      this.dateInput.nativeElement.value = cleanedValue;
    }
    
    this.onChange(cleanedValue);
    this.onTouched();

    if (this.isValidDateTime(cleanedValue)) {
      this.emitDateChange(cleanedValue);
    }
  }

  onBlur(): void {
    this.onTouched();
    
    // CRITICAL: Set flags to prevent datepicker from interfering during blur processing
    this.isProcessingBlur = true;
    this.isUpdatingFromPicker = true;
    
    // Only format on blur if the value is incomplete but has some digits
    // Don't add random time - only format what the user has entered
    if (!this.isDeleting && this.value && !this.isValidDateTime(this.value)) {
      // Only format if there are digits to format, but don't pad with zeros
      const numbersOnly = this.value.replace(/[\/: ]/g, '');
      if (numbersOnly.length > 0 && numbersOnly.length < 14) {
        // User has entered partial date/time - just format what they have
        // Store the old value to prevent datepicker from restoring it
        const oldValue = this.value;
        this.formatDateTimeValue(this.value);
        
        // If the formatted value is longer than what user had and invalid, revert
        // This prevents datepicker from adding random values
        if (this.value.length > oldValue.length && !this.isValidDateTime(this.value)) {
          // Something was added - revert to what user had
          this.value = oldValue;
          if (this.dateInput) {
            this.dateInput.nativeElement.value = oldValue;
          }
          this.onChange(oldValue);
        }
      }
    }
    
    // Validate but don't sync with datepicker if value is incomplete
    this.validateDateTime();
    
    // Reset flags after a delay to allow blur processing to complete
    // Use a longer delay to ensure datepicker doesn't interfere
    setTimeout(() => {
      this.isDeleting = false;
      this.isProcessingBlur = false;
      this.isUpdatingFromPicker = false;
    }, 300);
  }

  private autoFormatDateTime(value: string): string {
    const numbersOnly = value.replace(/[\/: ]/g, '');
    
    let formatted = '';
    for (let i = 0; i < numbersOnly.length; i++) {
      formatted += numbersOnly[i];
      // Format: dd/MM/yyyy HH:mm:ss
      if (i === 1 && numbersOnly.length > 2) {
        formatted += '/'; // After day
      } else if (i === 3 && numbersOnly.length > 4) {
        formatted += '/'; // After month
      } else if (i === 7 && numbersOnly.length > 8) {
        formatted += ' '; // After year
      } else if (i === 9 && numbersOnly.length > 10) {
        formatted += ':'; // After hours
      } else if (i === 11 && numbersOnly.length > 12) {
        formatted += ':'; // After minutes
      }
    }
    return formatted;
  }

  private formatDateTimeValue(value: string): void {
    if (!value) return;

    const numbersOnly = value.replace(/[\/: ]/g, '');
    
    if (numbersOnly.length === 0) {
      this.value = '';
      if (this.dateInput) {
        this.dateInput.nativeElement.value = '';
      }
      this.onChange('');
      return;
    }

    // Use the same formatting logic as autoFormatDateTime
    // IMPORTANT: Only format what the user has entered - don't pad with zeros
    let formatted = '';
    for (let i = 0; i < numbersOnly.length && i < 14; i++) {
      formatted += numbersOnly[i];
      // Format: dd/MM/yyyy HH:mm:ss
      // Add separators AFTER the digits
      if (i === 1 && numbersOnly.length > 2) {
        formatted += '/'; // After day (2nd digit)
      } else if (i === 3 && numbersOnly.length > 4) {
        formatted += '/'; // After month (4th digit)
      } else if (i === 7 && numbersOnly.length > 8) {
        formatted += ' '; // After year (8th digit)
      } else if (i === 9 && numbersOnly.length > 10) {
        formatted += ':'; // After hours (10th digit)
      } else if (i === 11 && numbersOnly.length > 12) {
        formatted += ':'; // After minutes (12th digit)
      }
    }

    // CRITICAL: Don't update datepicker if value is incomplete
    // Only update if it's a complete valid datetime
    const wasUpdatingFromPicker = this.isUpdatingFromPicker;
    this.isUpdatingFromPicker = true;

    this.value = formatted;
    if (this.dateInput) {
      this.dateInput.nativeElement.value = formatted;
    }
    this.onChange(formatted);

    // Only sync with datepicker if the value is complete and valid
    if (this.isValidDateTime(formatted)) {
      this.emitDateChange(formatted);
      // Sync with datepicker only for complete values
      if (this.datePickerDirective && formatted.length === 19) {
        try {
          const date = this.parseDateTimeString(formatted);
          if (date) {
            const datepicker = (this.datePickerDirective as any)['bs'] || 
                              (this.datePickerDirective as any).bs || 
                              (this.datePickerDirective as any).bsDatepicker || 
                              (this.datePickerDirective as any).datepicker;
            if (datepicker) {
              datepicker.bsValue = date;
            }
          }
        } catch (e) {
          // Silently fail
        }
      }
    }
    
    // Restore the flag
    setTimeout(() => {
      this.isUpdatingFromPicker = wasUpdatingFromPicker;
    }, 100);
  }

  private isValidDateTime(dateString: string): boolean {
    if (!dateString) {
      return false;
    }

    // Validate datetime format: dd/MM/yyyy HH:mm:ss (19 characters)
    if (dateString.length !== 19) {
      return false;
    }

    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) {
      return false;
    }

    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
      return false;
    }

    const timeParts = timePart.split(':');
    if (timeParts.length !== 3) {
      return false;
    }

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return false;
    }

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return false;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return false;
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return date.getDate() === day && date.getMonth() === month - 1 && 
           date.getFullYear() === year && date.getHours() === hours &&
           date.getMinutes() === minutes && date.getSeconds() === seconds;
  }

  private emitDateChange(dateString: string): void {
    if (!this.isValidDateTime(dateString)) {
      return;
    }

    const date = this.parseDateTimeString(dateString);
    if (!date) {
      return;
    }

    this.dateChange.emit({
      date: date,
      id: this.fieldName
    });

    this.searchDateChanges.emit({
      selectedDate: dateString,
      fieldName: this.fieldName,
      dateString: date
    });
  }

  writeValue(value: string): void {
    if (this.isUpdatingFromPicker) {
      return;
    }
    
    const currentValue = this.value || '';
    const currentInputValue = this.dateInput?.nativeElement.value || '';
    const newValue = value || '';
    
    if (newValue === currentValue && newValue === currentInputValue) {
      return;
    }
    
    const expectedLength = 19;
    if (currentValue && newValue && 
        currentValue.length === expectedLength && newValue.length === expectedLength &&
        this.isValidDateTime(currentValue) && this.isValidDateTime(newValue)) {
      const currentDate = this.parseDateTimeString(currentValue);
      const newDate = this.parseDateTimeString(newValue);
      if (currentDate && newDate && currentDate.getTime() === newDate.getTime()) {
        return;
      }
    }
    
    if (this.dateInput?.nativeElement === document.activeElement) {
      if (newValue !== currentInputValue && currentInputValue !== '') {
        return;
      }
    }
    
    if (this.isDeleting) {
      const currentValue = this.value || '';
      const currentInputValue = this.dateInput?.nativeElement.value || '';
      const newValue = value || '';
      
      if (newValue === this.lastDeletedValue && this.lastDeletedValue !== '') {
        return;
      }
      
      if (newValue.length > currentValue.length && currentValue.length > 0) {
        return;
      }
      
      if (newValue === currentValue || newValue === currentInputValue) {
        return;
      }
      
      if (newValue.length <= currentValue.length || newValue === '') {
        this.value = newValue;
        if (this.dateInput) {
          this.dateInput.nativeElement.value = newValue;
        }
        if (this.datePickerDirective) {
          try {
            this.isUpdatingFromPicker = true;
            // Access the internal 'bs' property from BsDateFormatDirectiveOpt
            const datepicker = (this.datePickerDirective as any)['bs'] || 
                              (this.datePickerDirective as any).bs || 
                              (this.datePickerDirective as any).bsDatepicker || 
                              (this.datePickerDirective as any).datepicker;
            if (datepicker) {
              if (newValue && this.isValidDateTime(newValue)) {
                const date = this.parseDateTimeString(newValue);
                if (date) {
                  datepicker.bsValue = date;
                }
              } else {
                datepicker.bsValue = null;
              }
            }
            setTimeout(() => {
              this.isUpdatingFromPicker = false;
            }, 50);
          } catch (e) {
            this.isUpdatingFromPicker = false;
          }
        }
        return;
      }
      
      return;
    }
    
    if (value !== undefined && value !== null) {
      if (this.value === value && this.dateInput?.nativeElement.value === value) {
        return;
      }
      
      if (this.value && value && this.isValidDateTime(this.value) && this.isValidDateTime(value)) {
        const currentDate = this.parseDateTimeString(this.value);
        const newDate = this.parseDateTimeString(value);
        if (currentDate && newDate && currentDate.getTime() === newDate.getTime()) {
          return;
        }
      }
      
      this.value = value;
      if (value && !value.includes('/')) {
        this.formatDateTimeValue(value);
      } else if (this.dateInput) {
        this.dateInput.nativeElement.value = value;
      }
      
      // Sync datepicker value when value is set programmatically
      if (this.datePickerDirective && value) {
        try {
          if (this.isValidDateTime(value)) {
            const date = this.parseDateTimeString(value);
            if (date) {
              const datepicker = (this.datePickerDirective as any)['bs'] || 
                                (this.datePickerDirective as any).bs || 
                                (this.datePickerDirective as any).bsDatepicker || 
                                (this.datePickerDirective as any).datepicker;
              if (datepicker) {
                this.isUpdatingFromPicker = true;
                
                // Update the hidden input element's value
                if (this.hiddenDatePicker?.nativeElement) {
                  this.hiddenDatePicker.nativeElement.value = value;
                }
                
                // Close datepicker if it's open before updating value
                try {
                  const isOpen = datepicker.isOpen || 
                                (datepicker as any)._isOpen || 
                                (datepicker as any).isOpen$?.value;
                  if (isOpen && typeof datepicker.hide === 'function') {
                    datepicker.hide();
                  }
                } catch (e) {
                  // Silently fail
                }
                
                // Update the datepicker's bsValue
                datepicker.bsValue = date;
                
                // Immediately close if it opened after setting value
                setTimeout(() => {
                  try {
                    const isOpen = datepicker.isOpen || 
                                  (datepicker as any)._isOpen || 
                                  (datepicker as any).isOpen$?.value;
                    if (isOpen && typeof datepicker.hide === 'function') {
                      datepicker.hide();
                    }
                  } catch (e) {
                    // Silently fail
                  }
                  this.isUpdatingFromPicker = false;
                }, 50);
              }
            }
          } else {
            // Clear datepicker if value is invalid
            const datepicker = (this.datePickerDirective as any)['bs'] || 
                              (this.datePickerDirective as any).bs || 
                              (this.datePickerDirective as any).bsDatepicker || 
                              (this.datePickerDirective as any).datepicker;
            if (datepicker) {
              this.isUpdatingFromPicker = true;
              
              // Clear the hidden input element's value
              if (this.hiddenDatePicker?.nativeElement) {
                this.hiddenDatePicker.nativeElement.value = '';
              }
              
              datepicker.bsValue = null;
              setTimeout(() => {
                this.isUpdatingFromPicker = false;
              }, 50);
            }
          }
        } catch (e) {
          this.isUpdatingFromPicker = false;
        }
      }
    } else {
      this.value = '';
      if (this.dateInput) {
        this.dateInput.nativeElement.value = '';
      }
      
      // Clear datepicker when value is cleared
      if (this.datePickerDirective) {
        try {
          const datepicker = (this.datePickerDirective as any)['bs'] || 
                            (this.datePickerDirective as any).bs || 
                            (this.datePickerDirective as any).bsDatepicker || 
                            (this.datePickerDirective as any).datepicker;
          if (datepicker) {
            this.isUpdatingFromPicker = true;
            datepicker.bsValue = null;
            // Reset flags immediately so user can type again
            setTimeout(() => {
              this.isUpdatingFromPicker = false;
              this.isProcessingBlur = false;
              this.isDeleting = false;
            }, 10);
          }
        } catch (e) {
          this.isUpdatingFromPicker = false;
          this.isProcessingBlur = false;
        }
      }
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  openDatePicker(datepickerDirective: any): void {
    if (!this.disabled) {
      // For BsDateFormatDirectiveOpt, try to access the internal 'bs' property or use the open() method
      let datepicker: BsDatepickerDirective | null = null;
      let directive = datepickerDirective || this.datePickerDirective;
      
      if (!directive) {
        return;
      }
      
      // CRITICAL: Sync the datepicker value before opening
      // This ensures the calendar shows the correct date when opened
      if (this.value && this.isValidDateTime(this.value)) {
        try {
          const date = this.parseDateTimeString(this.value);
          if (date) {
            // Access the internal 'bs' property from BsDateFormatDirectiveOpt
            datepicker = (directive as any)['bs'] || 
                        (directive as any).bs || 
                        (directive as any).bsDatepicker || 
                        (directive as any).datepicker;
            
            if (datepicker) {
              // Update the hidden input value
              if (this.hiddenDatePicker?.nativeElement) {
                this.hiddenDatePicker.nativeElement.value = this.value;
              }
              
              // Set the datepicker value so it shows the correct date when opened
              this.isUpdatingFromPicker = true;
              datepicker.bsValue = date;
              
              // Small delay to ensure value is set before opening
              setTimeout(() => {
                this.isUpdatingFromPicker = false;
              }, 10);
            }
          }
        } catch (e) {
          // Silently fail
        }
      }
      
      // Now open the datepicker
      // First, try calling the open() method if available (BsDateFormatDirectiveOpt has this)
      if (typeof directive.open === 'function') {
        try {
          directive.open();
          return;
        } catch (e) {
          console.warn('Error calling open() method:', e);
        }
      }
      
      // Try to access the internal 'bs' property (private but accessible at runtime)
      if (!datepicker) {
        try {
          // Access 'bs' property using bracket notation to bypass TypeScript private access
          datepicker = (directive as any)['bs'] || 
                       (directive as any).bs || 
                       (directive as any).bsDatepicker || 
                       (directive as any).datepicker;
        } catch (e) {
          // Continue to try other methods
        }
      }
      
      // If we got the datepicker, call show()
      if (datepicker && typeof datepicker.show === 'function') {
        try {
          datepicker.show();
          return;
        } catch (e) {
          console.warn('Error opening datepicker:', e);
        }
      }
      
      // Fallback: try toggle() method
      if (typeof directive.toggle === 'function') {
        try {
          directive.toggle();
          return;
        } catch (e) {
          console.warn('Error calling toggle() method:', e);
        }
      }
      
      // Last resort: try to access bs directly and call show
      if (directive) {
        try {
          const bs = (directive as any)['bs'] || (directive as any).bs;
          if (bs && typeof bs.show === 'function') {
            bs.show();
          }
        } catch (e) {
          console.warn('Error accessing bs property:', e);
        }
      }
    }
  }

  onDatePickerChange(event: any): void {
    // CRITICAL: Ignore datepicker changes during deletion, programmatic updates, or blur processing
    // This prevents the datepicker from adding random values when user blurs
    if (this.isDeleting || this.isUpdatingFromPicker || this.isProcessingBlur) {
      return;
    }
    
    let raw: any = null;
    raw = event?.date ?? event?.selectedDate ?? event;
  
    if (raw == null || raw === '') {
      this.hardClear();
      return;
    }
  
    this.isUpdatingFromPicker = true;
  
    let formattedDate = '';
  
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) {
        this.isUpdatingFromPicker = false;
        this.hardClear();
        return;
      }
      formattedDate = this.formatDateFromPicker(raw);
    }
    else if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) {
        this.isUpdatingFromPicker = false;
        this.hardClear();
        return;
      }
      if (s.length === 19 && s.includes(' ') && s.includes(':')) {
        formattedDate = s;
      } else {
        const date = this.parseDateTimeString(s);
        if (date) {
          formattedDate = this.formatDateFromPicker(date);
        } else {
          formattedDate = s;
        }
      }
    }
    else if (event?.formatted && typeof event.formatted === 'string') {
      formattedDate = event.formatted;
    }
    else {
      this.isUpdatingFromPicker = false;
      this.hardClear();
      return;
    }
  
    if (!formattedDate) {
      this.isUpdatingFromPicker = false;
      this.hardClear();
      return;
    }
  
    this.value = formattedDate;
  
    if (this.dateInput?.nativeElement) {
      this.dateInput.nativeElement.value = formattedDate;
    }
  
    if ((this as any).hiddenDatePicker?.nativeElement) {
      (this as any).hiddenDatePicker.nativeElement.value = formattedDate;
    }
  
    this.onChange(formattedDate);
    this.onTouched();
  
    this.isUpdatingFromPicker = false;
    this.emitDateChange(formattedDate);
  }
  
  private formatDateFromPicker(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private parseDateTimeString(dateString: string): Date | null {
    if (!dateString) {
      return null;
    }

    if (dateString.length !== 19) {
      return null;
    }

    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) {
      return null;
    }

    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
      return null;
    }

    const timeParts = timePart.split(':');
    if (timeParts.length !== 3) {
      return null;
    }

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  private validateDateTime(): void {
    this.showError = false;
    this.errorMessage = '';

    if (!this.value || this.value.trim() === '') {
      this.setFormControlError(null);
      return;
    }

    if (this.value.length !== 19) {
      this.showError = true;
      this.errorMessage = 'Please enter a complete date and time in DD/MM/YYYY HH:mm:ss format';
      this.setFormControlError({ invalidDate: true });
      return;
    }

    if (!this.isValidDateTime(this.value)) {
      this.showError = true;
      this.errorMessage = 'Please enter a valid date and time';
      this.setFormControlError({ invalidDate: true });
      return;
    }

    // Check date restrictions (future/past date validation)
    const date = this.parseDateTimeString(this.value);
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(date);
      inputDate.setHours(0, 0, 0, 0);

      // Check if future dates are disabled (only past dates allowed)
      // This happens when isFromList is true and isPastDate is false
      if (this.isFromList && !this.isPastDate) {
        if (inputDate > today) {
          this.showError = true;
          this.errorMessage = 'Future date is not allowed';
          this.setFormControlError({ futureDate: true });
          return;
        }
      }

      // Check if past dates are disabled (only future dates allowed)
      // This happens when isPastDate is true
      if (this.isPastDate) {
        if (inputDate < today) {
          this.showError = true;
          this.errorMessage = 'Past date is not allowed';
          this.setFormControlError({ pastDate: true });
          return;
        }
      }

      // Also check ControlTypeConfigurationId if set
      if (this.ControlTypeConfigurationId) {
        if (this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowPastDateOnly ||
            this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowPastDateTimeOnly) {
          // Only past dates allowed
          if (inputDate > today) {
            this.showError = true;
            this.errorMessage = 'Future date is not allowed';
            this.setFormControlError({ futureDate: true });
            return;
          }
        } else if (this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowFutureDateOnly ||
                   this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowFutureDateTimeOnly) {
          // Only future dates allowed
          if (inputDate < today) {
            this.showError = true;
            this.errorMessage = 'Past date is not allowed';
            this.setFormControlError({ pastDate: true });
            return;
          }
        } else if (this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowCurrentDate ||
                   this.ControlTypeConfigurationId === DSControlTypeConfigurationGuid.AllowCurrentDateTimeOnly) {
          // Only current date allowed
          if (inputDate.getTime() !== today.getTime()) {
            this.showError = true;
            this.errorMessage = 'Only current date is allowed';
            this.setFormControlError({ invalidDate: true });
            return;
          }
        }
      }
    }

    this.setFormControlError(null);
  }

  private setFormControlError(error: any): void {
    if (this.ngControl && this.ngControl.control) {
      if (error) {
        this.ngControl.control.setErrors(error);
        this.ngControl.control.markAsTouched();
      } else {
        const currentErrors = this.ngControl.control.errors;
        if (currentErrors) {
          // Remove date-related errors
          if (currentErrors['invalidDate']) {
            delete currentErrors['invalidDate'];
          }
          if (currentErrors['futureDate']) {
            delete currentErrors['futureDate'];
          }
          if (currentErrors['pastDate']) {
            delete currentErrors['pastDate'];
          }
          const hasOtherErrors = Object.keys(currentErrors).length > 0;
          this.ngControl.control.setErrors(hasOtherErrors ? currentErrors : null);
        }
      }
    }
  }

  private hardClear(): void {
    // CRITICAL: Reset all flags immediately so user can type again
    this.isUpdatingFromPicker = true;
    this.isProcessingBlur = false;
    this.isDeleting = false;
    this.lastDeletedValue = '';
    
    this.value = '';
  
    if (this.dateInput?.nativeElement) {
      this.dateInput.nativeElement.value = '';
    }
  
    if (this.hiddenDatePicker?.nativeElement) {
      this.hiddenDatePicker.nativeElement.value = '';
    }
  
    if (this.datePickerDirective) {
      try {
        // Access the internal 'bs' property from BsDateFormatDirectiveOpt
        const datepicker = (this.datePickerDirective as any)['bs'] || 
                          (this.datePickerDirective as any).bs || 
                          (this.datePickerDirective as any).bsDatepicker ||
                          (this.datePickerDirective as any).datepicker;
        if (datepicker) {
          datepicker.bsValue = null;
        }
      } catch {}
    }
  
    this.onChange('');
    this.onTouched();
  
    this.showError = false;
    this.errorMessage = '';
    this.setFormControlError(null);
    
    // Reset flags immediately so user can start typing again
    // Use a very short timeout to ensure DOM updates complete
    setTimeout(() => {
      this.isUpdatingFromPicker = false;
      this.isProcessingBlur = false;
      this.isDeleting = false;
    }, 10);
  }
}

