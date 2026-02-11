import { AfterContentInit, Component, OnInit } from '@angular/core';
declare var $: any;
import * as moment from 'moment';
import { isPlatformBrowser } from '@angular/common';
import { JsonFormControls } from 'src/app/components/add-page/schema.model';
import { DynamicSearchCardComponent } from '../dynamic-search-card/dynamic-search-card.component';

@Component({
  selector: 'app-extendaned-dynamic-search-card',
  templateUrl: './extendaned-dynamic-search-card.component.html',
  styleUrls: ['./extendaned-dynamic-search-card.component.css']
})
export class ExtendanedDynamicSearchCardComponent extends DynamicSearchCardComponent implements AfterContentInit {

  dateYear = new Date().getFullYear

  calendarConfig = {
    startDate: moment().startOf('month'),
    endDate: moment().endOf('month'),
    opens: 'right',
    showCustomRangeLabel: true,
    alwaysShowCalendars: true,
    autoUpdateInput: false,
    applyButtonClasses: 'clendr_apply_btn',
    cancelButtonClasses: 'clendr_cancel_btn',
    ranges: {
      'Quarterly': [],
      'Monthly': [],
      'Half Yearly': [],
    },
    locale: {
      format: 'DD/MM/YYYY',
      separator: ' - ',
      applyLabel: 'APPLY',
      cancelLabel: 'CANCEL',
    },
  }

  ngAfterContentInit(): void {
    
    setTimeout(() => {
      
      if (isPlatformBrowser(this.platformId)) {
        $('#dashboardCalender').daterangepicker(
          {
            startDate: moment().startOf('month'),
            endDate: moment().endOf('month'),
            opens: 'right',
            showCustomRangeLabel: true,
            alwaysShowCalendars: true,
            autoUpdateInput: false,
            applyButtonClasses: 'clendr_apply_btn',
            cancelButtonClasses: 'clendr_cancel_btn',
            ranges: {
              'Quarterly': [],
              'Monthly': [],
              'Half Yearly': [],
            },
            locale: {
              format: 'DD/MM/YYYY',
              separator: ' - ',
              applyLabel: 'APPLY',
              cancelLabel: 'CANCEL',
            },
          }
          ,
          (start: any, end: any, label: string) => {
            
            let date = new Date();
            let year = date.getFullYear()
            if (label === 'Quarterly') {
              this.showQuarterSelection(year);
              setTimeout(() => {
                $('.daterangepicker').show() // 🔹 Keep the picker open
              }, 10);
            }
            else if (label === 'Monthly') {
              this.showMonthSelection(year); // Call function to show months
              setTimeout(() => {
                $('.daterangepicker').show(); // Keep the picker open
              }, 10);
            } else if (label === 'Half Yearly') {
              this.showHalfYearSelection(year); // ➡️ Handle Half-Year Selection
              setTimeout(() => {
                $('.daterangepicker').show();
              }, 10);
            }else {
              $('.daterangepicker .month-picker, .daterangepicker .quarter-picker,.daterangepicker .half-year-picker').remove();
              $('.daterangepicker .drp-calendar').show();
              let fromDate = start.format('DD/MM/YYYY')
              let toDate = end.format('DD/MM/YYYY')
              $('#dashboardCalender').val(fromDate + ' - ' + toDate);
              this.searchForm.get("FromDate")?.setValue(fromDate);
              this.searchForm.get("ToDate")?.setValue(toDate);

              if(label?.toLowerCase() == 'custom range'){
                $('.ranges ul li').removeClass('active');
                $('.ranges ul li[data-range-key="Custom Range"]').addClass('active');

              }

              if (label?.toLowerCase() == 'apply') {
                $('.daterangepicker').hide();
              }
            }
          }
        );
      }
    }, 1500);
  }

