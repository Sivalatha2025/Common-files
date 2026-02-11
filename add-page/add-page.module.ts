import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { AddPageRoutingModule } from './add-page-routing.module';
import { AddPageComponent } from './add-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { DynamicFormChildModule } from '../dynamic-form-child/dynamic-form-child.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MultiDynamicPageModule } from '../multi-dynamic-page/multi-dynamic-page.module';

import { CustomDynamicFormChildModule } from '../custom-dynamic-form-child/custom-dynamic-form-child.module';
import { SladetailsChildModule } from '../sladetails-child/sladetails-child.module';
import { NotificationTemplatesComponent } from "../notification-templates/notification-templates.component";
// import { ShiftModule } from '../shift/shift.module';



@NgModule({
  declarations: [
    AddPageComponent,
   
  ],
  imports: [
    CommonModule,
    AddPageRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    DynamicFormChildModule,
    NgbModule,
    MultiDynamicPageModule,
    SladetailsChildModule,
    // ShiftModule,
    CustomDynamicFormChildModule,
    NotificationTemplatesComponent
],
  providers:[DatePipe]
})
export class AddPageModule { }
