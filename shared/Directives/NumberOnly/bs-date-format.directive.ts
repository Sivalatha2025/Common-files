import {
  Directive,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  AfterViewInit,
  inject,
  ViewChild,
  SimpleChanges,
  HostListener,
  ElementRef,
} from '@angular/core';
import { DatePipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  BsDatepickerDirective,
  BsDatepickerConfig,
} from 'ngx-bootstrap/datepicker';
import { filter, interval, Subscription, take, takeUntil, Subject } from 'rxjs';
import { NgControl } from '@angular/forms';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';

declare const changeDate: any; // if you're using this global

@Directive({
  selector: '[appBsDateFormat]',
  hostDirectives: [BsDatepickerDirective],
  exportAs: 'appBsDateFormat'
})
export class BsDateFormatDirective implements AfterViewInit, OnDestroy {
  private bsDatepicker = inject(BsDatepickerDirective);
  @Input() currentTime: boolean = false;
  @Input() format: string = 'dd/MM/yyyy';
  @Input() fieldName: string = '';
  @Input() isTime: boolean = false; // unsupported by ngx-bootstrap
  @Input() index: number | undefined;
  @Input() listName: string | undefined;
  @Input() isFromList: boolean = false;
  @Input() isPastDate: boolean = false;
  @Input() isPendingSheet: boolean = false;
  customClasses: any
  @Output() dateChange = new EventEmitter<any>();
  @Output() searchDateChanges = new EventEmitter<any>();
  @Input() bsValue: any = '';
  private bsValueSub?: Subscription;
  @ViewChild(BsDatepickerDirective, { static: false }) datepicker?: BsDatepickerDirective;
  @Input() ControlTypeConfigurationId  : string | undefined;
  private clearBtn?: HTMLButtonElement;
  private footerHost?: HTMLElement;

  DSControlTypeConfigurationGuid = DSControlTypeConfigurationGuid;

  checkControlSub!: Subscription;
  private destroy$ = new Subject<void>();
 private isUpdatingInternally = false;
  constructor(@Inject(PLATFORM_ID) private platformId: Object,private elRef: ElementRef , private datePipe: DatePipe, private ngControl: NgControl, @Inject(DOCUMENT) private doc: Document) { }
 
  ngAfterViewInit(): void {
  const inputElement = this.elRef.nativeElement as HTMLInputElement;
  if (isPlatformBrowser(this.platformId) && inputElement) {
    inputElement.setAttribute('readonly', 'true');
    inputElement.setAttribute('autocomplete', 'off');
  }
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.format?.toLowerCase() == 'd/m/y') {
      this.format = this.normalizeFormat(this.format);
    } else if (this.format?.toLowerCase() == 'd/m/y h:i:s') {
      this.format = this.normalizeFormat(this.format, this.isTime);
    }
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const config: Partial<BsDatepickerConfig> = {
      dateInputFormat: this.format || 'dd/MM/yyyy',
      showWeekNumbers: false,
      isAnimated: true,
      adaptivePosition: true,
      keepDatesOutOfRules: this.isPastDate,
      withTimepicker: this.isTime,
      keepDatepickerOpened: true,
      showClearButton: false,
      initCurrentTime: !this.isTime,
      customTodayClass: 'today-highlight',
      selectFromOtherMonth: true
    };

    
    if (this.ControlTypeConfigurationId) {
      switch (this.ControlTypeConfigurationId) {
        case DSControlTypeConfigurationGuid.AllowPastDateOnly:
          // Allow only past dates → disable future
         config.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateOnly:
          // Allow only future dates → disable past
         config.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDate:
          // Allow only current date → disable both past & future
         config.minDate = today;
         config.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowPastDateTimeOnly:
          // Same as past date only, but for datetime
         config.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateTimeOnly:
          // Same as future date only, but for datetime
         config.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDateTimeOnly:
          // Only current datetime allowed
         config.minDate = today;
         config.maxDate = today;
          break;

        default:
          // Others → no restriction
         config.minDate = undefined;
         config.maxDate = undefined;
          break;
      }
    } else {

      if (this.isFromList && !this.isPastDate) {
        config.maxDate = this.isPendingSheet ? yesterday : today;
      } else if (!this.isFromList && this.isPastDate) {
        config.minDate = today;
      }
    }

