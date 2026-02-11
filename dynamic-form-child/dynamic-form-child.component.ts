import { currentPreviosYearCodePattern } from './../../InputPatterns/input-pattern';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Injectable,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  FormControl,
  AbstractControl,
  ValidatorFn,
  NgControl,
  ValidationErrors,
} from '@angular/forms';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import {
  APIPREFIX,
  DeleteFileById,
  GetControlsByModuleCode,
  GetMastersAPI,
  GetPinCodeDetails,
  GetSchema,
  MultiLangEnabledRoots,
  RootEnum,
  apiURL,
  base64Key,
} from 'src/app/constants/constants';
import { CommonService } from 'src/app/services/common/common.service';
import { JsonFormControls, JsonFormData } from '../add-page/schema.model';
import { StorageService } from 'src/app/storageService/storage-service';
import { ActivatedRoute, } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { Observable, ReplaySubject, Subject, take, takeUntil } from 'rxjs';
import { DatePipe, KeyValue, isPlatformBrowser } from '@angular/common';
import { MetaServiceService } from 'src/app/shared/SEO/meta-service.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MobilePattern, PHONEPATTERN, STATECODE } from 'src/app/InputPatterns/input-pattern';
import { ErrorInputFocusDirective } from 'src/app/shared/Directives/error-input-focus.directive';
import { DynamicFormService } from 'src/app/services/dynamic-form-service/dynamic-form.service';
import { discountAmountGreater, GSTINDoesntMatch, purchaseordercommentsAllow } from 'src/app/ErrorMessages/ErrorMessages';

import { environment } from 'src/environments/environment';
import { discardPopupService } from 'src/app/services/discardPopupService/discrd-popup.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { CustomTranslatePipe } from 'src/app/shared/pipes/custom-translate.pipe';
import { stringify } from 'querystring';


const OPERATOR_MAP: any = {
  "9A3B68FC-20BB-4BEA-9959-1D219D519C2A": "GT",
  "F22FAFEA-183B-417A-B8E0-5712F0F2E2B0": "LT",
  "0139F589-1B6D-4144-83AD-B62ACF6F0096": "GTE",
  "0A05C8CF-6257-4C27-9E26-FA0B104CD193": "LTE",
  "C28C5468-B6D5-467F-B869-C7FA2BEBAF7D": "EQ",
  "5F908342-CB5F-42B7-9612-2AC17B3FF0BD": "NEQ",
  "7F66B29A-EF90-473A-BD32-38CA4DEA8F2E": "LIKE",
  "7F582F94-1328-487B-A94B-254706FDCEE7": "IN",
  "9C91C385-A7C4-40A6-B273-7642FA18FB0E": "NIN",
  "61EEC4F1-D42A-4927-B7CF-46C7A9CFC2BC": "BET"
};


const DEFAULFILESIZE = 5 * 1048576 * 1000;
declare var setHeight: any
declare var $: any
declare var changeDate: any
function getRegex(pattern: string) {
  if (pattern) {
    try {

      return new RegExp(pattern);
    } catch (error) {
      return undefined
    }
  } else {
    return undefined;
  }
}