  override onDropDownChange(parentfield: JsonFormControls, editDetails?: any): void {
    super.onDropDownChange(parentfield, editDetails);
    // ✅ Completely destroy the existing datepicker before reinitializing
    if ($('#dashboardCalender').data('daterangepicker')) {
      $('#dashboardCalender').data('daterangepicker').remove();
      $('#dashboardCalender').off(); // Remove old event listeners
    }
    $('#dashboardCalender').val('');
    let yearItem = this.searchForm.get('Code')?.value;
    let year: number = 0;
    if (yearItem) {
      let yearObj = this.mastersObject['Code']?.find((x: any) => x.Id == yearItem);
      year = yearObj && yearObj.Name ? Number(yearObj.Name) : 0
      let minDate = moment(`${year}-04-01`);
      let maxDate = moment(`${year + 1}-03-31`)
      this.searchForm.get('FromDate')?.setValue(`01/04/${year}`);
      this.searchForm.get('ToDate')?.setValue(`31/03/${year + 1}`);
      $('#dashboardCalender').daterangepicker(
        {
          startDate: minDate,
          endDate: maxDate,
          minDate: minDate,
          maxDae: maxDate,
          ranges: {
            'Quarterly': [],
            'Monthly': [],
            'Half Yearly': [],
          },
          locale: {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: 'APPLY',
            cancelLabel: 'CANCEL',
          },
        },
        (start: any, end: any, label: string) => {
          
          let fromDate,toDate;
            if(this.searchForm.get('FromDate')?.value && this.searchForm.get('ToDate')?.value){
              fromDate = moment(this.searchForm.get('FromDate')?.value,'DD/MM/YYYY').format('DD/MM/YYYY');
              toDate = moment(this.searchForm.get('ToDate')?.value, 'DD/MM/YYYY').format('DD/MM/YYYY');
              $('#dashboardCalender').val(fromDate + ' - ' + toDate);
              this.searchForm.get("FromDate")?.setValue(fromDate);
              this.searchForm.get("ToDate")?.setValue(toDate);
            }
          if (label === 'Quarterly') {
            this.showQuarterSelection(year);
            setTimeout(() => {
              $('.daterangepicker').show() // 🔹 Keep the picker open
            }, 10);
          } else if (label === 'Monthly') {
            this.showMonthSelection(year); // Call function to show months
            setTimeout(() => {
              $('.daterangepicker').show(); // Keep the picker open
            }, 10);
          }else if (label === 'Half Yearly') {
            this.showHalfYearSelection(year); // ➡️ Handle Half-Year Selection
            setTimeout(() => {
              $('.daterangepicker').show();
            }, 10);
          } 
          else {
            $('.daterangepicker .month-picker, .daterangepicker .quarter-picker,.daterangepicker .half-year-picker').remove();
            $('.daterangepicker .drp-calendar').show();
            let fromDate = start.format('DD/MM/YYYY')
            let toDate = end.format('DD/MM/YYYY')
            if(this.searchForm.get('FromDate')?.value && this.searchForm.get('ToDate')?.value){
              fromDate = moment(this.searchForm.get('FromDate')?.value,'DD/MM/YYYY').format('DD/MM/YYYY');
              toDate = moment(this.searchForm.get('ToDate')?.value, 'DD/MM/YYYY').format('DD/MM/YYYY');
            }
            $('#dashboardCalender').val(fromDate + ' - ' + toDate);
            this.searchForm.get("FromDate")?.setValue(fromDate);
            this.searchForm.get("ToDate")?.setValue(toDate);

            if(label?.toLowerCase() == 'custom range'){
              $('.ranges ul li').removeClass('active');
              $('.ranges ul li[data-range-key="Custom Range"]').addClass('active');

            }

            if (label?.toLowerCase() == 'apply') {
              $('.daterangepicker').hide();
            }
            
          }
        }
      )
    } else {
      this.searchForm.get('FromDate')?.setValue('');
      this.searchForm.get('ToDate')?.setValue('');
    }
  }

