import { Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/storageService/storage-service';

@Pipe({
  name: 'displayCurrency'
})
export class CurrencyPipe implements PipeTransform {

  readonly restrictedModules: string[] = ['HotelMangement'];

  currencySymbols: { [key: string]: string } = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CNY: '¥',
    SGD: 'S$'
  }

  constructor(private storage: StorageService,private router:Router) { }

  transform(value: any, type: string): any {
    if (!value) return value;
    if(this.restrictedModules.includes(this.router.url.split('/')[1])){
      return value;
    }
    let currencyCode = this.storage.getSessionStorage('currencycode') || '';
    if(currencyCode){
      currencyCode = currencyCode?.toUpperCase()
    }
    const currencySymbol = this.currencySymbols[currencyCode] || '₹';
    switch (type?.toLowerCase()) {
      case 'number':
        return `${currencySymbol}${value}`;
      case 'string':
        return `${value} (${currencySymbol})`;
      default:
        return value;
    }
  }

}
