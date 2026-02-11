import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  NgControl,
} from '@angular/forms';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import {
  GetControlsByModuleCode,
  GetSchema,
} from 'src/app/constants/constants';
import { CommonService } from 'src/app/services/common/common.service';
import { JsonFormControls } from '../add-page/schema.model';
import { StorageService } from 'src/app/storageService/storage-service';
import { Router } from '@angular/router';

import { ErrorInputFocusDirective } from 'src/app/shared/Directives/error-input-focus.directive';
import { Editor } from 'ngx-editor';


@Component({
  selector: 'app-custom-dynamic-form-child',
  templateUrl: './custom-dynamic-form-child.component.html',
  styleUrls: ['./custom-dynamic-form-child.component.css']
})
export class CustomDynamicFormChildComponent implements OnInit, OnDestroy {

  @Input() moduleCode: string = '';
  @Input() templateName: string = '';
  @Input() templeteCodeJson: string = '';
  @Input() templateCode: string = '';
  @Input() isDisplayTitle: boolean = true;
  @Output() saveEvent = new EventEmitter<any>();
  @Output() closeEvent = new EventEmitter<any>();
  @Output() errorEvent = new EventEmitter<any>();
  @ViewChildren(NgControl) formControls!: QueryList<NgControl>;
  @ViewChild(ErrorInputFocusDirective) invalidInputDirective!: ErrorInputFocusDirective;
  @Input() moduleUrl: string = '';
  @Input() moduleName: string = '';
  isModify: boolean = false;
  @Input() moduleControlName: string = '';
  @Input() isPartialTabsCase: boolean = false;
  @Input() isTabsCase: boolean = false;
  editor: { [index: string]: Editor } = {};
  

  formFields: JsonFormControls[] = [];



  schemaData: any = {};



  sectionFieldArr: any[] = [];

  formFieldObject: any = {};
  htmlString: string = '';
  arrayControlls: any = {};
  addForm : FormGroup
 isFormDirty : boolean = false

  constructor(
    private api: HelperModuleService,
    private formBuilder: FormBuilder,
    private https: HttpClient,
    private common: CommonService,
    private storage: StorageService,

    private route: Router,

  ) {

    this.addForm = this.formBuilder.group({})
  }

  ngOnInit(): void {
    const id = this.storage.getSessionStorage(this.templateCode + 'Id');
   
    this.getSchema();
   

  }

  ngOnDestroy(): void {
 
    
  }



  getSchema() {
    
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
          // console.log(this.setSchemaData(formData));
          
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
        'HH:mm': 'H:i',
        dd: 'd',
        DD: 'D',
      };


      this.schemaData = JSON.parse(JSON.stringify(formData));
      this.formFields = formData?.Data.filter((field: any) => {
        if (field.DateFormat && typeof field.DateFormat === 'string') {
          field['oldDateFormat'] = field.DateFormat
          field.DateFormat = field.DateFormat.replace(
            /(yyyy|yyy|yy|MMM|MM|HH:mm|dd|\/|-|:y)/g,
            (match: any) => formatMapping[match] || match
          );
        }
   
        this.formFieldObject[field.FormField] = field;

        if (field.ArrayListName && field.Type != 'multicheckbox' && field.Type != 'searchandmultiselect') {
          if (this.arrayControlls[field.ArrayListName]) {
            this.arrayControlls[field.ArrayListName] = [...this.arrayControlls[field.ArrayListName], field]
          } else {
            this.arrayControlls[field.ArrayListName] = [field];
            return field
          }
        } else {
          return field
        }
      });



        let obj : any = {};
        let SectionArr : any[]= [];
       this.formFields.forEach((el: JsonFormControls , i: number) =>{
        let sectionName = el.SectionName || 'General';
        if(i-1 >= 0){
          let previousSectionName  = this.formFields[i-1].SectionName || 'General'
          if(previousSectionName != sectionName){
            SectionArr.push(structuredClone(obj[previousSectionName]))
            obj = {};
          }
        }
        if(obj[sectionName]){
         let arr = obj[sectionName];
          arr.push(el)
        }else{

          obj[sectionName] = [el]
        }
        if(this.formFields.length -1 == i){
          SectionArr.push(structuredClone(obj[sectionName]))
        }
        
      });

      
      this.sectionFieldArr = SectionArr;
      
