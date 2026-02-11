// bs-date-format.directive.ts
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import { BsDatepickerConfig, BsDatepickerDirective } from 'ngx-bootstrap/datepicker';
import { Subscription } from 'rxjs';
import { DSControlTypeConfigurationGuid } from 'src/app/components/add-page/schema.model';

declare const changeDate: any; // if you're using this global

export type DateOutputFormat = {
  date: Date;
  formatted: string;
  id: string;
  index: number;
  listName: string;
};

@Directive({
  selector: '[appBsDateFormatOpt]',
  exportAs: 'appBsDateFormatOpt',
  hostDirectives: [BsDatepickerDirective],
  providers: [DatePipe]
})
export class BsDateFormatDirectiveOpt implements AfterViewInit, OnChanges, OnDestroy {
  // host the ngx-bootstrap datepicker directive
  private bs = inject(BsDatepickerDirective);
  private elRef = inject(ElementRef);
  @Input() isFromList: boolean = false;
  @Input() isDependentField: boolean = false;
  // ===== Existing usage fields (keep names as you already use them) =====
  @Input('format') _format = 'dd/MM/yyyy';
  @Input() fieldName: string = '';
  @Input() index: number = -1;
  @Input() listName: string = '';
  @Input() isTime: boolean = false; // keep for compatibility
  @Input() isPastDate:boolean = false
  @Input() isGloblarTimeEmitRequired:boolean = true;

  // Your existing change event shape
  @Output() dateChange = new EventEmitter<DateOutputFormat>();

  // ===== New UX controls =====
  /** Keep the picker open after a date click (so user can adjust time, etc.) */
  @Input() keepOpenUntilSubmit = true;

  /** Close picker when clicking outside */
  @Input() closeOnOutside = true;

  /** Show a Submit/Done button INSIDE the datepicker popup */
  @Input() showSubmitInPicker = true;

  /** Submit button label and classes */
  @Input() submitLabel = 'Done';
  @Input() submitBtnClass = 'btn btn-primary datepicker-btn-grp-submit btn-sm w-100';

  /** Optional: fire when Submit is clicked */
  @Output() dateSubmit = new EventEmitter<{ date: Date; formatted: string }>();

  // ===== Validation / limits =====
  /** Allow clearing the value (adds a Clear button in footer when true) */
  @Input() isAllowClear: boolean = true;

  /** Minimum and maximum selectable dates */
  @Input() minDate?: Date | null;
  @Input() maxDate?: Date | null;
  @Input() ControlTypeConfigurationId  : string | undefined;
  @Input() DSControlTypeConfigurationGuid : any;
  // DSControlTypeConfigurationGuid = DSControlTypeConfigurationGuid;

  // ===== Internal =====
  private subs: Subscription[] = [];
  private manualClose = false;
  private outsideClose = false;

  private footerHost?: HTMLElement;
  private submitBtn?: HTMLButtonElement;
  private clearBtn?: HTMLButtonElement;
  dependentValue:any = '';

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private datePipe: DatePipe,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  // Convenience getter (if you want to *ngIf on it somewhere)
  get isPickerOpen(): boolean {
    return !!this.doc.querySelector('.bs-datepicker-container');
  }

  // Programmatic open/close
  open()  { this.bs.show(); }
  close() { this.confirm(); }