function RegexValidator(
  pattern1: string | undefined,
  pattern2: string | undefined,
  pattern3: string | undefined
): ValidatorFn {

  return (control: AbstractControl): { [key: string]: boolean } | null => {
    // 
    if (pattern1 || pattern2 || pattern3) {
      let regex1 = pattern1 ? getRegex(pattern1) : undefined;
      let regex2 = pattern2 ? getRegex(pattern2) : undefined;
      let regex3 = pattern3 ? getRegex(pattern3) : undefined;
      if (
        (control?.value !== undefined && control?.value !== null && control?.value != '' || control?.value?.toString()?.includes('0')) &&
        !((regex1 !== undefined && regex1 !== null && regex1.test(control?.value)) ||
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

function GstInValidatiors(pincodeData: any, form?: JsonFormControls): ValidatorFn {

  return (control: AbstractControl): { [key: string]: boolean } | null => {
    // 
    let validData = checkValidData([form?.Pattern1, form?.Pattern2, form?.Pattern3], control.value)
    if (pincodeData && pincodeData.GSTStateCode && control.value && validData) {

      const enteredStateCode = control.value.slice(0, 2);
      if (enteredStateCode == pincodeData.GSTStateCode) {
        return null;
      }
      else {
        return { gstInvalid: true };
      }
    }
    else if (!control.value && form?.Required && validData) {

      if (form.ShowByParentField) {
        if (control.parent?.get(form.ShowByParentField)?.value) {
          return { required: true };
        }
      } else {
        return { required: true };
      }
    }
    else if (control.value && !validData) {
      return { pattern: true };
    }
    return null;
  }
}
function checkValidData(patterns: any[], value: any): boolean {
  let regex1 = patterns[0] ? getRegex(patterns[0]) : undefined;
  let regex2 = patterns[1] ? getRegex(patterns[1]) : undefined;
  let regex3 = patterns[2] ? getRegex(patterns[2]) : undefined;
  if (value) {
    if ((regex1 && regex1?.test(value)) ||
      (regex2 && regex2?.test(value)) ||
      (regex3 && regex3?.test(value))) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }

}


export function compareFieldsValidator(
  sourceField: string,
  operatorId: string
) {
  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.parent) return null;

    const sourceControl = control.parent.get(sourceField);
    if (!sourceControl) return null;

    const targetValue = normalizeValue(control.value);
    const sourceValue = normalizeValue(sourceControl.value);

    if (targetValue == null || sourceValue == null) return null;

    const operator = OPERATOR_MAP[operatorId];
    if (!operator) return null;

    let isValid = true;

    switch (operator) {
      case "GT":  isValid = targetValue >  sourceValue; break;
      case "GTE": isValid = targetValue >= sourceValue; break;
      case "LT":  isValid = targetValue <  sourceValue; break;
      case "LTE": isValid = targetValue <= sourceValue; break;
      case "EQ":  isValid = targetValue == sourceValue; break;
      case "NEQ": isValid = targetValue != sourceValue; break;
    }
    return isValid ? null : { comparisonFailed: true };
  };
}




function normalizeValue(val: any): number | null {
  if (!val) return null;

  // Case 1 – range (take FROM date)
  if (typeof val === "string" && val.includes(",")) {
    const [from] = val.split(",").map(x => x.trim());
    return normalizeValue(from);
  }

  // Case 2 – datetime dd/MM/yyyy HH:mm
  const dt = val.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (dt) {
    const [, dd, mm, yyyy, hh, min] = dt;
    return new Date(+yyyy, +mm - 1, +dd, +hh, +min).getTime();
  }

  // Case 3 – date dd/MM/yyyy
  const d = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (d) {
    const [, dd, mm, yyyy] = d;
    return new Date(+yyyy, +mm - 1, +dd).getTime();
  }

  // Case 4 – ISO or Date object
  if (!isNaN(Date.parse(val))) return new Date(val).getTime();

  // Case 5 – Numeric
  if (!isNaN(val)) return Number(val);

  return null;
}






  function isDate(val: any) {
    return !isNaN(new Date(val).getTime());
  }


enum FormFieldNames {
  StateId = 'stateid',
  CountryId = 'countryid',
  CityId = 'cityid',
  DistrictId = 'districtid',
  PresentCountryId = 'presentcountryid',
  PresentStateId = 'presentstateid',
  PresentCityId = 'presentcityid',

}

/**
 * latest modification details
 * @author Syambabu
 * @modification Added proxyId event emitter and emitting upon savig the record which is being used in Account Management and Account Contact
 * @DateModified 16/09/2024
 * @sprintNumber R30092024
 */

@Component({
  selector: 'app-dynamic-form-child',
  templateUrl: './dynamic-form-child.component.html',
  styleUrls: ['./dynamic-form-child.component.css'],
})
export class DynamicFormChildComponent implements OnInit, OnDestroy {
  @Input() moduleCode: string = '';
  @Input() templateName: string = '';
  @Input() templeteCodeJson: string = '';
  @Input() templateCode: string = '';
  @Input() isDisplayTitle: boolean = true;
  @Input() isViewPopup: boolean = false;
  @Output() saveEvent = new EventEmitter<any>();
  @Output() closeEvent = new EventEmitter<any>();
  @Output() errorEvent = new EventEmitter<any>();
  @ViewChildren(NgControl) formControls!: QueryList<NgControl>;
  @ViewChild(ErrorInputFocusDirective, { static: false }) invalidInputDirective!: ErrorInputFocusDirective;
  @Input() moduleUrl: string = '';
  @Input() moduleName: string = '';
  @Input() recordId: string = '';
  isModify: boolean = false;
  @Input() moduleControlName: string = '';
  @Input() isPartialTabsCase: boolean = false;
  @Input() isTabsCase: boolean = false;

  html = '';

  addForm!: FormGroup;
  Id: string = '';
  isLoading: boolean = false;
  SaveApi: string = '';
  apiPrefix: string = APIPREFIX;
  formFields: JsonFormControls[] = [];
  getDetailsAPI: string = '';
  details: any = undefined;

  mastersObject: { [index: string]: any[] } = {};
  inputTextArr = ['text', 'email', 'url'];
  inputNumberArr = ['number', 'mobile'];
  confirm: { [index: string]: boolean } = {};
  selectedFile: any = {};
  oneMb: number = 1048576;
  base64File: any = {};
  fileField: any;
  fileInvalid: any = {};
  fileData: any[] = [];
  modules: any;
  // moduleName: string = '';
  url = '';
  destroy$ = new Subject<void>();
  checkBoxData: any;
  dropdownSettings = {
    singleSelection: false,
    idField: 'Id',
    textField: 'Name',
    selectAllText: 'Select All',
    unSelectAllText: 'Deselect All',
    itemsShowLimit: 3,
    allowSearchFilter: true,
  };
  mobileForm!: FormGroup;
  myLandLineForm!: FormGroup;
  joinedCheckBoxText: string = '';
  selectedCheckBoxes: any[] = [];
  selectedItems: any[] = [];
  joinedMobileString: string = '';
  joinedLandLineString: string = '';
  messageFromChild: any[] = [];
  isSaveLoading: boolean = false;
  show: boolean = false;
  confirmShow: boolean = false;
  searchResults: any[] = [];
  searchQuery: string = '';

  messageFromParent = [];
  mobileValues: any[] = [];
  mobileArr: any[] = [];
  MobileForm!: FormGroup;
  multiInputForm!: FormGroup;
  dateValuesObj: any = {};
  backEndData: any[] = [];
  backEndMultiInputData: any[] = [];
  multiSelectApiData: {} = {};
  singleSelectApiData: any;
  searchMultiCheckBox: any;
  schemaData: any = {};
  isParentLoaded: boolean = false;
  SiteURL: string = '';
  arrayControlls: { [index: string]: any } = {}
  childPagepopup!: ElementRef;
  detailsData: any = {};
  stateCodeObj: any = {}
  errStateCodeObj: any = {}
  isDirtyStateCodeObj: any = {};
  dependentDropDowns: any = {};
  arrayListdependentObj: any = {};
  isSubmitted = false;
  selectedSearchData: any = {}
  filearrayListObj: any = {}
  dummyImg = 'assets/images/no-image-1.jpg';
  isHTML: { [index: string]: any } = {};
  arraylistMastersObject: any = {};
  originalOrder = (a: KeyValue<any, any>, b: KeyValue<any, any>): any => {
    return 0;
  }
  fileDetails: any = {};
  arrayFileDetails: any = {};

  arrayHideFieldObject: any = {};
  disableEditor: AngularEditorConfig = {
    editable: false,

    height: '15rem',
    minHeight: '5rem',
    // placeholder: 'Enter text here...',

    toolbarHiddenButtons: [
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'removeFormat',
        'fontName',
        'undo',
        'redo',
        'subscript',
        'superscript',
        'toggleEditorMode'
      ]],


  }

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '15rem',
    minHeight: '5rem',
    // placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'removeFormat',
        'fontName',
        'undo',
        'redo',
        'subscript',
        'superscript'
      ]],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ],
    sanitize: false,
    toolbarPosition: 'top',

  };
  listAPI: string = '';
  stateRequiredError: any = {};
  isLastLength: { [index: string]: number } = {};
  lastIndex: { [index: string]: number } = {};
  isFormDirty: boolean = false;

  DiscardPopupShow = environment.DiscardPopupShow;
  pincodeDetailsObject: any = {};
  pinCodeErrorMsg: any = {};
  isMobileToolTip: boolean = false;
  formFieldObject: any = {};
  changedetect: boolean = false;
  root: string = '';
  rootEnum = RootEnum;
  commonRoot: string = '';
  multiLangEnabledRoots: any = MultiLangEnabledRoots;
  @Input() isProxySave: boolean = false;
  @Output() proxyIdEvent = new EventEmitter<any>();
  multipleFiles: any = {};
  multiFileDetailsObj: any = {}
  specalityData: any[] = [];
  dependingMultiSelectOnSingleSelect: any = {};
  arrayfileInvalid:{[index:string]:any}={};
  base64ArrayFile: any = {};
  selectedArrayFile:any={};
  selectedDateRange: string = '';
  ranges: any[] = [];
  minYear: number = 1990;
  dateInvalidError:string = ''
  constructor(
    private zone: NgZone,
    public api: HelperModuleService,
    public formBuilder: FormBuilder,
    public https: HttpClient,
    public common: CommonService,
    public storage: StorageService,
    private SEO: MetaServiceService,
    public route: Router,
    public actRoute: ActivatedRoute,
    public modalService: NgbModal,
    public datePipe: DatePipe,
    @Inject(PLATFORM_ID) public platformId: any,
    public dynamicFormService: DynamicFormService,
    public discardPopupService: discardPopupService,
    public multiLanguageService: MultilanguageService,
    public customTranslatePipe: CustomTranslatePipe,
    public changedetectRef: ChangeDetectorRef
  ) {
    this.url = this.route.url;
    this.addForm = this.formBuilder.group({});

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
  private getParentId(): string {
    return this.getRouteId() || this.Id || '';
  }
  isView: boolean = false;
  ngOnInit(): void {
    const routePath = this.route.url;
    const lastSegment = routePath.substring(routePath.lastIndexOf('/') + 1);
    this.isView = lastSegment === 'view';

    this.isView ? this.addForm.disable() : this.addForm.enable();

    const routeId = this.getRouteId() || this.recordId;
    const resolvedId = routeId || '';
    if (resolvedId) {
      this.isModify = true;
    } else if (this.route.url.includes('/modify') || this.route.url.includes('/view')) {
      this.isModify = true;
      this.route.navigate([this.moduleUrl + '/list']);
      return;
    }

    this.root = this.route.url.split('/')[1] || '';


    this.multiLanguageService.selectedLanguageUpdation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {

        this.changedetect = !this.changedetect;
      });



    this.dynamicFormService.save$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.Submit();
    })
    if (isPlatformBrowser(this.platformId)) {
      (window as { [key: string]: any })['compare'] = {
        component: this,
        zone: this.zone,
        changeDate: (date: any, fieldName: any, dateString: string, index: any, listName: any) =>
          this.changeDate(date, fieldName, dateString, index, listName),
      };
    }

    if (isPlatformBrowser(this.platformId)) {
      let getWidth: any = $(window).width();
      if (getWidth < 999) {
        this.isMobileToolTip = true;
      } else {
        this.isMobileToolTip = false;
      }
    }
    this.getCode();

    this.getSchema();
    this.dropdownSettings = {
      singleSelection: false,
      idField: 'Id',
      textField: 'Name',
      selectAllText: 'Select All',
      unSelectAllText: 'Deselect All',
      itemsShowLimit: 3,
      allowSearchFilter: true,
    };

    // Initialize ranges for date range picker
    this.ranges = [];


    if (this.storage.getLocalStorage('siteUrl')) {
      let url = this.storage.getLocalStorage('siteUrl') || '';

      this.SiteURL = url.split('.')[0].split('//')[1];
    } else {
      this.SiteURL = '';
    }
    if (this.isModify) {
      this.SEO.updateTags(

        '',
        '',
        ' ' + '-' + ' ' + 'Modify ' + this.templateName
      );
    } else {
      this.SEO.updateTags(
        '',
        '',
        ' ' + '-' + ' ' + 'Add ' + this.templateName
      );
      this.isParentLoaded = true;
    }
    this.onResize(null);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const width = window.innerWidth;
    if (width >= 1250) {
      this.dropdownSettings.itemsShowLimit = 3;
    } else if (width <= 1249) {
      this.dropdownSettings.itemsShowLimit = 2;
    } else if (width < 768) {
      this.dropdownSettings.itemsShowLimit = 2;
    }
  } 
  convertDateRangeFormat(dateString: string): Date | null {
  // Convert "dd-mm-yyyy" or "dd/mm/yyyy" format to Date object
  const normalized = dateString?.replace(/[-]/g, '/') || '';
  const parts = normalized.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

  getCalenderValue(field: any, event: any) {
    if (event && event.dateRange) {
      // Handle combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
      // - save combined to form control, - show friendly display with hyphen
      this.addForm.get(field.FormField)?.setValue(event.dateRange);
      this.selectedDateRange = event.dateRange.split(',').join(' - ');
    } else if (event && event.FromDate && event.ToDate) {
  // Handle separate format (legacy)
      this.addForm.get(field.FormField)?.setValue(event.FromDate || "");
      this.addForm.get('ToDate')?.setValue(event.ToDate || "");
      this.selectedDateRange = `${event.FromDate} - ${event.ToDate}`;
    }
  }

  getDateRangeDisplay(fieldName: string): string {
    // Get the display value for date range fields
    // Form stores: "dd/MM/yyyy,dd/MM/yyyy" 
    // Display shows: "dd/MM/yyyy - dd/MM/yyyy"
    const value = this.addForm.get(fieldName)?.value;
    if (value && typeof value === 'string' && value.includes(',')) {
      return value.split(',').join(' - ');
    }
    return value || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    try {

    } catch (error) {

    }

  }


  getCode() {
    // if (!this.route.url.includes('/add')) {
    const routeId = this.getRouteId() || this.recordId;
    const id = routeId || '';
    if (id) {
      this.Id = id;
    } else {
      if (this.isModify) {
        this.route.navigate([this.moduleUrl + '/list']);
      }
    }

    // }
  }

  getArrayControls(arrayListName: string) {
    return this.addForm.get(arrayListName) as FormArray
  }
  eventPrevent(event: any) {
    event.stopPropagation();
  }

  getSchema() {
    //  
    let data = this.storage.getSessionStorage(`${this.templateCode}formData`);
    if (data) {
      let formData: any = JSON.parse(data);



      this.setSchemaData(formData);
    } else {
      let req = {
        ModuleCode: this.templateCode,
      };

      this.api.getService(GetSchema + this.templeteCodeJson).subscribe(
        (formData: any) => {
          this.setSchemaData(formData);
        },
        (error) => {
          // this.route.navigate([this.moduleUrl + '/list']);
          this.api
            .postService(GetControlsByModuleCode, req)
            .subscribe((res) => {
              if (res && res.ReturnCode == 0) {
                this.setSchemaData(res);
              } else {
                this.common.changeIsFailureeMessage(true);
                this.common.changeResponseMessage(
                  res.ReturnMessage
                );

                // this.route.navigate([this.moduleUrl + '/list']);
              }
            }, error => {
              this.common.changeIsFailureeMessage(true);
              this.common.changeResponseMessage(
                "Coudn't load " + this.moduleName + ' please try later.'
              );
            });
        }
      );
    }
  }

  getFormArrayControls(arrayListName: string) {
    return (<FormArray>this.addForm.get(arrayListName)).controls

  }

  setSchemaData(formData: any) {
    if (formData) {
      const formatMapping: any = {
        yyyy: 'Y',
        yyy: 'y',
        yy: 'y',
        YYYY: 'Y',
        YYY: 'Y',
        YY: 'Y',
        MMM: 'M',
        MM: 'm',
        mmm: 'm',
        mm: 'm',
        ss: 's',
        'HH:mm:ss': 'H:i:s',
        'HH:mm': 'H:i',
        dd: 'd',
        DD: 'D',
      };

      this.schemaData = JSON.parse(JSON.stringify(formData));

      this.filearrayListObj = {}

      // 
      formData?.Data.forEach((el: any) => {
        if ((el.Type == 'file' || el.Type == 'image') && el.ArrayListName) {
          this.filearrayListObj[el.ArrayListName] = true;
        }
      })
      this.formFields = formData?.Data.filter((field: any) => {
        if (field.DateFormat && typeof field.DateFormat === 'string') {
          field['oldDateFormat'] = field.DateFormat
          field.DateFormat = field.DateFormat.replace(
            /(yyyy|yyy|yy|MMM|MM|ss|HH:mm|dd|\/|-|:y)/g,
            (match: any) => formatMapping[match] || match
          );
        }





        if (field.ArrayListName && field.Type != 'multicheckbox' && field.Type != 'searchandmultiselect' && field.Type != 'file' && field.Type != 'file+multiselect') {
          if (!this.formFieldObject[field.ArrayListName]) {
            this.formFieldObject[field.ArrayListName] = {}
          }
          this.formFieldObject[field.ArrayListName][field.FormField] = field;
          if (this.arrayControlls[field.ArrayListName]) {
            this.arrayControlls[field.ArrayListName] = [...this.arrayControlls[field.ArrayListName], field]
          } else {
            this.arrayControlls[field.ArrayListName] = [field];
            return field
          }
        } else {
          this.formFieldObject[field.FormField] = field;

          return field
        }
      });


      Object.keys(this.arrayControlls).forEach(key => {
        let fields = this.arrayControlls[key];


        if (fields) {
          let hideFieldCount = 0;
          for (let i = 0; i < fields.length; i++) {
            const element = fields[i];

            if (element.IsHideFieldInUI) {
              hideFieldCount++;
            } else {
              hideFieldCount = 0;
              break;
            }

          }

          if (hideFieldCount != 0) {
            this.arrayHideFieldObject[key] = true;
          }
        }


      })


      // console.log(this.addForm)

      this.formFields.forEach((el: JsonFormControls) => {




        if (this.templateCode == 'FNCLGR-10486') {
          if (el.FormField == 'ParentFinanceLedgerId' || el.FormField == 'FinanceBalanceTypeId' || el.FormField == 'OpeningBalance') {
            el.ShowByParentField = 'FinanceLedgerTypeId';
          }
        }
        if (this.templateCode == 'ENTDATA-10747') {
          if (el.FormField == 'MasterDataId') {
            el.ShowByParentField = 'IsCustom';
          }
        }



      })


      let getApi = formData?.APIUrls[0].GetByIdURL;
      if (formData?.APIUrls[0].GetByIdURL?.includes('/api')) {

        this.getDetailsAPI = apiURL + '/' + getApi;
      } else {

        this.getDetailsAPI = APIPREFIX + getApi;
      }

      if (formData?.APIUrls[0].SaveAPIURL?.includes('/api')) {

        this.listAPI = apiURL + '/' + formData.APIUrls[0].GetBySearchURL;
      } else {
        this.listAPI = APIPREFIX + formData.APIUrls[0].GetBySearchURL;

      }
      if (formData?.APIUrls[0].SaveAPIURL?.includes('/api')) {

        this.SaveApi = apiURL + '/' + formData?.APIUrls[0].SaveAPIURL;
      } else {

        this.SaveApi = APIPREFIX + formData?.APIUrls[0].SaveAPIURL;
      }
      this.createFormFields();
      this.getRequiredMasters();
      this.formFields.forEach(el => {
        const control = this.addForm.get(el.FormField);
        console.log(control)
        if (this.isView) {
          control?.disable();
        } else {
          control?.enable();
        }
      });
      if (this.Id) {
        this.getDetailsByCode();
      }

if (this.schemaData?.APITemplateColumnCondition?.length) {

  this.schemaData.APITemplateColumnCondition.forEach((cond: any) => {

    const targetField = cond.APITemplateColumnName;
    const sourceField = cond.SourceColumnName;
    const operatorId  = cond.ConditionalOperatorId;
    const errorMsg    = cond.ErrorMessage;

    const targetControl = this.addForm.get(targetField);
    const sourceControl = this.addForm.get(sourceField);

    if (!targetControl || !sourceControl) return;

    // ✔ Add validator (only 2 params)
    targetControl.addValidators(
      compareFieldsValidator(sourceField, operatorId)
    );

    // ✔ Revalidate on source change
    sourceControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        targetControl.updateValueAndValidity({ emitEvent: false });
      });

    // ✔ Store API error for UI usage
    if (!this.formFieldObject[targetField]) {
      this.formFieldObject[targetField] = {};
    }
    this.formFieldObject[targetField].conditionalErrorMessage = errorMsg;
  });
}


      // 
      const pincodeElArr = this.formFields.filter((el: JsonFormControls) => (el.FormField?.toLowerCase() == 'pincode' || el.FormField?.toLowerCase() == 'presentpincode'))
      const gstinElArr = this.formFields.filter((el: JsonFormControls) => (el.FormField?.toLowerCase() == 'gstinnumber'));
      if (pincodeElArr && pincodeElArr.length != 0) {
        pincodeElArr.forEach((el: any) => {
          this.addForm.get(el.FormField)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {

            if (value && value?.toString()?.length >= 6) {
              this.addForm.get(el.FormField)?.disable({ emitEvent: false });  // Keep Event Emit false alway, as when vent emits it re subscribes agin and results in looped susbcription
              let req = {
                "Code": value?.toString()
              }
              this.api.postService(GetPinCodeDetails, req).subscribe({
                next: (res: any) => {
                  // //
                  this.addForm.get(el.FormField)?.enable({ emitEvent: false });
                  if (el.FormField?.toLowerCase() == 'pincode') {
                    if (res && res.Data && res.Data.Details) {
                      this.pincodeDetailsObject[el.FormField] = res.Data.Details[0];


                      if (this.addForm.get('CountryId')) {
                        this.mastersObject['CountryId'] = [{ Id: res.Data.Details[0].ContryId, Name: res.Data.Details[0].CountryName }]
                        this.addForm.get('CountryId')?.setValue(res.Data.Details[0].ContryId);
                      }
                      if (this.addForm.get('StateId')) {
                        this.mastersObject['StateId'] = [{ Id: res.Data.Details[0].StateId, Name: res.Data.Details[0].StateName }]
                        this.addForm.get('StateId')?.setValue(res.Data.Details[0].StateId);
                      }

                      if (this.addForm.get('CityId')) {
                        this.mastersObject['CityId'] = [{ Id: res.Data.Details[0].CityId, Name: res.Data.Details[0].CityName }]
                        this.addForm.get('CityId')?.setValue(res.Data.Details[0].CityId);
                      }
                      if (this.addForm.get('DistrictId')) {
                        this.mastersObject['DistrictId'] = [{ Id: res.Data.Details[0].DistrictId, Name: res.Data.Details[0].DistrictName }]
                        this.addForm.get('DistrictId')?.setValue(res.Data.Details[0].DistrictId);
                      }

                      // this.addForm.get(el.FormField)?.setErrors(null);

                      this.pinCodeErrorMsg[el.FormField] = '';
                      if (gstinElArr && gstinElArr.length > 0 && gstinElArr[0].FormField?.toLowerCase() == 'gstinnumber') {
                        this.addForm.get(gstinElArr[0].FormField)?.setValidators(GstInValidatiors(this.pincodeDetailsObject[el.FormField], gstinElArr[0]))
                        this.addForm.get(gstinElArr[0].FormField)?.updateValueAndValidity();
                      }

                    } else {
                      // this.common.changeIsFailureeMessage(true);
                      let msg = res.ReturnMessage;
                      if (msg) {
                        msg = msg.split('-')[1];
                        this.pinCodeErrorMsg[el.FormField] = msg;
                        this.addForm.get(el.FormField)?.setErrors({ 'pinCodeErr': true });
                      }
                      if (this.addForm.get('CountryId')) {
                        this.addForm.get('CountryId')?.setValue(null);
                      }
                      if (this.addForm.get('StateId')) {
                        this.addForm.get('StateId')?.setValue(null);
                      }
                      if (this.addForm.get('CityId')) {
                        this.addForm.get('CityId')?.setValue(null);
                      }
                      if (this.addForm.get('DistrictId')) {
                        this.addForm.get('DistrictId')?.setValue(null);
                      }
                    }
                  }
                  else {

                    if (res && res.Data && res.Data.Details) {
                      this.pincodeDetailsObject[el.FormField] = res.Data.Details[0];


                      if (this.addForm.get('PresentCountryId')) {
                        this.mastersObject['PresentCountryId'] = [{ Id: res.Data.Details[0].ContryId, Name: res.Data.Details[0].CountryName }]
                        this.addForm.get('PresentCountryId')?.setValue(res.Data.Details[0].ContryId);
                      }
                      if (this.addForm.get('PresentStateId')) {
                        this.mastersObject['PresentStateId'] = [{ Id: res.Data.Details[0].StateId, Name: res.Data.Details[0].StateName }]
                        this.addForm.get('PresentStateId')?.setValue(res.Data.Details[0].StateId);
                      }

                      if (this.addForm.get('PresentCityId')) {
                        this.mastersObject['PresentCityId'] = [{ Id: res.Data.Details[0].CityId, Name: res.Data.Details[0].CityName }]
                        this.addForm.get('PresentCityId')?.setValue(res.Data.Details[0].CityId);
                      }
                      // this.addForm.get(el.FormField)?.setErrors(null);

                      this.pinCodeErrorMsg[el.FormField] = '';


                    } else {

                      let msg = res.ReturnMessage;
                      if (msg) {
                        msg = msg.split('-')[1];
                        this.pinCodeErrorMsg[el.FormField] = msg;
                        this.addForm.get(el.FormField)?.setErrors({ 'pinCodeErr': true });
                      }
                      if (this.addForm.get('PresentCountryId')) {
                        this.addForm.get('PresentCountryId')?.setValue('');
                      }
                      if (this.addForm.get('PresentStateId')) {
                        this.addForm.get('PresentStateId')?.setValue('');
                      }

                      if (this.addForm.get('PresentCityId')) {
                        this.addForm.get('PresentCityId')?.setValue('');
                      }
                    }
                  }

                }
              })
            } else {
              if (el.FormField?.toLowerCase() == 'pincode') {
                if (this.addForm.get('CountryId')) {
                  this.mastersObject['CountryId'] = []
                  this.addForm.get('CountryId')?.setValue('');
                }
                if (this.addForm.get('StateId')) {
                  this.mastersObject['StateId'] = []
                  this.addForm.get('StateId')?.setValue('');
                }

                if (this.addForm.get('CityId')) {
                  this.mastersObject['CityId'] = []
                  this.addForm.get('CityId')?.setValue('');
                }
                if (this.addForm.get('DistrictId')) {
                  this.mastersObject['DistrictId'] = []
                  this.addForm.get('DistrictId')?.setValue('');
                }


              } else {
                if (this.addForm.get('PresentCountryId')) {
                  this.mastersObject['PresentCountryId'] = []
                  this.addForm.get('PresentCountryId')?.setValue('');
                }
                if (this.addForm.get('PresentStateId')) {
                  this.mastersObject['PresentStateId'] = []
                  this.addForm.get('PresentStateId')?.setValue('');
                }

                if (this.addForm.get('PresentCityId')) {
                  this.mastersObject['PresentCityId'] = []
                  this.addForm.get('PresentCityId')?.setValue('');
                }
              }
            }
          })
        });



      }


    } else {

      this.route.navigate([this.moduleUrl + '/list']);
    }
  }
  createFormFields() {
    // 
    this.formFields.forEach((field: JsonFormControls) => {
      // 
      let validators: any[] = [];
      if (field.Type != 'file' && field.Type != 'image' && (!field.ArrayListName || field.Type?.toLowerCase() == 'multicheckbox' || field.Type?.toLowerCase() == 'searchandmultiselect')) {
        validators = this.getValidators(field);
      }

      if (field.SourceColumnName && field.ConditionalOperatorId) {
        validators.push(
          compareFieldsValidator(
            field.SourceColumnName,
            field.ConditionalOperatorId
          )
        );
      }

      if (field.Type == 'checkbox') {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control(false, { validators: validators, updateOn: 'change' })
        );
      }
       if (field.Type == 'htmleditor') {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control('', { validators: validators, updateOn: 'change' })
        );
      }
      else if (field.Type == 'toggle') {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control(true, { validators: validators, updateOn: 'change' })
        );
      }
      else if (field.FormField?.toLowerCase() == FormFieldNames.StateId || field.FormField?.toLowerCase() == FormFieldNames.CountryId || field.FormField?.toLowerCase() == FormFieldNames.CityId || field.FormField?.toLowerCase() == FormFieldNames.DistrictId ||
        field.FormField?.toLowerCase() == FormFieldNames.PresentCountryId || field.FormField?.toLowerCase() == FormFieldNames.PresentStateId || field.FormField?.toLowerCase() == FormFieldNames.PresentCityId) {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control({ value: null, disabled: true }, { validators: validators, updateOn: 'change' })
        );
      }
      else if (field.Type == 'color') {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control('#ffffff', { validators: validators, updateOn: 'change' })
        );
      } else if (field.Type == 'multicheckbox' || field.Type?.toLowerCase() == 'searchandmultiselect') {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control([], { validators: validators, updateOn: 'change' })
        );
      }
      else if (field.Type == 'phonenumber') {
        let codeValidators = [Validators.pattern(STATECODE)]
        if (field.Required) {

          codeValidators.push(Validators.required)
        }

        let fromGroup = this.formBuilder.group({
          code: [{ value: '', disabled: false }, { validators: codeValidators, updateOn: 'change' }],
          number: ['', { validators: validators, updateOn: 'change' }]
        });
        this.addForm.addControl(
          field.FormField,
          fromGroup
        );
      } else if ((field.Type?.toLowerCase() == 'searchdropdown' || field.Type?.toLowerCase() == 'dropdown') && !field.ArrayListName) {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control(null, { validators: validators, updateOn: 'change' })
        )
      }
      if (field.FormField?.toLowerCase() == 'gstinnumber') {
        const pincodeElArr = this.formFields.filter((el: JsonFormControls) => (el.FormField?.toLowerCase() == 'pincode'))
        const pincodeFormField = pincodeElArr[0].FormField;
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control({ value: '', disabled: false }, { validators: GstInValidatiors(this.pincodeDetailsObject[pincodeFormField], field), updateOn: 'change' })
        )
        // console.log(this.addForm.get(field.FormField));

      }
      else if (!field.ArrayListName) {
        this.addForm.addControl(
          field.FormField,
          this.formBuilder.control({ value: '', disabled: false }, { validators: validators, updateOn: 'change' })
        );

      }

     else if (field.Type?.toLowerCase() === 'daterange') {
        this.addForm.addControl(
            field.FormField,
            new FormControl(null, field.Required ? Validators.required : [])
        );
    }

    });

    this.addFormArayController()
  }

  addFormArayController() {

    Object.entries(this.arrayControlls).forEach((item: any) => {
      let value: any;
      let key: any;
      [key, value] = item;


      // let obj  :any = 


      let fromGroup = this.getArrayFormGroup(value)

      this.addForm.addControl(
        key,
        this.formBuilder.array([fromGroup])
      );
      this.lastIndex[key] = 0;
      this.isLastLength[key] = 1
    })
  }

  openDatePicker(id: any) {
    if (isPlatformBrowser(this.platformId)) {
      if (id) {
        id.show()
      }
    }

  }

  getArrayFormGroup(value: any) {
    let obj: any = {}
    value.forEach((element: any) => {
      if (element.Type != 'file' && element.Type != 'image') {
        let validators = this.getValidators(element);
        let formcontrol = this.formBuilder.control({ value: null, disabled: false }, { validators: validators, updateOn: 'change' });
        let fieldName = element.FormField;
        obj[fieldName] = formcontrol;
      }else{
        obj[element.FormField] = this.formBuilder.control({ value: '', disabled: false })
      }
      

    });


    obj['Status'] = this.formBuilder.control({ value: '', disabled: false })
    obj['Id'] = this.formBuilder.control({ value: '', disabled: false })
    return this.formBuilder.group(obj)
  }

  getRequiredMasters() {
    // 
    let pincodeReleatedField: any = {};
    const pincodeElArr = this.formFields.filter((el: JsonFormControls) => (el.FormField?.toLowerCase() == 'pincode' || el.FormField?.toLowerCase() == 'presentpincode'))
    if (pincodeElArr.length) {
      pincodeElArr.forEach((el: JsonFormControls) => {
        if (el && el.FormField?.toLowerCase() == 'pincode') {
          pincodeReleatedField[FormFieldNames.StateId] = true;
          pincodeReleatedField[FormFieldNames.CountryId] = true;
          pincodeReleatedField[FormFieldNames.CityId] = true;
          pincodeReleatedField[FormFieldNames.DistrictId] = true;
        } else if (el && el.FormField?.toLowerCase() == 'presentpincode') {
          pincodeReleatedField[FormFieldNames.PresentCountryId] = true;
          pincodeReleatedField[FormFieldNames.PresentStateId] = true;
          pincodeReleatedField[FormFieldNames.PresentCityId] = true;
        }
      })
    }
    this.formFields.forEach((field: JsonFormControls) => {
      if (!this.arrayControlls[field.ArrayListName]) {
        if (
          (field.Type == 'dropdown' ||
            field.Type == 'radiobuttonlist' ||
            field.Type == 'multicheckbox' || field.Type == 'searchdropdown') &&
          field?.MasterAPIUrl &&
          field.MasterModuleCode && !field.ParentFieldName &&
          !pincodeReleatedField[field.FormField?.toLowerCase()]
        ) {

          let req: any = {
            MasterDataCode: field.MasterModuleCode,
            Active: 'true',

          };
          if (field.MasterAPIUrl?.toLowerCase() == 'getdatabysearch') {
            req['MasterDataCode'] = undefined;
            req['ModuleCode'] = field.MasterModuleCode;
          }

          this.masterAPICall(req, field)
        }
        else if (field.ParentFieldName) {

          // if(!field.ArrayListName){

          this.dependentDropDowns[field.ParentFieldName] = field
          // }

        }
      }


    });
    Object.values(this.arrayControlls).forEach((valueArr: any,) => {
      // 

      valueArr.forEach((field: any,) => {
        if
          ((field.Type == 'dropdown' ||
            field.Type == 'radiobuttonlist' ||
            field.Type == 'multicheckbox' || field.Type == 'searchdropdown') &&
          field?.MasterAPIUrl &&
          field.MasterModuleCode && !field.ParentFieldName &&
          !pincodeReleatedField[field.FormField?.toLowerCase()]
        ) {

          let req: any = {
            MasterDataCode: field.MasterModuleCode,
            Active: 'true',

          };
          if (field.MasterAPIUrl?.toLowerCase() == 'getdatabysearch') {
            req['MasterDataCode'] = undefined;
            req['ModuleCode'] = field.MasterModuleCode;
          }

          this.masterAPICall(req, field, 0);
        }
        else if (field.ParentFieldName) {
          
          let parentField = this.formFields.find((el: JsonFormControls) => el.FormField == field.ParentFieldName);
          if (parentField && parentField.ArrayListName) {
            if (!this.arrayListdependentObj[field.ArrayListName]) {
              this.arrayListdependentObj[field.ArrayListName] = {};
            }

            this.arrayListdependentObj[field.ArrayListName][field.ParentFieldName] = field
          } else {
            if (!this.dependentDropDowns[field.ParentFieldName]) {
              this.dependentDropDowns[field.ParentFieldName] = field
            }
          }

        }
      })

    })
  }
  masterAPICall(req: any, field: JsonFormControls, index?: number) {

    let pincodeReleatedField: any = {};
    const pincodeElArr = this.formFields?.filter((el: JsonFormControls) => (el.FormField?.toLowerCase() == 'pincode' || el.FormField?.toLowerCase() == 'presentpincode'))
    if (pincodeElArr.length > 0) {
      pincodeElArr.forEach((el: JsonFormControls) => {
        if (el && el.FormField?.toLowerCase() == 'pincode') {
          pincodeReleatedField[FormFieldNames.StateId] = true;
          pincodeReleatedField[FormFieldNames.CountryId] = true;
          pincodeReleatedField[FormFieldNames.CityId] = true;
          pincodeReleatedField[FormFieldNames.DistrictId] = true;
        } else if (el && el.FormField?.toLowerCase() == 'presentpincode') {
          pincodeReleatedField[FormFieldNames.PresentCountryId] = true;
          pincodeReleatedField[FormFieldNames.PresentStateId] = true;
          pincodeReleatedField[FormFieldNames.PresentCityId] = true;
        }
      })
    }
    else {
      if (this.addForm.get('CountryId')) {
        this.addForm.get('CountryId')?.enable();
      }
      if (this.addForm.get('StateId')) {
        this.addForm.get('StateId')?.enable();
      }
      if (this.addForm.get('CityId')) {
        this.addForm.get('CityId')?.enable();
      }
      if (this.addForm.get('DistrictId')) {
        this.addForm.get('DistrictId')?.enable();
      }
      if (this.addForm.get('PresentCountryId')) {
        this.addForm.get('PresentCountryId')?.enable();
      }
      if (this.addForm.get('PresentStateId')) {
        this.addForm.get('PresentStateId')?.enable();
      }

      if (this.addForm.get('PresentCityId')) {
        this.addForm.get('PresentCityId')?.enable();
      }
    }

    if (!pincodeReleatedField[field.FormField?.toLowerCase()]) {
      // this.addForm.get(field.FormField)?.enable();
      let url = ''
      if (!field.MasterAPIUrl?.includes('/api/')) {
        url = this.apiPrefix + field.MasterAPIUrl
      }
      else {
        url = apiURL + field.MasterAPIUrl
      }
      console.log(url)
      this.api
        .postService(url, req)
        .subscribe((res: any) => {
          if (res && res.Data && res.ReturnCode == 0) {
            console.log(res)
            // res.Data[0].Id =  "83437343-593F-4D52-8B96-79DDE80C795D"
            // res.Data[1].Id =  res.Data[1].StartupTypeId
            if (index != undefined && index != null) {

              if (!this.arraylistMastersObject[field.ArrayListName]) {
                this.arraylistMastersObject[field.ArrayListName] = {};
              }

              if (!this.arraylistMastersObject[field.ArrayListName][field.FormField]) {

                this.arraylistMastersObject[field.ArrayListName][field.FormField] = [];
              }

              this.arraylistMastersObject[field.ArrayListName][field.FormField][index] = res.Data;
              if (this.isModify && !field.ParentFieldName) {
                const controls = this.getFormArrayControls(field.ArrayListName);
                controls.forEach((el: any, j: number) => {
                  this.arraylistMastersObject[field.ArrayListName][field.FormField][j] = structuredClone(res.Data);
                })
              }
            } else {

              this.mastersObject[field.FormField] = res.Data;
            }

          } else {
            if (index != undefined && index != null) {

              if (!this.arraylistMastersObject[field.ArrayListName]) {
                this.arraylistMastersObject[field.ArrayListName] = {};
              }

              if (this.arraylistMastersObject[field.ArrayListName][field.FormField]) {

                this.arraylistMastersObject[field.ArrayListName][field.FormField][index] = []
              } else {

                this.arraylistMastersObject[field?.ArrayListName][field?.FormField] = []
              }

            } else {

              this.arraylistMastersObject[field?.ArrayListName][field?.FormField] = []
            }
          }

          // console.log( this.arraylistMastersObject[field.ArrayListName])
          // this.changedetectRef.detectChanges();
        });
    }
  }

  getValidators(field: JsonFormControls) {
    const validatorsToAdd = [];
    for (let [key, value] of Object.entries(field)) {
      key = key?.toLowerCase();
      let intValue;
      switch (key) {
        case 'min':
          intValue = parseInt(value);
          if (intValue && intValue > 0 && field.Type?.toLowerCase() != 'multimobile') {
            validatorsToAdd.push(Validators.min(intValue));
          }
          break;
        case 'max':
          intValue = parseInt(value);
          if (intValue && intValue > 0 && field.Type?.toLowerCase() != 'multimobile') {
            validatorsToAdd.push(Validators.max(intValue));
          }
          break;
        case 'required':
          if (!field.IsHideFieldInUI) {
            if (value && !(this.isModify && (field.Type?.toLowerCase() == 'password' || field.Type?.toLowerCase() == 'file' || field.Type?.toLowerCase() == 'image'))) {
              validatorsToAdd.push(Validators.required);
            } else if (field.Type?.toLowerCase() == 'password' && !this.isModify && field.Required) {
              validatorsToAdd.push(Validators.required);
            }
          }
          break;
        case 'requiredtrue':
          if (value) {
            validatorsToAdd.push(Validators.requiredTrue);
          }
          break;

        case 'minlength':
          intValue = parseInt(value);
          if (intValue && intValue > 0 && field.Type?.toLowerCase() != 'multimobile') {
            validatorsToAdd.push(Validators.minLength(intValue));
          }
          break;
        case 'maxlength':
          intValue = parseInt(value);
          if (intValue && intValue > 0 && field.Type?.toLowerCase() != 'multimobile' && field.Type?.toLowerCase() != 'number+decimals') {
            validatorsToAdd.push(Validators.maxLength(intValue));
          }
          break;

      default:
        break;
    }
  }

  const fieldType = field?.Type?.toLowerCase();

  if (fieldType !== 'date' && fieldType !== 'datetime') {
    if (fieldType === 'multimobile') {
      field.Pattern1 = MobilePattern;
      validatorsToAdd.push(RegexValidator(MobilePattern, '', ''));
    } else if (fieldType === 'phonenumber') {
      field.Pattern1 = PHONEPATTERN;
      validatorsToAdd.push(RegexValidator(PHONEPATTERN, '', ''));
    } else {
      this.changePattern(field);
      if (fieldType === 'textarea') {
        field.MaxLengthEntered = field?.MaxLength;
        if (field?.Pattern1 === '^[^<>]*$') {
          field.allowedComments = purchaseordercommentsAllow;
        } else {
          field.allowedComments = '';
        }
      }

      validatorsToAdd.push(RegexValidator(field.Pattern1, field.Pattern2, field.Pattern3));
    }
  }

  if (fieldType === 'htmleditor') {
    if (field?.Required && !field.IsHideFieldInUI) {
      validatorsToAdd.push(Validators.required);
    }
  }

  return validatorsToAdd;
}




  changePattern(field: JsonFormControls) {

    if (field.Pattern1) {
      field.Pattern1 = field.Pattern1.replaceAll('//', '/')
    }
    if (field.Pattern2) {
      field.Pattern2 = field.Pattern2.replaceAll('//', '/')
    }
    if (field.Pattern3) {
      field.Pattern3 = field.Pattern3.replaceAll('//', '/')
    }
  }

  makeStateCodeDirty(field: string) {
    this.isDirtyStateCodeObj[field] = true
    this.stateRequiredError[field] = false
  }

  stateCodeChange(field: string) {
    if (this.isDirtyStateCodeObj[field]) {


      const regex = new RegExp(STATECODE)
      if (this.stateCodeObj[field] && !regex.test(this.stateCodeObj[field])) {
        this.errStateCodeObj[field] = 'Invalid State Code'

      } else {
        this.errStateCodeObj[field] = undefined

      }
    }

  }

  cancel(isClear?: boolean) {
    //   
    // this.route.navigate([this.moduleUrl + '/list']);
    if (this.DiscardPopupShow && !isClear && !this.isProxySave) {
      let URL = this.moduleUrl + '/list'
      this.discardPopupService.formDirtyCheck(URL, [this.addForm], false, this.isFormDirty)
    }
    else {
      this.storage.deleteSessionStorage(this.templateCode + 'Id')
      this.closeEvent.emit();
    }
  }

  closeView() {
    // 
    this.discardPopupService.isNavigate.next(true);
    // if (!this.isProxySave) {
    //   this.route.navigate([this.moduleUrl + '/list']);
    // }
    // else {
    this.storage.deleteSessionStorage(this.templateCode + 'Id')
    this.closeEvent.emit();
    // }
  }

  getDetailsByCode() {
    let req = {
      Code: this.Id,
      ModuleCode: this.templateCode,
    };
    this.api.postService(this.getDetailsAPI, req).subscribe((res: any) => {
      if (res && res.Data && res.Data.Details[0] && res.ReturnCode == 0) {
        this.handleDetailsRes(res)
      } else {
        // this.closeEvent.emit();
        this.common.changeIsFailureeMessage(true);
        this.common.changeResponseMessage(this.customTranslatePipe.transform(res.ReturnMessage || '', this.changedetect, this.root))
        // this.route.navigate([this.moduleUrl + '/list']);
      }
    });
  }
  getSpecalityData(data: any) {
    this.mastersObject['HealthSpecialityId'] = []
    let req = {
      "Active": "true",
      "Code": data.join(),
      "MasterDataCode": 'HealthHospitalSpeciality'
    }

    this.api.postService(GetMastersAPI, req).subscribe({
      next: (res: any) => {
        if (res && res.Data && res.Data.length > 0) {
          this.specalityData = res.Data;
          this.mastersObject['HealthSpecialityId'] = this.specalityData;
          let val: any[] = this.addForm.get('HealthSpecialityId')?.value || [];
          if (val && val.length > 0 && this.mastersObject['HealthSpecialityId'] && this.mastersObject['HealthSpecialityId'].length > 0) {
            const mastersStoreIds = this.mastersObject['HealthSpecialityId'].map((item: any) => item.Id);
            let filteredval = val.filter((el: any) => mastersStoreIds.includes(el.Id));
            this.addForm.get('HealthSpecialityId')?.setValue(filteredval);
          } else {
            this.addForm.get('HealthSpecialityId')?.setValue([]);
          }
        } else {
          this.mastersObject['HealthSpecialityId'] = [];
          this.addForm.get('HealthSpecialityId')?.setValue([]);
        }
      },
      error: (err: any) => {
        console.log(err);

      }
    });
  }

  onMultiCheckDropDownChange(field: any, type: string) {

    setTimeout(() => {
      this.onMultiSelectChanges(field, type);
    }, 0);

  }


  onMultiSelectChanges(field: JsonFormControls, type: string): void {
    

    if (!field) return;
    console.log(this.formFields, field);
    const dependantFields = this.formFields.filter(
      (x: JsonFormControls) => x.ParentFieldName === field.FormField
    );

    console.log('Dependant fields:', dependantFields);
    if (!dependantFields?.length) return;

    const controlValue = this.addForm.get(field.FormField)?.value || [];

    // ✅ Status logic: update status based on selection
    this.mastersObject[field.FormField] = this.mastersObject[field.FormField]?.map((item: any) => {
      const isSelected = controlValue.some((selected: any) => selected.Id === item.Id);
      return {
        ...item,
        status: isSelected ? null : 'delete'
      };
    }) || [];

    dependantFields.forEach((el: JsonFormControls) => {
      if (controlValue.length > 0 && type !== 'deSelectAll') {
        const request = {
          Active: 'true',
          Code: controlValue.map((x: any) => x.Id).join(),
          MasterDataCode: el.MasterModuleCode,
        };

        this.masterAPIObs(request, el).subscribe({
          next: (responseData: any) => {
            if (responseData && responseData.Data?.length > 0) {
              this.mastersObject[el.FormField] = responseData.Data;

              const currentSelections = this.addForm.get(el.FormField)?.value || [];
              const validIds = new Set(responseData.Data.map((item: any) => item.Id));
              const filteredSelections = currentSelections.filter((selected: any) =>
                validIds.has(selected.Id)
              );

              this.addForm.get(el.FormField)?.setValue(filteredSelections);

              // ✅ Recursive call for next level dependents
              this.onMultiSelectChanges(el, type);
            } else {
              this.mastersObject[el.FormField] = [];
            }
          },
          error: (err: any) => {
            console.log(err);
            this.mastersObject[el.FormField] = [];
          },
        });
      } else {
        // Clear values if no selection or 'deSelectAll'
        const subDependantField = this.formFields.filter(
          (y: JsonFormControls) => y.ParentFieldName === el.FormField
        );

        if (subDependantField?.length > 0) {
          subDependantField.forEach((subField: JsonFormControls) => {
            this.mastersObject[subField.FormField] = [];
            this.addForm.get(subField.FormField)?.setValue([]);
          });
        }

        this.mastersObject[el.FormField] = [];
        this.addForm.get(el.FormField)?.setValue([]);
      }
    });
  }

  masterAPIObs(req: any, element: JsonFormControls) {
    let apiUrl: string = '';
    if (element.MasterAPIUrl?.includes('/api')) {
      apiUrl = `${environment.APIURL}/${element.MasterAPIUrl}`
    } else {
      apiUrl = `${APIPREFIX}${element.MasterAPIUrl}`
    }
    return this.api.postService(apiUrl, req);
  }


  handleDetailsRes(res: any) {
    console.log(res)
    this.details = res.Data.Details[0];


    this.detailsData = res.Data;


    this.isParentLoaded = true;


    let obj: any = {};
    this.formFields.map((el: JsonFormControls) => {
      let formField = el.FormField;
      //if (this.details[formField]) {
      if (!el.ArrayListName) {
        let val = this.details[formField];
        if (val !== undefined && val !== null && val !== '') {

          this.details[formField] = val;
        } else {
          this.details[formField] = ''
        }
        if (el.IsNonEditable == true && this.isModify) {
          this.addForm.controls[formField]?.disable();
        }

        if (el.Type?.toLowerCase() == 'phonenumber') {
          let val = this.details[formField];
          if (val) {
            let splitValue = val?.split('-');
            this.addForm.get(formField)?.get('code')?.setValue(splitValue[1])
            this.addForm.get(formField)?.get('number')?.setValue(splitValue[2])
            // this.stateCodeObj[formField] = splitValue[1];
            // obj[formField] = splitValue[2];
          }


        } else if (el.Type?.toLowerCase() == 'mobile') {
          obj[formField] = val ? val.toString() : '';

        } else if (el.Type?.toLowerCase() == 'date' || el.Type?.toLowerCase() == 'datetime') {
          let date: any = this.details[formField] ? new Date(this.details[formField]) : '';

          this.dateValuesObj[formField] = date ? date.toString() : '';
          date = this.datePipe.transform(date, el.oldDateFormat) || '';
          obj[formField] = date;
        }
        else if (el.Type?.toLowerCase() == 'file' || el.Type?.toLowerCase() == 'image') {
          this.fileDetails[formField] = this.details[formField];
        }
        else if (el.Type?.toLowerCase() == 'searchandsingleselect') {
          obj[formField] = this.details[formField];
          this.getMasterDataForSearch(el);

        } else if (el.Type?.toLowerCase() == 'searchdropdown' || el.Type?.toLowerCase() == 'dropdown') {
          obj[formField] = val ? val : null;
        }
        else {
          if (el.Type?.toLowerCase() == 'textarea') {
            let length: any = el?.MaxLength
            el.MaxLengthEntered = length - this.details[formField].length
          }

          obj[formField] = this.details[formField];
        }

        if (this.dependentDropDowns[formField] && this.details[formField]) {
          this.onDropDownChange(el, this.details[formField]);
        }

      } else {
        if (
          this.detailsData &&
          this.detailsData[el.ArrayListName] &&
          el.Type != 'multicheckbox' &&
          el.Type != 'searchandmultiselect'
        ) {
          
          this.detailsData[el.ArrayListName].forEach(
            (item: any, index: number) => {

              let arrayControls = this.addForm.get(
                el.ArrayListName
              ) as FormArray;
              if (arrayControls.controls[index]) {
                item['Status'] = '';

                this.arrayControlls[el.ArrayListName].forEach((el: any,i:number) => {
                  if (el.Type?.toLowerCase() == 'date' || el.Type?.toLowerCase() == 'datetime') {
                    if (item[el.FormField]) {
                      let date: any = item[el.FormField] ? new Date(item[el.FormField]) : '';
                      this.dateValuesObj[el.FormField + index] = date;
                      date = this.datePipe.transform(date, el.oldDateFormat) || ''
                      arrayControls.controls[index].get(el.FormField)?.setValue(date)
                    }


                  } else if(el.Type == 'file' || el.Type == 'image'){
                    let val = item[el.FormField] == null ? '' : item[el.FormField]
                    if(!this.arrayFileDetails[el.ArrayListName]){
                      this.arrayFileDetails[el.ArrayListName] ={}
                    }
                    if(!this.arrayFileDetails[el.ArrayListName][el.FormField]){
                      this.arrayFileDetails[el.ArrayListName][el.FormField]={}
                    }
                    this.arrayFileDetails[el.ArrayListName][el.FormField][index] = val;
                  } else {
                    arrayControls.controls[index].get(el.FormField)?.setValue(item[el.FormField]);

                    if (this.arrayListdependentObj[el.ArrayListName]?.[el.FormField] && item[el.FormField]) {
                      this.onDropDownChange(el, item[el.FormField], index);
                    }
                  }
                })
                arrayControls.controls[index]?.get('Id')?.setValue(item['Id']);
                arrayControls.controls[index]?.get('Status')?.setValue(item['Status']);
                this.lastIndex[el.ArrayListName] = 0;
                this.isLastLength[el.ArrayListName] = 1

                // arrayControls.controls[index]?.patchValue(item);
                if (el.Type?.toLowerCase() == 'multimobile') {
                  let value = item[el.FormField];
                  if (value) {
                    value = value.split('-')[1];
                    arrayControls.controls[index]
                      .get(el.FormField)
                      ?.setValue(value);
                  }
                }
              } else {
                this.addMoreFormGroup(el.ArrayListName, true);
                let arrayControls = this.addForm.get(
                  el.ArrayListName
                ) as FormArray;
                item['Status'] = '';
                this.arrayControlls[el.ArrayListName].forEach((el: any) => {
                  if (el.Type?.toLowerCase() == 'date' || el.Type?.toLowerCase() == 'datetime') {
                    if (item[el.FormField]) {
                      let date: any = item[el.FormField] ? new Date(item[el.FormField]) : ''
                      this.dateValuesObj[el.FormField + index] = date;
                      date = this.datePipe.transform(date, el.oldDateFormat) || ''
                      arrayControls.controls[index].get(el.FormField)?.setValue(date)
                    }


                  }else if(el.Type == 'file' || el.Type == 'image'){
                    let val = item[el.FormField] == null ? '' : item[el.FormField]
                    if(!this.arrayFileDetails[el.ArrayListName]){
                      this.arrayFileDetails[el.ArrayListName] ={}
                    }
                    if(!this.arrayFileDetails[el.ArrayListName][el.FormField]){
                      this.arrayFileDetails[el.ArrayListName][el.FormField]={}
                    }
                    this.arrayFileDetails[el.ArrayListName][el.FormField][index] = val;
                  }else {
                    let val = item[el.FormField] == null ? '' : item[el.FormField]
                    arrayControls.controls[index].get(el.FormField)?.setValue(item[el.FormField])
                    if (this.arrayListdependentObj[el.ArrayListName]?.[el.FormField] && item[el.FormField]) {
                      this.onDropDownChange(el, item[el.FormField], index);
                    }
                  }

                })

                arrayControls.controls[index]?.get('Id')?.setValue(item['Id']);
                arrayControls.controls[index]?.get('Status')?.setValue(item['Status']);
                if (el.Type?.toLowerCase() == 'multimobile') {
                  let value = item[el.FormField];
                  if (value) {
                    value = value.split('-')[1];
                    arrayControls.controls[index]
                      .get(el.FormField)
                      ?.setValue(value);
                  }
                }
              }
            }
          );
        } else
          if (el.Type?.toLowerCase() == 'multicheckbox' || el.Type?.toLowerCase() == 'searchandmultiselect') {
            
            let checkboxArray: any[] = []
            console.log(this.detailsData)
            if (this.detailsData[el.ArrayListName]) {
              this.detailsData[el.ArrayListName].forEach((item: any) => {

                if (item[el.FormField]) {
                  console.log(el, item);
                  let obj: any = {}
                  obj['Id'] = item[el.FormField];
                  obj['Status'] = '';
                  obj['Name'] = item.Name;
                  checkboxArray.push(obj);
                }
              });
              if (el.Type?.toLowerCase() == 'multicheckbox') {
                this.addForm.get(el.FormField)?.setValue(checkboxArray);


              } else {
                this.selectedSearchData[el.FormField] = JSON.parse(JSON.stringify(checkboxArray));
              }
              const dependantFields = this.formFields.filter(
                (x: JsonFormControls) => x.ParentFieldName === el.FormField
              );
              if (dependantFields?.length) {
                this.onMultiSelectChanges(el, el.Type);
              }
            }

          }
      }
    });

    this.addForm.patchValue(obj);

    try {
      if (isPlatformBrowser(this.platformId)) {
        this.formFields.forEach(el => {
          if (el.Type == 'textarea') {
            let id = el.Type + el.FormField;
            let elem = document.getElementById(id);
            setHeight(elem)
          }
        })
      }

    } catch (error) {

    }

  }
  getMasterDataForSearch(field: JsonFormControls) {

    let req: any = {
      MasterDataCode: field.MasterModuleCode,
      Active: 'true',

    };
    if (field.MasterAPIUrl?.toLowerCase() == 'getdatabysearch') {
      req['MasterDataCode'] = undefined;
      req['ModuleCode'] = field.MasterModuleCode;
    }
    this.api.postService(this.apiPrefix + field.MasterAPIUrl, req).subscribe(res => {

      if (res && res.ReturnCode == 0 && res.Data) {
        let item = res.Data.filter((el: any) => el.Id == this.details[field.FormField]);
        if (item && item.length != 0) {

          this.addForm.get(field.FormField)?.setValue(item[0])
        }
      }
    })
  }


  //  
  getErrorMessage(fieldName: string) {
    const control: any = this.addForm.get(fieldName);
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
    } else if (control?.hasError('pinCodeErr')) {
      return this.pinCodeErrorMsg[fieldName] || '';
    } else if (control?.hasError('gstInvalid')) {
      return GSTINDoesntMatch;
    } else if (control?.hasError('totalGreater')) {
      return discountAmountGreater
    }
    // 1️⃣ Dynamic API Condition Comparison Error
    if (control?.errors?.['comparisonFailed']) {
      const msg = this.formFieldObject[fieldName]?.conditionalErrorMessage;
      if (msg) return msg;
    }

    // 2️⃣ Pattern-based comparison error (existing Angular pattern)
    if (control?.hasError("comparisonFailed")) {
      return this.capitalizeFirstLetter(errorField?.Pattern1ErrorMessage || '');
    }

    else {
      return this.capitalizeFirstLetter(errorField?.Pattern1ErrorMessage || '');
    }

  }
  capitalizeFirstLetter(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  /**
 * latest modification details
 * @author Syambabu
 * @modification Emitting ProxyId event emitter with the saved record id at the isProxySave true
 * @DateModified 16/09/2024
 * @sprintNumber R30092024
 */

  Submit() {
    
    try {
      console.log(this.addForm.valid)
      this.invalidInputDirective.check(this.formControls);
    } catch (error) {


      console.log(error)
    }
    let filesInvalid = false;
    let isPhnoneInvalid = false;
    let isArrayListValid: any = {};
    let isOneofTheArrayListsInvalid = false;
    let arrayFileInvlid = false;
    this.formFields.map((el) => {
      if(!el.ArrayListName){
        if ((el.Type == 'image' || el.Type == 'file') ) {
          if (this.fileInvalid[el.FormField] || (!this.base64File[el.FormField] && el.Required && !this.isModify)) {
            filesInvalid = true;
            if (!this.base64File[el.FormField] && el.Required) {
              this.fileInvalid[el.FormField] = el?.RequiredErrorMessage;
            } else {
              this.fileInvalid[el.FormField] = el?.Pattern1ErrorMessage;
            }
          }
  
        }
      } else if (el.ArrayListName && this.arrayControlls[el.ArrayListName]) {
        this.arrayControlls[el.ArrayListName].map((arrayEl: any, index: number) => {
          if (arrayEl.Type == 'image' || arrayEl.Type == 'file') {
            if ((this.arrayfileInvalid[arrayEl.ArrayListName] && this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField] && this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][index]) || (!(this.base64ArrayFile[arrayEl.ArrayListName] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField][index]) && arrayEl.Required && !this.isModify)) {
              arrayFileInvlid = true;
              if (!this.arrayfileInvalid[arrayEl.ArrayListName]) {
                this.arrayfileInvalid[arrayEl.ArrayListName] = {};
              }
              if(! this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField]){
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField] = {};
              }
              if (!(this.base64ArrayFile[arrayEl.ArrayListName] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField][index]) && arrayEl.Required) {
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][index] = arrayEl?.RequiredErrorMessage;
              } else {
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][index] = arrayEl?.Pattern1ErrorMessage;
              }
            }
          }
        })
      
      }
      if (el.Type?.toLowerCase() == 'phonenumber') {

        // let val = this.addForm.get(el.FormField)?.valid
        if (this.addForm.get(el.FormField)?.invalid || (this.addForm.get(el.FormField)?.get('number')?.value && !this.addForm.get(el.FormField)?.get('code')?.value) || (!this.addForm.get(el.FormField)?.get('number')?.value && this.addForm.get(el.FormField)?.get('code')?.value)) {
          isPhnoneInvalid = true
          //  this.stateRequiredError[el.FormField] = true;
        } else {

          isPhnoneInvalid = false
          //  this.stateRequiredError[el.FormField] = false;

        }
      }

    });




    if (this.addForm.valid && !filesInvalid && !isPhnoneInvalid && !arrayFileInvlid) {
      this.isLoading = true;
      this.isSaveLoading = true;
      const req: any = {};
      this.formFields.map((el: JsonFormControls) => {
        try {
          let formField = el.FormField;
          let val = this.addForm.get(formField)?.value;


          if ((el.Type == 'file' || el.Type == 'image') && !el.ArrayListName) {
              req[formField] = this.base64File[el.FormField] || '';
              req[formField + 'Name'] = this.selectedFile[el.FormField]?.name || '';
          } else if (el.Type?.toLowerCase() == 'password' && !el.ArrayListName) {
            req[formField] = val
              ? CryptoJS.AES.encrypt(val, base64Key).toString()
              : '';
          } else if (
            (el.Type?.toLowerCase() == 'checkbox' ||
              el.Type?.toLowerCase() == 'toggle' ||
              el.Type?.toLowerCase() == 'radio') && !el.ArrayListName
          ) {
            val = val ? true : false;
            req[formField] = val?.toString();
          } else if (el.Type?.toLowerCase() == 'date' && !el.ArrayListName) {
            val = this.dateValuesObj[formField]
              ? this.datePipe.transform(
                new Date(this.dateValuesObj[formField]),
                'dd/MM/yyyy'
              )
              : '';
            //val = val ? val : '';
            req[formField] = val?.toString();
          } else if (el.Type?.toLowerCase() == 'datetime' && !el.ArrayListName) {   //el.ArrayListName Added as per discussion with Maidhar(03 Oct 2024)
            val = this.dateValuesObj[formField]
              ? this.datePipe.transform(
                new Date(this.dateValuesObj[formField]),
                'dd/MM/yyyy HH:mm'
              )
              : '';

            req[formField] = val?.toString();
          } else if (el.Type?.toLowerCase() == 'radiobuttonlist' && !el.ArrayListName) {
            req[formField] = val?.toString();
          } else if (el.Type?.toLowerCase() == 'mobile' && !el.ArrayListName) {
            req[formField] = val ? val?.toString() : '';
          } else if (el.Type?.toLowerCase() == 'multimobile') {

            let arr: any = [];
            let arrayControlEl = (this.addForm.get(el.ArrayListName) as FormArray);

            arrayControlEl.controls.forEach((element: AbstractControl) => {

              if (element.get(el.FormField)?.value || element.get('Status')?.value == 'delete') {

                let obj: any = element.value
                obj[el.FormField] = element.get(el.FormField)?.value ? '+91-' + element.get(el.FormField)?.value : '';
                arr.push(obj)
              }
            });
            req[el.ArrayListName] = arr;

          } else if (el.ArrayListName && el.Type?.toLowerCase() != 'multimobile') {
            // 
            let selectedItems: any = [];
            if (el.Type?.toLowerCase() == 'multicheckbox') {
              selectedItems = JSON.parse(JSON.stringify(this.addForm.get(el.FormField)?.value || []));
            } else if (el.Type?.toLowerCase() == 'searchandmultiselect') {
              if (this.selectedSearchData[el.FormField]) {
                selectedItems = structuredClone(this.selectedSearchData[el.FormField])
              } else {

                selectedItems = []
              }

            } else {
              selectedItems = []
            }

            let responseArr: any = []


            let arrayListValid = true;
            if (el.Type?.toLowerCase() != 'multicheckbox' && el.Type?.toLowerCase() != 'searchandmultiselect' && el.Type != 'searchandsingleselect') {

              let listControl = this.getFormArrayControls(el.ArrayListName);
              listControl?.forEach((controlItem: AbstractControl, index: number) => {
                let obj: any = {};
                this.arrayControlls[el.ArrayListName].forEach((fieldItem: JsonFormControls) => {
                  if (fieldItem.Type?.toLowerCase() == 'date') {
                    let dateval = this.dateValuesObj[fieldItem.FormField + index]
                    dateval = dateval ? this.datePipe.transform(new Date(dateval), 'dd/MM/yyyy') : ''
                    obj[fieldItem.FormField] = dateval;
                  } else if (fieldItem.Type?.toLowerCase() == 'datetime') {
                    let dateval = this.dateValuesObj[fieldItem.FormField + index]
                    dateval = dateval ? this.datePipe.transform(new Date(dateval), 'dd/MM/yyyy HH:mm') : '';
                    obj[fieldItem.FormField] = dateval
                  } else if(fieldItem.Type == 'file' || fieldItem.Type == 'image'){
                    obj[fieldItem.FormField] = this.base64ArrayFile[fieldItem.ArrayListName] && this.base64ArrayFile[fieldItem.ArrayListName][fieldItem.FormField] && this.base64ArrayFile[fieldItem.ArrayListName][fieldItem.FormField][index] ? this.base64ArrayFile[fieldItem.ArrayListName][fieldItem.FormField][index] : '';
                    obj[fieldItem.FormField + 'Name'] = this.selectedArrayFile[fieldItem.ArrayListName] && this.selectedArrayFile[fieldItem.ArrayListName][fieldItem.FormField][index] ?this.selectedArrayFile[fieldItem.ArrayListName][fieldItem.FormField][index]?.name : '';
                  } 
                  else {
                    obj[fieldItem.FormField] = controlItem.get(fieldItem.FormField)?.value?.toString();
                  }



                })
                obj['Id'] = controlItem.get('Id')?.value || '';
                obj['Status'] = controlItem.get('Status')?.value || '';
                selectedItems.push(obj)
              })
              responseArr = selectedItems
            } else
              if (el.Type?.toLowerCase() === 'multicheckbox' || el.Type?.toLowerCase() === 'searchandmultiselect') {
                let selectedObjMap: any = {};
                let selectedProcessed: any[] = [];

                // Step 1: Prepare selected items — reset unnecessary fields
                (selectedItems || []).forEach((item: any, i: number) => {
                  const newItem = {
                    ...item,
                    Status: '',
                    [el.FormField]: item.Id,
                    Id: '',
                    Name: undefined
                  };
                  selectedObjMap[item.Id] = i;
                  selectedProcessed.push(newItem);
                });

                const existingDetails = this.detailsData[el.ArrayListName] || [];

                // Step 2: Compare against existing and handle deletions
                existingDetails.forEach((existingItem: any) => {
                  const matchIndex = selectedObjMap[existingItem[el.FormField]];

                  if (matchIndex === undefined) {
                    // Not selected anymore — mark as deleted
                    const deletedItem = {
                      ...existingItem,
                      Status: 'delete',
                      Name: '',
                    };
                    selectedProcessed.push(deletedItem);
                  } else {
                    // Matched — update ID in selected item
                    selectedProcessed[matchIndex].Id = existingItem.Id;
                  }
                });

                // Step 3: Assign to final response array
                responseArr = selectedProcessed;
              }


            req[el.ArrayListName] = responseArr && responseArr?.length > 0 ? responseArr : []

          } else if (el.Type?.toLowerCase() == 'phonenumber') {

            let val = this.addForm.get(formField)?.get('number')?.value;
            if (val) {
              req[formField] = '+91-' + this.addForm.get(formField)?.get('code')?.value + '-' + val
            } else {
              req[formField] = ''
            }


          }
          else if (el.Type?.toLowerCase() == 'parentrecordid') {

            req[formField] =
              this.getParentId();

          }
          else if (el.Type?.toLowerCase() == 'searchandsingleselect') {
            if (val) {

              req[formField] = val.Id;

            } else {
              req[formField] = '';

            }

          }
          else if(el.Type?.toLowerCase() == 'number' || el.Type?.toLowerCase() == 'number+decimals') {
              req[formField] = val ? val?.toString() : '0'
          }
          else {
            req[formField] = val ? val?.toString() : '';
          }

        } catch (error) {
          console.log(error, el);

        }
      });
      if (this.Id) {
        req['Id'] = this.Id;
      }
      req['ModuleCode'] = this.templateCode;
      req['IsAutoTranslate'] = this.isModify ? 'false' : 'true'; // For auto transalate form API
      this.api.postService(this.SaveApi, req).subscribe((response: any) => {
        if (response && response.ReturnCode == 0) {
          this.handleSaveResponse(response);
        } else {
          this.errorEvent.emit();

          this.isLoading = false;
          this.isSaveLoading = false;
          let msg = response.ReturnMessage;
          this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage(this.customTranslatePipe.transform(msg, this.changedetect, this.root));
        }
      }, (error) => {
         this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage(this.customTranslatePipe.transform(error.ReturnMessage, this.changedetect, this.root));
        this.errorEvent.emit();
        this.isSaveLoading = false;

      });
    } else {
      this.errorEvent.emit()

      this.addForm.markAsDirty()
      this.addForm.markAllAsTouched();
      this.isSubmitted = true;

    }
  }
  transformABHAFormat(data: any) {
    // Remove any non-digit characters
    let cleanedData = data.replace(/\D/g, '');

    // Check if the cleaned data has exactly 14 digits
    if (cleanedData.length === 14) {
      // Format the number as xx-xxxx-xxxx-xxxx
      return cleanedData.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
    } else {

      return 'Invalid input. Please provide a 14-digit number.';
    }
  }
  handleSaveResponse(response: any) {
    this.isSaveLoading = false;
    this.isLoading = false;
    if (response.Data && response.Data[0] && response.Data[0].Id && (this.schemaData.TemplateName?.toLowerCase() == 'general' || this.isPartialTabsCase)) {
      const savedId = response.Data[0].Id;
      this.Id = savedId;
      const currentUrl = this.route.url || '';
      if (!currentUrl.includes('/modify/')) {
        this.route.navigate([`${this.moduleUrl}/modify`, savedId]);
      }
    }
    if (this.schemaData.TemplateName && this.schemaData.TemplateName?.toLowerCase() != 'general' && !this.isPartialTabsCase) {
      this.storage.deleteSessionStorage(this.templateCode + 'Id')

    }

    if (!this.Id) {
      let msg = 'Successfully saved the ' + this.moduleName;
      this.common.changeIsSuccesseMessage(true);
      this.common.changeResponseMessage(this.customTranslatePipe.transform(msg, this.changedetect, this.root));
    } else {
      let msg = 'Successfully updated the ' + this.moduleName;
      this.common.changeIsSuccesseMessage(true);
      this.common.changeResponseMessage(this.customTranslatePipe.transform(msg, this.changedetect, this.root));
    }
    if (this.isProxySave) {
      this.proxyIdEvent.emit({ Id: response.Data[0].Id })
    }
    this.saveEvent.emit();
  }

  convertFile(file: File): Observable<string> {
    const result = new ReplaySubject<string>(1);
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = (event: any) =>
      result.next(btoa(event.target.result.toString()));
    return result;
  }

  onFileSelected(event: any, field: JsonFormControls) {
    // 
    if (field?.ArrayListName) {

      this.fileInvalid[field.FormField] = '';
      const files: FileList = event.target.files;

      if (files.length > 5) {
        this.fileInvalid[field.FormField] = 'Cannot upload more than 5 files at a time.';
        // event.target.value = '';
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file: File = files[i];
        const regex = new RegExp(field.Pattern1 || '');
        const fileExtension = file.name.split('.')[1];

        this.isFormDirty = true;

        if (regex.test(file.name)) {
          let ByteSize = field?.FileSize ? parseInt(field.FileSize) : DEFAULFILESIZE;
          let convertfileToKb = file.size / 1000;

          if (convertfileToKb <= ByteSize) {



            //console.log('Image loaded:', this.fileDetails[field.FormField]);
            this.multipleFiles[field.FormField] = this.multipleFiles[field.FormField] || [];
            // this.multipleFiles[field.FormField].push(file);

            this.convertFile(file).subscribe((base64) => {
              let obj: any = {};
              obj[field.FormField + 'Name'] = file.name
              obj['Id'] = '';
              obj['Status'] = ""
              if (file.type.startsWith('image/')) {

                obj[field.FormField] = 'data:' + file.type + ';base64,' + base64;
              } else {

                obj[field.FormField] = base64
              }
              this.multipleFiles[field.FormField].push(obj);
            });
            // console.log(  this.multipleFiles[field.FormField])

          } else {
            // event.target.value = '';
            this.fileInvalid[field.FormField] = this.customTranslatePipe.transform((field.Pattern2ErrorMessage || field.Pattern1ErrorMessage || ''), this.changedetect, this.root) + '  -  ' + file.name;
            return;
          }
        } else {
          // event.target.value = '';
          this.fileInvalid[field.FormField] = this.customTranslatePipe.transform((field.Pattern1ErrorMessage || ''), this.changedetect, this.root) + '  -  ' + file.name;
          return;
        }
      }
      // event.target.value = '';
    } else {

      let file = event.target.files[0];
      const regex = new RegExp(field.Pattern1 || '');
      const fileExtension = file.name.split('.')[1];

      this.isFormDirty = true;

      if (regex.test(file.name)) {
        let ByteSize = field?.FileSize
          ? parseInt(field.FileSize)
          : DEFAULFILESIZE;

        let convertfileToKb = file.size / 1000;
        if (convertfileToKb <= ByteSize) {
          this.selectedFile[field.FormField] = file;
          this.fileInvalid[field.FormField] = '';

          this.convertFile(file).subscribe((base64) => {
            this.base64File[field.FormField] = base64;
          });
          //  }
        } else {
          // event.target.value = '';
          this.fileInvalid[field.FormField] = field?.Pattern2ErrorMessage || field?.Pattern1ErrorMessage;
        }
      } else {

        // event.target.value = '';
        this.fileInvalid[field.FormField] = field?.Pattern1ErrorMessage;
      }

    }



  }

  onArrayFileSelected(event: any, field: JsonFormControls,index:number) {

    
      let file = event.target.files[0];
      const regex = new RegExp(field.Pattern1 || '');
      const fileExtension = file.name.split('.')[1];

      this.isFormDirty = true;

      if (regex.test(file.name)) {
        let ByteSize = field?.FileSize
          ? parseInt(field.FileSize)
          : DEFAULFILESIZE;

        let convertfileToKb = file.size / 1000;
        if (convertfileToKb <= ByteSize) {
          if(!this.selectedArrayFile[field.ArrayListName]){
            this.selectedArrayFile[field.ArrayListName] ={};
          }
          if(!this.selectedArrayFile[field.ArrayListName][field.FormField]){
            this.selectedArrayFile[field.ArrayListName][field.FormField] ={};
          }
          this.selectedArrayFile[field.ArrayListName][field.FormField][index] = file;
          if(this.arrayfileInvalid[field.ArrayListName] && this.arrayfileInvalid[field.ArrayListName][field.FormField] && this.arrayfileInvalid[field.ArrayListName][field.FormField][index]){
            this.arrayfileInvalid[field.ArrayListName][field.FormField][index] = '';
          }

          this.convertFile(file).subscribe((base64) => {
            if(!this.base64ArrayFile[field.ArrayListName]){
              this.base64ArrayFile[field.ArrayListName] ={}
            }
            if(!this.base64ArrayFile[field.ArrayListName][field.FormField]){
              this.base64ArrayFile[field.ArrayListName][field.FormField] ={}
            }
            this.base64ArrayFile[field.ArrayListName][field.FormField][index] = base64;
            console.log(this.base64ArrayFile);
          });
          //  }
        } else {
          if(!this.arrayfileInvalid[field.ArrayListName]){
            this.arrayfileInvalid[field.ArrayListName] = {}
          }
          if(!this.arrayfileInvalid[field.ArrayListName][field.FormField]){
            this.arrayfileInvalid[field.ArrayListName][field.FormField] = {}
          }
          this.arrayfileInvalid[field.ArrayListName][field.FormField][index] = field?.Pattern2ErrorMessage || field?.Pattern1ErrorMessage;
        }
      } else {

        if(!this.arrayfileInvalid[field.ArrayListName]){
          this.arrayfileInvalid[field.ArrayListName] = {}
        }
         if(!this.arrayfileInvalid[field.ArrayListName][field.FormField]){
          this.arrayfileInvalid[field.ArrayListName][field.FormField] = {}
        }
        this.arrayfileInvalid[field.ArrayListName][field.FormField][index] = field?.Pattern1ErrorMessage;
      }



        
  }

  changeDate(selectedDate: any, fieldName: any, dateString: string, index: any, listName: any) {
    
    // this.isFormDirty = true;
    if (index != undefined && listName) {
      let controls = this.getFormArrayControls(listName);
      let obj: any = {};
      obj[fieldName] = selectedDate
      controls[index].get(fieldName)?.setValue(selectedDate);
      this.dateValuesObj[fieldName + index] = dateString;
    } else {
      this.formFields.map((el) => {
        if (el.FormField?.toLowerCase() == fieldName?.toLowerCase()) {
          if (isPlatformBrowser(this.platformId)) {
            this.addForm.get(el.FormField)?.setValue(selectedDate);
            this.addForm.get(el.FormField)?.markAsDirty();
            this.dateValuesObj[fieldName] = dateString;
          }
        }
      });
    }
  }


  onDropDownChange(parentfield: JsonFormControls, editDetails?: any, index?: number) {
    
    let field: any = {};
    let descendentFormField: any = {};
    if (parentfield.ArrayListName) {
      field = this.arrayListdependentObj[parentfield.ArrayListName][parentfield.FormField];
      descendentFormField = this.arrayListdependentObj[parentfield.ArrayListName][field.FormField];
    } else {
      field = this.dependentDropDowns[parentfield?.FormField];
      descendentFormField = this.dependentDropDowns[field?.FormField];
    }

    if (field?.FormField) {

      if (parentfield.ArrayListName && index != undefined && index != null) {
        let controlsArray = this.getFormArrayControls(parentfield.ArrayListName);
        controlsArray[index]?.get(field.FormField)?.setValue(null);

        if (this.arraylistMastersObject[field.ArrayListName]) {
          if (this.arraylistMastersObject[field.ArrayListName][field.FormField]) {
            this.arraylistMastersObject[field.ArrayListName][field.FormField][index] = [];
          } else {
            this.arraylistMastersObject[field.ArrayListName][field.FormField] = []

          }
        }

      } else {

        this.addForm.get(field.FormField)?.setValue(null);
        this.mastersObject[field.FormField] = [];
      }


      if (descendentFormField) {

        if (descendentFormField.FormField) {

          if (descendentFormField.ArrayListName && index != null && index != undefined) {

            let controlsArray = this.getFormArrayControls(descendentFormField.ArrayListName);
            controlsArray[index]?.get(descendentFormField.FormField)?.setValue(null);

          } else {
            this.addForm.get(descendentFormField.FormField)?.setValue(null);
            this.mastersObject[descendentFormField.FormField] = [];
          }
        }
      }

    }


    let ParentValue = ''
    if (parentfield.ArrayListName && index != null && index != undefined) {
      const arrayControls = this.getFormArrayControls(parentfield.ArrayListName)
      ParentValue = arrayControls[index]?.get(parentfield.FormField)?.value;

    } else {
      ParentValue = this.addForm.get(parentfield.FormField)?.value;
    }

    if (ParentValue || editDetails) {



      let req: any = {
        MasterDataCode: field?.MasterModuleCode,
        Active: 'true',
        Code: ParentValue || editDetails || ''
      };
      if (field?.MasterAPIUrl?.toLowerCase() == 'getdatabysearch') {
        req['MasterDataCode'] = undefined;
        req['ModuleCode'] = field?.MasterModuleCode;
      }
      this.masterAPICall(req, field, index);
    }
    // }

  }

  validateFormArray(controls: any) {
    let valid = true;
    for (let i = 0; i < controls?.length; i++) {
      if (controls[i].get('Status').value == '') {
        Object.entries(controls[i].value).forEach((item: any) => {

          let [key, value] = item
          if ((value == undefined || value == null || value == '') && key != 'Status' && key != 'Id') {
            valid = false;

          }
        });
        if (!valid) {
          break
        }

      }
    }
    return valid;

  }

  addMoreFormGroup(arrayListName: string, isEdit?: boolean) {
    // 
    const controls = this.getFormArrayControls(arrayListName);

    let valid = true;
    if (!isEdit) {
      this.isFormDirty = true;
      valid = this.validateFormArray(this.getFormArrayControls(arrayListName))
    }
    let arrayFileInvalid:boolean = false;
    if (this.arrayControlls[arrayListName]) {
        this.arrayControlls[arrayListName].map((arrayEl: any, index: number) => {
          if (arrayEl.Type == 'image' || arrayEl.Type == 'file') {
            if ((this.arrayfileInvalid[arrayEl.ArrayListName] && this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField] && this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][controls.length - 1]) || (!(this.base64ArrayFile[arrayEl.ArrayListName] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField][controls.length - 1]) && arrayEl.Required && !this.isModify)) {
              arrayFileInvalid = true;
              if (!this.arrayfileInvalid[arrayEl.ArrayListName]) {
                this.arrayfileInvalid[arrayEl.ArrayListName] = {};
              }
              if(! this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField]){
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField] = {};
              }
              if (!(this.base64ArrayFile[arrayEl.ArrayListName] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField] && this.base64ArrayFile[arrayEl.ArrayListName][arrayEl.FormField][controls.length - 1]) && arrayEl.Required) {
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][controls.length - 1] = arrayEl?.RequiredErrorMessage;
              } else {
                this.arrayfileInvalid[arrayEl.ArrayListName][arrayEl.FormField][controls.length - 1] = arrayEl?.Pattern1ErrorMessage;
              }
            }
          }
        })
      
      }

    if ((controls[controls.length - 1]?.valid && !arrayFileInvalid)|| isEdit) {
      let arr = this.arrayControlls[arrayListName];
      //    
      arr.forEach((field: JsonFormControls) => {
        if (!field.ParentFieldName && (field.Type?.toLowerCase() == 'searchdropdown' || field.Type?.toLowerCase() == 'dropdown') && this.arraylistMastersObject[arrayListName]) {
          if (!this.arraylistMastersObject[arrayListName][field.FormField]) {
            this.arraylistMastersObject[arrayListName][field.FormField] = []
          }
          if (controls.length != 0) {
            this.arraylistMastersObject[arrayListName][field.FormField][controls.length] = structuredClone(this.arraylistMastersObject[arrayListName][field.FormField][controls.length - 1])
          }

        }
      })
      let obj = this.getArrayFormGroup(arr);
      this.getArrayControls(arrayListName).push(
        obj
      );

      let count: any[] = []
      controls.forEach((control, index) => {
        if (control.get('Status')?.value == '') {
          count.push(index);
        }
      })
      this.isLastLength[arrayListName] = count.length;
      this.lastIndex[arrayListName] = count[count.length - 1];


    } else {
      Object.entries(controls[controls?.length - 1]).forEach(([key, value]: any) => {
        if (key == 'controls') {
          Object.entries(value).forEach(([keyName, formValue]: any) => {
            if (keyName != 'Id' && keyName != 'Status') {
              formValue.markAsDirty();
              formValue.markAsTouched();
            }
          })
        }
      })

      controls[controls?.length - 1].markAsTouched()
      controls[controls?.length - 1].markAsDirty()
      // this.common.changeIsFailureeMessage(true);
      // this.common.changeResponseMessage('Please enter required fields.');
    }


  }

  removeFormArrayItem(arrayListName: string, index: number, fieldName: string) {
    this.isFormDirty = true;
    let controls = this.getFormArrayControls(arrayListName);


    Object.keys(controls[index]?.value).forEach(key => {
      controls[index].get(key)?.setValidators(null);
      controls[index].get(key)?.setErrors(null);
      controls[index].get(key)?.updateValueAndValidity();
    })
    controls[index]?.setErrors(null);
    if (this.detailsData && this.detailsData[arrayListName] && controls[index].get('Id')?.value) {
      this.detailsData[arrayListName].forEach((el: any) => {
        if (el[fieldName] = controls[index].get('Id')?.value) {
          let valueObj = controls[index]?.value;
          //  Object.keys(valueObj).forEach(key =>{
          //     if(key != 'Id'){
          //       valueObj[key] = '';
          //     }
          //  })
          valueObj['Status'] = 'delete'

          controls[index]?.patchValue(valueObj)
        }

      })

    } else {

      (this.addForm.get(arrayListName) as FormArray).removeAt(index);
      let arr = this.arrayControlls[arrayListName];
      let count: any[] = []
      controls.forEach((control, index) => {
        if (control.get('Status')?.value == '') {
          count.push(index);
        }
      })
      if (count.length == 1) {

        arr.forEach((el: any) => {
          if (el.ParentFieldName && el.Type == 'dropdown') {

            if (this.arraylistMastersObject[arrayListName]) {
              if (this.arraylistMastersObject[arrayListName][el.FormField]) {

                this.arraylistMastersObject[arrayListName][el.FormField][index] = [];
              } else {
                this.arraylistMastersObject[arrayListName][el.FormField] = [];
                this.arraylistMastersObject[arrayListName][el.FormField][index] = [];

              }
            }
          }
        })

      } else {

        arr.forEach((el: any) => {
          if (this.arraylistMastersObject[arrayListName]) {

            if (this.arraylistMastersObject[arrayListName][el.FormField]) {

              this.arraylistMastersObject[arrayListName][el.FormField][index] = [];
            } else {
              this.arraylistMastersObject[arrayListName][el.FormField] = [];
              this.arraylistMastersObject[arrayListName][el.FormField][index] = [];

            }
          }
        })
      }
    }

    let count: any[] = []
    controls.forEach((control, index) => {
      if (control.get('Status')?.value == '') {
        count.push(index);
      }
    })
    this.isLastLength[arrayListName] = count.length;
    this.lastIndex[arrayListName] = count[count.length - 1]

    if (count.length == 0) {

      this.addMoreFormGroup(arrayListName, true)
    }


  }



  onClick(type: string) {
    if (type == 'password') {
      this.show = !this.show;
    } else if (type == 'confirmShow') {
      this.confirmShow = !this.confirmShow;
    }
  }

  onsearchItemsSelection(selecteddata: any, formField: string, isSingle?: boolean) {
    this.isFormDirty = true;
    if (isSingle) {

      this.addForm.get(formField)?.setValue(selecteddata);
    }
    else {
      this.selectedSearchData[formField] = selecteddata;
    }
  }
  getcommentcounts(event: any, field: any) {
    if (event) {
      event.stopPropagation();
    }
    field.MaxLengthEntered = field.MaxLength - event.target.value.length;
  }

  updateRadioButtonValue(control: any, value: any) {
    // 
    this.addForm.get(control)?.setValue(value);
    // console.log(this.addForm.get(control)?.value);

  }

  preventSaving(event: any) {
    if (event) {
      event.stopPropagation();
    }
  }

  clearFile(fileRef: any, field: any) {
    // 
    fileRef.value = ''
    this.fileInvalid[field.FormField] = ''

  }
  clearArrayFile(fileRef: any, field: any,index:number) {
    // 
    fileRef.value = ''
    if(this.arrayfileInvalid[field.ArrayListName] && this.arrayfileInvalid[field.ArrayListName][field.FormField] && this.arrayfileInvalid[field.ArrayListName][field.FormField][index]){
      this.arrayfileInvalid[field.ArrayListName][field.FormField][index] = ''
    }
    if(this.base64ArrayFile[field.ArrayListName] && this.base64ArrayFile[field.ArrayListName][field.FormField] && this.base64ArrayFile[field.ArrayListName][field.FormField][index]){
    this.base64ArrayFile[field.ArrayListName][field.FormField][index] = ''
    }
  }
  searching: { [key: string]: boolean } = {};

  deleteFileorImage(field: any, index?: number) {


    let isExisting: boolean = false;

    if (index == undefined || index == null) {
      if (this.isModify) {
        isExisting = true;
      }
    } else if (index != null && index != undefined && this.multipleFiles[field.FormField][index].Id) {
      isExisting = true;
    }

    if (isExisting) {
      const req = {

        "ModuleCode": this.templateCode,
        "ParentRecordId": this.Id || '',
        "RecordId": '',
        "FormField": field.FormField || '',
        "Code1": "",
        "Code2": ""
      }

      if (index != null && index != undefined) {

        req["RecordId"] = this.multipleFiles[field.FormField][index].Id

      }

      this.api.postService(DeleteFileById, req).subscribe(res => {


        if (res && res.ReturnCode == 0) {

          if (index != null && index != undefined) {
            this.multipleFiles[field.FormField] = this.multipleFiles[field.FormField].filter((element: any, i: number) => {

              if (index != i) {
                return element;
              }

            });

          } else {

            this.fileDetails[field.FormField] = null;
          }
          this.common.changeIsSuccesseMessage(true);
          this.common.changeResponseMessage('Successfully deleted.')

        }
      })
    } else {
      if (index != null && index != undefined) {
        this.multipleFiles[field.FormField] = this.multipleFiles[field.FormField].filter((element: any, i: number) => {

          if (index != i) {
            return element;
          }

        });

      } else {

        this.fileDetails[field.FormField] = null;
      }
    }

  }


  private linkDateRangeValidation(field: any) {
    if (!field.ParentFieldName) return;

    const parent = this.addForm.get(field.ParentFieldName);
    const child = this.addForm.get(field.FormField);

    parent?.valueChanges.subscribe((startVal) => {
        const endVal = child?.value;

        if (startVal && endVal && new Date(endVal) < new Date(startVal)) {
            child?.setErrors({ rangeInvalid: true });
        } else {
            child?.setErrors(null);
        }
    });
}


  onDateRangeChanged(field: any, event: any) {
    if (event && event.dateRange) {
      // Handle combined format for API: "dd/MM/yyyy,dd/MM/yyyy"
      this.addForm.get(field.FormField)?.setValue(event.dateRange);
      // show friendly UI: dd/MM/yyyy - dd/MM/yyyy
      this.selectedDateRange = event.dateRange.split(',').join(' - ');
    } else if (event && event.FromDate && event.ToDate) {
  // Handle separate format (legacy)
  this.addForm.get(field.FormField)?.setValue(`${event.FromDate},${event.ToDate}`);
  this.selectedDateRange = `${event.FromDate} - ${event.ToDate}`;
    } else {
      // Fallback for other formats
      this.addForm.get(field.FormField)?.setValue(event);
    }

    // Re-run parent-child date validation
    if (field.ParentFieldName) {
        this.linkDateRangeValidation(field);
    }
  }

}
