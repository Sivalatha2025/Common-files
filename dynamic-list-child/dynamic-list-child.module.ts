import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicListChildComponent } from './dynamic-list-child.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { CoreModule } from 'src/app/core.module';



@NgModule({
  declarations: [
    DynamicListChildComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    
  ],
  exports: [
    DynamicListChildComponent
  ]
})
export class DynamicListChildModule { }
