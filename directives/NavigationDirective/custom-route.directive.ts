import { Directive, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Directive({
  selector: '[appNavigation]'
})
export class CustomRouteDirective {
  hrefElementValue = '';
  constructor(private router: Router) { }

  @HostListener('click', ['$event', '$event.target','a']) onClick($event: any, event: any) {
    
    let parentHrefValue = '';
    const valu = this.checkHrefValue(event);
    const hrefValue = this.hrefElementValue;
    if (event.parentElement !== undefined && event.parentElement != null) {
      if (event.parentElement.href !== undefined && event.parentElement.href != null) {
        parentHrefValue = event.parentElement.getAttribute('href');
      }
    }

    
    if (hrefValue !== undefined && hrefValue != null && hrefValue != '' && !hrefValue.includes('#')) {
      $event.preventDefault();
      this.navigateUrl(hrefValue);
    } else if (parentHrefValue != undefined && parentHrefValue != null && parentHrefValue != '' && !parentHrefValue.includes('#')) {
      $event.preventDefault();
      this.navigateUrl(parentHrefValue);
    }

  }

 

  navigateUrl(hrefValue: string){
    if (hrefValue !== undefined && hrefValue != null && (hrefValue.indexOf('//') !== -1 || hrefValue.indexOf('http') !== -1 || hrefValue.indexOf('https') !== -1 || hrefValue.indexOf('www.') !== -1)) {
      window.location.href = hrefValue;
    } else if (hrefValue.toLowerCase() !== 'javascript:void(0)' && hrefValue.toLowerCase() !== '#') {
      // this.router.navigate([hrefValue]);          
      this.router.navigateByUrl(hrefValue.toLowerCase());
    }
  }


 checkHrefValue(element: any) {
  if (element !== undefined && element !== null && element.nodeName !== undefined && element.nodeName !== null &&
      element.nodeName.toLowerCase() !== 'a') {
      this.checkHrefValue(element.parentElement);
      return;
  } else {
    this.hrefElementValue = element?.getAttribute('href') || '';
    return true;
  }
}
}
