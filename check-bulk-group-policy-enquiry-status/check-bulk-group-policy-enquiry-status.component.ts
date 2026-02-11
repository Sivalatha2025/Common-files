import { Component, OnInit } from '@angular/core';
import { HelperModuleService } from '../../../../auth/HelperModule/helpermodule.service';
import { ApiDocumentJsonUrls } from '../../../constants/constants';

@Component({
  selector: 'app-check-bulk-group-policy-enquiry-status',
  templateUrl: './check-bulk-group-policy-enquiry-status.component.html',
  styleUrls: ['./check-bulk-group-policy-enquiry-status.component.css']
})
export class CheckBulkGroupPolicyEnquiryStatusComponent implements OnInit {

  JsonUrls = ApiDocumentJsonUrls.CheckBulkGroupPolicyEnquiryStatus;
  curlRequest:any = [];
  errorResponse:any = [];
  successResponse:any = [];
  mandatoryErrors:any = [];
  invalidErrorFields:any = [];

  constructor(private api: HelperModuleService ) { }

  ngOnInit(): void {
    this.getAllJsonsData(this.JsonUrls.curlRequest);
    this.getAllJsonsData(this.JsonUrls.errorResponse);
    this.getAllJsonsData(this.JsonUrls.successResponse);
    this.getAllJsonsData(this.JsonUrls.mandatoryErrors);
    this.getAllJsonsData(this.JsonUrls.invalidErrorFields);
  }

  getAllJsonsData(url: string) {
    this.api.getService(url).subscribe((res: { Data: any[]; }) => {
      if (res) {
        if (url === this.JsonUrls.curlRequest) {
          this.curlRequest = res.Data[0];
        } else if (url === this.JsonUrls.errorResponse) {
          this.errorResponse = res.Data;
        } else if (url == this.JsonUrls.successResponse){
          this.successResponse = res
        } else if (url == this.JsonUrls.mandatoryErrors){
          this.mandatoryErrors = res
        } else if (url == this.JsonUrls.invalidErrorFields){
          this.invalidErrorFields = res
        }
      }
    });
  }


}