      let htmlString = `
      
      <div class="addProductCard pb-0">
      <div class="card rounded-0">
        <h5 class="card-sub-title font-medium pb-lg-3" id="DynamicAddTitle"
         *ngIf="isDisplayTitle && schemaData.TemplateName?.toLowerCase() != 'general'">
         {{ isModify ? ("Modify " + moduleName | customTranslate : changedetect : root) : ("Add " + moduleName |
         customTranslate : changedetect : root )}}
       </h5>
      <div class="form-container pb-lg-0" appErrorInputFocus>
       <form [formGroup]="addForm" (keyup.enter)="Submit()" novalidate autocomplete="disabled" aria-autocomplete="none"
        class="select-store-cash">   
      
      `
      this.sectionFieldArr.forEach(section =>{
            
        htmlString = htmlString + `  <div class="row gx-lg-5" >
          
              ${section[0].SectionName && section[0].SectionName!= 'General'? `<label class="font-medium mb-2" >'${section[0].SectionName }' | customTranslate : changedetect : root </label>` : ''}
          
             ${this.fieldsString(section)} 
            </div>`

      })
      htmlString = htmlString + `
      
              </form>
      </div>
      <ng-container *ngIf="!isPartialTabsCase">
     <!--    *ngIf="!isTabsCase" -->
        <div class="col-lg-5 d-flex ms-lg-auto gap-2 my-3" *ngIf="!(url.includes('/view'))" >
          <button type="button" class="btn btn-outline-dark fs-6 font-regular action-btn btn-sm field-height-sm" id="cancel" *ngIf="!isTabsCase || (isTabsCase && schemaData.TemplateName?.toLowerCase() == 'general')"
            data-bs-dismiss="modal" (click)="cancel()">
            Cancel
          </button>
          <button type="button" class="btn btn-outline-dark fs-6 font-regular action-btn btn-sm field-height-sm" id="cancel" *ngIf="isTabsCase && schemaData.TemplateName?.toLowerCase() != 'general'"
            data-bs-dismiss="modal" (click)="cancel(true)">
            Clear
          </button>
          <button class="btn btn-primary action-btn fs-6 font-regular btn-sm field-height-sm" id="Save"  type="button"
            [ngClass]="{ loading: isSaveLoading }" (click)="Submit()">
            Save
          </button>
        </div>
      </ng-container>
     
  
      <div class="col-12 d-flex justify-content-end my-3"  *ngIf="url.includes('/view')">
      
        <button id="cancel" class="btn btn-outline-dark fs-6 action-btn font-medium clearButton" (click)="cancel()"> Close </button>
      
    </div>
      
    </div>
  </div>`;

