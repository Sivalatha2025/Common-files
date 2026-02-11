import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCropComponent } from './image-crop.component';
import { ImageCropperModule } from 'ngx-image-cropper';
import { CoreModule } from 'src/app/core.module';



@NgModule({
  declarations: [
    ImageCropComponent
  ],
  imports: [
    CommonModule,
    CoreModule,
    ImageCropperModule
  ],
  exports:[
    ImageCropComponent
  ]
})
export class ImageCropModule { }
