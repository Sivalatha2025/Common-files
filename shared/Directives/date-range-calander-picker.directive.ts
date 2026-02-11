import { DatePipe } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, EventEmitter, inject, Input, Output, ViewChild, HostListener, OnInit, SimpleChanges } from '@angular/core';
import { BsDatepickerConfig, BsDatepickerDirective, BsDaterangepickerDirective } from 'ngx-bootstrap/datepicker';
import { Subscription } from 'rxjs';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';

export interface IRange {
  value: Date[];
  label: string;
}

@Directive({
  selector: '[appDateRangeCalanderPicker]',
  hostDirectives: [BsDaterangepickerDirective],
  exportAs: 'appDateRangeCalanderPicker'
})
export class DateRangeCalanderPickerDirective implements AfterViewInit, OnInit {
  private bsDatepicker = inject(BsDaterangepickerDirective);

  @Input() format: string = 'dd/MM/YYYY';
  @Input() fieldName: string = '';
  @Input() isTime: boolean = false; // unsupported by ngx-bootstrap
  @Input() index: number | undefined;
  @Input() listName: string | undefined;
  @Input() isFromList: boolean = false;
  @Input() isPastDate: boolean = false;
  @Input() isPendingSheet: boolean = false;
  @Input() dateInputFormat: string | undefined;
  @Input() rangeInputFormat: string | undefined;
  @Input() ControlTypeConfigurationId  : string | undefined;
  @Input() useCombinedFormat: boolean = false;
  @Output() dateChange = new EventEmitter<any>();
  @Output() searchDateChanges = new EventEmitter<any>();
  private bsValueSub?: Subscription;
  @ViewChild(BsDaterangepickerDirective, { static: false }) datepicker!: BsDaterangepickerDirective;
  selectedFY: any = new Date().getFullYear();
  selectedRange: any;
  @Input() minYear = 2023;
  @Input() selectedFinancialYear = '';
  @Input() DSControlTypeConfigurationGuid : any;
  selectedRangeLabel: string = '';

  // DSControlTypeConfigurationGuid = DSControlTypeConfigurationGuid;

  ranges: IRange[] = [
    {
      value: [new Date(this.selectedFY, 0, 1), new Date(this.selectedFY, 0, 1)], // Jan 1, 2000
      label: 'Monthly'
    },
    {
      value: [new Date(this.selectedFY, 1, 1), new Date(this.selectedFY, 1, 1)], // Jan 1, 2000
      label: 'Quarterly'
    },
    {
      value: [new Date(2000, 0, 1), new Date(2000, 0, 1)], // Jan 1, 2000
      label: 'Half Yearly'
    },
    {
      value: [new Date(1999, 11, 31), new Date(1999, 11, 31)], // Dec 31, 1999
      label: 'Financial Yearly'
    },
    {
      value: [new Date(this.selectedFY, 3, 1), new Date(this.selectedFY, 3, 1)],
      label: 'Custom Range'
    }
  ];
  @Input() customRanges: IRange[] = [];
  @Input() isShowInitialDate:boolean = true; 

  bsConfig: Partial<BsDatepickerConfig> = {};


  constructor(private datePipe: DatePipe, private el: ElementRef) { }

