import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, EventEmitter, Inject, Input, OnDestroy, Output, PLATFORM_ID } from '@angular/core';
declare var $:any
declare var changeDate:any
@Directive({
  selector: '[DateFormat]'
})
export class DateFormatDirective implements AfterViewInit, OnDestroy {
 @Input() format :string= '';
 @Input() fieldName:string = '';
 @Input() isTime:boolean =false;
 @Input() index : number | undefined = undefined;
 @Input() listName : string | undefined = undefined;
 @Input() isFromList: boolean = false;
 @Input() isPastDate:boolean = false;
 @Input() isPendingSheet:boolean = false ;
 @Output() dateChange = new EventEmitter();
 @Output() searchDateChanges = new EventEmitter();
  constructor(  @Inject(PLATFORM_ID) private platformId: any,) { }

  ngOnDestroy(): void {
    if(isPlatformBrowser(this.platformId)){
    let id = '#' + this.fieldName
    if(this.index != undefined && this.listName){
     id = id + '-' + this.index
    }
    try {
      if($(id)){

        $(id).datetimepicker('destroy');
      }
    } catch (error) {
      
    }
  }
    
  }
  ngAfterViewInit(): void {
    
    if(isPlatformBrowser(this.platformId)){
      setTimeout(()=>{
        let id = '#' + this.fieldName
        if(this.index != undefined && this.listName){
         id = id + '-' + this.index
        }
      if(this.fieldName && $(id) && !this.isFromList && !this.isPastDate){
         $(id).datetimepicker({
            timepicker:this.isTime,
            format:this.format,
            scrollMonth : false,
            scrollInput : false,
            // maxDate: new Date(),
            onChangeDateTime: (event : any) =>{
           
              this.dateChange.emit({date : event, id : this.fieldName})
              let date = event?.toString()
              changeDate($(id).val(),this.fieldName, event , this.index , this.listName)
              this.searchDateChanges.emit({selectedDate : $(id).val(),fieldName : this.fieldName,dateString : event ,index : this.index ,listName :  this.listName})
           
            }
        });
      }
      else if(this.fieldName && $(id) && !this.isFromList && this.isPastDate ){
        $(id).datetimepicker({
          timepicker:this.isTime,
           format:this.format,
           scrollMonth : false,
           scrollInput : false,
           minDate: 0,
           onChangeDateTime: (event : any) =>{
            this.dateChange.emit({date : event, id : this.fieldName})
            let date = event?.toString()
            changeDate($(id).val(),this.fieldName, event , this.index , this.listName)
            this.searchDateChanges.emit({selectedDate : $(id).val(),fieldName : this.fieldName,dateString : event ,index : this.index ,listName :  this.listName})
         
          }
        });
      }
      
      else if(this.fieldName && $(id) && this.isFromList && !this.isPastDate){
        let date = new Date();
        date.setDate(date.getDate() - 1)
        $(id).datetimepicker({
           timepicker:this.isTime,
           format:this.format,
           scrollMonth : false,
           scrollInput : false,
           maxDate: this.isPendingSheet ? date:  new Date(),

           onChangeDateTime: (event : any) =>{
             this.dateChange.emit({date : event, id : this.fieldName})
             let date = event?.toString()
             changeDate($(id).val(),this.fieldName, event , this.index , this.listName)
             this.searchDateChanges.emit({selectedDate : $(id).val(),fieldName : this.fieldName,dateString : event ,index : this.index ,listName :  this.listName})
           
            }
       });
      }
      })
      
    
  }
  }
}
