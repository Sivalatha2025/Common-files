
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ImageTransform, ImageCroppedEvent, Dimensions, ImageCropperComponent } from 'ngx-image-cropper';
import { Observable, ReplaySubject } from 'rxjs';
import { CommonService } from 'src/app/services/common/common.service';
import { StorageService } from 'src/app/storageService/storage-service';
const imgSize = 5;

@Component({
  selector: 'app-image-crop',
  templateUrl: './image-crop.component.html',
  styleUrls: ['./image-crop.component.css']
})
export class ImageCropComponent implements OnInit {

  
  title = 'my-image-cropper';
  // @ViewChild('myInput') myInputVariable!: ElementRef;
  // @ViewChild(ImageCropperComponent) imageCropper!: ImageCropperComponent;
  @Input() imageChangedEvent: any;
  @Input() fileName: any;
  @Input() itemImage: boolean = false;
  @Output() closeEvent = new EventEmitter()
  @Input() Images:any[]=[];
  @Input() isStorageRequired:boolean = true;
  croppedImage: any = '';
  canvasRotation = 0;
  rotation = 0;
  scale = 1;
  showCropper = false;
  containWithinAspectRatio = true;
  transform: ImageTransform = {};
  degrees : number = 0;
  zoomValue : number = 1;
  showSavedImage: boolean = false;
  imagesArray : any[] = []
  isModified : boolean = false;
  ImageExtensionError: boolean = false;
  filesizeError: boolean = false;
 constructor(
  private storage : StorageService, private common : CommonService){
   
  }

 ngOnInit(): void {
  

  // New flag to check if saving happened before opening
  const savedFlag = this.storage.getLocalStorage('ImageSavedFlag');

  if (!this.isStorageRequired) {

    // Load the last saved images (AGAIN, NOT from localStorage)
    if (this.Images && this.Images.length > 0) {
      this.imagesArray = [...this.Images];  // Direct assign without storage read
    }

    // Reset flag so this runs only once
    this.storage.setLocalStorage('ImageSavedFlag', 'false');
  }
  else {
    // Original logic
    if (this.itemImage) {
      let images = this.storage.getLocalStorage('ItemImages');
      if (images) {
        this.imagesArray = JSON.parse(images);
      }
    } else {
      let images = this.storage.getLocalStorage('Images');
      if (images) {
        this.imagesArray = JSON.parse(images);
      }
    }
  }
}



  imageCropped(event: ImageCroppedEvent) {  
    
    this.croppedImage = event.base64;

  }
  imageLoaded() {
    this.showCropper = true;
  }

 openDialog(){
  // this.dialog.open(ImageUploadComponent, { disableClose: true });
 }

  cropperReady(sourceImageDimensions: Dimensions) {
    // cropper ready
    // console.log('Cropper ready', sourceImageDimensions);
  }
  loadImageFailed() {
    // show message
    
  }

  // clear() {
  //   this.croppedImage = '';
  //   this.fileName = '';
  //   this.myInputVariable.nativeElement.value = '';
  //   this.imageChangedEvent = '';
  //   this.showCropper = false;
  //   this.resetImage();
  //   // this.showSavedImage = false

  // }

  crop(){
    this.showSavedImage = true;
    // console.log(this.croppedImage);
    
    if(this.itemImage) {
      this.imagesArray.push({ImageName : this.fileName, ImageData : this.croppedImage})
    }else {
      this.imagesArray.unshift({ImageName : this.fileName, ImageData : this.croppedImage})
    }

    // this.fileName = '';
    // this.croppedImage = '';
    this.showCropper = false;
    this.isModified = true;
    this.save()
  }

  OriginalSave(){

 
 this.convertFile(this.imageChangedEvent.target.files[0]).subscribe((base64:any)=>{

  this.imagesArray.push({ImageName : this.fileName, ImageData : 'data:' + this.imageChangedEvent.target.files[0].type+';base64,'+base64})
  this.save()
 });  
      

  }

  convertFile(file: File): Observable<string> {
    const result = new ReplaySubject<string>(1);
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = (event: any) =>
      result.next(btoa(event.target.result.toString()));
    return result;
  }

  save(){
    if(!this.itemImage) {
        this.storage.setLocalStorage('ImageSavedFlag', 'true');
      try{

        this.storage.setLocalStorage('Images', JSON.stringify(this.imagesArray));
      }catch(error){

      }
      this.common.changeImageSave(this.imagesArray);
      this.closeEvent.emit();
    }else if(this.itemImage) {
      try{
        this.storage.setLocalStorage('ItemImages', JSON.stringify(this.imagesArray));

      }catch(error){

      }
      this.common.changeItemImgSave(this.imagesArray);
      this.closeEvent.emit();
    }

    
  }

  delete(item : any){
    
    this.imagesArray = this.imagesArray.filter(el => el != item);
    this.isModified = true;
  }

  uploadNew(){
    this.imagesArray.pop();
    this.showSavedImage = false
  }

  // rotateLeft() {
  //   this.canvasRotation--;
  //   this.flipAfterRotate();
  // }

  // rotateRight() {
  //   this.canvasRotation++;
  //   this.flipAfterRotate();
  // }

  // private flipAfterRotate() {
  //   const flippedH = this.transform.flipH;
  //   const flippedV = this.transform.flipV;
  //   this.transform = {
  //     ...this.transform,
  //     flipH: flippedV,
  //     flipV: flippedH,
  //   };
  // }



  resetImage() {
    this.zoomValue = 1;
    this.degrees = 0;
    this.canvasRotation = 0;
    this.transform = {};
 
  }

  cancel(){
    // this.dialogRef.close()
    this.closeEvent.emit();
  }

  zoomOut() {
    this.scale -= 0.1;
    this.transform = {
      ...this.transform,
      scale: this.scale,
    };
  }

  zoomIn() {
    this.scale += 0.1;
    this.transform = {
      ...this.transform,
      scale: this.scale,
    };
  }

  zoomChange(){
    this.transform = {
      ...this.transform,
      scale : this.zoomValue
    }
  }

  rotateChange(){
    this.transform = {
      ...this.transform,
      rotate : this.degrees
    }
  }

  toggleContainWithinAspectRatio() {
    this.containWithinAspectRatio = !this.containWithinAspectRatio;
  }

  updateRotation() {
    this.transform = {
      ...this.transform,
      rotate: this.rotation,
    };
  }

}
