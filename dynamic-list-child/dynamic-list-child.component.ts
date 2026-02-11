import {
  Component,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {  ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { environment } from 'src/environments/environment';
import { SearchBoxPattern } from 'src/app/InputPatterns/input-pattern';
import { StorageService } from 'src/app/storageService/storage-service';
import {
  InvalidSearch,
  InvalidSearchInput,
} from 'src/app/ErrorMessages/ErrorMessages';
import { CommonService } from 'src/app/services/common/common.service';
import {
  APIPREFIX,
  DownloadPatientAppointment,
  EnableNonDevelopedSection,
  GetControlsByModuleCode,
  GetSchema,
  MINFORMLENGTH,
  MultiLangEnabledRoots,
  Publish,
  RootEnum,
  apiURL,
} from 'src/app/constants/constants';
import { JsonFormControls } from '../add-page/schema.model';
import { MetaServiceService } from 'src/app/shared/SEO/meta-service.service';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { DynamicSearchCardComponent } from 'src/app/shared/components/dynamic-search-card/dynamic-search-card.component';
import { filter, Subject, Subscription, takeUntil } from 'rxjs';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { CustomTranslatePipe } from 'src/app/shared/pipes/custom-translate.pipe';
import { TablePipe } from 'src/app/shared/pipes/table.pipe';
import * as FileSaver from "file-saver";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RoutesObj } from 'src/app/routes.config';
declare var $:any;
 
enum TemplateCodes {
  SMSLOG =  'SMSL-10351',
  TEMPLOG = 'STREL-10350',
  Doctor='HLTEMP-10741'
}
 
enum ModuleUrls {
  EMAILLOG = 'emaillog/list',
  SMSLOG = 'smslog/list',
  MODEOFACTIVITY = 'modeofactivity/list',
  WHATSAPPLOG ='whatsapplog/list',
  NOTIFICATIONLOG ='notificationlog/list',
  NEWSLETTER = 'NewsLetterSignUp/list',
  taxtype = "financetaxtype/list",
  accounttype = "accounttype/list",
  doctorPrescription = "doctorprescription/list",
  EmpStatus ='employeestatus/list',
  DoctorPreciption = 'DoctorPrescription/list',
  TDSTCSType='FinanceTaxType/list',
  DeducteeType= "DeducteeType/list",
  PaymentMethod = "PaymentMethod/list",
  PurchaseJournal = 'FinanceJournal/list',
  PaymentVoucher = 'PaymentVoucher/list',
  DebitNote = 'DebitNote/list',
  ReceiptVoucher = 'ReceiptVoucher/list',
  SalesJournal = 'SalesJournal/list',
  CreditNote = 'CreditNote/list',
  ContraVoucher ='ContraVoucher/list',
  GenericJournalVoucher = 'GenericJournalVoucher/list',
  JobSeekerProfile = 'jobseekerprofile/list',
  Ledger='FinanceLedger/list',
  ConsultancyAssignment='ConsultancyAssignment/list',
  CandidateSubmission='CandidateSubmission/list',
  HRResumereview='HRResumeReview/list',
  investorapproval='investorpaymentapproval/list',
  PaymentGateway ='paymentgateway/list',
}
enum ActionColumnExcludedModules {
  EmployeeWorkScheduleNotification = '/HRMS/EmployeeWorkScheduleNotification/list',
  
}
 
@Component({
  selector: 'app-dynamic-list-child',
  templateUrl: './dynamic-list-child.component.html',
  styleUrls: ['./dynamic-list-child.component.css']
})
export class DynamicListChildComponent implements OnInit , OnDestroy{
 @Input() moduleUrl: string = '';
 @Input() placeholder: string = '';
 @Input() title: string = '';
 @Input()templateName:string="";
 @Input()templeteCodeJson:string="";
 @Input() moduleCode: string = '';
 @Input() templateCode : string = ''
 @Input() isSearchandTitleDisplay : boolean = true
 @Input() modulePermisionObj:{[index:string]:any}={};
 @Input() isSingleView:boolean = false;
 viewMoreData: any[] = [];
 @Input() isOnlySearchShow : boolean = false
 @Output() openPopupEvent = new EventEmitter()
 @Input() moduleId:string ='';
 tableApi: any;
 isShowAddBtn : boolean = true;
 isPublishExist : boolean = false;
  search: string = '';
  currentPage: number = 1;
  pageLimit: number = 10;
  isLoading: boolean = false;
  invalidSearch: boolean = false;
  isSearchIconLoading:boolean= false;
  headerArr: any[] = [];
  tableDataArr: any[] = [];
  isNoRecords: boolean = false;
  rowCount: any;
  apiURL = environment.APIURL + '/api/';
  tableData: any[] = [];
  isSearchApplied: boolean = false;
  isAllowPermission: boolean = false;
  inValidSearchInput: string = InvalidSearchInput;
  invalidSearchErr: string = InvalidSearch;
  returnMsg: string = '';
  modules: any;
  formData: JsonFormControls[] = [];
  schemaData: any;
  fromDate:string='';
  toDate:string='';
  isBrowser:boolean = false;
  isWorkFlow : boolean = false;
  formLength = MINFORMLENGTH;
  SiteURL: string="";
  isClearLoading:boolean = false;
  isModulePopUp: boolean = false;
  isDisabled:boolean=false;
  loadingData: boolean = false;
  onPageLoadLoader:boolean = true;
  EnableNonDevelopedSection: number = EnableNonDevelopedSection;
  alertArray : any[] = [];
  alertType : string = ''
  isView: boolean = false;
  listDataReq: any = {};
  moduleurls = ModuleUrls;
  url : string = '';
  @ViewChild('searchCard', { static: false }) searchCard! : DynamicSearchCardComponent;
  root: string = '';
  rootEnum = RootEnum;
  commonRoot : string = '';
  multiLangEnabledRoots: any = MultiLangEnabledRoots;
 destroy$ = new Subject<void>();
 changedetect :  boolean = false;
 isNewsLetterSignup : boolean = false;
 tableDataEllipsisObj:{[index:string]:number} = {}
 isMobileToolTip:boolean =false;
 isDisplayPrintOption:boolean = false;
 headerObj : any = {}
 viewMoreHeader : string = ''
 @ViewChild('viewMorepopup', { static: false }) viewMorepopup!: any;
 faModulesTemplates:any[]=['FinanceJournal-10547','FinancePaymentVoucher-10667','FinanceReceiptVoucher-10668','DebitNoteVoucher-10732','GJV-10752','SFJ-10754','CreditNoteVoucher-10755','ContraVoucher-10714','FNCLGR-10486']
 isRouteToModify:boolean=true;
 isFaModule:boolean=false;
 
  constructor(
     
    public http: HelperModuleService,
    public storage: StorageService,
    public common: CommonService,
    public router: Router,
    private SEO:MetaServiceService,
    public datePipe: DatePipe,
    @Inject(PLATFORM_ID) public platformId: any,
    private actRoute: ActivatedRoute,
    public multiLanguageService: MultilanguageService,
    private customTranslatePipe : CustomTranslatePipe,
    public DateTimePipe: TablePipe,
    public httpclient: HttpClient,
     public modalService: NgbModal,
     
 ) { 
    
  this.url = this.router.url.replace('/','')
 }
  private getRouteId(): string {
    let current: ActivatedRoute | null = this.actRoute;
    while (current) {
      const id = current.snapshot?.paramMap?.get('id');
      if (id) return id;
      current = current.parent;
    }
    return '';
  }
  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }
isAllowedRoute(): boolean {
  const url = this.router.url.toLowerCase();
  const allowedRoutes = [
    '/hrms/hrmsconsultancy/list',
    '/hrms/scheduleinterview/list',
    '/hrms/candidate/list',
    '/hrms/candidatemedicalreport/list',
    '/hrms/preonboarding/list',
    '/hrms/hrmsbackgroundverification/list',
    '/hrms/onboard/list',
    '/hrms/onboardingsendmail/list'
  ];
  return allowedRoutes.includes(url);
}
getCreatedTooltip(item: any, data: any): string {
  const createdBy = item[data.HeaderName];
  const createdDate = new Date(item.DateCreated).toLocaleString();
  return `Created by: ${createdBy}\nOn: ${createdDate}`;
}
  ngOnInit(): void {
    if(isPlatformBrowser(this.platformId)){
      this.isBrowser = true;
      let getWidth = $(window).width();
      if (getWidth && getWidth < 999) {
        this.isMobileToolTip = true;
      }else{
        this.isMobileToolTip = false;
      }
    }else{
      this.isBrowser= false;
    }
 
    if(this.moduleCode == 'HRMSLeaveType'){
      this.isPublishExist = false;
    }
 
    this.actRoute.params.subscribe(params =>{
      this.root = this.router.url.split('/')[1]|| '';
    
    })
   
 
    this.multiLanguageService.selectedLanguageUpdation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        
        this.changedetect = !this.changedetect;
      });
  
 
    if(this.storage.getLocalStorage('siteUrl')){
      let url = this.storage.getLocalStorage('siteUrl') || '';
 
      this.SiteURL = url.split('.')[0].split('//')[1];
    }else{
      this.SiteURL =''
    }
    this.SEO.updateTags("","",' ' + '-' + ' ' +this.templateName+' List' );
    
    if(this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.SMSLOG) ||
     this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.EMAILLOG) || 
     this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.WHATSAPPLOG) ||
    //  this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.taxtype) ||
     this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.accounttype) ||
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.EmpStatus)  || 
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.NOTIFICATIONLOG)
     
    ){
      this.isView = true;
    }
 
     // if(this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.doctorPrescription)|| this.router.url?.replace('/','')?.includes(ModuleUrls.TDSTCSType)  || this.router.url?.replace('/','')?.includes(ModuleUrls.DeducteeType)|| this.router.url?.replace('/','')?.includes(ModuleUrls.PaymentMethod) ) {
    //   this.isShowAddBtn = false;
    // }
    if (
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.doctorPrescription) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.TDSTCSType) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.DeducteeType) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.PaymentMethod) ||
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.JobSeekerProfile) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.ConsultancyAssignment) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.CandidateSubmission) ||
      this.router.url?.replace('/','')?.includes(ModuleUrls.HRResumereview) ||
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.investorapproval) ||
      this.router.url?.replace('/','')?.toLowerCase()?.includes(ModuleUrls.PaymentGateway) 
    ) {
      this.isShowAddBtn = false;
    }
 
    if( this.router.url?.replace('/','')?.includes(ModuleUrls.NEWSLETTER) ){
      this.isNewsLetterSignup = true;
    }
    if(this.router.url?.replace('/','')?.includes(ModuleUrls.DoctorPreciption)){
      this.isDisplayPrintOption = true;
    }else{
      this.isDisplayPrintOption = false;
    }
    if(this.router.url?.replace('/','')?.includes(ModuleUrls.PurchaseJournal) ||
    this.router.url?.replace('/','')?.includes(ModuleUrls.DebitNote)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.ReceiptVoucher)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.PaymentVoucher)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.ContraVoucher)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.SalesJournal)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.GenericJournalVoucher)||
    this.router.url?.replace('/','')?.includes(ModuleUrls.CreditNote)){
    this.isFaModule=true;
    }else{
    this.isFaModule=false;
    }
 
    if (this.templateCode == TemplateCodes.Doctor) {
      this.isRouteToModify = false;
    } else {
      this.isRouteToModify = true;
    }
    this.getSchema()
 
     setTimeout(() => {
        console.log(this.modulePermisionObj);
      //  this.modulePermisionObj['Create/Update'] = false ;
     }, 6050);