  ngAfterViewInit(): void {
    const input = this.el.nativeElement;
    input.readOnly = true;
    input.autocomplete = 'off';

    if (this.format?.toLowerCase() == 'd/m/y') {
      this._format = this.normalizeFormat(this.format);
    } else if (this.format?.toLowerCase() == 'd/m/y h:i:s') {
      this._format = this.normalizeFormat(this.format, this.isTime);
    } else if (this.format?.toLowerCase() == 'd/m/y h:i') {
      this._format = this.normalizeFormat(this.format, this.isTime);
    }

    // Apply initial min/max to the hosted directive
    this.applyMinMax();
    // Initialize input display if a value is present
    const initial = this.tryParse((input.value || '').trim()) || this.bs.bsValue;
    if (initial) {
      const clamped = this.clampToRange(initial);
      this.bs.bsValue = clamped;
      input.value = this.datePipe.transform(clamped, this.format) || '';
    }

    // Reflect selection into input and keep open if requested
    this.subs.push(
      this.bs.bsValueChange.subscribe((picked: Date | null) => {
        if (!picked) {
          const input = this.el.nativeElement;
          input.value = '';
          this.dateChange.emit({
            date: null as any,
            formatted: '',
            id: this.fieldName,
            index: this.index,
            listName: this.listName
          });
          return;
        }
        // If selection falls outside range, ignore it (or clamp)
        if (!this.isWithinRange(picked)) {
          // optional: you could clamp instead of ignore
          // const fixed = this.clampToRange(picked);
          // this.bs.bsValue = fixed;
          // input.value = this.datePipe.transform(fixed, this.format) || '';
          return;
        }
        if(this.format == 'dd/MM/YYYY HH:mm:ss'){
          picked.setSeconds(0)
        }

        let formatted = this.datePipe.transform(picked, this.format) || '';
        formatted = this.datePipe.transform(picked, this.format) || '';
        
        input.value = formatted;

        // Emit your standard change event on each pick
        if (picked) {
          this.dateChange.emit({
            date: picked,
            formatted,
            id: this.fieldName,
            index: this.index,
            listName: this.listName
          });
        }
        if (typeof changeDate === 'function' && this.isGloblarTimeEmitRequired) {
          changeDate(
            formatted,
            this.fieldName,
            picked,
            this.index,
            this.listName
          );
        }

        // Neutralize auto-hide (immediately re-show) so user can set time
        if (this.keepOpenUntilSubmit) {
          queueMicrotask(() => {
            if (!this.manualClose && !this.outsideClose) this.bs.show();
          });
        }
      })
    );

    // When shown → inject footer and set outside-click
    if (this.bs.onShown) {
      this.subs.push(
        this.bs.onShown.subscribe(() => {
          this.injectFooter(); // handles showSubmitInPicker & isAllowClear
          if (this.closeOnOutside) {
            this.doc.addEventListener('mousedown', this.onDocClick, true);
          }
        })
      );
    }

    // When hidden → maybe reopen (for keep-open) + cleanup
    if (this.bs.onHidden) {
      this.subs.push(
        this.bs.onHidden.subscribe(() => {
          if (this.keepOpenUntilSubmit && !this.manualClose && !this.outsideClose) {
            queueMicrotask(() => this.bs.show());
          }
          this.removeFooter();
          this.doc.removeEventListener('mousedown', this.onDocClick, true);
          this.outsideClose = false;
        })
      );
    }
    this.applyConfig();
  }

  getFormattedDate(val:any):Date{
    const str = val;

    // Split date and time
    const [datePart, timePart] = str.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create a Date object (Note: month is 0-indexed)
    const dateObj = new Date(year, month - 1, day, hours, minutes);
    return dateObj
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to minDate/maxDate changes at runtime
    if ('minDate' in changes || 'maxDate' in changes) {
      this.applyMinMax();

      // If current value violates the new bounds, clear or clamp
      const current = this.bs.bsValue;
      if (current && !this.isWithinRange(current)) {
        // Choose policy: clear or clamp. Here we **clear** to avoid silent data shift
        this.clearValue();
      }
    }
    this.applyConfig();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    try { this.bs.hide(); } catch {}
    this.doc.removeEventListener('mousedown', this.onDocClick, true);
    this.removeFooter();
  }

  // ========= Submit / Clear =========

  /** Called when the in-popup Submit button is clicked */
  confirm(): void {
    const picked: Date | null = this.bs.bsValue || null;
    // If no value, just close
    if (!picked) {
      this.manualClose = true;
      this.bs.hide();
      setTimeout(() => (this.manualClose = false), 0);
      return;
    }
    // Enforce range once more
    if (!this.isWithinRange(picked)) {
      // reject close or clamp; here we reject and keep open
      return;
    }
    if(this.format == 'dd/MM/YYYY HH:mm:ss'){
      picked.setSeconds(0)
    }
    const formatted = this.datePipe.transform(picked, this.format) || '';
    // Emit optional submit event
    this.dateSubmit.emit({ date: picked, formatted });

    // Also emit your standard change in case listeners depend on the "final" value
    this.dateChange.emit({
      date: picked,
      formatted,
      id: this.fieldName,
      index: this.index,
      listName: this.listName
    });

    if (typeof changeDate === 'function' && this.isGloblarTimeEmitRequired) {
      changeDate(
        formatted,
        this.fieldName,
        picked,
        this.index,
        this.listName
      );
    }

    this.manualClose = true;
    this.bs.hide();
    setTimeout(() => (this.manualClose = false), 0);
  }

