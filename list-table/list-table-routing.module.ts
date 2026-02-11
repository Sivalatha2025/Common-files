import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListTableComponent } from './list-table.component';

const routes: Routes = [
  {
    path:'',
    component:ListTableComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListTableRoutingModule { }
