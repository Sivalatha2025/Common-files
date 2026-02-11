import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { log } from 'console';
import { from, Subject, takeUntil } from 'rxjs';
import { concatMap, map, toArray } from 'rxjs/operators';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { JsonFormControls } from '../../../components/add-page/schema.model';
import { APIPREFIX, apiURL, LimitArray, MultiLangEnabledRoots, RootEnum } from '../../../constants/constants';
import { DateInvalidError, InvalidSearch } from '../../../ErrorMessages/ErrorMessages';
import { StorageService } from '../../../storageService/storage-service';
import { CustomTranslatePipe } from '../../pipes/custom-translate.pipe';

import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { CommonService } from 'src/app/services/common/common.service';
import { IRange } from '../../Directives/date-range-calander-picker.directive';
declare var $:any;

// enum LoadInitailsReportguids{
//   DailyAttendence = ,

// }

enum CustomeDateRangePickerRangeModule{
  ClosureStepsProgress = 'ClosureStepsProgress/list'
}

function RegexValidator(
  pattern1: string | undefined,
  pattern2: string | undefined,
  pattern3: string | undefined
): ValidatorFn {
  
  return (control: AbstractControl): { [key: string]: boolean } | null => {
    if (pattern1 || pattern2 || pattern3) {
      let regex1 = pattern1 ? getRegex(pattern1) : undefined;
      let regex2 = pattern2 ? getRegex(pattern2) : undefined;
      let regex3 = pattern3 ? getRegex(pattern3) : undefined;
      if (
        control?.value &&
        !(
          (regex1 && regex1.test(control?.value)) ||
          (regex2 && regex2.test(control?.value)) ||
          (regex3 && regex3.test(control?.value))
        )
      ) {
        return { pattern: true };
      }
      return null;
    } else {
      return null;
    }
  };
}

function getRegex(pattern: string) {
  if (pattern) {
    try{

      return new RegExp(pattern);
    }catch(error){
      return undefined
    }
  } else {
    return undefined;
  }
}

function validateDates(startDateFieldName: string, endDateFieldName: string): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const fromDateValue = control.get(startDateFieldName)?.value;
    const toDateValue = control.get(endDateFieldName)?.value;

    // Convert fromDateValue and toDateValue to Date objects
    const fromDate = convertDate(fromDateValue);
    const toDate = convertDate(toDateValue);

    // Check if both fromDate and toDate are valid dates
    if (fromDate && toDate) {
      // Check if fromDate is less than or equal to toDate
      return fromDate <= toDate ? null : { 'dateComparison': true };
    }

    return null;
  };
}

function convertDate(dateString: string|any): Date | null {
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

function validateDatesOnInput(isValidatorRequired:boolean | any): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    //
    if(isValidatorRequired && !control.value){
      return {'required':true}
    }
    if(control.value){
    let currentDate:any = new Date();
    let inputDate:any = control.value;

    // currentDate = convertDate(currentDate?.toString());
    inputDate = convertDate(inputDate?.toString());

     if (currentDate && inputDate) {
      // Check if fromDate is less than or equal to toDate
      return currentDate > inputDate ? null : { 'greaterThanCurrentDate': true };
    }
    return null;
  }
  return null
}
}

@Component({
  selector: 'app-dynamic-search-card',
  templateUrl: './dynamic-search-card.component.html',
  styleUrls: ['./dynamic-search-card.component.css']
})
export class DynamicSearchCardComponent implements OnInit, OnChanges, OnDestroy {

