import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { ActivityManagementLeadSearchToolTip, empPageLimit, GetDatabySearch, GetMastersAPI, isEnableToolTips, LimitArray, SearchLimit} from '../../../constants/constants';
import {
  RequiredSearchInput,
  InvalidSearch,
  DateInvalidError,
  InvalidFromDateMsg,
  SelectSolrErrorType,
  storeRequiredErrorMsg,
  SelectLogType,
} from '../../../ErrorMessages/ErrorMessages';
import { SearchBoxPattern } from '../../../InputPatterns/input-pattern';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { StorageService } from '../../../storageService/storage-service';
import { BsDatepickerDirective } from 'ngx-bootstrap/datepicker';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';
declare var $:any

enum masters {
  AlertType = 'AlertType',
  HRMSEmployee = 'HRMSEmployee'
} 

@Component({
  selector: 'app-search-card',
  templateUrl: './search-card.component.html',
  styleUrls: ['./search-card.component.css'],
})
export class SearchCardComponent implements OnInit, OnDestroy {
  @Input() isLoading: boolean = false;
  @Input() pageLimit: number = 10;
  @Input() pageLimitForEmployee: number = 10;
  @Input() placeholder: string = '';
  @Input() dateId: string = '';
  @Input() isNoRecords: boolean = false;
  @Input() TotalRecords: number = 0;
  @Input() employeeData:any =[];
  @Input() reviewEmployeeStatus:any =[];
  @Input() empValidation:boolean=false;
  @Input() selectedEmployee:any =null;
  @Input() selectedreviewEmployeeStatus:any =null;
  @Input() RequestTypeID:any;
  @Input() isReports:boolean = false;
  @Input() isDisplaySelectDate:boolean=false;
  @Input() isDisplaytimesheetDate:boolean=false;
  @Input () searchNotRequired:boolean = true;
  @Input () isExtract:boolean = false;
  @Input() disableExtract:boolean = true;
  @Input() isFromPendingSheet:boolean = false;
  @Output() searchEvent = new EventEmitter<string>();
  @Output() limitChangeEvent = new EventEmitter<number>();
  @Output() EmpPagelimitChangeEvent = new EventEmitter<number>();
  @Output() PageLimitChangeEvent = new EventEmitter<number>();
  @Output() masterDropDownEvent = new EventEmitter<string>();
  @Input() isSelectedDatemandatory = false
  invalidSearch: boolean = false;
  @Input() search: string = '';
  @Input() isDisplaySearch:boolean = true;
  searchLimit: number = SearchLimit;
  searchRequiredError: string = RequiredSearchInput;
  invalidSearchMsg: string = InvalidSearch;
  isSearchApplied: boolean = false;
  limitArray = LimitArray;
  empPageLimit = empPageLimit
  isGraterFromDate: boolean = false;
  dateInvalidError: string = DateInvalidError;
  isEmployeeError:boolean=false;
  @Output() dateEvent = new EventEmitter<any>();
  @Input() fromDate: string = '';
  @Input() toDate: string = '';
  @Input() nextStepDate: string = '';
  invalidFromDate: boolean = false;
  invalidFromDateMsg: string = InvalidFromDateMsg;
  SelectSolrErrorType =SelectSolrErrorType;
  SelectLogType = SelectLogType;
  isDateApplied: boolean = false;
  masterErrorID:string = ''
  masterErrorIDCheck:boolean = false
  @Input() isClearLoading: boolean = false;
  @Output() clearFilterEvent = new EventEmitter<any>();
  @Output() changeOrderStatus = new EventEmitter<any>();
  @Output() ReportSearch = new EventEmitter<any>();