    this.bsDatepicker.bsConfig = config;

    if (this.bsDatepicker.onShown) {
      this.bsDatepicker.onShown.subscribe(() => {
        this.injectFooter();
      });
    }

    if (this.bsDatepicker.onHidden) {
      this.bsDatepicker.onHidden.subscribe(() => {
        this.removeFooter();
      });
    }


    this.checkControlSub = interval(100)
      .pipe(
        filter(() => !!this.ngControl?.control),
        take(1)
      )
      .subscribe(() => {
        const control = this.ngControl.control;
        if (control?.value) {
          const parsedDate = this.parseCustomDate(control?.value);
          if (
              !this.bsDatepicker.bsValue ||
              (parsedDate.getTime() !== this.bsDatepicker.bsValue.getTime())
            ) {
            this.bsDatepicker.bsValue = parsedDate;
            }
        }

        control?.valueChanges.subscribe(val => {
          if (val  && !this.isUpdatingInternally) {
            // Check if the value is a valid date string before parsing
            // Invalid dates should not be assigned to bsDatepicker.bsValue
            // as it will trigger bsValueChange and cause issues
            if (this.isValidDateString(val)) {
              const parsedDate = this.parseCustomDate(val);
              // Additional check: ensure parsedDate is valid
              if (parsedDate && !isNaN(parsedDate.getTime())) {
                if (
                  !this.bsDatepicker.bsValue ||
                  (parsedDate.getTime() !== this.bsDatepicker.bsValue.getTime())
                ) {
                  this.bsDatepicker.bsValue = parsedDate;
                }
              }
              // If invalid parsed date, don't update bsValue - keep current value
              // This prevents triggering bsValueChange with invalid dates
              // and allows user to continue typing
            }
            // If invalid date string, don't update bsValue - keep current value
            // This allows user to continue typing without the datepicker interfering
            // We don't set it to undefined because that would trigger bsValueChange
            // and clear the input
          } else if (!val && !this.isUpdatingInternally) {
            // Value is empty - only clear if we have a value set
            // This prevents unnecessary updates when user is deleting
            // But we need to be careful - setting to undefined triggers bsValueChange
            // So we only clear if the value is actually empty and we had a date before
            if (this.bsDatepicker.bsValue) {
              // Temporarily set flag to prevent bsValueChange from clearing
              this.isUpdatingInternally = true;
              this.bsDatepicker.bsValue = undefined;
              // Reset flag after a short delay
              this.isUpdatingInternally = false;
            }
          }

        });
      });

