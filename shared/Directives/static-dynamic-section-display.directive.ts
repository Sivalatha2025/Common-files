// dynamic-if.directive.ts

import { Directive, Input, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { JsonFormControls } from 'src/app/components/add-page/schema.model';

const CustomeFieldGuids: { [index: string]: string } = {
  'ticketactiontype': '6C8C3D33-C31E-4B29-872D-6ECC925860A7',
  'status': '4A3F626C-643B-446D-962D-2ECDC20715AB',
  'financeledgertypeid' : 'DF344D47-6195-4089-A96E-EC73D1E31A5A',
  'hrmscandidatejoiningtypeid' : 'EA675D22-F77C-49D8-9183-3E7FD064B3A7',
}

const CustomeRequiredUrls: { [index: string]: boolean } = {
  'crm/raiseticket/add': true,
  'financeaccount/financeledger/add' : true,
  'financeaccount/financeledger/modify' : true,
  'financeaccount/financeledger/view' : true,
  'hrms/candidateassessment/modify' : true,
  'hrms/candidateassessment/add' : true,
  'entity/entity/modify' : true,
  'entity/entity/add' : true
}


@Directive({
  selector: '[sectionDisplay]'
})
export class StaticDynamicSectionDisplay {
  private hasView = false;
  private formObject: any;
  private value: any;
  private showByParentField: any
  private form!: FormGroup;
  private allFields: any;
  private formFiledObject:any;
  templateCode: string = '';
  hiddenFields  : any[] = [];
  currentField : any;
  releatedFieldId!:TemplateRef<any>
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private router: Router
  ) { }


  @Input() set sectionDisplay(value: any | null | '') {
    //  
   this.formFiledObject = value.formFiledObject
    this.value = value.parentControl  //parent field value
    this.showByParentField = value.fielddata   //parent form field
    this.form = value.form
    this.allFields = value.allFields
    this.templateCode = value.templateCode || '';
    this.currentField = value.currentField;
    this.hiddenFields = value.hiddenFieldsToBeShown;
    this.releatedFieldId = value.relatedField ||'';
    this.updateView()

  }

  updateView() {
    //  
    const routeUrl = this.router.url.replace('/', '').toLowerCase()
    let condition: boolean = false;
    if (this.showByParentField ) {

    if (this.showByParentField&& (this.showByParentField.Type == 'radiobuttonlist' || this.showByParentField.Type == 'dropdown') &&
        CustomeRequiredUrls[routeUrl] && CustomeFieldGuids[this.showByParentField.FormField.toLowerCase()] &&
        CustomeFieldGuids[this.showByParentField.FormField.toLowerCase()] == this.value) {

        condition = true;
      }
      else if (this.value && !(!this.value || this.showByParentField && (this.showByParentField.Type == 'radiobuttonlist' || this.showByParentField.Type == 'dropdown'))) {

        condition = true;

      }

      if(((this.templateCode == 'HRMSClient-10403' && this.showByParentField.FormField == 'IsDefault') ||
      (this.templateCode == 'HLTCRHSPTL-10677' && this.showByParentField.FormField == 'IsAllowMoreSlot') ||
      (this.templateCode == 'HLTCRHSPTL-10677' && this.showByParentField.FormField == 'IsMultiSpeciality') ||
      (this.templateCode == 'ENTDATA-10747' && this.showByParentField.FormField == 'IsCustom') 
      || (this.templateCode =='HLTCRCS-10690' && this.showByParentField.FormField =='IsSameAsPrimaryContact')
      ||(this.templateCode =='PTNAPT-10767' && this.showByParentField.FormField =='IsSameAsPrimaryContact' ) || (this.templateCode =='IMVM-252' && this.showByParentField.FormField =='IsParentVendor' )
      ) && this.showByParentField 
      ){
        condition = !condition;
      }
    } else {
      condition = true;
    }
// 
  
    if (condition) {
      if (!this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        if(this.releatedFieldId){
        this.viewContainer.createEmbeddedView(this.releatedFieldId)
            //  @ViewChild(this.releatedFieldId, { static: false })  templateRef!: TemplateRef<any>;
        }
        this.setChildValidators()
        this.hasView = true;

      }
    } else {
      this.clearChildInputs();
      this.viewContainer.clear();
      this.hasView = false;
    }
    
  }

  setChildValidators() {
    // 
    if(this.showByParentField){
      const fieldsToValidate = Object.values(this.allFields).filter((control: any) => control.ShowByParentField === this.showByParentField?.FormField);
  
      fieldsToValidate.forEach((field: any) => {
        if(field.Required && field.Type != 'file' && field.Type != 'image'){
          const control = this.form.get(field.FormField);
          if (control instanceof FormControl) {
            const currentValidators = control.validator ? [control.validator] : [];
            const newValidators = [Validators.required, ...currentValidators];
            control.setValidators(newValidators);
            control.updateValueAndValidity();
            if(field.Type == 'dropdown' || field.Type == 'searchdropdown' ){
              control.setValue(null)
            }
          }
        }
      });
    }

  }

  clearChildInputs() {
    //  
    if (this.showByParentField) {
      const parentControlName = this.showByParentField.FormField;
  
      const dependentControls = Object.values(this.allFields).filter((control: any) => control.ShowByParentField === parentControlName);
  
      dependentControls.forEach((control: any) => {
        const dependentControl = this.form.get(control.FormField);
        if (dependentControl instanceof FormControl) {
          // Remove only Validators.required from the control's validators
          const currentValidators = dependentControl.validator ? [dependentControl.validator] : [];
          const newValidators = currentValidators.filter(validator => validator !== Validators.required);
          dependentControl.clearValidators();
      
  
          dependentControl.reset(); // Reset the control's value
          dependentControl.setErrors(null); // Clear all errors
          dependentControl.updateValueAndValidity();
  
          if (control.Type ==='checkbox') {
            dependentControl.setValue(''); // Reset dropdown value if necessary
          }else if(control.Type == 'dropdown' || control.Type == 'searchdropdown' ){
            dependentControl.setValue(null); 
          }
  
          // Recursively clear sub-dependent controls if needed
          const subDependentControls = Object.values(this.allFields).filter((subControl: any) => subControl.ShowByParentField === control.FormField);
          subDependentControls.forEach((subControl: any) => {
            const subDependentControl = this.form.get(subControl.FormField);
            if (subDependentControl instanceof FormControl) {
              const subCurrentValidators = subDependentControl.validator ? [subDependentControl.validator] : [];
              const subNewValidators = subCurrentValidators.filter(validator => validator !== Validators.required);
              subDependentControl.setValidators(subNewValidators);
              subDependentControl.updateValueAndValidity();
  
              subDependentControl.reset();
              subDependentControl.setErrors(null);
  
              if (subControl.Type === 'dropdown') {
                subDependentControl.setValue('');
              }
            }
          });
        }
      });
    }
  }
  
  
}
