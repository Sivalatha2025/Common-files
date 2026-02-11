import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormArray } from '@angular/forms';

@Directive({
  selector: '[appControlLastElement]'
})
export class ControlLastElementDirective {

  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef) { }

    @Input() index : number | undefined;
    @Input() isDelete : boolean = false
    @Input() set appControlLastElement(controls: AbstractControl[]) {
     
     let isCondition = false;    
      let count = 0;
      controls.forEach((control) => {
        if (control.get('Status')?.value == '') {
          count++;
        }
      });
      if(this.isDelete){
          if(count > 1){
            isCondition = true
          }else{
            isCondition = false
          }
      }else{
        if(this.index && count == this.index+1){
          isCondition = true
        }else{
          isCondition = false
        }
    
      }
      if (isCondition && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isCondition && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    
    }

}
