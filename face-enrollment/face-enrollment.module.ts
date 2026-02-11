import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FaceEnrollmentRoutingModule } from './face-enrollment-routing.module';
import { FaceEnrollmentComponent } from './face-enrollment.component';
import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  declarations: [
    FaceEnrollmentComponent
  ],
  imports: [
    CommonModule,
    FaceEnrollmentRoutingModule,
    SharedModule
  ]
})
export class FaceEnrollmentModule { }
