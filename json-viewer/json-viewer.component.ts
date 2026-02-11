import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-json-viewer',
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.css']
})
export class JsonViewerComponent implements OnInit {

  @Input() data: any;
  constructor() { }

  ngOnInit(): void {
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  isArrayIndex(key: any): boolean {
    return !isNaN(parseInt(key, 10));
  }
}
