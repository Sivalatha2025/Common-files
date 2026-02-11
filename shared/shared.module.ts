import { NgModule } from '@angular/core';

import { StatefilterPipe } from './pipes/statefilter.pipe';
import { CityfilterPipe } from './pipes/cityfilter.pipe';

import { AutoCompleteFilterPipe } from './pipes/auto-complete-filter.pipe'; 
import { MultiAutoCompleteFilterPipe } from './pipes/multi-complete-filter.pipe';
import { ParentVarFilterPipe } from './pipes/parent-var-filter.pipe';
import { StoreFilterPipe } from './pipes/store-filter.pipe';
import { VariantShowPipe } from './pipes/variant-show.pipe';
// import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { TablePipe } from './pipes/table.pipe';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { NumberOnlyDirective } from './Directives/NumberOnly/number.directive';
import { ImageReplaceDirective } from './Directives/imagereplace/image-replace.directive';
import { PaginatorComponent } from './components/paginator/paginator.component';
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CoreModule } from '../core.module';
import { RouterModule } from '@angular/router';
import { CloseClickOutsideDirective } from './Directives/close-click-outside/close-click-outside.directive';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePipe } from '@angular/common';
import { ClickOutsideDirective } from './Directives/clickOutSide/click-outside.directive';
import { DateFormatDirective } from './Directives/NumberOnly/date-format.directive';
import { SingleZeroOnlyDirective } from './Directives/NumberOnly/remove-zero.directive';
import { ErrorInputFocusDirective } from './Directives/error-input-focus.directive';
import { SocialUrlPipe } from './pipes/social-url.pipe';
import { DecimalInputDirective } from './Directives/NumberOnly/decimal.directive';
import { CommentsComponent } from './components/comments/comments.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { SearchModulePipePipe } from './pipes/search-module-pipe.pipe';
import { EllipsisPipe } from './pipes/ellipsis.pipe';
import { SearchPipePipe } from './pipes/search-pipe.pipe';
import { InsuranceSearchPipePipe } from './pipes/insurance-search-pipe.pipe';
import { MaskingUnmaskingPipePipe } from './pipes/masking-unmasking-pipe.pipe';
import { MaskingUnmaskingDirective } from './Directives/NumberOnly/masking-unmasking.directive';
import { SingleZeroForProductDirective } from './Directives/NumberOnly/single-zero-for-product.directive';
import { UniqueSalaryTemplatePipe } from './pipes/unique-salary-template.pipe';
import { CustomTranslatePipe } from './pipes/custom-translate.pipe';
import { TranslateSafePipePipe } from './pipes/translate-safe-pipe.pipe';
import { UppercasePipe } from './pipes/uppercase.pipe';
import { SearchCardComponent } from './components/search-card/search-card.component';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { HeaderComponent } from '../components/header/header.component';
import { FormErrorPipe } from './pipes/form-error.pipe';
import { DynamicSearchCardComponent } from './components/dynamic-search-card/dynamic-search-card.component';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { StaticDynamicSectionDisplay } from './Directives/static-dynamic-section-display.directive';
import { LangauageFilterPipe } from './pipes/langauage-filter.pipe';
import { BackbuttonDirective } from './Directives/backbutton.directive';
import { TimePickerPopupComponent } from './components/time-picker-popup/time-picker-popup.component';
import { FooterComponent } from './components/footer/footer.component';
import { FaWizardsComponent } from './components/fa-wizards/fa-wizards.component';
import { VendorfilterPipe } from './pipes/vendorfilter.pipe';
import { VendorAddComponent } from '../components/vendor/vendor-add/vendor-add.component';
import { ImagePlaceholderDirective } from './Directives/profilePlaceHolder/profile-PlaceHolder.directive';
import { ExtendanedDynamicSearchCardComponent } from './components/extendaned-dynamic-search-card/extendaned-dynamic-search-card.component';
import { CommasforcurrencyPipe } from './pipes/commasforcurrency.pipe';
import { BsDateFormatDirective } from './Directives/NumberOnly/bs-date-format.directive';
import { FaceScannerComponent } from './components/face-scanner/face-scanner.component';
import { DateRangeCalanderPickerDirective } from './Directives/date-range-calander-picker.directive';
import { CurrencyPipe } from './pipes/currency.pipe';
import { AutoDisableDirective } from './Directives/disabledAutoDirective.directive';
import { ChildVarPipe } from './pipes/child-var.pipe';
import { ExcludeSelectedTaxPipe } from './pipes/exclude-selected-tax.pipe';
import { BsDateFormatDirectiveOpt } from './Directives/NumberOnly/bs-date-format-opt.directive';
import { ControlsPipe } from './pipes/controls.pipe';
import { EditableDateInputComponent } from './components/editable-date-input/editable-date-input.component';
import { EditableDatetimeInputComponent } from './components/editable-datetime-input/editable-datetime-input.component';


@NgModule({
  imports: [
  
    CoreModule,
    NgbModule,
    RouterModule,
    NgbTooltipModule,
    NgSelectModule,
    NgMultiSelectDropDownModule.forRoot(),
    AngularEditorModule
    
  ],
  declarations: [
    StatefilterPipe,
    CityfilterPipe,
    AutoCompleteFilterPipe,
    MultiAutoCompleteFilterPipe,
    ParentVarFilterPipe,
    StoreFilterPipe,
    VariantShowPipe,
    TablePipe,
    NumberOnlyDirective,
    ImageReplaceDirective,
    PaginatorComponent,
    SidebarComponent,
    CloseClickOutsideDirective,
    ClickOutsideDirective,
    DateFormatDirective,
    SingleZeroOnlyDirective,
    ErrorInputFocusDirective,
    SocialUrlPipe,
    DecimalInputDirective,
    CommentsComponent,
    SafeHtmlPipe,
    SearchModulePipePipe,
    EllipsisPipe,
    SearchPipePipe,
    InsuranceSearchPipePipe,
    MaskingUnmaskingPipePipe,
    MaskingUnmaskingDirective,
    SingleZeroForProductDirective,
    UniqueSalaryTemplatePipe,
    CustomTranslatePipe,
    TranslateSafePipePipe,
    HeaderComponent,
    UppercasePipe,
    SearchCardComponent,
    FormErrorPipe,
    DynamicSearchCardComponent,
    StaticDynamicSectionDisplay,
    LangauageFilterPipe,
    BackbuttonDirective,
    TimePickerPopupComponent,
    FooterComponent,
    FaWizardsComponent,
    VendorfilterPipe,
    VendorAddComponent,
    ImagePlaceholderDirective,
    ExtendanedDynamicSearchCardComponent,
    CommasforcurrencyPipe,
    BsDateFormatDirective,
    FaceScannerComponent,
    DateRangeCalanderPickerDirective,
    CurrencyPipe,
    AutoDisableDirective,
    ChildVarPipe,
    ExcludeSelectedTaxPipe,
    BsDateFormatDirectiveOpt,
    ControlsPipe,
    EditableDateInputComponent,
    EditableDatetimeInputComponent
    ],
  exports : [
    StatefilterPipe,
    CityfilterPipe,
    ParentVarFilterPipe,
    AutoCompleteFilterPipe,
    StoreFilterPipe,
    VariantShowPipe,
    TablePipe,
    NumberOnlyDirective,
    ImageReplaceDirective,
    PaginatorComponent,
    CloseClickOutsideDirective,
    DatePipe,
    DateFormatDirective,
    SingleZeroOnlyDirective,
    ErrorInputFocusDirective,
    SocialUrlPipe,
    DecimalInputDirective,
    CommentsComponent,
    SafeHtmlPipe,
    SearchModulePipePipe,
    EllipsisPipe,
    SearchPipePipe,
    InsuranceSearchPipePipe,
    MaskingUnmaskingPipePipe,
    MaskingUnmaskingDirective,
    SingleZeroForProductDirective,
    NgbTooltipModule,
    UniqueSalaryTemplatePipe,
    CustomTranslatePipe,
    TranslateSafePipePipe,
    NgMultiSelectDropDownModule,
    NgSelectModule,
    SidebarComponent,
    HeaderComponent,
    UppercasePipe,
    SearchCardComponent,
    FormErrorPipe,
    DynamicSearchCardComponent,
    AngularEditorModule,
    StaticDynamicSectionDisplay,
    LangauageFilterPipe,
    BackbuttonDirective,
    TimePickerPopupComponent,
    FooterComponent,
    FaWizardsComponent,
    VendorfilterPipe,
    VendorAddComponent,
    ImagePlaceholderDirective,
    ExtendanedDynamicSearchCardComponent, 
    CommasforcurrencyPipe,
    BsDateFormatDirective,
    FaceScannerComponent,
    DateRangeCalanderPickerDirective,
    CurrencyPipe,
    AutoDisableDirective,
    ChildVarPipe,
    ExcludeSelectedTaxPipe,
    BsDateFormatDirectiveOpt,
    ControlsPipe,
    EditableDateInputComponent,
    EditableDatetimeInputComponent
  ],
  providers : [  
    DatePipe,
    CustomTranslatePipe,
    UppercasePipe,
    TablePipe,
    FormErrorPipe,
    LangauageFilterPipe,
    VendorfilterPipe,
    CommasforcurrencyPipe,
    ChildVarPipe,
    ExcludeSelectedTaxPipe
  ]
})
export class SharedModule { }
