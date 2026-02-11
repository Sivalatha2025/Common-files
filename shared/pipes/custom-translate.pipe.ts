import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { map, Subject, take, takeUntil } from 'rxjs';
import { MultilanguageService } from '../../../../src/app/services/multilanguage.service';
import { MultiLangEnabledRoots, RootEnum } from '../../constants/constants';
import { ActivatedRoute, Router } from '@angular/router';

 
@Pipe({
  name: 'customTranslate',
  // pure: false
})
export class CustomTranslatePipe implements PipeTransform, OnDestroy {
  private destroy$ = new Subject<void>();
  private value: string | null = null;
   enabledRoots : any= MultiLangEnabledRoots
   rootEnum = RootEnum;
  constructor(private multilanguageService: MultilanguageService, private ref: ChangeDetectorRef,
     private actRoute  : ActivatedRoute , private route: Router) {
   
  }
 
 
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  transform(value: string,changedetect : boolean,root: string): string  {
    let param = this.route.url.split('/')[1];
    if(this.enabledRoots[param] && value){
    this.multilanguageService.selectedLanguageUpdation()
      .pipe(
        take(1),
        map(res => {
          if (res ) {
            // ;
            // 
            const selectedLang = this.multilanguageService.getSelectedLanguage();
            // const selectedLang = 'marathi';
            // console.log(selectedLang);
            if (selectedLang?.toLowerCase() !== 'english') {
              const englishValue = this.multilanguageService.getRootLangTranslatedValue(root,'english',value)  || value;
              let translatedValue = this.multilanguageService.getRootLangTranslatedValue(root,selectedLang,value) || this.multilanguageService.getRootLangTranslatedValue(this.rootEnum.Common,selectedLang,value);
              return   translatedValue ? translatedValue : englishValue
            } else {
              let translatedValue = this.multilanguageService.getRootLangTranslatedValue(root,selectedLang,value) || this.multilanguageService.getRootLangTranslatedValue(this.rootEnum.Common,selectedLang,value);
              
              return translatedValue || value;
            }
          } else {
            return value;
          }
        })
      )
      .subscribe(translatedValue => {
        this.value = translatedValue;
        this.ref.markForCheck();
      });
 
    return this.value || '';
    }else{
      return value || ''
    }
  }
}