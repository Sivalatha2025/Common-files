import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

// import { PROJECTTITLE } from '../constants/constants';
import { HomeTitle } from '../../constants/constants';
import { HttpRequestDataService } from '../../../../src/app/services/requestdata/http-request-data.service';
import { StorageService } from '../../../../src/app/storageService/storage-service';
import { BrandingConfig } from 'src/app/services/branding.service';

@Injectable({
  providedIn: 'root'
})
export class MetaServiceService {
siteURL:any;
siteCode:string=HomeTitle;
  constructor(private titleService: Title, private meta: Meta,private storage:StorageService,private _httpRequestData: HttpRequestDataService) {
    this.siteURL = this._httpRequestData.getApplicationUrl().split('.')[0].split('//')[1];
    let siteData:any = this.storage.getLocalStorage('BRANDING_STATE_KEY');
    if(siteData){
     let data:BrandingConfig = JSON.parse(siteData);
     this.siteCode = data.siteCode ? data.siteCode : HomeTitle
    }
  }

  updateTags(keywords: string, description: string, title: string) {
    this.meta.updateTag({name: 'keywords', content: keywords});
    this.meta.updateTag({name: 'description', content: description});
    
    let trimmedURL = this.siteURL?.replace(/\s+/g, '')?.toLowerCase();
    const trimmedCode = this.siteCode?.replace(/\s+/g, '')?.toLowerCase();
    if(trimmedURL && trimmedCode && trimmedURL === trimmedCode){
      this.titleService.setTitle(this.siteCode + title);
    }else{
      this.titleService.setTitle(this.siteURL +' - '+ this.siteCode + title);
    }

  }
}
