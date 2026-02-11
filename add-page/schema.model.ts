export interface JsonFormValidators {
    

}

export  interface JsonFormControls {
  FormField: string;
  Label: string;
  Type: string;
  Required?: boolean;
  MasterModuleCode?: string; 
  MasterReportURL? : string;
  MasterAPIUrl? : string; 
  Placeholder: string
  Pattern1?: any;
  Pattern2?: any;
  Pattern3?: any;
  MinLength?: boolean;
  MaxLength?: boolean;
  MinRange?: number;
  MaxRange?: number;
  RequiredErrorMessage?: string;
  RangeErrorMessage?: string;
  LengthErrorMessage?: string;
  Pattern1ErrorMessage?: string;
  Pattern2ErrorMessage?: string;
  Pattern3ErrorMessage?: string;
  FileSize? : string;
  Maxlength?:number;
  PlaceHolder?:any;
  DateFormat? : any
  IsNonEditable?:any;
  oldDateFormat? : any
  ArrayListName?:any;
  ShowByParentField? : string | null;
  ParentFieldName? : string;
  AllowedFileTypes?: string | null;
  allowedComments : string;
  MaxLengthEntered : any;
  LabelTooltip:string;
  SectionName?: string;
  ShowFieldInUI?:boolean;
  DisableFutureDate ?:any;
  width?:string;
  height?:string;
  IsHideFieldInUI?:boolean;
  ElementWidth?:string;
  IsAllowPastDates?:boolean;
  IsAllowFutureDates?:boolean,
  DSControlTypeConfigurationId ?: string;
  SourceColumnName ?: string;
  ConditionalOperatorId ?: string;
}
export interface JsonFormData {
  Controls: JsonFormControls[];
  GetBySearchURL?: string;
  GetByIdURL?: string;
  SaveAPIURL?: string;
  TemplateName? :string,
  ParentTemplateName?:string
  AllTabs?:{TemplateName? : string, JsonURL?: string, TemplateCode ?: string}[]
}

export enum DSControlTypeConfigurationGuid {
  AllowPastDateOnly = 'CF8BE0A5-92C9-4EF3-B71C-F59C7D7DC405',
  AllowFutureDateOnly = '43B1AF48-D5BB-422F-AC22-DF8C79A4F682',
  AllowCurrentDate = '8C98601C-0926-4B99-8B16-9632B0991BC8',
  Others = '1C61E24D-65F8-43F6-8103-04D14C7C5814',

  AllowPastDateTimeOnly = '56DC2087-7FC4-4586-A5A6-4CAE20167C97',
  AllowFutureDateTimeOnly = '1D90506F-5BBF-46B5-B45E-3A8A1E097EE2',
  OthersDateTime = '56EF95FB-956B-4230-85F9-2C5AF8B8F65C',
  AllowCurrentDateTimeOnly = 'EF706C51-555C-408D-B860-B97471401F5C'
}