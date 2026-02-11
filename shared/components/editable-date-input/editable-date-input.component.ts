import { Component, forwardRef, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, Injector, Optional, Self } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, NgControl } from '@angular/forms';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { BsDatepickerDirective } from 'ngx-bootstrap/datepicker';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';

@Component({
  selector: 'app-editable-date-input',
  templateUrl: './editable-date-input.component.html',
  styleUrls: ['./editable-date-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditableDateInputComponent),
      multi: true
    }
  ]
})
export class EditableDateInputComponent implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  constructor(private injector: Injector) {
    // Get NgControl after initialization to avoid circular dependency
  }
  @Input() id: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() format: string = 'dd/MM/yyyy';
  @Input() fieldName: string = '';
  @Input() ControlTypeConfigurationId?: string;
  @Input() isTime: boolean = false; // Support for datetime fields
  
  // Support for legacy properties to maintain backward compatibility
  // These will be mapped to ControlTypeConfigurationId if not already set
  @Input() isFromList: boolean = false;
  @Input() isPastDate: boolean = false;
  @Input() isPendingSheet: boolean = false;
  
  @Output() dateChange = new EventEmitter<any>();
  @Output() searchDateChanges = new EventEmitter<any>();
  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;
  @ViewChild('hiddenDatePicker', { static: false }) hiddenDatePicker!: ElementRef<HTMLInputElement>;
  @ViewChild('datePickerDirective', { static: false }) datePickerDirective!: any; // BsDateFormatDirective

  value: string = '';
  private destroy$ = new Subject<void>();
  private onChange = (value: string) => {};
  private onTouched = () => {};
  private isUpdatingFromPicker = false;
  showError: boolean = false;
  errorMessage: string = '';
  private ngControl?: NgControl;
  private previousValue: string = '';
  private isDeleting: boolean = false;
  private lastDeletedValue: string = ''; // Track the last value before deletion to prevent restoration
  private bsValueSub?: Subscription;

  ngOnInit(): void {
    // Initialize with empty value or format existing value
    if (this.value) {
      this.formatDateValue(this.value);
    }
    
    // Map legacy properties to ControlTypeConfigurationId if not already set
    // This ensures backward compatibility and preserves validation logic
    if (!this.ControlTypeConfigurationId) {
      this.ControlTypeConfigurationId = this.getControlTypeConfigurationIdFromLegacyProps();
    }
    
    // Try to get NgControl for validation
    try {
      const control = this.injector.get(NgControl, null);
      this.ngControl = control || undefined;
    } catch (e) {
      // NgControl might not be available, that's okay
      this.ngControl = undefined;
    }
  }

  /**
   * Maps legacy properties (isFromList, isPastDate, isPendingSheet) to ControlTypeConfigurationId
   * This ensures backward compatibility and preserves validation logic
   * Logic matches the bs-date-format.directive.ts behavior:
   * - isFromList && !isPastDate: AllowPastDateOnly (maxDate = today or yesterday if isPendingSheet)
   * - isPastDate: AllowFutureDateOnly (minDate = today)
   */
  private getControlTypeConfigurationIdFromLegacyProps(): string | undefined {
    // If isPastDate is true, it means only future dates are allowed (minDate = today)
    if (this.isPastDate) {
      return DSControlTypeConfigurationGuid.AllowFutureDateOnly;
    }
    
    // If isFromList is true (and not isPastDate), it means only past dates are allowed
    // isPendingSheet affects whether yesterday or today is the max date, but both are past-only
    if (this.isFromList && !this.isPastDate) {
      return DSControlTypeConfigurationGuid.AllowPastDateOnly;
    }
    
    // If neither is set, no restriction
    return undefined;
  }

  ngAfterViewInit(): void {
    // Ensure datepicker is properly initialized for this instance
    // Use multiple timeouts to handle different initialization timings
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

  getMaxLength(): number {
    return this.isTime ? 19 : 10;
  }

  private initializeDatePicker(): void {
    // Get the BsDatepickerDirective from the BsDateFormatDirective
    let datepicker: BsDatepickerDirective | null = null;
    
    if (this.datePickerDirective) {
      // The BsDateFormatDirective has a private bsDatepicker property
      // We need to access it through the directive
      try {
        // Try to access the datepicker through the directive
        datepicker = (this.datePickerDirective as any).bsDatepicker || 
                     (this.datePickerDirective as any).datepicker;
      } catch (e) {
        // If direct access fails, try alternative methods
      }
    }
    
    // Sync datepicker with input value
    if (datepicker && this.value) {
      const date = this.parseDateString(this.value);
      if (date) {
        try {
          datepicker.bsValue = date;
        } catch (e) {
          // Silently fail - datepicker might not be ready yet
        }
      }
    }

    // Subscribe to bsValueChange to catch Clear button (some cases don't emit through directive outputs)
    if (datepicker && !this.bsValueSub && (datepicker as any).bsValueChange) {
      this.bsValueSub = (datepicker as any).bsValueChange.subscribe((selected: Date | null | undefined) => {
        // Only handle clear; normal selections are handled by onDatePickerChange
        if (selected === null) {
          this.hardClear();
          return;
        }
        // In some ngx-bootstrap versions, clear can emit undefined
        if (selected === undefined) {
          const hiddenVal = this.hiddenDatePicker?.nativeElement?.value || '';
          if (!hiddenVal) {
            this.hardClear();
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.bsValueSub) {
      this.bsValueSub.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(event: Event): void {
    // Skip if updating from datepicker
    if (this.isUpdatingFromPicker) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;
    
    // Get the raw input value directly from the event target
    let inputValue = input.value;

    // Get cursor position BEFORE any processing
    const cursorPosition = input.selectionStart || 0;
    const oldValue = this.value || '';
    
    // Remove all non-numeric characters except '/'
    // This preserves the order of digits as they appear in the input
    inputValue = inputValue.replace(/[^\d/]/g, '');
    
    // Detect if user is deleting by comparing digit counts
    const oldNumbersOnly = oldValue.replace(/\//g, '');
    const newNumbersOnly = inputValue.replace(/\//g, '');
    let isDeletingInput = false;
    
    // If inputEvent has inputType, use it to detect deletion
    if (inputEvent.inputType) {
      if (inputEvent.inputType === 'deleteContentBackward' || 
          inputEvent.inputType === 'deleteContentForward' ||
          inputEvent.inputType === 'deleteByDrag' ||
          inputEvent.inputType === 'deleteByCut') {
        isDeletingInput = true;
        this.isDeleting = true;
      } else if (inputEvent.inputType === 'insertText' || 
                 inputEvent.inputType === 'insertCompositionText') {
        isDeletingInput = false;
        this.isDeleting = false;
      }
    } else {
      // Fallback when inputType is not available
      isDeletingInput = newNumbersOnly.length < oldNumbersOnly.length;
      this.isDeleting = isDeletingInput;
    }

    const isActuallyDeleting = isDeletingInput;

    // CRITICAL: When deleting, let browser handle it completely naturally
    if (isActuallyDeleting) {
      // Accept whatever the browser gives us after deletion
      // Only do minimal cleanup - remove consecutive slashes
      let finalValue = inputValue.replace(/\/{2,}/g, '/');
      
      // Limit length based on format
      const maxLength = this.isTime ? 19 : 10;
      if (finalValue.length > maxLength) {
        finalValue = finalValue.substring(0, maxLength);
      }
      
      // Get cursor position before any updates
      const cursorPos = input.selectionStart || 0;
      
      // CRITICAL: Update datepicker FIRST to prevent it from restoring old value
      // During deletion, we need to clear or update the datepicker immediately
      // to prevent its valueChanges subscription from restoring the old value
      // The datepicker directive subscribes to control.valueChanges and updates bsValue,
      // which can trigger bsValueChange that calls setValue, restoring the old value
      if (this.datePickerDirective) {
        try {
          const datepicker = (this.datePickerDirective as any).bsDatepicker || 
                            (this.datePickerDirective as any).datepicker;
          if (datepicker) {
            // Set flag to prevent onDatePickerChange from interfering
            // Keep it set for a longer duration to prevent datepicker directive's
            // valueChanges subscription from processing the deletion
            this.isUpdatingFromPicker = true;
            
            // Clear or update datepicker value immediately during deletion
            // This prevents the datepicker directive's valueChanges subscription
            // from trying to parse and restore the old valid date
            // IMPORTANT: We need to check if the value actually changed to avoid
            // triggering bsValueChange unnecessarily, which could cause random numbers
            const currentDatepickerValue = datepicker.bsValue;
            
            if (finalValue && this.isValidDate(finalValue)) {
              // Only set if it's still a valid date AND different from current
              const date = this.parseDateString(finalValue);
              if (date && (!currentDatepickerValue || 
                  currentDatepickerValue.getTime() !== date.getTime())) {
                datepicker.bsValue = date;
              }
            } else {
              // ALWAYS clear datepicker if value is invalid or incomplete
              // This is critical - if we don't clear it, the datepicker still has
              // the old valid date and might restore it
              // Only clear if it's not already null to avoid unnecessary updates
              if (currentDatepickerValue !== null) {
                datepicker.bsValue = null;
              }
            }
            
            // Keep flag set longer to prevent datepicker directive from interfering
            // The datepicker directive's valueChanges subscription might fire after onChange
            setTimeout(() => {
              this.isUpdatingFromPicker = false;
            }, 400); // Extended to 400ms to cover async operations
          }
        } catch (e) {
          this.isUpdatingFromPicker = false;
        }
      }
      
      // Update our internal value
      this.value = finalValue;
      
      // ALWAYS update the input element directly to ensure it reflects the deletion
      // This prevents any form control or datepicker from restoring the old value
      input.value = finalValue;
      
      // Restore cursor position after update
      this.setCursorPosition(input, Math.min(cursorPos, finalValue.length));
      
      // Clear error if value is empty
      if (!finalValue || finalValue.trim() === '') {
        this.showError = false;
        this.errorMessage = '';
        this.setFormControlError(null);
      } else {
        this.validateDate();
      }
      
      // Emit value (even if empty - allow clearing)
      // IMPORTANT: We need to call onChange to update the form control,
      // but the datepicker directive's valueChanges subscription might try to restore
      // the old value. We've already cleared/updated the datepicker above and set
      // isUpdatingFromPicker to prevent onDatePickerChange from interfering.
      // Defer onChange slightly to ensure DOM update completes first
      setTimeout(() => {
        // Double-check we're still deleting (in case flag was reset)
        if (this.isDeleting || input.value === finalValue) {
          // Call onChange - this will trigger the datepicker directive's valueChanges
          // subscription, but we've already cleared the datepicker's bsValue above,
          // so it shouldn't try to restore the old value
          this.onChange(finalValue);
          this.onTouched();
        }
      }, 0);
      
      // Keep isDeleting flag longer to prevent writeValue from restoring old value
      // Reset flag after a longer delay to ensure all async operations complete
      // This includes the datepicker directive's valueChanges subscription which might
      // fire after onChange and try to restore the old value
      setTimeout(() => {
        this.isDeleting = false;
        // Clear lastDeletedValue after a delay to allow normal operations
        setTimeout(() => {
          this.lastDeletedValue = '';
        }, 100);
      }, 500); // Extended to 500ms to cover datepicker directive's async operations
      
      // EXIT immediately - no further processing
      return;
    }

    // ONLY when TYPING (adding characters), do auto-formatting
    // Store original cursor position relative to numbers
    const numbersBeforeCursor = (oldValue.substring(0, cursorPosition).replace(/\//g, '')).length;
    
    // Get the character that was just inserted (if available from InputEvent)
    const insertedChar = (inputEvent as any)?.data;
    
    // Ensure digits are in correct order - the inputValue from browser should be correct
    // But verify by checking if we're inserting at the end (normal typing)
    const isInsertingAtEnd = cursorPosition >= oldValue.length;

    // If user is editing in the middle, preserve their slashes/positions to avoid shifting year    if (!isInsertingAtEnd) {
      let cleaned = inputValue.replace(/\/{2,}/g, '/');
            // Preserve digit positions; keep year digits when editing month
      const oldDigits = oldValue.replace(/\D/g, '');
      const oldYearDigits = oldDigits.length >= 8 ? oldDigits.slice(-4) : '';

      const firstSlash = cleaned.indexOf('/');
      if (firstSlash !== -1) {
        const digitsAfterFirst = cleaned.slice(firstSlash + 1).replace(/\D/g, '');
        if (digitsAfterFirst.length >= 2) {
          const monthDigits = digitsAfterFirst.slice(0, 2);
          let yearDigits = digitsAfterFirst.slice(2);
          if (yearDigits.length < 4 && oldYearDigits) {
            yearDigits = (oldYearDigits + yearDigits).slice(-4);
          } else if (yearDigits.length > 4) {
            yearDigits = yearDigits.slice(-4);
          }
          cleaned = cleaned.slice(0, firstSlash + 1) + monthDigits + (yearDigits ? '/' + yearDigits : '');
        }
      }

      const maxLength = this.getMaxLength();
      if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength);
      }
      this.value = cleaned;
      if (input.value !== cleaned) {
        input.value = cleaned;
      }
      this.setCursorPosition(input, Math.min(cursorPosition, cleaned.length));

      this.onChange(cleaned);
      this.onTouched();
      this.validateDate();
      if (this.isValidDate(cleaned)) {
        this.emitDateChange(cleaned);
      }
      return;
    }
    
    // Format with slashes/colons - preserve the exact order from inputValue
    // The inputValue should already have digits in the correct order from the browser
    inputValue = this.autoFormatDate(inputValue);

    // Limit based on format: dd/MM/yyyy (10 chars) or dd/MM/yyyy HH:mm:ss (19 chars)
    const maxLength = this.isTime ? 19 : 10;
    if (inputValue.length > maxLength) {
      inputValue = inputValue.substring(0, maxLength);
    }

    // Update our internal value - Angular binding will update the input
    // Don't set input.value directly to avoid conflicts with [value] binding
    this.value = inputValue;
    
    // Only update input.value directly if it's different (to trigger change detection)
    if (input.value !== inputValue) {
      input.value = inputValue;
    }

    // Restore cursor position for typing - find position after same number of digits
    const digitsBeforeOld = numbersBeforeCursor;
    let digitCount = 0;
    let newCursorPos = inputValue.length; // Default to end

    for (let i = 0; i < inputValue.length; i++) {
      if (inputValue[i] !== '/') {
        digitCount++;
        if (digitCount > digitsBeforeOld) {
          newCursorPos = i + 1; // Place cursor AFTER this digit
          break;
        }
      }
    }

    if (newCursorPos === inputValue.length && digitCount <= digitsBeforeOld) {
      newCursorPos = inputValue.length;
    }

    newCursorPos = Math.min(Math.max(0, newCursorPos), inputValue.length);
    this.setCursorPosition(input, newCursorPos);

    // CRITICAL: DO NOT sync with datepicker when typing manually
    // The datepicker directive's valueChanges subscription will handle syncing automatically
    // If we manually sync here, it creates a circular update that causes random numbers:
    // 1. We call onChange → form control updates
    // 2. Directive's valueChanges fires → sets bsDatepicker.bsValue
    // 3. bsValueChange fires → calls setValue → calls writeValue
    // 4. writeValue might reformat → causes random numbers
    // 
    // Instead, let the directive handle syncing naturally, but we'll ignore
    // writeValue calls that come from the directive during typing.

    // Emit the value
    this.onChange(inputValue);
    this.onTouched();

    // Validate date
    this.validateDate();

    // Emit date change events only if valid
    if (this.isValidDate(inputValue)) {
      this.emitDateChange(inputValue);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const key = event.key;

    // Track if user is deleting - set flag that will be checked in onInput
    if (event.keyCode === 8 || event.keyCode === 46) { // Backspace or Delete
      this.isDeleting = true;
      this.previousValue = input.value;
      this.lastDeletedValue = input.value; // Store the value before deletion to prevent restoration
      // Keep flag set - don't reset it here, let onInput handle it
    } else if (key.length === 1 && (this.isTime ? /[0-9\/: ]/.test(key) : /[0-9/]/.test(key))) {
      // User is typing a number or slash - definitely not deleting
      this.isDeleting = false;
      this.lastDeletedValue = ''; // Clear when user starts typing
    }
    // For arrow keys and other navigation, don't change the flag

    // Allow: backspace, delete, tab, escape, enter, arrow keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (event.keyCode === 65 && event.ctrlKey === true) ||
      (event.keyCode === 67 && event.ctrlKey === true) ||
      (event.keyCode === 86 && event.ctrlKey === true) ||
      (event.keyCode === 88 && event.ctrlKey === true)) {
      return;
    }

    // Allow '/' key and ':' and space for datetime
    if (key === '/' || (this.isTime && (key === ':' || key === ' '))) {
      return;
    }

    // Allow only numbers
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Remove all non-numeric characters except '/'
    let cleanedValue = pastedText.replace(/[^\d/]/g, '');
    
    // Format the pasted value
    cleanedValue = this.autoFormatDate(cleanedValue);
    
    // Limit based on format
    const maxLength = this.isTime ? 19 : 10;
    if (cleanedValue.length > maxLength) {
      cleanedValue = cleanedValue.substring(0, maxLength);
    }

    this.value = cleanedValue;
    if (this.dateInput) {
      this.dateInput.nativeElement.value = cleanedValue;
    }
    
    this.onChange(cleanedValue);
    this.onTouched();

    if (this.isValidDate(cleanedValue)) {
      this.emitDateChange(cleanedValue);
    }
  }

  onBlur(): void {
    this.onTouched();
    
    // Only format on blur if user was typing (not deleting)
    // Don't reformat if we just finished deleting
    if (!this.isDeleting && this.value && !this.isValidDate(this.value)) {
      this.formatDateValue(this.value);
    }
    
    // Validate and show error on blur
    this.validateDate();
    
    // Reset deletion flag on blur
    this.isDeleting = false;
  }

  private autoFormatDate(value: string): string {
    // NEVER call this during deletion - only when typing
    // Remove all '/' and ':' first to get just the digits in EXACT order as typed
    const numbersOnly = value.replace(/[\/: ]/g, '');
    
    if (this.isTime) {
      // Format as dd/MM/yyyy HH:mm:ss
      let formatted = '';
      for (let i = 0; i < numbersOnly.length; i++) {
        formatted += numbersOnly[i];
        // Add '/' after day (2 digits), month (4 digits)
        // Add ' ' after year (8 digits)
        // Add ':' after hours (11 digits), minutes (14 digits)
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
    } else {
      // Format as dd/MM/yyyy
      let formatted = '';
      for (let i = 0; i < numbersOnly.length; i++) {
        formatted += numbersOnly[i];
        // Add '/' AFTER the 2nd digit (day) and 4th digit (month)
        if ((i === 1 && numbersOnly.length > 2) || (i === 3 && numbersOnly.length > 4)) {
          formatted += '/';
        }
      }
      return formatted;
    }
  }

  private preserveOnDelete(value: string): string {
    // When deleting, preserve the user's input as much as possible
    // Only do minimal cleanup - remove consecutive slashes
    // Don't reformat or rearrange anything
    
    // Remove consecutive slashes (replace multiple with single)
    let cleaned = value.replace(/\/{2,}/g, '/');
    
    // That's it - return as-is, no reformatting
    return cleaned;
  }

  private calculateNewCursorPosition(oldValue: string, newValue: string, oldCursorPos: number): number {
    // Calculate how many slashes were before the cursor in old value
    const slashesBeforeCursorOld = (oldValue.substring(0, oldCursorPos).match(/\//g) || []).length;
    const numbersBeforeCursorOld = oldCursorPos - slashesBeforeCursorOld;
    
    // Calculate new cursor position accounting for slashes in new value
    let newCursorPos = numbersBeforeCursorOld;
    for (let i = 0; i < newValue.length && i < newCursorPos + (newValue.substring(0, newCursorPos).match(/\//g) || []).length; i++) {
      if (newValue[i] === '/') {
        newCursorPos++;
      }
    }
    
    // Ensure cursor doesn't go beyond the value length
    return Math.min(newCursorPos, newValue.length);
  }

  private formatDateValue(value: string): void {
    if (!value) return;

    // Remove all '/' first
    const numbersOnly = value.replace(/\//g, '');
    
    if (numbersOnly.length === 0) {
      this.value = '';
      if (this.dateInput) {
        this.dateInput.nativeElement.value = '';
      }
      this.onChange('');
      return;
    }

    // Format as dd/MM/yyyy
    let formatted = '';
    for (let i = 0; i < numbersOnly.length && i < 8; i++) {
      if (i === 2 || i === 4) {
        formatted += '/';
      }
      formatted += numbersOnly[i];
    }

    this.value = formatted;
    if (this.dateInput) {
      this.dateInput.nativeElement.value = formatted;
    }
    this.onChange(formatted);

    if (this.isValidDate(formatted)) {
      this.emitDateChange(formatted);
    }
  }

  private isValidDate(dateString: string): boolean {
    if (!dateString) {
      return false;
    }

    if (this.isTime) {
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

      // Basic validation
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

      // Check if date is valid
      const date = new Date(year, month - 1, day, hours, minutes, seconds);
      return date.getDate() === day && date.getMonth() === month - 1 && 
             date.getFullYear() === year && date.getHours() === hours &&
             date.getMinutes() === minutes && date.getSeconds() === seconds;
    } else {
      // Validate date format: dd/MM/yyyy (10 characters)
      if (dateString.length !== 10) {
        return false;
      }

      const parts = dateString.split('/');
      if (parts.length !== 3) {
        return false;
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      // Basic validation
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return false;
      }

      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        return false;
      }

      // Check if date is valid (e.g., not 31/02/2024)
      const date = new Date(year, month - 1, day);
      return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
  }

  private emitDateChange(dateString: string): void {
    if (!this.isValidDate(dateString)) {
      return;
    }

    const date = this.parseDateString(dateString);
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

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    // CRITICAL: Ignore writeValue if we're updating from datepicker
    // This prevents circular updates when the datepicker directive calls setValue
    if (this.isUpdatingFromPicker) {
      return; // Let onDatePickerChange handle it
    }
    
    // CRITICAL: If writeValue is called with the same value we already have,
    // ignore it to prevent unnecessary updates that could cause reformatting
    // This happens when the datepicker directive's bsValueChange fires and
    // calls setValue with the same value we just typed
    const currentValue = this.value || '';
    const currentInputValue = this.dateInput?.nativeElement.value || '';
    const newValue = value || '';
    
    // If the value is exactly the same, ignore it
    if (newValue === currentValue && newValue === currentInputValue) {
      return; // Already correct, no need to update
    }
    
    // CRITICAL: If writeValue is being called from the datepicker directive's bsValueChange
    // (which happens when we type a valid date), and the new value is the same date
    // but potentially different format, we should keep our current value to prevent reformatting
    // This is the root cause of random numbers - the directive tries to reformat what we typed
    const expectedLength = this.isTime ? 19 : 10;
    if (currentValue && newValue && 
        currentValue.length === expectedLength && newValue.length === expectedLength &&
        this.isValidDate(currentValue) && this.isValidDate(newValue)) {
      // Both are valid dates - check if they represent the same date
      const currentDate = this.parseDateString(currentValue);
      const newDate = this.parseDateString(newValue);
      if (currentDate && newDate && currentDate.getTime() === newDate.getTime()) {
        // Same date - keep our current value to prevent reformatting
        // This prevents the directive from changing "12/12/2026" to something else
        return;
      }
    }
    
    // CRITICAL: If the input has focus (user is actively typing) and writeValue is being called
    // with a value that's different from what's in the input, it's likely the directive
    // trying to update after we typed. Ignore it to prevent interference with typing.
    // This is especially important after clearing - the directive might try to restore
    // or reformat while the user is typing a new value.
    if (this.dateInput?.nativeElement === document.activeElement) {
      // User is actively typing - if writeValue is trying to set a different value,
      // it's the directive interfering. Only allow if the new value matches what's
      // currently in the input (which means it's a legitimate update)
      if (newValue !== currentInputValue && currentInputValue !== '') {
        // Directive is trying to set a different value while user is typing - ignore it
        // This prevents random numbers when typing after clearing
        return;
      }
    }
    
    // CRITICAL: Don't restore old values if user is currently deleting
    // This prevents form control from restoring old valid values during deletion
    if (this.isDeleting) {
      const currentValue = this.value || '';
      const currentInputValue = this.dateInput?.nativeElement.value || '';
      const newValue = value || '';
      
      // If writeValue is trying to restore the last deleted value, block it
      if (newValue === this.lastDeletedValue && this.lastDeletedValue !== '') {
        return; // Prevent restoring the value that was just deleted
      }
      
      // If the new value is longer than current, it's likely a restore attempt - ignore it
      if (newValue.length > currentValue.length && currentValue.length > 0) {
        return; // Prevent restoring old value during deletion
      }
      
      // If the new value matches what we already have, no need to update
      if (newValue === currentValue || newValue === currentInputValue) {
        return;
      }
      
      // Only allow updates that represent actual deletions (shorter or empty)
      if (newValue.length <= currentValue.length || newValue === '') {
        // This is a deletion result, allow it
        this.value = newValue;
        if (this.dateInput) {
          this.dateInput.nativeElement.value = newValue;
        }
        // Also update datepicker (but set flag to prevent circular updates)
        if (this.datePickerDirective) {
          try {
            this.isUpdatingFromPicker = true;
            const datepicker = (this.datePickerDirective as any).bsDatepicker || 
                              (this.datePickerDirective as any).datepicker;
            if (datepicker) {
              if (newValue && this.isValidDate(newValue)) {
                const date = this.parseDateString(newValue);
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
      
      // Otherwise, ignore writeValue during deletion to prevent restoring old values
      return;
    }
    
    // Normal writeValue handling (not during deletion)
    if (value !== undefined && value !== null) {
      // CRITICAL: If the value is the same as what we have, don't update
      // This prevents the datepicker directive from reformatting values we just typed
      if (this.value === value && this.dateInput?.nativeElement.value === value) {
        return;
      }
      
      // CRITICAL: If writeValue is being called with a value that's different from
      // what the user just typed (from the datepicker directive), check if it's
      // a valid date format. If it's the same date but different format, ignore it.
      // This prevents the directive from reformatting "12/12/2026" to something else
      if (this.value && value && this.isValidDate(this.value) && this.isValidDate(value)) {
        // Both are valid dates - check if they represent the same date
        const currentDate = this.parseDateString(this.value);
        const newDate = this.parseDateString(value);
        if (currentDate && newDate && currentDate.getTime() === newDate.getTime()) {
          // Same date, just different format - keep our current value
          return;
        }
      }
      
      this.value = value;
      // Format the value if it's not already formatted
      if (value && !value.includes('/')) {
        this.formatDateValue(value);
      } else if (this.dateInput) {
        this.dateInput.nativeElement.value = value;
      }
    } else {
      this.value = '';
      if (this.dateInput) {
        this.dateInput.nativeElement.value = '';
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
      // Get the BsDatepickerDirective from the BsDateFormatDirective
      let datepicker: BsDatepickerDirective | null = null;
      
      // Try from ViewChild first
      if (this.datePickerDirective) {
        try {
          datepicker = (this.datePickerDirective as any).bsDatepicker || 
                       (this.datePickerDirective as any).datepicker;
        } catch (e) {
          // Continue to try parameter
        }
      }
      
      // Fallback to parameter
      if (!datepicker && datepickerDirective) {
        try {
          datepicker = (datepickerDirective as any).bsDatepicker || 
                       (datepickerDirective as any).datepicker ||
                       datepickerDirective;
        } catch (e) {
          // Last resort - try calling toggle if available
          if (datepickerDirective && typeof datepickerDirective.toggle === 'function') {
            datepickerDirective.toggle();
            return;
          }
        }
      }
      
      // Open the datepicker
      if (datepicker && typeof datepicker.show === 'function') {
        try {
          datepicker.show();
        } catch (e) {
          console.warn('Error opening datepicker:', e);
        }
      }
    }
  }

  onDatePickerChange(event: any): void {
    // CRITICAL: Ignore datepicker changes during deletion or when we're updating from picker
    // The datepicker directive might fire events during deletion that try to restore values
    // Also ignore if we're already updating from picker to prevent circular updates
    if (this.isDeleting || this.isUpdatingFromPicker) {
      return; // Ignore all datepicker events during deletion or programmatic updates
    }
    
    // Handle different event formats:
    // - appBsDateFormat emits: { selectedDate: string, fieldName: string, dateString: Date }
    // - appBsDateFormatOpt emits: { date: Date, formatted: string, id: string, ... }
    let raw: any = null;
    
    if (this.isTime) {
      // appBsDateFormatOpt format
      raw = event?.date ?? event?.selectedDate ?? event;
    } else {
      // appBsDateFormat format
      raw = event?.dateString ?? event?.selectedDate ?? event;
    }
  
    // If cleared OR empty -> clear everything
    if (raw == null || raw === '') {
      this.hardClear();
      return;
    }
  
    this.isUpdatingFromPicker = true;
  
    let formattedDate = '';
  
    // Date object
    if (raw instanceof Date) {
      // guard invalid date
      if (isNaN(raw.getTime())) {
        this.isUpdatingFromPicker = false;
        this.hardClear();
        return;
      }
      formattedDate = this.formatDateFromPicker(raw);
    }
    // String - check if it's already formatted
    else if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) {
        this.isUpdatingFromPicker = false;
        this.hardClear();
        return;
      }
      // If it's already in the correct format, use it; otherwise try to parse
      if (this.isTime && s.length === 19 && s.includes(' ') && s.includes(':')) {
        formattedDate = s;
      } else if (!this.isTime && s.length === 10 && s.includes('/')) {
        formattedDate = s;
      } else {
        // Try to parse and reformat
        const date = this.parseDateString(s);
        if (date) {
          formattedDate = this.formatDateFromPicker(date);
        } else {
          formattedDate = s;
        }
      }
    }
    // appBsDateFormatOpt may emit formatted string in event.formatted
    else if (event?.formatted && typeof event.formatted === 'string') {
      formattedDate = event.formatted;
    }
    // Anything else -> treat as clear
    else {
      this.isUpdatingFromPicker = false;
      this.hardClear();
      return;
    }
  
    // Final guard
    if (!formattedDate) {
      this.isUpdatingFromPicker = false;
      this.hardClear();
      return;
    }
  
    // Update UI + form value
    this.value = formattedDate;
  
    if (this.dateInput?.nativeElement) {
      this.dateInput.nativeElement.value = formattedDate;
    }
  
    // If you have hiddenDatePicker reference, keep it in sync (recommended)
    if ((this as any).hiddenDatePicker?.nativeElement) {
      (this as any).hiddenDatePicker.nativeElement.value = formattedDate;
    }
  
    this.onChange(formattedDate);
    this.onTouched();

    this.isUpdatingFromPicker = false;
    this.validateDate();
    this.emitDateChange(formattedDate);
  }
  private setCursorPosition(input: HTMLInputElement, pos: number): void {
    try {
      input.setSelectionRange(pos, pos);
      return;
    } catch {}

    setTimeout(() => {
      try {
        input.setSelectionRange(pos, pos);
      } catch {}
    }, 0);
  }

  private formatDateFromPicker(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    if (this.isTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  }

  private parseDateString(dateString: string): Date | null {
    if (!dateString) {
      return null;
    }

    if (this.isTime) {
      // Parse datetime format: dd/MM/yyyy HH:mm:ss
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
    } else {
      // Parse date format: dd/MM/yyyy
      if (dateString.length !== 10) {
        return null;
      }

      const parts = dateString.split('/');
      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return null;
      }

      return new Date(year, month - 1, day);
    }
  }

  private validateDate(): void {
    // Reset error state
    this.showError = false;
    this.errorMessage = '';

    // If empty, no error (unless required, but that's handled by form validators)
    if (!this.value || this.value.trim() === '') {
      this.setFormControlError(null);
      return;
    }

    // Check if date format is complete
    const expectedLength = this.isTime ? 19 : 10;
    if (this.value.length !== expectedLength) {
      this.showError = true;
      this.errorMessage = this.isTime 
        ? 'Please enter a complete date and time in DD/MM/YYYY HH:mm:ss format'
        : 'Please enter a complete date in DD/MM/YYYY format';
      this.setFormControlError({ invalidDate: true });
      return;
    }

    // Check if date is valid
    if (!this.isValidDate(this.value)) {
      this.showError = true;
      this.errorMessage = 'Please enter a valid date';
      this.setFormControlError({ invalidDate: true });
      return;
    }

    // Enforce past/future restrictions if configured
    const parsed = this.parseDateString(this.value);
    if (parsed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const valueDate = new Date(parsed);
      valueDate.setHours(0, 0, 0, 0);

      const cfg = this.ControlTypeConfigurationId;
      const isPastOnly =
        cfg === DSControlTypeConfigurationGuid.AllowPastDateOnly ||
        cfg === DSControlTypeConfigurationGuid.AllowPastDateTimeOnly ||
        (this.isFromList && !this.isPastDate);
      const isFutureOnly =
        cfg === DSControlTypeConfigurationGuid.AllowFutureDateOnly ||
        cfg === DSControlTypeConfigurationGuid.AllowFutureDateTimeOnly ||
        this.isPastDate;
      const isCurrentOnly =
        cfg === DSControlTypeConfigurationGuid.AllowCurrentDate ||
        cfg === DSControlTypeConfigurationGuid.AllowCurrentDateTimeOnly;

      if (isPastOnly && valueDate > today) {
        this.showError = true;
        this.errorMessage = 'Future date is not allowed';
        this.setFormControlError({ invalidDate: true, futureDate: true });
        return;
      }
      if (isFutureOnly && valueDate < today) {
        this.showError = true;
        this.errorMessage = 'Past date is not allowed';
        this.setFormControlError({ invalidDate: true, pastDate: true });
        return;
      }
      if (isCurrentOnly && valueDate.getTime() !== today.getTime()) {
        this.showError = true;
        this.errorMessage = 'Only current date is allowed';
        this.setFormControlError({ invalidDate: true, currentDateOnly: true });
        return;
      }
    }

    // Date is valid, clear any errors
    this.setFormControlError(null);
  }

  private setFormControlError(error: any): void {
    // Set validation error on the form control if available
    if (this.ngControl && this.ngControl.control) {
      if (error) {
        this.ngControl.control.setErrors(error);
        this.ngControl.control.markAsTouched();
      } else {
        // Remove invalidDate error but keep other errors
        const currentErrors = this.ngControl.control.errors;
        if (currentErrors && currentErrors['invalidDate']) {
          delete currentErrors['invalidDate'];
          const hasOtherErrors = Object.keys(currentErrors).length > 0;
          this.ngControl.control.setErrors(hasOtherErrors ? currentErrors : null);
        }
      }
    }
  }
  private hardClear(): void {
    // Set flag to prevent datepicker directive from interfering during clear
    this.isUpdatingFromPicker = true;
    
    this.value = '';
  
    // clear visible input
    if (this.dateInput?.nativeElement) {
      this.dateInput.nativeElement.value = '';
    }
  
    // clear hidden datepicker-host input (important)
    if (this.hiddenDatePicker?.nativeElement) {
      this.hiddenDatePicker.nativeElement.value = '';
    }
  
    // clear datepicker internal value - CRITICAL to prevent it from restoring old values
    if (this.datePickerDirective) {
      try {
        const datepicker =
          (this.datePickerDirective as any).bsDatepicker ||
          (this.datePickerDirective as any).datepicker;
        if (datepicker) {
          datepicker.bsValue = null;
        }
      } catch {}
    }
  
    // Reset flags that might interfere with subsequent typing
    this.isDeleting = false;
    this.lastDeletedValue = '';
  
    // propagate empty - this will trigger directive's valueChanges, but we've set the flag
    this.onChange('');
    this.onTouched();
  
    // clear UI errors
    this.showError = false;
    this.errorMessage = '';
    this.setFormControlError(null);
    
    // Reset flag after a delay to allow clear to complete
    setTimeout(() => {
      this.isUpdatingFromPicker = false;
    }, 100);
  }
  
}














