import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appExpandCollapseAll]'
})
export class ExpandCollapseAllDirective {

  /**
   * Section/container ID
   * example: mandatoryErrors | invalidErrorFields | Success
   */
  @Input('appExpandCollapseAll') containerId!: string;

  /**
   * expand | collapse
   */
  @Input() action!: 'expand' | 'collapse';

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('click')
  handleClick() {
    if (!this.containerId || !this.action) {
      return;
    }

    const container = document.getElementById(this.containerId);
    if (!container) {
      return;
    }

    const expand = this.action === 'expand';

    // Show / hide blocks
    container
      .querySelectorAll<HTMLElement>('[id^="t_block_"]')
      .forEach(el => el.style.display = expand ? 'block' : 'none');

    // Toggle plus icons
    container
      .querySelectorAll<HTMLElement>('[id^="t_plus_"]')
      .forEach(el => el.style.display = expand ? 'none' : 'inline');

    // Toggle minus icons
    container
      .querySelectorAll<HTMLElement>('[id^="t_minus_"]')
      .forEach(el => el.style.display = expand ? 'inline' : 'none');
  }
}