    this.bsValueSub = this.bsDatepicker.bsValueChange.subscribe((selectedDate: Date | null | undefined) => {
      // Handle clear button (null) explicitly
      if (selectedDate === null) {
        const control = this.ngControl?.control;
        control?.setValue('');
        control?.setErrors(null);
        control?.markAsPristine();
        control?.markAsUntouched();
        control?.updateValueAndValidity();
        this.searchDateChanges.emit({
          selectedDate: '',
          fieldName: this.fieldName,
          dateString: null,
          index: this.index,
          listName: this.listName,
        });
        return;
      }

      // CRITICAL: Ignore undefined/invalid values to prevent clearing the input while user is typing
      if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        if (this.isUpdatingInternally) {
          return;
        }
        const inputValue = ((this as any).elRef?.nativeElement as HTMLInputElement)?.value || '';
        if (!inputValue) {
          const control = this.ngControl?.control;
          control?.setValue('');
          control?.setErrors(null);
          control?.markAsPristine();
          control?.markAsUntouched();
          control?.updateValueAndValidity();
          this.searchDateChanges.emit({
            selectedDate: '',
            fieldName: this.fieldName,
            dateString: null,
            index: this.index,
            listName: this.listName,
          });
        }
        return;
      }

      this.isUpdatingInternally = true;
      const formattedValue = this.datePipe.transform(selectedDate, this.format) as string;

      this.dateChange.emit({ date: selectedDate, id: this.fieldName });

      if (typeof changeDate === 'function') {
        changeDate(
          formattedValue,
          this.fieldName,
          selectedDate,
          this.index,
          this.listName
        );
      }

      this.searchDateChanges.emit({
        selectedDate: formattedValue,
        fieldName: this.fieldName,
        dateString: selectedDate,
        index: this.index,
        listName: this.listName,
      });

      this.ngControl?.control?.setValue(formattedValue);
      this.isUpdatingInternally = false;

    });

  }

  parseCustomDate(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    if (this.isTime) {
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    } else {
      return new Date(year, month - 1, day);
    }

  }

  private isValidDateString(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') {
      return false;
    }

    // Check if it matches dd/MM/yyyy format (10 characters)
    if (dateStr.length !== 10) {
      return false;
    }

    const parts = dateStr.split('/');
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

  toggle() {
    this.bsDatepicker.toggle();
  }
  private normalizeFormat(format: string, isTime?: boolean): string {
    let normalized = format.toLowerCase();
    normalized = normalized.replace(/d{1,2}/g, 'dd');
    normalized = normalized.replace(/m{1,2}/g, 'MM');
    normalized = normalized.replace(/y{1,4}/g, 'yyyy');

    normalized = normalized.replace(/h{1,2}/g, 'HH');
    normalized = normalized.replace(/i/g, 'mm');
    normalized = normalized.replace(/s{1,2}/g, 'ss');
    return normalized;
  }
  ngOnDestroy(): void {
    if (this.bsValueSub) {
      this.bsValueSub.unsubscribe();
    }
    if (isPlatformBrowser(this.platformId)) {
      this.bsDatepicker.hide();
    }
    if (this.checkControlSub) {
      this.checkControlSub.unsubscribe(); // cleanup
    }
    this.removeFooter();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      return;
    }
    event.preventDefault();
  }

  private injectFooter(): void {
    if (this.footerHost) {
      return;
    }
    const container =
      this.doc.querySelector('bs-datepicker-container .bs-datepicker') ||
      this.doc.querySelector('.bs-datepicker-container .bs-datepicker') ||
      this.doc.querySelector('.bs-datepicker-container');
    if (!container) {
      return;
    }

    const containerHost = (container.closest('.bs-datepicker-container') as HTMLElement) || (container as HTMLElement);
    containerHost.style.marginTop = '0px';
    containerHost.style.paddingTop = '0px';
    const host = this.doc.createElement('div');
    host.className = 'bs-datepicker-buttons';

    const wrapper = this.doc.createElement('div');
    wrapper.className = 'btn-clear-wrapper clear-right';

    const clr = this.doc.createElement('button');
    clr.type = 'button';
    clr.textContent = 'Clear';
    clr.className = 'btn btn-success';
    clr.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearValue();
      this.bsDatepicker.hide();
    });

    wrapper.appendChild(clr);
    host.appendChild(wrapper);
    container.appendChild(host);
    this.footerHost = host as HTMLElement;
    this.clearBtn = clr as HTMLButtonElement;
  }

  private removeFooter(): void {
    if (this.clearBtn) {
      try { this.clearBtn.onclick = null; } catch {}
      this.clearBtn = undefined;
    }
    if (this.footerHost?.parentElement) {
      this.footerHost.parentElement.removeChild(this.footerHost);
    }
    this.footerHost = undefined;
  }

  private clearValue(): void {
    if (this.isUpdatingInternally) {
      return;
    }
    this.isUpdatingInternally = true;
    try {
      this.bsDatepicker.bsValue = undefined as any;
    } catch {}
    const input = this.elRef.nativeElement as HTMLInputElement;
    input.value = '';
    const control = this.ngControl?.control;
    control?.setValue('');
    control?.setErrors(null);
    control?.markAsPristine();
    control?.markAsUntouched();
    control?.updateValueAndValidity();
    this.searchDateChanges.emit({
      selectedDate: '',
      fieldName: this.fieldName,
      dateString: null,
      index: this.index,
      listName: this.listName,
    });
    this.isUpdatingInternally = false;
  }

}











