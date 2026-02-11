import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';
import { DynamicListChildComponent } from '../dynamic-list-child/dynamic-list-child.component';
import { CustomDynamicFormChildComponent } from '../custom-dynamic-form-child/custom-dynamic-form-child.component';
import { StorageService } from 'src/app/storageService/storage-service';

@Component({
  selector: 'app-multi-dynamic-page',
  templateUrl: './multi-dynamic-page.component.html',
  styleUrls: ['./multi-dynamic-page.component.css']
})
export class MultiDynamicPageComponent implements OnInit, OnDestroy {
  @ViewChild('dynamicListChild', { static: false }) dynamicListChild!: DynamicListChildComponent;
  @ViewChild('customDynamicForm', { static: false }) customDynamicForm!: CustomDynamicFormChildComponent;
  
  @Input() moduleUrl: string = '';
  @Input() placeholder: string = '';
  @Input()  moduleCode: string = '';
  @Input()  templateName:string="";
  @Input()  templeteCodeJson:string="";
  @Input()  modulePermissionObj:any="";
  @Input() title: string = '';
  @Output() saveEvent = new EventEmitter();
@Input() templateCode : string = ''
  isDisplayAddChild : boolean = true;
  modules: any;

  destroy$ = new Subject<void>();
  isPopUpModal: boolean = false;
  
  isModifyParent: boolean = false;
  isEmployeeAddUrl: boolean = false;
  constructor(      
    private router: Router,
    private storage:StorageService
  ) {     
  }
  checkUrl() {
 
      const url = this.router.url.toLowerCase().replace('/', '');
      if (url.startsWith('hrms/employee/add') || url.startsWith('hrms/employee/modify')) {
        this.isEmployeeAddUrl = true;
      } else {
        this.isEmployeeAddUrl = false;
      }

  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.checkUrl();
  }

 

  
  openAddOrEditPage( data :any) {
    
    this.isDisplayAddChild = false;
    if(data?.isEdit){
      this.isModifyParent = true
    }else{
      this.isModifyParent = false
    }
    setTimeout(() => {
      this.isDisplayAddChild = true;
    }, 10)
  }

  close(isSave: boolean) {
    if(this.templateCode != 'HRMSEMP-308'  && this.templateCode != 'HLTEMP-10734' && this.templateCode != 'HRMSClient-31004'){
      // if(!isSave){
      this.isDisplayAddChild = false;
      setTimeout(() => {
        this.isDisplayAddChild = true;
      }, 10);
      // }
            
    }
    
    if(isSave){
      this.saveEvent.emit()
      this.dynamicListChild.getList()
    }
    
    if(this.customDynamicForm && !this.isEmployeeAddUrl){
      this.customDynamicForm.addForm.reset();
      let tempId = this.customDynamicForm.templateCode
      if(this.storage.getSessionStorage(`${tempId}Id`)){
        this.storage.deleteSessionStorage(`${tempId}Id`)
      }
    }
    
  }

  closeModule(){
    this.router.navigate([this.moduleUrl + '/list']);

  }
}
