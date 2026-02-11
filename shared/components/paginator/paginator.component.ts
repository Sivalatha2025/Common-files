import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { PageEvent } from './paginator.model';
import { RootEnum } from '../../../constants/constants';
import { MultilanguageService } from '../../../../../src/app/services/multilanguage.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonService } from '../../../../../src/app/services/common/common.service';
import { Router } from '@angular/router';


const DefaultLimit = 10;
@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.css']
})
export class PaginatorComponent implements OnInit, OnChanges , OnDestroy{

  @Input() pageLimit: any = DefaultLimit;
  @Input() CurrentPage: number = 1;
  @Input() TotalRecords: number = 0;
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() onSelectedPageChange = new EventEmitter<PageEvent>();
  @Input() searchPipe: boolean = false;
  pageCount: number = 0;
  startIndex: number = 0;
  endIndex: number = 0;
  changedetect : boolean = false;
  root: string = '';
  rootEnum = RootEnum;
  destroy$ = new Subject<void>();

  constructor( public multiLanguageService: MultilanguageService,private common:CommonService,
    private route: Router
  ) { 
    this.root = this.route.url.split('/')[1];
  }

  ngOnInit(): void {
    // this.common.getRootURL.pipe(takeUntil(this.destroy$)).subscribe((res:any)=>{
    //   if(res && res?.split('/')[1]==this.rootEnum.TicketCRM){
    //     this.root = this.rootEnum.TicketCRM
    //   }else{
    //     this.root = ''
    //   }
    //  });
    this.multiLanguageService.selectedLanguageUpdation()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      
      this.changedetect = !this.changedetect;
    });

 
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.TotalRecords) {
      let pageLimit = parseInt(this.pageLimit);
      this.pageCount = Math.ceil(this.TotalRecords / pageLimit);
      this.startIndex = (this.CurrentPage * pageLimit - pageLimit) + 1
      this.endIndex = this.CurrentPage * pageLimit < this.TotalRecords ? this.CurrentPage * pageLimit : this.TotalRecords
    }
  }

  nextPage() {
    if (this.CurrentPage + 1 <= this.pageCount) {
      let obj = {
        pageLimit: this.pageLimit,
        CurrentPage: this.CurrentPage + 1
      }
      if (!this.searchPipe) {
        this.pageChange.emit(obj);
      } else {
        this.onSelectedPageChange.emit(obj);
      }
    }
  }
  firstPage() {
    let obj = {
      pageLimit: this.pageLimit,
      CurrentPage: 1
    }
    if (!this.searchPipe) {
      this.pageChange.emit(obj);
    } else {
      this.onSelectedPageChange.emit(obj);
    }
  }

  previousPage() {
    if (this.CurrentPage - 1 > 0) {

      let obj = {
        pageLimit: this.pageLimit,
        CurrentPage: this.CurrentPage - 1
      }
      if (!this.searchPipe) {
        this.pageChange.emit(obj);
      } else {
        this.onSelectedPageChange.emit(obj);
      }

    }
  }

  lastPage() {
    let obj = {
      pageLimit: this.pageLimit,
      CurrentPage: this.pageCount
    }
    if (!this.searchPipe) {
      this.pageChange.emit(obj);
    } else {
      this.onSelectedPageChange.emit(obj);
    }
  }
}
