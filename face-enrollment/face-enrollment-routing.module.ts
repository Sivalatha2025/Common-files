import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FaceEnrollmentComponent } from './face-enrollment.component';

const routes: Routes = [ {
    path: '' ,
    component : FaceEnrollmentComponent
  }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaceEnrollmentRoutingModule { }
