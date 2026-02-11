import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDectivateGuard } from 'src/app/guards/component-dectivate.guard';
import { AddPageComponent } from './add-page.component';

const routes: Routes = [
  {
    path: '',
    component: AddPageComponent,
    canDeactivate:[ComponentDectivateGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddPageRoutingModule { }
