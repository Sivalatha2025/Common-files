import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appMultiImageReplace]'
})
export class ImageReplaceDirective {
  @Input() datasrc: string = ''; // Input to receive the image source URL
  @Input() ImageType: string = '/assets/images/default-image.jpg'; // Default image path

  constructor(private elRef: ElementRef, private renderer: Renderer2) {}

  @Input() set appMultiImageReplace(src: string) {
    this.datasrc = src;
    this.setImageSource();
  }

  private setImageSource() {
    if (this.datasrc) {
      this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.datasrc);
    } else {
      this.renderer.setAttribute(this.elRef.nativeElement, 'src', this.ImageType);
    }
  }

  @Input() set onErrorSrc(defaultImage: string) {
    this.ImageType = defaultImage;
  }

  @Input() set type(type: string) {
    this.renderer.setAttribute(this.elRef.nativeElement, 'type', type);
  }
}
