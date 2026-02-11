import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { DynamicFormChildComponent } from './dynamic-form-child.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

import { DynamicSharedModuleModule } from 'src/app/shared/dynamic-shared-module.module';



@NgModule({
  declarations: [
    DynamicFormChildComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    
    ReactiveFormsModule,
    NgbModule,
    NgMultiSelectDropDownModule,
    DynamicSharedModuleModule
  ],
  exports: [DynamicFormChildComponent],
  providers: [DatePipe],
})
export class DynamicFormChildModule {}
