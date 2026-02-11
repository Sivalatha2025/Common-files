import { Directive, ElementRef, Input, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[appImagePlaceholder]',
})
export class ImagePlaceholderDirective {
  @Input() name: string = ''; // Name for generating initials
  @Input() placeholder: string = './assets/images/member.svg'; // Default fallback image

  private brokenImages = new Set<string>(); // Track broken image URLs

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  /**
   * Listen to the error event on the image element
   */
  @HostListener('error', ['$event'])
  onError(event: Event): void {
    
    const imgElement = this.el.nativeElement as HTMLImageElement;

    // Track the broken image URL
    if (imgElement?.currentSrc) {
      this.brokenImages.add(imgElement.currentSrc);
    }

    // Replace the image with initials
    this.setInitialsFallback();
  }

  /**
   * Replace the image with initials styled according to the provided CSS
   */
  private setInitialsFallback(): void {
    try {

    const parent = this.el.nativeElement.parentElement;
    
    // Create initials container
    const initialsDiv = this.renderer.createElement('div');
    this.renderer.addClass(initialsDiv, 'proj-leader-initials');
    this.renderer.addClass(initialsDiv, 'font-medium');
    this.renderer.setStyle(initialsDiv, 'backgroundColor', '#f0f0f0'); // Default background
    this.renderer.setStyle(initialsDiv, 'color', this.generateColor(this.name)); // Unique color
    this.renderer.setProperty(initialsDiv, 'textContent', this.getInitials(this.name));
    this.renderer.setAttribute(initialsDiv, 'title', this.name);

    // Replace the image with the initials container
    this.renderer.removeChild(parent, this.el.nativeElement);
    this.renderer.appendChild(parent, initialsDiv);
          
  } catch (error) {
      
  }
  }

  /**
   * Generate initials from the name
   */
  private getInitials(name: string): string {
    if (!name) return '';
    const nameParts = name.trim().split(' ');
    const firstNameInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
    const lastNameInitial = nameParts.length > 1 ? nameParts[1]?.charAt(0).toUpperCase() : '';
    return firstNameInitial + lastNameInitial;
  }

  /**
   * Generate a unique color based on the name
   */
  private generateColor(value: string): string {
    if (!value) return '#000000'; // Default to black
    const hash = this.hashString(value);
    const hue = hash % 360; // Generate a hue between 0 and 360
    return `hsl(${hue}, 70%, 50%)`; // Return an HSL color
  }

  /**
   * Hash a string to produce a consistent numeric value
   */
  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash); // Bitwise hash
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
