import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HelperModuleService } from 'src/app/auth/HelperModule/helpermodule.service';
import { AutoSave, UpdateContentBoxReviewRDLC, GetRDLCBRDStatusByBRDId } from 'src/app/constants/constants';
import { StorageService } from 'src/app/storageService/storage-service';
import { DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonService } from 'src/app/services/common/common.service';

export interface Change {
  path: string;
  value: unknown;
}

interface ReviewData {
  ContentBoxReviewedBy: string;
  IsReviewed: boolean;
  ShortRead: boolean;
  ReviewedTimeInSec: number,
  IsRead: boolean,
  ReviewedDate: string
}

declare function monitorEditorsByClass(classname: any): void;

@Injectable({
  providedIn: 'root'
})

export class DatabagRdlcService {

  public previousFormValue: any = {};
  public reviewedStatus: Record<string, Array<ReviewData>> = {};
  public readTimers: Record<string, string> = {};
  public timerIntervals: Record<string, any> = {};
  public timerStartTimes: Record<string, number> = {};
  public getContextBoxDataBag: any;
  public RDLCTypeIdDatabag: any;
  public isSendBackAvailable = false;
  public rdlcContentBoxCode: any;
  public highlightedTabNames: string[] = [];
  public RDLCTypeData: any;
  public rdlcTabs: any[] = [];
  public isBRDApproved = false;
  public allowedFieldsDesignHTML = ['UploadHtmlFiles', 'HtmlLink', 'DesignLink'];
  public allowedFieldsLLDAPI = ['Comments', 'ErrorCodes', 'APIRequestResponse', 'MethodDetails', 'ScreenElement', 'BusinessComponentId', 'APIValidation', 'LLDAPIImpactAnalysis', 'TechDetails_API'];
  public allowedFieldsLLDUI = ['LLDUIImpactAnalysisUIScreen', 'TechDetails_UI', 'ScreenElementUI', 'PageLevelValidation', 'MethodDetails_UI', 'APIRequestResponse_UI', 'UILLDComment', 'UploadDynamicExcelFile_UI'];
  public allowedFieldsLLDDB = ['LLDDBImpactAnalysis', 'TechDetails_DB', 'TableDetails', 'ProcedureDetails', 'DBComments'];
  public updateCssSubject = new Subject<void>();
  public initializedEditors = new Set<Element>();
  // This key is used to track comments, please ensure it matches the key used in your comments data structure, Better Don't touch this.
  // If In case you want to change this, please update the DocumentCode in the Data base.
  public addReleaseDocumentViewModel = [
    {
      key: 'projectinformation',
      title: 'Project Information'
    },
    {
      key: 'releaseDetails',
      title: 'Release Details'
    },
    {
      key: 'releaseteam',
      title: 'Release Team'
    },
    {
      key: 'postreleasesupportteam',
      title: 'Post Release Support Team'
    },
    {
      key: 'features',
      title: 'Features'
    },
    {
      key: 'taskItems',
      title: 'Task Items'
    },
    {
      key: 'prereleaseactivitiy',
      title: 'Prerelease Activity'
    },
    {
      key: 'releaseactivitiy',
      title: 'Release Activity'
    },
    {
      key: 'fileChanges', // fileChanges was changes to target application affected by release
      title: 'Target Application Affected By Release'
    },
    {
      key: 'postlivechecklist',
      title: 'Post Live Checklist'
    },
    {
      key: 'RollBackPlan',
      title: 'Roll Back Plan'
    },
    {
      key: 'checklistAfterrollback',
      title: 'Checklist After Rollback'
    },
    {
      key: 'BackUpFrom',
      title: 'Backup Path'
    },
    {
      key: 'AdditionalSignOffDocuments',
      title: 'Additional Sign Off Documents'
    },
    {
      key: 'Comments',
      title: 'Comments'
    },
    {
      key: 'BRDDetails',
      title: 'RDLC Document Status Details'
    }
  ];

  constructor(
    public api: HelperModuleService,
    public route: Router,
    public storage: StorageService,
    public datePipe: DatePipe,
    public ngZone: NgZone,
    public fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private common: CommonService
  ) {
    this.reviewedStatus = {};
    this.readTimers = {};
    this.updateCssSubject.pipe(debounceTime(300)).subscribe(() => {
      this.ngZone.runOutsideAngular(() => {
        this.initEditorsOnce('manipulate-content-by-css');
      });
    });
  }

  public clearValues() {
    this.previousFormValue = {};
    this.reviewedStatus = {};
    this.readTimers = {};
    this.isSendBackAvailable = false;
  }

  public findChangedFields(prev: unknown, curr: unknown, path: string = ''): Change[] {
    const changes: Change[] = [];
    const isPrimitive = (val: unknown): val is null | string | number | boolean | symbol | undefined =>
      val === null || typeof val !== 'object';
    if (isPrimitive(prev) || isPrimitive(curr)) {
      if (prev !== curr) {
        changes.push({ path, value: curr });
      }
      return changes;
    }
    const prevObj = prev as Record<string | number, unknown>;
    const currObj = curr as Record<string | number, unknown>;
    const keys = new Set([...Object.keys(prevObj || {}), ...Object.keys(currObj || {})]);
    for (const key of keys) {
      const newPath = Array.isArray(curr) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
      changes.push(...this.findChangedFields(prevObj?.[key], currObj?.[key], newPath));
    }
    return changes;
  }

  public autoSaveField(req: any) {
    this.api.postService(AutoSave, req).subscribe({
      next: (res: any) => {
      },
      error: (err: any) => {
        console.log(err);
      }
    })
  }

  public closeBrdPopUp() {
    this.route.navigate(['/RDLC/CreateRDLC/list']);
  }

