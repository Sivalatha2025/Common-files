import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MultilanguageService } from '../../../../../src/app/services/multilanguage.service';
declare var $: any;

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.css'],
})
export class CommentsComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = '';
  @Input() lableName: string = '';
  @Input() isRequired: boolean = false;
  @Input() commentsField: any = [];
  @Input() toolTips : string = '';
  isSubmitted: boolean = false;
  commentsForm!: FormGroup;
  commentscount: number = 0;
  isMobileToolTip:boolean =false;
  destroy$ = new Subject<void>()
  changedetect : boolean = false;
 root : string = '';
  constructor(private formBuilder: FormBuilder,@Inject(PLATFORM_ID) private platformId: any,
  private multiLanguageService : MultilanguageService, private router : Router) {

    this.root = router.url.split('/')[1];
  }

  ngOnInit(): void {
    this.multiLanguageService.selectedLanguageUpdation()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      
      this.changedetect = !this.changedetect;
    });


    const formGroupConfig = this.createFormGroupCofig(this.commentsField);
    this.commentsForm = this.formBuilder.group(formGroupConfig);
    if (isPlatformBrowser(this.platformId)) {
      let getWidth:any = $(window).width();
      if (getWidth < 999) {
        this.isMobileToolTip = true;
      }else{
        this.isMobileToolTip = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFormGroupCofig(filelds: any[]): any {
    
    const formGroupConfig: any = {};

    filelds.forEach((field) => {
      const validators = [];
      if (field.Required) {
        validators.push(Validators.required);
      }
      if (field.MaxLength) {
        validators.push(Validators.maxLength(field.MaxLength));
      }
      if (field.MinLength) {
        validators.push(Validators.maxLength(field.MinLength));
      }
      if (field.Pattern) {
        validators.push(Validators.pattern(field.Pattern));
      }

      formGroupConfig[field.FormField] = ['', {updateOn:'change',validators: validators}];
    });
    return formGroupConfig;
  }

  getErrorMessage(fieldName: string) {
    const control: any = this.commentsForm.get(fieldName);
    const errorField = this.commentsField.find(
      (field: any) => field.FormField == fieldName
    );

    if (control?.hasError('required')) {
      return this.capitalizeFirstLetter(errorField?.RequiredErrorMessage || '');
    } else if (control?.hasError('pattern')) {
      return this.capitalizeFirstLetter(errorField?.PatternErrorMessage || '');
    } else if (control?.hasError('maxlength')) {
      return this.capitalizeFirstLetter(errorField?.LengthErrorMessage || '');
    } else if (control?.hasError('minlength')) {
      return this.capitalizeFirstLetter(errorField?.LengthErrorMessage || '');
    } else if (control?.hasError('max')) {
      return this.capitalizeFirstLetter(errorField?.RangeErrorMessage || '');
    } else if (control?.hasError('min')) {
      return this.capitalizeFirstLetter(errorField?.RangeErrorMessage || '');
    } else {
      return this.capitalizeFirstLetter(errorField?.PatternErrorMessage || '');
    }
  }
  capitalizeFirstLetter(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  getcommentcounts(event: any, field: any, i: number) {
    if (field) {
      try {
        event.stopPropagation();
     } catch (error) {
       
     }
      field.Commentscount = field.MaxLength - event.target.value.length;
    }
  }
}
