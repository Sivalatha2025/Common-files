import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowComponent } from './workflow.component';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddPageRoutingModule } from '../add-page/add-page-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: WorkflowComponent,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    FormsModule,
  ],
  declarations: [
    WorkflowComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})

export class WorkflowModule { }