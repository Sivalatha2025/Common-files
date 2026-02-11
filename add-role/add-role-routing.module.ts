import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDectivateGuard } from 'src/app/guards/component-dectivate.guard';
import { AddRoleComponent } from './add-role.component';

const routes: Routes = [
  {
    path:'',
    component:AddRoleComponent,
    canDeactivate:[ComponentDectivateGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddRoleRoutingModule { }
