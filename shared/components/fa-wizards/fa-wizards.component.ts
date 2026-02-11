import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { GetMastersAPI, RootEnum } from 'src/app/constants/constants';
import { RoutesObj } from 'src/app/routes.config';
import { CommonService } from 'src/app/services/common/common.service';
import { StorageService } from 'src/app/storageService/storage-service';
import { schemaData } from './vendor-schema';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, filter, takeUntil } from 'rxjs';
import { MultilanguageService } from 'src/app/services/multilanguage.service';
import { encrypt } from '../../encrypt-decrypt';


@Component({
  selector: 'app-fa-wizards',
  templateUrl: './fa-wizards.component.html',
  styleUrls: ['./fa-wizards.component.css']
})
export class FaWizardsComponent implements OnInit,OnDestroy {


  root: string = '';
  wizardSceenIndex = [1, 2, 3, 4, 5, 6];
  activeIndex: number = 1;
  isDisplayVendorData: boolean = false;
  vendorData:any=[];
  searchword:string ='';
  moduleCode:string ='';
  templateName:string ='';
  templeteCodeJson:string ='';
  moduleUrl:string ='';
  templeteCode:string = 'IMVM-252';
  moduleName:string ='Vendor';
  staticSchemaData = schemaData;
  @ViewChild('showvendorPopUp', { static: false }) showvendorPopUp!:ElementRef;
  destroy$ = new Subject<void>();
  tranactionSeries:any='';
  firstScreenOption: any[] = [
    {
      Name: "Journal",
      Path: ''
    },
    {
      Name: "Payment Voucher",
      Path: RoutesObj.AddPaymentVouchers
    },
    {
      Name: "Receipt Voucher",
      Path: RoutesObj.AddReciptVoucher
    },
    {
      Name: "Contra Voucher",
      Path: RoutesObj.AddContraVoucher
    },
    {
      Name: "Debit Note",
      Path: RoutesObj.DebitNoteAdd
    },
    {
      Name: "Credit Note",
      Path: RoutesObj.CreditNoteAdd
    },
  ];

  secondScreenOption: any[] = [
    {
      Name: "Create a manual journal",
      Path: RoutesObj.GenericJournalAdd
    },
    {
      Name: "Create a system generated journal",
      Path: ""
    }
  ];
  thirdScreenOption: any[] = [
    {
      Name: "Purchase",
      Path: ""
    },
    {
      Name: "Sale",
      Path: RoutesObj.SalesJournalAdd
    }
  ];
  fouthScreenOption: any[] = [
    {
      Name: "Purchase for capital expenditure?",
      Path: "",
      TranactionSeriesType: '2'
    },
    {
      Name: "Purchase for operational expenses?",
      Path: "",
      TranactionSeriesType: '4'
    }
  ];
  changedetect: boolean = false;
  


  constructor(private router: Router, private common: CommonService, private storage: StorageService,
    private api: HelperModuleService, private modalService: NgbModal, public multiLanguageService: MultilanguageService
  ) { }

  ngOnInit(): void {
    this.root = this.router.url.split('/')[1];
    this.getVendor();
    this.multiLanguageService.selectedLanguageUpdation()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.changedetect = !this.changedetect;
    });
    const activeIndex = this.storage.getLocalStorage('activeIndex');
    if(activeIndex){
      this.activeIndex = Number(activeIndex);
      this.storage.deleteLocalStorage('activeIndex');
    }
  }
  ngOnDestroy(): void {
    this.modalService.dismissAll();
  }

  getVendor() {
    let req = {
      "MasterDataCode": "IMVendorLedger",
      "Active": "true"
    }

    this.api.postService(GetMastersAPI,req).subscribe({
      next:(res:any)=>{
        if(res && res.Data && res.Data.length >0){
          this.vendorData = res.Data;
        }else{
          this.vendorData = [];
        }
      },
      error:(err:any)=>{
        console.log(err);
        this.vendorData = [];
      }
    })

  }

  routeToPage(item: any) {
    if (item && item.Path) {
      let encryptedId = encrypt(this.activeIndex?.toString())
      let activeIndexKey = encrypt('activeIndex')
      this.router.navigate([`/${this.root}${item.Path}`],{ 
        queryParams: { 
          [activeIndexKey]: encryptedId
        }
      });
      this.common.isChangeWizardView(false)
    } else {
      this.activeIndex++;
      this.storage.setLocalStorage('activeIndex', (this.activeIndex));
    }
  }
  mapTransctionType(item: any) {
    this.tranactionSeries = '';
    this.tranactionSeries = item['TranactionSeriesType'];
    // this.storage.setLocalStorage('TranactionSeriesType', JSON.stringify(obj));
    this.routeToPage(item);
  }

  showDropdownValue(event: any) {
    this.isDisplayVendorData = true;
  }
  hideDropdownValue() {
    this.isDisplayVendorData = false;
  }
  selectVendor(vendorId:any){
  let encryptedId = encrypt(this.activeIndex?.toString());
  let activeIndexKey = encrypt('activeIndex');

  let encryptedVendorId = encrypt(vendorId?.toString());
  let encryptedVendorKey = encrypt('vendorId');

  let encryptedtranactionSeriesId = encrypt(this.tranactionSeries?.toString());
  let encryptedtranactionSeriesKey = encrypt('tranactionSeries');

  this.router.navigate([`${this.root}${RoutesObj.FinanceJournalAdd}`],{ 
    queryParams: { 
      [activeIndexKey] : encryptedId,
      [encryptedVendorKey] : encryptedVendorId,
      [encryptedtranactionSeriesKey] : encryptedtranactionSeriesId
    }
  });
  this.common.isChangeWizardView(false);
  this.hideDropdownValue();
  }

  back(){
    this.activeIndex --;
  }
  openVendor(){
    this.modalService.open(this.showvendorPopUp,{backdrop:'static',size:'lg'})
  }
  closePopup(event?:any){
    this.modalService.dismissAll();
  }
  getVendorDetails(event:any){
    if(event && event.Data && event.Data[0]){
      this.selectVendor(event.Data[0].Id);
    }
  }
  onClickOutside(event:any){
    this.isDisplayVendorData = false;
  }
}
