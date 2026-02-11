import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MultiDynamicPageComponent } from './multi-dynamic-page.component';

const routes: Routes = [
  {
    path : '',
    component : MultiDynamicPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MultiDynamicPageRoutingModule { }
