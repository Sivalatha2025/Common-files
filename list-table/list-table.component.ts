import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';

import { StorageService } from 'src/app/storageService/storage-service';

import { CommonService } from 'src/app/services/common/common.service';

import { Subject, take, takeUntil } from 'rxjs';
import {  NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DynamicListChildComponent } from '../dynamic-list-child/dynamic-list-child.component';
import { MetaServiceService } from 'src/app/shared/SEO/meta-service.service';
import { SidebarPermissionService } from 'src/app/services/sidebar-permission.service';
import { RootEnum } from 'src/app/constants/constants';

@Component({
  selector: 'app-list-table',
  templateUrl: './list-table.component.html',
  styleUrls: ['./list-table.component.css'],
})

/**
 * @author Manidhar
 * @modification Added comments and removed unawanted/ commented code parts.
 * @DatteModified 11/09/2023
 */
export class ListTableComponent implements OnInit, OnDestroy {
  @ViewChild('dynamicListChild', { static: false }) dynamicListChild!: DynamicListChildComponent;
  moduleUrl: string = '';

  placeholder: string = '';

  modules: any;

  destroy$ = new Subject<void>();
  moduleCode: string = '';
  isPopUpModal: boolean = false;
  @ViewChild('addPagepopup', { static: false }) addPagepopup!: ElementRef;
  isModifyParent: boolean = false;
  openPop: boolean = false;
  templateName:string="";
  templeteCodeJson:string="";
  title: string = '';
  isDisplayListChild  :boolean = true;
  modulePermisionObj:{[index:string]: any} ={};
  moduleId:string='';
  templateCode: string = '';
  isModulePermissionLoaded : boolean = false; 
  permissionsLoaded : boolean = false;
  root: string = '';
  isWorkFlow :  boolean = false;
  popupRecordId: string = '';
  constructor(
    public actRouter: ActivatedRoute,
    private http: HelperModuleService,
    private storage: StorageService,
    private common: CommonService,
    public router: Router,
    private sidebarPermissionService: SidebarPermissionService,
    private modalService: NgbModal,
    private SEO: MetaServiceService
  ) {
    // this.getModules();
  

    /**
     * @description To get the module response from the side bar which inturn used for module code in request of databysearch/save/databycode API
     */

    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    
      this.isWorkFlow = this.router.url.toLowerCase()?.includes('workflow/list');
   
    this.common.updateInnerRootModules.pipe(takeUntil(this.destroy$)).subscribe((res:any) => {
     
      if (res) {
         const cleanUrl = this.router.url.split('?')[0].split('#')[0];
         let url = cleanUrl?.replace('/', '')?.replace('/add', '')?.replace('/modify', '');
         if (cleanUrl.includes('/modify/') || cleanUrl.includes('/view/')) {
           const parts = url.split('/').filter(Boolean);
           parts.pop();
           url = parts.join('/');
         }
         console.log(res)
        this.permissionsLoaded =true;
        this.isModulePermissionLoaded = true;
         let code: any = res.filter((el: any) => {
          if (el.ModuleUrl?.toLowerCase() == url?.toLowerCase()) {
            return el
          }
        });
        this.modules = code;
       
        console.log(this.modules)
        if(code){
        // if(code[0]?.TemplateCode!=undefined && code[0]?.TemplateCode!= null && code[0]?.TemplateCode!=''){

          this.templateCode = code[0]?.TemplateCode || '';
        // }else{
          this.moduleCode=code[0]?.ModuleCode || '';
        // }
        if(code[0]?.JsonURL!=undefined && code[0]?.JsonURL!=null && code[0]?.JsonURL!=''){
          this.templeteCodeJson= code[0]?.JsonURL;
        }else{
          this.templeteCodeJson= code[0]?.TemplateCode+'.json';
        }
        this.moduleUrl = code[0]?.ModuleUrl;
        this.title = code && code[0]?.ModuleName;
        this.placeholder = code && code[0]?.WaterMarkText;
        this.templateName= code && code[0]?.TemplateName;
        this.getParams();
        // this.getPermission();
      }else{
        this.router.navigate(['']);
      }
      }
    });
  }

