import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlsPipe } from './pipes/controls.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from './shared.module';
import { SearchcontrolComponent } from '../components/dynamic-form-child/searchcontrol/searchcontrol.component';



@NgModule({
  declarations: [
    
    SearchcontrolComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    
    ReactiveFormsModule,
    NgbModule,
  ],
  exports:[
    CommonModule,
    
    SearchcontrolComponent,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    ReactiveFormsModule,
    NgbModule
    
  ]
})
export class DynamicSharedModuleModule { }
