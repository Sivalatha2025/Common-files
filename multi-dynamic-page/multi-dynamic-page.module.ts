import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MultiDynamicPageRoutingModule } from './multi-dynamic-page-routing.module';
import { MultiDynamicPageComponent } from './multi-dynamic-page.component';
import { DynamicListChildModule } from '../dynamic-list-child/dynamic-list-child.module';
import { DynamicFormChildModule } from '../dynamic-form-child/dynamic-form-child.module';
import { CustomDynamicFormChildModule } from '../custom-dynamic-form-child/custom-dynamic-form-child.module';
import { CustomDynamicPasswordChildModule } from "../custom-dynamic-password-child/custom-dynamic-password-child.module";
import { EmployeeSettingsComponent } from '../add-employee/employee-settings/employee-settings.component';


@NgModule({
  declarations: [
    MultiDynamicPageComponent
  ],
  imports: [
    CommonModule,
    DynamicListChildModule,
    DynamicFormChildModule,
    CustomDynamicFormChildModule,
    CustomDynamicPasswordChildModule,
    EmployeeSettingsComponent
],
  exports:[
    MultiDynamicPageComponent,
    EmployeeSettingsComponent
  ]
})
export class MultiDynamicPageModule { }
