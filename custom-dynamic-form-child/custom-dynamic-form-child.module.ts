import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { CustomDynamicFormChildComponent } from './custom-dynamic-form-child.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { NgxEditorModule } from 'ngx-editor';
import { SharedModule } from 'src/app/shared/shared.module';
import { DynamicSharedModuleModule } from 'src/app/shared/dynamic-shared-module.module';


@NgModule({
  declarations: [
    CustomDynamicFormChildComponent,
  ],
  imports: [
    
    DynamicSharedModuleModule
  ],
  exports: [CustomDynamicFormChildComponent],
  providers: [DatePipe],
})
export class CustomDynamicFormChildModule { }
