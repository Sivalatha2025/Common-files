import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { GetControlsByModuleCode, GetSchema, MultiLangEnabledRoots, RootEnum } from 'src/app/constants/constants';
import { CommonService } from 'src/app/services/common/common.service';
import { discardPopupService } from 'src/app/services/discardPopupService/discrd-popup.service';
import { DynamicFormService } from 'src/app/services/dynamic-form-service/dynamic-form.service';
import { StorageService } from 'src/app/storageService/storage-service';
import { DynamicFormChildComponent } from '../dynamic-form-child/dynamic-form-child.component';
import { CustomDynamicFormChildComponent } from '../custom-dynamic-form-child/custom-dynamic-form-child.component';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { SidebarPermissionService } from 'src/app/services/sidebar-permission.service';
import { FormBuilder } from '@angular/forms';
import { DatabagRdlcService } from '../add-rdlc/databag-rdlc.service';
declare var $ :any
/**
 * @author Manidhar
 * @modification Changed the file upload blob conversion logic and in @Submit method for img upload check
 * @DatteModified 11/09/2023
 */

enum ModuleUrls {
  SMSLOG = 'emaillog/list',
  EMAILLOG = 'smslog/list',
  MODEOFACTIVITY = 'modeofactivity/list'
}

@Component({
  selector: 'app-add-page',
  templateUrl: './add-page.component.html',
  styleUrls: ['./add-page.component.css'],
})
export class AddPageComponent implements OnInit, OnDestroy {
  moduleUrl: string = '';
  modules: any;
  moduleName: string = '';
  placeholder = ""
  url = '';
  destroy$ = new Subject<void>();
  moduleCode: string = '';
  templeteCode: string = '';
  templeteCodeJson: string = '';
  templateName: string='';
  formData: any;
  tabs : any[] = [];
  currentTabName : string = 'General'
  parentRecordId: any;
  title: string = '';
  selectedTab: any;
  moduleId:any;
  modulePermissionObj:{[index:string]:any}={};
  isBrowser:boolean = false;
  isModuleRes:boolean = false;
  loading: boolean = false;
  selectedIndex = 0;
  scrollLength: string ='';
  leftTabIdx = 0;
  atStart = true;
  atEnd = false;
  moduleUrlEnum = ModuleUrls;
  root: string = '';
  rootEnum = RootEnum;
  commonRoot : string = '';
  changedetect: boolean = false;
  @ViewChild('dynamicChild') dynamicChild!: any;
  @ViewChild('customdynamicChild') customdynamicChild!: any;
  isEmployeeAddUrl: boolean = false;
  isEmployeeDataDisplay:boolean = false;
  multiLangEnabledRoots: any = MultiLangEnabledRoots;
  employeeData:{[index:string]:string} = {};
  isPermissionsLoaded : boolean = false;
  constructor(
    public common: CommonService,
    public route: Router,
    private actRoute: ActivatedRoute,
    public storage: StorageService,
    public api : HelperModuleService,
    @Inject(PLATFORM_ID) public platformId: any,
    private dynamicService : DynamicFormService,
    private modalService: NgbModal,
    private discardPopupService: discardPopupService,
    private multiLanguageService: MultilanguageService,
    public sidebarPermissionService: SidebarPermissionService,
    public databagRDLCService: DatabagRdlcService,
    public formBuilder: FormBuilder,
    public datePipe: DatePipe,
    public elementRef: ElementRef,
  ) {
    this.url = this.route.url;
    let rootUrl  = this.actRoute.snapshot.params['root'] || '';
    let parentUrl = this.actRoute.snapshot.params['type'] || '';
    // if(rootUrl && parentUrl){
    //   this.moduleUrl = `${rootUrl}/${parentUrl}`;
    // }else{
    //   this.moduleUrl = parentUrl;
    // }
    const cleanUrl = this.route.url.split('?')[0].split('#')[0];
    let moduleUrl = cleanUrl.replace('/','')?.replace('/add','')?.replace('/modify','')?.replace('/view','');
    if (cleanUrl.includes('/modify/') || cleanUrl.includes('/view/')) {
      const parts = moduleUrl.split('/').filter(Boolean);
      parts.pop();
      moduleUrl = parts.join('/');
    }
    this.moduleUrl = moduleUrl;
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
  checkUrl() {


    if (this.route.url === '/HRMS/Employee/add' || this.route.url === '/HRMS/Employee/modify' ||
    this.route.url === '/HRMS/Advance/add' || this.route.url === '/HRMS/Advance/modify') {
      this.isEmployeeAddUrl = true;
    } else {
      this.isEmployeeAddUrl = false;
    }

  }
  scrollTab(x:any) {
    // if (this.atStart && x < 0 || this.atEnd && x > 0) {
    //   return
    // }
    // this.leftTabIdx = this.leftTabIdx + x
    // this.scrollLength = `translateX(${(this.leftTabIdx) * -100}px)`
    // this.atStart = this.leftTabIdx === 0
    // this.atEnd = this.leftTabIdx === this.tabs.length -1
    if(x==1){
      const conent = document.querySelector('#tabScroll');
      if(conent){
        conent.scrollLeft += 300;
      }
    }else{
      const conent = document.querySelector('#tabScroll');
      if(conent){
        conent.scrollLeft -= 300;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
  }
  ngOnInit(): void {
    this.checkUrl();
    if(isPlatformBrowser(this.platformId)){
      this.isBrowser = true;
    }else{
      this.isBrowser= false;
    }
    

    //  this.getModules();
    this.common.updateInnerRootModules.pipe(takeUntil(this.destroy$)).subscribe((res) => {
          
      if (res) {
       
        this.isModuleRes = true;
        this.isPermissionsLoaded = true
        this.modules = res;
        let code = this.modules?.filter((res: any) =>{
        if(this.moduleUrl?.includes(`${this.root}/products`)){
          if( res.ModuleUrl?.toLowerCase() == this.moduleUrl?.toLowerCase()){
              return res
         }
        }
         if( res.ModuleUrl?.toLowerCase() == this.moduleUrl?.toLowerCase() + '/list'){
              return res
         }
        }
        );
        // this.modules.map((el:any)=>{
        //   if(el.ModuleUrl?.toLowerCase() == this.moduleUrl?.toLowerCase() +'/list'){
            this.moduleId = code[0]?.ModuleId;
          // }
        // });

        this.moduleName = code[0]?.ModuleName;
        // if(code[0]?.TemplateCode!=undefined && code[0]?.TemplateCode!= null && code[0]?.TemplateCode!=''){

        //   this.moduleCode = code[0]?.TemplateCode;
        // }else{
          this.moduleCode=code[0]?.ModuleCode;
          // this.templeteCode = code[0]?.TemplateCode

        // 
        if(code[0]?.JsonURL!=undefined && code[0]?.JsonURL!=null && code[0]?.JsonURL!=''){
          this.templeteCodeJson= code[0]?.JsonURL;
        }else{
          this.templeteCodeJson= code[0]?.TemplateCode+'.json';
        }
        this.templeteCode=code[0]?.TemplateCode || ''
        this.templateName= code && code[0]?.TemplateName;
        this.placeholder = code && code[0]?.WaterMarkText;
        this.title = code && code[0]?.ModuleName;
        this.parentRecordId = this.getRouteId();

        this.getSchema();
      
        this.getPermission();
       
      }
    });
    // this.actRoute.params.subscribe(params =>{
    //   this.root = params['root'] || '';
    //   if(this.root && this.multiLangEnabledRoots[this.root]){
    //          this.commonRoot = RootEnum.Common
    //   }else{
    //     this.commonRoot = ''
    //   }
    // })
    this.root = this.route.url.split('/')[1];
    this.multiLanguageService.selectedLanguageUpdation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        
        this.changedetect = !this.changedetect;

      });

  }
  save(){
    this.loading = true;
    this.dynamicService.save$.next();
  }
  errorEvent(){
    this.loading = false;
  }

  getModules() {
    
    if (this.sidebarPermissionService) {
      this.sidebarPermissionService.setRoute(this.route.url, this.root);
      this.sidebarPermissionService.selectedModule$.pipe(takeUntil(this.destroy$)).subscribe((moduleObj: any) => {
        
        if (moduleObj) {
          this.isModuleRes = true;
          this.isPermissionsLoaded = true;
          const match = typeof moduleObj === 'string' ? JSON.parse(moduleObj) : moduleObj;
          this.modules = match ? [match] : [];
          this.moduleId = match?.ModuleId;
          this.getPermission();
          this.moduleName = match?.ModuleName;
          this.templeteCode = match?.TemplateCode || '';
          this.moduleCode = match?.ModuleCode || '';
          if (match?.JsonURL !== undefined && match?.JsonURL !== null && match?.JsonURL !== '') {
            this.templeteCodeJson = match.JsonURL;
          } else {
            this.templeteCodeJson = match?.TemplateCode ? match.TemplateCode + '.json' : '';
          }
          this.templateName = match?.TemplateName;
          this.placeholder = match?.WaterMarkText;
          this.title = match?.ModuleName;
        }
      });
    } 
    
  }


  getSchema() {
    
    let data = this.storage.getSessionStorage(`${this.templeteCode}formData`);
    if (data) {
      let formData: any = JSON.parse(data);
      if(formData?.Data){
        this.formData = formData;
        if((this.templeteCode == 'HRMSEMP-308'||this.templeteCode == 'HLTEMP-10734' ||this.templeteCode == 'HRMSClient-31004' ) && this.formData.APIUrls  &&this.formData.APIUrls[0]){
          this.formData.APIUrls[0].isSingleView = true;
        }
        if(this.formData.AllTabs && formData.TemplateName?.toLowerCase() == 'general' && this.formData.AllTabs?.length!==0 ){

          this.tabs = this.formData?.AllTabs
          this.getTabPermission();
        }
        // if(this.tabs && this.tabs.length !=0){
          this.storage.setSessionStorage(`${this.templeteCode}formData`, JSON.stringify(formData));

          this.parentRecordId = this.getRouteId();
        // }
      }
      // this.setSchemaData(formData);
    } else {
      let req = {
        ModuleCode: this.templeteCode,
      };

      this.api.getService(GetSchema + this.templeteCodeJson).subscribe(
        (formData: any) => {
          // this.setSchemaData(formData);
          this.storage.setSessionStorage(`${this.templeteCode}formData`, JSON.stringify(formData));
          
          this.formData = formData;
          if((this.templeteCode == 'HRMSEMP-308'||this.templeteCode == 'HLTEMP-10734' ||this.templeteCode == 'HRMSClient-31004' ) && this.formData.APIUrls  &&this.formData.APIUrls[0]){
            this.formData.APIUrls[0].isSingleView = true;
          }
          if(this.formData.AllTabs && formData.TemplateName?.toLowerCase() == 'general' && this.formData.AllTabs?.length!==0 ){

            this.tabs = this.formData?.AllTabs
            this.getTabPermission();
            //console.log(this.tabs);
            
          }
          // if(this.tabs && this.tabs.length !=0){
            this.parentRecordId = this.getRouteId();
          // }
        },
        (error) => {
          // this.route.navigate([this.moduleUrl + '/list']);
          this.api
            .postService(GetControlsByModuleCode, req)
            .subscribe((res) => {
              if (res && res.ReturnCode == 0) {
                // this.setSchemaData(res);
                this.formData = res;
                if((this.templeteCode == 'HRMSEMP-308' ||this.templeteCode == 'HLTEMP-10734' || this.templeteCode == 'HRMSClient-31004') && this.formData.APIUrls  &&this.formData.APIUrls[0]){
                  this.formData.APIUrls[0].isSingleView = true;
                }
                // console.log(res);
                
             this.storage.setSessionStorage(`${this.templeteCode}formData`, JSON.stringify(res));
             if(this.formData.AllTabs && this.formData.TemplateName?.toLowerCase() == 'general' && this.formData.AllTabs?.length!==0 ){

              this.tabs = this.formData?.AllTabs
              this.getTabPermission();
            }

              } else {
                this.common.changeIsFailureeMessage(true);
                this.common.changeResponseMessage(
                  "Coudn't load " + this.moduleName + ' please try later.'
                );
                this.route.navigate([this.moduleUrl + '/list']);
              }
            });
        }
      );
    }
  }

  getTabPermission() {
    this.common.updatePermissionModule.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res) {
        this.tabs.forEach((tab: any) => { 
          if(res[tab.ModuleId] && res[tab.ModuleId]['Create/Update']){
            tab.isCreateUpdate = true;
          }
        });
        this.tabs = this.tabs.filter((tab:any) => tab.isCreateUpdate);
      }
    });
  }

  changeTab(tab : any, index?:any){
    
    // this.selectedIndex = index

   
    if(this.parentRecordId ){
      this.formData = undefined;;
        this.templeteCodeJson = '';
 
     if(tab?.TemplateName?.toLowerCase() != 'general'){
      this.storage.deleteSessionStorage(tab.TemplateCode+ 'Id')
     }
     this.templeteCode = tab.TemplateCode;
      this.currentTabName = tab?.TemplateName;
      this.selectedTab = structuredClone(tab);
      this.templeteCodeJson = tab.JsonURL;
      setTimeout(() => {
        this.getSchema()
        
      }, 10);
    }else{
    let msg = `Here only you can add general ${this.moduleName} details, update rest in "Modify ${this.moduleName}."`;
    this.common.changeIsFailureeMessage(true);
    this.common.changeResponseMessage(msg)
    }

  }

  close(){
   
      this.route.navigate([this.moduleUrl + '/list']);
    

  }

  setLoadingFalse(){
    this.loading = false
  }

  savedParent(){
    this.loading = false
    this.discardPopupService.isNavigate.next(true);
    if(this.tabs && this.tabs.length !=0){
     this.parentRecordId = this.getRouteId();
      // this.changeTab(this.tabs[1]);
      // this.close()

    }else{
      this.close()
    }

  }
  getPermission(){
    this.common.updatePermissionModule.pipe(takeUntil(this.destroy$)).subscribe((res:any)=>{
      if(res){
        this.modulePermissionObj = res[this.moduleId];
      }
      else{
         this.modulePermissionObj =  {}
      }
    });
  }

  canDeactivate(route: string) {
    
    if(this.currentTabName?.toLowerCase() != 'general'){
      return true;
     }else{
      if (isPlatformBrowser(this.platformId)) {
        try {
         // $('*').blur();
        } catch (error) {
          console.log(error);
        }
      }
       let form:any
       let isFormDirty:any
       if(this.dynamicChild){
        isFormDirty = this.dynamicChild.isFormDirty;
        form = this.dynamicChild.addForm;
       }
       else if(this.customdynamicChild){
        isFormDirty = this.customdynamicChild.isFormDirty;
        form = this.customdynamicChild.addForm;
       }
        
       return this.discardPopupService.formDirtyCheck(route, [form], true, isFormDirty);
     }
  }

  proxyIdAndNameEmit(event:any){
    
    this.isEmployeeDataDisplay = true;
    this.employeeData = event
  }
};
    