  ngOnInit(): void {
    
    this.bsConfig = {
      ranges: this.customRanges.length > 0 ? this.customRanges : this.ranges,
      keepDatepickerOpened: true,
      isAnimated: true,
      adaptivePosition: true,
  
      dateInputFormat: this.dateInputFormat
        ? this.dateInputFormat
        : this.isTime
          ? 'DD/MM/YYYY HH:mm'
          : 'DD/MM/YYYY',
  
      // rangeInputFormat: this.rangeInputFormat
      //   ? this.rangeInputFormat
      //   : this.isTime
      //     ? 'DD/MM/YYYY HH:mm'
      //     : 'DD/MM/YYYY',
  
      containerClass: 'custom-datepicker-container',
      showWeekNumbers: false,
      withTimepicker: this.isTime,
    };

    const today = new Date();

    if (this.ControlTypeConfigurationId) {
      switch (this.ControlTypeConfigurationId) {
        case DSControlTypeConfigurationGuid.AllowPastDateOnly:
          // Allow only past dates → disable future
          this.bsConfig.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateOnly:
          // Allow only future dates → disable past
          this.bsConfig.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDate:
          // Allow only current date → disable both past & future
          this.bsConfig.minDate = today;
          this.bsConfig.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowPastDateTimeOnly:
          // Same as past date only, but for datetime
          this.bsConfig.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateTimeOnly:
          // Same as future date only, but for datetime
          this.bsConfig.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDateTimeOnly:
          // Only current datetime allowed
          this.bsConfig.minDate = today;
          this.bsConfig.maxDate = today;
          break;

        default:
          // Others → no restriction
          this.bsConfig.minDate = undefined;
          this.bsConfig.maxDate = undefined;
          break;
      }
    } else {
      // Disable future dates
      if (this.isFromList) {
        this.bsConfig.maxDate = today;
      }
      // Disable past dates
      if (this.isPastDate) {
        this.bsConfig.minDate = today;
      }
    }


    
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      this.useCombinedFormat &&
      changes['selectedFinancialYear'] &&
      this.selectedFinancialYear
    ) {
      const value = this.selectedFinancialYear;
  
      if (typeof value === 'string' && value.includes(',')) {
        const [startStr, endStr] = value.split(',');
  
        const start = this.parseDate(startStr.trim());
        const end = this.parseDate(endStr.trim());
  
        if (start && end) {
          this.selectedRange = [start, end];                // store range internally
          this.bsDatepicker.bsValue = this.selectedRange;   // update the calendar UI
        }
      }
    }
  }
  
  
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
  
    // If format is "dd/MM/yyyy HH:mm"
    let [datePart, timePart] = dateStr.split(' ');
  
    // Parse date part
    const [day, month, year] = datePart.split('/').map(Number);
    if (!day || !month || !year) return null;
  
    // Default time values
    let hours = 0;
    let minutes = 0;
  
    // If time exists, parse it
    if (timePart) {
      const [h, m] = timePart.split(':').map(Number);
      hours = isNaN(h) ? 0 : h;
      minutes = isNaN(m) ? 0 : m;
    }
  
    return new Date(year, month - 1, day, hours, minutes);
  }
  
  ngAfterViewInit(): void {

    setTimeout(() => {
      this.bsDatepicker.bsConfig = this.bsConfig;
      this.bsDatepicker.setConfig();
    });

    this.bsDatepicker.container = 'body'
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Get first day of current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get last day of current month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let formattedFromDate = this.datePipe.transform(firstDay, 'dd/MM/yyyy')
    let formattedEndDate = this.datePipe.transform(lastDay, 'dd/MM/yyyy')

    if (this.isShowInitialDate) {
      if (this.useCombinedFormat) {
  // Emit combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
  const combinedStart = this.datePipe.transform(firstDay, 'dd/MM/yyyy');
  const combinedEnd = this.datePipe.transform(lastDay, 'dd/MM/yyyy');
        const combinedValue = `${combinedStart},${combinedEnd}`;
        
        this.dateChange.emit({
          dateRange: combinedValue,
          id: this.fieldName
        });
      } else {
        this.dateChange.emit({
          FromDate: formattedFromDate,
          ToDate: formattedEndDate,
          id: this.fieldName
        });
      }
    }
    
    this.bsConfig.ranges = this.customRanges && this.customRanges.length > 0 ? this.customRanges : this.ranges;
    this.bsDatepicker.bsConfig = this.bsConfig;
    //  this.bsDatepicker.show();

    this.bsValueSub = this.bsDatepicker.bsValueChange.subscribe((selectedDate: Date) => {
      const formattedValue = '' as string;

      // this.dateChange.emit({ date: selectedDate, id: this.fieldName });
      this.onRangeSelected(selectedDate)
    });

    this.bsDatepicker.onShown.subscribe((event: any) => {
      if (this.customRanges && this.customRanges.length > 0 && !this.selectedRangeLabel) {   // if custom ranges are there, while opening og the pop up, it will display oth index label.
        this.selectedRangeLabel = this.customRanges[0].label
      }
      if (this.selectedRangeLabel == 'Financial Yearly') {
        this.selectedRange = []
        this.appendFinancialYearUI()
      } else if (this.selectedRangeLabel == 'Half Yearly') {
        this.selectedRange = []
        this.appendHalfYearlyUI()
      } else if (this.selectedRangeLabel == 'Quarterly') {
        this.selectedRange = [];
        this.appendQuarterlyUI()
      } else if (this.selectedRangeLabel == 'Monthly') {
        this.selectedRange = [];
        this.appendMonthlyUI()
      }
    })
  }
  
  toggle(){
    this.bsDatepicker.toggle();
  }

  onRangeSelected(value: any | undefined) {
    // Prevent execution if value is undefined or empty
    if (!value || !Array.isArray(value) || value.length === 0) return;
    const label = this.getSelectedRangeLabel(value);
    this.selectedRangeLabel = this.getSelectedRangeLabel(value);
    if (this.selectedRangeLabel == 'Financial Yearly') {
      this.selectedRange = []
      this.appendFinancialYearUI()
    } else if (this.selectedRangeLabel == 'Half Yearly') {
      this.selectedRange = []
      this.appendHalfYearlyUI()
    } else if (this.selectedRangeLabel == 'Quarterly') {
      this.selectedRange = [];
      this.appendQuarterlyUI()
    } else if (this.selectedRangeLabel == 'Monthly') {
      this.selectedRange = [];
      this.appendMonthlyUI()
    } else if (this.selectedRangeLabel == 'Custom Range') {
      setTimeout(() => {
        this.bsDatepicker.show()
        setTimeout(() => {
          const media = document.querySelector('.bs-media-container') as HTMLElement;
          if (media) media.style.display = '';
          const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
          if (picker) picker.classList.remove('show-financial-ui');
        });
      });
    }
    else {
      const media = document.querySelector('.bs-media-container') as HTMLElement;
      if (media) media.style.display = 'block';
      const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
      if (picker) picker.classList.remove('show-financial-ui');


      // Extract and format selected range from value
      const [startDate, endDate] = value;

      // this.selectedRange = [startDate, endDate]; // update the model

      const format = this.isTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
      const formattedStart = this.datePipe.transform(startDate, format);
      const formattedEnd = this.datePipe.transform(endDate, format);

      if (this.useCombinedFormat) {
  // Emit combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
  const combinedFormat = this.isTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
        const combinedStart = this.datePipe.transform(startDate, combinedFormat);
        const combinedEnd = this.datePipe.transform(endDate, combinedFormat);
        const combinedValue = `${combinedStart},${combinedEnd}`;
        
        this.dateChange.emit({
          dateRange: combinedValue,
          id: this.fieldName
        });
      } else {
        // Emit separate FromDate/ToDate format
        this.dateChange.emit({
          FromDate: formattedStart,
          ToDate: formattedEnd,
          id: this.fieldName
        });
      }


      // this.searchForm.get('FromDate')?.setValue(formattedStart);
      // this.searchForm.get('ToDate')?.setValue(formattedEnd);
    }
  }

  appendFinancialYearUI() {
    setTimeout(() => {
      this.bsDatepicker.show()
      setTimeout(() => {
        const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
        if (!picker) return;

        const media = document.querySelector('.bs-media-container') as HTMLElement;
        if (media) media.style.display = 'none';

        let currentYear = new Date().getFullYear();
        let startYear = this.minYear;

        let fyPickerHtml = `<div class="financial-year-picker">`;

        for (let year = startYear; year <= currentYear; year++) {
          let nextYear = year + 1;
          fyPickerHtml += `<button class="btn btn-primary fy-btn rangeCalender_btn" style="width:100px;height:30px;font-weight: inherit" data-year="${year}">${year} - ${nextYear}</button>`;
        }

        fyPickerHtml += `</div>`;
        picker.innerHTML = fyPickerHtml;

        // Add event listeners to each financial year button
        setTimeout(() => {
          const buttons = document.querySelectorAll('.fy-btn');
          buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
              const year = parseInt((btn as HTMLElement).getAttribute('data-year')!, 10);
              const start = new Date(year, 3, 1);    // April 1
              const end = new Date(year + 1, 2, 31); // March 31
              this.selectedRange = [start, end];
              let formattedFromDate = this.datePipe.transform(start, 'dd/MM/yyyy')
              let formattedEndDate = this.datePipe.transform(end, 'dd/MM/yyyy')

              if (this.useCombinedFormat) {
                // Emit combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
                const combinedStart = this.datePipe.transform(start, 'dd/MM/yyyy');
                const combinedEnd = this.datePipe.transform(end, 'dd/MM/yyyy');
                const combinedValue = `${combinedStart},${combinedEnd}`;
                
                this.dateChange.emit({
                  dateRange: combinedValue,
                  id: this.fieldName
                });
              } else {
                this.dateChange.emit({
                  FromDate: formattedFromDate,
                  ToDate: formattedEndDate,
                  id: this.fieldName
                });
              }

              this.bsDatepicker.hide();
            });
          });
        });
      }, 10);
    });
  }
  appendHalfYearlyUI() {
    setTimeout(() => {
      this.bsDatepicker.show();


      setTimeout(() => {
        const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
        if (!picker) return;

        const media = document.querySelector('.bs-media-container') as HTMLElement;
        if (media) media.style.display = 'none';

        const currentDate = new Date();

        // Determine selected financial year or fallback
        let startDate: Date;
        let fromDate: any = this.selectedFinancialYear

        if (fromDate) {
          const [day, month, year] = fromDate.split('/');
          const date = new Date(Number(year), Number(month) - 1, Number(day));
          startDate = date; // Use selected financial year's start date
        } else {
          const currentYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
          startDate = new Date(currentYear, 3, 1); // April 1 of current FY
        }


        const fyStartYear = this.getFinancialYear(startDate)

        const fyPickerHtml = `
          <div class="half-year-picker" style="">
            <button class="btn btn-primary half-year-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-hy="1">H1 (Apr - Sep)</button>
            <button class="btn btn-primary half-year-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-hy="2">H2 (Oct - Mar)</button>
          </div>`;
        picker.innerHTML = fyPickerHtml;

        setTimeout(() => {
          const buttons = document.querySelectorAll('.half-year-btn');
          buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
              const half = (btn as HTMLElement).getAttribute('data-hy');

              let start: Date;
              let end: Date;

              if (half === '1') {
                // H1: Apr 1 to Sep 30
                start = new Date(fyStartYear, 3, 1); // April 1
                end = new Date(fyStartYear, 8, 30);  // Sep 30
              } else {
                // H2: Oct 1 to Mar 31 (next year)
                start = new Date(fyStartYear, 9, 1);   // Oct 1
                end = new Date(fyStartYear + 1, 2, 31); // Mar 31
              }

              this.selectedRange = [start, end];


              const formattedFromDate = this.datePipe.transform(start, 'dd/MM/yyyy');
              const formattedEndDate = this.datePipe.transform(end, 'dd/MM/yyyy');

              if (this.useCombinedFormat) {
                // Emit combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
                const combinedStart = this.datePipe.transform(start, 'dd/MM/yyyy');
                const combinedEnd = this.datePipe.transform(end, 'dd/MM/yyyy');
                const combinedValue = `${combinedStart},${combinedEnd}`;
                
                this.dateChange.emit({
                  dateRange: combinedValue,
                  id: this.fieldName
                });
              } else {
                this.dateChange.emit({
                  FromDate: formattedFromDate,
                  ToDate: formattedEndDate,
                  id: this.fieldName
                });
              }

              this.bsDatepicker.hide();
            });
          });
        });
      }, 10);
    });
  }
  appendQuarterlyUI() {
    setTimeout(() => {
      this.bsDatepicker.show();

      setTimeout(() => {
        const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
        if (!picker) return;

        const media = document.querySelector('.bs-media-container') as HTMLElement;
        if (media) media.style.display = 'none';

        const currentDate = new Date();
        let startDate: Date;

        const fromDate = this.selectedFinancialYear;
        if (fromDate) {
          const [day, month, year] = fromDate.split('/');
          startDate = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
          const fyStartYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
          startDate = new Date(fyStartYear, 3, 1); // April 1
        }

        const fyStartYear = this.getFinancialYear(startDate);

        const fyPickerHtml = `
          <div class="quarter-picker">
            <button class="btn btn-primary quarter-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-q="1">Q1 (Apr - Jun)</button>
            <button class="btn btn-primary quarter-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-q="2">Q2 (Jul - Sep)</button>
            <button class="btn btn-primary quarter-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-q="3">Q3 (Oct - Dec)</button>
            <button class="btn btn-primary quarter-btn rangeCalender_btn" style="width:100px;height:100%;font-weight: inherit" data-q="4">Q4 (Jan - Mar)</button>
          </div>
        `;

        picker.innerHTML = fyPickerHtml;

        setTimeout(() => {
          const buttons = document.querySelectorAll('.quarter-btn');
          buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
              const quarter = (btn as HTMLElement).getAttribute('data-q');
              let start: Date;
              let end: Date;

              switch (quarter) {
                case '1':
                  start = new Date(fyStartYear, 3, 1);  // Apr 1
                  end = new Date(fyStartYear, 5, 30);   // Jun 30
                  break;
                case '2':
                  start = new Date(fyStartYear, 6, 1);  // Jul 1
                  end = new Date(fyStartYear, 8, 30);   // Sep 30
                  break;
                case '3':
                  start = new Date(fyStartYear, 9, 1);  // Oct 1
                  end = new Date(fyStartYear, 11, 31);  // Dec 31
                  break;
                case '4':
                  start = new Date(fyStartYear + 1, 0, 1);  // Jan 1 next year
                  end = new Date(fyStartYear + 1, 2, 31);   // Mar 31 next year
                  break;
                default:
                  return;
              }

              this.selectedRange = [start, end];

              const formattedFromDate = this.datePipe.transform(start, 'dd/MM/yyyy');
              const formattedEndDate = this.datePipe.transform(end, 'dd/MM/yyyy');

              if (this.useCombinedFormat) {
                // Emit combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
                const combinedStart = this.datePipe.transform(start, 'dd/MM/yyyy');
                const combinedEnd = this.datePipe.transform(end, 'dd/MM/yyyy');
                const combinedValue = `${combinedStart},${combinedEnd}`;
                
                this.dateChange.emit({
                  dateRange: combinedValue,
                  id: this.fieldName
                });
              } else {
                this.dateChange.emit({
                  FromDate: formattedFromDate,
                  ToDate: formattedEndDate,
                  id: this.fieldName
                });
              }

              this.bsDatepicker.hide();
            });
          });
        });
      }, 10);
    });
  }
  appendMonthlyUI() {
    setTimeout(() => {
      this.bsDatepicker.show();

      setTimeout(() => {
        const picker = document.querySelector('.bs-calendar-container') as HTMLElement;
        if (!picker) return;

        const media = document.querySelector('.bs-media-container') as HTMLElement;
        if (media) media.style.display = 'none';

        const currentDate = new Date();
        let startDate: Date;

        const fromDate = this.selectedFinancialYear;
        if (fromDate) {
          const [day, month, year] = fromDate.split('/');
          startDate = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
          const fyStartYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
          startDate = new Date(fyStartYear, 3, 1); // April 1
        }

        const fyStartYear = this.getFinancialYear(startDate);

        let monthPickerHtml = `
          <div class="month-picker">
        `;

        const monthOrder = [
          { month: 3, label: 'April' },
          { month: 4, label: 'May' },
          { month: 5, label: 'June' },
          { month: 6, label: 'July' },
          { month: 7, label: 'August' },
          { month: 8, label: 'September' },
          { month: 9, label: 'October' },
          { month: 10, label: 'November' },
          { month: 11, label: 'December' },
          { month: 0, label: 'January' },
          { month: 1, label: 'February' },
          { month: 2, label: 'March' }
        ];

        monthOrder.forEach((m) => {
          monthPickerHtml += `
            <button class="btn btn-primary month-btn rangeCalender_btn" style="width:85px;height:30px;font-weight: inherit" data-month="${m.month}">${m.label}</button>
          `;
        });

        monthPickerHtml += `</div>`;
        picker.innerHTML = monthPickerHtml;

        setTimeout(() => {
          const buttons = document.querySelectorAll('.month-btn');
          buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
              const month = parseInt((btn as HTMLElement).getAttribute('data-month')!, 10);

              // Determine year: Jan/Feb/Mar belong to next calendar year in FY
              const year = month >= 3 ? fyStartYear : fyStartYear + 1;

              const start = new Date(year, month, 1);
              const end = new Date(year, month + 1, 0); // Last day of selected month

              this.selectedRange = [start, end];

              const formattedFromDate = this.datePipe.transform(start, 'dd/MM/yyyy');
              const formattedEndDate = this.datePipe.transform(end, 'dd/MM/yyyy');

              if (this.useCombinedFormat) {
                // Emit combined format: "dd-mm-yyyy,dd-mm-yyyy"
                const combinedStart = this.datePipe.transform(start, 'dd-MM-yyyy');
                const combinedEnd = this.datePipe.transform(end, 'dd-MM-yyyy');
                const combinedValue = `${combinedStart},${combinedEnd}`;
                
                this.dateChange.emit({
                  dateRange: combinedValue,
                  id: this.fieldName
                });
              } else {
                this.dateChange.emit({
                  FromDate: formattedFromDate,
                  ToDate: formattedEndDate,
                  id: this.fieldName
                });
              }

              this.bsDatepicker.hide();
            });
          });
        });
      },);
    });
  }



  getSelectedRangeLabel(value: Date[]): string {
    for (const range of this.ranges) {
      if (
        range.value[0]?.toDateString() === value[0]?.toDateString() &&
        range.value[1]?.toDateString() === value[1]?.toDateString()
      ) {
        return range.label;
      }
    }
    return '';
  }

  ngOnDestroy(): void {
    if (this.bsValueSub) {
      this.bsValueSub.unsubscribe();
    }

  }

    getFinancialYear(date: Date): number {
    const month = date.getMonth(); // Jan=0, Apr=3
    const year = date.getFullYear();
    return month < 3 ? year - 1 : year;
  };

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      return;
    }
    event.preventDefault();
  }





}