const currentUrl = this.router.url.split('?')[0].split('#')[0] || '';
  this.isActionColumnVisible = this.isActionColumnNeeded(currentUrl);
  }
  isActionColumnVisible:boolean = true;
 
private isActionColumnNeeded(currentUrl: string): boolean {
  const excludedUrls = Object.values(ActionColumnExcludedModules).map(url => url.toLowerCase());
  return !excludedUrls.some(excluded => currentUrl.toLowerCase().includes(excluded));
}
  /**
   *  @Description
   *   For getting JSON Schema requires fro ADD/Modifiy page
   */
  getSchema() {
    this.listDataReq = {};
    if (this.moduleCode) {
      this.onPageLoadLoader = true;
      this.http.getService(GetSchema + this.templeteCodeJson).subscribe(
        (formData: any) => {
          this.handlSchemaData(formData)
        },
        (error) => {
          /**
           * Calling @GetControlsByModuleCode API as fall back in case of JSON failure.
           */
 
          let req = {
            ModuleCode: this.templateCode,
          };
          this.http
            .postService(GetControlsByModuleCode, req)
            .subscribe((formData) => {
              if (formData && formData.ReturnCode == 0) {
                this.handlSchemaData(formData);
              } else {
                this.loadingData = false;
                this.onPageLoadLoader = false;
                if(formData.ReturnCode != 19){
                this.common.changeIsFailureeMessage(true);
                this.common.changeResponseMessage(
                 this.customTranslatePipe.transform(formData.ReturnMessage || '',this.changedetect,this.root) 
                );
                this.router.navigate(['']);
                this.onPageLoadLoader = false;
                }
                
              }
            }, 
            (error) =>{
              this.common.changeIsFailureeMessage(true);
                this.common.changeResponseMessage(
                   this.customTranslatePipe.transform( "Coudn't load " + this.title + ' please try later.' || '',this.changedetect,this.root) 
                );
                this.router.navigate(['']);
                this.onPageLoadLoader = false;
            }
            );
        }
      );
    } else {
      this.router.navigate(['']);
      this.onPageLoadLoader = false;
    }
  }
