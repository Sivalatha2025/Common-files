import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tableData'
})
export class TablePipe implements PipeTransform {
  constructor(public datepipe : DatePipe){}
  transform(value:any,tableHead:any, isDate?:boolean, format?:string): any {
    let date : any
    if(value){
       date = new Date(value)
    }
    if (!isDate) {
      if (tableHead == 'DateCreated' || tableHead == 'LastUpdated' || tableHead == 'OrderDate' || tableHead == 'HolidayDate' || tableHead == 'RenewalDate' || tableHead == 'SubscriptionEndDate' || tableHead === 'AppointmentTiming') {
        if (value && value != undefined && value != null && value != '') {
          let date = new Date(value);  // if orginal type was a string
          date.setDate(date.getDate());
          let hrs = date.getHours();
          let min = date.getMinutes();
          let minutes = min.toString().length == 1 ? '0' + min : min;
          let datestr = new DatePipe('en-US').transform(value, 'd MMM y');
          if (hrs) {

            value = `${datestr}  ${hrs}:${minutes}`
          } else {
            value = `${datestr} ${'00'}:${'00'}`
          }
          return value;
        }
      }
      else if (tableHead == 'Active' || tableHead == 'IsPublished') {

        if (value == true) {
          return value = 'Active';
        }
        else {
          return value = value != undefined && value != null ? 'Inactive' : ''
        }
      }
      return value;
    }else{

      if(value){
        return this.datepipe.transform(value,format);
      }else{
        return ''
      }

    }
  }

}
