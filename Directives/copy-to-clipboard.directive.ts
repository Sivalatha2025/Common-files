import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appCopyToClipboard]'
})
export class CopyToClipboardDirective implements OnDestroy {

  @Input() copyTargetSelector = 'pre';

  private removeOutsideClickListener?: () => void;
  private resetTextTimer?: number;
  private originalButtonText = '';

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('click')
  async onClick() {
    const hostElement = this.el.nativeElement;

    const contentElement = hostElement
      .parentElement
      ?.parentElement
      ?.querySelector(this.copyTargetSelector) as HTMLElement | null;

    if (!contentElement) {
      return;
    }

    try {
      // Save original button text ONCE
      if (!this.originalButtonText) {
        this.originalButtonText = hostElement.innerText;
      }

      // COPY
      await navigator.clipboard.writeText(contentElement.innerText);

      // HIGHLIGHT
      this.selectContent(contentElement);

      // Button feedback (SAFE for multiple clicks)
      hostElement.innerText = 'Copied';

      // Clear old timer before starting new one
      if (this.resetTextTimer) {
        clearTimeout(this.resetTextTimer);
      }

      this.resetTextTimer = window.setTimeout(() => {
        hostElement.innerText = this.originalButtonText;
        this.resetTextTimer = undefined;
      }, 1500);

      // Remove highlight only on outside click
      this.addOutsideClickListener();

    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  private selectContent(element: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private addOutsideClickListener() {
    this.removeOutsideClickListener?.();

    const handler = (event: MouseEvent) => {
      if (!this.el.nativeElement.contains(event.target as Node)) {
        window.getSelection()?.removeAllRanges();

        document.removeEventListener('click', handler, true);
        this.removeOutsideClickListener = undefined;
      }
    };

    document.addEventListener('click', handler, true);

    this.removeOutsideClickListener = () => {
      document.removeEventListener('click', handler, true);
    };
  }

  ngOnDestroy() {
    this.removeOutsideClickListener?.();
    if (this.resetTextTimer) {
      clearTimeout(this.resetTextTimer);
    }
  }
}