isShowAddBtnForRequisition(): boolean {
  if(this.url == 'HRMS/Candidate/list' || this.url=='HRMS/FeedbackQuestionResult/list' || this.url =='HRMS/ScheduleInterview/list'|| this.url =='HRMS/CandidateMedicalReport/list' || this.url =='HRMS/HRMSBackgroundVerification/list'|| this.url =='HRMS/OnBoard/list'){
    return false;
  }
  if (this.url === 'HRMS/RaiseRequisition/list') {
    if (this.modulePermisionObj?.['Admin View']) {
      return false;
    }
    return true; 
  }

  return true; 
}
  handlSchemaData(formData: any) {
    this.schemaData = formData;
    if ((this.templateCode == 'HRMSEMP-308' || this.templateCode == 'HRMSClient-31004' || this.templateCode == 'HRMSASMTINT-10490' || this.templateCode == 'HLTEMP-10734') && this.schemaData.APIUrls && this.schemaData.APIUrls[0]) {
      this.schemaData.APIUrls[0].isSingleView = true;
    }
          
         
          // Special condition for hiding department field in (HRMS)Raise Requisition module (Filter section) for non admin users.
          if (this.schemaData?.ParentTemplateName === 'Raise Requisition' && !this.modulePermisionObj['Admin View']) {
        
              const departmentField = this.schemaData.FiltersDataList.find(
              (field : any ) => field.Label?.toLowerCase() == 'department'
              );

              if (departmentField) {
                departmentField.isHideFieldInUI = true;
              }
           
          }
    //this.isPopUpModal = this.schemaData?.APIUrls[0].IsModulePopUp;
    this.formData = formData?.Data;
    this.isModulePopUp = formData?.APIUrls[0]?.IsModulePopUp
 
    if (formData.APIUrls[0].GetBySearchURL?.includes('/api')) {
      this.tableApi = apiURL + '/' + formData.APIUrls[0].GetBySearchURL;
    } else {
      this.tableApi = APIPREFIX + formData.APIUrls[0].GetBySearchURL;
    }
    let FiltersDataList = formData?.FiltersDataList;
    if (FiltersDataList) {
      FiltersDataList.forEach((el: any) => {
        if (el.FormField) {
          this.listDataReq[el.FormField] = '';
        }
      });
    }
 
    let listData = this.storage.getSessionStorage('listData');
    if (listData) {
 
      let parsedData = JSON.parse(listData);
 
      if (parsedData.templateCode == this.templateCode && parsedData.searchData) {
 
        this.currentPage = parsedData.currentPage;
        this.pageLimit = parsedData.pageLimit;

        try {
          this.schemaData.FiltersDataList.forEach((el: JsonFormControls) => {
            if (el.Type?.toLowerCase() == 'multicheckbox') {
              if (parsedData.searchData[el.FormField]) {
                let val = parsedData.searchData[el.FormField];
                val = val.map((x: any) => x.Id);
                if (val && val.length > 0) {
                  parsedData.searchData[el.FormField] = val.join();
                } else {
                  parsedData.searchData[el.FormField] = '';
                }
              }
            }
          })
        } catch (error) {
          console.log(error);
        }
       
 
        this.onDateChange(parsedData.searchData, true)
 
      } else {
 
        this.storage.deleteSessionStorage('listData')
        this.getList();
      }
 
    } else {
 
      this.getList();
    }
  }
 
  /**
   * @description For getting the liet items of the current module.
   */
  getList(isPageLoad?:boolean,isExtract?:boolean) {
    if(this.isBrowser){
      const parentId = this.getRouteId();
      this.listDataReq['PageSize'] = this.pageLimit?.toString();
      this.listDataReq['PageNumber'] = this.currentPage?.toString();
      this.listDataReq['ModuleCode'] = this.templateCode?.toString();
      if(isExtract){
        this.listDataReq['Extract'] = isExtract?'true':null;
      }
      if(parentId){
        this.listDataReq['Code'] = parentId
      }
      // Setting current date to ToDate field if FromDate having value
      let curentDate = this.datePipe.transform(new Date(), 'dd/MM/yyyy');
      let fromDateValue = this.listDataReq['FromDate']
      let toDateValue = this.listDataReq['ToDate']
      if(fromDateValue !='' && toDateValue == ''){
        let date = new Date();
        let currentYear = date.getFullYear()
        const maxDate = new Date(currentYear + 10, 11, 31, 23, 59, 59, 999);
  
        this.listDataReq['ToDate'] = this.datePipe.transform(maxDate, 'dd/MM/yyyy');
      }

      this.listDataReq['SearchTypeId'] = this.modulePermisionObj['Admin View'] ? '1' : '0';   
       if(this.url?.toLowerCase().includes('page/list')){
         this.listDataReq['SearchTypeId'] = '2';
       }
      let req = {
        searchWord: this.search || '',
        pageNumber: this.currentPage.toString(),
        pageSize: this.pageLimit.toString(),
        ModuleCode: this.templateCode,
        FromDate:this.fromDate,
        ToDate:this.toDate,
        Code : this.alertType || parentId ||'',
       
      };
 
      this.http.postService(this.tableApi, this.listDataReq).subscribe({
        next: (res: any) => {
 
          this.processListResponse(res, isPageLoad)
        },
        error: (err: any) => {
          this.loadingData = false;
          this.isNoRecords = true;
          this.isLoading = false;
          this.isSearchIconLoading = false;
          this.isClearLoading = false;
          this.onPageLoadLoader = false;
        },
      });
    }
   
  }
 
  processListResponse(res: any, isStorage ?:boolean ){
    if (res != undefined && res != null && res != '') {
      this.loadingData = false;
      if (
        res.Headers != undefined &&
        res.Headers != null &&
        res.Headers != ''
      ) {
        this.headerArr = [];
        this.tableDataArr = [];
        this.tableDataEllipsisObj = {}
  
        let header: any = res.Headers;
 
        header.forEach((item: any) => {
          if (
            item.HeaderName != 'DateCreated' ||
            item.HeaderDisplayName != 'Date Created'
          ) {
            let headerData: any = item;
            let headerName: any = item.HeaderDisplayName;
            let ellipsisLength:number = item.HeaderValueLength ? item.HeaderValueLength : 0;
 
            this.headerArr.push(headerName);
            this.headerObj[item.HeaderName] = headerName;
            this.tableDataArr.push(headerData);
            this.tableDataEllipsisObj[item.HeaderName] = ellipsisLength;
 
            // console.log(this.tableDataEllipsisObj)
            if(this.moduleCode != 'HRMSLeaveType'){
              this.isPublishExist  = true;
            }
          }
        });
      }
      if (res.Data != undefined && res.Data != null && res.Data != '') {
        this.tableData = res.Data;
 
        try {
          if (this.faModulesTemplates.includes(this.templateCode)) {
            this.tableData.forEach((el: any) => {
              if (el &&
                (el.VoucherStatus && (el.VoucherStatus?.toLowerCase() == 'invalid' || el.VoucherStatus?.toLowerCase() == 'reject')) ||
                (el.JournalStatus && (el.JournalStatus?.toLowerCase() == 'invalid' || el.JournalStatus?.toLowerCase() == 'reject') || this.templateCode == 'FNCLGR-10486')
              ) {
                el['IsLocked'] = true;
              }
            });
          }
        } catch (error) {
          console.log(error);
        }
        
        if(!isStorage){
        let searchCardFormValue = '';
        if(this.searchCard){
          searchCardFormValue = this.searchCard.searchForm.value;
        }
 
        let sessionData = {
          searchData : searchCardFormValue,
         
          templateCode : this.templateCode,
          currentPage : this.currentPage,
          pageLimit : this.pageLimit
        }
        this.storage.setSessionStorage( 'listData' ,JSON.stringify(sessionData) );
      }
        this.rowCount = res.Data[0].RecordCount;
        this.isNoRecords = false;
        this.isLoading = false;
        this.isSearchIconLoading = false;
        this.isClearLoading = false;
        
        if( this.schemaData?.APIUrls?.[0]?.isSingleView || this.isSingleView){
            this.openAddOrEditPage('edit',res.Data[0])
        }
      } else {
        this.tableData = [];
        this.rowCount = 0;
        this.isNoRecords = res.ReturnCode == 19 ? false : true;
        this.isLoading = false;
        this.isSearchIconLoading = false;
        this.isClearLoading = false;
        this.isAllowPermission = res.ReturnCode == 19 ? true : false;
        this.returnMsg =
          this.isAllowPermission == true ? res.ReturnMessage : '';
      }
      this.onPageLoadLoader = false;
    } else {
      this.loadingData = false;
      this.isNoRecords = true;
      this.isLoading = false;
      this.isSearchIconLoading = false;
      this.isClearLoading = false;
      this.onPageLoadLoader = false;
    }
 
  }
 
  /**
   * This method will be called on Input in the search box.
   */
  // onSearchInput() {
  //   if (this.search.length > 3 && SearchBoxPattern.test(this.search.trim())) {
  //     this.invalidSearch = false;
  //   } else {
  //     this.invalidSearch = true;
  //   }
  // }
 
  /**
   * @description This method will be called on submit.
   */
  
  onSearch(searchText: string) {
    this.search = searchText;
    this.currentPage = 1;
    this.isLoading = true;
    this.getList();
  }
 
  onLimitChange(pageLimit: number) {
    this.loadingData = true;
    this.pageLimit = pageLimit;
    this.currentPage = 1;
    this.getList();
  }
 
  onPaginateChange(event: any) {
    this.loadingData = true;
    this.currentPage = event.CurrentPage;
    this.pageLimit = event.pageLimit;
    this.getList();
  }
  openAddOrEditPage(type: any, item?: any) {

    this.isWorkFlow = this.router.url?.toLowerCase().includes('workflow/list');
    if(!this.isWorkFlow){
    if(this.isFaModule?(this.modulePermisionObj['Post'] || this.modulePermisionObj['Draft'])
      : (this.modulePermisionObj['Create/Update']) ) {
    this.storage.setSessionStorage(
      `${this.templateCode}formData`,
      JSON.stringify(this.schemaData)
    );
      this.storage.setSessionStorage('SelectedListRecord', JSON.stringify(item));
    
    if (!this.schemaData?.APIUrls[0]?.IsModulePopUp && this.isSearchandTitleDisplay) {
    
      if (type == 'add') {
        this.storage.deleteSessionStorage(this.templateCode + 'Id');
 
        this.router.navigate([`${this.moduleUrl}/add`]);
      } else {
        if(this.templateCode == 'PaymentGateway-71423'){
          this.storage.setSessionStorage('PaymentGatewaySiteID',item?.SiteId||'')
        }

         if(this.router.url.includes(RoutesObj.CreateRFQList)){
          let tabs = this.schemaData.AllTabs;
          let matchedTab = tabs.find((tab:any) => tab.TemplateCode === item.APITemplateCode);
          let matchedIndex = matchedTab ? tabs.indexOf(matchedTab) : -1;
          // Dynamically pick the next tab if matchedIndex is valid and not the last tab
          if (matchedIndex !== -1 && matchedIndex < tabs.length - 1) {
            matchedTab = tabs[matchedIndex + 1];
            matchedIndex = matchedIndex + 1;
          }
          this.storage.setSessionStorage('DrafStatus',item.RFQStatusId);
          this.storage.setSessionStorage('DrafStatusName',item.RFQStatusName);
          this.storage.setSessionStorage('SavedRFQId',JSON.stringify(item.Id)||'')
          this.storage.setSessionStorage(matchedTab?.TemplateCode + 'Id', item['Id']);
          this.storage.setSessionStorage('SavedTemplate', matchedIndex);
          this.storage.setSessionStorage('templeteCode', JSON.stringify(matchedTab));
        } 
        const itemId = item['Id'];
        if(this.isView || item.IsLocked ){
          this.router.navigate([`${this.moduleUrl}/view`, itemId]);
        }else{
 
          this.router.navigate([`${this.moduleUrl}/modify`, itemId]);
        }
      }
    } else {
      if (type == 'add') {
        this.storage.deleteSessionStorage(this.templateCode + 'Id');
        
        this.openPopupEvent.emit({ isEdit: false, id: '' })
      } else {
        
        this.openPopupEvent.emit({ isEdit: true, id: item?.Id || '' })
 
      }
      // this.openPop = true;
      
    }
  } else if(this.modulePermisionObj['View']){
       this.storage.setSessionStorage(
      `${this.templateCode}formData`,
      JSON.stringify(this.schemaData)
    );
    
      console.log(item['Id'])
      // no-op: avoid storing record id in session storage
      if(this.schemaData?.APIUrls[0]?.IsModulePopUp){
        this.openPopupEvent.emit({ isEdit: true, isViewPopup: true, id: item?.Id || '' })
      }else{
        const itemId = item['Id'];
        this.router.navigate([`${this.moduleUrl}/view`, itemId]);
      }
      
     
       
  }
}else{
  debugger;
     this.moduleUrl = this.moduleUrl?.replace('/list','');
    if (!this.modulePermisionObj['Create/Update']) {
      return;
    }
    this.storage.setSessionStorage(`${this.templateCode}formData`, JSON.stringify(this.schemaData));
    if (!this.schemaData?.APIUrls[0]?.IsModulePopUp && this.isSearchandTitleDisplay) {
      // For normal navigation-based flows, honor isRouteToModify
      if (!this.isRouteToModify) {
        return;
      }
    
      if (type == 'add') {
        this.storage.deleteSessionStorage(this.templateCode + 'Id');
        this.storage.deleteSessionStorage('RDLCSelectedItem');

        this.router.navigate([`${this.moduleUrl}/add`]);
      } else if (item && item['Id']) {
        this.storage.setSessionStorage('RDLCSelectedItem', JSON.stringify(item));
        
        const itemId = item['Id'];
        if(this.isView || item.IsLocked ){
          this.router.navigate([`${this.moduleUrl}/view`, itemId]);
        }else{

          this.router.navigate([`${this.moduleUrl}/modify`, itemId]);
        }
      }
    } else {
      if (type == 'add') {
        this.storage.deleteSessionStorage(this.templateCode + 'Id');
        this.storage.deleteSessionStorage('RDLCSelectedItem');

        this.openPopupEvent.emit({ isEdit: false, id: '' });
      } else if (item && item['Id']) {
        this.storage.setSessionStorage('RDLCSelectedItem', JSON.stringify(item));

        this.openPopupEvent.emit({ isEdit: true, id: item?.Id || '' });
      }
      // this.openPop = true;
      
    }
  

}
}
 
 
  onDateChange(event:any,isPageLoad? : boolean){
    
    this.listDataReq = structuredClone(event);
    Object.entries(this.listDataReq).forEach(([key,value]:any)=>{
      if(!value){
        this.listDataReq[key] = "";
      }
    });
    this.loadingData = true;
    this.fromDate = event.fromDate;
    this.toDate = event.toDate;
    this.search = event.searchText;
    this.alertType = event.AlertType || undefined;
    this.isLoading = true;
    if(!isPageLoad){
      
      this.currentPage = 1;
      this.isSearchIconLoading = true;
    }
    this.getList(isPageLoad);
  }
 
  clearFilters(event:any){
    this.fromDate = event.fromDate;
    this.toDate = event.toDate;
    this.search = event.searchText;
    this.currentPage = 1;
    this.isSearchIconLoading = true;
    this.isClearLoading =  true;
    this.getList();
  }
  publishOrUnpublish(data:any){
    this.isDisabled = true;
    let req = {
      "ModuleCode": this.templateCode,
      "IsPublished": !data.IsPublished,
      "Id": data.Id
    }
 
    if(this.templateCode == 'HLTEMP-10741') {
      req['IsPublished'] = false;
    }
 
    this.http.postService(Publish, req).subscribe({
      next: (res: any) => {
        this.isDisabled = false;
        if (res) {
          if (res.ReturnCode == 0) {
            if(this.templateCode == 'HLTEMP-10741') {
            this.common.changeIsSuccesseMessage(true);            
            this.common.changeResponseMessage(this.customTranslatePipe.transform('Successfully deleted the doctor',this.changedetect,this.root) ); 
            }
            this.getList();
          }
          else {
          
            this.common.changeIsFailureeMessage(true);            
            this.common.changeResponseMessage(this.customTranslatePipe.transform(res.ReturnMessage || '',this.changedetect,this.root) ); 
              
          }
        }
        else {
        
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage( this.customTranslatePipe.transform("Couldn't proceed at this time.",this.changedetect,this.root) );
        }
      },
      error: (err: any) => {
        this.isDisabled = false;
        console.log(err);
      }
    });
  }
 
  downloadPDF(type : any) {
    
    // this.isSaveLoading = true;
    let FromTime = this.datePipe.transform(type.DateCreated, 'dd/MM/YYYY') || '';
    // let fileName =  type.AppointmentNumber + '-' + type.FirstName +'-'+ FromTime;
    let fileName = `${type.AppointmentNumber?type.AppointmentNumber +'-':''} ${type.FirstName?type.FirstName+'-':''}${FromTime}`
    let req = {
      "Code": type.Id,
      "DocumentTypeId":"1",
      "ModuleId":this.moduleId ||''
    }
 
    this.httpclient.post(
      DownloadPatientAppointment, req, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'arraybuffer' // Ensure responseType is 'arraybuffer'
    }).subscribe((response: ArrayBuffer) => {
      try {
        const text = new TextDecoder('utf-8').decode(response);
        const jsonData = JSON.parse(text);
        if (jsonData != undefined && jsonData != null && jsonData != '' && jsonData.ReturnCode != 0) {
          let msg = jsonData.ReturnMessage;
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage(msg);
          // this.isSaveLoading = false;
        }
      } catch (error) {
        if (response !== undefined && response != null) {
          const blob = new Blob([response], { type: 'application/pdf' });
          FileSaver.saveAs(blob, fileName);
          // this.isSaveLoading = false;
        }
      }
 
    });
  }
 
  onViewMore(event : Event, data : any, headerData : any){
    event.stopPropagation();
    
    this.viewMoreData = []
    this.viewMoreHeader = '';
    if(data){
      this.viewMoreHeader = this.headerObj[headerData];
      
      this.viewMoreData = data.split(',');
 
      this.modalService.open(this.viewMorepopup, { backdrop: 'static', keyboard: false });
    }
  
  }
 
  close(){
    this.modalService.dismissAll();
  }
  getAssignedEmployeesPreview(value: string): string {
    if (!value) return '';
    const names = value.split(',').map(n => n.trim());
    return names.slice(0, 10).join(', ');
  }
  
  getRemainingEmployeeCount(value: string): number {
    if (!value) return 0;
    const names = value.split(',').map(n => n.trim());
    return names.length > 10 ? names.length - 10 : 0;
  }
  
  getRemainingEmployeesAsString(value: string): string {
    if (!value) return '';
    const names = value.split(',').map(n => n.trim());
    return names.length > 10 ? names.slice(10).join(', ') : '';
  }
  
getEllipsedData(value: string, headerName: string): string {
  if (!value) return '';

  let limit = this.tableDataEllipsisObj?.[headerName] ?? 40;
  if (limit === 0) {
    limit = 40; // default to 40 if explicitly set to 0
  }

  return value.length > limit ? value.slice(0, limit) + '...' : value;
}


  public downloadResume(item: any) {
    item.loadingAction = 'download'; // start loader
    const url = item.UploadResume;
    const fileName = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
    link.remove();
    // reset loading after some delay or after API call completes
    setTimeout(() => item.loadingAction = null, 1000);
  }
}
