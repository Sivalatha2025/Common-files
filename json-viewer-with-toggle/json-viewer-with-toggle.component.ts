import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-json-viewer-with-toggle',
  templateUrl: './json-viewer-with-toggle.component.html',
  styleUrls: ['./json-viewer-with-toggle.component.css']
})
export class JsonViewerWithToggleComponent implements OnInit {

  @Input()data:any;
  @Input() parentKey: string='';
  @Input() id: string='';

  constructor() { }

  ngOnInit(): void {
  }

  isArrayIndex(key: any): boolean {
    return !isNaN(parseInt(key, 10));
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }


  toggleSection(sectionId: string) {
    // Use type assertions to tell TypeScript about the HTML elements
    let block = document.getElementById('t_block_' + sectionId) as HTMLElement;
    let plus = document.getElementById('t_plus_' + sectionId) as HTMLElement;
    let minus = document.getElementById('t_minus_' + sectionId) as HTMLElement;

    if (block && plus && minus) {
      let shouldExpand = block.style.display === 'none' || block.style.display === '';

      // Toggle visibility of the current section
      block.style.display = shouldExpand ? 'block' : 'none';
      plus.style.display = shouldExpand ? 'none' : 'inline';
      minus.style.display = shouldExpand ? 'inline' : 'none';

      // Collapse all child sections if the current section is being collapsed
      if (!shouldExpand) {
        let childSections = block.querySelectorAll('[id^="t_block_"]');
        childSections.forEach((childSection) => {
          const childBlock = childSection as HTMLElement;
          const childId = childBlock.id.split('t_block_')[1];
          this.collapseSection(childId);
        });
      }
    }
  }

  collapseSection(sectionId: string): void {
    let block = document.getElementById('t_block_' + sectionId) as HTMLElement;
    let plus = document.getElementById('t_plus_' + sectionId) as HTMLElement;
    let minus = document.getElementById('t_minus_' + sectionId) as HTMLElement;

    if (block && plus && minus) {
      // Hide the content block and reset icons
      block.style.display = 'none';
      plus.style.display = 'inline';
      minus.style.display = 'none';
    }
  }
}
