import { isPlatformBrowser } from '@angular/common';
import { InvalidDesc, InvalidRoleName, RoleNameIsRequied, addresscommentsAllow, commentsAllow, commentscount, policyEndDateRequired } from './../../ErrorMessages/ErrorMessages';
import { Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, NgControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InvalidRoleCode, RoleIsRequired } from 'src/app/ErrorMessages/ErrorMessages';
import { RoleCodePattern, RoleNamepattern, DescriptionPattern } from 'src/app/InputPatterns/input-pattern';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { GetCRMRoleByCode, GetMastersAPI, GetModulePermission, GetRoleByCode, HomeDescription, HomeKeyword, HomeTitle, RootEnum, SaveRole, addroleRoleCodeToolTip, addroleRoleDescriptionToolTip, addroleRoleNameToolTip, addroleSelectAllToolTip, isEnableToolTips } from 'src/app/constants/constants';
import { CommonService } from 'src/app/services/common/common.service';
import { HttpRequestDataService } from 'src/app/services/requestdata/http-request-data.service';
import { ErrorInputFocusDirective } from 'src/app/shared/Directives/error-input-focus.directive';
import { MetaServiceService } from 'src/app/shared/SEO/meta-service.service';
import { GetModuleCodeService } from 'src/app/services/get-module-code.service';
import { discardPopupService } from 'src/app/services/discardPopupService/discrd-popup.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'src/environments/environment';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { RoutesObj } from 'src/app/routes.config';
import { CustomTranslatePipe } from 'src/app/shared/pipes/custom-translate.pipe';
import { count } from 'console';
declare var $: any
@Component({
  selector: 'app-add-role',
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.css']
})
export class AddRoleComponent implements OnInit, OnDestroy {
  isSaveLoading: boolean = false;
  addRoleForm!: FormGroup;
  submitted: boolean = false;
  roleCodeIsRequired: string = RoleIsRequired;
  invalidRoleCode: string = InvalidRoleCode;
  roleNameIsRequired: string = RoleNameIsRequied;
  invalidRoleName: string = InvalidRoleName;
  invalidDesc: string = InvalidDesc;
  moduleData: any = [];
  selectedModuleData: any = [];
  roleId: string = '';
  roleDetails: any = [];
  button: string = "Save";
  title: string = 'Add Role';
  allSelectType: any;
  isAllSelect: boolean = false;
  parentModules: any = [];
  childModuleObj: { [index: string]: any } = {};
  moduleRes: any;
  selectedObj: { [index: string]: any } = {};
  @ViewChildren(NgControl) formControls!: QueryList<NgControl>;
  selectModule: boolean = false;
  RoutesObj = RoutesObj
  @ViewChild(ErrorInputFocusDirective, { static: false }) invalidInputDirective !: ErrorInputFocusDirective;
  permissions: any[] = [];
  moduleId: any;
  modulePermissionObj: any = {};
  destroy$ = new Subject<void>();
  isPageLoad: boolean = true;
  isBrowser: boolean = false;
  billingcommentscount = commentscount
  commentsAllow = commentsAllow;
  commenttotalcount = commentscount;
  permissionObj: { [index: string]: any } = {}
  DiscardPopupShow = environment.DiscardPopupShow;
  isFormDirty: boolean = false;
  addroleRoleNameToolTip = addroleRoleNameToolTip;
  addroleRoleCodeToolTip = addroleRoleCodeToolTip;
  addroleRoleDescriptionToolTip = addroleRoleDescriptionToolTip;
  addroleSelectAllToolTip = addroleSelectAllToolTip;
  isEnableToolTips = isEnableToolTips['Role'];
  rootModuleName: string = '';
  isMobileToolTip: boolean = false;
  root: string = RootEnum.Common;
  rootEnum = RootEnum.Common;
  routeBack = RoutesObj.roleList;
  changedetect: boolean = false;
  rootModuleArr: any[] = [];
  moduleBasedOnRoot: any = {};
  currentTabId: string = '';
  subTabItem: any = {};
  roleTypesData: any = [];
  matchedRole: any = {};
  isPermissionsLoaded : boolean = false;
  constructor(
    private fb: FormBuilder,
    private http: HelperModuleService,
    private router: Router,
    private route: ActivatedRoute,
    private SEO: MetaServiceService,
    private common: CommonService,
    private _httpRequestData: HttpRequestDataService,
    @Inject(PLATFORM_ID) private platformId: any,
    private updateModule: GetModuleCodeService,
    private discardPopupService: discardPopupService,
    private modalService: NgbModal,
    public multiLanguageService: MultilanguageService,
    private customTranslatePipe: CustomTranslatePipe

  ) {
    // this.getModule();
    this.rootModuleName = this.router.url.split('/')[1];
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isBrowser = true;
    } else {
      this.isBrowser = false;
    }
    if (isPlatformBrowser(this.platformId)) {
      let getWidth: any = $(window).width();
      if (getWidth < 999) {
        this.isMobileToolTip = true;
      } else {
        this.isMobileToolTip = false;
      }
    }
    this.root = this.router.url.split('/')[1] || '';
    if (this.router.url.includes('/RFQRole')) {
      this.getMasters();
    } else {
      this.getModulePermission();
    }