  @Output() changeLeadName = new EventEmitter<any>();
  @Output() InputSearchEmit = new EventEmitter<any>();
  @Input() isSearchIconLoading:boolean=false;
  searchType:any;
  @Input() ErrorLogMasterData:any =[]
  @Input() ErrorTypeMasterData:any =[]
  @Input() selectedErrorId:any
  @Input() selectedLogId:any
  @Input() allMasterDropDownData:{ [index: string]: any } = {};
  @Input() selectedProjectId:any = null
  @Input() selectedStatusId: any = null;
  fullFromDate: any;
  fullToDate: any;
  noRecordsFound:string=''
  @Input() fileStatusData:any = [];
  @Input() fileTypeData:any = [];
  @Input() orderStatusData:any = [];
  @Input() leadNameMaster:any = [];
  @Input() dueDateAndNormalDates:any = [];
  @Input() selectedStatus: any = null;
  selectedFileType:string = '';
  selectedOrderStatus: any = null;
  // isEmployeeError:boolean=false

  @Input() satusArray:any[] = [];
  @Input() transportArray:any[] = [];
  statusId:any =null;
  transporterId:any = null;
  today!:Date;
  destroy$ = new Subject<void>();
  @Input() isDashboard: boolean = false;
  currentDate: Date;
alertArray : any[] = [];
  alertType : string = '';
  @Input() templateCode : string = ''
  @Input() isDisplayDates:boolean = true;
  @Input() isDisplayNextStepDate:boolean = false;
  @Input() departmentData:any =[];
  @Input() shiftData:any =[];
  @Input() selectedDepartment:any=null;
  @Input() selectedMonth:any =null;
  @Input() selectedYear:any =null;
  @Input() SelectDate:string='';
  @Input() monthData:any =[];
  @Input() yearData:any =[];
  @Input() leadData:any =[];
  @Input() activityMaster:any =[];
  @Input() selectedLead = null;
  @Input() selectDueDateAndNormalDates = null;
  @Input() leaveStatusData:any =[];
  @Input() leaveTypeData:any = []
  selectedLeaveStatus : any = null;
  selectedLeaveType :any = null;
  searchText : string ='';
  displayMsg : string = "";
  selectedDepartmentName : string ='';
  @Input() searchPipe: boolean = false;
  @Input() searchPipeforEmployee: boolean = false;
  @Input() employeeStatusData :any[] =[]
  selectedEmployeeStatus : any = null;
  selectedEmployeeStatusForAdditionalWork :any = null;
  @Input() isProductBarcode: boolean = false;

  ActivityManagementLeadSearchToolTip = ActivityManagementLeadSearchToolTip;
  @Input() storeData:any =[];
  @Input() selectedStore : any = null;
  storeRequiredErrorMsg = storeRequiredErrorMsg;
  isStoreRequiredError:boolean = false;
  isDisplayManageAttandanceToolTip  = isEnableToolTips['ManageEmployeeAttendance']
  searching:boolean=false;
  @Input() commonDropdownData:{ [index: string]: any } = {}
  selectedCommonDropDownId: string = ''
  @Input() isEmployeeWithSearch:boolean = false;
  employeeSearchData:any[]=[]
  isMobileToolTip:boolean =false;
  @Input() employeeStatus:any =[];
  @Input() fullFilmentStatus :any =[];
  selectedFulfilmentStatusId:any =null;
  datemandatory:boolean = false
  @Input() siteData:any = [];
  @Input() IsSiteMandatory:boolean=false;
  @Input() selectedSite:any[] = [];
  isSiteError:boolean = false;
  @Input() isClearableMonth = false;
  @Input() isClearableYear = false;
  // Removed: @ViewChild(BsDatepickerDirective) bsDatePicker - no longer needed with editable-date-input
  /**Tool tips starts */
  @Input() seachCardToolTips:any = {};