  showQuarterSelection(selectedFinancialYear: any): void {
    let quarterPickerHtml = `
      <div class="quarter-picker" style="display: flex; gap: 10px; justify-content: center; padding: 10px;width:500px">
        <button class="btn btn-primary quarter-btn" data-q="2">Q1 (Apr - Jun)</button>
        <button class="btn btn-primary quarter-btn" data-q="3">Q2 (Jul - Sep)</button>
        <button class="btn btn-primary quarter-btn" data-q="4">Q3 (Oct - Dec)</button>
        <button class="btn btn-primary quarter-btn" data-q="1">Q4 (Jan - Mar)</button>
      </div>`;

    $('.daterangepicker .drp-calendar').hide();

    $('.ranges ul li').removeClass('active');
    $('.ranges ul li[data-range-key="Quarterly"]').addClass('active');

    $('.daterangepicker .quarter-picker, .daterangepicker .month-picker,.daterangepicker .half-year-picker').remove();
    $('.daterangepicker .drp-buttons').before(quarterPickerHtml);

    // ✅ Use delegated event binding
    $(document).off('click', '.quarter-btn').on('click', '.quarter-btn', (event: any) => {
      let q = $(event.target).data('q');
      let startDate, endDate;

      if (q === 1) {
        startDate = moment().year(selectedFinancialYear + 1).quarter(q).startOf('quarter');
        endDate = moment().year(selectedFinancialYear + 1).quarter(q).endOf('quarter');
      } else {
        startDate = moment().year(selectedFinancialYear).quarter(q).startOf('quarter');
        endDate = moment().year(selectedFinancialYear).quarter(q).endOf('quarter');
      }

      $('#dashboardCalender').val(startDate.format('DD/MM/YYYY') + ' - ' + endDate.format('DD/MM/YYYY'));
      $('#dashboardCalender').data('daterangepicker').setStartDate(startDate);
      $('#dashboardCalender').data('daterangepicker').setEndDate(endDate);
      this.searchForm.get("FromDate")?.setValue(startDate.format('DD/MM/YYYY'));
      this.searchForm.get("ToDate")?.setValue(endDate.format('DD/MM/YYYY'));

      $('.daterangepicker').hide();
      $('.daterangepicker .quarter-picker').remove();
      $('.daterangepicker .drp-calendar').show();
    });
    $(document).on('click', (event: any) => {
      // Close the date picker when clicking outside
      if ($(event.target).closest('.daterangepicker, .month-btn, .quarter-btn, .ranges,.selectDate,.calender_btn,.half-year-picker').length) {
        let callback = $('#dashboardCalender').data('daterangepicker').callback;
        if (typeof callback === 'function') {
          let start = $('#dashboardCalender').data('daterangepicker').startDate;
          let end = $('#dashboardCalender').data('daterangepicker').endDate;
          let label = event.target.innerText; // Or use your own label logic
          callback(start, end, label); // ✅ Calls the original callback with selected dates
        }
      } else {
        $('.daterangepicker .month-picker, .daterangepicker .quarter-picker').remove();
        $('.daterangepicker').hide();
        $('.daterangepicker .drp-calendar').show();
      }
    });
  }

  showMonthSelection(selectedFinancialYear: any): void {
    let monthPickerHtml = `<div class="month-picker" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; padding: 10px;width:500px">`;

    for (let i = 0; i < 12; i++) {
      let monthName = moment().month(i).format('MMMM');
      let monthIndex = i + 1;
      monthPickerHtml += `<button class="btn btn-primary month-btn" data-month="${monthIndex}">${monthName}</button>`;
    }
    monthPickerHtml += `</div>`;

    $('.daterangepicker .drp-calendar').hide();

    $('.ranges ul li').removeClass('active');
    $('.ranges ul li[data-range-key="Monthly"]').addClass('active');

    $('.daterangepicker .month-picker, .daterangepicker .quarter-picker,.daterangepicker .half-year-picker').remove();
    $('.daterangepicker .drp-buttons').before(monthPickerHtml);

    // ✅ Use delegated event binding
    $(document).off('click', '.month-btn').on('click', '.month-btn', (event: any) => {
      let selectedMonth = parseInt($(event.target).data('month'));
      let startDate, endDate;
      startDate = moment().year(selectedFinancialYear).month(selectedMonth - 1).startOf('month');
      endDate = moment().year(selectedFinancialYear).month(selectedMonth - 1).endOf('month');

      // Use .format() only for display
      $('#dashboardCalender').val(startDate.format('DD/MM/YYYY') + ' - ' + endDate.format('DD/MM/YYYY'));

      // Set raw moment objects in the date range picker
      $('#dashboardCalender').data('daterangepicker').setStartDate(startDate);
      $('#dashboardCalender').data('daterangepicker').setEndDate(endDate);

      // Store correctly formatted values in form controls
      this.searchForm.get("FromDate")?.setValue(startDate.format('DD/MM/YYYY'));
      this.searchForm.get("ToDate")?.setValue(endDate.format('DD/MM/YYYY'));

      // this.searchForm.get("FromDate")?.setValue(startDate);
      // this.searchForm.get("ToDate")?.setValue(endDate);

      $('.daterangepicker').hide();
      $('.daterangepicker .month-picker').remove();
      $('.daterangepicker .drp-calendar').show();
    });
    $(document).on('click', (event: any) => {
      // Close the date picker when clicking outside
      if ($(event.target).closest('.daterangepicker, .month-btn, .quarter-btn, .ranges,.selectDate,.calender_btn,.half-year-picker').length) {
        let callback = $('#dashboardCalender').data('daterangepicker').callback;
        if (typeof callback === 'function') {
          let start = $('#dashboardCalender').data('daterangepicker').startDate;
          let end = $('#dashboardCalender').data('daterangepicker').endDate;
          let label = event.target.innerText; // Or use your own label logic
          callback(start, end, label); // ✅ Calls the original callback with selected dates
        }
      } else {
        $('.daterangepicker .month-picker, .daterangepicker .quarter-picker').remove();
        $('.daterangepicker').hide();
        $('.daterangepicker .drp-calendar').show();
      }
    });
  }

  showHalfYearSelection(selectedFinancialYear: any): void {
    let halfYearPickerHtml = `
      <div class="half-year-picker" style="display: flex; gap: 10px; justify-content: center; padding: 10px;width:500px">
        <button class="btn btn-primary half-year-btn" data-hy="1">H1 (Apr - Sep)</button>
        <button class="btn btn-primary half-year-btn" data-hy="2">H2 (Oct - Mar)</button>
      </div>`;
  
    // Hide calendars and remove existing pickers
    $('.daterangepicker .drp-calendar').hide();
    $('.ranges ul li').removeClass('active');
    $('.ranges ul li[data-range-key="Half Yearly"]').addClass('active');
    $('.daterangepicker .quarter-picker, .daterangepicker .month-picker, .daterangepicker .half-year-picker').remove();
    $('.daterangepicker .drp-buttons').before(halfYearPickerHtml);
  
    // Handle half-year selection using delegated event binding
    $(document).off('click', '.half-year-btn').on('click', '.half-year-btn', (event: any) => {
      let selectedHalfYear = parseInt($(event.target).data('hy'));
      let startDate, endDate;
  
      if (selectedHalfYear === 1) {
        // H1: April - September (Belongs to the Selected Financial Year)
        startDate = moment().year(selectedFinancialYear).month(3).startOf('month'); // April Start
        endDate = moment().year(selectedFinancialYear).month(8).endOf('month'); // September End
      } else {
        // H2: October - March (October in Selected Year, March in Next Year)
        startDate = moment().year(selectedFinancialYear).month(9).startOf('month'); // October Start
        endDate = moment().year(selectedFinancialYear + 1).month(2).endOf('month'); // March End
      }
  
      // Update input field
      $('#dashboardCalender').val(startDate.format('DD/MM/YYYY') + ' - ' + endDate.format('DD/MM/YYYY'));
  
      // Update daterangepicker
      $('#dashboardCalender').data('daterangepicker').setStartDate(startDate);
      $('#dashboardCalender').data('daterangepicker').setEndDate(endDate);
      this.searchForm.get('FromDate')?.setValue(startDate.format('DD/MM/YYYY'));
      this.searchForm.get('ToDate')?.setValue(endDate.format('DD/MM/YYYY'));
  
      // Close and reset picker
      $('.daterangepicker').hide();
      $('.daterangepicker .half-year-picker').remove();
      $('.daterangepicker .drp-calendar').show();
    });

    $(document).on('click', (event: any) => {
      // Close the date picker when clicking outside
      if ($(event.target).closest('.daterangepicker, .month-btn, .quarter-btn, .ranges,.selectDate,.calender_btn,.half-year-picker').length) {
        let callback = $('#dashboardCalender').data('daterangepicker').callback;
        if (typeof callback === 'function') {
          let start = $('#dashboardCalender').data('daterangepicker').startDate;
          let end = $('#dashboardCalender').data('daterangepicker').endDate;
          let label = event.target.innerText; // Or use your own label logic
          callback(start, end, label); // ✅ Calls the original callback with selected dates
        }
      } else {
        $('.daterangepicker .month-picker, .daterangepicker .quarter-picker').remove();
        $('.daterangepicker').hide();
        $('.daterangepicker .drp-calendar').show();
      }
    });
  }



}