    this.addRoleForm = this.fb.group({
      isPublish: [true],
      roleCode: ['', { updateOn: 'change', validators: [Validators.required, Validators.pattern(RoleCodePattern)] }],
      roleName: ['', { updateOn: 'change', validators: [Validators.required, Validators.pattern(RoleNamepattern)] }],
      roleDesc: ['', { updateOn: 'change', validators: [Validators.pattern(DescriptionPattern)] }]
    });

    //  this.getPermissions();
    this.roleId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id') || '';
    if (this.roleId && this.router.url.includes('/modify')) {
      // this.button = 'Update'
      this.title = 'Modify Role'
    }
    else if (this.router.url.includes('/modify')) {
      this.router.navigate([`${this.root}${RoutesObj.roleList}`]);
    }
    this.SEO.updateTags("", "", ' ' + '-' + ' ' + this.title);
    this.common.updateInnerRootModules.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res && !this.moduleId) {
        this.isPermissionsLoaded= true;
        this.isPageLoad = false;
        let url = `${this.root}${RoutesObj.roleList}`
        res.map((el: any) => {
          if (el.ModuleUrl?.toLowerCase() == url?.toLowerCase()) {
            this.moduleId = el.ModuleId
          }
        });
        this.getPermissionsForModule();
      }
    });
    this.multiLanguageService.selectedLanguageUpdation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {

        this.changedetect = !this.changedetect;
      });
  }

  getMasters() {
    const req = {
      MasterDataCode: "RoleType",
      Active: "true"
    }

    this.http.postService(GetMastersAPI, req).subscribe((response: any) => {
      if (response != undefined && response != null && response != '') {
        if (response.Data !== undefined && response.Data != null && response.Data != '') {
          this.roleTypesData = response.Data;
          const ignoreList = ['add', 'modify', 'view'];
          const urlParts = this.router.url.split('/').filter(part => !ignoreList.includes(part.toLowerCase()));
          const lastValidPart = urlParts[urlParts.length - 1];
          this.matchedRole = this.roleTypesData.find((role: any) => role.Name === lastValidPart);
        }
      }
      this.getModulePermission();
    });
  }

  get formValidations() {
    return this.addRoleForm.controls;
  }

  getPermissions() {
    // const req = {
    //   MasterDataCode: "Permission",
    //   Active:"True"
    // }
    // this.http.postService(GetMastersAPI,req).subscribe(res =>{
    //   if(res && res.Data){

    //     this.permissions = res.Data || []
    //   }
    // })
  }

  getFirstParentWithChildren(): number {
    for (let i = 0; i < this.parentModules.length; i++) {
      if (this.childModuleObj[this.parentModules[i].ModuleId] && this.childModuleObj[this.parentModules[i].ModuleId].length > 0) {
        return i; // Returns the index of the first parent with children
      }
    }
    return -1; // Returns -1 if no parent has children
  }

  handleAccordianArrow(moduleId: any, index: any): boolean {
    if (this.childModuleObj[moduleId] && this.getFirstParentWithChildren() == index) {
      return false;
    }
    return true;
  }

  getModulePermission() {
    let req: any = {
      "Active": "True",
    }
    if (this.router.url?.includes('/CRMRole')) {
      req['IsCRMROle'] = true
    }
    if (this.router.url?.includes('/RFQRole')) {
      req['RoleTypeId'] = this.matchedRole?.Id || '';
    }
    this.http.postService(GetModulePermission, req).subscribe({
      next: (res: any) => {
        if (res && res.Data && res.Data.length > 0) {
          this.moduleRes = res.Data;
          this.getRoot();
          if (this.router.url.includes('/modify')) {
            this.getRoleById();
          }
        }
      }, error: (err: any) => {
        console.log(err);
      }
    })

  }
  getRoot() {
    this.moduleRes.forEach((el: any) => {
      if (el && !el.RootModuleId && !el.ParentModuleId) {
        this.rootModuleArr.push(el);
        if (!this.permissionObj[el.ModuleId]) {
          this.permissionObj[el.ModuleId] = el.ModulePermissions
        }
      } else {
        if (this.moduleBasedOnRoot[el.RootModuleId]) {
          this.moduleBasedOnRoot[el.RootModuleId].push(el);
        } else {
          this.moduleBasedOnRoot[el.RootModuleId] = [el];
        }
      }
      if (!this.permissionObj[el.ModuleId]) {
        this.permissionObj[el.ModuleId] = el.ModulePermissions
      }
    });
    if (this.rootModuleArr && this.rootModuleArr.length > 0) {
      this.currentTabId = this.rootModuleArr[0].ModuleId;
      this.getParentChildModule();
    }

  }

  // getModule() {

  //   const req = {
  //     MasterDataCode: "Module",
  //     Active:"True"
  //   }
  //   this.http.postService(GetMastersAPI, req).subscribe((response: any) => {
  //     if (response != undefined && response != null && response != '') {
  //       if (response.Data !== undefined && response.Data != null && response.Data != '') {
  //         this.moduleRes = response.Data;
  //         this.getParentChildModule();
  //         if(this.router.url.includes('/roles/modify')){
  //           this.getRoleById();
  //         }
  //       }
  //     }
  //   });
  // }
  saveRole() {
    this.selectModule = false
    this.selectedModuleData = [];
    // this.permissions.map(el =>{
    //   let obj : any = {};
    //   obj['PermissionId'] = el?.Id;
    //   permissionArray.push(obj)
    // })
    try {
      Object.entries(this.selectedObj).forEach(([key, value]) => {
        if (value) {
          let obj: any = {};
          obj['ModuleId'] = key;
          let permissionArray: any = []
          if (this.permissionObj[key]) {
            this.permissionObj[key].map((el: any) => {
              if (this.selectedObj[key].has(el.PermissionName)) {
                let obj: any = {};
                obj['PermissionId'] = el?.PermissionId;
                permissionArray.push(obj)
              }
            })
          }
          obj['Permissions'] = permissionArray
          this.selectedModuleData.push(obj);
        }
      })
    } catch (error) {
      console.log(error);

    }


    try {
      this.invalidInputDirective.check(this.formControls);
    } catch (error) {
      console.log(error);

    }

    if (this.addRoleForm.valid && this.selectedModuleData.length > 0) {
      this.isSaveLoading = true;
      let req: any = {
        "RoleId": this.roleId != undefined && this.roleId != null && this.roleId != '' ? this.roleId : "",
        "Active": this.addRoleForm.value.isPublish.toString(),
        "RoleName": this.addRoleForm.value.roleName,
        "RoleDescription": this.addRoleForm.value.roleDesc,
        "RoleCode": this.addRoleForm.value.roleCode,
        "Modules": this.selectedModuleData
      }
      if (this.router.url?.includes('/CRMRole')) {
        req['IsCRMRole'] = "true"
      } else {
        req['IsCRMRole'] = "false"
      }

      if (this.router.url?.includes('/RFQRole')) {
        req['RoleTypeId'] = this.matchedRole?.Id || '';
      }
      this.http.postService(SaveRole, req).subscribe({
        next: (res: any) => {
          if (res && res.ReturnCode == 0) {

            this.discardPopupService.isNavigate.next(true);
            this.isSaveLoading = false;
            let msg: any;
            if (this.router.url?.includes('/CRMRole')) {
              this.router.navigate([`${this.root}${RoutesObj.CRMRole}`]);
              msg = this.roleDetails && this.roleDetails.length != 0 ? 'Successfully updated the crm role details.' : 'Successfully added crm role.';
            } else if (this.router.url?.includes('/RFQRole')) {
              this.router.navigate([`${this.root}${RoutesObj.RFQRole}`]);
              msg = this.roleDetails && this.roleDetails.length != 0 ? 'Successfully updated the rfq role details.' : 'Successfully added rfq role.';
            } else {
              this.router.navigate([`${this.root}${RoutesObj.roleList}`]);
              msg = this.roleDetails && this.roleDetails.length != 0 ? 'Successfully updated the role details.' : 'Successfully added role.';
            }
            this.common.changeIsSuccesseMessage(true);
            this.common.changeResponseMessage(this.customTranslatePipe.transform(msg, this.changedetect, this.root))
            this.updateModule.getModules();
          }
          else {
            this.isSaveLoading = false;
            this.common.changeIsFailureeMessage(true);
            this.common.changeResponseMessage(res.ReturnMessage)
          }
        },
        error: (err: any) => {
          console.log(err);
          this.isSaveLoading = false;
          let msg = this.roleDetails && this.roleDetails.length != 0 ? 'Updating role was failed.' : 'Adding role was failed.';
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage(msg)
        }
      })
    }
    else {
      if (this.selectedModuleData.length == 0) {
        this.selectModule = true
      }
      this.submitted = true;
    }
  }
  backroute() {
    if (this.router.url?.includes('/CRMRole')) {
      this.router.navigate([`${this.root}${RoutesObj.CRMRole}`]);
    } else if (this.router.url?.includes('/RFQRole')) {
      this.router.navigate([`${this.root}${RoutesObj.RFQRole}`]);
    } else {
      this.router.navigate([`${this.root}${RoutesObj.roleList}`]);
    }
  }
  getRoleById() {
    let req = {
      "Code": this.roleId,
    }
    this.http.postService(GetRoleByCode, req).subscribe({
      next: (res: any) => {
        
        if (res != undefined && res != null && res != '') {
          if (res.Data != undefined && res.Data != null && res.Data != '') {
            this.roleDetails = res.Data;
            this.addRoleForm.reset();
            this.addRoleForm = this.fb.group({
              isPublish: [this.roleDetails.Role[0].Active],
              roleCode: [this.roleDetails.Role[0].RoleCode, [Validators.required, Validators.pattern(RoleCodePattern)]],
              roleName: [this.roleDetails.Role[0].RoleName, [Validators.required, Validators.pattern(RoleNamepattern)]],
              roleDesc: [this.roleDetails.Role[0].RoleDescription, [Validators.pattern(DescriptionPattern)]]
            });

            if (this.roleDetails.Role[0].RoleDescription != undefined && this.roleDetails.Role[0].RoleDescription != null && this.roleDetails.Role[0].RoleDescription != '') {
              this.billingcommentscount = this.commenttotalcount - this.roleDetails.Role[0].RoleDescription.length
            }
            // this.isAllSelect = this.moduleRes.length == this.roleDetails.Modules.length? true:false;
            
            this.selectedModuleData = [];
            this.selectedObj = {};
            this.roleDetails.Modules.map((element: any) => {
              if (this.selectedObj[element.ModuleId]) {
                let map = this.selectedObj[element.ModuleId];
                map.set(element.PermissionName, true);
                this.selectedObj[element.ModuleId] = map

              } else {

                let map = new Map();
                map.set(element.PermissionName, true);
                this.selectedObj[element.ModuleId] = map
              }

            })

            let selectedKeys = Object.keys(this.selectedObj)
            if (selectedKeys.length == this.moduleRes.length) {
              let count = 0;
              selectedKeys.forEach((key: any) => {
                let value = this.selectedObj[key]
                if (value.size == this.permissionObj[key]?.length) {
                  count = count + 1;
                }
              })
              if (count == this.moduleRes.length) {
                this.isAllSelect = true
              }
              else {
                this.isAllSelect = false
              }
            }
          }
        }
      },
      error: (err) => {
        console.log(err);
      }
    })
  }

  cancel() {
    // this.router.navigate(['/roles']);
    if (this.DiscardPopupShow) {
      this.discardPopupService.formDirtyCheck(`${this.root}${RoutesObj.roleList}`, [this.addRoleForm], false, this.isFormDirty)
    } else {
      if (this.router.url?.includes('/CRMRole')) {
        this.router.navigate([`${this.root}${RoutesObj.CRMRole}`]);
      } else if (this.router.url?.includes('/RFQRole')) {
        this.router.navigate([`${this.root}${RoutesObj.RFQRole}`]);
      } else {
        this.router.navigate([`${this.root}${RoutesObj.roleList}`]);
      }
    }
    if (this.router.url?.includes('/CRMRole')) {
      this.router.navigate([`${this.root}${RoutesObj.CRMRole}`]);
    } else if (this.router.url?.includes('/RFQRole')) {
      this.router.navigate([`${this.root}${RoutesObj.RFQRole}`]);
    } else {
      this.router.navigate([`${this.root}${RoutesObj.roleList}`]);
    }
  }
  selectAllModule(event: any) {
    
    this.isFormDirty = true;
    this.selectModule = false
    if (event.target.checked === true) {
      this.isAllSelect = true;
      this.moduleRes.forEach((ele: any) => {
        let map = new Map();
        ele.ModulePermissions.forEach((el: any) => {
          map.set(el.PermissionName, true);
        });
        this.selectedObj[ele.ModuleId] = map;
      });
    } else {
      this.moduleRes.forEach((ele: any) => {
        delete this.selectedObj[ele.ModuleId];
        this.isAllSelect = false;
      });
    }
  }

  getParentChildModule() {
    
    try {
      /* new code started */
      this.childModuleObj = {};
      this.parentModules = [];
      this.subTabItem = {};
      this.moduleBasedOnRoot[this.currentTabId].map((item: any) => {
        if (item.SubTabModuleId) {
          if (this.subTabItem[item.SubTabModuleId]) {
            let val: any[] = this.subTabItem[item.SubTabModuleId];
            val.push(item);
            this.subTabItem[item.SubTabModuleId] = val;
          } else {
            this.subTabItem[item.SubTabModuleId] = [item]
          }
          return;
        }
        if (item.ParentModuleId && item.ParentModuleId != item.RootModuleId) {
          if (this.childModuleObj[item.ParentModuleId]) {
            let arr = this.childModuleObj[item.ParentModuleId];
            arr.push(item);
            this.childModuleObj[item.ParentModuleId] = arr;
          }
          else {
            this.childModuleObj[item.ParentModuleId] = [item];
          }
        }
        else {
          this.parentModules.push(item);
        }

      });

    } catch (error) {
      console.log(error);

    }

    /* new code ended */
  }
  selectChildModule(event: any, parent: any, child: any) {
    this.isFormDirty = true;
    this.selectModule = false
    if (!this.selectedObj[child.ModuleId]) {
      //handle child module
      let map = new Map();
      if (this.permissionObj[child.ModuleId]) {
        this.permissionObj[child.ModuleId].forEach((el: any) => {
          if (el) {
            map.set(el.PermissionName, true)
          }
        });
      }
      //handle parent module
      let parentMap = new Map();
      if (this.permissionObj[parent.ModuleId]) {
        this.permissionObj[parent.ModuleId].forEach((el: any) => {
          if (el) {
            map.set(el.PermissionName, true)
          }
        });
      }

      this.selectedObj[child.ModuleId] = map;
      this.selectedObj[parent.ModuleId] = map;


      if (this.subTabItem[child.ModuleId] && this.subTabItem[child.ModuleId].length > 0) {
        this.subTabItem[child.ModuleId].forEach((subtab: any) => {
          let tabMap = new Map();
          this.permissionObj[subtab.ModuleId].forEach((el: any) => {
            if (el) {
              tabMap.set(el.PermissionName, true)
            }
          });
          this.selectedObj[subtab.ModuleId] = tabMap;
        });
      }

      let selectedKeys = Object.keys(this.selectedObj)

      if (selectedKeys.length == this.moduleRes.length) {
        let count = 0;
        selectedKeys.forEach((key: any) => {
          let value = this.selectedObj[key]
          if (value.size == this.permissionObj[key]?.length) {
            count = count + 1;
          }
        })
        if (count == this.moduleRes.length) {
          this.isAllSelect = true
        }
        else {
          this.isAllSelect = false
        }
      }

      // if(this.childModuleObj[parentId]){
      //   this.childModuleObj[parentId].map((element:any)=>{
      //     if(element.Id == child.Id){
      //       element.Active = true;
      //       this.selectedObj[child.Id] = true;
      //       this.selectedObj[parentId] = true;
      //     }
      //   });
      // }
      // let selectedValue:any = Object.entries(this.selectedObj).filter((x:any)=>x[1]!=undefined)
      // this.isAllSelect = this.moduleRes.length == Object.keys(selectedValue).length?true:false;

    } else {
      // delete this.selectedObj[child.Id]

      let count = 0;
        this.childModuleObj[parent.ModuleId].forEach((item: any) => {
          if (this.selectedObj[item.ModuleId]) {
            count++;
          }
        });

      if (count == 1) {
        delete this.selectedObj[child.ModuleId];
        delete this.selectedObj[parent.ModuleId];
      } else {
        delete this.selectedObj[child.ModuleId];
        if (this.subTabItem[child.ModuleId] && this.subTabItem[child.ModuleId].length > 0) {
          this.subTabItem[child.ModuleId].forEach((subtab: any) => {
            delete this.selectedObj[subtab.ModuleId];
          });
        }
      }
      this.isAllSelect = false
    }
    if (parent && parent.RootModuleId) {
      this.selectRootBasedOnChild(parent.RootModuleId);
    }

  }

  selectSubTabModule(event: any, subTab: any) {
    this.isFormDirty = true;
    this.selectModule = false;
    if (!this.selectedObj[subTab.ModuleId]) {
      let map = new Map();
      if (this.permissionObj[subTab.ModuleId]) {
        this.permissionObj[subTab.ModuleId].forEach((el: any) => {
          if (el) {
            map.set(el.PermissionName, true)
          }
        });
      }
      this.selectedObj[subTab.ModuleId] = map;
    } else {
      delete this.selectedObj[subTab.ModuleId];
    }
    this.isAllSelect = Object.keys(this.selectedObj).length == this.moduleRes.length ? true : false;
    if (subTab && subTab.RootModuleId) {
      this.selectRootBasedOnChild(subTab.RootModuleId);
    }
  }

  selectAllParentModule(event: any, parent: any) {
    this.isFormDirty = true;
    this.selectModule = false
    if (event.target.checked) {
      if (this.childModuleObj[parent.ModuleId]) {
        this.childModuleObj[parent.ModuleId].map((element: any) => {
          let map = new Map();
          element.ModulePermissions.forEach((el: any) => {
            map.set(el.PermissionName, true);
          });
          this.selectedObj[element.ModuleId] = map;
        });
      }
      let parentmap = new Map();
      if (this.permissionObj[parent.ModuleId]) {
        this.permissionObj[parent.ModuleId].forEach((el: any) => {
          parentmap.set(el.PermissionName, true);
        });
      }
      this.selectedObj[parent.ModuleId] = parentmap;
    }
    else {
      if (this.childModuleObj[parent.ModuleId]) {
        this.childModuleObj[parent.ModuleId].map((element: any) => {
          // let map = new Map();
          // this.permissions.forEach((el: any) => {
          //   map.set(el.Name, true);
          // });
          delete this.selectedObj[element.ModuleId];
        });
      }
      delete this.selectedObj[parent.ModuleId];
    }
    this.isAllSelect = Object.keys(this.selectedObj).length == this.moduleRes.length ? true : false;
    if (parent && parent.RootModuleId) {
      this.selectRootBasedOnChild(parent.RootModuleId);
    }
  }

  permissionClick(event: Event) {
    event.stopPropagation();
    event.preventDefault()
  }

  // Toggle the selection of a permission for a child module
  togglePermission(event: any, parentId: number, item: any, permission: any, moduleType: string = ''): void {
    
    this.isFormDirty = true;
    event.stopPropagation();
    this.selectModule = false
    if (this.selectedObj[item.ModuleId] && this.selectedObj[item.ModuleId].has(permission.PermissionName)) {
      let count = 0;
      if (moduleType == '') {
        this.childModuleObj[parentId].map((el: any) => {
          if (this.selectedObj[el.ModuleId] && this.selectedObj[el.ModuleId].size == 0) {
            count++
          }
          else {
            try {
              for (let [key, value] of this.selectedObj[el.ModuleId]) {
                count++;
              }
            } catch (error) {
              // console.log(error);
            }
          }
        });
      } else {
        this.selectedObj[item.ModuleId].delete(permission.PermissionName)
        this.isAllSelect = false;
        if (this.selectedObj[item.ModuleId].size == 0) {
          delete this.selectedObj[item.ModuleId];
        }

      }
      if (count == 1) {
        delete this.selectedObj[parentId];
      }

      this.selectedObj[item.ModuleId]?.delete(permission.PermissionName)
      this.isAllSelect = false;
      if (this.selectedObj[item.ModuleId]?.size == 0) {
        delete this.selectedObj[item.ModuleId];
      }


    } else {

      if (this.selectedObj[item.ModuleId]) {
        this.selectedObj[item.ModuleId].set(permission.PermissionName, true)
      } else {
        let map = new Map();
        map.set(permission.PermissionName, true)
        this.selectedObj[item.ModuleId] = map;
        if (moduleType == '') {
          let parentMap = new Map();
          this.parentModules.forEach((el: any) => {
            if (el.ModuleId == parentId) {
              el.ModulePermissions.forEach((permission: any) => {
                parentMap.set(permission.PermissionName, true);
              });
            }
          });
          this.selectedObj[parentId] = parentMap;
        }
      }
    }
    let selectedKeys = Object.keys(this.selectedObj)
    if (selectedKeys.length == this.moduleRes.length) {
      let count = 0;
      selectedKeys.forEach((key: any) => {
        let value = this.selectedObj[key]
        if (value.size == this.permissionObj[key]?.length) {
          count = count + 1;
        }
      })
      if (count == this.moduleRes.length) {
        this.isAllSelect = true
      }
      else {
        this.isAllSelect = false
      }
    }
    // Add any additional logic you need here
    if (item && item.RootModuleId) {
      this.selectRootBasedOnChild(item.RootModuleId);
    }
  }
  getPermissionsForModule() {
    this.common.updatePermissionModule.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res) {
        this.modulePermissionObj = res[this.moduleId];
      }
    });
  }
  getcommentcounts(event: any) {
    try {
      event.stopPropagation();
    } catch (error) {

    }
    this.billingcommentscount = this.commenttotalcount - event.target.value.length;

  }

  canDeactivate(route: string) {
    return this.discardPopupService.formDirtyCheck(route, [this.addRoleForm], true, this.isFormDirty);
  }
  scrollTab(x: any) {
    if (x == 1) {
      const conent = document.querySelector('#tabScroll');
      if (conent) {
        conent.scrollLeft += 300;
      }
    } else {
      const conent = document.querySelector('#tabScroll');
      if (conent) {
        conent.scrollLeft -= 300;
      }
    }
  }
  changeTab(tab: any) {
    if (tab && tab.ModuleId) {
      this.currentTabId = tab.ModuleId;
      this.getParentChildModule()
    }
  }
  selectRootModule(event: any, rootModule: any) {
    
    let rootModuleId = rootModule.ModuleId;
    if (event.target.checked) {
      if (this.moduleBasedOnRoot[rootModuleId] && this.moduleBasedOnRoot[rootModuleId].length > 0) {
        this.moduleBasedOnRoot[rootModuleId].forEach((module: any) => {
          let map = new Map();
          if (this.permissionObj[module.ModuleId]) {
            this.permissionObj[module.ModuleId].forEach((el: any) => {
              if (el) {
                map.set(el.PermissionName, true)
              }
            });
          }
          this.selectedObj[module.ModuleId] = map;
        })
      }
      let rootMap = new Map();
      if (this.permissionObj[rootModuleId]) {
        this.permissionObj[rootModuleId].forEach((el: any) => {
          if (el) {
            rootMap.set(el.PermissionName, true)
          }
        });
      }
      this.selectedObj[rootModuleId] = rootMap;
    } else {
      if (this.moduleBasedOnRoot[rootModuleId] && this.moduleBasedOnRoot[rootModuleId].length > 0) {
        this.moduleBasedOnRoot[rootModuleId].forEach((module: any) => {
          delete this.selectedObj[module.ModuleId]
        });
      }
      delete this.selectedObj[rootModuleId];
    }
    this.isAllSelect = Object.keys(this.selectedObj).length == this.moduleRes.length ? true : false;
  }

  selectRootBasedOnChild(RootModuleId: string) {

    let moduleCount = 0;
    let modules = this.moduleBasedOnRoot[RootModuleId];
    if (modules && modules.length > 0) {
      modules.forEach((el: any) => {
        if (el && el.ModuleId && this.selectedObj[el.ModuleId]) {
          moduleCount++
        }
      });
    }
    if (moduleCount == 0) {
      if (this.selectedObj[RootModuleId]) {
        delete this.selectedObj[RootModuleId]
      }
    } else {
      let rootModuleMap = new Map();
      if (this.permissionObj[RootModuleId]) {
        this.permissionObj[RootModuleId].forEach((el: any) => {
          rootModuleMap.set(el.PermissionName, true);
        });
      }
      this.selectedObj[RootModuleId] = rootModuleMap;
    }
  }

}
