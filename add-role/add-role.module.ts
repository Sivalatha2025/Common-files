import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AddRoleRoutingModule } from './add-role-routing.module';
import { AddRoleComponent } from './add-role.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import {  NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
  declarations: [
    AddRoleComponent
  ],
  imports: [
    CommonModule,
    AddRoleRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    NgbTooltipModule
  ]
})
export class AddRoleModule { }