  /** Clear value (button in footer when isAllowClear=true) */
  private clearValue(): void {
    this.bs.bsValue = null as any;
    const input = this.el.nativeElement;
    input.value = '';
    // You can also emit a null-ish change if your app expects it
    // (keep as-is if you only want clearing the UI)
  }

  // ========= DOM helpers =========

  /** Outside click: close if click target is neither input nor picker */
  private onDocClick = (evt: MouseEvent) => {
    if (!this.keepOpenUntilSubmit || !this.closeOnOutside) return;

    const inputEl = this.el.nativeElement as HTMLElement;
    const pickerRoot =
      (this.doc.querySelector('bs-datepicker-container') as HTMLElement) ||
      (this.doc.querySelector('.bs-datepicker-container') as HTMLElement);

    const t = evt.target as Node;
    const insideInput = inputEl?.contains(t);
    const insidePicker = pickerRoot ? pickerRoot.contains(t) : false;

    if (!insideInput && !insidePicker) {
      this.outsideClose = true;
      this.bs.hide();
    }
  };

  /** Inject a footer inside the popup (Submit + Clear if enabled) */
  private injectFooter(): void {
    // Respect flags: if neither button is needed, skip
    if (!this.showSubmitInPicker && !this.isAllowClear) return;

    const container =
      this.doc.querySelector('bs-datepicker-container .bs-datepicker') ||
      this.doc.querySelector('.bs-datepicker-container .bs-datepicker') ||
      this.doc.querySelector('.bs-datepicker-container');

    if (!container || this.footerHost) return;

    // Host footer
    const host = this.doc.createElement('div');
    host.className = 'bs-dp-footer d-grid';
    host.style.display = 'grid';
    host.style.gap = '8px';
    host.style.gridTemplateColumns = this.isAllowClear && this.showSubmitInPicker ? '1fr 1fr' : '1fr';
    host.style.padding = '8px';
    host.style.borderTop = '1px solid rgba(0,0,0,.1)';

    // Clear button (optional)
    if (this.isAllowClear) {
      const clr = this.doc.createElement('button');
      clr.type = 'button';
      clr.textContent = 'Clear';
      clr.className = 'btn btn-outline-dark datepicker-btn-grp-cancel btn-sm w-100';
      clr.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearValue();
        // keep it open after clear so user can pick again
        queueMicrotask(() => this.bs.show());
      });
      host.appendChild(clr);
      this.clearBtn = clr as HTMLButtonElement;
    }

    // Submit/Done button (optional)
    if (this.showSubmitInPicker) {
      const btn = this.doc.createElement('button');
      btn.type = 'button';
      btn.textContent = this.submitLabel;
      btn.className = this.submitBtnClass;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirm();
      });
      host.appendChild(btn);
      this.submitBtn = btn as HTMLButtonElement;
    }

    container.appendChild(host);
    this.footerHost = host as HTMLElement;
  }

  /** Remove injected footer (on hide/destroy) */
  private removeFooter(): void {
    if (this.submitBtn) {
      try { this.submitBtn.onclick = null; } catch {}
      this.submitBtn = undefined;
    }
    if (this.clearBtn) {
      try { this.clearBtn.onclick = null; } catch {}
      this.clearBtn = undefined;
    }
    if (this.footerHost?.parentElement) {
      this.footerHost.parentElement.removeChild(this.footerHost);
    }
    this.footerHost = undefined;
  }

  // ========= Min/Max helpers =========

  private applyMinMax(): void {
    // Most ngx-bootstrap versions accept minDate/maxDate directly on the directive
    if (this.minDate) this.bs.minDate = this.toStartOfDay(this.minDate);
    else this.bs.minDate = undefined as any;

    if (this.maxDate) this.bs.maxDate = this.toEndOfDay(this.maxDate);
    else this.bs.maxDate = undefined as any;
  }

  private isWithinRange(d: Date): boolean {
    const t = d?.getTime?.();
    if (!t && t !== 0) return false;
    if (this.minDate && t < this.toStartOfDay(this.minDate).getTime()) return false;
    if (this.maxDate && t > this.toEndOfDay(this.maxDate).getTime()) return false;
    return true;
    }

  private clampToRange(d: Date): Date {
    if (this.minDate && d < this.toStartOfDay(this.minDate)) return this.toStartOfDay(this.minDate);
    if (this.maxDate && d > this.toEndOfDay(this.maxDate)) return this.toEndOfDay(this.maxDate);
    return d;
  }

  private toStartOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private toEndOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  // ========= Utilities =========

  private tryParse(raw: string): Date | null {
    if (!raw) return null;
  
    // detect if format is dd/MM/yyyy or dd/MM/yyyy HH:mm:ss
    const [datePart, timePart] = raw.trim().split(' ');
    const [day, month, year] = datePart.split(/[\/\-]/).map(Number);
  
    if (!day || !month || !year) return null;
  
    let hours = 0, minutes = 0, seconds = 0;
    if (timePart) {
      const timeParts = timePart.split(':').map(Number);
      hours = timeParts[0] || 0;
      minutes = timeParts[1] || 0;
      seconds = timeParts[2] || 0;
    }
  
    const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  get format(): string {
    // If you eventually want a different output when isTime=true:
    // return this.isTime ? 'dd/MM/yyyy, HH:mm' : (this._format || 'dd/MM/yyyy');
    return this._format || 'dd/MM/yyyy';
  }
    // ---- helpers ----
  private applyConfig() {
    const cfg: Partial<BsDatepickerConfig> = {
      dateInputFormat: this.format,
      showWeekNumbers: false,
      isAnimated: false,
      adaptivePosition: true,
      selectFromOtherMonth: true,
      withTimepicker:this.isTime,
      customTodayClass: 'today-highlight'
    };
    const today = new Date();

    if (this.ControlTypeConfigurationId) {
      switch (this.ControlTypeConfigurationId) {
        case DSControlTypeConfigurationGuid.AllowPastDateOnly:
          // Allow only past dates → disable future
          cfg.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateOnly:
          // Allow only future dates → disable past
          cfg.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDate:
          // Allow only current date → disable both past & future
          cfg.minDate = today;
          cfg.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowPastDateTimeOnly:
          // Same as past date only, but for datetime
          cfg.maxDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowFutureDateTimeOnly:
          // Same as future date only, but for datetime
          cfg.minDate = today;
          break;

        case DSControlTypeConfigurationGuid.AllowCurrentDateTimeOnly:
          // Only current datetime allowed
          cfg.minDate = today;
          cfg.maxDate = today;
          break;

        default:
          // Others → no restriction
          cfg.minDate = undefined;
          cfg.maxDate = undefined;
          break;
      }
    } else {

    if (this.isPastDate) {
      cfg.minDate = today;
    }else if (!this.isFromList && this.isPastDate && !this.isDependentField) {
    cfg.minDate = today;
  } 
  else if (this.isFromList && this.isPastDate && this.isDependentField) {
    cfg.maxDate = today;

    const inputDate = this.dependentValue ?? '';
    const parsedDate = this.parseDateDMY(inputDate);
    cfg.minDate = parsedDate ? parsedDate : today;
  }
  }
    this.bs.bsConfig = cfg;
}
private parseDateDMY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  return new Date(year, month, day, 12, 0, 0); // noon to avoid timezone issues
}

private normalizeFormat(format: string, isTime?: boolean): string {
  let normalized = format.toLowerCase();
  normalized = normalized.replace(/d{1,2}/g, 'dd');
  normalized = normalized.replace(/m{1,2}/g, 'MM');
  normalized = normalized.replace(/y{1,4}/g, 'yyyy');

  normalized = normalized.replace(/h{1,2}/g, 'HH');
  normalized = normalized.replace(/i/g, 'mm');
  normalized = normalized.replace(/s{1,2}/g, 'ss');
  return normalized;
}


}
