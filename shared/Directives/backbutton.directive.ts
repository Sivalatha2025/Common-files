import { Directive, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { event } from 'jquery';

@Directive({
  selector: '[appBackbutton]'
})
export class BackbuttonDirective {

  @Input() root : string = '';
  @Input() url : any = '';
  @Input() IsDynamic:boolean = false;
  constructor(private Router : Router) { }


  @HostListener('click', ['$event'])
  onClick(event: any) {
    
    if(this.IsDynamic){
      this.Router.navigate([this.url+ '/list'])
    }
    else{
      this.Router.navigate([this.root + this.url])
    }


  }


}