    this.htmlString = htmlString;

    } 
  }



  fieldsString(section : JsonFormControls[]){
    let returnString = `\n`;
    section.forEach(field =>{
      
      if((!field.ArrayListName || field.Type=='multicheckbox' || field.Type=='searchandmultiselect' || field.Type=='searchandsingleselect') && field.Type != 'phonenumber'){
        
       let inputElementString =  `
        <ng-container *ngIf="formFieldObject['${field.FormField}'] && !formFieldObject['${field.FormField}'].IsHideFieldInUI">
        
        ${this.getInputElement(field)}
        </ng-container>
         

       ` ;
       returnString = returnString +  inputElementString; 
      }else if(field.ArrayListName && field.Type!='multicheckbox' && field.Type!='searchandmultiselect' && field.Type!='searchandsingleselect' ){
        
        let arrayRetrunString = `\n`;
        arrayRetrunString = arrayRetrunString + `
        <ng-container *ngIf="formFieldObject['${field.ArrayListName}'] && !this.arrayHideFieldObject['${field.ArrayListName}']" >
        <div class="col-12"  [formArrayName]="'${field.ArrayListName}'"
                  *ngIf="(addForm.get('${field.ArrayListName}') | controlsPipe) as controlsArray">
                  <ng-container *ngFor="let control of controlsArray;let i = index; last as isLast" [formGroupName]="i">
                    <ng-container *ngIf="control.get('Status')?.value == ''">
                      <div class="col-12 col-lg-4 d-flex align-items-start multiMobileMain">`+
                        `${field.Type?.toLowerCase() == 'multimobile' ? `<div class="col-2 form-line-Item form-invisible">
                          <label for="{{'mobilecode'+i}}" class="form-label fs-8">{{'Country Code' | customTranslate : changedetect : root }}<span
                              *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label> <input id="mobilecode+{{i}}" placeholder="Code" value="+91"
                            class="form-control" [disabled]="true" />
                        </div>` : ``}`
                      

        
        this.arrayControlls[field.ArrayListName].forEach((field : JsonFormControls) =>{

         
          let inputElementString =  `
          <ng-container *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'] && !formFieldObject['${field.ArrayListName}']['${field.FormField}'].IsHideFieldInUI">
          
          ${this.getInputElement(field, true)}
          </ng-container>
           
  
         ` ;
          
          arrayRetrunString = arrayRetrunString + inputElementString + `\n`;

        })
        arrayRetrunString = arrayRetrunString + `
        
                  
                      <div class="col-2 col-lg-2 d-flex mob_item_between">
                        <div class="mobile-img-icon" *ngIf="this.isLastLength['${field.ArrayListName}'] > 1">
                          <img src="assets\images\delete-black-icon.svg"
                            (click)="removeFormArrayItem('${field.ArrayListName}',i, '${field.FormField}' )" alt="Del Icon" />
                        </div>
                        <div class="mobile-img-icon ms-2" *ngIf="i ==this.lastIndex['${field.ArrayListName}']">

                          <img src="assets\images\plus-black-circle.svg" (click)="addMoreFormGroup('${field.ArrayListName}')"
                            alt="Add Icon" />
                        </div>
                      </div>
                            
                          
                          </div>
                        </ng-container>
                    </ng-container>
                            
                  </div> 
                  </ng-container>

        `
        returnString = returnString + arrayRetrunString;
      }


    })
     return returnString;
  }

  getInputElement(field: JsonFormControls, isArrayList?:boolean){
    let returnString = ``;
     if (field.Type) {
       switch(field.Type?.toLowerCase()) {
 
         case 'text':
         case 'email':
         case 'url':
 
         if(isArrayList){
            returnString = `
                            <div class="col-6 col-lg-4 form-line-Item" >
                                            <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root 
                                              }}<span *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                                            <div class="inputWithTooltip">
                                              <input type="text" autocomplete="disabled" aria-autocomplete="none" class="form-control"
                                                [id]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField" [formControlName]="'${field.FormField}'"
                                                [placeholder]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " maxlength="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].MaxLength }}" />
                                              <span class="cursor-pointer d-flex mb-2" container="body" *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                                                  [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                                            </div>
                                            <ng-container
                                              *ngIf="(control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty) ">
                                              <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}']| formError:control?.get(formFieldObject['${field.FormField}'].FormField)}}</span>
                                              </div>
                          
                                            </ng-container>
                            </div>
            
            `
         }else{
 
           returnString = `
             <div class="col-12 col-lg-4 form-line-Item">
                     <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                    <div class="inputWithTooltip">
                   <input type="text" autocomplete="disabled" aria-autocomplete="none" class="form-control"
                     [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" [formControlName]="'${field.FormField}'" [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root "
                     maxlength="{{ formFieldObject['${field.FormField}'].MaxLength }}" />
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
             </div>
 
 
           `
         }
 
         break;
         case 'number':
         case 'mobile':
 
 
         if(isArrayList){
            returnString = `
           
                          <div class="col-8 col-lg-9 form-line-Item"
                                          [ngClass]="{'codewithMobile' : formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type?.toLowerCase() == 'multimobile'}">
                                          <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root 
                                            }}<span *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                                          <div class="inputWithTooltip">
                                            <input type="number" [id]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField" autocomplete="disabled"
                                              aria-autocomplete="none" class="form-control" [formControlName]="'${field.FormField}'"
                                              [placeholder]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " numbersOnly oninput="maxLengthCheck(this)"
                                              onkeydown="fnckeydown(event)" maxlength="10" max="9999999999" min="1000000000" />
                                            <span class="cursor-pointer d-flex mb-2" container="body" *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                                                [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                                          </div>
                                          <ng-container
                                            *ngIf="(control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty) ">
                                            <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}']| formError:control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)}}</span>
                                            </div>
                        
                                          </ng-container>
                          </div>
           
           
            `
         }else{

          returnString = `
          <div class="col-12 col-lg-4 form-line-Item">
                  <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                      *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                  <div class="inputWithTooltip">
                    <input type="number" [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" autocomplete="disabled" aria-autocomplete="none"
                      class="form-control" numbersOnly [formControlName]="'${field.FormField}'" [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root "
                      oninput="maxLengthCheck(this)" onkeydown="fnckeydown(event)" maxlength="{{ formFieldObject['${field.FormField}'].MaxLength }}"
                      max="{{ formFieldObject['${field.FormField}'].MaxRange }}" min="{{ formFieldObject['${field.FormField}'].MinRange }}" />
                    <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                       [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                  </div>
                  <ng-container
                    *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                    <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                  </ng-container>
           </div>

         `


         }
 
         break;
         case 'number+decimals':
         
         if(isArrayList){
            returnString = `
                              <div class="col-12 col-lg-4 form-line-Item">
                                            <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root 
                                              }}<span *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                                            <div class="inputWithTooltip">
                                              <input type="number" [id]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField" autocomplete="disabled"
                                                aria-autocomplete="none" class="form-control" [formControlName]="'${field.FormField}'"
                                                [placeholder]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " oninput="maxLengthCheck(this)" numbersOnly singleZeroOnly
                                                onkeydown="fnckeydownFloat(event)" maxlength="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].MaxLength }}" max="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].MaxRange }}"
                                                min="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].MinRange }}" />
                                              <span class="cursor-pointer d-flex mb-2" container="body"  [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img
                                                  src="assets/images/info-outline.svg" alt=""></span>
                                            </div>
                                            <ng-container
                                              *ngIf="(control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty) ">
                                              <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}']| formError:control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)}}</span>
                                              </div>
                          
                                            </ng-container>
                                </div>
 
            `
         }else{
           returnString = `
           
            <div class="col-12 col-lg-4 form-line-Item ">
                   <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                       *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                   <div class="inputWithTooltip">
                     <input type="number" [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" autocomplete="disabled" aria-autocomplete="none"
                       class="form-control" numbersOnly singleZeroOnly [formControlName]="'${field.FormField}'"
                       [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " oninput="maxLengthCheck(this)" onkeydown="fnckeydownFloat(event)"
                       maxlength="{{ formFieldObject['${field.FormField}'].MaxLength }}" max="{{ formFieldObject['${field.FormField}'].MaxRange }}" min="{{ formFieldObject['${field.FormField}'].MinRange }}" />
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
             </div>
 
           `
         }
         break;
         case 'color':
         
         returnString = `
         
          <div class="col-12 col-lg-4 form-line-Item colorPicker">
                   <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                       *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                   <div class="d-flex align-items-center position-relative">
                     <!-- <img (click)="colorInput.click()" src="/assets/images/color-picker.svg" class="me-3" alt=""> -->
                     <div class="inputWithTooltip">
                       <input [type]="formFieldObject['${field.FormField}'].Type" #colorInput autocomplete="disabled" aria-autocomplete="none"
                         [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" class="form-control px-2 w-colorPicker"
                         [formControlName]="'${field.FormField}'" [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " />
                       <span class="ms-3">{{addForm.get(formFieldObject['${field.FormField}'].FormField)?.value || 'Select Color Code'}}</span>
                       <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                          [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
           </div>
 
         `
 
         break;
         case 'password':
         
         returnString = `
         
         <div class="col-12 col-lg-4 form-line-Item  position-relative">
                   <div class="eyeIcon">
                     <i alt="show" class="far fa-eye eye-show" (click)="onClick('password')" [class.hide]="!show"></i>
                     <i alt="hide" class="far fa-eye-slash eye-hide" (click)="onClick('password')" [class.hide]="show"></i>
                   </div>
                     <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="!isModify">*</span></label>
                  <div class="inputWithTooltip">                   
                    <input [type]="show ? 'text' : 'password'" class="form-control input-password"
                     [attr.autocomplete]="show ? 'off' : 'new-password'" [formControlName]="'${field.FormField}'"
                     [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" maxlength="{{ formFieldObject['${field.FormField}'].MaxLength }}" />
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
                   <div class="pswd-icon">
                     <i class="pswd_icon"></i>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.errors) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.errors &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger" *ngIf="!addForm.get(formFieldObject['${field.FormField}'].FormField)?.errors?.['required']"><span>{{
                         getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                     <div class="alert alert-danger" *ngIf="addForm.get(formFieldObject['${field.FormField}'].FormField)?.errors?.['required']"><span>{{
                         capitalizeFirstLetter(formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root ) }} is required</span></div>
                   </ng-container>
         </div>
         
         `
 
         break;
         case 'textarea':
         returnString = `
         
         <div class="col-12 form-line-Item ">
                   <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                       *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                   <div class="inputWithTooltip">
                     <textarea [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" autocomplete="disabled" aria-autocomplete="none"
                       style="min-height: 60px" [formControlName]="'${field.FormField}'" [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root "
                       class="form-control" (keyup)="getcommentcounts($event, formFieldObject['${field.FormField}'])" maxlength="{{ formFieldObject['${field.FormField}'].MaxLength }}"></textarea>
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <div class="notesinfo justify-content-between">
                     <div class="d-flex flex-column align-items-start">
                       <p *ngIf="formFieldObject['${field.FormField}'].allowedComments != undefined && formFieldObject['${field.FormField}'].allowedComments != null && formFieldObject['${field.FormField}'].allowedComments !=''"
                         class="commentinfo flex-grow-1  m-0 font-medium">({{'We are not allowing' | customTranslate : changedetect : root }} {{ formFieldObject['${field.FormField}'].allowedComments
                         }})</p>
                       <ng-container
                         *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                         <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                       </ng-container>
                     </div>
           
                     <p *ngIf="formFieldObject['${field.FormField}'].allowedComments == undefined || formFieldObject['${field.FormField}'].allowedComments == null || formFieldObject['${field.FormField}'].allowedComments ==''"
                       class="commentinfo flex-grow-1  m-0 font-medium"></p>
                     <p class="commentinfoallowing m-0 font-medium"> ({{'Max characters allowed'  | customTranslate : changedetect : root}}
                       {{formFieldObject['${field.FormField}'].MaxLengthEntered}}.)</p>
                   </div>
          </div>
         
         `
         break;
         case 'htmleditor':
         returnString = `

             <div class="col-12 col-lg-12 form-line-Item" *ngIf="formFieldObject['${field.FormField}'].Type?.toLowerCase() == 'htmleditor'">
              <div class="d-flex justify-content-between">
                <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium mb-0">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root 
                }}<span
                  *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
              
                <span class="cursor-pointer d-flex ms-1 mb-2" container="body"
                *ngIf="formFieldObject['${field.FormField}'].Label"  [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root}}"><img
                    src="assets/images/info-outline.svg" alt=""></span>
              
              </div>
            
                <angular-editor [formControlName]="formFieldObject['${field.FormField}'].FormField"  [config]="editorConfig"></angular-editor>

                <ng-container
                  *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                  <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                </ng-container>
            </div>
         
         `
         break;
         case 'dropdown':
        case 'searchdropdown':
         if(isArrayList){
           
           returnString = `
        
                       <div class="col-12 col-lg-3 form-line-Item " *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type && formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type?.toLowerCase() == 'dropdown'">
                    <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Type + formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                        *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                        <div class="inputWithTooltip">
                    
                    <ng-select id="{{'${field.ArrayListName}' + i}}"  [items]="this.arraylistMastersObject['${field.ArrayListName}'] && this.arraylistMastersObject['${field.ArrayListName}']['${field.FormField}'] && this.arraylistMastersObject['${field.ArrayListName}']['${field.FormField}'][i]? this.arraylistMastersObject['${field.ArrayListName}']['${field.FormField}'][i]:[]" [inputAttrs]="{maxlength : '64', 'data-uid': '${field.ArrayListName}value' + i}"
                    [placeholder]="'Select '+ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root " bindLabel="Name" bindValue="Id" class="taskSelect"
                    [formControlName]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField" (change)="onDropDownChange(formFieldObject['${field.ArrayListName}']['${field.FormField}'])" (keyup.enter)="preventSaving($event)">
                  </ng-select>

                    <span class="cursor-pointer d-flex mb-2" container="body" *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                     [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img class="info_icon_size" src="assets/images/info-outline.svg" alt=""></span>
                    </div>
                    <ng-container *ngIf="  (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty)">
                      <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}'] | formError:control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)}}</span></div>
                    </ng-container>
                  </div>
 
           `
         }else{
          returnString = `
            
           <div class="col-12 col-lg-4 form-line-Item" *sectionDisplay="{parentControl:formFieldObject['${field.FormField}'].ShowByParentField ? this.addForm.get(formFieldObject['${field.FormField}'].ShowByParentField)?.value : true, fielddata:formFieldObject['${field.FormField}'].ShowByParentField ? formFieldObject[formFieldObject['${field.FormField}'].ShowByParentField] : undefined, form:this.addForm, allFields:formFieldObject}" >
              <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                  *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                  <div class="inputWithTooltip">
                    <ng-select id="{{'${field.ArrayListName}'}}"  [items]="mastersObject[formFieldObject['${field.FormField}'].FormField]" [inputAttrs]="{maxlength : '64', 'data-uid': '${field.ArrayListName}value'}"
                    [placeholder]="'Select '+ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root " bindLabel="Name" bindValue="Id" class="taskSelect"
                    [formControlName]="formFieldObject['${field.FormField}'].FormField" (change)="onDropDownChange(formFieldObject['${field.FormField}'])" (keyup.enter)="preventSaving($event)">
                  </ng-select>
                    <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                       [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img class="info_icon_size" src="assets/images/info-outline.svg" alt=""></span>
                  </div>
              <ng-container *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
              </ng-container>
            </div>
 
           `
         }
         break;
         case 'toggle':
         returnString = `
          
           <div class="col-12 form-line-Item d-flex align-items-center">
                   <div class="form-check form-switch">
                     <label class="form-check-label" for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                     <div class="inputWithTooltip">
                       <input class="form-check-input" [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" [formControlName]="'${field.FormField}'"
                         type="checkbox" role="switch" [checked]="formFieldObject['${field.FormField}'].FormField === 'true'" />
                       <span class="cursor-pointer sideTooltip" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                          [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
           </div>
         
         `
         break;
         case 'radiobuttonlist':
         returnString = `
             <div
                   [ngClass]="{'col-6' :mastersObject[formFieldObject['${field.FormField}'].FormField] &&  mastersObject[formFieldObject['${field.FormField}'].FormField].length<3 , 'col-12':mastersObject[formFieldObject['${field.FormField}'].FormField] && mastersObject[formFieldObject['${field.FormField}'].FormField].length >3 }"
                   class=" form-line-Item " *ngIf="formFieldObject['${field.FormField}'].Type == 'radiobuttonlist'">
                   <div class="form-check form-switch w-100 flex-column">
                     <div class="radioBtnTooltips">
                       <label class="form-check-label mb-2 w-100 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                           *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                       <span class="cursor-pointer d-flex mb-2" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                          [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
           
                     <div class="departmentBlock">
                       <div class="d-flex align-items-center radioItem mb-2" *ngFor="let item of mastersObject[formFieldObject['${field.FormField}'].FormField]"
                         (click)="updateRadioButtonValue(formFieldObject['${field.FormField}'].FormField,item?.Id)">
                         <input type="radio" [formControlName]="'${field.FormField}'" [attr.name]="formFieldObject['${field.FormField}'].FormField" [id]="item?.Name"
                           *ngIf="item" [value]="item?.Id" />
                         <label class="lh-1">{{ item?.Name }}</label>
                       </div>
                     </div>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
             </div>
         
         `
         break;
         case 'radio':
         returnString = `
          
              <div class="col-12 col-lg-4 form-line-Item" *ngIf="formFieldObject['${field.FormField}'].Type == 'radio'">
                   <div class="radioBtnTooltips">
                     <label class="form-label fs-6 font-medium" for="{{ formFieldObject['${field.FormField}'].FormField }}">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                     <span class="cursor-pointer d-flex mb-2" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <div class="form-check form-switch d-flex ps-0">
                     <div class="radioItem" (click)="updateRadioButtonValue(formFieldObject['${field.FormField}'].FormField,true)">
                       <input [id]="formFieldObject['${field.FormField}'].FormField + '1'" [formControlName]="'${field.FormField}'" type="radio" [value]="true"
                         [name]="formFieldObject['${field.FormField}'].FormField" class="me-2" /><label class="lh-1">{{'Yes'  | customTranslate : changedetect : root}}</label>
                     </div>
                     <div class="radioItem" (click)="updateRadioButtonValue(formFieldObject['${field.FormField}'].FormField,false)">
                       <input [id]="formFieldObject['${field.FormField}'].FormField + '2'" [formControlName]="'${field.FormField}'" type="radio" [value]="false"
                         [name]="formFieldObject['${field.FormField}'].FormField" class="me-2" />
                       <label class="lh-1">{{'No'  | customTranslate : changedetect : root}}</label>
                     </div>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
               </div>
 
         ` 
         break;
         case 'checkbox':
         returnString = `
          
           <div class="col-12 col-lg-4 d-flex align-items-center form-line-Item">
                   <div class="form-check form-switch form-checkbox-tick">
                     <label class="form-check-label me-3" for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                     <div class="inputWithTooltip">
                       <input [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField" 
                         [formControlName]="'${field.FormField}'" type="checkbox" [checked]="formFieldObject['${field.FormField}'].FormField === 'true'" />
                       <span class="cursor-pointer d-flex formcheckspan" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                          [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                     </div>
                     <ng-container
                       *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                       <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                     </ng-container>
                   </div>
           </div>
 
         ` 
 
         break;
         case 'datetime':
         
         if(isArrayList){
            returnString = `
            
                        <div class="col-3 col-lg-3  form-line-Item pb-4 position-relative commonDate">
                    
                                      <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField  + '-'+i}}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                                          *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                                      <div class="inputWithTooltip">
                                        <div class="input-group">
                                          <input [id]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField + '-'+i" type="text" autocomplete="disabled" aria-autocomplete="none"
                                            class="form-control datepicker  field-height-sm border-end-0 rounded-start" [isTime]="true"
                                            [fieldName]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField" [index]="i" [listName]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].ArrayListName"
                                            [format]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].DateFormat" [formControlName]="'${field.FormField}'" DateFormat
                                            [placeholder]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " />
                                          <span class="cursor-pointer d-flex mb-2" container="body"
                                              [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                                        </div>
                    
                                        <button class="btn btn-outline-dark border-start-0 inputBtnborder search"
                                          (click)="openDatePicker(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField + '-'+i)" type="button"><img
                                            src="assets/images/calendar-new-2.svg"></button>
                                      </div>
                                      <ng-container
                                        *ngIf="(control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty) ">
                                        <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}']| formError:control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)}}</span>
                                        </div>
                    
                                      </ng-container>
                    
                        </div>
 
            `
         }else{
           returnString = `
           
               <div class="col-12 col-lg-4 form-line-Item position-relative commonDate">
           
                   <label for="{{ formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                       *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                   <div class="inputWithTooltip">
                     <div class="input-group">
                       <input [id]="formFieldObject['${field.FormField}'].FormField" type="text" autocomplete="disabled" aria-autocomplete="none"
                         class="form-control datepicker  field-height-sm border-end-0 rounded-start" [isTime]="true"
                         [fieldName]="formFieldObject['${field.FormField}'].FormField" [format]="formFieldObject['${field.FormField}'].DateFormat" [formControlName]="'${field.FormField}'" DateFormat
                         [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " />
           
                       <button class="btn btn-outline-dark border-start-0 inputBtnborder search"
                         (click)="openDatePicker(formFieldObject['${field.FormField}'].FormField)" type="button"><img
                           src="assets/images/calendar-new-2.svg"></button>
                     </div>
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
           
                 </div>
 
           `
         }
         break;
         case 'date':
 
         if(isArrayList){
           returnString = `
                    <div class="col-5 col-lg-5 form-line-Item position-relative commonDate">
                                      <label for="{{ formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField  + '-'+i}}" class="form-label fs-6 font-medium"><span
                                          *ngIf="formFieldObject['${field.ArrayListName}']['${field.FormField}'].Required">*</span></label>
                                      <div class="inputWithTooltip">
                                        <div class="input-group">
                                          <input type="text" autocomplete="disabled" aria-autocomplete="none" [id]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField + '-'+i"
                                            class="form-control datepicker border-end-0" [isTime]="false" [fieldName]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField"
                                            [index]="i" [listName]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].ArrayListName" [format]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].DateFormat"
                                            [formControlName]="'${field.FormField}'" DateFormat [placeholder]="formFieldObject['${field.ArrayListName}']['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " />
                                          <button class="btn btn-outline-dark border-start-0 inputBtnborder search"
                                            (click)="openDatePicker(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField + '-'+i)" type="button"><img
                                              src="assets/images/calendar-new-2.svg"></button>
                                        </div>
                                        <span class="cursor-pointer d-flex mb-2" container="body"  [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.ArrayListName}']['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img
                                            src="assets/images/info-outline.svg" alt=""></span>
                                      </div>
                                      <ng-container
                                        *ngIf="(control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && isSubmitted) || (control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.invalid && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.touched && control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)?.dirty) ">
                                        <div class="alert alert-danger"><span>{{formFieldObject['${field.ArrayListName}']['${field.FormField}']| formError:control?.get(formFieldObject['${field.ArrayListName}']['${field.FormField}'].FormField)}}</span>
                                        </div>
                    
                                      </ng-container>
                    
                    </div>
        
          `

        }else{

           returnString = `
          
             <div class="col-12 col-lg-4 form-line-Item position-relative commonDate">
                  <label for="{{ formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                       *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                   <div class="inputWithTooltip">
           
                     <div class="input-group">
                       <input type="text" autocomplete="disabled" aria-autocomplete="none" [id]="formFieldObject['${field.FormField}'].FormField"
                         class="form-control datepicker border-end-0" [isTime]="false"
                         [isFromList]="formFieldObject['${field.FormField}'].FormField == 'DateofBirth' || formFieldObject['${field.FormField}'].DisableFutureDate ? true : false"
                         [fieldName]="formFieldObject['${field.FormField}'].FormField" [format]="formFieldObject['${field.FormField}'].DateFormat" [formControlName]="'${field.FormField}'" DateFormat
                         [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " />
                       <button class="btn btn-outline-dark border-start-0 inputBtnborder search"
                         (click)="openDatePicker(formFieldObject['${field.FormField}'].FormField)" type="button"><img
                           src="assets/images/calendar-new-2.svg"></button>
                     </div>
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <ng-container
                     *ngIf="(isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
           
                 </div>
           
           `
         }
         break;
         case 'file':
         case 'image':
         returnString = `
         
         <div class="col-12 col-lg-4 form-line-Item">
  <label for="formFile" class="form-label">{{ formFieldObject['${field.FormField}']?.Label | customTranslate : changedetect : root }}<span
      *ngIf="formFieldObject['${field.FormField}'].Required && !isModify">*</span></label>
  <div class="inputWithTooltip">
    <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
       [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}">
       <img src="assets/images/info-outline.svg" alt=""></span>
  </div>
  <div class="input-group imageCombine">
  <div class="position-relative w-100">
    <input class="form-control custom-border-radius w-100" #fileInput type="file" (click)="fileInput.value = ''"
      (change)="onFileSelected($event, formFieldObject['${field.FormField}'])" [id]="formFieldObject['${field.FormField}']?.Type+formFieldObject['${field.FormField}'].FormField">
    <!-- <button class="btn btn-outline-secondary" type="button" id="button-addon2">Upload File</button>   -->
       <span *ngIf="fileInput.value" id="clearfile" class="clear-file"  (click)="clearFile(fileInput,formFieldObject['${field.FormField}'])" title="Clear"><span aria-hidden="true" class="ng-clear">×</span></span>
    </div>
    <div class="imageUploadcontainer">
      <div class="d-flex gap-3 imageOverflow" *ngIf="fileDetails[formFieldObject['${field.FormField}'].FormField]" >
        <div class="position-relative" *ngIf="formFieldObject['${field.FormField}'].Type?.toLowerCase() == 'image'">
          <!-- <span class="position-absolute closeIcon" (click)="delete(item)">
                  <img src="assets/images/close-icon-white.svg" alt="">
                </span> -->
          <img ImageType="{{dummyImg}}" appImageReplace src="{{fileDetails[formFieldObject['${field.FormField}'].FormField]}}" height="90"
            alt="" />
        </div>
        <div class="position-relative" *ngIf="formFieldObject['${field.FormField}'].Type?.toLowerCase() == 'file'">
          <!-- <span class="position-absolute closeIcon" (click)="delete(item)">
                  <img src="assets/images/close-icon-white.svg" alt="">
                </span> -->
          <a href="{{fileDetails[formFieldObject['${field.FormField}'].FormField]}}" target="_blank">
  
            <img ImageType="{{dummyImg}}" title="{{fileDetails[formFieldObject['${field.FormField}'].FormField]}}" appImageReplace
              src="/assets/images/document-icon.svg" height="90" alt="" />
          </a>
        </div>
      </div>
      <div class="d-flex NoImageDiv justify-content-center" *ngIf="!fileDetails[formFieldObject['${field.FormField}'].FormField]">
        <!-- <h4 class="text-small" *ngIf="formFieldObject['${field.FormField}'].Type?.toLowerCase() == 'image'">No Image Uploaded</h4>
              <h4 class="text-small" *ngIf="formFieldObject['${field.FormField}'].Type?.toLowerCase() == 'file'">No File Uploaded</h4> -->
      </div>
    </div>
  <!-- <span class="file-name" *ngIf="formFieldObject['${field.FormField}'].FormField && selectedFile[formFieldObject['${field.FormField}'].FormField]">{{
                              selectedFile[formFieldObject['${field.FormField}'].FormField]?.name }}</span> -->
  
</div>
<div class="alert alert-danger" *ngIf="formFieldObject['${field.FormField}'].FormField && fileInvalid[formFieldObject['${field.FormField}'].FormField]">
    <span>{{ fileInvalid[formFieldObject['${field.FormField}'].FormField] }}</span>
  </div>
</div>
         
         ` 
         break;
         case 'multicheckbox':
        
           returnString = `
           
               <div class="col-12 col-lg-4 form-line-Item"
                   *ngIf="mastersObject[formFieldObject['${field.FormField}'].FormField]">
                   <div class="d-flex justify-content-between">
                     <label for="{{ formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
           
                   <ng-multiselect-dropdown [settings]="dropdownSettings" id="{{ formFieldObject['${field.FormField}'].FormField }}"
                     placeholder="{{formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root }}" [formControlName]="'${field.FormField}'"
                     [data]="mastersObject[formFieldObject['${field.FormField}'].FormField]">
                   </ng-multiselect-dropdown>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
               </div>
           
           `
         
         break;
         case 'searchandmultiselect':
         returnString = `
         
           <div class="col-12  form-line-Item">
           
                   <app-searchcontrol [field]="field" (selectedItemsEvent)="onsearchItemsSelection($event,formFieldObject['${field.FormField}'].FormField )"
                     [selectedValues]="selectedSearchData[formFieldObject['${field.FormField}'].FormField]"></app-searchcontrol>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
           </div>
         
         `
         break;
         case 'searchandsingleselect':
         returnString = `
             <div class="col-12  form-line-Item" >
           
                   <app-searchcontrol [field]="field" [isSingleSelect]="true"
                     (singleSelectedEvent)="onsearchItemsSelection($event,formFieldObject['${field.FormField}'].FormField ,true)"
                     [singleSelectedItem]="addForm.get(formFieldObject['${field.FormField}'].FormField)?.value"></app-searchcontrol>
                   <ng-container
                     *ngIf="  (isSubmitted && addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid) || addForm.get(formFieldObject['${field.FormField}'].FormField)?.invalid &&   addForm.get(formFieldObject['${field.FormField}'].FormField)?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.dirty">
                     <div class="alert alert-danger"><span>{{ getErrorMessage(formFieldObject['${field.FormField}'].FormField ) | customTranslate : changedetect : root }}</span></div>
                   </ng-container>
             </div>
         `
         break;
         case 'htmldiv':
         returnString = `
         
          <div class="col-12  form-line-Item " *ngIf=" details[formFieldObject['${field.FormField}'].FormField]">
                   <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium ">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root 
                     }}</label>
                   <div class="inputWithTooltip">
                     <span class="cursor-pointer d-flex" container="body" *ngIf="formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root "
                        [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <div class="htmlDiv d-flex justify-content-center py-2">
                     <div style="background-color: #fff;" class="py-2" [innerHTML]="details[formFieldObject['${field.FormField}'].FormField] | safeHtml">
                     </div>
                   </div>
           </div>
 
         `
         break;
         
         case 'phonenumber':
          returnString = `
          
                <ng-container [formGroupName]="formFieldObject['${field.FormField}'].FormField">
                 <div class="col-12 col-lg-4 flex-column phoneNumbergroup">
                   <div class="d-flex justify-content-between">
                     <label for="{{ formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField }}" class="form-label fs-6 font-medium">{{ formFieldObject['${field.FormField}'].Label | customTranslate : changedetect : root  }}<span
                         *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label>
                     <span class="cursor-pointer d-flex mb-2" container="body"  [triggers]="isMobileToolTip?'click:blur':'hover click'" ngbTooltip="{{formFieldObject['${field.FormField}']?.LabelTooltip | customTranslate : changedetect : root }}"><img
                         src="assets/images/info-outline.svg" alt=""></span>
                   </div>
                   <div class="d-flex justify-content-between align-items-start w-100">
                     <div class="col-2 form-line-Item">
                       <!-- <label class="form-label">Country Code<span *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label> -->
                       <input type="text" value="+91" [disabled]="true" oninput="maxLengthCheck(this)" numbersOnly
                         onkeydown="fnckeydown(event)" autocomplete="disabled" aria-autocomplete="none"
                         class="form-control countryCode" [id]="formFieldObject['${field.FormField}'].FormField + 'countryCode'" placeholder="Country Code" />
                     </div>
                     <div class="col-3 form-line-Item">
                       <!-- <label class="form-label fs-6 font-medium">State Code<span *ngIf="formFieldObject['${field.FormField}'].Required">*</span></label> -->
                       <input type="tel" autocomplete="disabled" formControlName="code" aria-autocomplete="none"
                         class="form-control" [id]="formFieldObject['${field.FormField}'].FormField + 'stateCode'" oninput="maxLengthCheck(this)" numbersOnly
                         onkeydown="fnckeydown(event)" placeholder="State Code" maxlength="4" minlength="2" />
                       <ng-container
                         *ngIf="((addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.invalid || (!addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.value && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.value)) && isSubmitted)|| (addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.invalid  && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.touched && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.dirty)">
                         <div class="alert alert-danger"
                           *ngIf="!addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.errors?.['required'] && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.value">
                           <span>Invalid state code</span></div>
           
           
                         <div class="alert alert-danger" *ngIf="!addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.value"><span>Required
                             state code</span></div>
                       </ng-container>
                     </div>
                     <div class="col form-line-Item">
           
                       <input type="number" oninput="maxLengthCheck(this)" numbersOnly onkeydown="fnckeydown(event)"
                         autocomplete="disabled" aria-autocomplete="none" class="form-control" [id]="formFieldObject['${field.FormField}'].Type + formFieldObject['${field.FormField}'].FormField"
                         formControlName="number" [placeholder]="formFieldObject['${field.FormField}'].PlaceHolder | customTranslate : changedetect : root " maxlength="8" minlength="5" />
           
                       <ng-container
                         *ngIf="((addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.invalid || (!addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.value && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('code')?.value))&& isSubmitted) || (addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.invalid && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.dirty && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.touched)">
                         <div class="alert alert-danger"
                           *ngIf="!addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.errors?.['required'] && addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.value">
                           <span>Invalid phone number</span></div>
           
           
                         <div class="alert alert-danger" *ngIf=" !addForm.get(formFieldObject['${field.FormField}'].FormField)?.get('number')?.value">
                           <span>Required phone number</span></div>
                       </ng-container>
                     </div>
                   </div>
                 </div>
               </ng-container>
 
 
          `
         break;
 
       }
 
     }
      return returnString
   }

  }