  getParams() {
    /**
     * @description Getting Id of the respective item to be edited.
     */

    this.actRouter.params.subscribe((param: any) => {
      
      this.openPop = false;
      this.isDisplayListChild = false;
      setTimeout(() => {
        this.isDisplayListChild = true;
      }, 10);
      if(!this.isWorkFlow){
      if( param.root && param.param1){
        this.moduleUrl =  `${param.root}/${param.param1}`;
      }else{
        this.moduleUrl = param.param1
      }
    }
   
      let detailsId = this.storage.getSessionStorage(this.moduleUrl + 'Id');
      if (detailsId != undefined && detailsId != null && detailsId != '') {
        this.storage.deleteSessionStorage(`${this.moduleUrl}Id`);
      }
      this.storage.deleteSessionStorage(
        `${this.templateCode}formData`
      );
    
      let code = this.modules;
      this.moduleCode = code && code[0]?.ModuleCode;

      if(code && code[0]){
      this.moduleId = code[0]?.ModuleId;

      this.getPermission();
      // if(code[0]?.TemplateCode!=undefined && code[0]?.TemplateCode!= null && code[0]?.TemplateCode!=''){

        this.templateCode = code[0]?.TemplateCode || '';
      // }else{
        this.moduleCode=code[0]?.ModuleCode || '';
      // }
      if(code[0]?.JsonURL!=undefined && code[0]?.JsonURL!=null && code[0]?.JsonURL!=''){
        this.templeteCodeJson= code[0]?.JsonURL;
      }else{
        this.templeteCodeJson= code[0]?.TemplateCode+'.json';
      }
      this.title = code && code[0]?.ModuleName;
      this.placeholder = code && code[0]?.WaterMarkText;
      this.templateName= code && code[0]?.TemplateName;
      this.SEO.updateTags("","",' ' + '-' + ' ' + this.title+' List');
    }
    });
  }

  getModules() {
    // Subscribe to the sidebar-permissions observable instead of module list
    this.common.updatePermissionModule.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res) {
        console.log(res)
        const cleanUrl = this.router.url.split('?')[0].split('#')[0];
        let url = cleanUrl?.replace('/', '')?.replace('/add', '')?.replace('/modify', '');
        if (cleanUrl.includes('/modify/') || cleanUrl.includes('/view/')) {
          const parts = url.split('/').filter(Boolean);
          parts.pop();
          url = parts.join('/');
        }
       let code: any = res.filter((el: any) => {
          if (el.ModuleUrl?.toLowerCase() == url?.toLowerCase()) {
            return el
          }
        });
        this.modules = code;
         this.permissionsLoaded =true;
        this.isModulePermissionLoaded = true;

        // If modules metadata already exists (from previous emission or localStorage), initialize fields
        if (this.modules && this.modules[0]) {
          const code = this.modules;
          this.templateCode = code[0]?.TemplateCode || '';
          this.moduleCode = code[0]?.ModuleCode || '';
          if (code[0]?.JsonURL != undefined && code[0]?.JsonURL != null && code[0]?.JsonURL != '') {
            this.templeteCodeJson = code[0]?.JsonURL;
          } else {
            this.templeteCodeJson = code[0]?.TemplateCode ? code[0]?.TemplateCode + '.json' : '';
          }
          this.title = code && code[0]?.ModuleName || '';
          this.placeholder = code && code[0]?.WaterMarkText || '';
          this.templateName = code && code[0]?.TemplateName || '';
          // ensure route params are processed with the available module info
          this.getParams();
        }
      }
    });
  }

  


isViewPopup : boolean = false;
  openAddOrEditPage( data :any) {
      this.isViewPopup = false;
      this.popupRecordId = data?.id || '';
      if(data?.isEdit){
        this.isModifyParent = true;
        if(data?.isViewPopup){
          this.isViewPopup = true;
        }
      }else{
      
        this.isModifyParent = false
      }
      this.openPop = true;
      this.modalService.open(this.addPagepopup, {
        modalDialogClass: 'var-Popup',
        centered: true,
        size:'md',
        keyboard:false,
        backdrop:'static'
      });
    
  }

 
  close(event: any) {
    this.modalService.dismissAll();
    // this.getList();
    this.dynamicListChild.getList()
  }
  
  getPermission() {


    this.common.updatePermissionModule.pipe(takeUntil(this.destroy$)).subscribe((res:any)=>{
      // 
      if(res){
        
        this.modulePermisionObj = res[this.moduleId]
        // console.log(this.modulePermisionObj)
        this.isModulePermissionLoaded = true;
      }
    }); 
  }
}
