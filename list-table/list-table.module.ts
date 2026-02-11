import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListTableRoutingModule } from './list-table-routing.module';
import { ListTableComponent } from './list-table.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DynamicFormChildComponent } from '../dynamic-form-child/dynamic-form-child.component';
import { DynamicFormChildModule } from '../dynamic-form-child/dynamic-form-child.module';
import { DynamicListChildModule } from '../dynamic-list-child/dynamic-list-child.module';
import { CoreModule } from 'src/app/core.module';
import { CandidateAssessmentListTableModule } from "../candidate-assessment-list-table/candidate-assessment-list-table.module";
// import { MaterialModule } from 'src/app/shared/material.module';


@NgModule({
  declarations: [
    ListTableComponent
  ],
  imports: [
    CommonModule,
    ListTableRoutingModule,
    SharedModule,
    CoreModule,
    DynamicListChildModule,
    DynamicFormChildModule,
    CandidateAssessmentListTableModule
]
})
export class ListTableModule { }