  public toggleReviewed(formFieldKey: string): void {
    const reviewedBy = 'Team RDLC';
    if (!this.reviewedStatus[formFieldKey] || this.reviewedStatus[formFieldKey].length === 0) {
      this.reviewedStatus[formFieldKey] = [{
        ContentBoxReviewedBy: reviewedBy,
        IsReviewed: true,
        ShortRead: true,
        ReviewedTimeInSec: 0,
        IsRead: true,
        ReviewedDate: 'null'
      }];
    } else {
      const lastReview = this.reviewedStatus[formFieldKey][this.reviewedStatus[formFieldKey].length - 1];
      lastReview.IsReviewed = true;
    }
  }

  public startReadTimer(formField: string, previousSeconds: number = 0) {
    if (this.isSendBackAvailable) {
      const now = Date.now();
      this.timerStartTimes[formField] = now - previousSeconds * 1000;
      if (this.timerIntervals[formField]) {
        clearInterval(this.timerIntervals[formField]);
      }
      this.timerIntervals[formField] = setInterval(() => {
        const elapsedMs = Date.now() - this.timerStartTimes[formField];
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        this.readTimers[formField] = `${mins} Mins ${secs} Secs`;
      }, 1000);
    }
  }

  public UpdateContentBoxReview(selectedFormField: any) {
    if (this.isSendBackAvailable && selectedFormField) {
      let BRDID = this.storage.getSessionStorage('BRDID') ?? '';
      const selectedBoxId = this.getContentBoxId(selectedFormField, this.getContextBoxDataBag);
      const elapsedSeconds = Math.floor(Date.now() / 1000) - Math.floor(this.timerStartTimes[selectedFormField] / 1000);
      const reviewList = this.reviewedStatus[selectedFormField];
      const isReviewed = reviewList?.[0]?.IsReviewed?.toString() || 'false';
      let request = {
        "RDLCBRDId": BRDID || '',
        "RDLCTypeId": this.RDLCTypeIdDatabag?.Id ?? '',
        "RDLCContentBoxId": selectedBoxId,
        "ReviewedTimeSeconds": this.isGetExistingSeconds(selectedFormField)?.toString() || '0',
        "NewReviewedTimeSeconds": (elapsedSeconds - this.isGetExistingSeconds(selectedFormField))?.toString() || '0',
        "IsReviewed": isReviewed || 'false',
        "CountryCode": "ind",
        "CurrenyCode": "inr",
        "LanguageCode": "eng"
      }
      this.api.postService(UpdateContentBoxReviewRDLC, request).subscribe({
        next: (response: any) => {
          if (response.ReturnCode === 0 && response.Data) {
            const reviewData = {
              ContentBoxReviewedBy: response.Data.ContentBoxReviewedBy ?? 'Team RDLC',
              ShortRead: response.Data.IsValidReview ?? false,
              IsReviewed: response.Data.IsReviewed ?? false,
              ReviewedTimeInSec: response.Data.ReviewedTimeInSec ?? elapsedSeconds ?? 0,
              IsRead: response.Data.IsRead ?? true,
              ReviewedDate: response.Data.ReviewedDate ?? 'null',
            };
            if (!this.reviewedStatus[selectedFormField]) {
              this.reviewedStatus[selectedFormField] = [];
            }
            if (this.reviewedStatus[selectedFormField].length > 0) {
              this.reviewedStatus[selectedFormField][0] = reviewData;
            } else {
              this.reviewedStatus[selectedFormField].push(reviewData);
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        }
      })
    }
  }

  public initializeReviewedData(contentBoxes: any[]): void {
    this.reviewedStatus = {};
    this.readTimers = {};
    contentBoxes?.forEach((box: any) => {
      const formFieldKey = this.getFormFieldKey(box.RDLCContentBoxCode);
      if (!formFieldKey) return;
      const reviewData: ReviewData = {
        ContentBoxReviewedBy: box.ReviewedBy ?? '',
        IsReviewed: box.IsReviewed ?? false,
        ShortRead: box.IsValidReview ?? false,
        ReviewedTimeInSec: box.ReviewedTimeInSec ?? 0,
        IsRead: box.IsRead ?? true,
        ReviewedDate: box?.ReviewedDate ?? new Date(),
      };
      this.reviewedStatus[formFieldKey] = [reviewData];
      if (box.ReviewedTimeInSec) {
        const mins = Math.floor(box.ReviewedTimeInSec / 60);
        const secs = box.ReviewedTimeInSec % 60;
        this.readTimers[formFieldKey] = `${mins} Mins ${secs} Secs`;
      }
    });
  }

  public isReviewedModel(field: string): boolean {
    return this.reviewedStatus?.[field]?.[0]?.IsReviewed ?? false;
  }

  public isShortRead(field: string): boolean {
    const isReviewed = this.reviewedStatus?.[field]?.[0]?.IsReviewed ?? false;
    if (!isReviewed) {
      return true;
    }
    return this.reviewedStatus?.[field]?.[0]?.ShortRead ?? false;
  }

  public isRead(field: string): boolean {
    return this.reviewedStatus?.[field]?.[0]?.IsRead ?? true;
  }

  public isContentBoxReviewedBy(field: string): string {
    return this.reviewedStatus?.[field]?.[0]?.ContentBoxReviewedBy ?? '';
  }

  public isGetExistingSeconds(field: string): number {
    return this.reviewedStatus?.[field]?.[0]?.ReviewedTimeInSec ?? 0;
  }

  public isReviewedDate(field: string): string {
    let dateStr = this.reviewedStatus?.[field]?.[0]?.ReviewedDate;
    if (!dateStr || dateStr === 'null') {
      dateStr = new Date().toISOString();
    }
    return this.datePipe?.transform(dateStr, 'dd MMM yyyy, hh:mm a', '+0530') ?? '';
  }

  public getContentBoxId(formField: string, contentBoxes: any[]): string | null {
    const codeMap: Record<string, string> = {
      // These Used for the LLD API Screens
      PurposeObjective: 'PUROBJ0016',
      ImpactAnalysis: 'IMPANL0017',
      LLDUIImpactAnalysis: 'LLDUI001',
      UIValidation: 'PGLVLVAL002',
      flowDiagram: 'UPLDIA0026',
      ScreenElementUI: 'SCRELE0025',
      LLDAPIImpactAnalysis: 'IMPANLAPI0012',
      APIValidation: 'PGLVLVALAPI0014',
      ScreenElement: 'SCRELE0024',
      TechDetails_DB: 'TECH0036',
      APIRequestResponse: 'APIREQRES0032',
      BusinessComponentId: 'BUSCOM0033',
      MethodDetails: 'MET0034',
      ErrorCodes: 'ERR0035',
      TechDetails_API: 'TECH0031',
      DBComments: 'COMMDB0010',
      ProcedureDetails: 'STRPRO0038',
      LLDDBImpactAnalysis: 'IMPANLDB007',
      TableDetails: 'DBSCH0037',
      // These Used for the BRD Details Screen
      Comments: 'APICOMM004',
      RDLCFiles: 'UPDDYNEXL0046',
      ScreenelementBrd: 'SCRELE0023',
      BusinessLogic: 'BUSLG18',
      FutureEnhancements: 'FUTEN0019',
      BRDComment: 'BRDCMM0020',
      ImpactAnalysisDetails: 'IMPANLDT0053',
      // These Used for the Design HTML Screen
      UploadHtmlFiles: 'UPDHTMLFL',
      DesignLink: 'DESLK0021',
      HtmlLink: 'HTMLLK0022',
      // These Used for the LLD UI Screen
      LLDUIImpactAnalysisUIScreen: 'IMPANLUI0011',
      PageLevelValidation: 'PGLVLVALUI0013',
      UILLDComment: 'UICOMM003',
      MethodDetails_UI: 'MET0052',
      TechDetails_UI: 'TECH0051',
      UploadDynamicExcelFile_UI: 'UPDDYNEXL0050',
      APIRequestResponse_UI: 'APIREQRES0048',
    };
    const matchCode = codeMap[formField];
    if (!matchCode) return null;
    const matches = contentBoxes?.filter(cb => cb.RDLCContentBoxCode === matchCode) ?? [];
    if (matches.length === 1) {
      return matches[0].Id ?? null;
    } else if (matches.length > 1) {
      return matches.find(cb => cb.RDLCTypeId === this.RDLCTypeIdDatabag?.Id)?.Id ?? null;
    }
    return null;
  }

  public getFormFieldKey(code: string): string | null {
    const reverseMap: Record<string, string> = {
      'PUROBJ0016': 'PurposeObjective',
      'IMPANL0017': 'ImpactAnalysis',
      'LLDUI001': 'LLDUIImpactAnalysis',
      'PGLVLVAL002': 'UIValidation',
      'UPLDIA0026': 'flowDiagram',
      'SCRELE0025': 'ScreenElementUI',
      'IMPANLAPI0012': 'LLDAPIImpactAnalysis',
      'PGLVLVALAPI0014': 'APIValidation',
      'SCRELE0024': 'ScreenElement',
      'TECH0036': 'TechDetails_DB',
      'APIREQRES0032': 'APIRequestResponse',
      'BUSCOM0033': 'BusinessComponentId',
      'MET0034': 'MethodDetails',
      'MET0052': 'MethodDetails_UI',
      'ERR0035': 'ErrorCodes',
      'APICOMM004': 'Comments',
      'UPDDYNEXL0046': 'RDLCFiles',
      'SCRELE0023': 'ScreenelementBrd',
      'BUSLG18': 'BusinessLogic',
      'FUTEN0019': 'FutureEnhancements',
      'BRDCMM0020': 'BRDComment',
      'UPDHTMLFL': 'UploadHtmlFiles',
      'DESLK0021': 'DesignLink',
      'HTMLLK0022': 'HtmlLink',
      'IMPANLUI0011': 'LLDUIImpactAnalysisUIScreen',
      'PGLVLVALUI0013': 'PageLevelValidation',
      'UICOMM003': 'UILLDComment',
      'TECH0031': 'TechDetails_API',
      'TECH0051': 'TechDetails_UI',
      'UPDDYNEXL0050': 'UploadDynamicExcelFile_UI',
      'APIREQRES0048': 'APIRequestResponse_UI',
      'STRPRO0038': 'ProcedureDetails',
      'COMMDB0010': 'DBComments',
      'IMPANLDB007': 'LLDDBImpactAnalysis',
      'DBSCH0037': 'TableDetails',
      'IMPANLDT0053': 'ImpactAnalysisDetails'
    };
    return reverseMap[code] ?? null;
  }

  // This method is only used for the DB Screen, Dynamic elements
  public getNormalizedFormFieldKey(rawKey: string): string {
    const normalizedMap: Record<string, string> = {
      'htmllinks': 'HtmlLink',
      'pagelevelvalidationsui': 'PageLevelValidation',
      'impactanalysis-lld-ui': 'LLDUIImpactAnalysis',
      'uicomments': 'UILLDComment',
      'pagelevelvalidationsapi': 'APIValidation',
      'impactanalysis-lld-api': 'LLDAPIImpactAnalysis',
      'apicomments': 'Comments',
      'purpose / objective': 'PurposeObjective',
      'impact analysis': 'ImpactAnalysis',
      'business logic': 'BusinessLogic',
      'future enhancements': 'FutureEnhancements',
      'brdcomments': 'BRDComment',
      'designlinks': 'DesignLink',
    };
    const normalizedKey = rawKey?.trim().toLowerCase();
    return normalizedMap[normalizedKey] ?? rawKey?.trim();
  }

  public StatusByBRDId() {
    this.highlightedTabNames = [];
    let BRDID = this.storage.getSessionStorage('BRDID') ?? '';
    let request = {
      "BRDId": BRDID ?? '',
      "CountryCode": "ind",
      "CurrenyCode": "inr",
      "LanguageCode": "eng"
    }
    this.api.postService(GetRDLCBRDStatusByBRDId, request).subscribe({
      next: (response: any) => {
        if (response?.Data) {
          response.Data.RDLCBRDStatusList.forEach((item: any) => {
            const nameAliasMap: { [key: string]: string } = { 'brd': 'BRD Details', 'lld-db': 'DB', 'testcases': 'Test Cases' };
            const rdlcTypeId = item.RDLCTypeId;
            if (!rdlcTypeId) return;
            const matchedType = this.RDLCTypeData.find((type: any) => type.Id?.toLowerCase?.().trim() === rdlcTypeId.toLowerCase().trim());
            if (!matchedType.Name) return;
            const rdlcNameKey = matchedType.Name.toLowerCase().trim();
            const mappedTabName = nameAliasMap[rdlcNameKey] || matchedType.Name;
            const matchedTab = this.rdlcTabs.find(tab => tab.TemplateName?.toLowerCase().trim() === mappedTabName.toLowerCase().trim());
            if (matchedTab) {
              this.highlightedTabNames.push(matchedTab.TemplateName);
            }
          });
        } else {
          console.warn("No data in response.Data");

        }
      },
      error: (err: any) => {
        console.log(err);
      }
    })
  }

  public isHighlightedTab(templateName: string): boolean {
    return this.highlightedTabNames.some((name) => name.toLowerCase() === templateName.toLowerCase());
  }

  public updateCss() {
    this.updateCssSubject.next();
  }

  public initEditorsOnce(className: string) {
    const editors = document.getElementsByClassName(className);
    for (let i = 0; i < editors.length; i++) {
      const editorElement = editors[i];
      if (!this.initializedEditors.has(editorElement)) {
        this.initializedEditors.add(editorElement);
        this.observeEditorContent(editorElement);
      }
    }
  }

  public observeEditorContent(editorElement: Element) {
    const contentArea = editorElement.querySelector('.angular-editor-textarea');
    if (!contentArea) {
      setTimeout(() => this.observeEditorContent(editorElement), 300);
      return;
    }
    const observer = new MutationObserver(() => {
      this.applyInlineStyles(contentArea);
    });
    observer.observe(contentArea, {
      childList: true,
      subtree: true,
      characterData: true
    });
    this.applyInlineStyles(contentArea);
  }

  public applyInlineStyles(container: Element) {
    const inlineStyles: Record<string, string> = {
      h1: "font-size:16px !important; color:#003388 !important; font-weight:bold !important; margin-bottom:10px !important;",
      h2: "font-size:15px !important; color:#003388 !important; font-weight:bold !important; margin-bottom:10px !important;",
      p: "font-size:14px !important; color:#000 !important; margin-bottom:15px !important;",
      a: "text-decoration:none !important; color:#000 !important; font-size:14px !important;",
      blockquote: "font-size:14px !important; color:#000 !important; margin:0 !important;",
      abbr: "font-size:14px !important; color:#000 !important;",
      address: "font-size:14px !important; color:#000 !important;",
      pre: "font-size:14px !important; color:#000 !important;",
      code: "font-size:14px !important; color:#000 !important;",
      ul: "list-style-type:disc !important; padding-left:20px !important; margin:0 !important;margin-bottom:10px !important;",
      ol: "list-style-type:decimal !important; padding-left:20px !important; margin:0 !important;margin-bottom:10px !important;",
      li: "font-size:14px !important; color:#000 !important;",
      dt: "font-size:14px !important; color:#000 !important;",
      dd: "font-size:14px !important; color:#000 !important;",
      table: "border:1px solid #4DA4CF !important; border-radius:6px !important; border-collapse:separate !important; border-spacing:0 !important; width:100% !important; margin-bottom:10px !important;",
      caption: "font-size:14px !important; color:#000 !important;",
      th: "font-size:14px !important; color:#003388 !important; background-color:#DCF1F8 !important; padding:20px 10px !important; border:0 !important; text-align:left !important; vertical-align:middle !important;",
      td: "font-size:14px !important; color:#000 !important; background-color:#fff !important; padding:20px 10px !important; border:0 !important; text-align:left !important; vertical-align:middle !important;",
      form: "font-size:14px !important;",
      label: "font-size:14px !important; color:#000 !important; font-weight:500 !important;",
      input: "font-size:14px !important; color:#000 !important;",
      details: "font-size:14px !important; color:#000 !important;",
      summary: "font-size:14px !important; color:#000 !important;",
      dialog: "font-size:14px !important; color:#000 !important;",
      img: "width: auto !important; max-width: 100% !important;"
    };
    Object.entries(inlineStyles).forEach(([tag, style]) => {
      const elements = container.querySelectorAll(tag);
      elements.forEach(el => el.setAttribute('style', style));
    });
    const firstRow = container.querySelector("table tr:first-child");
    if (!firstRow) return;
    const thElements = firstRow.querySelectorAll("th");
    const tdElements = firstRow.querySelectorAll("td");
    const specialStyle = "font-size:14px !important; color:#003388 !important; background-color:#DCF1F8 !important; padding:20px 10px !important; border:0 !important; text-align:left !important; vertical-align:middle !important;";
    if (thElements.length > 0) {
      thElements.forEach(th => th.setAttribute("style", specialStyle));
    } else if (tdElements.length > 0) {
      tdElements.forEach(td => td.setAttribute("style", specialStyle));
    }
  }

  public redirectRDLCList() {
    this.route.navigate(['/RDLC/CreateRDLC/list']);
  }

  // Excel Logics Starts Here 
  private addDropdownValidation(ws: XLSX.WorkSheet, range: string, list: string[]) {
    // Debug: Log dropdown data and range
    console.log('[Dropdown] Range:', range);
    console.log('[Dropdown] List:', list);
    if (!list || !Array.isArray(list) || list.length === 0) {
      console.warn('[Dropdown] List is empty or invalid for range:', range);
      return;
    }
    const formula = '"' + list.map(x => x.replace(/"/g, '""')).join(',') + '"';
    console.log('[Dropdown] Formula:', formula);
    const dv: any = {
      type: 'list',
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Choose a value from the dropdown list.',
    };
    // Use !dataValidations (plural) for xlsx-js-style
    if (!ws['!dataValidations']) ws['!dataValidations'] = [];
    ws['!dataValidations'].push({ sqref: range, ...dv });
  }

  public downloadExcel(formArray: FormArray, formFieldObject: any, mastersObject: any, header: string[], excelName: string): void {
    const wb = XLSX.utils.book_new();
    const sheetNames = new Set<string>();
    const defaultColWidth = 18;
    const colWidths = header.map(h => ({ wch: Math.max(h.length + 8, defaultColWidth) }));
    formArray.controls.forEach((panel, index: number) => {
      const panelGroup = panel as FormGroup;
      let sheetName = panelGroup.get(formFieldObject['ScreenElement']['ScreenName']?.FormField)?.value?.toString().trim();
      if (!sheetName) sheetName = `Screen-${index + 1}`;
      // Truncate to 31 chars (Excel limit)
      let baseSheetName = sheetName.substring(0, 31);
      // Remove trailing dash if present after truncation
      baseSheetName = baseSheetName.replace(/[-\s]+$/, '');
      let uniqueSheetName = baseSheetName;
      let counter = 1;
      // Ensure uniqueness and still <= 31 chars
      while (sheetNames.has(uniqueSheetName)) {
        // Reserve space for suffix: -1, -2, etc.
        const suffix = `-${counter++}`;
        const maxBaseLength = 31 - suffix.length;
        uniqueSheetName = baseSheetName.substring(0, maxBaseLength) + suffix;
      }
      sheetNames.add(uniqueSheetName);
      // Always start with header row
      const ws = XLSX.utils.aoa_to_sheet([header]);
      ws['!cols'] = colWidths;
      // Apply text wrap and bold to header row
      for (let col = 0; col < header.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
          font: { bold: true }
        };
      }
      const screenElements = panelGroup.get('ScreenElements') as FormArray;
      let rowIndex = 2;
      screenElements.controls.forEach((el, i) => {
        if (el.get('Status')?.value !== '') return;
        // Build row dynamically based on header
        const row: any[] = [];
        header.forEach((colName, idx) => {
          switch (colName) {
            case 'Sl. No':
              row.push(i + 1);
              break;
            case 'Field Name':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['FieldName']?.FormField)?.value || '');
              break;
            case 'Mandatory':
              row.push(this.getLabelById(mastersObject['RDLCMandatoryId'], el.get(formFieldObject['ScreenElement']['ScreenElements']['RDLCMandatoryId']?.FormField)?.value));
              break;
            case 'Input Type':
              row.push(this.getLabelById(mastersObject['RDLCInputTypeId'], el.get(formFieldObject['ScreenElement']['ScreenElements']['RDLCInputTypeId']?.FormField)?.value));
              break;
            case 'Acceptance Criteria':
              row.push(this.getLabelById(mastersObject['RDLCAcceptanceCriteriaId'], el.get(formFieldObject['ScreenElement']['ScreenElements']['RDLCAcceptanceCriteriaId']?.FormField)?.value));
              break;
            case 'Specific Acceptance Criteria':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['SpecificAcceptanceCriteria']?.FormField)?.value || '');
              break;
            case 'Max Length':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['MaxLength']?.FormField)?.value || '');
              break;
            case 'Regex (Format)':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['RegexFormat']?.FormField)?.value || '');
              break;
            case 'Custom Logic':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['CustomLogic']?.FormField)?.value || '');
              break;
            case 'Validation':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['Validation']?.FormField)?.value || '');
              break;
            case 'Error Message':
              row.push(el.get(formFieldObject['ScreenElement']['ScreenElements']['ErrorMessage']?.FormField)?.value || '');
              break;
            default:
              row.push('');
          }
        });
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: 'A' + rowIndex });
        // Apply text wrap to each cell in the row
        for (let col = 0; col < row.length; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex - 1, c: col });
          if (!ws[cellRef]) continue;
          ws[cellRef].s = {
            alignment: { wrapText: true, vertical: 'center' }
          };
        }
        rowIndex++;
      });
      const comment = panelGroup.get(formFieldObject['ScreenElement']['ScreenComments']?.FormField)?.value || '';
      XLSX.utils.sheet_add_aoa(ws, [[''], ['Comments', comment]], { origin: 'A' + (rowIndex + 1) });
      // Apply text wrap to Comments row (the row after the last data row)
      for (let col = 0; col < header.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: col });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          alignment: { wrapText: true, vertical: 'center' }
        };
      }
      // Dropdown logic (only for known columns)
      const start = 2;
      const end = rowIndex - 1;
      if (end >= start) {
        if (header.includes('Mandatory')) {
          const mandatoryList = mastersObject['RDLCMandatoryId']?.map((x: any) => x.Name);
          this.addDropdownValidation(ws, `C${start}:C${end}`, mandatoryList);
        }
        if (header.includes('Input Type')) {
          const inputTypeList = mastersObject['RDLCInputTypeId']?.map((x: any) => x.Name);
          this.addDropdownValidation(ws, `D${start}:D${end}`, inputTypeList);
        }
        if (header.includes('Acceptance Criteria')) {
          const acceptanceList = mastersObject['RDLCAcceptanceCriteriaId']?.map((x: any) => x.Name);
          this.addDropdownValidation(ws, `E${start}:E${end}`, acceptanceList);
        }
      }
      XLSX.utils.book_append_sheet(wb, ws, uniqueSheetName);
    });
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), excelName);
  }

  public parseExcel(file: File, formFieldObject: any, mastersObject: any): Promise<{ data: any[], warnings: string[] }> {
    return new Promise(async (resolve) => {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const data: any[] = [];
      const warnings: string[] = [];
      wb.SheetNames.forEach(sheetName => {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        if (!rows || rows.length < 2) return;
        // Try to find panel Id and AutoSaveId from mastersObject or other context if available
        let panelId = '';
        let panelAutoSaveId = '';
        if (mastersObject && mastersObject.panelMap && mastersObject.panelMap[sheetName]) {
          panelId = mastersObject.panelMap[sheetName].Id || '';
          panelAutoSaveId = mastersObject.panelMap[sheetName].AutoSaveId || '';
        }
        const panel = {
          panelName: sheetName,
          elements: [] as any[],
          comment: '',
          Id: panelId,
          AutoSaveId: panelAutoSaveId,
          ScreenComments: '',
          Status: ''
        };
        // Skip header row and empty rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(cell => cell === '' || cell == null)) continue;
          // If row is a comment row, set panel comment
          if (row[0] === 'Comments') { panel.comment = row[1] || ''; panel.ScreenComments = row[1] || ''; continue; }
          // Defensive: check if row matches expected columns
          const fieldName = row[1]?.toString().trim();
          if (!fieldName) continue;
          const mandatoryLabel = row[2]?.toString().trim();
          const inputTypeLabel = row[3]?.toString().trim();
          const acceptanceLabel = row[4]?.toString().trim();
          const SpecificAcceptanceCriteriaLabel = row[5]?.toString().trim();
          // Map additional columns if present
          const MaxLength = row[6]?.toString().trim() || '';
          const RegexFormat = row[7]?.toString().trim() || '';
          const CustomLogic = row[8]?.toString().trim() || '';
          const Validation = row[9]?.toString().trim() || '';
          const ErrorMessage = row[10]?.toString().trim() || '';
          const mandatoryId = this.getIdByLabel(mastersObject['RDLCMandatoryId'], mandatoryLabel);
          const inputTypeId = this.getIdByLabel(mastersObject['RDLCInputTypeId'], inputTypeLabel);
          const acceptanceId = this.getIdByLabel(mastersObject['RDLCAcceptanceCriteriaId'], acceptanceLabel);
          if (!mandatoryId) warnings.push(`Unknown Mandatory: ${mandatoryLabel}`);
          if (!inputTypeId) warnings.push(`Unknown Input Type: ${inputTypeLabel}`);
          if (!acceptanceId) warnings.push(`Unknown Acceptance: ${acceptanceLabel}`);
          // Try to find element Id and AutoSaveId from mastersObject if available
          let elementId = '';
          let elementAutoSaveId = '';
          if (mastersObject && mastersObject.elementMap && mastersObject.elementMap[fieldName]) {
            elementId = mastersObject.elementMap[fieldName].Id || '';
            elementAutoSaveId = mastersObject.elementMap[fieldName].AutoSaveId || '';
          }
          panel.elements.push({
            FieldName: fieldName,
            RDLCMandatoryId: mandatoryId,
            RDLCInputTypeId: inputTypeId,
            RDLCAcceptanceCriteriaId: acceptanceId,
            SpecificAcceptanceCriteria: SpecificAcceptanceCriteriaLabel || '',
            MaxLength: MaxLength,
            RegexFormat: RegexFormat,
            CustomLogic: CustomLogic,
            Validation: Validation,
            ErrorMessage: ErrorMessage,
            Status: '',
            Id: elementId,
            AutoSaveId: elementAutoSaveId
          });
        }
        // Only push panel if it has at least one ScreenElement
        if (panel.elements.length > 0) {
          data.push(panel);
        }
      });
      resolve({ data, warnings });
    });
  }

  public getIdByLabel(list: any[], label: string): any {
    return list?.find(item => item.Name?.toLowerCase() === label?.toLowerCase())?.Id || null;
  }

  public getLabelById(list: any[], id: any): string {
    const item = list?.find(item => item.Id === id);
    if (!item) { return ''; }
    return item.Name;
  }

public parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim().replace(/,\s*$/, ''); // drop trailing comma

  // 1) ISO 8601 (normalize fractional seconds to max 3 digits)
  const isoMatch = s.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+\-]\d{2}:\d{2})?$/
  );
  if (isoMatch) {
    const prefix = isoMatch[1];
    const frac = (isoMatch[2] ?? '').slice(0, 4); // keep up to .xxx (3) — include dot
    const tz = isoMatch[3] ?? '';
    const normalized = prefix + frac + tz;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2) dd/MM/yyyy or MM/dd/yyyy with optional time (HH:mm[:ss])
  const slash = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (slash) {
    let [ , a, b, y, hh, mm, ss ] = slash;
    const A = Number(a), B = Number(b), Y = Number(y);
    // Decide if it's DMY or MDY:
    // If A>12 -> DMY (A=day). If B>12 -> MDY (A=month). If both <=12 -> prefer DMY.
    let day: number, month: number;
    if (A > 12) { day = A; month = B; }
    else if (B > 12) { day = B; month = A; }
    else { day = A; month = B; } // default DMY (India)
    const H = Number(hh ?? '0');
    const M = Number(mm ?? '0');
    const S = Number(ss ?? '0');
    const d = new Date(Y, month - 1, day, H, M, S);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3) "dd MMM yyyy, hh:mm a" (e.g., 07 Aug 2025, 06:44 PM)
  const mmmm = s.match(
    /^(\d{1,2})\s([A-Za-z]{3,})\s(\d{4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?)?$/
  );
  if (mmmm) {
    let [, dStr, monStr, yStr, hStr, minStr, ampm] = mmmm;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    let month = months.findIndex(m => monStr.toLowerCase().startsWith(m));
    if (month < 0) return null;
    let H = Number(hStr ?? '0');
    const Mi = Number(minStr ?? '0');
    if (ampm) {
      const isPM = ampm.toLowerCase() === 'pm';
      if (isPM && H < 12) H += 12;
      if (!isPM && H === 12) H = 0;
    }
    const d = new Date(Number(yStr), month, Number(dStr), H, Mi);
    return isNaN(d.getTime()) ? null : d;
  }

  // 4) Last resort: let JS try
  const d = new Date(s.replace(/\//g, '-')); // mild normalization
  return isNaN(d.getTime()) ? null : d;
}


  public getHtmlWithLineBreaks(value: string): SafeHtml {
    const formatted = value ? value.replace(/\n/g, '<br>') : '';
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  public downloadTestCaseTemplate(header: string[], excelName: string): void {
    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet([header]);
    const defaultColWidth = 18;
    ws['!cols'] = header.map(h => ({
      wch: Math.max(h.length + 8, defaultColWidth)
    }));

    for (let col = 0; col < header.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
        font: { bold: true }
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'TestCases');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), excelName);
  }

  async parseTestCaseExcel(file: File, formFieldObject: any): Promise<{ data: any[] }> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
  let excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  // Only keep first 6 columns for all rows
  excelRows = excelRows.map(row => Array.isArray(row) ? row.slice(0, 6) : row);
    const expectedHeaders = ['Test Case Title', 'Description', 'Pre - Conditions', 'Test Steps', 'Expected Results', 'Comments'];
    const firstRow = excelRows && excelRows.length > 0 ? excelRows[0] : [];
    const normalize = (arr: any[]) => arr.map((v: any) => (typeof v === 'string' ? v.trim() : v));
    const normalizedFirstRow = normalize(firstRow as any[]);
    const normalizedExpected = normalize(expectedHeaders as any[]);
    const headersMatch = normalizedExpected.length === normalizedFirstRow.length && normalizedExpected.every((h, i) => h === normalizedFirstRow[i]);
    if (!headersMatch) {
      const shortMsg = `Link - Invalid Excel headers - (${normalizedExpected.join(', ')})`;
      try {
        this.common.changeIsFailureeMessage(true);
          this.common.changeResponseMessage("There are invalid headers in the Excel file.");
      } catch (err) {
        console.error('Failed to show toaster:', err);
      }
      let cellDetails = '';
      if (normalizedFirstRow.length !== normalizedExpected.length) {
        // Show the extra/missing cell index (Excel columns are A, B, C...)
        const colIndex = normalizedFirstRow.length > normalizedExpected.length ? normalizedExpected.length : normalizedFirstRow.length;
        const colLetter = String.fromCharCode(65 + colIndex); // 65 = 'A'
        cellDetails = `Header column mismatch at cell ${colLetter}1.`;
      } else {
        // Find the first mismatched header
        for (let i = 0; i < normalizedExpected.length; i++) {
          if (normalizedExpected[i] !== normalizedFirstRow[i]) {
            const colLetter = String.fromCharCode(65 + i);
            cellDetails = `Header mismatch at cell ${colLetter}1: expected '${normalizedExpected[i]}', found '${normalizedFirstRow[i]}'`;
            break;
          }
        }
      }
      const actualMsg = `Actual headers - (${normalizedFirstRow.join(', ')})`;
      throw new Error(`${shortMsg}\n${actualMsg}\n${cellDetails}`);
    }
    // Re-parse sheet to objects, but only map first 6 columns
    const excelObjects: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
    const data = excelObjects.slice(1).map(row => {
      const mappedRow: any = {};
      // Only map first 6 columns
      const labels = ['Test Case Title', 'Description', 'Pre - Conditions', 'Test Steps', 'Expected Results', 'Comments'];
      labels.forEach((label, idx) => {
        // Find the form field for this label
        const field = Object.values(formFieldObject).find((f: any) => f.Label === label);
        if (field && (field as any).FormField !== 'TestCaseID') {
          mappedRow[(field as any).FormField] = row[idx] ?? '';
        }
      });
      return mappedRow;
    });
    return { data };
  }

  // Flow Diagram Zoom, Rotate, and Drag Logics
  public zoomLevels: number[] = [];
  public rotationAngles: number[] = [];
  public translatePositions: { x: number; y: number }[] = [];
  public dragging: boolean[] = [];
  public dragStart: { x: number; y: number }[] = [];
  public dragOrigin: { x: number; y: number }[] = [];
  public flowdiagram: any;
  // Store global drag handlers for cleanup
  private _moveHandler: ((e: MouseEvent) => void) | null = null;
  private _upHandler: ((e: MouseEvent) => void) | null = null;

  public initializeFlowDiagram(diagrams: any[]) {
    this.flowdiagram = diagrams;
    // Initialize all image states
    if (diagrams && diagrams.length > 0) {
      for (let i = 0; i < diagrams.length; i++) {
        this.initializeImageState(i);
      }
    }
  }

  public zoomIn(index: number) {
    this.initializeImageState(index);
    const currentZoom = this.zoomLevels[index];
    const newZoom = Math.min(3, currentZoom + 0.1);
    if (newZoom !== currentZoom) {
      const scaleFactor = newZoom / currentZoom;
      const currentTx = this.translatePositions[index].x;
      const currentTy = this.translatePositions[index].y;
      this.translatePositions[index] = { x: currentTx * scaleFactor, y: currentTy * scaleFactor };
      this.zoomLevels[index] = newZoom;
    }
  }

  public zoomOut(index: number) {
    this.initializeImageState(index);
    const currentZoom = this.zoomLevels[index];
    const newZoom = Math.max(0.5, currentZoom - 0.1);
    if (newZoom !== currentZoom) {
      const scaleFactor = newZoom / currentZoom;
      const currentTx = this.translatePositions[index].x;
      const currentTy = this.translatePositions[index].y;
      this.translatePositions[index] = { x: currentTx * scaleFactor, y: currentTy * scaleFactor };
      this.zoomLevels[index] = newZoom;
    }
  }

  private initializeImageState(index: number) {
    if (this.zoomLevels[index] === undefined) {
      this.zoomLevels[index] = 1;
    }
    if (this.rotationAngles[index] === undefined) {
      this.rotationAngles[index] = 0;
    }
    if (this.translatePositions[index] === undefined) {
      this.translatePositions[index] = { x: 0, y: 0 };
    }
    if (this.dragging[index] === undefined) {
      this.dragging[index] = false;
    }
    if (this.dragStart[index] === undefined) {
      this.dragStart[index] = { x: 0, y: 0 };
    }
    if (this.dragOrigin[index] === undefined) {
      this.dragOrigin[index] = { x: 0, y: 0 };
    }
  }

  public rotateLeft(index: number) {
    this.initializeImageState(index);
    this.rotationAngles[index] = (this.rotationAngles[index] - 90) % 360;
  }

  public rotateRight(index: number) {
    this.initializeImageState(index);
    this.rotationAngles[index] = (this.rotationAngles[index] + 90) % 360;
  }

  public downloadImage(index: number) {
    const item = this.flowdiagram[index];
    if (item?.FilePath) {
      fetch(item.FilePath)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.FileName || 'image';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Download failed:', error);
        });
    }
  }

  public openImage(index: number) {
    const item = this.flowdiagram[index];
    if (item?.FilePath) {
      window.open(item.FilePath, '_blank');
    }
  }

  public onWheel(event: WheelEvent, index: number) {
    try {
      event.preventDefault();
      this.initializeImageState(index);
      const container = (event.currentTarget as HTMLElement);
      if (container) {
        container.style.cursor = 'zoom-in';
        setTimeout(() => {
          if (!this.dragging[index]) {
            container.style.cursor = '';
          }
        }, 500);
      }
      const img = container.querySelector('.zoomable-image') as HTMLImageElement;
      if (!img) return;
      const containerRect = container.getBoundingClientRect();
      const mouseX = event.clientX - containerRect.left;
      const mouseY = event.clientY - containerRect.top;
      const currentZoom = this.zoomLevels[index];
      const currentTx = this.translatePositions[index].x;
      const currentTy = this.translatePositions[index].y;
      const delta = Math.sign(event.deltaY);
      const zoomStep = 0.1;
      let newZoom = currentZoom;
      if (delta > 0) {
        newZoom = Math.max(0.5, currentZoom - zoomStep);
      } else {
        newZoom = Math.min(3, currentZoom + zoomStep);
      }
      if (newZoom !== currentZoom) {
        const imgRect = img.getBoundingClientRect();
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        const mouseRelativeX = mouseX - containerCenterX;
        const mouseRelativeY = mouseY - containerCenterY;
        const scaleFactor = newZoom / currentZoom;
        const newTx = mouseRelativeX - (mouseRelativeX - currentTx) / scaleFactor;
        const newTy = mouseRelativeY - (mouseRelativeY - currentTy) / scaleFactor;
        this.zoomLevels[index] = newZoom;
        this.translatePositions[index] = { x: newTx, y: newTy };
      }
    } catch (err) {
      console.error('Zoom error:', err);
    }
  }

  public startDrag(event: MouseEvent, index: number) {
    // Prevent dragging on action buttons
    const target = event.target as HTMLElement;
    if (target.closest('.image-actions') || target.classList.contains('action-btn')) {
      return;
    }

    event.preventDefault();
    this.initializeImageState(index);
    
    if (!this.dragging[index]) {
      this.dragging[index] = true;
      this.dragStart[index] = { x: event.clientX, y: event.clientY };
      this.dragOrigin[index] = { x: this.translatePositions[index].x, y: this.translatePositions[index].y };
      
      const wrapper = this.getImageWrapper(target);
      if (wrapper) {
        wrapper.classList.add('dragging');
        wrapper.style.cursor = 'grabbing';
        wrapper.style.userSelect = 'none';
      }

      // Clean up any existing handlers first
      this.cleanupGlobalHandlers();
      
      // Add global listeners for smoother drag experience
      this._moveHandler = (e: MouseEvent) => {
        e.preventDefault();
        this.onDrag(e, index);
      };
      
      this._upHandler = (e: MouseEvent) => {
        this.endDrag(e, index);
      };
      
      document.addEventListener('mousemove', this._moveHandler, { passive: false });
      document.addEventListener('mouseup', this._upHandler);
      document.addEventListener('mouseleave', this._upHandler);
    }
  }

  public resetImagePosition(index: number) {
    this.initializeImageState(index);
    
    // End any ongoing drag
    if (this.dragging[index]) {
      this.dragging[index] = false;
      this.cleanupGlobalHandlers();
    }
    
    // Reset all transformations
    this.translatePositions[index] = { x: 0, y: 0 };
    this.zoomLevels[index] = 1;
    this.rotationAngles[index] = 0;
  }

  public onDrag(event: MouseEvent, index: number) {
    if (this.dragging[index]) {
      event.preventDefault();
      
      // Calculate movement directly for immediate response
      const dx = event.clientX - this.dragStart[index].x;
      const dy = event.clientY - this.dragStart[index].y;
      
      this.translatePositions[index] = {
        x: this.dragOrigin[index].x + dx,
        y: this.dragOrigin[index].y + dy
      };
    }
  }

  public endDrag(event: MouseEvent, index: number) {
    if (this.dragging[index]) {
      this.dragging[index] = false;
      
      // Clean up global handlers
      this.cleanupGlobalHandlers();
      
      // Reset visual states
      const target = event.target as HTMLElement;
      const wrapper = this.getImageWrapper(target) || target.closest('.image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.classList.remove('dragging');
        wrapper.style.cursor = 'grab';
        wrapper.style.userSelect = '';
      }
    }
  }

  private cleanupGlobalHandlers() {
    if (this._moveHandler) {
      document.removeEventListener('mousemove', this._moveHandler);
      this._moveHandler = null;
    }
    if (this._upHandler) {
      document.removeEventListener('mouseup', this._upHandler);
      document.removeEventListener('mouseleave', this._upHandler);
      this._upHandler = null;
    }
  }



  private getImageWrapper(target: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = target;
    while (el && !el.classList.contains('image-wrapper')) {
      el = el.parentElement;
    }
    return el;
  }

  public resetAllImagePositions(): void {
    if (this.flowdiagram && Array.isArray(this.flowdiagram)) {
      for (let i = 0; i < this.flowdiagram.length; i++) {
        this.initializeImageState(i);
        this.translatePositions[i] = { x: 0, y: 0 };
        this.zoomLevels[i] = 1;
        this.rotationAngles[i] = 0;
        this.dragging[i] = false;
        this.dragStart[i] = { x: 0, y: 0 };
        this.dragOrigin[i] = { x: 0, y: 0 };
      }
    }
  }

}