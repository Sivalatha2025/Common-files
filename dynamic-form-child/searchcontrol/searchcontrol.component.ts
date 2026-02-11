import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { InvalidSearch } from '../../../ErrorMessages/ErrorMessages';
import { SearchBoxPattern } from '../../../InputPatterns/input-pattern';
import { JsonFormControls } from '../../add-page/schema.model';
import { APIPREFIX } from '../../../constants/constants';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { MultilanguageService } from 'src/app/services/multilanguage.service';

@Component({
  selector: 'app-searchcontrol',
  templateUrl: './searchcontrol.component.html',
  styleUrls: ['./searchcontrol.component.css']
})
export class SearchcontrolComponent implements OnInit , OnChanges , OnDestroy {
  @Input() field : any ;
  @Input() selectedValues: any[] = [];
  @Input() isSingleSelect : boolean = false;
  @Output() selectedItemsEvent = new EventEmitter<any>()
  @Output() singleSelectedEvent = new EventEmitter<any>()
  @ViewChild('childPagepopup', { static: false }) childPagepopup!: ElementRef;

  isLoading : boolean = false;
  invalidSearch = InvalidSearch
  submitted  :boolean = false;
  searchForm: FormGroup;
  apiPrefix: string = APIPREFIX;
  searchData: any[] = []; 
  isNoRecords: boolean = false;
  selectedDataObj : any ={}
  singleCheckedItem: any;
  @Input() singleSelectedItem: any;
  existingObject: any = {};
  destroy$ = new Subject<void>();
  changedetect : boolean = false;
  root : string = '';
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private api: HelperModuleService,
    private multiLanguageService : MultilanguageService,
    private router : Router
  ) {
    this.searchForm = this.fb.group({
      search: ['', {updateOn:'change',validators:[ Validators.pattern(SearchBoxPattern)]}],
     
    });

    this.root = this.router.url.split('/')[1];
   }

  ngOnInit(): void {
    this.selectedDataObj = {}
    this.multiLanguageService.selectedLanguageUpdation()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      
      this.changedetect = !this.changedetect;
    });
  }

  ngOnDestroy(): void {
    this.modalService.dismissAll();
    this.destroy$.next();
    this.destroy$.complete();
  }

 ngOnChanges(changes: SimpleChanges): void {
  
   let obj : any= {}
  if(!this.isSingleSelect){
   this.selectedValues.forEach(el => {
      obj[el.Id] = true;
    })
    this.existingObject = obj;
  }else{
    let obj : any= {};
    obj[this.singleSelectedItem?.Id] = true;
    this.existingObject = obj;

  }
  
 }

  get formValidations(){
    return this.searchForm.controls;

  }

  onSearch(event : Event){

    try {
      event.stopPropagation();
    } catch (error) {
      
    }
    this.selectedDataObj = {};
    if(this.searchForm.valid){
    let req : any= {
      MasterDataCode: this.field.MasterModuleCode,
      Active: 'true',
      searchWord:this.searchForm.value.search
    };
    if(this.field?.MasterAPIUrl?.toLocaleLowerCase() == 'getdatabysearch'){
         req['MasterDataCode'] = undefined;
         req['ModuleCode'] = this.field.MasterModuleCode;
    } 
    this.isLoading = true
     this.masterAPICall(req , this.field)
   }else{
    this.submitted = true;
   }
  } 

  masterAPICall(req : any , field : JsonFormControls){
    this.api
      .postService(this.apiPrefix + field.MasterAPIUrl, req)
      .subscribe((res: any) => {
        if (res && res.Data && res.ReturnCode == 0 && res.Data?.length!=0) {
       

          this.isNoRecords = false;
          this.searchData = res.Data.filter((el : any) => {
            if(!this.existingObject[el.Id]){
              return el;
            }
          })
          
           if(this.searchData && this.searchData?.length == 0){
            this.isNoRecords = true
           }

        }else{
          this.searchData = [];
          this.isNoRecords = true;
        }
        this.modalService.open(this.childPagepopup, {
          modalDialogClass: 'var-Popup',
          centered: true,
        });
        this.isLoading = false;

      }, error =>{
        this.searchData = [];
          this.isNoRecords = true;
        this.isLoading = false;

      });
  }

  close(event: any) {
    this.modalService.dismissAll();
    this.searchData = [];
    this.isNoRecords = false;
  }


  onCheckboxChange(item : any){
    if(this.isSingleSelect){

      this.singleCheckedItem = item;

    }else{

    
      if(this.selectedDataObj[item?.Id]){
        this.selectedDataObj[item?.Id] = undefined;
      }else{
        this.selectedDataObj[item?.Id] = item
        
      }
    }
  }

  Add(){
    
    let arr : any[]= []
    if(this.isSingleSelect){
      // arr = [this.singleSelectedItem]
      this.singleSelectedItem = this.singleCheckedItem
      this.singleSelectedEvent.emit(this.singleSelectedItem)

    }else{
      Object.values(this.selectedDataObj).forEach(el =>{
        if(el){
          arr.push(el)
        }
      });
      let existingArr = structuredClone(this.selectedValues || []);
      arr.forEach((el : any) =>{
        if(existingArr.filter((item : any) => el.Id == item.Id)?.length ==0){
          existingArr.push(el)
        }
      })
      this.selectedItemsEvent.emit(existingArr)
    }   
 
   this.modalService.dismissAll()
  }

  delete(item: any , isSingleSelect? : boolean){
    
    if(isSingleSelect){
      this.singleSelectedItem = undefined;
    this.selectedItemsEvent.emit('')

    }else{

    this.selectedDataObj[item?.Id] = undefined;
    try {
      this.selectedValues = this.selectedValues.filter(el => el.Id != item.Id)
    } catch (error) {
      console.log(error);
      
    }

    this.selectedItemsEvent.emit(this.selectedValues)
    }
  }
}