  @Output()initialRequestEvent : any = new EventEmitter();
  @Input() isHideSubmitButton : boolean = false
  searchForm!: FormGroup;
  pageLimitForm!: FormGroup;
  @Input() schemaData: any;
  @Output() searchEvent = new EventEmitter<any>();
  @Output() ReportSearch = new EventEmitter<{FormData : any,isExtract : boolean}>();
  formFields: any[] = [];
  dependentDropDowns: any = {};
  mastersObject: { [index: string]: any[] } = {};
  dateValuesObj: any = {};
  isSubmitted: boolean = false;
  @Input() isLoading: boolean = false;
  isGraterFromDate: boolean = false;
  dateInvalidError: string = DateInvalidError;
  @Input() placeholder: string = '';
  @Input() isDisplaySearch:boolean = true;
  destroy$ = new Subject<void>();
  isMobileView:boolean = false;
  limitArray = LimitArray;
  @Input() pageLimit: number = 10;
  @Input() isNoRecords: boolean = false;
  @Input() TotalRecords: number = 0;
  @Output() limitChangeEvent = new EventEmitter<number>();
  @ Input() moduleCode : string = '';
  invalidSearchMsg: string = InvalidSearch;
  searchBoxPattern:string = "^[^<>]*$";
  currentMonth:any;
  currentYear:any;
  root: string = '';
  rootEnum = RootEnum;
  commonRoot : string = '';
  multiLangEnabledRoots: any = MultiLangEnabledRoots;
 changedetect :  boolean = false;
  @Input() templateCode :string = '';
  @Input() isDisplayInitDate:boolean = true;
  dateReadOnly:boolean = true;
  @Input() isAllowFutureDate:boolean = false;
  formFieldsObject: any = {};
  multiSelectDropdownSettings = {
    singleSelection: false,
    idField: 'Id',
    textField: 'Name',
    selectAllText: 'Select All',
    unSelectAllText: 'Deselect All',
    itemsShowLimit: 1,
    allowSearchFilter: true,
  };
  @Input() isDocumentSearch: boolean = false;
  disableDates: boolean = false;
  @Input() modulePermissionObj : any = {};
  @Input() isDisplayInitialData:boolean = true;
  minYear = 2023;
  selectedDateRange:string=''
  ranges: IRange[] = [];
  constructor(private http: HelperModuleService,
    private common: CommonService,
    private route: Router,
    private storage: StorageService,
    private zone: NgZone,
    private actRoute:ActivatedRoute,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) public platformId: any,
    private formBuilder: FormBuilder,
    private datepipe : DatePipe,
    public multiLanguageService: MultilanguageService,
    private customTranslatePipe : CustomTranslatePipe) {
    this.searchForm = this.formBuilder.group({});
    this.pageLimitForm = this.formBuilder.group({
      pageLimit:[this.pageLimit]
    });
  }

  ngOnInit(): void {
    this.actRoute.params.pipe(takeUntil(this.destroy$)).subscribe((param:any)=>{
      if(param)
      this.isGraterFromDate = false;
    });
    // if (isPlatformBrowser(this.platformId)) {
    //   (window as { [key: string]: any })['dateChangeInSearch'] = {
    //     component: this,
    //     zone: this.zone,
    //     changeDate: (date: any, fieldName: any, dateString: string, index: any, listName: any) =>
    //       this.changeDate(date, fieldName, dateString, index, listName),

    //   };
    // }
    this.actRoute.params.subscribe(params =>{
      this.root = params['root'] || '';
      if(this.root && this.multiLangEnabledRoots[this.root]){
             this.commonRoot = RootEnum.Common
      }else{
        this.commonRoot = ''
      }
    })

    this.multiLanguageService.selectedLanguageUpdation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        
        this.changedetect = !this.changedetect;
      });

   if(this.route.url?.includes('CRM') && this.route.url?.includes('Reports/list') ){
    this.dateReadOnly = false;
   }else{
    this.dateReadOnly = true;
   }
   let getWidth = $(window).width();
   if (getWidth && getWidth < 999) {
     this.isMobileView = true;
   }else{
     this.isMobileView = false;
   }

   if(this.route.url?.includes(CustomeDateRangePickerRangeModule.ClosureStepsProgress)){
    this.ranges = [
      {
        value: [new Date(1999, 11, 31), new Date(1999, 11, 31)], // Dec 31, 1999
        label: 'Financial Yearly'
      }
    ]
   }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

changeDate(event: any) {
  const fieldName = event?.fieldName ?? event?.id;
  const selectedDate = event?.selectedDate ?? event?.date ?? event;
  const dateString = event?.dateString ?? event?.date ?? null;

  if (fieldName) {
    this.formFields.map((el) => {
      if (el.FormField?.toLowerCase() === fieldName?.toLowerCase()) {
        if (isPlatformBrowser(this.platformId)) {
          this.searchForm.get(el.FormField)?.setValue(selectedDate || '');
          this.dateValuesObj[fieldName] = dateString;
        }
      }
    });
  }


  

  // ✅ Compare FromDate and ToDate after setting

  const fromDateStr = this.searchForm.get('FromDate')?.value;
  const toDateStr = this.searchForm.get('ToDate')?.value;

  if (fromDateStr && toDateStr) {
    // Parse dd/MM/yyyy to Date object
    const [fromDay, fromMonth, fromYear] = fromDateStr.split('/').map(Number);
    const [toDay, toMonth, toYear] = toDateStr.split('/').map(Number);

    const from = new Date(fromYear, fromMonth - 1, fromDay);
    const to = new Date(toYear, toMonth - 1, toDay);

    // Compare dates
    this.isGraterFromDate = from > to;
  } else {
    this.isGraterFromDate = false;
  }
}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schemaData']) {
      this.schemaData = changes['schemaData'].currentValue;
      this.searchForm = this.formBuilder.group({});
      this.getSchema();
    }
  }

  getSchema() {
    if (this.schemaData) {
      this.setSchemaData(this.schemaData);
    }
  }

  setSchemaData(formData: any) {
    //
    const formatMapping: any = {
      yyyy: 'Y',
      yyy: 'Y',
      yy: 'Y',
      YYYY: 'Y',
      YYY: 'Y',
      YY: 'Y',
      MMM: 'M',
      MM: 'm',
      mmm: 'm',
      mm: 'm',
      'HH:mm': 'H:i',
      dd: 'd',
      DD: 'D',
    };

    this.schemaData = JSON.parse(JSON.stringify(formData));
    this.formFields = formData?.FiltersDataList?.filter((field: any) => {
      if (field.DateFormat && typeof field.DateFormat === 'string') {
        field['oldDateFormat'] = field.DateFormat
        field.DateFormat = field.DateFormat.replace(
          /(yyyy|yyy|yy|MMM|MM|HH:mm|dd|\/|-|:y)/g,
          (match: any) => formatMapping[match] || match
        );
      }
      // if(field.MasterModuleCode == "Month"){
      //   const now = new Date();
      //   this.currentYear = now.getFullYear();
      //   this.currentMonth = this.datePipe.transform(now, 'MMMM')!;
      //   field.PlaceHolder=this.currentMonth
      // }
      return field
    })

    let arrayWithoutSearch = this.formFields?.filter((field:any) => field.FormField?.toLowerCase() != "searchword");
    let arrayWithSearch = this.formFields?.find((field:any) => field.FormField?.toLowerCase() == "searchword");
    if(arrayWithSearch != undefined && arrayWithSearch != null && arrayWithSearch != ''){
      arrayWithSearch.Pattern1ErrorMessage = this.invalidSearchMsg;
      arrayWithSearch.Pattern1 = this.searchBoxPattern;
      if(arrayWithoutSearch != undefined && arrayWithoutSearch != null){
        this.formFields = [arrayWithSearch, ...arrayWithoutSearch ]
      }else{
        this.formFields = arrayWithSearch
      }
    }
    else{
      this.formFields = arrayWithoutSearch 
    }

    this.createFormFields();
    this.getRequiredMasters();

    let listData = this.storage.getSessionStorage('listData' );
    
    //
    if(listData){

      let parsedData = JSON.parse(listData);
      
      if(parsedData.templateCode == this.templateCode && parsedData.searchData ){
        
        if(parsedData.searchData){
          this.searchForm.patchValue(parsedData.searchData)

          Object.keys(parsedData.searchData).forEach(el =>{
            if(this.dependentDropDowns[el]){
              this.onDropDownChange(this.formFieldsObject[el],parsedData.searchData[el])
            }
          })
        }

      }
    }
  }
  searchingEmployee: boolean = false;
  clearDetails(field: JsonFormControls ){
    this.mastersObject[field.FormField]=[]
  }
onSearchSelect(event: any, field: JsonFormControls): void {
  const term = event.term || '';

  if (term.length > 2) {
    this.searching[field.FormField] = true;

    const requestPayload = {
      MasterDataCode:  field.MasterModuleCode  ,
      Active: 'true',
      SearchWord: term,
      Code : term
    };
    let url = this.route?.url?.includes('/Reports') 
  ? field?.MasterReportURL ?? '' 
  : field?.MasterAPIUrl ?? '';
    this.http.postService(APIPREFIX + url, requestPayload).subscribe({
      next: (res: any) => {
        this.mastersObject[field.FormField] = res?.Data || [];
        this.searching[field.FormField] = false;
      },
      error: () => {
        this.mastersObject[field.FormField] = [];
        this.searching[field.FormField] = false;
      }
    });
  } else {
    this.mastersObject[field.FormField] = [];
    this.searching[field.FormField] = false;
  }
}
searching: { [key: string]: boolean } = {};
  createFormFields() {
    this.formFields.forEach((field: JsonFormControls) => {
      //
      this.formFieldsObject[field.FormField] = structuredClone(field);
      let validators: any[] = [];
      validators = this.getValidators(field);
      if(this.route.url.includes('/Reports') && field.FormField?.toLowerCase() == 'todate' && this.isDisplayInitDate && this.moduleCode !='AWTCR-78' &&  this.moduleCode !='HRMSCAR-200'){
        let date = new Date();
        let currentDate = this.datepipe.transform(date, 'dd/MM/yyyy');
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control(currentDate, {updateOn:'change', validators:validators})
        )
      }
      else if(this.route.url.includes('/Reports') && field.FormField?.toLowerCase() == 'fromdate' && this.isDisplayInitDate && this.moduleCode !='AWTCR-78' &&  this.moduleCode !='HRMSCAR-200'){
        let date = new Date();
        date.setDate(date.getDate() - 6);
        let currentDate = this.datepipe.transform(date, 'dd/MM/yyyy');
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control(currentDate, {updateOn:'change', validators:validators})
        )
      }
      else if(field.Type?.toLowerCase()=='searchdropdown'){
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control(null, {updateOn:'change', validators:validators})
        )
      }else if(field.Type?.toLowerCase()=='dropdown'){
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control(null, {updateOn:'change', validators:validators})
        )
      }else if (this.route.url.includes('/TicketReport/Reports/list') && field.Type?.toLowerCase() == 'date' && this.moduleCode == 'AWTCR-78'){
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control('', {updateOn:'change', validators:validateDatesOnInput(field?.Required)})
        )
      }
      else{
        this.searchForm.addControl(
          field.FormField,
          this.formBuilder.control('', {updateOn:'change', validators:validators})
        );
      }
    }); 
    console.log(this.formFields)
  }

  getRequiredMasters() {
    let forkArr: any[] = [];
    let forkFieldArr : any[] = [];
    this.formFields.forEach((field: any) => {
      if (
        (field.Type == 'dropdown' ||
          field.Type == 'radiobuttonlist' ||
          field.Type == 'multicheckbox') &&
        (field?.MasterReportURL || field?.MasterAPIUrl ) &&
        field.MasterModuleCode && !field.ParentFieldName
      ) {
        let req: any = {
          MasterDataCode: field.MasterModuleCode,
          Active: 'true',

        };

        if(field.SearchTypeRequired){
          req['SearchTypeId'] = this.modulePermissionObj && this.modulePermissionObj['Admin View'] ? '1' : '0';
        }
        if (field.MasterReportURL?.toLowerCase() == 'getdatabysearch') {
          req['MasterDataCode'] = undefined;
          req['ModuleCode'] = field.MasterModuleCode;
        }
        if (field.MasterAPIUrl?.includes('GetDoctorByEmployeeType')) {
          req['MasterDataCode'] = undefined;
        }


        if((field.MasterModuleCode?.toLowerCase()=="month" ||
        field.MasterModuleCode?.toLowerCase()=="year" || field.MasterModuleCode?.toLowerCase()=="financialyear") &&
        (this.moduleCode == 'RMR-42' || this.moduleCode == 'RELR-38' || this.moduleCode == 'RDAR-41' || this.moduleCode =='HRMSWWHR-82' )){
          
          
          let dropdownMasterURL:string = '';
          if(field.MasterAPIUrl){
            dropdownMasterURL = field.MasterAPIUrl;
          }else{
            dropdownMasterURL = field.MasterReportURL;
          }
           
          forkFieldArr.push(field)
          forkArr.push( this.http.postService(APIPREFIX + dropdownMasterURL, req));
        }else{
          this.masterAPICall(req, field)

        }
      } else if (field.ParentFieldName) {
        if(this.dependentDropDowns[field.ParentFieldName] && this.dependentDropDowns[field.ParentFieldName].length >0){
          let val:any[] = this.dependentDropDowns[field.ParentFieldName];
          val.push(field);
          this.dependentDropDowns[field.ParentFieldName] = val;
        }else{
          this.dependentDropDowns[field.ParentFieldName] = [field]
        }
      }
    });
    let obj: any = {};
    const queuedRequests: Array<{ request$: any; field: any }> = forkArr.map((request$: any, index: number) => ({ request$, field: forkFieldArr[index] }));
    if (!queuedRequests.length) {
      return;
    }

    from(queuedRequests).pipe(
      concatMap(item =>
        item.request$.pipe(
          map((res: any) => ({ field: item.field, res }))
        )
      ),
      toArray(),
      takeUntil(this.destroy$)
    ).subscribe(
      (results) => {
        const typedResults = results as Array<{ field: any; res: any }>;
        typedResults.forEach(({ field, res }) => {
          if (res && res.Data && res.ReturnCode == 0) {
            this.mastersObject[field.FormField] = res.Data;
            if(field.MasterModuleCode?.toLowerCase()=="month" && this.isDisplayInitialData){
               let  date = new Date();
               let currentMonth = this.datePipe.transform(date,'MMMM') || '';
              
               let curentMonthValue: any =  res.Data.filter((el: any) => el.Name.toLowerCase() == currentMonth.toLowerCase())
  
              this.searchForm.get(field.FormField)?.setValue(curentMonthValue[0].Id);
              obj[field.FormField] = curentMonthValue[0].Id;

            }
            if((field.MasterModuleCode?.toLowerCase()=="year"||field.MasterModuleCode?.toLowerCase()=="financialyear") && this.isDisplayInitialData){
              if(field.FormField?.toLowerCase()=='code1' && field.Label?.toLowerCase()=='year' ||field.FormField?.toLowerCase()=='code2' && field.Label?.toLowerCase()=='year' ||field.FormField?.toLowerCase()=='code3' && field.Label?.toLowerCase()=='year'){
                if(field.FormField?.toLowerCase()=='code2' && field.Label?.toLowerCase()=='year'){
                  const currenYear = String(new Date().getFullYear() || '');
                  const curentYearValue: any = res.Data.find((el: any) => String(el.Name) === currenYear || String(el.Code) === currenYear) || res.Data[0];

                  if (curentYearValue) {
                    this.searchForm.get(field.FormField)?.setValue(curentYearValue.Id);
                    obj[field.FormField] = curentYearValue.Id;
                  }

                }
                else{

                  let  date = new Date();
                  let currenYear = String(date.getFullYear() || '');
                  let curentYearValue: any =  res.Data.find((el: any) => String(el.Name) === currenYear || String(el.Code) === currenYear) || res.Data[0];

                  if(curentYearValue){
                    this.searchForm.get(field.FormField)?.setValue(curentYearValue.Id);
                    obj[field.FormField] = curentYearValue.Id;
                  }

                }
             }
            }
       
          }
        });

        if(Object.keys(obj).length !=0){
          this.initialRequestEvent.emit(obj);
        }
      },
      (err: any) => {
        console.error('Failed to load master data sequentially', err);
      }
    );
    
  }

  getValidators(field: JsonFormControls): any {
    const validatorsToAdd = [];
    for (let [key, value] of Object.entries(field)) {
      key = key?.toLowerCase();
      let intValue;
      switch (key) {
        case 'min':
          intValue = parseInt(value);
          validatorsToAdd.push(Validators.min(intValue));
          break;
        case 'max':
          intValue = parseInt(value);
          validatorsToAdd.push(Validators.max(intValue));
          break;
        case 'required':
          if (value) {
            validatorsToAdd.push(Validators.required);
          }
          break;
        case 'requiredtrue':
          if (value) {
            validatorsToAdd.push(Validators.requiredTrue);
          }
          break;
        case 'minlength':
          intValue = parseInt(value);
          validatorsToAdd.push(Validators.minLength(intValue));
          break;
        case 'maxlength':
          intValue = parseInt(value);
          validatorsToAdd.push(Validators.maxLength(intValue));
          break;


        default:
          break;
      }
    }
    if (field?.Type?.toLowerCase() != 'date' && field?.Type?.toLowerCase() != 'datetime') {
      this.changePattern(field);

      validatorsToAdd.push(
        RegexValidator(field.Pattern1, field.Pattern2, field.Pattern3)
      );
    } 
    return validatorsToAdd;
  }

  masterAPICall(req: any, field: any) {

    let apiprefix = APIPREFIX;
    let dropdownMasterURL:string = '';

    if(field.MasterAPIUrl){
      dropdownMasterURL = field.MasterAPIUrl;
    }else{
      dropdownMasterURL = field.MasterReportURL
    }

    if(dropdownMasterURL.includes('/api')){
      apiprefix = apiURL;
    }
    else{
      apiprefix = APIPREFIX
    }
   this.http.postService( apiprefix + dropdownMasterURL, req).subscribe({
      next: (res: any) => {
        if (res && res.Data && res.ReturnCode == 0) {
          this.mastersObject[field.FormField] = res.Data;

          try {
            if(field.MasterModuleCode?.toLowerCase()=="month" && this.isDisplayInitialData){
              if(field.FormField?.toLowerCase()=='code' && field.Label?.toLowerCase()=='month' ||field.FormField?.toLowerCase()=='code2' && field.Label?.toLowerCase()=='month' ){
                 let  date = new Date();
                 let currentMonth = this.datePipe.transform(date,'MMMM') || '';
                   //console.log(currentMonth)
                 let curentMonthValue: any =  res.Data.filter((el: any) => el.Name.toLowerCase() == currentMonth.toLowerCase())
    
                this.searchForm.get(field.FormField)?.setValue(curentMonthValue[0].Id);
              }
            }
            if((field.MasterModuleCode?.toLowerCase()=="year"||field.MasterModuleCode?.toLowerCase()=="financialyear")&& this.isDisplayInitialData){
              if(field.FormField?.toLowerCase()=='code1' && field.Label?.toLowerCase()=='year' ||field.FormField?.toLowerCase()=='code2' && field.Label?.toLowerCase()=='year' ||field.FormField?.toLowerCase()=='code3' && field.Label?.toLowerCase()=='year'){
                if(field.FormField?.toLowerCase()=='code2' && field.Label?.toLowerCase()=='year'){
                  const currenYear = String(new Date().getFullYear() || '');
                  const curentYearValue: any = res.Data.find((el: any) => String(el.Name) === currenYear || String(el.Code) === currenYear) || res.Data[0];

                  if (curentYearValue) {
                    this.searchForm.get(field.FormField)?.setValue(curentYearValue.Id);
                  }
                }
                else{

                  let  date = new Date();
                  let currenYear = String(date.getFullYear() || '');
                    //console.log(currenYear)
                  let curentYearValue: any =  res.Data.find((el: any) => String(el.Name) === currenYear || String(el.Code) === currenYear) || res.Data[0];

                  if(curentYearValue){
                    this.searchForm.get(field.FormField)?.setValue(curentYearValue.Id);
                  }
                }
             }
            }
            if(dropdownMasterURL && (dropdownMasterURL?.includes('GetUnProcessedMonthlyAttendanceMonth') || dropdownMasterURL?.includes('GetMonthlyAttendanceApprovedMonthAndYearByCode') )){

              /**
               * this is for monthly attendance and generate payroll.
               * upon selection of month need to call 'GetUnProcessedMonthlyAttendanceMonth','GetMonthlyAttendanceApprovedMonthAndYearByCode' to get months based on year.
              */
              this.mastersObject[field.FormField] = res.Data.Details;
           
            }
            if(this.templateCode=='error-log' && req['MasterDataCode']=='LogCode'){
              let ZerothIndex = this.mastersObject['Id'] && this.mastersObject['Id'].length >0?this.mastersObject['Id'][0]:undefined ;
              if(ZerothIndex){
                this.searchForm.get('Id')?.setValue(ZerothIndex.Id);
              }
            }
          } catch (error) {
            
          }
          // if(field?.Type?.toLowerCase() == 'dropdown' && field?.Label?.toLowerCase() == 'store' ){
          //   if(this.mastersObject[field.FormField] && this.mastersObject[field.FormField][0]){
          //     let storeid = this.mastersObject[field.FormField][0].Id ? this.mastersObject[field.FormField][0].Id : '';
          //     setTimeout(() => {
          //       this.searchForm.get(field?.FormField)?.setValue(storeid);
          //     }, 100);
          //     this.common.changeReportsStoreDropdownId(storeid);
          //   } 
          // }
        }
      }, error: (err: any) => {
        console.log(err);
      }
    })
  }

  changePattern(field : JsonFormControls){
    if(field.Pattern1){
      field.Pattern1 = field.Pattern1.replaceAll('//','/')
    }
    if(field.Pattern2){
      field.Pattern2 = field.Pattern2.replaceAll('//','/')
    }
    if(field.Pattern3){
      field.Pattern3 = field.Pattern3.replaceAll('//','/')
    }
  }

  getErrorMessage(fieldName: string) {
    const control: any = this.searchForm.get(fieldName);
    const errorField = this.formFields.find((field: any) => field.FormField == fieldName);
    
    if (control?.hasError('required')) {
      return this.capitalizeFirstLetter(errorField?.RequiredErrorMessage || '');
    } else if (control?.hasError('pattern')) {
      return this.capitalizeFirstLetter(errorField?.Pattern1ErrorMessage || '');
    } else if (control?.hasError('maxlength')) {
      return this.capitalizeFirstLetter(errorField?.LengthErrorMessage || '');
    } else if (control?.hasError('minlength')) {
      return this.capitalizeFirstLetter(errorField?.LengthErrorMessage || '');
    } else if (control?.hasError('max')) {
      return this.capitalizeFirstLetter(errorField?.RangeErrorMessage || '');
    } else if (control?.hasError('min')) {
      return this.capitalizeFirstLetter(errorField?.RangeErrorMessage || '');
    } else {
      return this.capitalizeFirstLetter(errorField?.Pattern1ErrorMessage || '');
    }
   
  }
   capitalizeFirstLetter(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  openDatePicker(datepicker: any) {
    if (datepicker) {
      datepicker.show();
    }
  }

  onDropDownChange(parentfield : JsonFormControls , editDetails? : any){
    try{
      if(this.isDocumentSearch) {
        let financialYr = this.searchForm.get('FinancialYear')?.value
        if(financialYr !== undefined && financialYr !== null && financialYr !== '') {
          this.searchForm.get('FromDate')?.setValue('');
          this.searchForm.get('ToDate')?.setValue('');
          this.disableDates = true;
        }else {
          this.disableDates = false;
        }
      }
    }catch{

    }
    if (this.dependentDropDowns[parentfield.FormField]) {
      this.dependentDropDowns[parentfield.FormField].forEach((el:any) => {
        if (el.FormField) {
          if(!editDetails){

            this.searchForm.get(el.FormField)?.setValue(null);
          }
          this.mastersObject[el.FormField]  = []
        }
        if (this.searchForm.get(parentfield.FormField)?.value || editDetails) {
    
          let req: any = {
            MasterDataCode: el.MasterModuleCode,
            Active: 'true',
            Code: this.searchForm.get(parentfield.FormField)?.value || editDetails || ''
          };
          
          if (el?.MasterReportURL?.toLowerCase() == 'getdatabysearch') {
            req['MasterDataCode'] = undefined;
            req['ModuleCode'] = el.MasterModuleCode;
          }
          if(el?.MasterReportURL && (el?.MasterReportURL?.includes('GetUnProcessedMonthlyAttendanceMonth') || el?.MasterReportURL?.includes('GetMonthlyAttendanceApprovedMonthAndYearByCode') )){

            /**
             * this is for monthly attendance and generate payroll.
             * upon selection of month need to call 'GetUnProcessedMonthlyAttendanceMonth','GetMonthlyAttendanceApprovedMonthAndYearByCode' to get months based on year.
             */

            let value = this.searchForm.get(parentfield.FormField)?.value;

            if(value){
              let filteredYear = this.mastersObject['Code2'].find((x:any)=>x.Id == value);
              if(filteredYear){
                req['Code'] = filteredYear.Name ||'';
              }else{
                req['Code'] = ''
              }
            }
            req['MasterDataCode'] = undefined;
            req['ModuleCode'] = undefined;


          }
          this.masterAPICall(req, el);
        }
      });

    }
  }
  
  clearFilter(){
    let obj = this.searchForm.value;
    Object.keys(obj).forEach((key)=>{[
      obj[key] =''
    ]});
    this.searchForm.patchValue(obj)    
    this.searchEvent.emit(this.searchForm.value);
  }

  onSearch(isExtract? : boolean){
    //
    const isDateInvalid = this.validateDates();
    if (!isDateInvalid && this.searchForm.valid) {
      if(!isExtract) {
        this.isLoading = true
      }
      this.isGraterFromDate = false;
      
      let req:any ={};
      this.formFields.forEach((el:any)=>{
        if(el.Type?.toLowerCase()=='multicheckbox'){
          if(this.searchForm.get(el.FormField)?.value){
            let val = this.searchForm.get(el.FormField)?.value;
            val = val.map((x:any)=>x.Id);
            if(val && val.length >0){
              req[el.FormField] = val.join();
            }else{
              req[el.FormField] = '';
            }
          }else{
              req[el.FormField] = '';
            }
        } 
        else if(el.Type?.toLowerCase()=='text'){
          req[el.FormField] = (this.searchForm.get(el.FormField)?.value ||'').trim();
        }
        else{
          req[el.FormField] = this.searchForm.get(el.FormField)?.value ||'';
        }
      })

      this.searchEvent.emit(req);

      this.ReportSearch.emit({FormData : req ,isExtract : isExtract || false});
    }else{
      if(isDateInvalid && !this.searchForm.valid){
        this.isGraterFromDate = true;
        this.isSubmitted = false;
      }else if(!isDateInvalid && !this.searchForm.valid){
        this.isGraterFromDate = false;
        this.isSubmitted = true;
      }
      else{
        this.isGraterFromDate = true;
        this.isSubmitted = true;
      }
      
    }
  }

  validateDates(): boolean {
    const fromDateField = this.formFields.find((field: JsonFormControls) => field?.FormField?.toLowerCase() === 'fromdate');
    const toDateField = this.formFields.find((field: JsonFormControls) => field?.FormField?.toLowerCase() === 'todate');
  
    // Check if both fromDateField and toDateField exist
    if (fromDateField && toDateField) {
      const fromDateValue = this.searchForm.get(fromDateField.FormField)?.value;
      const toDateValue = this.searchForm.get(toDateField.FormField)?.value;
  
      // Convert fromDateValue and toDateValue to Date objects
      const fromDate = fromDateValue ? this.convertDate(fromDateValue) : '';
      const toDate = toDateValue ? this.convertDate(toDateValue) : '';
  
      // Check if fromDate is after toDate
      if (fromDate && toDate && fromDate > toDate) {
        return true; // Return true if date comparison fails
      }
    }
  
    return false; // Return false if date comparison passes
  }
  isDateRangeFormatValid(): boolean {
    const fromField = this.formFields.find((field: any) => field?.FormField?.toLowerCase() === 'fromdate');
    const toField = this.formFields.find((field: any) => field?.FormField?.toLowerCase() === 'todate');

    const fromCtrl = fromField ? this.searchForm.get(fromField.FormField) : null;
    const toCtrl = toField ? this.searchForm.get(toField.FormField) : null;

    return !(fromCtrl?.invalid || toCtrl?.invalid);
  }  onExtract(){
    this.onSearch()
  }

  convertDate(dateString: string): Date | null {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10); //10 number convert or taken 10ns
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  onLimitChange() {
    this.pageLimit = this.pageLimitForm.value.pageLimit;
    this.limitChangeEvent.emit(this.pageLimit);
  }
  // preventSaving(event:any){
  //   if(event){
  //     event.stopPropagation();
  //   }
  // }
      getCalenderValue(event:any){
    if(event && event.FromDate && event.ToDate){
      this.searchForm.get('FromDate')?.setValue(event.FromDate ||"")
      this.searchForm.get('ToDate')?.setValue(event.ToDate ||"")
      this.selectedDateRange = `${event.FromDate} - ${event.ToDate}`
    }
  }
}