  @Input() moduleCode: string = '';
  changedetect : boolean = false;
  root : string = ''
  /**Tool tips ends */
  multiSelectDropdownSettings = {
    singleSelection: false,
    idField: 'Id',
    textField: 'Name',
    selectAllText: 'Select All',
    unSelectAllText: 'Deselect All',
    itemsShowLimit: 1,
    allowSearchFilter: true,
  };
  @Input() isAllowFutureDate:boolean = false;
  @Input() siteNameData: any = [];
  selectedSiteLog : any = null;
  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private datePipe: DatePipe,
    private actRoute:ActivatedRoute,
    private http : HttpClient,
    private route:Router,
    private storage : StorageService,
    private multiLanguageService : MultilanguageService
  ) {
    this.currentDate = new Date();

    this.root = this.route.url.split('/')[1]
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      let getWidth:any = $(window).width();
      if (getWidth < 999) {
        this.isMobileToolTip = true;
      }else{
        this.isMobileToolTip = false;
      }

     
    }
    
    this.multiLanguageService.selectedLanguageUpdation()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      
      this.changedetect = !this.changedetect;
    });


    if(!this.isDashboard) {
    this.actRoute.params.pipe(takeUntil(this.destroy$)).subscribe((param:any)=>{
    

      let listData = this.storage.getSessionStorage('listData' );
      
      if(listData){
        let parsedData = JSON.parse(listData);
        
        if(parsedData.templateCode == this.moduleCode && parsedData.searchData ){
           
          let Obj : any = parsedData.searchData;

          this.fromDate = Obj['fromDate'] || '';
          this.toDate = Obj['changeToDate'] || Obj['toDate'] || '';
          this.nextStepDate = Obj['nextStepDate'] || ''
          this.search = Obj['searchText'] || '';
          this.selectedErrorId = Obj['ErrorID'] || '';
          this.selectedLogId = Obj['LogID'] || '';
          this.selectedStatus = Obj['selectedStatus'] || '';
          this.selectedFileType = Obj['selectedFileType'] || '';
          this.statusId = Obj['statusID'] || '';
          this.transporterId = Obj['transporterId'] || '';
          this.alertType = Obj['AlertType'] || '';
          this.selectedProjectId = Obj['selectedProjectId'] || '';
          this.selectedStatusId = Obj['selectedStatusId'] || null;
          this.selectedDepartment = Obj['selectedDepartment'] || null;
          this.selectedLead = Obj['selectedLead'] || '';
          this.selectDueDateAndNormalDates = Obj['selectDueDateAndNormalDates'] || '';
          this.selectedLeaveType = Obj['selectedLeaveType'] || '';
          this.selectedLeaveStatus = Obj['selectedLeaveStatus'] || '';
          this.selectedMonth = Obj['selectedMonth'] || '';
          this.selectedYear = Obj['selectedYear'] || '';
          this.selectedEmployee = Obj['selectedEmployee'] || '';
          this.selectedreviewEmployeeStatus = Obj['selectedreviewEmployeeStatus'] || '';
          this.selectedEmployeeStatus = Obj['selectedEmployeeStatus'] || '';
          this.selectedEmployeeStatusForAdditionalWork = Obj['selectedEmployeeStatusForAdditionalWork'] || null;
          this.selectedStore = Obj['selectedStore'] || '';
          this.selectedCommonDropDownId = Obj['selectedCommonDropDownId'] || '';
          this.selectedOrderStatus  = Obj['orderStatusId'];
          this.selectedFulfilmentStatusId = Obj['selectedFulfilmentStatusId']
          this.selectedSiteLog = Obj['selectedSiteLog']
        }
  
      }else{
        this.fromDate ='';
        this.SelectDate = '';
        this.toDate ='';
        this.nextStepDate ='';
        this.search = '';
        this.isGraterFromDate = false;
        this.invalidSearch = false;
        this.today= new Date();
      }

      
    });
  } else {
    const previousDate = new Date(this.currentDate);
    previousDate.setDate(this.currentDate.getDate() - 7);
    this.fullFromDate = new Date(previousDate);
    this.fullFromDate.setHours(0,0,0,0);
  }
    if (this.route.url.includes('/Reports') && !this.route.url.includes('/EmployeeTimeSheetReport')) {
      let date = new Date();
      this.toDate = this.datePipe.transform(date, 'dd/MM/yyyy') as string;

      date.setDate(date.getDate() - 6);
      this.fromDate = this.datePipe.transform(date, 'dd/MM/yyyy') as string;
    }else if(this.route.url.includes('/EmployeeTimeSheetReport')){
      let date = new Date();
      this.fromDate = this.datePipe.transform(date, 'dd/MM/yyyy') as string;
    }
    if (this.templateCode == 'SMST-10349' || this.templateCode == 'STRET-10348' || this.templateCode == 'SMSL-10351' || this.templateCode == 'STREL-10350') {
      this.getMasters(masters.AlertType)
    }
     
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // $('#' + this.dateId + 'fromDate').datetimepicker({
      //   // value: '',
      //   timepicker: false,
      //   datepicker: true,
      //   format: 'd/m/Y',
      //   maxDate: new Date(),
      //   scrollMonth: false,
      //   scrollInput: false,
      //   // openOnFocus: true,
      //   // closeOnInputClick: false,
      //   onSelectDate: (event: any) => {
      //     this.fromDate =
      //       this.datePipe.transform(new Date(event), 'dd/MM/yyyy') || '';
      //     // console.log(this.fromDate)
      //   },
      // });
      // $('#' + this.dateId + 'toDate').datetimepicker({
      //   // value:new Date(),
      //   timepicker: false,
      //   datepicker: true,
      //   format: 'd/m/Y',
      //   maxDate: new Date(),
      //   scrollMonth: false,
      //   scrollInput: false,
      //   onSelectDate: (event: any) => {
      //     this.toDate =
      //       this.datePipe.transform(new Date(event), 'dd/MM/yyyy') || '';
      //   },
      // });
    }
  }

  getMasters(type : string, searchWord?:string){

    let req : any= {
      MasterDataCode: type,
      Active: 'true',
      
    };

    this.http.post(GetMastersAPI,req).subscribe((res : any) =>{
      if(res && res.Data && res.Data?.length !=0 && res.ReturnCode == 0){
          this.alertArray = res.Data;
      }else{

          this.alertArray = [];
      }
    })
  }

  changeDate(event: any) {
    // Handle the new event format from app-editable-date-input
    // The event can be: { selectedDate: string, fieldName: string, dateString: Date }
    // or the old format: { date: Date, id: string }
    
    let dateObj: Date | null = null;
    let fieldName: string = '';
    
    // Check for new format (from app-editable-date-input)
    if (event.selectedDate || event.fieldName) {
      fieldName = event.fieldName || '';
      if (event.dateString instanceof Date) {
        dateObj = event.dateString;
      } else if (event.selectedDate) {
        // Parse the date string if it's a string
        const dateStr = event.selectedDate;
        if (dateStr && dateStr.length === 10) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            dateObj = new Date(year, month - 1, day);
          }
        }
      }
    } 
    // Check for old format (from appBsDateFormat)
    else if (event.date || event.id) {
      fieldName = event.id || '';
      if (event.date) {
        dateObj = event.date instanceof Date ? event.date : new Date(event.date);
      }
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      const formattedDate = this.datePipe.transform(dateObj, 'dd/MM/yyyy') || '';
      
      if (fieldName == 'fromDate') {
        this.fromDate = formattedDate;
        this.fullFromDate = dateObj;

        if (this.isSelectedDatemandatory && this.fromDate) {
          this.datemandatory = false;
        }
      } 
      else if (fieldName == 'toDate') {
        this.toDate = formattedDate;
        this.fullToDate = dateObj;
      } 
      else if (fieldName == 'nextStepDate') {
        this.nextStepDate = formattedDate;
      }
      
      // ✅ Compare FromDate and ToDate after both are set
      if (this.fromDate && this.toDate) {
        const [fromDay, fromMonth, fromYear] = this.fromDate.split('/').map(Number);
        const [toDay, toMonth, toYear] = this.toDate.split('/').map(Number);

        const from = new Date(fromYear, fromMonth - 1, fromDay);
        const to = new Date(toYear, toMonth - 1, toDay);

        // ✅ Validation: restrict greater FromDate
        if (from > to) {
          this.isGraterFromDate = true;
        } else {
          this.isGraterFromDate = false;
        }
      }
    } else {
      // ✅ Handle cleared dates
      if (fieldName == 'fromDate') {
        this.fromDate = '';
        this.fullFromDate = null;
      } 
      if (fieldName == 'toDate') {
        this.toDate = '';
        this.fullToDate = null;
      } 
      if (fieldName == 'nextStepDate') {
        this.nextStepDate = '';
      }
    }
  }


  onSearchInput() {
    if (
      this.search.length >= this.searchLimit &&
      SearchBoxPattern.test(this.search.trim())
    ) {
      this.invalidSearch = false;
    } else {
      this.invalidSearch = true;
    }
  }

 

  onSearch(isExtract? : boolean) {
    
    // if(this.searchPipe) {
      const selectedDepartment = this.departmentData.find((x: any) => x.Id == this.selectedDepartment);
      // if(this.timesheetdate){
      //   this.selectdate.emit(this.timesheetdate)
      // }
    if(selectedDepartment) {
      this.selectedDepartmentName = selectedDepartment.Name;
    } else {
      this.selectedDepartmentName = '';
    }
    let data = {
      selectedDEPT: this.selectedDepartmentName,
      searchText: this.search,
    }
    this.InputSearchEmit.emit(data);
    // } else {
    if (
      this.search.length >= this.searchLimit &&
      SearchBoxPattern.test(this.search?.trim())
    ) {
      // this.isLoading = true;
      this.isSearchApplied = true;
      this.invalidSearch = false;
      // this.searchEvent.emit(this.search);
      this.onDateChange(isExtract);
    } else if (this.isSearchApplied && this.search.length == 0) {
      this.invalidSearch = false;
      this.isSearchApplied = false;
      // this.isLoading = false;
      this.onDateChange(isExtract);
      // this.searchEvent.emit(this.search);
    } else {
      this.invalidSearch = true;
      this.isLoading = false;
      this.isSearchIconLoading = false;
    }
  // }
  }

  OnInputSearch() {
    const selectedDepartment = this.departmentData.find((x: any) => x.Id == this.selectedDepartment);
    if(selectedDepartment) {
      this.selectedDepartmentName = selectedDepartment.Name;
    } else {
      this.selectedDepartmentName = '';
    }
    let data = {
      selectedDEPT: this.selectedDepartmentName,
      searchText: this.search,
    }
    this.InputSearchEmit.emit(data);
  }

  onLimitChange() {
    this.limitChangeEvent.emit(this.pageLimit);
  }
  onPageLimitChange() {
    this.PageLimitChangeEvent.emit(this.pageLimit);
  }
  onEmployeeLimitChange(){
    this.EmpPagelimitChangeEvent.emit(this.pageLimitForEmployee);

  }
  masterDropDownChange(event:any) {
    
    // this.masterDropDownEvent.emit(event.target.value);
    this.selectedErrorId = event.target.value
    this.selectedLogId = event.target.value
    if(this.selectedErrorId!=undefined && this.selectedErrorId!=null && this.selectedErrorId!= ''
      ||this.selectedLogId!=undefined && this.selectedLogId!=null && this.selectedLogId!= ''
    ){
      this.masterErrorIDCheck = false
    }else{
      this.masterErrorIDCheck = true
    }
  }

 

  onDateChange(isExtract? : boolean) {
        const isFromValid = !this.fromDate || this.isValidDateString(this.fromDate);
    const isToValid = !this.toDate || this.isValidDateString(this.toDate);
    const isNextValid = !this.nextStepDate || this.isValidDateString(this.nextStepDate);

    this.invalidFromDate = !(isFromValid && isToValid && isNextValid);
    this.isGraterFromDate = false;
    if (this.invalidFromDate) {
      this.isDateApplied = false;
      this.isLoading = false;
      this.isSearchIconLoading = false;
      return;
    }
    if(this.empValidation && (this.selectedEmployee==undefined || this.selectedEmployee ==null || this.selectedEmployee ==''))
    {
      this.isEmployeeError=true;
    }
    else{
      this.isEmployeeError=false;
    }
    
    if(this.isSelectedDatemandatory && !this.fromDate ){
      this.datemandatory = true; 
    }else{
      this.datemandatory = false;
    }

    if(this.IsSiteMandatory && this.selectedSite.length ==0 && this.siteData && this.siteData.length >0){
      this.isSiteError = true
    }else{
      this.isSiteError = false
    }
    if (isPlatformBrowser(this.platformId)) {
      let date1 = new Date(this.fullFromDate);
      let date2 = new Date(this.fullToDate);
      if(!this.isStoreRequiredError && !this.datemandatory && !this.isSiteError){
      if(!this.isEmployeeError){
      if(!this.masterErrorIDCheck){
    if (this.fromDate != '' && this.toDate != '' ) {
      if (date1 > date2) {
        this.isGraterFromDate = true;
        this.isLoading = false;
        this.isSearchIconLoading=false;
        this.isDateApplied = false;
      } else {
        let curentDate = this.datePipe.transform(new Date(), 'dd/MM/yyyy');
        let changeToDate;
        if (this.fromDate != '') {
          changeToDate = this.toDate ? this.toDate : curentDate;
        } else {
          changeToDate = this.toDate;
        }
        
        let data = {
          fromDate: this.fromDate,
          toDate: changeToDate,
          nextStepDate: this.nextStepDate,
          searchText: (this.search ||'') ?.trim(),
          ErrorID:this.selectedErrorId,
          selectedLogId:this.selectedLogId,
          selectedStatus:this.selectedStatus,
          selectedFileType:this.selectedFileType,
          statusID:this.statusId,
          transporterId:this.transporterId,
          AlertType : this.alertType,
          selectedProjectId : this.selectedProjectId,
          selectedStatusId : this.selectedStatusId,
          selectedDepartment: this.selectedDepartment,
          selectedLead: this.selectedLead,
          selectDueDateAndNormalDates: this.selectDueDateAndNormalDates,
          selectedLeaveType : this.selectedLeaveType,
          selectedLeaveStatus : this.selectedLeaveStatus,
          selectedMonth: this.selectedMonth ||'',
          selectedYear: this.selectedYear,
          selectedEmployee:this.selectedEmployee,
          selectedreviewEmployeeStatus:this.selectedreviewEmployeeStatus,
          selectedEmployeeStatus : this.selectedEmployeeStatus,
          selectedEmployeeStatusForAdditionalWork : this.selectedEmployeeStatusForAdditionalWork,
          selectedStore : this.selectedStore,
          selectedCommonDropDownId : this.selectedCommonDropDownId,
          orderStatusId : this.selectedOrderStatus,
          selectedFulfilmentStatusId : this.selectedFulfilmentStatusId,
          selectedSite:this.selectedSite,
          selectedSiteLog: this.selectedSiteLog
        };
        this.isGraterFromDate = false;
        this.isDateApplied = true;
        if(!isExtract) {
        this.isLoading = true;
        }
        this.isSearchIconLoading = true;
        this.dateEvent.emit(data);
        this.ReportSearch.emit({FormData : data, isExtract : isExtract || false});
      }
    } else {
      let curentDate = this.datePipe.transform(new Date(), 'dd/MM/yyyy');
      let changeToDate;
      if (this.fromDate != '') {
        changeToDate = this.toDate ? this.toDate : curentDate;
      } else {
        changeToDate = this.toDate;
      }
      let data = {
        fromDate: this.fromDate,
        toDate: changeToDate,
        nextStepDate: this.nextStepDate,
        searchText: (this.search ||'') ?.trim(),
        ErrorID:this.selectedErrorId,
        selectedStatus:this.selectedStatus,
        selectedFileType:this.selectedFileType,
        statusID:this.statusId,
        transporterId:this.transporterId,
        selectedLogId:this.selectedLogId,
        AlertType : this.alertType,
        selectedProjectId : this.selectedProjectId,
        selectedStatusId : this.selectedStatusId,
        selectedDepartment: this.selectedDepartment,
        selectedLead: this.selectedLead,
        selectDueDateAndNormalDates: this.selectDueDateAndNormalDates,
        selectedLeaveType : this.selectedLeaveType,
        selectedLeaveStatus : this.selectedLeaveStatus,
        selectedMonth: this.selectedMonth ||'',
        selectedYear: this.selectedYear,
        selectedEmployee:this.selectedEmployee,
        selectedreviewEmployeeStatus:this.selectedreviewEmployeeStatus,
        selectedEmployeeStatus : this.selectedEmployeeStatus,
        selectedEmployeeStatusForAdditionalWork: this.selectedEmployeeStatusForAdditionalWork,
        selectedStore : this.selectedStore,
        selectedCommonDropDownId : this.selectedCommonDropDownId,
        orderStatusId : this.selectedOrderStatus,
        selectedFulfilmentStatusId:this.selectedFulfilmentStatusId,
        selectedSite:this.selectedSite,
        selectedSiteLog: this.selectedSiteLog
      };
      this.isGraterFromDate = false;
      this.isDateApplied = true;
      if (!isExtract) {
      this.isLoading = true;
      }
      this.isSearchIconLoading = true;
        this.dateEvent.emit(data);
        this.ReportSearch.emit({FormData : data, isExtract : isExtract || false});
    }
    if(this.searchPipe) {
      this.isLoading = false;
    }
    if(this.searchPipeforEmployee){
      this.isLoading = false;
    }
      }
    }
}
}
      const selectedDepartment = this.departmentData.find((x: any) => x.Id == this.selectedDepartment);
      if (selectedDepartment) {
        this.selectedDepartmentName = selectedDepartment.Name;
      } else {
        this.selectedDepartmentName = '';
      }
      let data = {
        selectedDEPT: this.selectedDepartmentName,
        searchText: this.search,
      }
      this.InputSearchEmit.emit(data);
}

  // Helper method to get ControlTypeConfigurationId based on isAllowFutureDate and isFromPendingSheet
  onDateInputChange(field: 'fromDate' | 'toDate' | 'nextStepDate', value: string): void {
    if (field === 'fromDate') {
      this.fromDate = value || '';
      if (!this.isValidDateString(this.fromDate)) {
        this.fullFromDate = null;
      }
    } else if (field === 'toDate') {
      this.toDate = value || '';
      if (!this.isValidDateString(this.toDate)) {
        this.fullToDate = null;
      }
    } else if (field === 'nextStepDate') {
      this.nextStepDate = value || '';
    }

    const isFromValid = !this.fromDate || this.isValidDateString(this.fromDate);
    const isToValid = !this.toDate || this.isValidDateString(this.toDate);
    const isNextValid = !this.nextStepDate || this.isValidDateString(this.nextStepDate);

    this.invalidFromDate = !(isFromValid && isToValid && isNextValid);
    // Always clear range error while user is typing/editing
    this.isGraterFromDate = false;
  }
  private isValidDateString(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') {
      return false;
    }

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

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return false;
    }

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return false;
    }

    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  }
  getControlTypeConfigurationId(): string | undefined {
    // If isFromList is true (which means !isAllowFutureDate), restrict to past dates
    // If isPendingSheet, use yesterday as max date, otherwise today
    // This maps to AllowPastDateOnly
    if (!this.isAllowFutureDate) {
      return DSControlTypeConfigurationGuid.AllowPastDateOnly;
    }
    // If isAllowFutureDate is true, no restriction
    return undefined;
  }

  // Helper method for nextStepDate - always restrict to past dates (isFromList = true)
  getControlTypeConfigurationIdForNextStep(): string | undefined {
    return DSControlTypeConfigurationGuid.AllowPastDateOnly;
  }
  clearFilter(){
    this.isGraterFromDate = false;
    this.search = '';
    this.fromDate = '';
    this.toDate = '';
    this.nextStepDate = '';
    let data = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      searchText: this.search,
    };
    this.isClearLoading = true;
    this.isSearchIconLoading = true;
    this.clearFilterEvent.emit(data);
  }

  uploadFile(event:any, type:string){
    // if(type== 'fileStatus'){
    //   this.selectedStatus = event.target.value
    // }
  }

  onChangeOrderStatus(event: any) {
    // this.changeOrderStatus.emit(event);
  }
  onChangeLeadName(event: any) {
    this.changeLeadName.emit(event);
  }

  statusOrTranspChange(event:any, type:string){
    if(type == 'status'){
      this.statusId = event?.Id;
    }
    else if(type == 'transporter'){
      this.transporterId = event?.Id;
    }
  }

  onExtract(){
    this.onDateChange()
    }

    changeStore(){
      
      if(this.selectedStore != undefined && this.selectedStore != null && this.selectedStore != ''){
        this.isStoreRequiredError = false;
      }
      else{
        this.isStoreRequiredError = true;
      }
    }

    clearEmployeeDetails () {
      this.employeeSearchData  = [];
    }
   onEmployeeSearchChange(event: { term: string }) {
  const term = event.term || '';
  this.searching = term.length > 2;

  if (this.searching) {
    const req: any = {
      Active: 'true',
      SearchWord: term,
      Code : term,
      MasterDataCode: masters.HRMSEmployee
    };

    this.noRecordsFound = 'Loading...';

    this.http.post(GetMastersAPI, req).subscribe({
      next: (res: any) => {
        if (res?.Data?.length && res.ReturnCode === 0) {
          this.employeeSearchData = res.Data;
        } else {
          this.employeeSearchData = [];
          this.noRecordsFound = 'No items found';
        }
        this.searching = false;
      },
      error: () => {
        this.employeeSearchData = [];
        this.noRecordsFound = 'No items found';
        this.searching = false;
      }
    });
  } else {
    this.employeeSearchData = [];
    this.noRecordsFound = 'No items found';
    this.searching = false;
  }
}
    onEmployeeNotSelect(event:any){
      if(event.target.value == '' && !this.selectedEmployee){
        this.employeeSearchData = []
        this.searching = false;
      }
    }

    preventEnter(event:any){
      
      if(event){
        event.stopPropagation();
      }
    }
    onDropdownChange(event:any){
      
      if(event && event.Id && this.empValidation){
        this.isEmployeeError = false;

      }else if(!event  && this.empValidation){
        this.isEmployeeError = true;
      }

    }
    getSelectedSite(event:any,type:string){
      if(event && this.IsSiteMandatory && this.selectedSite.length >0){
        this.isSiteError = false;
      }
      else if(event  && this.IsSiteMandatory && this.selectedSite.length  == 0){
        this.isSiteError = true;
      }
    }
    getSelectedAllType(event:any,type:string){

      if(type =='SelectAll'){
        this.selectedSite = [];
        this.selectedSite = event;
      }else{
        this.selectedSite = [];
      }
      
        if(event && event.length >0 && this.IsSiteMandatory && this.selectedSite && this.selectedSite.length >0 ){
          this.isSiteError = false;
        }else if(event && event.length ==0 && this.IsSiteMandatory && this.selectedSite && this.selectedSite.length == 0){
          this.isSiteError = true;
        }
    }
    
}









